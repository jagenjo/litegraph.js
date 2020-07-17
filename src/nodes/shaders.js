(function(global) {

    if (typeof GL == "undefined")
		return;

    var LiteGraph = global.LiteGraph;
	var LGraphCanvas = global.LGraphCanvas;

	var SHADERNODES_COLOR = "#345";

	var LGShaders = LiteGraph.Shaders = {};

	var GLSL_types = LGShaders.GLSL_types = ["float","vec2","vec3","vec4","mat3","mat4","sampler2D","samplerCube"];
	var GLSL_types_const = LGShaders.GLSL_types_const = ["float","vec2","vec3","vec4"];

	var GLSL_functions_desc = {
		"radians": "T radians(T degrees)",
		"degrees": "T degrees(T radians)",
		"sin": "T sin(T angle)",
		"cos": "T cos(T angle)",
		"tan": "T tan(T angle)",
		"asin": "T asin(T x)",
		"acos": "T acos(T x)",
		"atan": "T atan(T x)",
		"atan2": "T atan(T x,T y)",
		"pow": "T pow(T x,T y)",
		"exp": "T exp(T x)",
		"log": "T log(T x)",
		"exp2": "T exp2(T x)",
		"log2": "T log2(T x)",
		"sqrt": "T sqrt(T x)",
		"inversesqrt": "T inversesqrt(T x)",
		"abs": "T abs(T x)",
		"sign": "T sign(T x)",
		"floor": "T floor(T x)",
		"ceil": "T ceil(T x)",
		"fract": "T fract(T x)",
		"mod": "T mod(T x,T y)", //"T mod(T x,float y)"
		"min": "T min(T x,T y)",
		"max": "T max(T x,T y)",
		"clamp": "T clamp(T x,T minVal,T maxVal)",
		"mix": "T mix(T x,T y,T a)", //"T mix(T x,T y,float a)"
		"step": "T step(T edge, T x)", //"T step(float edge, T x)"
		"smoothstep": "T smoothstep(T edge, T x)", //"T smoothstep(float edge, T x)"
		"length":"float length(T x)",
		"distance":"float distance(T p0, T p1)",
		"normalize":"T normalize(T x)",
		"dot": "float dot(T x,T y)",
		"cross": "vec3 cross(vec3 x,vec3 y)"
	};

	//parse them
	var GLSL_functions = {};
	var GLSL_functions_name = [];
	parseGLSLDescriptions();

	function parseGLSLDescriptions()
	{
		GLSL_functions_name.length = 0;

		for(var i in GLSL_functions_desc)
		{
			var op = GLSL_functions_desc[i];
			var index = op.indexOf(" ");
			var return_type = op.substr(0,index);
			var index2 = op.indexOf("(",index);
			var func_name = op.substr(index,index2-index).trim();
			var params = op.substr(index2 + 1, op.length - index2 - 2).split(",");
			for(var j in params)
			{
				var p = params[j].split(" ");
				params[j] = { type: p[0], name: p[1] };
			}
			GLSL_functions[i] = { return_type: return_type, func: func_name, params: params };
			GLSL_functions_name.push( func_name );
			//console.log( GLSL_functions[i] );
		}
	}

	//common actions to all shader node classes
	function registerShaderNode( type, node_ctor )
	{
		//static attributes
		node_ctor.color = SHADERNODES_COLOR;
		node_ctor.filter = "shader";

		//common methods
		node_ctor.prototype.clearDestination = function(){ this.shader_destination = {};  }
		node_ctor.prototype.propagateDestination = function propagateDestination( dest_name )
		{
			this.shader_destination[ dest_name ] = true;
			if(this.inputs)
			for(var i = 0; i < this.inputs.length; ++i)
			{
				var origin_node = this.getInputNode(i);
				if(origin_node)
					origin_node.propagateDestination( dest_name );
			}
		}

		LiteGraph.registerNodeType( type, node_ctor );
	}

	function getShaderNodeVarName( node, name )
	{
		return "VAR_" + (name || "TEMP") + "_" + node.id;
	}

	function getInputLinkID( node, slot )
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

	function getOutputLinkID( node, slot )
	{
		if (!node.isOutputConnected(0))
			return null;
		return "link_" + node.id + "_" + slot;
	}

	LGShaders.registerShaderNode = registerShaderNode;
	LGShaders.getInputLinkID = getInputLinkID;
	LGShaders.getOutputLinkID = getOutputLinkID;
	LGShaders.getShaderNodeVarName = getShaderNodeVarName;
	LGShaders.parseGLSLDescriptions = parseGLSLDescriptions;

	var valueToGLSL = LiteGraph.valueToGLSL = function valueToGLSL( v, type )
	{
		var n = 5; //num decimals
		if(!type)
		{
			if(v.constructor === Number)
				type = "float";
			else if(v.length)
			{
				switch(v.length)
				{
					case 2: type = "vec2"; break;
					case 3: type = "vec3"; break;
					case 4: type = "vec4"; break;
					case 9: type = "mat3"; break;
					case 16: type = "mat4"; break;
					default:
						throw("unknown type for glsl value size");
				}
			}
			else
				throw("unknown type for glsl value: " + v.constructor);
		}
		switch(type)
		{
			case 'float': return v.toFixed(n); break;
			case 'vec2': return "vec2(" + v[0].toFixed(n) + "," + v[1].toFixed(n) + ")"; break;
			case 'color3':
			case 'vec3': return "vec3(" + v[0].toFixed(n) + "," + v[1].toFixed(n) + "," + v[2].toFixed(n) + ")"; break;
			case 'color4':
			case 'vec4': return "vec4(" + v[0].toFixed(n) + "," + v[1].toFixed(n) + "," + v[2].toFixed(n) + "," + v[3].toFixed(n) + ")"; break;
			case 'mat3': return "mat3(1.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,1.0)"; break; //not fully supported yet
			case 'mat4': return "mat4(1.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0,0.0,0.0,0.0,1.0)"; break;//not fully supported yet
			default:
				throw("unknown glsl type in valueToGLSL:", type);
		}

		return "";
	}

	//used to plug incompatible stuff
	var convertVarToGLSLType = LiteGraph.convertVarToGLSLType = function convertVarToGLSLType( varname, type, target_type )
	{
		if(type == target_type)
			return varname;
		if(type == "float")
			return target_type + "(" + varname + ")";
		if(target_type == "vec2") //works for vec2,vec3 and vec4
			return "vec2(" + varname + ".xy)";
		if(target_type == "vec3") //works for vec2,vec3 and vec4
		{
			if(type == "vec2")
				return "vec3(" + varname + ",0.0)";
			if(type == "vec4")
				return "vec4(" + varname + ".xyz)";
		}
		if(target_type == "vec4")
		{
			if(type == "vec2")
				return "vec4(" + varname + ",0.0,0.0)";
			if(target_type == "vec3")
				return "vec4(" + varname + ",1.0)";
		}
		return null;
	}

	//used to host a shader body **************************************
	function LGShaderContext()
	{
		this.vs_template = "";
		this.fs_template = "";
		this._uniforms = {};
		this._codeparts = {};
	}

	LGShaderContext.prototype.clear = function()
	{
		this._uniforms = {};
		this._codeparts = {};
	}

	LGShaderContext.prototype.addUniform = function( name, type )
	{
		this._uniforms[ name ] = type;
	}

	LGShaderContext.prototype.addCode = function( hook, code, destinations )
	{
		destinations = destinations || {"":""};
		for(var i in destinations)
		{
			var h = i ? i + "_" + hook : hook;
			if(!this._codeparts[ h ])
				this._codeparts[ h ] = code + "\n";
			else
				this._codeparts[ h ] += code + "\n";
		}
	}

	LGShaderContext.prototype.computeShaderCode = function()
	{
		var uniforms = "";
		for(var i in this._uniforms)
			uniforms += "uniform " + this._uniforms[i] + " " + i + ";\n";

		var parts = this._codeparts;
		parts.uniforms = uniforms;

		var vs_code = GL.Shader.replaceCodeUsingContext( this.vs_template, parts );
		var fs_code = GL.Shader.replaceCodeUsingContext( this.fs_template, parts );
		return {
			vs_code: vs_code,
			fs_code: fs_code
		};
	}

	//generates the shader code from the template and the 
	LGShaderContext.prototype.computeShader = function( shader )
	{
		var finalcode = this.computeShaderCode();
		console.log( finalcode.vs_code, finalcode.fs_code );

		try
		{
			if(shader)
				shader.updateShader( finalcode.vs_code, finalcode.fs_code );
			else
				shader = new GL.Shader( finalcode.vs_code, finalcode.fs_code );
			this._shader_error = false;
			return shader;
		}
		catch (err)
		{
			if(!this._shader_error)
			{
				console.error(err);
				if(err.indexOf("Fragment shader") != -1)
					console.log( finalcode.fs_code );
				else
					console.log( finalcode.vs_code );
			}
			this._shader_error = true;
			return null;
		}

		return null;//never here
	}

	//represents a fragment of code exported by a node
	/*
	function LGShaderCodeBlock( node, code, uniforms )
	{
		this.node = node || null;
		this.uniforms = uniforms || null;
		this.parts = {};
		if(code)
		{
			if(code.constructor === String)
				this.parts.code = code;
			else
				this.parts = code;
		}
	}

	LGShaderCodeBlock.prototype.addUniform = function( name, type )
	{
		if(!this.uniforms)
			this.uniforms = {};
		this.uniforms[ name ] = type;
	}

	LGShaderCodeBlock.prototype.addCode = function( hook, code )
	{
		if(!this.parts[ hook ])
			this.parts[ hook ] = code + "\n";
		else
			this.parts[ hook ] += code + "\n";
	}
	*/


	// LGraphShaderGraph *****************************
	// applies a shader graph to texture, it can be uses as an example

	function LGraphShaderGraph() {

		//before inputs
        this.subgraph = new LiteGraph.LGraph();
        this.subgraph._subgraph_node = this;
        this.subgraph._is_subgraph = true;
		this.subgraph.filter = "shader";

		this.addInput("in", "texture");
		this.addOutput("out", "texture");
		this.properties = { width: 0, height: 0, alpha: false, precision: typeof(LGraphTexture) != "undefined" ? LGraphTexture.DEFAULT : 2 };

		var inputNode = this.subgraph.findNodesByType("input/uniform")[0];
		inputNode.pos = [200,300];

		var sampler = LiteGraph.createNode("texture/sampler2D");
		sampler.pos = [400,300];
		this.subgraph.add( sampler );

		var outnode = LiteGraph.createNode("output/fragcolor");
		outnode.pos = [600,300];
		this.subgraph.add( outnode );

		inputNode.connect( 0, sampler );
		sampler.connect( 0, outnode );

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
{{fs_functions}}\n\
void main() {\n\n\
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
	LGraphShaderGraph.input_node_type = "input/uniform";
	LGraphShaderGraph.output_node_type = "output/fragcolor";
	LGraphShaderGraph.title_color = SHADERNODES_COLOR;

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

		//read input texture
		var intex = this.getInputData(0);
		if(intex && intex.constructor != GL.Texture)
			intex = null;

		var w = this.properties.width | 0;
		var h = this.properties.height | 0;
		if (w == 0) {
			w = intex ? intex.width : gl.viewport_data[2];
		} //0 means default
		if (h == 0) {
			h = intex ? intex.height : gl.viewport_data[3];
		} //0 means default

		var type = LGraphTexture.getTextureType( this.properties.precision, intex );

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

	//add input node inside subgraph
	LGraphShaderGraph.prototype.onInputAdded = function( slot_info )
	{
		var subnode = LiteGraph.createNode("input/uniform");
		subnode.setProperty("name",slot_info.name);
		subnode.setProperty("type",slot_info.type);
		this.subgraph.add( subnode );
	}

	//remove all
	LGraphShaderGraph.prototype.onInputRemoved = function( slot, slot_info )
	{
		var nodes = this.subgraph.findNodesByType("input/uniform");
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

		//grab output nodes
		var vertexout = this.subgraph.findNodesByType("output/vertex");
		vertexout = vertexout && vertexout.length ? vertexout[0] : null;
		var fragmentout = this.subgraph.findNodesByType("output/fragcolor");
		fragmentout = fragmentout && fragmentout.length ? fragmentout[0] : null;

		if(!fragmentout) //??
			return null; 

		this.subgraph.sendEventToAllNodes( "clearDestination" );

		//propagate back destinations
		if(vertexout)
			vertexout.propagateDestination("vs");
		if(fragmentout)
			fragmentout.propagateDestination("fs");

		//gets code from graph
		this.subgraph.sendEventToAllNodes("onGetCode", this._context );

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

		//allows to preview the node if the canvas is a webgl canvas
		var tex = this.getOutputData(0);
		var inputs_y = this.inputs ? this.inputs.length * LiteGraph.NODE_SLOT_HEIGHT : 0;
		if (tex && ctx == tex.gl && this.size[1] > inputs_y + LiteGraph.NODE_TITLE_HEIGHT ) {
			ctx.drawImage( tex, 10,y, this.size[0] - 20, this.size[1] - inputs_y - LiteGraph.NODE_TITLE_HEIGHT );
		}

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

	LGraphShaderGraph.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		var options = [{ content: "Print Code", callback: function(){
			var code = that._context.computeShaderCode();
			console.log( code.vs_code, code.fs_code );
		}}];

		return options;
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
		if( this.properties.name && this.flags.collapsed)
			return this.properties.type + " " + this.properties.name;
		return "Uniform";
	}

	LGraphShaderUniform.prototype.onPropertyChanged = function(name,value)
	{
		this.outputs[0].name = this.properties.type + " " + this.properties.name;
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
		if ( LGShaders.GLSL_types.indexOf(type) == -1 )
			return;

		context.addUniform( "u_" + this.properties.name, type );
		this.setOutputData( 0, type );
	}

	LGraphShaderUniform.prototype.getOutputVarName = function(slot)
	{
		return "u_" + this.properties.name;
	}

	registerShaderNode( "input/uniform", LGraphShaderUniform );


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
		if( !type || LGShaders.GLSL_types.indexOf(type) == -1 )
			return;
		if(type == "number")
			type = "float";
		if( this.properties.name != "coord")
		{
			context.addCode( "varying", " varying " + type +" v_" + this.properties.name + ";" );
			//if( !context.varyings[ this.properties.name ] )
			//context.addCode( "vs_code", "v_" + this.properties.name + " = " + input_name + ";" );
		}
		this.setOutputData( 0, type );
	}

	LGraphShaderAttribute.prototype.getOutputVarName = function(slot)
	{
		return "v_" + this.properties.name;
	}

	registerShaderNode( "input/attribute", LGraphShaderAttribute );

	function LGraphShaderSampler2D() {
		this.addInput("tex", "sampler2D");
		this.addInput("uv", "vec2");
		this.addOutput("rgba", "vec4");
		this.addOutput("rgb", "vec3");
	}

	LGraphShaderSampler2D.title = "Sampler2D";
	LGraphShaderSampler2D.desc = "Reads a pixel from a texture";

	LGraphShaderSampler2D.prototype.onGetCode = function( context )
	{
		var texname = getInputLinkID( this, 0 );
		var varname = getShaderNodeVarName(this);
		var code = "vec4 " + varname + " = vec4(0.0);\n";
		if(texname)
		{
			var uvname = getInputLinkID( this, 1 ) || "v_coord";
			code += varname + " = texture2D("+texname+","+uvname+");\n";
		}

		var link0 = getOutputLinkID( this, 0 );
		if(link0)
			code += "vec4 " + getOutputLinkID( this, 0 ) + " = "+varname+";\n";

		var link1 = getOutputLinkID( this, 1 );
		if(link1)
			code += "vec3 " + getOutputLinkID( this, 1 ) + " = "+varname+".xyz;\n";

		context.addCode( "code", code, this.shader_destination );
		this.setOutputData( 0, "vec4" );
		this.setOutputData( 1, "vec3" );
	}

	registerShaderNode( "texture/sampler2D", LGraphShaderSampler2D );

	//*********************************

	function LGraphShaderConstant()
	{
		this.addOutput("","float");

		this.properties = {
			type: "float",
			value: 0
		};

		this.addWidget("combo","type","float",null, { values: GLSL_types_const, property: "type" } );
		this.updateWidgets();
	}

	LGraphShaderConstant.title = "const";

	LGraphShaderConstant.prototype.getTitle = function()
	{
		if(this.flags.collapsed)
			return valueToGLSL( this.properties.value, this.properties.type );
		return "Const";
	}

	LGraphShaderConstant.prototype.onPropertyChanged = function(name,value)
	{
		var that = this;
		if(name == "type")
		{
			if(this.outputs[0].type != value)
			{
				this.disconnectOutput(0);
				this.outputs[0].type = value;
				this.widgets.length = 1; //remove extra widgets
				this.updateWidgets();
			}
		}
	}

	LGraphShaderConstant.prototype.updateWidgets = function( old_value )
	{
		var that = this;
		var old_value = this.properties.value;
		var options = { step: 0.01 };
		switch(this.properties.type)
		{
			case 'float': 
				this.properties.value = 0;
				this.addWidget("number","v",0,{ step:0.01, property: "value" });
				break;
			case 'vec2': 
				this.properties.value = old_value && old_value.length == 2 ? [old_value[0],old_value[1]] : [0,0,0];
				this.addWidget("number","x",0,options, function(v){ that.properties.value[0] = v; }); 
				this.addWidget("number","y",0,options, function(v){ that.properties.value[1] = v; }); 
				break;
			case 'vec3': 
				this.properties.value = old_value && old_value.length == 3 ? [old_value[0],old_value[1],old_value[2]] : [0,0,0];
				this.addWidget("number","x",0,options, function(v){ that.properties.value[0] = v; }); 
				this.addWidget("number","y",0,options, function(v){ that.properties.value[1] = v; }); 
				this.addWidget("number","z",0,options, function(v){ that.properties.value[2] = v; }); 
				break;
			case 'vec4': 
				this.properties.value = old_value && old_value.length == 4 ? [old_value[0],old_value[1],old_value[2],old_value[3]] : [0,0,0,0];
				this.addWidget("number","x",0,options, function(v){ that.properties.value[0] = v; }); 
				this.addWidget("number","y",0,options, function(v){ that.properties.value[1] = v; }); 
				this.addWidget("number","z",0,options, function(v){ that.properties.value[2] = v; }); 
				this.addWidget("number","w",0,options, function(v){ that.properties.value[3] = v; }); 
				break;
			default:
				console.error("unknown type for constant");
		}
	}

	LGraphShaderConstant.prototype.onGetCode = function( context )
	{
		var value = valueToGLSL( this.properties.value, this.properties.type );
		var link_name = getOutputLinkID(this,0);
		if(!link_name) //not connected
			return;

		var code = "	" + this.properties.type + " " + link_name + " = " + value + ";";
		context.addCode( "code", code, this.shader_destination );

		this.setOutputData( 0, this.properties.type );
	}

	registerShaderNode( "const/const", LGraphShaderConstant );

	function LGraphShaderVec2()
	{
		this.addInput("xy","vec2");
		this.addInput("x","float");
		this.addInput("y","float");
		this.addOutput("xy","vec2");
		this.addOutput("x","float");
		this.addOutput("y","float");

		this.properties = { x: 0, y: 0 };
	}

	LGraphShaderVec2.title = "vec2";
	LGraphShaderVec2.varmodes = ["xy","x","y"];

	LGraphShaderVec2.prototype.onPropertyChanged = function()
	{
		 this.graph._version++;
	}

	LGraphShaderVec2.prototype.onGetCode = function( context )
	{
		var props = this.properties;

		var varname = getShaderNodeVarName(this);
		var code = "	vec2 " + varname + " = " + valueToGLSL([props.x,props.y]) + ";\n";

		for(var i = 0;i < LGraphShaderVec2.varmodes.length; ++i)
		{
			var varmode = LGraphShaderVec2.varmodes[i];
			var inlink = getInputLinkID(this,i);
			if(!inlink)
				continue;
			code += "	" + varname + "."+varmode+" = " + inlink + ";\n";
		}

		for(var i = 0;i < LGraphShaderVec2.varmodes.length; ++i)
		{
			var varmode = LGraphShaderVec2.varmodes[i];
			var outlink = getOutputLinkID(this,i);
			if(!outlink)
				continue;
			var type = GLSL_types_const[varmode.length - 1];
			code += "	"+type+" " + outlink + " = " + varname + "." + varmode + ";\n";
			this.setOutputData( i, type );
		}

		context.addCode( "code", code, this.shader_destination );
	}

	registerShaderNode( "const/vec2", LGraphShaderVec2 );	

	function LGraphShaderVec3()
	{
		this.addInput("xyz","vec3");
		this.addInput("x","float");
		this.addInput("y","float");
		this.addInput("z","float");
		this.addInput("xy","vec2");
		this.addInput("xz","vec2");
		this.addInput("yz","vec2");
		this.addOutput("xyz","vec3");
		this.addOutput("x","float");
		this.addOutput("y","float");
		this.addOutput("z","float");
		this.addOutput("xy","vec2");
		this.addOutput("xz","vec2");
		this.addOutput("yz","vec2");

		this.properties = { x:0, y: 0, z: 0 };
	}

	LGraphShaderVec3.title = "vec3";
	LGraphShaderVec3.varmodes = ["xyz","x","y","z","xy","xz","yz"];

	LGraphShaderVec3.prototype.onPropertyChanged = function()
	{
		 this.graph._version++;
	}


	LGraphShaderVec3.prototype.onPropertyChanged = function()
	{
		 this.graph._version++;
	}

	LGraphShaderVec3.prototype.onGetCode = function( context )
	{
		var props = this.properties;

		var varname = getShaderNodeVarName(this);
		var code = "vec3 " + varname + " = " + valueToGLSL([props.x,props.y,props.z]) + ";\n";

		for(var i = 0;i < LGraphShaderVec3.varmodes.length; ++i)
		{
			var varmode = LGraphShaderVec3.varmodes[i];
			var inlink = getInputLinkID(this,i);
			if(!inlink)
				continue;
			code += "	" + varname + "."+varmode+" = " + inlink + ";\n";
		}

		for(var i = 0; i < LGraphShaderVec3.varmodes.length; ++i)
		{
			var varmode = LGraphShaderVec3.varmodes[i];
			var outlink = getOutputLinkID(this,i);
			if(!outlink)
				continue;
			var type = GLSL_types_const[varmode.length - 1];
			code += "	"+type+" " + outlink + " = " + varname + "." + varmode + ";\n";
			this.setOutputData( i, type );
		}

		context.addCode( "code", code, this.shader_destination );
	}

	registerShaderNode( "const/vec3", LGraphShaderVec3 );	


	function LGraphShaderVec4()
	{
		this.addInput("xyzw","vec4");
		this.addInput("xyz","vec3");
		this.addInput("x","float");
		this.addInput("y","float");
		this.addInput("z","float");
		this.addInput("w","float");
		this.addInput("xy","vec2");
		this.addInput("yz","vec2");
		this.addInput("zw","vec2");
		this.addOutput("xyzw","vec4");
		this.addOutput("xyz","vec3");
		this.addOutput("x","float");
		this.addOutput("y","float");
		this.addOutput("z","float");
		this.addOutput("xy","vec2");
		this.addOutput("yz","vec2");
		this.addOutput("zw","vec2");

		this.properties = { x:0, y: 0, z: 0, w: 0 };
	}

	LGraphShaderVec4.title = "vec4";
	LGraphShaderVec4.varmodes = ["xyzw","xyz","x","y","z","w","xy","yz","zw"];

	LGraphShaderVec4.prototype.onPropertyChanged = function()
	{
		 this.graph._version++;
	}

	LGraphShaderVec4.prototype.onGetCode = function( context )
	{
		var props = this.properties;

		var varname = getShaderNodeVarName(this);
		var code = "vec4 " + varname + " = " + valueToGLSL([props.x,props.y,props.z,props.w]) + ";\n";

		for(var i = 0;i < LGraphShaderVec4.varmodes.length; ++i)
		{
			var varmode = LGraphShaderVec4.varmodes[i];
			var inlink = getInputLinkID(this,i);
			if(!inlink)
				continue;
			code += "	" + varname + "."+varmode+" = " + inlink + ";\n";
		}

		for(var i = 0;i < LGraphShaderVec4.varmodes.length; ++i)
		{
			var varmode = LGraphShaderVec4.varmodes[i];
			var outlink = getOutputLinkID(this,i);
			if(!outlink)
				continue;
			var type = GLSL_types_const[varmode.length - 1];
			code += "	"+type+" " + outlink + " = " + varname + "." + varmode + ";\n";
			this.setOutputData( i, type );
		}

		context.addCode( "code", code, this.shader_destination );

	}

	registerShaderNode( "const/vec4", LGraphShaderVec4 );	
	
	//*********************************

	function LGraphShaderFragColor() {
		this.addInput("color", "float,vec2,vec3,vec4");
		this.block_delete = true;
	}

	LGraphShaderFragColor.title = "FragColor";
	LGraphShaderFragColor.desc = "Pixel final color";

	LGraphShaderFragColor.prototype.onGetCode = function( context )
	{
		var link_name = getInputLinkID( this, 0 );
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

		context.addCode("fs_code", "color = " + code + ";");
	}

	registerShaderNode( "output/fragcolor", LGraphShaderFragColor );



	// *************************************************

	function LGraphShaderMath()
	{
		this.addInput("A","float,vec2,vec3,vec4");
		this.addInput("B","float,vec2,vec3,vec4");
		this.addOutput("out","");
		this.properties = {
			func: "floor"
		};
		this._current = "floor";
		this.addWidget("combo","func",this.properties.func,{ property: "func", values: GLSL_functions_name });
	}

	LGraphShaderMath.title = "Math";

	LGraphShaderMath.prototype.onPropertyChanged = function(name,value)
	{
		this.graph._version++;

		if(name == "func")
		{
			var func_desc = GLSL_functions[ value ];
			if(!func_desc)
				return;

			//remove extra inputs
			for(var i = func_desc.params.length; i < this.inputs.length; ++i)
				this.removeInput(i);

			//add and update inputs
			for(var i = 0; i < func_desc.params.length; ++i)
				if( this.inputs[i] )
					this.inputs[i].name = func_desc.params[i].name;
				else
					this.addInput( func_desc.params[i].name, "float,vec2,vec3,vec4" );
		}
	}

	LGraphShaderMath.prototype.getTitle = function()
	{
		if(this.flags.collapsed)
			return this.properties.func;
		else
			return "Func";
	}

	LGraphShaderMath.prototype.onGetCode = function( context )
	{
		if(!this.isOutputConnected(0))
			return;

		var inlinks = [];
		for(var i = 0; i < 3; ++i)
			inlinks.push( { name: getInputLinkID(this,i), type: this.getInputData(i) || "float" } );

		var outlink = getOutputLinkID(this,0);
		if(!outlink) //not connected
			return;

		var func_desc = GLSL_functions[ this.properties.func ];
		if(!func_desc)
			return;

		//func_desc
		var base_type = inlinks[0].type;
		var return_type = func_desc.return_type;
		if( return_type == "T" )
			return_type = base_type;

		var params = [];
		for(var i = 0; i < func_desc.params.length; ++i)
		{
			var p = func_desc.params[i];
			var param_code = inlinks[i].name;
			if(param_code == null) //not plugged
			{
				param_code = "(1.0)";
				inlinks[i].type = "float";
			}
			if( (p.type == "T" && inlinks[i].type != base_type) ||
				(p.type != "T" && inlinks[i].type != base_type) )
				param_code = convertVarToGLSLType( inlinks[i].name, inlinks[i].type, base_type );
			params.push( param_code );
		}
		
		context.addCode("code", return_type + " " + outlink + " = "+func_desc.func+"("+params.join(",")+");", this.shader_destination );

		this.setOutputData( 0, return_type );
	}

	registerShaderNode( "math/func", LGraphShaderMath );



	function LGraphShaderSnippet()
	{
		this.addInput("A","float,vec2,vec3,vec4");
		this.addInput("B","float,vec2,vec3,vec4");
		this.addOutput("C","vec4");
		this.properties = {
			code:"C = A+B",
			type: "vec4"
		}
		this.addWidget("text","code",this.properties.code,{ property: "code" });
		this.addWidget("combo","type",this.properties.type,{ values:["float","vec2","vec3","vec4"], property: "type" });
	}

	LGraphShaderSnippet.title = "Snippet";

	LGraphShaderSnippet.prototype.onPropertyChanged = function(name,value)
	{
		 this.graph._version++;

		if(name == "type"&& this.outputs[0].type != value)
		{
			this.disconnectOutput(0);
			this.outputs[0].type = value;
		}
	}

	LGraphShaderSnippet.prototype.getTitle = function()
	{
		if(this.flags.collapsed)
			return this.properties.code;
		else
			return "Snippet";
	}

	LGraphShaderSnippet.prototype.onGetCode = function( context )
	{
		if(!this.isOutputConnected(0))
			return;

		var inlinkA = getInputLinkID(this,0);
		if(!inlinkA)
			inlinkA = "1.0";
		var inlinkB = getInputLinkID(this,1);
		if(!inlinkB)
			inlinkB = "1.0";
		var outlink = getOutputLinkID(this,0);
		if(!outlink) //not connected
			return;

		var inA_type = this.getInputData(0) || "float";
		var inB_type = this.getInputData(1) || "float";
		var return_type = this.properties.type;

		//cannot resolve input
		if(inA_type == "T" || inB_type == "T")
		{
			return null;
		}

		var funcname = "funcSnippet" + this.id;

		var func_code = "\n" + return_type + " " + funcname + "( " + inA_type + " A, " + inB_type + " B) {\n";
		func_code += "	" + return_type + " C = " + return_type + "(0.0);\n";
		func_code += "	" + this.properties.code + ";\n";
		func_code += "	return C;\n}\n";

		context.addCode("functions", func_code, this.shader_destination );
		context.addCode("code", return_type + " " + outlink + " = "+funcname+"("+inlinkA+","+inlinkB+");", this.shader_destination );

		this.setOutputData( 0, return_type );
	}

	registerShaderNode( "utils/snippet", LGraphShaderSnippet );


	//************************************
	function LGraphShaderRemap()
	{
		this.addInput("","T,float,vec2,vec3,vec4");
		this.addOutput("","T");
		this.properties = {
			min_value: 0,
			max_value: 1,
			min_value2: 0,
			max_value2: 1
		};
		this.addWidget("number","min",0,{ step: 0.1, property: "min_value" });
		this.addWidget("number","max",1,{ step: 0.1, property: "max_value" });
		this.addWidget("number","min2",0,{ step: 0.1, property: "min_value2"});
		this.addWidget("number","max2",1,{ step: 0.1, property: "max_value2"});
	}

	LGraphShaderRemap.title = "Remap";

	LGraphShaderRemap.prototype.onPropertyChanged = function()
	{
		 this.graph._version++;
	}

	LGraphShaderRemap.prototype.onConnectionsChange = function()
	{
		var return_type = this.getInputDataType(0);
		this.outputs[0].type = return_type || "T";
	}

	LGraphShaderRemap.prototype.onGetCode = function( context )
	{
		if(!this.isOutputConnected(0))
			return;

		var inlink = getInputLinkID(this,0);
		var outlink = getOutputLinkID(this,0);
		if(!inlink && !outlink) //not connected
			return;

		var return_type = this.getInputDataType(0);
		this.outputs[0].type = return_type;
		if(return_type == "T")
		{
			console.warn("node type is T and cannot be resolved");
			return;
		}

		if(!inlink)
		{
			context.addCode("code","	" + return_type + " " + outlink + " = " + return_type + "(0.0);\n");
			return;
		}

		var minv = valueToGLSL( this.properties.min_value );
		var maxv = valueToGLSL( this.properties.max_value );
		var minv2 = valueToGLSL( this.properties.min_value2 );
		var maxv2 = valueToGLSL( this.properties.max_value2 );

		context.addCode("code", return_type + " " + outlink + " = ( (" + inlink + " - "+minv+") / ("+ maxv+" - "+minv+") ) * ("+ maxv2+" - "+minv2+") + " + minv2 + ";", this.shader_destination );
		this.setOutputData( 0, return_type );
	}

	registerShaderNode( "math/remap", LGraphShaderRemap );

})(this);


/*
// https://blog.undefinist.com/writing-a-shader-graph/

\sin
f,Out
float->float
{1} = sin({0});

\mul
A,B,Out
T,T->T
T,float->T
{2} = {0} * {1};

\clamp
f,min,max,Out
float,float=0,float=1->float
vec2,vec2=vec2(0.0),vec2=vec2(1.0)->vec2
vec3,vec3=vec3(0.0),vec3=vec3(1.0)->vec3
vec4,vec4=vec4(0.0),vec4=vec4(1.0)->vec4
{3}=clamp({0},{1},{2});

\mix
A,B,f,Out
float,float,float->float
vec2,vec2,float->vec2
vec3,vec3,float->vec3
vec4,vec4,float->vec4
{3} = mix({0},{1},{2});

*/