(function(global) {
    var LiteGraph = global.LiteGraph;
	var LGraphCanvas = global.LGraphCanvas;

    if (typeof GL == "undefined")
		return;


	//common actions to all shader node classes
	function setShaderNode( node_ctor )
	{
		node_ctor.color = "#345";
	}

	function getShaderInputLinkName( node, slot )
	{
		if(!node.inputs)
			return null;
		var link = node.getInputLink( slot );
		if( !link )
			return null;
		var origin_node = node.graph.getNodeById( link.origin_id );
		if( !origin_node )
			return null;
		if(origin_node.getOutputVarName)
			return origin_node.getOutputVarName(link.origin_slot);
		//generate
		return "link_" + origin_node.id + "_" + link.origin_slot;
	}

	function getShaderOutputLinkName( node, slot )
	{
		return "link_" + node.id + "_" + slot;
	}

	//used to host a shader body *******************
	function LGShaderContext()
	{
		this.vs_template = "";
		this.fs_template = "";
		this._uniforms = {};
		this._codeparts = {};
	}

	LGShaderContext.valid_types = ["float","vec2","vec3","vec4","sampler2D","mat3","mat4","int","boolean"];

	LGShaderContext.prototype.clear = function()
	{
		this._uniforms = {};
		this._codeparts = {};
	}

	LGShaderContext.prototype.addUniform = function( name, type )
	{
		this._uniforms[ name ] = type;
	}

	LGShaderContext.prototype.addCode = function( hook, code )
	{
		if(!this._codeparts[ hook ])
			this._codeparts[ hook ] = code + "\n";
		else
			this._codeparts[ hook ] += code + "\n";
	}

	//generates the shader code from the template and the 
	LGShaderContext.prototype.computeShader = function( shader )
	{
		var uniforms = "";
		for(var i in this._uniforms)
			uniforms += "uniform " + this._uniforms[i] + " " + i + ";\n";

		var parts = this._codeparts;
		parts.uniforms = uniforms;

		var vs_code = GL.Shader.replaceCodeUsingContext( this.vs_template, parts );
		var fs_code = GL.Shader.replaceCodeUsingContext( this.fs_template, parts );

		try
		{
			if(shader)
				shader.updateShader( vs_code, fs_code );
			else
				shader = new GL.Shader( vs_code, fs_code );
			return shader;
		}
		catch (err)
		{
			return null;
		}

		return null;//never here
	}

	// LGraphShaderGraph *****************************
	// applies a shader graph to texture, it can be uses as an example

	function LGraphShaderGraph() {
		this.addOutput("out", "texture");
		this.properties = { width: 0, height: 0, alpha: false, precision: 0 };

        this.subgraph = new LiteGraph.LGraph();
        this.subgraph._subgraph_node = this;
        this.subgraph._is_subgraph = true;

		var subnode = LiteGraph.createNode("shader/fragcolor");
		this.subgraph.pos = [300,100];
		this.subgraph.add( subnode );

		this.size = [180,60];
		this.redraw_on_mouse = true; //force redraw

		this._uniforms = {};
		this._shader = null;
		this._context = new LGShaderContext();
		this._context.vs_template = GL.Shader.SCREEN_VERTEX_SHADER;
		this._context.fs_template = LGraphShaderGraph.template;
	}

	LGraphShaderGraph.template = "\n\
	precision highp float;\n\
			varying vec2 v_coord;\n\
			{{varying}}\n\
			{{uniforms}}\n\
			void main() {\n\
				vec2 uv = v_coord;\n\
				vec4 color = vec4(0.0);\n\
				{{fs_code}}\n\
				gl_FragColor = color;\n\
			}\n\
	";

	LGraphShaderGraph.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphShaderGraph.title = "ShaderGraph";
	LGraphShaderGraph.desc = "Builds a shader using a graph";

	LGraphShaderGraph.prototype.onSerialize = function(o)
	{
		o.subgraph = this.subgraph.serialize();
	}

	LGraphShaderGraph.prototype.onConfigure = function(o)
	{
		this.subgraph.configure(o.subgraph);
	}

	LGraphShaderGraph.prototype.onExecute = function() {
		if (!this.isOutputConnected(0))
			return;

		var w = this.properties.width | 0;
		var h = this.properties.height | 0;
		if (w == 0) {
			w = gl.viewport_data[2];
		} //0 means default
		if (h == 0) {
			h = gl.viewport_data[3];
		} //0 means default
		var type = LGraphTexture.getTextureType(this.properties.precision);

		var texture = this._texture;
		if ( !texture || texture.width != w || texture.height != h || texture.type != type ) {
			texture = this._texture = new GL.Texture(w, h, {
				type: type,
				format: this.alpha ? gl.RGBA : gl.RGB,
				filter: gl.LINEAR
			});
		}
		
		var shader = this.getShader();
		if(!shader)
			return;

		var uniforms = this._uniforms;

		var tex_slot = 0;
		if(this.inputs)
		for(var i = 0; i < this.inputs.length; ++i)
		{
			var input = this.inputs[i];
			var data = this.getInputData(i);
			if(input.type == "texture")
			{
				if(!data)
					data = GL.Texture.getWhiteTexture();
				data = data.bind(tex_slot++);
			}

			if(data != null)
				uniforms[ "u_" + input.name ] = data;
		}

		var mesh = GL.Mesh.getScreenQuad();

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		texture.drawTo(function(){
			shader.uniforms( uniforms );
			shader.draw( mesh );
		});

		//use subgraph output 
		this.setOutputData(0, texture );
	};

	LGraphShaderGraph.prototype.onInputAdded = function( slot_info )
	{
		var subnode = LiteGraph.createNode("shader/uniform");
		subnode.properties.name = slot_info.name;
		subnode.properties.type = slot_info.type;
		this.subgraph.add( subnode );
	}

	LGraphShaderGraph.prototype.onInputRemoved = function( slot, slot_info )
	{
		var nodes = this.subgraph.findNodesByType("shader/uniform");
		for(var i = 0; i < nodes.length; ++i)
		{
			var node = nodes[i];
			if(node.properties.name == slot_info.name )
				this.subgraph.remove( node );
		}
	}

	LGraphShaderGraph.prototype.computeSize = function()
	{
		var num_inputs = this.inputs ? this.inputs.length : 0;
		var num_outputs = this.outputs ? this.outputs.length : 0;
		return [ 200, Math.max(num_inputs,num_outputs) * LiteGraph.NODE_SLOT_HEIGHT + LiteGraph.NODE_TITLE_HEIGHT + 10];
	}

	LGraphShaderGraph.prototype.getShader = function()
	{
		//if subgraph not changed?
		if(this._shader && this._shader._version == this.subgraph._version)
			return this._shader;

		//prepare context
		this._context.clear();

		//gets code from graph
		this.subgraph.sendEventToAllNodes("onGetCode", this._context);

		//compile shader
		var shader = this._context.computeShader();
		if(!shader)
		{
			this.boxcolor = "red";
			return this._shader;
		}
		else
			this.boxcolor = null;
		
		this._shader = shader;
		shader._version = this.subgraph._version;
		return shader;
	}

	LGraphShaderGraph.prototype.onDrawBackground = function(ctx, graphcanvas, canvas, pos)
	{
		if(this.flags.collapsed)
			return;

		var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;

		//button
		var over = LiteGraph.isInsideRectangle(pos[0],pos[1],this.pos[0],this.pos[1] + y,this.size[0],LiteGraph.NODE_TITLE_HEIGHT);
		ctx.fillStyle = over ? "#555" : "#222";
		ctx.beginPath();
		ctx.roundRect( 0, y, this.size[0]+1, LiteGraph.NODE_TITLE_HEIGHT, 0, 8);
		ctx.fill();

		//button
		ctx.textAlign = "center";
		ctx.font = "24px Arial";
		ctx.fillStyle = over ? "#DDD" : "#999";
		ctx.fillText( "+", this.size[0] * 0.5, y + 24 );
	}

	LGraphShaderGraph.prototype.onMouseDown = function(e, localpos, graphcanvas)
	{
		var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
		if(localpos[1] > y)
		{
			graphcanvas.showSubgraphPropertiesDialog(this);
		}
	}

	LiteGraph.registerNodeType( "texture/shaderGraph", LGraphShaderGraph );

	//Shader Nodes ***************************

	//applies a shader graph to a code
	function LGraphShaderUniform() {
		this.addOutput("out", "");
		this.properties = { name: "", type: "" };
	}

	LGraphShaderUniform.title = "Uniform";
	LGraphShaderUniform.desc = "Input data for the shader";

	LGraphShaderUniform.prototype.getTitle = function()
	{
		return "uniform " + this.properties.name;
	}

	LGraphShaderUniform.prototype.onGetCode = function( context )
	{
		var type = this.properties.type;
		if( !type )
			return;
		if(type == "number")
			type = "float";
		else if(type == "texture")
			type = "sampler2D";
		if ( LGShaderContext.valid_types.indexOf(type) == -1 )
			return;
		context.addUniform( "u_" + this.properties.name, type );
	}

	LGraphShaderUniform.prototype.getOutputVarName = function(slot)
	{
		return "u_" + this.properties.name;
	}

	setShaderNode( LGraphShaderUniform );

	LiteGraph.registerNodeType( "shader/uniform", LGraphShaderUniform );



	function LGraphShaderAttribute() {
		this.addOutput("out", "vec2");
		this.properties = { name: "coord", type: "vec2" };
	}

	LGraphShaderAttribute.title = "Attribute";
	LGraphShaderAttribute.desc = "Input data from mesh attribute";

	LGraphShaderAttribute.prototype.getTitle = function()
	{
		return "att. " + this.properties.name;
	}

	LGraphShaderAttribute.prototype.onGetCode = function( context )
	{
		var type = this.properties.type;
		if( !type || LGShaderContext.valid_types.indexOf(type) == -1 )
			return;
		if(type == "number")
			type = "float";
		if( this.properties.name != "coord")
			context.addCode( "varying", " varying " + type +" v_" + this.properties.name );
	}

	LGraphShaderAttribute.prototype.getOutputVarName = function(slot)
	{
		return "v_" + this.properties.name;
	}

	setShaderNode( LGraphShaderAttribute );

	LiteGraph.registerNodeType( "shader/attribute", LGraphShaderAttribute );


	function LGraphShaderSampler2D() {
		this.addInput("tex", "sampler2D");
		this.addInput("uv", "vec2");
		this.addOutput("rgba", "vec4");
	}

	LGraphShaderSampler2D.title = "Sampler2D";
	LGraphShaderSampler2D.desc = "Reads a pixel from a texture";

	LGraphShaderSampler2D.prototype.onGetCode = function( context )
	{
		var texname = getShaderInputLinkName( this, 0 );
		var code;
		if(texname)
		{
			var uvname = getShaderInputLinkName( this, 1 ) || "v_coord";
			code = "vec4 " + getShaderOutputLinkName( this, 0 ) + " = texture2D("+texname+","+uvname+");";
		}
		else
			code = "vec4 " + getShaderOutputLinkName( this, 0 ) + " = vec4(0.0);";
		context.addCode( "fs_code", code );
	}

	setShaderNode( LGraphShaderSampler2D );

	LiteGraph.registerNodeType( "shader/sampler2D", LGraphShaderSampler2D );

	//*********************************

	function LGraphShaderFragColor() {
		this.addInput("color", "float,vec2,vec3,vec4");
		this.block_delete = true;
	}

	LGraphShaderFragColor.title = "FragColor";
	LGraphShaderFragColor.desc = "Pixel final color";

	LGraphShaderFragColor.prototype.onGetCode = function( context )
	{
		var link_name = getShaderInputLinkName( this, 0 );
		if(!link_name)
			return;

		var code = link_name;
		var type = this.getInputDataType(0);
		if(type == "float")
			code = "vec4(" + code + ");";
		else if(type == "vec2")
			code = "vec4(" + code + ",0.0,1.0);";
		else if(type == "vec3")
			code = "vec4(" + code + ",1.0);";

		context.addCode("fs_code", "color = " + code + ";\n");
	}

	setShaderNode( LGraphShaderFragColor );

	LiteGraph.registerNodeType( "shader/fragcolor", LGraphShaderFragColor );

})(this);