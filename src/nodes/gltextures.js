//Works with Litegl.js to create WebGL nodes
if(typeof(LiteGraph) != "undefined")
{
	function LGraphTexture()
	{
		this.addOutput("Texture","Texture");
		this.properties = { name:"", filter: true };
		this.size = [LGraphTexture.image_preview_size, LGraphTexture.image_preview_size];
	}

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
		{
			this.loadTexture(name);
			return null;
		}

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

	LGraphTexturePreview.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		if(!ctx.webgl)
			return; //not working well

		var tex = this.getInputData(0);
		if(!tex) return;

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
		if(!tex) return;

		if(this.properties.name)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.name ] = tex;
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

		/*
		if(this.properties.low_precision)
			type = gl.UNSIGNED_BYTE;

		if(!this._tex || this._tex.width != width || this._tex.height != height || this._tex.type != type )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		*/

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
		this.addOutput("Texture","Texture");
		this.properties = {code:"", width: 512, height: 512};

		this.properties.code = "\nvoid main() {\n  vec2 uv = coord;\n  vec3 color = vec3(0.0);\n//your code here\n\ngl_FragColor = vec4(color, 1.0);\n}\n";
	}

	LGraphTextureShader.title = "Shader";
	LGraphTextureShader.desc = "Texture shader";
	LGraphTextureShader.widgets_info = {
		"code": { type:"code" },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureShader.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		//replug 
		if(this._shader_code != this.properties.code)
		{
			this._shader_code = this.properties.code;
			this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureShader.pixel_shader + this.properties.code );
			if(!this._shader) {
				this.boxcolor = "red";
				return;
			}
			else
				this.boxcolor = "green";
			/*
			var uniforms = this._shader.uniformLocations;
			//disconnect inputs
			if(this.inputs)
				for(var i = 0; i < this.inputs.length; i++)
				{
					var slot = this.inputs[i];
					if(slot.link != null)
						this.disconnectInput(i);
				}

			for(var i = 0; i < uniforms.length; i++)
			{
				var type = "number";
				if( this._shader.isSampler[i] )
					type = "texture";
				else
				{
					var v = gl.getUniform(this._shader.program, i);
					type = typeof(v);
					if(type == "object" && v.length)
					{
						switch(v.length)
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
				}
				this.addInput(i,type);
			}
			*/
		}

		if(!this._tex || this._tex.width != this.properties.width || this._tex.height != this.properties.height )
			this._tex = new GL.Texture( this.properties.width, this.properties.height, { format: gl.RGBA, filter: gl.LINEAR });
		var tex = this._tex;
		var shader = this._shader;
		var time = this.graph.getTime();
		tex.drawTo(function()	{
			shader.uniforms({texSize: [tex.width, tex.height], time: time}).draw( Mesh.getScreenQuad() );
		});

		this.setOutputData(0, this._tex);
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
				uv += texture2D(u_textureB, uv).rg * u_factor;\n\
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


	// Texture Copy *****************************************
	function LGraphTextureAverage()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { low_precision: false };
	}

	LGraphTextureAverage.title = "Average";
	LGraphTextureAverage.desc = "Compute the total average of a texture and stores it as a 1x1 pixel texture";

	LGraphTextureAverage.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		if(!LGraphTextureAverage._shader)
		{
			LGraphTextureAverage._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureAverage.pixel_shader);
			var samples = new Float32Array(32);
			for(var i = 0; i < 32; ++i)	
				samples[i] = Math.random();
			LGraphTextureAverage._shader.uniforms({u_samples_a: samples.subarray(0,16), u_samples_b: samples.subarray(16,32) });
		}

		var temp = this._temp_texture;
		var type = this.properties.low_precision ? gl.UNSIGNED_BYTE : tex.type;
		if(!temp || temp.type != type )
			this._temp_texture = new GL.Texture( 1, 1, { type: type, format: gl.RGBA, filter: gl.NEAREST });

		var shader = LGraphTextureAverage._shader;
		this._temp_texture.drawTo(function(){
			tex.toViewport(shader,{u_texture:0});
		});

		this.setOutputData(0,this._temp_texture);
	}

	LGraphTextureAverage.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			uniform mat4 u_samples_a;\n\
			uniform mat4 u_samples_b;\n\
			uniform sampler2D u_texture;\n\
			varying vec2 v_coord;\n\
			\n\
			void main() {\n\
				vec4 color = vec4(0.0);\n\
				for(int i = 0; i < 4; ++i)\n\
					for(int j = 0; j < 4; ++j)\n\
					{\n\
						color += texture2D(u_texture, vec2( u_samples_a[i][j], u_samples_b[i][j] ) );\n\
						color += texture2D(u_texture, vec2( 1.0 - u_samples_a[i][j], u_samples_b[i][j] ) );\n\
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
			console.error("image comes from an unsafe location, cannot be uploaded to webgl");
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
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLUT.title = "LUT";
	LGraphTextureLUT.desc = "Apply LUT to Texture";
	LGraphTextureLUT.widgets_info = {"texture": { widget:"texture"} };

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

		if(!tex) return;

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
		this.properties = { precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureMix._shader)
			LGraphTextureMix._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureMix.pixel_shader );
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
		var texMix = this.getInputData(2);
		if(!texA || !texB || !texMix) return;

		this._tex = LGraphTexture.getTargetTexture( texA, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureMix._shader;

		this._tex.drawTo( function() {
			texA.bind(0);
			texB.bind(1);
			texMix.bind(2);
			shader.uniforms({u_textureA:0,u_textureB:1,u_textureMix:2}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureMix.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_textureA;\n\
			uniform sampler2D u_textureB;\n\
			uniform sampler2D u_textureMix;\n\
			\n\
			void main() {\n\
			   gl_FragColor = mix( texture2D(u_textureA, v_coord), texture2D(u_textureB, v_coord), texture2D(u_textureMix, v_coord) );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/mix", LGraphTextureMix );

	// Texture Edges detection *****************************************
	function LGraphTextureEdges()
	{
		this.addInput("Tex.","Texture");

		this.addOutput("Edges","Texture");
		this.properties = { invert: true, factor: 1, precision: LGraphTexture.DEFAULT };

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

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({u_texture:0, u_isize:[1/tex.width,1/tex.height], u_factor: factor, u_invert: invert ? 1 : 0}).draw(mesh);
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
			   gl_FragColor = vec4( diff.xyz, center.a );\n\
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
		this.properties = { distance:100, range: 50, high_precision: false };

		if(!LGraphTextureDepthRange._shader)
			LGraphTextureDepthRange._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureDepthRange.pixel_shader );
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

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureDepthRange._shader;

		//TODO: this asumes we have LiteScene, change it
		var camera = LS.Renderer._current_camera;
		var planes = [LS.Renderer._current_camera.near, LS.Renderer._current_camera.far];

		this._temp_texture.drawTo( function() {
			tex.bind(0);
			shader.uniforms({u_texture:0, u_distance: distance, u_range: range, u_camera_planes: planes })
				.draw(mesh);
		});

		this.setOutputData(0, this._temp_texture);
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
				float n = u_camera_planes.x;\n\
				float f = u_camera_planes.y;\n\
				return (2.0 * n) / (f + n - texture2D(u_texture, v_coord).x * (f - n));\n\
			}\n\
			\n\
			void main() {\n\
				float diff = abs(LinearDepth() * u_camera_planes.y - u_distance);\n\
				float dof = 1.0;\n\
				if(diff <= u_range)\n\
					dof = diff / u_range;\n\
			   gl_FragColor = vec4(dof);\n\
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
		this.properties = { intensity: 1, iterations: 1, preserve_aspect: false, scale:[1,1] };

		if(!LGraphTextureBlur._shader)
			LGraphTextureBlur._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureBlur.pixel_shader );
	}

	LGraphTextureBlur.title = "Blur";
	LGraphTextureBlur.desc = "Blur a texture";

	LGraphTextureBlur.max_iterations = 20;

	LGraphTextureBlur.prototype.onExecute = function()
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
			this._final_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
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

		var start_texture = tex;
		var scale = this.properties.scale || [1,1];
		var origin = start_texture;
		for(var i = 0; i < iterations; ++i)
		{
			origin.applyBlur( aspect * scale[0] * i, scale[1] * i, intensity, this._temp_texture, this._final_texture );
			origin = this._final_texture;
		}

		this.setOutputData(0, this._final_texture);
	}

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
			   /*gl_FragColor.a = center.a*/;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/blur", LGraphTextureBlur );

	// Texture Webcam *****************************************
	function LGraphTextureWebcam()
	{
		this.addOutput("Webcam","Texture");
		this.properties = { texture_name: "" };
	}

	LGraphTextureWebcam.title = "Webcam";
	LGraphTextureWebcam.desc = "Webcam texture";


	LGraphTextureWebcam.prototype.openStream = function()
	{
		//Vendor prefixes hell
		navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
		window.URL = window.URL || window.webkitURL;

		if (!navigator.getUserMedia) {
		  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
		  return;
		}

		this._waiting_confirmation = true;
		var that = this;

		// Not showing vendor prefixes.
		navigator.getUserMedia({video: true}, this.streamReady.bind(this), onFailSoHard);		

		function onFailSoHard(e) {
			console.log('Webcam rejected', e);
			that._webcam_stream = false;
			that.box_color = "red";
		};
	}

	LGraphTextureWebcam.prototype.streamReady = function(localMediaStream)
	{
		this._webcam_stream = localMediaStream;
		//this._waiting_confirmation = false;

	    var video = this._video;
		if(!video)
		{
			video = document.createElement("video");
			video.autoplay = true;
		    video.src = window.URL.createObjectURL( localMediaStream );
			this._video = video;
			//document.body.appendChild( video ); //debug
			//when video info is loaded (size and so)
			video.onloadedmetadata = function(e) {
				// Ready to go. Do some stuff.
				console.log(e);
			};
		}
	}

	LGraphTextureWebcam.prototype.onRemoved = function()
	{
		if(this._webcam_stream)
		{
			this._webcam_stream.stop();
			this._webcam_stream = null;
			this._video = null;
		}
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
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
			ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
		}
		else
		{
			if(this._temp_texture)
				ctx.drawImage(this._temp_texture, 0, 0, this.size[0], this.size[1]);
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

		var temp = this._temp_texture;
		if(!temp || temp.width != width || temp.height != height )
			this._temp_texture = new GL.Texture( width, height, { format: gl.RGB, filter: gl.LINEAR });

		this._temp_texture.uploadImage( this._video );
		
		if(this.properties.texture_name)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.texture_name ] = this._temp_texture;
		}

		this.setOutputData(0,this._temp_texture);
	}

	LiteGraph.registerNodeType("texture/webcam", LGraphTextureWebcam );


	function LGraphTextureMatte()
	{
		this.addInput("in","Texture");

		this.addOutput("out","Texture");
		this.properties = { key_color: vec3.fromValues(0.,1.,0.), threshold: 0.8, slope: 0.2, precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureMatte._shader)
			LGraphTextureMatte._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureMatte.pixel_shader );
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