(function(global){
var LiteGraph = global.LiteGraph;

//Works with Litegl.js to create WebGL nodes
global.LGraphTexture = null;

if(typeof(GL) != "undefined")
{

	LGraphCanvas.link_type_colors["Texture"] = "#AEF";

	function LGraphTexture()
	{
		this.addOutput("Texture","Texture");
		this.properties = { name:"", filter: true };
		this.size = [LGraphTexture.image_preview_size, LGraphTexture.image_preview_size];
	}

	global.LGraphTexture = LGraphTexture;

	LGraphTexture.title = "Texture";
	LGraphTexture.desc = "Texture";
	LGraphTexture.widgets_info = {"name": { widget:"texture"}, "filter": { widget:"checkbox"} };

	//REPLACE THIS TO INTEGRATE WITH YOUR FRAMEWORK
	LGraphTexture.loadTextureCallback = null; //function in charge of loading textures when not present in the container
	LGraphTexture.image_preview_size = 256;

	//flags to choose output texture type
	LGraphTexture.PASS_THROUGH = 1; //do not apply FX
	LGraphTexture.COPY = 2;			//create new texture with the same properties as the origin texture
	LGraphTexture.LOW = 3;			//create new texture with low precision (byte)
	LGraphTexture.HIGH = 4;			//create new texture with high precision (half-float)
	LGraphTexture.REUSE = 5;		//reuse input texture
	LGraphTexture.DEFAULT = 2;

	LGraphTexture.MODE_VALUES = {
		"pass through": LGraphTexture.PASS_THROUGH,
		"copy": LGraphTexture.COPY,
		"low": LGraphTexture.LOW,
		"high": LGraphTexture.HIGH,
		"reuse": LGraphTexture.REUSE,
		"default": LGraphTexture.DEFAULT
	};

	//returns the container where all the loaded textures are stored (overwrite if you have a Resources Manager)
	LGraphTexture.getTexturesContainer = function()
	{
		return gl.textures;
	}

	//process the loading of a texture (overwrite it if you have a Resources Manager)
	LGraphTexture.loadTexture = function(name, options)
	{
		options = options || {};
		var url = name;
		if(url.substr(0,7) == "http://")
		{
			if(LiteGraph.proxy) //proxy external files
				url = LiteGraph.proxy + url.substr(7);
		}

		var container = LGraphTexture.getTexturesContainer();
		var tex = container[ name ] = GL.Texture.fromURL(url, options);
		return tex;
	}

	LGraphTexture.getTexture = function(name)
	{
		var container = this.getTexturesContainer();

		if(!container)
			throw("Cannot load texture, container of textures not found");

		var tex = container[ name ];
		if(!tex && name && name[0] != ":")
			return this.loadTexture(name);

		return tex;
	}

	//used to compute the appropiate output texture
	LGraphTexture.getTargetTexture = function( origin, target, mode )
	{
		if(!origin)
			throw("LGraphTexture.getTargetTexture expects a reference texture");

		var tex_type = null;

		switch(mode)
		{
			case LGraphTexture.LOW: tex_type = gl.UNSIGNED_BYTE; break;
			case LGraphTexture.HIGH: tex_type = gl.HIGH_PRECISION_FORMAT; break;
			case LGraphTexture.REUSE: return origin; break;
			case LGraphTexture.COPY: 
			default: tex_type = origin ? origin.type : gl.UNSIGNED_BYTE; break;
		}

		if(!target || target.width != origin.width || target.height != origin.height || target.type != tex_type )
			target = new GL.Texture( origin.width, origin.height, { type: tex_type, format: gl.RGBA, filter: gl.LINEAR });

		return target;
	}


	LGraphTexture.getTextureType = function( precision, ref_texture )
	{
		var type = ref_texture ? ref_texture.type : gl.UNSIGNED_BYTE;
		switch( precision )
		{
			case LGraphTexture.HIGH: type = gl.HIGH_PRECISION_FORMAT; break;
			case LGraphTexture.LOW:  type = gl.UNSIGNED_BYTE; break;
			//no default
		}
		return type;
	}

	LGraphTexture.getNoiseTexture = function()
	{
		if(this._noise_texture)
			return this._noise_texture;

		var noise = new Uint8Array(512*512*4);
		for(var i = 0; i < 512*512*4; ++i)
			noise[i] = Math.random() * 255;

		var texture = GL.Texture.fromMemory(512,512,noise,{ format: gl.RGBA, wrap: gl.REPEAT, filter: gl.NEAREST });
		this._noise_texture = texture;
		return texture;
	}

	LGraphTexture.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._drop_texture = null;
			this.properties.name = "";
		}
		else
		{
			var texture = null;
			if( typeof(data) == "string" )
				texture = GL.Texture.fromURL( data );
			else if( filename.toLowerCase().indexOf(".dds") != -1 )
				texture = GL.Texture.fromDDSInMemory(data);
			else
			{
				var blob = new Blob([file]);
				var url = URL.createObjectURL(blob);
				texture = GL.Texture.fromURL( url );
			}

			this._drop_texture = texture;
			this.properties.name = filename;
		}
	}

	LGraphTexture.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		if(!this._drop_texture)
			return;
		return [ {content:"Clear", callback: 
			function() { 
				that._drop_texture = null;
				that.properties.name = "";
			}
		}];
	}

	LGraphTexture.prototype.onExecute = function()
	{
		var tex = null;
		if(this.isOutputConnected(1))
			tex = this.getInputData(0);		

		if(!tex && this._drop_texture)
			tex = this._drop_texture;

		if(!tex && this.properties.name)
			tex = LGraphTexture.getTexture( this.properties.name );

		if(!tex) 
			return;

		this._last_tex = tex;

		if(this.properties.filter === false)
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		else 
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.LINEAR );

		this.setOutputData(0, tex);

		for(var i = 1; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output)
				continue;
			var v = null;
			if(output.name == "width")
				v = tex.width;
			else if(output.name == "height")
				v = tex.height;
			else if(output.name == "aspect")
				v = tex.width / tex.height;
			this.setOutputData(i, v);
		}
	}

	LGraphTexture.prototype.onResourceRenamed = function(old_name,new_name)
	{
		if(this.properties.name == old_name)
			this.properties.name = new_name;
	}

	LGraphTexture.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20 )
			return;

		if( this._drop_texture && ctx.webgl )
		{
			ctx.drawImage( this._drop_texture, 0,0,this.size[0],this.size[1]);
			//this._drop_texture.renderQuad(this.pos[0],this.pos[1],this.size[0],this.size[1]);
			return;
		}


		//Different texture? then get it from the GPU
		if(this._last_preview_tex != this._last_tex)
		{
			if(ctx.webgl)
			{
				this._canvas = this._last_tex;
			}
			else
			{
				var tex_canvas = LGraphTexture.generateLowResTexturePreview(this._last_tex);
				if(!tex_canvas) 
					return;

				this._last_preview_tex = this._last_tex;
				this._canvas = cloneCanvas(tex_canvas);
			}
		}

		if(!this._canvas)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(this._canvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}


	//very slow, used at your own risk
	LGraphTexture.generateLowResTexturePreview = function(tex)
	{
		if(!tex)
			return null;

		var size = LGraphTexture.image_preview_size;
		var temp_tex = tex;

		if(tex.format == gl.DEPTH_COMPONENT)
			return null; //cannot generate from depth

		//Generate low-level version in the GPU to speed up
		if(tex.width > size || tex.height > size)
		{
			temp_tex = this._preview_temp_tex;
			if(!this._preview_temp_tex)
			{
				temp_tex = new GL.Texture(size,size, { minFilter: gl.NEAREST });
				this._preview_temp_tex = temp_tex;
			}

			//copy
			tex.copyTo(temp_tex);
			tex = temp_tex;
		}

		//create intermediate canvas with lowquality version
		var tex_canvas = this._preview_canvas;
		if(!tex_canvas)
		{
			tex_canvas = createCanvas(size,size);
			this._preview_canvas = tex_canvas;
		}

		if(temp_tex)
			temp_tex.toCanvas(tex_canvas);
		return tex_canvas;
	}

	LGraphTexture.prototype.getResources = function(res)
	{
		res[ this.properties.name ] = GL.Texture;
		return res;
	}

	LGraphTexture.prototype.onGetInputs = function()
	{
		return [["in","Texture"]];
	}


	LGraphTexture.prototype.onGetOutputs = function()
	{
		return [["width","number"],["height","number"],["aspect","number"]];
	}

	LiteGraph.registerNodeType("texture/texture", LGraphTexture );

	//**************************
	function LGraphTexturePreview()
	{
		this.addInput("Texture","Texture");
		this.properties = { flipY: false };
		this.size = [LGraphTexture.image_preview_size, LGraphTexture.image_preview_size];
	}

	LGraphTexturePreview.title = "Preview";
	LGraphTexturePreview.desc = "Show a texture in the graph canvas";
	LGraphTexturePreview.allow_preview = false;

	LGraphTexturePreview.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		if(!ctx.webgl && !LGraphTexturePreview.allow_preview)
			return; //not working well

		var tex = this.getInputData(0);
		if(!tex)
			return;

		var tex_canvas = null;
		
		if(!tex.handle && ctx.webgl)
			tex_canvas = tex;
		else
			tex_canvas = LGraphTexture.generateLowResTexturePreview(tex);

		//render to graph canvas
		ctx.save();
		if(this.properties.flipY)
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(tex_canvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}

	LiteGraph.registerNodeType("texture/preview", LGraphTexturePreview );

	//**************************************

	function LGraphTextureSave()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = {name:""};
	}

	LGraphTextureSave.title = "Save";
	LGraphTextureSave.desc = "Save a texture in the repository";

	LGraphTextureSave.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(this.properties.name)
		{
			//for cases where we want to perform something when storing it
			if( LGraphTexture.storeTexture )
				LGraphTexture.storeTexture( this.properties.name, tex );
			else
			{
				var container = LGraphTexture.getTexturesContainer();
				container[ this.properties.name ] = tex;
			}
		}

		this.setOutputData(0, tex);
	}

	LiteGraph.registerNodeType("texture/save", LGraphTextureSave );

	//****************************************************

	function LGraphTextureOperation()
	{
		this.addInput("Texture","Texture");
		this.addInput("TextureB","Texture");
		this.addInput("value","number");
		this.addOutput("Texture","Texture");
		this.help = "<p>pixelcode must be vec3</p>\
			<p>uvcode must be vec2, is optional</p>\
			<p><strong>uv:</strong> tex. coords</p><p><strong>color:</strong> texture</p><p><strong>colorB:</strong> textureB</p><p><strong>time:</strong> scene time</p><p><strong>value:</strong> input value</p>";

		this.properties = {value:1, uvcode:"", pixelcode:"color + colorB * value", precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureOperation.widgets_info = {
		"uvcode": { widget:"textarea", height: 100 }, 
		"pixelcode": { widget:"textarea", height: 100 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureOperation.title = "Operation";
	LGraphTextureOperation.desc = "Texture shader operation";

	LGraphTextureOperation.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		var txt = !that.properties.show ? "Show Texture" : "Hide Texture";
		return [ {content: txt, callback: 
			function() { 
				that.properties.show = !that.properties.show;
			}
		}];
	}

	LGraphTextureOperation.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20 || !this.properties.show)
			return;

		if(!this._tex)
			return;

		//only works if using a webgl renderer
		if(this._tex.gl != ctx)
			return;

		//render to graph canvas
		ctx.save();
		ctx.drawImage(this._tex, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	}

	LGraphTextureOperation.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		if(!this.properties.uvcode && !this.properties.pixelcode)
			return;

		var width = 512;
		var height = 512;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
		}

		var type = LGraphTexture.getTextureType( this.properties.precision, tex );

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		var uvcode = "";
		if(this.properties.uvcode)
		{
			uvcode = "uv = " + this.properties.uvcode;
			if(this.properties.uvcode.indexOf(";") != -1) //there are line breaks, means multiline code
				uvcode = this.properties.uvcode;
		}
		
		var pixelcode = "";
		if(this.properties.pixelcode)
		{
			pixelcode = "result = " + this.properties.pixelcode;
			if(this.properties.pixelcode.indexOf(";") != -1) //there are line breaks, means multiline code
				pixelcode = this.properties.pixelcode;
		}

		var shader = this._shader;

		if(!shader || this._shader_code != (uvcode + "|" + pixelcode) )
		{
			try
			{
				this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureOperation.pixel_shader, { UV_CODE: uvcode, PIXEL_CODE: pixelcode });
				this.boxcolor = "#00FF00";
			}
			catch (err)
			{
				console.log("Error compiling shader: ", err);
				this.boxcolor = "#FF0000";
				return;
			}
			this.boxcolor = "#FF0000";

			this._shader_code = (uvcode + "|" + pixelcode);
			shader = this._shader;
		}

		if(!shader)
		{
			this.boxcolor = "red";
			return;
		}
		else
			this.boxcolor = "green";

		var value = this.getInputData(2);
		if(value != null)
			this.properties.value = value;
		else
			value = parseFloat( this.properties.value );

		var time = this.graph.getTime();

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({u_texture:0, u_textureB:1, value: value, texSize:[width,height], time: time}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureOperation.pixel_shader = "precision highp float;\n\
			\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			varying vec2 v_coord;\n\
			uniform vec2 texSize;\n\
			uniform float time;\n\
			uniform float value;\n\
			\n\
			void main() {\n\
				vec2 uv = v_coord;\n\
				UV_CODE;\n\
				vec4 color4 = texture2D(u_texture, uv);\n\
				vec3 color = color4.rgb;\n\
				vec4 color4B = texture2D(u_textureB, uv);\n\
				vec3 colorB = color4B.rgb;\n\
				vec3 result = color;\n\
				float alpha = 1.0;\n\
				PIXEL_CODE;\n\
				gl_FragColor = vec4(result, alpha);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/operation", LGraphTextureOperation );

	//****************************************************

	function LGraphTextureShader()
	{
		this.addOutput("out","Texture");
		this.properties = {code:"", width: 512, height: 512, precision: LGraphTexture.DEFAULT };

		this.properties.code = "\nvoid main() {\n  vec2 uv = v_coord;\n  vec3 color = vec3(0.0);\n//your code here\n\ngl_FragColor = vec4(color, 1.0);\n}\n";
		this._uniforms = { in_texture:0, texSize: vec2.create(), time: 0 };
	}

	LGraphTextureShader.title = "Shader";
	LGraphTextureShader.desc = "Texture shader";
	LGraphTextureShader.widgets_info = {
		"code": { type:"code" },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureShader.prototype.onPropertyChanged = function(name, value)
	{
		if(name != "code")
			return;

		var shader = this.getShader();
		if(!shader)
			return;

		//update connections
		var uniforms = shader.uniformInfo;

		//remove deprecated slots
		if(this.inputs)
		{
			var already = {};
			for(var i = 0; i < this.inputs.length; ++i)
			{
				var info = this.getInputInfo(i);
				if(!info)
					continue;

				if( uniforms[ info.name ] && !already[ info.name ] )
				{
					already[ info.name ] = true;
					continue;
				}
				this.removeInput(i);
				i--;
			}
		}

		//update existing ones
		for(var i in uniforms)
		{
			var info = shader.uniformInfo[i];
			if(info.loc === null)
				continue; //is an attribute, not a uniform
			if(i == "time") //default one
				continue;

			var type = "number";
			if( this._shader.samplers[i] )
				type = "texture";
			else
			{
				switch(info.size)
				{
					case 1: type = "number"; break;
					case 2: type = "vec2"; break;
					case 3: type = "vec3"; break;
					case 4: type = "vec4"; break;
					case 9: type = "mat3"; break;
					case 16: type = "mat4"; break;
					default: continue;
				}
			}

			var slot = this.findInputSlot(i);
			if(slot == -1)
			{
				this.addInput(i,type);
				continue;
			}

			var input_info = this.getInputInfo(slot);
			if(!input_info)
				this.addInput(i,type);
			else
			{
				if(input_info.type == type)
					continue;
				this.removeInput(slot,type);
				this.addInput(i,type);
			}
		}
	}

	LGraphTextureShader.prototype.getShader = function()
	{
		//replug 
		if(this._shader && this._shader_code == this.properties.code)
			return this._shader;

		this._shader_code = this.properties.code;
		this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureShader.pixel_shader + this.properties.code );
		if(!this._shader) {
			this.boxcolor = "red";
			return null;
		}
		else
			this.boxcolor = "green";
		return this._shader;
	}

	LGraphTextureShader.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var shader = this.getShader();
		if(!shader)
			return;

		var tex_slot = 0;
		var in_tex = null;

		//set uniforms
		for(var i = 0; i < this.inputs.length; ++i)
		{
			var info = this.getInputInfo(i);
			var data = this.getInputData(i);
			if(data == null)
				continue;

			if(data.constructor === GL.Texture)
			{
				data.bind(tex_slot);
				if(!in_tex)
					in_tex = data;
				data = tex_slot;
				tex_slot++;
			}
			shader.setUniform( info.name, data ); //data is tex_slot
		}

		var uniforms = this._uniforms;
		var type = LGraphTexture.getTextureType( this.properties.precision, in_tex );

		//render to texture
		var w = this.properties.width|0;
		var h = this.properties.height|0;
		if(w == 0)
			w = in_tex ? in_tex.width : gl.canvas.width;
		if(h == 0)
			h = in_tex ? in_tex.height : gl.canvas.height;
		uniforms.texSize[0] = w;
		uniforms.texSize[1] = h;
		uniforms.time = this.graph.getTime();

		if(!this._tex || this._tex.type != type || this._tex.width != w || this._tex.height != h )
			this._tex = new GL.Texture( w, h, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		var tex = this._tex;
		tex.drawTo(function() {
			shader.uniforms( uniforms ).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureShader.pixel_shader = "precision highp float;\n\
			\n\
			varying vec2 v_coord;\n\
			uniform float time;\n\
	";

	LiteGraph.registerNodeType("texture/shader", LGraphTextureShader );

	// Texture Scale Offset

	function LGraphTextureScaleOffset()
	{
		this.addInput("in","Texture");
		this.addInput("scale","vec2");
		this.addInput("offset","vec2");
		this.addOutput("out","Texture");
		this.properties = { offset: vec2.fromValues(0,0), scale: vec2.fromValues(1,1), precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureScaleOffset.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureScaleOffset.title = "Scale/Offset";
	LGraphTextureScaleOffset.desc = "Applies an scaling and offseting";

	LGraphTextureScaleOffset.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0) || !tex)
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;
		var type = this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT;
		if (this.precision === LGraphTexture.DEFAULT)
			type = tex.type;

		if(!this._tex || this._tex.width != width || this._tex.height != height || this._tex.type != type )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureScaleOffset.pixel_shader );

		var scale = this.getInputData(1);
		if(scale)
		{
			this.properties.scale[0] = scale[0];
			this.properties.scale[1] = scale[1];
		}
		else
			scale = this.properties.scale;

		var offset = this.getInputData(2);
		if(offset)
		{
			this.properties.offset[0] = offset[0];
			this.properties.offset[1] = offset[1];
		}
		else
			offset = this.properties.offset;

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			tex.bind(0);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({u_texture:0, u_scale: scale, u_offset: offset}).draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureScaleOffset.pixel_shader = "precision highp float;\n\
			\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			varying vec2 v_coord;\n\
			uniform vec2 u_scale;\n\
			uniform vec2 u_offset;\n\
			\n\
			void main() {\n\
				vec2 uv = v_coord;\n\
				uv = uv / u_scale - u_offset;\n\
				gl_FragColor = texture2D(u_texture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/scaleOffset", LGraphTextureScaleOffset );



	// Warp (distort a texture) *************************

	function LGraphTextureWarp()
	{
		this.addInput("in","Texture");
		this.addInput("warp","Texture");
		this.addInput("factor","number");
		this.addOutput("out","Texture");
		this.properties = { factor: 0.01, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureWarp.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureWarp.title = "Warp";
	LGraphTextureWarp.desc = "Texture warp operation";

	LGraphTextureWarp.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
			type = tex.type;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureWarp.pixel_shader );

		var factor = this.getInputData(2);
		if(factor != null)
			this.properties.factor = factor;
		else
			factor = parseFloat( this.properties.factor );

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({u_texture:0, u_textureB:1, u_factor: factor }).draw( mesh );
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureWarp.pixel_shader = "precision highp float;\n\
			\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			varying vec2 v_coord;\n\
			uniform float u_factor;\n\
			\n\
			void main() {\n\
				vec2 uv = v_coord;\n\
				uv += ( texture2D(u_textureB, uv).rg - vec2(0.5)) * u_factor;\n\
				gl_FragColor = texture2D(u_texture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/warp", LGraphTextureWarp );

	//****************************************************

	// Texture to Viewport *****************************************
	function LGraphTextureToViewport()
	{
		this.addInput("Texture","Texture");
		this.properties = { additive: false, antialiasing: false, filter: true, disable_alpha: false, gamma: 1.0 };
		this.size[0] = 130;
	}

	LGraphTextureToViewport.title = "to Viewport";
	LGraphTextureToViewport.desc = "Texture to viewport";

	LGraphTextureToViewport.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex) 
			return;

		if(this.properties.disable_alpha)
			gl.disable( gl.BLEND );
		else
		{
			gl.enable( gl.BLEND );
			if(this.properties.additive)
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
			else
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		}

		gl.disable( gl.DEPTH_TEST );
		var gamma = this.properties.gamma || 1.0;
		if( this.isInputConnected(1) )
			gamma = this.getInputData(1);

		tex.setParameter( gl.TEXTURE_MAG_FILTER, this.properties.filter ? gl.LINEAR : gl.NEAREST );

		if(this.properties.antialiasing)
		{
			if(!LGraphTextureToViewport._shader)
				LGraphTextureToViewport._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.aa_pixel_shader );

			var viewport = gl.getViewport(); //gl.getParameter(gl.VIEWPORT);
			var mesh = Mesh.getScreenQuad();
			tex.bind(0);
			LGraphTextureToViewport._shader.uniforms({u_texture:0, uViewportSize:[tex.width,tex.height], u_igamma: 1 / gamma,  inverseVP: [1/tex.width,1/tex.height] }).draw(mesh);
		}
		else
		{
			if(gamma != 1.0)
			{
				if(!LGraphTextureToViewport._gamma_shader)
					LGraphTextureToViewport._gamma_shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.gamma_pixel_shader );
				tex.toViewport(LGraphTextureToViewport._gamma_shader, { u_texture:0, u_igamma: 1 / gamma });
			}
			else
				tex.toViewport();
		}
	}

	LGraphTextureToViewport.prototype.onGetInputs = function()
	{
		return [["gamma","number"]];
	}

	LGraphTextureToViewport.aa_pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 uViewportSize;\n\
			uniform vec2 inverseVP;\n\
			uniform float u_igamma;\n\
			#define FXAA_REDUCE_MIN   (1.0/ 128.0)\n\
			#define FXAA_REDUCE_MUL   (1.0 / 8.0)\n\
			#define FXAA_SPAN_MAX     8.0\n\
			\n\
			/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */\n\
			vec4 applyFXAA(sampler2D tex, vec2 fragCoord)\n\
			{\n\
				vec4 color = vec4(0.0);\n\
				/*vec2 inverseVP = vec2(1.0 / uViewportSize.x, 1.0 / uViewportSize.y);*/\n\
				vec3 rgbNW = texture2D(tex, (fragCoord + vec2(-1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbNE = texture2D(tex, (fragCoord + vec2(1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbSW = texture2D(tex, (fragCoord + vec2(-1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbSE = texture2D(tex, (fragCoord + vec2(1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbM  = texture2D(tex, fragCoord  * inverseVP).xyz;\n\
				vec3 luma = vec3(0.299, 0.587, 0.114);\n\
				float lumaNW = dot(rgbNW, luma);\n\
				float lumaNE = dot(rgbNE, luma);\n\
				float lumaSW = dot(rgbSW, luma);\n\
				float lumaSE = dot(rgbSE, luma);\n\
				float lumaM  = dot(rgbM,  luma);\n\
				float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n\
				float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n\
				\n\
				vec2 dir;\n\
				dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n\
				dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n\
				\n\
				float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n\
				\n\
				float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n\
				dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;\n\
				\n\
				vec3 rgbA = 0.5 * (texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n\
				vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\
				\n\
				//return vec4(rgbA,1.0);\n\
				float lumaB = dot(rgbB, luma);\n\
				if ((lumaB < lumaMin) || (lumaB > lumaMax))\n\
					color = vec4(rgbA, 1.0);\n\
				else\n\
					color = vec4(rgbB, 1.0);\n\
				if(u_igamma != 1.0)\n\
					color.xyz = pow( color.xyz, vec3(u_igamma) );\n\
				return color;\n\
			}\n\
			\n\
			void main() {\n\
			   gl_FragColor = applyFXAA( u_texture, v_coord * uViewportSize) ;\n\
			}\n\
			";

	LGraphTextureToViewport.gamma_pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_igamma;\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, v_coord);\n\
				color.xyz = pow(color.xyz, vec3(u_igamma) );\n\
			   gl_FragColor = color;\n\
			}\n\
			";


	LiteGraph.registerNodeType("texture/toviewport", LGraphTextureToViewport );


	// Texture Copy *****************************************
	function LGraphTextureCopy()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { size: 0, generate_mipmaps: false, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureCopy.title = "Copy";
	LGraphTextureCopy.desc = "Copy Texture";
	LGraphTextureCopy.widgets_info = { 
		size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]},
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureCopy.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex && !this._temp_texture)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		//copy the texture
		if(tex)
		{
			var width = tex.width;
			var height = tex.height;

			if(this.properties.size != 0)
			{
				width = this.properties.size;
				height = this.properties.size;
			}

			var temp = this._temp_texture;

			var type = tex.type;
			if(this.properties.precision === LGraphTexture.LOW)
				type = gl.UNSIGNED_BYTE;
			else if(this.properties.precision === LGraphTexture.HIGH)
				type = gl.HIGH_PRECISION_FORMAT;

			if(!temp || temp.width != width || temp.height != height || temp.type != type )
			{
				var minFilter = gl.LINEAR;
				if( this.properties.generate_mipmaps && isPowerOfTwo(width) && isPowerOfTwo(height) )
					minFilter = gl.LINEAR_MIPMAP_LINEAR;
				this._temp_texture = new GL.Texture( width, height, { type: type, format: gl.RGBA, minFilter: minFilter, magFilter: gl.LINEAR });
			}
			tex.copyTo(this._temp_texture);

			if(this.properties.generate_mipmaps)
			{
				this._temp_texture.bind(0);
				gl.generateMipmap(this._temp_texture.texture_type);
				this._temp_texture.unbind(0);
			}
		}


		this.setOutputData(0,this._temp_texture);
	}

	LiteGraph.registerNodeType("texture/copy", LGraphTextureCopy );


	// Texture Downsample *****************************************
	function LGraphTextureDownsample()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { iterations: 1, generate_mipmaps: false, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureDownsample.title = "Downsample";
	LGraphTextureDownsample.desc = "Downsample Texture";
	LGraphTextureDownsample.widgets_info = { 
		iterations: { type:"number", step: 1, precision: 0, min: 1 },
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureDownsample.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex && !this._temp_texture)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		//we do not allow any texture different than texture 2D
		if(!tex || tex.texture_type !== GL.TEXTURE_2D )
			return;

		var shader = LGraphTextureDownsample._shader;
		if(!shader)
			LGraphTextureDownsample._shader = shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureDownsample.pixel_shader );

		var width = tex.width|0;
		var height = tex.height|0;
		var type = tex.type;
		if(this.properties.precision === LGraphTexture.LOW)
			type = gl.UNSIGNED_BYTE;
		else if(this.properties.precision === LGraphTexture.HIGH)
			type = gl.HIGH_PRECISION_FORMAT;
		var iterations = this.properties.iterations || 1;

		var origin = tex;
		var target = null;

		var temp = [];
		var options = {
			type: type,
			format: tex.format
		};

		var offset = vec2.create();
		var uniforms = {
			u_offset: offset
		};

		if( this._texture )
			GL.Texture.releaseTemporary( this._texture );

		for(var i = 0; i < iterations; ++i)
		{
			offset[0] = 1/width;
			offset[1] = 1/height;
			width = width>>1 || 0;
			height = height>>1 || 0;
			target = GL.Texture.getTemporary( width, height, options );
			temp.push( target );
			origin.setParameter( GL.TEXTURE_MAG_FILTER, GL.NEAREST );
			origin.copyTo( target, shader, uniforms );
			if(width == 1 && height == 1)
				break; //nothing else to do
			origin = target;
		}

		//keep the last texture used
		this._texture = temp.pop();

		//free the rest
		for(var i = 0; i < temp.length; ++i)
			GL.Texture.releaseTemporary( temp[i] );

		if(this.properties.generate_mipmaps)
		{
			this._texture.bind(0);
			gl.generateMipmap(this._texture.texture_type);
			this._texture.unbind(0);
		}

		this.setOutputData(0,this._texture);
	}

	LGraphTextureDownsample.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_offset;\n\
			varying vec2 v_coord;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord );\n\
				color += texture2D(u_texture, v_coord + vec2( u_offset.x, 0.0 ) );\n\
				color += texture2D(u_texture, v_coord + vec2( 0.0, u_offset.y ) );\n\
				color += texture2D(u_texture, v_coord + vec2( u_offset.x, u_offset.y ) );\n\
			   gl_FragColor = color * 0.25;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/downsample", LGraphTextureDownsample );



	// Texture Copy *****************************************
	function LGraphTextureAverage()
	{
		this.addInput("Texture","Texture");
		this.addOutput("tex","Texture");
		this.addOutput("avg","vec4");
		this.addOutput("lum","number");
		this.properties = { use_previous_frame: true, mipmap_offset: 0, low_precision: false };

		this._uniforms = { u_texture: 0, u_mipmap_offset: this.properties.mipmap_offset };
		this._luminance = new Float32Array(4);
	}

	LGraphTextureAverage.title = "Average";
	LGraphTextureAverage.desc = "Compute a partial average (32 random samples) of a texture and stores it as a 1x1 pixel texture";

	LGraphTextureAverage.prototype.onExecute = function()
	{
		if( !this.properties.use_previous_frame )
			this.updateAverage();

		var v = this._luminance;
		this.setOutputData(0, this._temp_texture );
		this.setOutputData(1, v );
		this.setOutputData(2,(v[0] + v[1] + v[2]) / 3);
	}

	LGraphTextureAverage.prototype.onPreRenderExecute = function()
	{
		this.updateAverage();
	}

	LGraphTextureAverage.prototype.updateAverage = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0) && !this.isOutputConnected(1) && !this.isOutputConnected(2))
			return; //saves work

		if(!LGraphTextureAverage._shader)
		{
			LGraphTextureAverage._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureAverage.pixel_shader);
			//creates 32 random numbers and stores the, in two mat4 
			var samples = new Float32Array(32);
			for(var i = 0; i < 32; ++i)	
				samples[i] = Math.random();
			LGraphTextureAverage._shader.uniforms({u_samples_a: samples.subarray(0,16), u_samples_b: samples.subarray(16,32) });
		}

		var temp = this._temp_texture;
		var type = gl.UNSIGNED_BYTE;
		if(tex.type != type) //force floats, half floats cannot be read with gl.readPixels
			type = gl.FLOAT;

		if(!temp || temp.type != type )
			this._temp_texture = new GL.Texture( 1, 1, { type: type, format: gl.RGBA, filter: gl.NEAREST });

		var shader = LGraphTextureAverage._shader;
		var uniforms = this._uniforms;
		uniforms.u_mipmap_offset = this.properties.mipmap_offset;
		this._temp_texture.drawTo(function(){
			tex.toViewport( shader, uniforms );
		});

		if(this.isOutputConnected(1) || this.isOutputConnected(2))
		{
			var pixel = this._temp_texture.getPixels();
			if(pixel)
			{
				var v = this._luminance;
				var type = this._temp_texture.type;
				v.set( pixel );
				if(type == gl.UNSIGNED_BYTE)
					vec4.scale( v,v, 1/255 );
				else if(type == GL.HALF_FLOAT || type == GL.HALF_FLOAT_OES)
				{
					//no half floats possible, hard to read back unless copyed to a FLOAT texture, so temp_texture is always forced to FLOAT
					//vec4.scale( v,v, 1/(255*255) ); //is this correct?
				}
			}
		}
	}

	LGraphTextureAverage.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			uniform mat4 u_samples_a;\n\
			uniform mat4 u_samples_b;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_mipmap_offset;\n\
			varying vec2 v_coord;\n\
			\n\
			void main() {\n\
				vec4 color = vec4(0.0);\n\
				for(int i = 0; i < 4; ++i)\n\
					for(int j = 0; j < 4; ++j)\n\
					{\n\
						color += texture2D(u_texture, vec2( u_samples_a[i][j], u_samples_b[i][j] ), u_mipmap_offset );\n\
						color += texture2D(u_texture, vec2( 1.0 - u_samples_a[i][j], 1.0 - u_samples_b[i][j] ), u_mipmap_offset );\n\
					}\n\
			   gl_FragColor = color * 0.03125;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/average", LGraphTextureAverage );

	// Image To Texture *****************************************
	function LGraphImageToTexture()
	{
		this.addInput("Image","image");
		this.addOutput("","Texture");
		this.properties = {};
	}

	LGraphImageToTexture.title = "Image to Texture";
	LGraphImageToTexture.desc = "Uploads an image to the GPU";
	//LGraphImageToTexture.widgets_info = { size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]} };

	LGraphImageToTexture.prototype.onExecute = function()
	{
		var img = this.getInputData(0);
		if(!img)
			return;

		var width = img.videoWidth || img.width;
		var height = img.videoHeight || img.height;

		//this is in case we are using a webgl canvas already, no need to reupload it
		if(img.gltexture)
		{
			this.setOutputData(0,img.gltexture);
			return;
		}


		var temp = this._temp_texture;
		if(!temp || temp.width != width || temp.height != height )
			this._temp_texture = new GL.Texture( width, height, { format: gl.RGBA, filter: gl.LINEAR });

		try
		{
			this._temp_texture.uploadImage(img);
		}
		catch(err)
		{
			console.error("image comes from an unsafe location, cannot be uploaded to webgl: " + err);
			return;
		}

		this.setOutputData(0,this._temp_texture);
	}

	LiteGraph.registerNodeType("texture/imageToTexture", LGraphImageToTexture );


	// Texture LUT *****************************************
	function LGraphTextureLUT()
	{
		this.addInput("Texture","Texture");
		this.addInput("LUT","Texture");
		this.addInput("Intensity","number");
		this.addOutput("","Texture");
		this.properties = { intensity: 1, precision: LGraphTexture.DEFAULT, texture: null };

		if(!LGraphTextureLUT._shader)
			LGraphTextureLUT._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureLUT.pixel_shader );
	}

	LGraphTextureLUT.widgets_info = { 
		"texture": { widget:"texture"},
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLUT.title = "LUT";
	LGraphTextureLUT.desc = "Apply LUT to Texture";

	LGraphTextureLUT.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}

		if(!tex)
			return;

		var lut_tex = this.getInputData(1);

		if(!lut_tex)
			lut_tex = LGraphTexture.getTexture( this.properties.texture );

		if(!lut_tex)
		{
			this.setOutputData(0,tex);
			return;
		}

		lut_tex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		gl.bindTexture(gl.TEXTURE_2D, null);

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
			this.properties.intensity = intensity = this.getInputData(2);

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		//var mesh = Mesh.getScreenQuad();

		this._tex.drawTo(function() {
			lut_tex.bind(1);
			tex.toViewport( LGraphTextureLUT._shader, {u_texture:0, u_textureB:1, u_amount: intensity} );
		});

		this.setOutputData(0,this._tex);
	}

	LGraphTextureLUT.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			uniform float u_amount;\n\
			\n\
			void main() {\n\
				 lowp vec4 textureColor = clamp( texture2D(u_texture, v_coord), vec4(0.0), vec4(1.0) );\n\
				 mediump float blueColor = textureColor.b * 63.0;\n\
				 mediump vec2 quad1;\n\
				 quad1.y = floor(floor(blueColor) / 8.0);\n\
				 quad1.x = floor(blueColor) - (quad1.y * 8.0);\n\
				 mediump vec2 quad2;\n\
				 quad2.y = floor(ceil(blueColor) / 8.0);\n\
				 quad2.x = ceil(blueColor) - (quad2.y * 8.0);\n\
				 highp vec2 texPos1;\n\
				 texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos1.y = 1.0 - ((quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 highp vec2 texPos2;\n\
				 texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos2.y = 1.0 - ((quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 lowp vec4 newColor1 = texture2D(u_textureB, texPos1);\n\
				 lowp vec4 newColor2 = texture2D(u_textureB, texPos2);\n\
				 lowp vec4 newColor = mix(newColor1, newColor2, fract(blueColor));\n\
				 gl_FragColor = vec4( mix( textureColor.rgb, newColor.rgb, u_amount), textureColor.w);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/LUT", LGraphTextureLUT );

	// Texture Channels *****************************************
	function LGraphTextureChannels()
	{
		this.addInput("Texture","Texture");

		this.addOutput("R","Texture");
		this.addOutput("G","Texture");
		this.addOutput("B","Texture");
		this.addOutput("A","Texture");

		this.properties = {};
		if(!LGraphTextureChannels._shader)
			LGraphTextureChannels._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureChannels.pixel_shader );
	}

	LGraphTextureChannels.title = "Texture to Channels";
	LGraphTextureChannels.desc = "Split texture channels";

	LGraphTextureChannels.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);
		if(!texA) return;

		if(!this._channels)
			this._channels = Array(4);

		var connections = 0;
		for(var i = 0; i < 4; i++)
		{
			if(this.isOutputConnected(i))
			{
				if(!this._channels[i] || this._channels[i].width != texA.width || this._channels[i].height != texA.height || this._channels[i].type != texA.type)
					this._channels[i] = new GL.Texture( texA.width, texA.height, { type: texA.type, format: gl.RGBA, filter: gl.LINEAR });
				connections++;
			}
			else
				this._channels[i] = null;
		}

		if(!connections)
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureChannels._shader;
		var masks = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

		for(var i = 0; i < 4; i++)
		{
			if(!this._channels[i])
				continue;

			this._channels[i].drawTo( function() {
				texA.bind(0);
				shader.uniforms({u_texture:0, u_mask: masks[i]}).draw(mesh);
			});
			this.setOutputData(i, this._channels[i]);
		}
	}

	LGraphTextureChannels.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec4 u_mask;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( vec3( length( texture2D(u_texture, v_coord) * u_mask )), 1.0 );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/textureChannels", LGraphTextureChannels );


	// Texture Channels to Texture *****************************************
	function LGraphChannelsTexture()
	{
		this.addInput("R","Texture");
		this.addInput("G","Texture");
		this.addInput("B","Texture");
		this.addInput("A","Texture");

		this.addOutput("Texture","Texture");

		this.properties = {};
		if(!LGraphChannelsTexture._shader)
			LGraphChannelsTexture._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphChannelsTexture.pixel_shader );
	}

	LGraphChannelsTexture.title = "Channels to Texture";
	LGraphChannelsTexture.desc = "Split texture channels";

	LGraphChannelsTexture.prototype.onExecute = function()
	{
		var tex = [ this.getInputData(0),
				this.getInputData(1),
				this.getInputData(2),
				this.getInputData(3) ];

		if(!tex[0] || !tex[1] || !tex[2] || !tex[3]) 
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphChannelsTexture._shader;

		this._tex = LGraphTexture.getTargetTexture( tex[0], this._tex );

		this._tex.drawTo( function() {
			tex[0].bind(0);
			tex[1].bind(1);
			tex[2].bind(2);
			tex[3].bind(3);
			shader.uniforms({u_textureR:0, u_textureG:1, u_textureB:2, u_textureA:3 }).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphChannelsTexture.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_textureR;\n\
			uniform sampler2D u_textureG;\n\
			uniform sampler2D u_textureB;\n\
			uniform sampler2D u_textureA;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( \
						texture2D(u_textureR, v_coord).r,\
						texture2D(u_textureG, v_coord).r,\
						texture2D(u_textureB, v_coord).r,\
						texture2D(u_textureA, v_coord).r);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/channelsTexture", LGraphChannelsTexture );

	// Texture Color *****************************************
	function LGraphTextureColor()
	{
		this.addOutput("Texture","Texture");

		this._tex_color = vec4.create();
		this.properties = { color: vec4.create(), precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureColor.title = "Color";
	LGraphTextureColor.desc = "Generates a 1x1 texture with a constant color";

	LGraphTextureColor.widgets_info = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureColor.prototype.onDrawBackground = function( ctx )
	{
		var c = this.properties.color;
		ctx.fillStyle = "rgb(" + Math.floor(Math.clamp(c[0],0,1)*255) + "," + Math.floor(Math.clamp(c[1],0,1)*255) + "," + Math.floor(Math.clamp(c[2],0,1)*255) + ")";
		if(this.flags.collapsed)
			this.boxcolor = ctx.fillStyle;
		else
			ctx.fillRect(0,0,this.size[0],this.size[1]);
	}

	LGraphTextureColor.prototype.onExecute = function()
	{
		var type = this.properties.precision == LGraphTexture.HIGH ? LGraphTexture.HIGH_PRECISION_FORMAT : gl.UNSIGNED_BYTE;

		if(!this._tex || this._tex.type != type )
			this._tex = new GL.Texture(1,1,{ format: gl.RGBA, type: type, minFilter: gl.NEAREST });
		var color = this.properties.color;

		if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			switch(input.name)
			{
				case 'RGB':
				case 'RGBA':
					color.set(v);
					break;
				case 'R': color[0] = v; break;
				case 'G': color[1] = v; break;
				case 'B': color[2] = v; break;
				case 'A': color[3] = v; break;
			}
		}
		
		if( vec4.sqrDist( this._tex_color, color) > 0.001 )
		{
			this._tex_color.set( color );
			this._tex.fill( color );
		}
		this.setOutputData(0, this._tex);
	}

	LGraphTextureColor.prototype.onGetInputs = function()
	{
		return [["RGB","vec3"],["RGBA","vec4"],["R","number"],["G","number"],["B","number"],["A","number"]];
	}

	LiteGraph.registerNodeType("texture/color", LGraphTextureColor );

	// Texture Channels to Texture *****************************************
	function LGraphTextureGradient()
	{
		this.addInput("A","color");
		this.addInput("B","color");
		this.addOutput("Texture","Texture");

		this.properties = { angle: 0, scale: 1, A:[0,0,0], B:[1,1,1], texture_size:32 };
		if(!LGraphTextureGradient._shader)
			LGraphTextureGradient._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureGradient.pixel_shader );

		this._uniforms = { u_angle: 0, u_colorA: vec3.create(), u_colorB: vec3.create()};
	}

	LGraphTextureGradient.title = "Gradient";
	LGraphTextureGradient.desc = "Generates a gradient";
	LGraphTextureGradient["@A"] = { type:"color" };
	LGraphTextureGradient["@B"] = { type:"color" };
	LGraphTextureGradient["@texture_size"] = { type:"enum", values:[32,64,128,256,512] };

	LGraphTextureGradient.prototype.onExecute = function()
	{
		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = GL.Mesh.getScreenQuad();
		var shader = LGraphTextureGradient._shader;

		var A = this.getInputData(0);
		if(!A)
			A = this.properties.A;
		var B = this.getInputData(1);
		if(!B)
			B = this.properties.B;

		//angle and scale
		for(var i = 2; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[ input.name ] = v;
		}

		var uniforms = this._uniforms;
		this._uniforms.u_angle = this.properties.angle * DEG2RAD;
		this._uniforms.u_scale = this.properties.scale;
		vec3.copy( uniforms.u_colorA, A );
		vec3.copy( uniforms.u_colorB, B );

		var size = parseInt( this.properties.texture_size );
		if(!this._tex || this._tex.width != size )
			this._tex = new GL.Texture( size, size, { format: gl.RGB, filter: gl.LINEAR });

		this._tex.drawTo( function() {
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphTextureGradient.prototype.onGetInputs = function()
	{
		return [["angle","number"],["scale","number"]];
	}

	LGraphTextureGradient.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform float u_angle;\n\
			uniform float u_scale;\n\
			uniform vec3 u_colorA;\n\
			uniform vec3 u_colorB;\n\
			\n\
			vec2 rotate(vec2 v, float angle)\n\
			{\n\
				vec2 result;\n\
				float _cos = cos(angle);\n\
				float _sin = sin(angle);\n\
				result.x = v.x * _cos - v.y * _sin;\n\
				result.y = v.x * _sin + v.y * _cos;\n\
				return result;\n\
			}\n\
			void main() {\n\
				float f = (rotate(u_scale * (v_coord - vec2(0.5)), u_angle) + vec2(0.5)).x;\n\
				vec3 color = mix(u_colorA,u_colorB,clamp(f,0.0,1.0));\n\
			   gl_FragColor = vec4(color,1.0);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/gradient", LGraphTextureGradient );

	// Texture Mix *****************************************
	function LGraphTextureMix()
	{
		this.addInput("A","Texture");
		this.addInput("B","Texture");
		this.addInput("Mixer","Texture");

		this.addOutput("Texture","Texture");
		this.properties = { factor: 0.5, precision: LGraphTexture.DEFAULT };
		this._uniforms = { u_textureA:0, u_textureB:1, u_textureMix:2, u_mix: vec4.create() };
	}

	LGraphTextureMix.title = "Mix";
	LGraphTextureMix.desc = "Generates a texture mixing two textures";

	LGraphTextureMix.widgets_info = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMix.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work
		
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,texA);
			return;
		}

		var texB = this.getInputData(1);
		if(!texA || !texB )
			return;

		var texMix = this.getInputData(2);

		var factor = this.getInputData(3);


		this._tex = LGraphTexture.getTargetTexture( texA, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = null;
		var uniforms = this._uniforms;
		if(texMix)
		{
			shader = LGraphTextureMix._shader_tex;
			if(!shader)
				shader = LGraphTextureMix._shader_tex = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureMix.pixel_shader, {"MIX_TEX":""});
		}
		else
		{
			shader = LGraphTextureMix._shader_factor;
			if(!shader)
				shader = LGraphTextureMix._shader_factor = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureMix.pixel_shader );
			var f = factor == null ? this.properties.factor : factor;
			uniforms.u_mix.set([f,f,f,f]);
		}

		this._tex.drawTo( function() {
			texA.bind(0);
			texB.bind(1);
			if(texMix)
				texMix.bind(2);
			shader.uniforms( uniforms ).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureMix.prototype.onGetInputs = function()
	{
		return [["factor","number"]];
	}

	LGraphTextureMix.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_textureA;\n\
			uniform sampler2D u_textureB;\n\
			#ifdef MIX_TEX\n\
				uniform sampler2D u_textureMix;\n\
			#else\n\
				uniform vec4 u_mix;\n\
			#endif\n\
			\n\
			void main() {\n\
				#ifdef MIX_TEX\n\
				   vec4 f = texture2D(u_textureMix, v_coord);\n\
				#else\n\
				   vec4 f = u_mix;\n\
				#endif\n\
			   gl_FragColor = mix( texture2D(u_textureA, v_coord), texture2D(u_textureB, v_coord), f );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/mix", LGraphTextureMix );

	// Texture Edges detection *****************************************
	function LGraphTextureEdges()
	{
		this.addInput("Tex.","Texture");

		this.addOutput("Edges","Texture");
		this.properties = { invert: true, threshold: false, factor: 1, precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureEdges._shader)
			LGraphTextureEdges._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureEdges.pixel_shader );
	}

	LGraphTextureEdges.title = "Edges";
	LGraphTextureEdges.desc = "Detects edges";

	LGraphTextureEdges.widgets_info = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureEdges.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureEdges._shader;
		var invert = this.properties.invert;
		var factor = this.properties.factor;
		var threshold = this.properties.threshold ? 1 : 0;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({u_texture:0, u_isize:[1/tex.width,1/tex.height], u_factor: factor, u_threshold: threshold, u_invert: invert ? 1 : 0}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureEdges.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_isize;\n\
			uniform int u_invert;\n\
			uniform float u_factor;\n\
			uniform float u_threshold;\n\
			\n\
			void main() {\n\
				vec4 center = texture2D(u_texture, v_coord);\n\
				vec4 up = texture2D(u_texture, v_coord + u_isize * vec2(0.0,1.0) );\n\
				vec4 down = texture2D(u_texture, v_coord + u_isize * vec2(0.0,-1.0) );\n\
				vec4 left = texture2D(u_texture, v_coord + u_isize * vec2(1.0,0.0) );\n\
				vec4 right = texture2D(u_texture, v_coord + u_isize * vec2(-1.0,0.0) );\n\
				vec4 diff = abs(center - up) + abs(center - down) + abs(center - left) + abs(center - right);\n\
				diff *= u_factor;\n\
				if(u_invert == 1)\n\
					diff.xyz = vec3(1.0) - diff.xyz;\n\
				if( u_threshold == 0.0 )\n\
					gl_FragColor = vec4( diff.xyz, center.a );\n\
				else\n\
					gl_FragColor = vec4( diff.x > 0.5 ? 1.0 : 0.0, diff.y > 0.5 ? 1.0 : 0.0, diff.z > 0.5 ? 1.0 : 0.0, center.a );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/edges", LGraphTextureEdges );

	// Texture Depth *****************************************
	function LGraphTextureDepthRange()
	{
		this.addInput("Texture","Texture");
		this.addInput("Distance","number");
		this.addInput("Range","number");
		this.addOutput("Texture","Texture");
		this.properties = { distance:100, range: 50, only_depth: false, high_precision: false };
		this._uniforms = {u_texture:0, u_distance: 100, u_range: 50, u_camera_planes: null };
	}

	LGraphTextureDepthRange.title = "Depth Range";
	LGraphTextureDepthRange.desc = "Generates a texture with a depth range";

	LGraphTextureDepthRange.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);
		if(!tex) return;

		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.high_precision)
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;			

		if(!this._temp_texture || this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width || this._temp_texture.height != tex.height)
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		var uniforms = this._uniforms;

		//iterations
		var distance = this.properties.distance;
		if( this.isInputConnected(1) )
		{
			distance = this.getInputData(1);
			this.properties.distance = distance;
		}

		var range = this.properties.range;
		if( this.isInputConnected(2) )
		{
			range = this.getInputData(2);
			this.properties.range = range;
		}

		uniforms.u_distance = distance;
		uniforms.u_range = range;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		if(!LGraphTextureDepthRange._shader)
		{
			LGraphTextureDepthRange._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureDepthRange.pixel_shader );
			LGraphTextureDepthRange._shader_onlydepth = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureDepthRange.pixel_shader, { ONLY_DEPTH:""} );
		}
		var shader = this.properties.only_depth ? LGraphTextureDepthRange._shader_onlydepth : LGraphTextureDepthRange._shader;

		//NEAR AND FAR PLANES
		var planes = null;
		if( tex.near_far_planes )
			planes = tex.near_far_planes;
		else if( window.LS && LS.Renderer._main_camera )
			planes = LS.Renderer._main_camera._uniforms.u_camera_planes;
		else
			planes = [0.1,1000]; //hardcoded
		uniforms.u_camera_planes = planes;


		this._temp_texture.drawTo( function() {
			tex.bind(0);
			shader.uniforms( uniforms ).draw(mesh);
		});

		this._temp_texture.near_far_planes = planes;
		this.setOutputData(0, this._temp_texture );
	}

	LGraphTextureDepthRange.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform float u_distance;\n\
			uniform float u_range;\n\
			\n\
			float LinearDepth()\n\
			{\n\
				float zNear = u_camera_planes.x;\n\
				float zFar = u_camera_planes.y;\n\
				float depth = texture2D(u_texture, v_coord).x;\n\
				depth = depth * 2.0 - 1.0;\n\
				return zNear * (depth + 1.0) / (zFar + zNear - depth * (zFar - zNear));\n\
			}\n\
			\n\
			void main() {\n\
				float depth = LinearDepth();\n\
				#ifdef ONLY_DEPTH\n\
				   gl_FragColor = vec4(depth);\n\
				#else\n\
					float diff = abs(depth * u_camera_planes.y - u_distance);\n\
					float dof = 1.0;\n\
					if(diff <= u_range)\n\
						dof = diff / u_range;\n\
				   gl_FragColor = vec4(dof);\n\
				#endif\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/depth_range", LGraphTextureDepthRange );

	// Texture Blur *****************************************
	function LGraphTextureBlur()
	{
		this.addInput("Texture","Texture");
		this.addInput("Iterations","number");
		this.addInput("Intensity","number");
		this.addOutput("Blurred","Texture");
		this.properties = { intensity: 1, iterations: 1, preserve_aspect: false, scale:[1,1], precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureBlur.title = "Blur";
	LGraphTextureBlur.desc = "Blur a texture";

	LGraphTextureBlur.widgets_info = {
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureBlur.max_iterations = 20;

	LGraphTextureBlur.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._final_texture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
		{
			//we need two textures to do the blurring
			//this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			temp = this._final_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
		}

		//iterations
		var iterations = this.properties.iterations;
		if( this.isInputConnected(1) )
		{
			iterations = this.getInputData(1);
			this.properties.iterations = iterations;
		}
		iterations = Math.min( Math.floor(iterations), LGraphTextureBlur.max_iterations );
		if(iterations == 0) //skip blurring
		{
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
		{
			intensity = this.getInputData(2);
			this.properties.intensity = intensity;
		}

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if(!aspect && window.gl !== undefined)
			aspect = gl.canvas.height / gl.canvas.width;
		if(!aspect)
			aspect = 1;
		aspect = this.properties.preserve_aspect ? aspect : 1;

		var scale = this.properties.scale || [1,1];
		tex.applyBlur( aspect * scale[0], scale[1], intensity, temp );
		for(var i = 1; i < iterations; ++i)
			temp.applyBlur( aspect * scale[0] * (i+1), scale[1] * (i+1), intensity );

		this.setOutputData(0, temp );
	}

	/*
	LGraphTextureBlur.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_offset;\n\
			uniform float u_intensity;\n\
			void main() {\n\
			   vec4 sum = vec4(0.0);\n\
			   vec4 center = texture2D(u_texture, v_coord);\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -4.0) * 0.05/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -3.0) * 0.09/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -2.0) * 0.12/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -1.0) * 0.15/0.98;\n\
			   sum += center * 0.16/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 4.0) * 0.05/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 3.0) * 0.09/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 2.0) * 0.12/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 1.0) * 0.15/0.98;\n\
			   gl_FragColor = u_intensity * sum;\n\
			}\n\
			";
	*/

	LiteGraph.registerNodeType("texture/blur", LGraphTextureBlur );


	// Texture Glow *****************************************
	//based in https://catlikecoding.com/unity/tutorials/advanced-rendering/bloom/
	function LGraphTextureGlow()
	{
		this.addInput("in","Texture");
		this.addInput("dirt","Texture");
		this.addOutput("out","Texture");
		this.addOutput("glow","Texture");
		this.properties = { enabled: true, intensity: 1, persistence: 0.99, iterations:16, threshold:0, scale: 1, dirt_factor: 0.5, precision: LGraphTexture.DEFAULT };
		this._textures = [];
		this._uniforms = { u_intensity: 1, u_texture: 0, u_glow_texture: 1, u_threshold: 0, u_texel_size: vec2.create() };
	}

	LGraphTextureGlow.title = "Glow";
	LGraphTextureGlow.desc = "Filters a texture giving it a glow effect";
	LGraphTextureGlow.weights = new Float32Array( [0.5,0.4,0.3,0.2] );

	LGraphTextureGlow.widgets_info = {
		"iterations": { type:"number", min: 0, max: 16, step: 1, precision: 0 },
		"threshold": { type:"number", min: 0, max: 10, step: 0.01, precision: 2 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureGlow.prototype.onGetInputs = function(){
		return [["enabled","boolean"],["threshold","number"],["intensity","number"],["persistence","number"],["iterations","number"],["dirt_factor","number"]];
	}

	LGraphTextureGlow.prototype.onGetOutputs = function(){
		return [["average","Texture"]];
	}

	LGraphTextureGlow.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isAnyOutputConnected())
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH || this.getInputOrProperty("enabled" ) === false )
		{
			this.setOutputData(0,tex);
			return;
		}		

		var width = tex.width;
		var height = tex.height;

		var texture_info = { format: tex.format, type: tex.type, minFilter: GL.LINEAR, magFilter: GL.LINEAR, wrap: gl.CLAMP_TO_EDGE	};
		var type = LGraphTexture.getTextureType( this.properties.precision, tex );

		var uniforms = this._uniforms;
		var textures = this._textures;

		//cut
		var shader = LGraphTextureGlow._cut_shader;
		if(!shader)
			shader = LGraphTextureGlow._cut_shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.cut_pixel_shader );

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		uniforms.u_threshold = this.getInputOrProperty("threshold");
		var currentDestination = textures[0] = GL.Texture.getTemporary( width, height, texture_info );
		tex.blit( currentDestination, shader.uniforms(uniforms) );
		var currentSource = currentDestination;

		var iterations = this.getInputOrProperty("iterations");
		iterations = Math.clamp( iterations, 1, 16) | 0;
		var texel_size = uniforms.u_texel_size;
		var intensity = this.getInputOrProperty("intensity");

		uniforms.u_intensity = 1;
		uniforms.u_delta = this.properties.scale; //1

		//downscale/upscale shader
		var shader = LGraphTextureGlow._shader;
		if(!shader)
			shader = LGraphTextureGlow._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.scale_pixel_shader );

		var i = 1;
		//downscale
		for (;i < iterations; i++) {
			width = width>>1;
			if( (height|0) > 1 )
				height = height>>1;
			if( width < 2 )
				break;
			currentDestination = textures[i] = GL.Texture.getTemporary( width, height, texture_info );
			texel_size[0] = 1 / currentSource.width; texel_size[1] = 1 / currentSource.height;
			currentSource.blit( currentDestination, shader.uniforms(uniforms) );
			currentSource = currentDestination;
		}

		//average
		if(this.isOutputConnected(2))
		{
			var average_texture = this._average_texture;
			if(!average_texture || average_texture.type != tex.type || average_texture.format != tex.format )
				average_texture = this._average_texture = new GL.Texture( 1, 1, { type: tex.type, format: tex.format, filter: gl.LINEAR });
			texel_size[0] = 1 / currentSource.width; texel_size[1] = 1 / currentSource.height;
			uniforms.u_intensity = intensity;
			uniforms.u_delta = 1;
			currentSource.blit( average_texture, shader.uniforms(uniforms) ); 
			this.setOutputData( 2, average_texture );
		}

		//upscale and blend 
		gl.enable( gl.BLEND );
		gl.blendFunc( gl.ONE, gl.ONE );
		uniforms.u_intensity = this.getInputOrProperty("persistence");
		uniforms.u_delta = 0.5;

		for (i -= 2; i >= 0; i--) // i-=2 =>  -1 to point to last element in array, -1 to go to texture above
		{ 
			currentDestination = textures[i];
			textures[i] = null;
			texel_size[0] = 1 / currentSource.width; texel_size[1] = 1 / currentSource.height;
			currentSource.blit( currentDestination, shader.uniforms(uniforms) );
			GL.Texture.releaseTemporary( currentSource );
			currentSource = currentDestination;
		}
		gl.disable( gl.BLEND );

		//glow
		if(this.isOutputConnected(1))
		{
			var glow_texture = this._glow_texture;
			if(!glow_texture || glow_texture.width != tex.width || glow_texture.height != tex.height || glow_texture.type != type || glow_texture.format != tex.format )
				glow_texture = this._glow_texture = new GL.Texture( tex.width,  tex.height, { type: type, format: tex.format, filter: gl.LINEAR });
			currentSource.blit( glow_texture );
			this.setOutputData( 1, glow_texture);
		}

		//final composition
		if(this.isOutputConnected(0))
		{
			var final_texture = this._final_texture;
			if(!final_texture || final_texture.width != tex.width || final_texture.height != tex.height || final_texture.type != type || final_texture.format != tex.format )
				final_texture = this._final_texture = new GL.Texture( tex.width, tex.height, { type: type, format: tex.format, filter: gl.LINEAR });

			var dirt_texture = this.getInputData(1);
			var dirt_factor = this.getInputOrProperty("dirt_factor");

			uniforms.u_intensity = intensity;

			shader = dirt_texture ? LGraphTextureGlow._dirt_final_shader : LGraphTextureGlow._final_shader;
			if(!shader)
			{
				if(dirt_texture)
					shader = LGraphTextureGlow._dirt_final_shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.final_pixel_shader, { USE_DIRT: "" } );
				else
					shader = LGraphTextureGlow._final_shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.final_pixel_shader );
			}

			final_texture.drawTo( function(){
				tex.bind(0);
				currentSource.bind(1);
				if(dirt_texture)
				{
					shader.setUniform( "u_dirt_factor", dirt_factor );
					shader.setUniform( "u_dirt_texture", dirt_texture.bind(2) );
				}
				shader.toViewport( uniforms );
			});
			this.setOutputData( 0, final_texture );
		}

		GL.Texture.releaseTemporary( currentSource );
	}

	LGraphTextureGlow.cut_pixel_shader = "precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_threshold;\n\
		void main() {\n\
			gl_FragColor = max( texture2D( u_texture, v_coord ) - vec4( u_threshold ), vec4(0.0) );\n\
		}"

	LGraphTextureGlow.scale_pixel_shader = "precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 u_texel_size;\n\
		uniform float u_delta;\n\
		uniform float u_intensity;\n\
		\n\
		vec4 sampleBox(vec2 uv) {\n\
			vec4 o = u_texel_size.xyxy * vec2(-u_delta, u_delta).xxyy;\n\
			vec4 s = texture2D( u_texture, uv + o.xy ) + texture2D( u_texture, uv + o.zy) + texture2D( u_texture, uv + o.xw) + texture2D( u_texture, uv + o.zw);\n\
			return s * 0.25;\n\
		}\n\
		void main() {\n\
			gl_FragColor = u_intensity * sampleBox( v_coord );\n\
		}"

	LGraphTextureGlow.final_pixel_shader = "precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_glow_texture;\n\
		#ifdef USE_DIRT\n\
			uniform sampler2D u_dirt_texture;\n\
		#endif\n\
		uniform vec2 u_texel_size;\n\
		uniform float u_delta;\n\
		uniform float u_intensity;\n\
		uniform float u_dirt_factor;\n\
		\n\
		vec4 sampleBox(vec2 uv) {\n\
			vec4 o = u_texel_size.xyxy * vec2(-u_delta, u_delta).xxyy;\n\
			vec4 s = texture2D( u_glow_texture, uv + o.xy ) + texture2D( u_glow_texture, uv + o.zy) + texture2D( u_glow_texture, uv + o.xw) + texture2D( u_glow_texture, uv + o.zw);\n\
			return s * 0.25;\n\
		}\n\
		void main() {\n\
			vec4 glow = sampleBox( v_coord );\n\
			#ifdef USE_DIRT\n\
				glow = mix( glow, glow * texture2D( u_dirt_texture, v_coord ), u_dirt_factor );\n\
			#endif\n\
			gl_FragColor = texture2D( u_texture, v_coord ) + u_intensity * glow;\n\
		}"

	LiteGraph.registerNodeType("texture/glow", LGraphTextureGlow );


	// Texture Blur *****************************************
	function LGraphTextureKuwaharaFilter()
	{
		this.addInput("Texture","Texture");
		this.addOutput("Filtered","Texture");
		this.properties = { intensity: 1, radius: 5 };
	}

	LGraphTextureKuwaharaFilter.title = "Kuwahara Filter";
	LGraphTextureKuwaharaFilter.desc = "Filters a texture giving an artistic oil canvas painting";

	LGraphTextureKuwaharaFilter.max_radius = 10;
	LGraphTextureKuwaharaFilter._shaders = [];

	LGraphTextureKuwaharaFilter.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._temp_texture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
		{
			//we need two textures to do the blurring
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			//this._final_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
		}

		//iterations
		var radius = this.properties.radius;
		radius = Math.min( Math.floor(radius), LGraphTextureKuwaharaFilter.max_radius );
		if(radius == 0) //skip blurring
		{
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if(!aspect && window.gl !== undefined)
			aspect = gl.canvas.height / gl.canvas.width;
		if(!aspect)
			aspect = 1;
		aspect = this.properties.preserve_aspect ? aspect : 1;

		if(!LGraphTextureKuwaharaFilter._shaders[ radius ])
			LGraphTextureKuwaharaFilter._shaders[ radius ] = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureKuwaharaFilter.pixel_shader, { RADIUS: radius.toFixed(0) });

		var shader = LGraphTextureKuwaharaFilter._shaders[ radius ];
		var mesh = GL.Mesh.getScreenQuad();
		tex.bind(0);

		this._temp_texture.drawTo( function() {
			shader.uniforms({ u_texture: 0, u_intensity: intensity, u_resolution: [tex.width, tex.height], u_iResolution: [1/tex.width,1/tex.height]}).draw(mesh);
		});

		this.setOutputData(0, this._temp_texture);
	}

//from https://www.shadertoy.com/view/MsXSz4
LGraphTextureKuwaharaFilter.pixel_shader = "\n\
	precision highp float;\n\
	varying vec2 v_coord;\n\
	uniform sampler2D u_texture;\n\
	uniform float u_intensity;\n\
	uniform vec2 u_resolution;\n\
	uniform vec2 u_iResolution;\n\
	#ifndef RADIUS\n\
		#define RADIUS 7\n\
	#endif\n\
	void main() {\n\
	\n\
		const int radius = RADIUS;\n\
		vec2 fragCoord = v_coord;\n\
		vec2 src_size = u_iResolution;\n\
		vec2 uv = v_coord;\n\
		float n = float((radius + 1) * (radius + 1));\n\
		int i;\n\
		int j;\n\
		vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);\n\
		vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);\n\
		vec3 c;\n\
		\n\
		for (int j = -radius; j <= 0; ++j)  {\n\
			for (int i = -radius; i <= 0; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m0 += c;\n\
				s0 += c * c;\n\
			}\n\
		}\n\
		\n\
		for (int j = -radius; j <= 0; ++j)  {\n\
			for (int i = 0; i <= radius; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m1 += c;\n\
				s1 += c * c;\n\
			}\n\
		}\n\
		\n\
		for (int j = 0; j <= radius; ++j)  {\n\
			for (int i = 0; i <= radius; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m2 += c;\n\
				s2 += c * c;\n\
			}\n\
		}\n\
		\n\
		for (int j = 0; j <= radius; ++j)  {\n\
			for (int i = -radius; i <= 0; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m3 += c;\n\
				s3 += c * c;\n\
			}\n\
		}\n\
		\n\
		float min_sigma2 = 1e+2;\n\
		m0 /= n;\n\
		s0 = abs(s0 / n - m0 * m0);\n\
		\n\
		float sigma2 = s0.r + s0.g + s0.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m0, 1.0);\n\
		}\n\
		\n\
		m1 /= n;\n\
		s1 = abs(s1 / n - m1 * m1);\n\
		\n\
		sigma2 = s1.r + s1.g + s1.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m1, 1.0);\n\
		}\n\
		\n\
		m2 /= n;\n\
		s2 = abs(s2 / n - m2 * m2);\n\
		\n\
		sigma2 = s2.r + s2.g + s2.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m2, 1.0);\n\
		}\n\
		\n\
		m3 /= n;\n\
		s3 = abs(s3 / n - m3 * m3);\n\
		\n\
		sigma2 = s3.r + s3.g + s3.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m3, 1.0);\n\
		}\n\
	}\n\
	";

	LiteGraph.registerNodeType("texture/kuwahara", LGraphTextureKuwaharaFilter );


	// Texture Webcam *****************************************
	function LGraphTextureWebcam()
	{
		this.addOutput("Webcam","Texture");
		this.properties = { texture_name: "", facingMode: "user" };
		this.boxcolor = "black";
		this.version = 0;
	}

	LGraphTextureWebcam.title = "Webcam";
	LGraphTextureWebcam.desc = "Webcam texture";

	LGraphTextureWebcam.is_webcam_open = false;

	LGraphTextureWebcam.prototype.openStream = function()
	{
		if (!navigator.getUserMedia) {
		  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
		  return;
		}

		this._waiting_confirmation = true;

		// Not showing vendor prefixes.
		var constraints = { audio: false, video: { facingMode: this.properties.facingMode } };
		navigator.mediaDevices.getUserMedia( constraints ).then( this.streamReady.bind(this) ).catch( onFailSoHard );

		var that = this;
		function onFailSoHard(e) {
			LGraphTextureWebcam.is_webcam_open = false;
			console.log('Webcam rejected', e);
			that._webcam_stream = false;
			that.boxcolor = "red";
			that.trigger("stream_error");
		};
	}

	LGraphTextureWebcam.prototype.closeStream = function()
	{
		if(this._webcam_stream)
		{
			var tracks = this._webcam_stream.getTracks();
			if(tracks.length)
			{
				for(var i = 0;i < tracks.length; ++i)
					tracks[i].stop();
			}
			LGraphTextureWebcam.is_webcam_open = false;
			this._webcam_stream = null;
			this._video = null;
			this.boxcolor = "black";
			this.trigger("stream_closed");
		}
	}

	LGraphTextureWebcam.prototype.streamReady = function(localMediaStream)
	{
		this._webcam_stream = localMediaStream;
		//this._waiting_confirmation = false;
		this.boxcolor = "green";
	    var video = this._video;
		if(!video)
		{
			video = document.createElement("video");
			video.autoplay = true;
		    video.srcObject = localMediaStream;
			this._video = video;
			//document.body.appendChild( video ); //debug
			//when video info is loaded (size and so)
			video.onloadedmetadata = function(e) {
				// Ready to go. Do some stuff.
				LGraphTextureWebcam.is_webcam_open = true;
				console.log(e);
			};
		}
		this.trigger("stream_ready",video);
	}

	LGraphTextureWebcam.prototype.onPropertyChanged = function(name,value)
	{
		if(name == "facingMode")
		{
			this.properties.facingMode = value;
			this.closeStream();
			this.openStream();
		}
	}

	LGraphTextureWebcam.prototype.onRemoved = function()
	{
		if(!this._webcam_stream)
			return;

		var tracks = this._webcam_stream.getTracks();
		if(tracks.length)
		{
			for(var i = 0;i < tracks.length; ++i)
				tracks[i].stop();
		}

		this._webcam_stream = null;
		this._video = null;
	}

	LGraphTextureWebcam.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!this._video)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
			ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
		else
		{
			if(this._video_texture)
				ctx.drawImage(this._video_texture, 0, 0, this.size[0], this.size[1]);
		}
		ctx.restore();
	}

	LGraphTextureWebcam.prototype.onExecute = function()
	{
		if(this._webcam_stream == null && !this._waiting_confirmation)
			this.openStream();

		if(!this._video || !this._video.videoWidth)
			return;

		var width = this._video.videoWidth;
		var height = this._video.videoHeight;

		var temp = this._video_texture;
		if(!temp || temp.width != width || temp.height != height )
			this._video_texture = new GL.Texture( width, height, { format: gl.RGB, filter: gl.LINEAR });

		this._video_texture.uploadImage( this._video );
		this._video_texture.version = ++this.version;
		
		if(this.properties.texture_name)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.texture_name ] = this._video_texture;
		}

		this.setOutputData(0,this._video_texture);
		for(var i = 1; i < this.outputs.length; ++i)
		{
			if(!this.outputs[i])
				continue;
			switch( this.outputs[i].name )
			{
				case "width": this.setOutputData(i,this._video.videoWidth);break;
				case "height": this.setOutputData(i,this._video.videoHeight);break;
			}
		}
	}

	LGraphTextureWebcam.prototype.onGetOutputs = function()
	{
		return [["width","number"],["height","number"],["stream_ready",LiteGraph.EVENT],["stream_closed",LiteGraph.EVENT],["stream_error",LiteGraph.EVENT]];
	}

	LiteGraph.registerNodeType("texture/webcam", LGraphTextureWebcam );



	//from https://github.com/spite/Wagner
	function LGraphLensFX()
	{
		this.addInput("in","Texture");
		this.addInput("f","number");
		this.addOutput("out","Texture");
		this.properties = { enabled: true, factor: 1, precision: LGraphTexture.LOW };

		this._uniforms = { u_texture: 0, u_factor: 1 };
	}

	LGraphLensFX.title = "Lens FX";
	LGraphLensFX.desc = "distortion and chromatic aberration";

	LGraphLensFX.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphLensFX.prototype.onGetInputs = function() { return [["enabled","boolean"]]; }

	LGraphLensFX.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH || this.getInputOrProperty("enabled" ) === false )
		{
			this.setOutputData(0, tex );
			return;
		}

		var temp = this._temp_texture;
		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = LGraphLensFX._shader;
		if(!shader)
			shader = LGraphLensFX._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphLensFX.pixel_shader );

		var factor = this.getInputData(1);
		if(factor == null)
			factor = this.properties.factor;

		var uniforms = this._uniforms;
		uniforms.u_factor = factor;

		//apply shader
		gl.disable( gl.DEPTH_TEST );
		temp.drawTo(function(){
			tex.bind(0);
			shader.uniforms(uniforms).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData(0,temp);
	}

	LGraphLensFX.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_factor;\n\
			vec2 barrelDistortion(vec2 coord, float amt) {\n\
				vec2 cc = coord - 0.5;\n\
				float dist = dot(cc, cc);\n\
				return coord + cc * dist * amt;\n\
			}\n\
			\n\
			float sat( float t )\n\
			{\n\
				return clamp( t, 0.0, 1.0 );\n\
			}\n\
			\n\
			float linterp( float t ) {\n\
				return sat( 1.0 - abs( 2.0*t - 1.0 ) );\n\
			}\n\
			\n\
			float remap( float t, float a, float b ) {\n\
				return sat( (t - a) / (b - a) );\n\
			}\n\
			\n\
			vec4 spectrum_offset( float t ) {\n\
				vec4 ret;\n\
				float lo = step(t,0.5);\n\
				float hi = 1.0-lo;\n\
				float w = linterp( remap( t, 1.0/6.0, 5.0/6.0 ) );\n\
				ret = vec4(lo,1.0,hi, 1.) * vec4(1.0-w, w, 1.0-w, 1.);\n\
			\n\
				return pow( ret, vec4(1.0/2.2) );\n\
			}\n\
			\n\
			const float max_distort = 2.2;\n\
			const int num_iter = 12;\n\
			const float reci_num_iter_f = 1.0 / float(num_iter);\n\
			\n\
			void main()\n\
			{	\n\
				vec2 uv=v_coord;\n\
				vec4 sumcol = vec4(0.0);\n\
				vec4 sumw = vec4(0.0);	\n\
				for ( int i=0; i<num_iter;++i )\n\
				{\n\
					float t = float(i) * reci_num_iter_f;\n\
					vec4 w = spectrum_offset( t );\n\
					sumw += w;\n\
					sumcol += w * texture2D( u_texture, barrelDistortion(uv, .6 * max_distort*t * u_factor ) );\n\
				}\n\
				gl_FragColor = sumcol / sumw;\n\
			}";

	LiteGraph.registerNodeType("texture/lensfx", LGraphLensFX );


	//simple exposition, but plan to expand it to support different gamma curves
	function LGraphExposition()
	{
		this.addInput("in","Texture");
		this.addInput("exp","number");
		this.addOutput("out","Texture");
		this.properties = { exposition: 1, precision: LGraphTexture.LOW };
		this._uniforms = { u_texture: 0, u_exposition: 1 };
	}

	LGraphExposition.title = "Exposition";
	LGraphExposition.desc = "Controls texture exposition";

	LGraphExposition.widgets_info = {
		"exposition": { widget:"slider", min:0,max:3 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphExposition.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._temp_texture;
		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = LGraphExposition._shader;
		if(!shader)
			shader = LGraphExposition._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphExposition.pixel_shader );

		var exp = this.properties.exposition;
		var exp_input = this.getInputData(1);
		if(exp_input != null)
			exp = this.properties.exposition = exp_input;
		var uniforms = this._uniforms;

		//apply shader
		temp.drawTo(function(){
			gl.disable( gl.DEPTH_TEST );
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0,temp);
	}

	LGraphExposition.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_exposition;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, v_coord );\n\
				gl_FragColor = vec4( color.xyz * u_exposition, color.a );\n\
			}";

	LiteGraph.registerNodeType("texture/exposition", LGraphExposition );



	function LGraphToneMapping()
	{
		this.addInput("in","Texture");
		this.addInput("avg","number");
		this.addOutput("out","Texture");
		this.properties = { enabled: true, scale:1, gamma: 1, average_lum: 1, lum_white: 1, precision: LGraphTexture.LOW };

		this._uniforms = { 
			u_texture: 0,
			u_lumwhite2: 1,
			u_igamma: 1,
			u_scale: 1,
			u_average_lum: 1
		};
	}

	LGraphToneMapping.title = "Tone Mapping";
	LGraphToneMapping.desc = "Applies Tone Mapping to convert from high to low";

	LGraphToneMapping.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphToneMapping.prototype.onGetInputs = function() {
		return [["enabled","boolean"]];
	}

	LGraphToneMapping.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH || this.getInputOrProperty("enabled" ) === false )
		{
			this.setOutputData(0, tex );
			return;
		}

		var temp = this._temp_texture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });

		//apply shader
		var shader = LGraphToneMapping._shader;
		if(!shader)
			shader = LGraphToneMapping._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphToneMapping.pixel_shader );

		var avg = this.getInputData(1);
		if(avg != null)
			this.properties.average_lum = avg;

		var uniforms = this._uniforms;
		uniforms.u_lumwhite2 = this.properties.lum_white * this.properties.lum_white;
		uniforms.u_scale = this.properties.scale;
		uniforms.u_average_lum = this.properties.average_lum;
		uniforms.u_igamma = 1/this.properties.gamma;

		//apply shader
		gl.disable( gl.DEPTH_TEST );
		temp.drawTo(function(){
			tex.bind(0);
			shader.uniforms(uniforms).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData(0,this._temp_texture);
	}

	LGraphToneMapping.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_scale;\n\
			uniform float u_average_lum;\n\
			uniform float u_lumwhite2;\n\
			uniform float u_igamma;\n\
			vec3 RGB2xyY (vec3 rgb)\n\
			{\n\
				 const mat3 RGB2XYZ = mat3(0.4124, 0.3576, 0.1805,\n\
										   0.2126, 0.7152, 0.0722,\n\
										   0.0193, 0.1192, 0.9505);\n\
				vec3 XYZ = RGB2XYZ * rgb;\n\
				\n\
				float f = (XYZ.x + XYZ.y + XYZ.z);\n\
				return vec3(XYZ.x / f,\n\
							XYZ.y / f,\n\
							XYZ.y);\n\
			}\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, v_coord );\n\
				vec3 rgb = color.xyz;\n\
				//Ld - this part of the code is the same for both versions\n\
				float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));\n\
				float L = (u_scale / u_average_lum) * lum;\n\
				float Ld = (L * (1.0 + L / u_lumwhite2)) / (1.0 + L);\n\
				//first\n\
				//vec3 xyY = RGB2xyY(rgb);\n\
				//xyY.z *= Ld;\n\
				//rgb = xyYtoRGB(xyY);\n\
				//second\n\
				rgb = (rgb / lum) * Ld;\n\
				rgb = pow( rgb, vec3( u_igamma ) );\n\
				gl_FragColor = vec4( rgb, color.a );\n\
			}";


	LiteGraph.registerNodeType("texture/tonemapping", LGraphToneMapping );


	function LGraphTexturePerlin()
	{
		this.addOutput("out","Texture");
		this.properties = { width: 512, height: 512, seed:0, persistence: 0.1, octaves: 8, scale: 1, offset: [0,0], amplitude: 1, precision: LGraphTexture.DEFAULT };
		this._key = 0;
		this._uniforms = { u_persistence: 0.1, u_seed: 0, u_offset: vec2.create(), u_scale: 1, u_viewport: vec2.create() };
	}

	LGraphTexturePerlin.title = "Perlin";
	LGraphTexturePerlin.desc = "Generates a perlin noise texture";

	LGraphTexturePerlin.widgets_info = {
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES },
		width: { type: "Number", precision: 0, step: 1 },
		height: { type: "Number", precision: 0, step: 1 },
		octaves: { type: "Number", precision: 0, step: 1, min: 1, max: 50 }
	};

	LGraphTexturePerlin.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var w = this.properties.width|0;
		var h = this.properties.height|0;
		if(w == 0)	w = gl.viewport_data[2]; //0 means default
		if(h == 0)	h = gl.viewport_data[3]; //0 means default
		var type = LGraphTexture.getTextureType( this.properties.precision );

		var temp = this._temp_texture;
		if(!temp || temp.width != w || temp.height != h || temp.type != type )
			temp = this._temp_texture = new GL.Texture( w, h, { type: type, format: gl.RGB, filter: gl.LINEAR });

		//reusing old
		var key = w + h + type + this.properties.persistence + this.properties.octaves + this.properties.scale + this.properties.seed + this.properties.offset[0] + this.properties.offset[1] + this.properties.amplitude;
		if(key == this._key)
		{
			this.setOutputData( 0, temp );
			return;
		}
		this._key = key;

		//gather uniforms
		var uniforms = this._uniforms;
		uniforms.u_persistence = this.properties.persistence;
		uniforms.u_octaves = this.properties.octaves;
		uniforms.u_offset[0] = this.properties.offset[0];
		uniforms.u_offset[1] = this.properties.offset[1];
		uniforms.u_scale = this.properties.scale;
		uniforms.u_amplitude = this.properties.amplitude;
		uniforms.u_viewport[0] = w;
		uniforms.u_viewport[1] = h;
		uniforms.u_seed = this.properties.seed * 128;

		//render
		var shader = LGraphTexturePerlin._shader;
		if(!shader)
			shader = LGraphTexturePerlin._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTexturePerlin.pixel_shader );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		temp.drawTo( function() {
			shader.uniforms( uniforms ).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData( 0, temp );
	}

	LGraphTexturePerlin.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform vec2 u_offset;\n\
			uniform float u_scale;\n\
			uniform float u_persistence;\n\
			uniform int u_octaves;\n\
			uniform float u_amplitude;\n\
			uniform vec2 u_viewport;\n\
			uniform float u_seed;\n\
			#define M_PI 3.14159265358979323846\n\
			\n\
			float rand(vec2 c){	return fract(sin(dot(c.xy ,vec2( 12.9898 + u_seed,78.233 + u_seed))) * 43758.5453); }\n\
			\n\
			float noise(vec2 p, float freq ){\n\
				float unit = u_viewport.x/freq;\n\
				vec2 ij = floor(p/unit);\n\
				vec2 xy = mod(p,unit)/unit;\n\
				//xy = 3.*xy*xy-2.*xy*xy*xy;\n\
				xy = .5*(1.-cos(M_PI*xy));\n\
				float a = rand((ij+vec2(0.,0.)));\n\
				float b = rand((ij+vec2(1.,0.)));\n\
				float c = rand((ij+vec2(0.,1.)));\n\
				float d = rand((ij+vec2(1.,1.)));\n\
				float x1 = mix(a, b, xy.x);\n\
				float x2 = mix(c, d, xy.x);\n\
				return mix(x1, x2, xy.y);\n\
			}\n\
			\n\
			float pNoise(vec2 p, int res){\n\
				float persistance = u_persistence;\n\
				float n = 0.;\n\
				float normK = 0.;\n\
				float f = 4.;\n\
				float amp = 1.0;\n\
				int iCount = 0;\n\
				for (int i = 0; i<50; i++){\n\
					n+=amp*noise(p, f);\n\
					f*=2.;\n\
					normK+=amp;\n\
					amp*=persistance;\n\
					if (iCount >= res)\n\
						break;\n\
					iCount++;\n\
				}\n\
				float nf = n/normK;\n\
				return nf*nf*nf*nf;\n\
			}\n\
			void main() {\n\
				vec2 uv = v_coord * u_scale * u_viewport + u_offset * u_scale;\n\
				vec4 color = vec4( pNoise( uv, u_octaves ) * u_amplitude );\n\
				gl_FragColor = color;\n\
			}";

	LiteGraph.registerNodeType("texture/perlin", LGraphTexturePerlin );



	function LGraphTextureCanvas2D()
	{
		this.addOutput("out","Texture");
		this.properties = { code: "", width: 512, height: 512, precision: LGraphTexture.DEFAULT };
		this._func = null;
		this._temp_texture = null;
	}

	LGraphTextureCanvas2D.title = "Canvas2D";
	LGraphTextureCanvas2D.desc = "Executes Canvas2D code inside a texture or the viewport";

	LGraphTextureCanvas2D.widgets_info = {
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES },
		code: { type: "code" },
		width: { type: "Number", precision: 0, step: 1 },
		height: { type: "Number", precision: 0, step: 1 }
	};

	LGraphTextureCanvas2D.prototype.onPropertyChanged = function(name, value)
	{
		if(name == "code" && LiteGraph.allow_scripts )
		{
			this._func = null;
			try
			{
				this._func = new Function( "canvas", "ctx", "time", "script", value );
				this.boxcolor = "#00FF00";
			}
			catch (err)
			{
				this.boxcolor = "#FF0000";
				console.error("Error parsing script");
				console.error(err);
			}
		}
	}

	LGraphTextureCanvas2D.prototype.onExecute = function()
	{
		var func = this._func;
		if(!func || !this.isOutputConnected(0))
			return;

		if(!global.enableWebGLCanvas)
		{
			console.warn("cannot use LGraphTextureCanvas2D if Canvas2DtoWebGL is not included");
			return;
		}

		var width = this.properties.width || gl.canvas.width;
		var height = this.properties.height || gl.canvas.height;
		var temp = this._temp_texture;
		if(!temp || temp.width != width || temp.height != height )
			temp = this._temp_texture = new GL.Texture( width, height, { format: gl.RGBA, filter: gl.LINEAR });

		var that = this;
		var time = this.graph.getTime();
		temp.drawTo(function(){
			gl.start2D();
			try
			{
				if(func.draw)
					func.draw.call( that, gl.canvas, gl, time, func );
				else
					func.call( that, gl.canvas, gl, time, func );
				that.boxcolor = "#00FF00";
			}
			catch (err)
			{
				that.boxcolor = "#FF0000";
				console.error("Error executing script");
				console.error(err);
			}
			gl.finish2D();
		});

		this.setOutputData( 0, temp );
	}

	LiteGraph.registerNodeType("texture/canvas2D", LGraphTextureCanvas2D );


	function LGraphTextureMatte()
	{
		this.addInput("in","Texture");

		this.addOutput("out","Texture");
		this.properties = { key_color: vec3.fromValues(0.,1.,0.), threshold: 0.8, slope: 0.2, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureMatte.title = "Matte";
	LGraphTextureMatte.desc = "Extracts background";

	LGraphTextureMatte.widgets_info = { 
		"key_color": { widget:"color" },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMatte.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex)
			return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		if(!this._uniforms)
			this._uniforms = { u_texture: 0, u_key_color: this.properties.key_color, u_threshold: 1, u_slope: 1 };
		var uniforms = this._uniforms;

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureMatte._shader;
		if(!shader)
			shader = LGraphTextureMatte._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureMatte.pixel_shader );

		uniforms.u_key_color = this.properties.key_color;
		uniforms.u_threshold = this.properties.threshold;
		uniforms.u_slope = this.properties.slope;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms( uniforms ).draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureMatte.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec3 u_key_color;\n\
			uniform float u_threshold;\n\
			uniform float u_slope;\n\
			\n\
			void main() {\n\
				vec3 color = texture2D( u_texture, v_coord ).xyz;\n\
				float diff = length( normalize(color) - normalize(u_key_color) );\n\
				float edge = u_threshold * (1.0 - u_slope);\n\
				float alpha = smoothstep( edge, u_threshold, diff);\n\
				gl_FragColor = vec4( color, alpha );\n\
			}";

	LiteGraph.registerNodeType("texture/matte", LGraphTextureMatte );


	//***********************************
	//Cubemap reader (to pass a cubemap to a node that requires cubemaps and no images)
	function LGraphCubemap()
	{
		this.addOutput("Cubemap","Cubemap");
		this.properties = {name:""};
		this.size = [LGraphTexture.image_preview_size, LGraphTexture.image_preview_size];
	}

	LGraphCubemap.title = "Cubemap";

	LGraphCubemap.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._drop_texture = null;
			this.properties.name = "";
		}
		else
		{
			if( typeof(data) == "string" )
				this._drop_texture = GL.Texture.fromURL(data);
			else
				this._drop_texture = GL.Texture.fromDDSInMemory(data);
			this.properties.name = filename;
		}
	}

	LGraphCubemap.prototype.onExecute = function()
	{
		if(this._drop_texture)
		{
			this.setOutputData(0, this._drop_texture);
			return;
		}

		if(!this.properties.name)
			return;

		var tex = LGraphTexture.getTexture( this.properties.name );
		if(!tex) 
			return;

		this._last_tex = tex;
		this.setOutputData(0, tex);
	}

	LGraphCubemap.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!ctx.webgl)
			return;

		var cube_mesh = gl.meshes["cube"];
		if(!cube_mesh)
			cube_mesh = gl.meshes["cube"] = GL.Mesh.cube({size:1});

		//var view = mat4.lookAt( mat4.create(), [0,0
	}

	LiteGraph.registerNodeType("texture/cubemap", LGraphCubemap );

} //litegl.js defined

})(this);