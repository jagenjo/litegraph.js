//basic nodes
(function(global){
var LiteGraph = global.LiteGraph;

//Constant
function Time()
{
	this.addOutput("in ms","number");
	this.addOutput("in sec","number");
}

Time.title = "Time";
Time.desc = "Time";

Time.prototype.onExecute = function()
{
	this.setOutputData(0, this.graph.globaltime * 1000 );
	this.setOutputData(1, this.graph.globaltime  );
}

LiteGraph.registerNodeType("basic/time", Time);


//Subgraph: a node that contains a graph
function Subgraph()
{
	var that = this;
	this.size = [120,80];

	//create inner graph
	this.subgraph = new LGraph();
	this.subgraph._subgraph_node = this;
	this.subgraph._is_subgraph = true;

	this.subgraph.onGlobalInputAdded = this.onSubgraphNewGlobalInput.bind(this);
	this.subgraph.onGlobalInputRenamed = this.onSubgraphRenamedGlobalInput.bind(this);
	this.subgraph.onGlobalInputTypeChanged = this.onSubgraphTypeChangeGlobalInput.bind(this);

	this.subgraph.onGlobalOutputAdded = this.onSubgraphNewGlobalOutput.bind(this);
	this.subgraph.onGlobalOutputRenamed = this.onSubgraphRenamedGlobalOutput.bind(this);
	this.subgraph.onGlobalOutputTypeChanged = this.onSubgraphTypeChangeGlobalOutput.bind(this);

	this.color = "#335";
	this.bgcolor = "#557";
}

Subgraph.title = "Subgraph";
Subgraph.desc = "Graph inside a node";

Subgraph.prototype.onDrawTitle = function(ctx)
{
	if(this.flags.collapsed)
		return;

	ctx.fillStyle = "#AAA";
	var w = LiteGraph.NODE_TITLE_HEIGHT;
	var x = this.size[0] - w;
	ctx.fillRect( x, -w, w,w );
	ctx.fillStyle = "#333";
	ctx.beginPath();
	ctx.moveTo( x+w*0.2, -w*0.6 );
	ctx.lineTo( x+w*0.8, -w*0.6 );
	ctx.lineTo( x+w*0.5, -w*0.3 );
	ctx.fill();
}

Subgraph.prototype.onDblClick = function(e,pos,graphcanvas)
{
	var that = this;
	setTimeout(function(){ graphcanvas.openSubgraph( that.subgraph ); },10 );
}


Subgraph.prototype.onMouseDown = function(e,pos,graphcanvas)
{
	if( !this.flags.collapsed && pos[0] > this.size[0] - LiteGraph.NODE_TITLE_HEIGHT && pos[1] < 0 )
	{
		var that = this;
		setTimeout(function(){ graphcanvas.openSubgraph( that.subgraph ); },10 );
	}
}

Subgraph.prototype.onSubgraphNewGlobalInput = function(name, type)
{
	//add input to the node
	this.addInput(name, type);
}

Subgraph.prototype.onSubgraphRenamedGlobalInput = function(oldname, name)
{
	var slot = this.findInputSlot( oldname );
	if(slot == -1)
		return;
	var info = this.getInputInfo(slot);
	info.name = name;
}

Subgraph.prototype.onSubgraphTypeChangeGlobalInput = function(name, type)
{
	var slot = this.findInputSlot( name );
	if(slot == -1)
		return;
	var info = this.getInputInfo(slot);
	info.type = type;
}


Subgraph.prototype.onSubgraphNewGlobalOutput = function(name, type)
{
	//add output to the node
	this.addOutput(name, type);
}


Subgraph.prototype.onSubgraphRenamedGlobalOutput = function(oldname, name)
{
	var slot = this.findOutputSlot( oldname );
	if(slot == -1)
		return;
	var info = this.getOutputInfo(slot);
	info.name = name;
}

Subgraph.prototype.onSubgraphTypeChangeGlobalOutput = function(name, type)
{
	var slot = this.findOutputSlot( name );
	if(slot == -1)
		return;
	var info = this.getOutputInfo(slot);
	info.type = type;
}


Subgraph.prototype.getExtraMenuOptions = function(graphcanvas)
{
	var that = this;
	return [ {content:"Open", callback: 
		function() { 
			graphcanvas.openSubgraph( that.subgraph );
		}
	}];
}

Subgraph.prototype.onResize = function(size)
{
	size[1] += 20;
}

Subgraph.prototype.onExecute = function()
{
	//send inputs to subgraph global inputs
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var value = this.getInputData(i);
			this.subgraph.setGlobalInputData( input.name, value );
		}

	//execute
	this.subgraph.runStep();

	//send subgraph global outputs to outputs
	if(this.outputs)
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			var value = this.subgraph.getGlobalOutputData( output.name );
			this.setOutputData(i, value);
		}
}

Subgraph.prototype.configure = function(o)
{
	LGraphNode.prototype.configure.call(this, o);
	//this.subgraph.configure(o.graph);
}

Subgraph.prototype.serialize = function()
{
	var data = LGraphNode.prototype.serialize.call(this);
	data.subgraph = this.subgraph.serialize();
	return data;
}

Subgraph.prototype.clone = function()
{
	var node = LiteGraph.createNode(this.type);
	var data = this.serialize();
	delete data["id"];
	delete data["inputs"];
	delete data["outputs"];
	node.configure(data);
	return node;
}


LiteGraph.registerNodeType("graph/subgraph", Subgraph );


//Input for a subgraph
function GlobalInput()
{

	//random name to avoid problems with other outputs when added
	var input_name = "input_" + (Math.random()*1000).toFixed();

	this.addOutput(input_name, null );

	this.properties = { name: input_name, type: null };

	var that = this;

	Object.defineProperty( this.properties, "name", {
		get: function() { 
			return input_name;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getOutputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			if(that.graph)
				that.graph.renameGlobalInput(input_name, v);
			input_name = v;
		},
		enumerable: true
	});

	Object.defineProperty( this.properties, "type", {
		get: function() { return that.outputs[0].type; },
		set: function(v) { 
			that.outputs[0].type = v; 
			if(that.graph)
				that.graph.changeGlobalInputType(input_name, that.outputs[0].type);
		},
		enumerable: true
	});
}

GlobalInput.title = "Input";
GlobalInput.desc = "Input of the graph";

//When added to graph tell the graph this is a new global input
GlobalInput.prototype.onAdded = function()
{
	this.graph.addGlobalInput( this.properties.name, this.properties.type );
}

GlobalInput.prototype.onExecute = function()
{
	var name = this.properties.name;

	//read from global input
	var	data = this.graph.global_inputs[name];
	if(!data) return;

	//put through output
	this.setOutputData(0,data.value);
}

LiteGraph.registerNodeType("graph/input", GlobalInput);



//Output for a subgraph
function GlobalOutput()
{
	//random name to avoid problems with other outputs when added
	var output_name = "output_" + (Math.random()*1000).toFixed();

	this.addInput(output_name, null);

	this._value = null;

	this.properties = {name: output_name, type: null };

	var that = this;

	Object.defineProperty(this.properties, "name", {
		get: function() { 
			return output_name;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getInputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			if(that.graph)
				that.graph.renameGlobalOutput(output_name, v);
			output_name = v;
		},
		enumerable: true
	});

	Object.defineProperty(this.properties, "type", {
		get: function() { return that.inputs[0].type; },
		set: function(v) { 
			that.inputs[0].type = v;
			if(that.graph)
				that.graph.changeGlobalInputType( output_name, that.inputs[0].type );
		},
		enumerable: true
	});
}

GlobalOutput.title = "Output";
GlobalOutput.desc = "Output of the graph";

GlobalOutput.prototype.onAdded = function()
{
	var name = this.graph.addGlobalOutput( this.properties.name, this.properties.type );
}

GlobalOutput.prototype.getValue = function()
{
	return this._value;
}

GlobalOutput.prototype.onExecute = function()
{
	this._value = this.getInputData(0);
	this.graph.setGlobalOutputData( this.properties.name, this._value );
}

LiteGraph.registerNodeType("graph/output", GlobalOutput);



//Constant
function ConstantNumber()
{
	this.addOutput("value","number");
	this.addProperty( "value", 1.0 );
}

ConstantNumber.title = "Const Number";
ConstantNumber.desc = "Constant number";

ConstantNumber.prototype.onExecute = function()
{
	this.setOutputData(0, parseFloat( this.properties["value"] ) );
}

ConstantNumber.prototype.setValue = function(v)
{
	this.properties.value = v;
}

ConstantNumber.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.outputs[0].label = this.properties["value"].toFixed(3);
}

LiteGraph.registerNodeType("basic/const", ConstantNumber);

function ConstantString()
{
	this.addOutput("","string");
	this.addProperty( "value", "" );
	this.widget = this.addWidget("text","value","", this.setValue.bind(this) );
	this.widgets_up = true;
}

ConstantString.title = "Const String";
ConstantString.desc = "Constant string";

ConstantString.prototype.setValue = function(v)
{
	this.properties.value = v;
}

ConstantString.prototype.onPropertyChanged = function(name,value)
{
	this.widget.value = value;
}

ConstantString.prototype.onExecute = function()
{
	this.setOutputData(0, this.properties["value"] );
}

LiteGraph.registerNodeType("basic/string", ConstantString );


//Watch a value in the editor
function Watch()
{
	this.size = [60,20];
	this.addInput("value",0,{label:""});
	this.value = 0;
}

Watch.title = "Watch";
Watch.desc = "Show value of input";

Watch.prototype.onExecute = function()
{
	if( this.inputs[0] )	
		this.value = this.getInputData(0);
}

Watch.toString = function( o )
{
	if( o == null )
		return "null";
	else if (o.constructor === Number )
		return o.toFixed(3);
	else if (o.constructor === Array )
	{
		var str = "[";
		for(var i = 0; i < o.length; ++i)
			str += Watch.toString(o[i]) + ((i+1) != o.length ? "," : "");
		str += "]";
		return str;
	}
	else
		return String(o);
}

Watch.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.inputs[0].label = Watch.toString(this.value);
}

LiteGraph.registerNodeType("basic/watch", Watch);

//Watch a value in the editor
function Pass()
{
	this.addInput("in",0);
	this.addOutput("out",0);
	this.size = [40,20];
}

Pass.title = "Pass";
Pass.desc = "Allows to connect different types";

Pass.prototype.onExecute = function()
{
	this.setOutputData( 0, this.getInputData(0) );
}

LiteGraph.registerNodeType("basic/pass", Pass);


//Show value inside the debug console
function Console()
{
	this.mode = LiteGraph.ON_EVENT;
	this.size = [60,20];
	this.addProperty( "msg", "" );
	this.addInput("log", LiteGraph.EVENT);
	this.addInput("msg",0);
}

Console.title = "Console";
Console.desc = "Show value inside the console";

Console.prototype.onAction = function(action, param)
{
	if(action == "log")
		console.log( param );
	else if(action == "warn")
		console.warn( param );
	else if(action == "error")
		console.error( param );
}

Console.prototype.onExecute = function()
{
	var msg = this.getInputData(1);
	if(msg !== null)
		this.properties.msg = msg;
	console.log(msg);
}

Console.prototype.onGetInputs = function()
{
	return [["log",LiteGraph.ACTION],["warn",LiteGraph.ACTION],["error",LiteGraph.ACTION]];
}

LiteGraph.registerNodeType("basic/console", Console );



//Execites simple code
function NodeScript()
{
	this.size = [60,20];
	this.addProperty( "onExecute", "return A;" );
	this.addInput("A", "");
	this.addInput("B", "");
	this.addOutput("out", "");

	this._func = null;
	this.data = {};
}

NodeScript.prototype.onConfigure = function(o)
{
	if(o.properties.onExecute)
		this.compileCode(o.properties.onExecute);
}

NodeScript.title = "Script";
NodeScript.desc = "executes a code (max 100 characters)";

NodeScript.widgets_info = {
	"onExecute": { type:"code" }
};

NodeScript.prototype.onPropertyChanged = function(name,value)
{

	if(name == "onExecute" && LiteGraph.allow_scripts )
	{
		this.compileCode( value );
	}
}

NodeScript.prototype.compileCode = function(code)
{
	this._func = null;
	if( code.length > 100 )
		console.warn("Script too long, max 100 chars");
	else {
		var code_low = code.toLowerCase();
		var forbidden_words = ["script","body","document","eval","nodescript","function"]; //bad security solution
		for(var i = 0; i < forbidden_words.length; ++i)
			if( code_low.indexOf( forbidden_words[i] ) != -1 )
			{
				console.warn("invalid script");
				return;
			}
		try
		{
			this._func = new Function("A","B","C","DATA","node", code );
		}
		catch (err)
		{
			console.error("Error parsing script");
			console.error(err);
		}
	}
}

NodeScript.prototype.onExecute = function()
{
	if(!this._func)
		return;

	try
	{
		var A = this.getInputData(0);
		var B = this.getInputData(1);
		var C = this.getInputData(2);
		this.setOutputData(0, this._func(A,B,C,this.data,this) );
	}
	catch (err)
	{
		console.error("Error in script");
		console.error(err);
	}
}

NodeScript.prototype.onGetOutputs = function(){ return [["C",""]]; }

LiteGraph.registerNodeType("basic/script", NodeScript );


})(this);