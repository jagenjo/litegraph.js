//basic nodes
(function(){


//Subgraph: a node that contains a graph
function Subgraph()
{
	var that = this;
	this.size = [120,60];

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
	

	this.bgcolor = "#940";
}

Subgraph.title = "Subgraph";
Subgraph.desc = "Graph inside a node";

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


LiteGraph.registerNodeType("graph/subgraph", Subgraph);


//Input for a subgraph
function GlobalInput()
{

	//random name to avoid problems with other outputs when added
	var input_name = "input_" + (Math.random()*1000).toFixed();

	this.addOutput(input_name, null );

	this.properties = {name: input_name, type: null };

	var that = this;

	Object.defineProperty(this.properties, "name", {
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

	Object.defineProperty(this.properties, "type", {
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

GlobalOutput.title = "Ouput";
GlobalOutput.desc = "Output of the graph";

GlobalOutput.prototype.onAdded = function()
{
	var name = this.graph.addGlobalOutput( this.properties.name, this.properties.type );
}

GlobalOutput.prototype.onExecute = function()
{
	this.graph.setGlobalOutputData( this.properties.name, this.getInputData(0) );
}

LiteGraph.registerNodeType("graph/output", GlobalOutput);



//Constant
function Constant()
{
	this.addOutput("value","number");
	this.properties = { value:1.0 };
	this.editable = { property:"value", type:"number" };
}

Constant.title = "Const";
Constant.desc = "Constant value";


Constant.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

Constant.prototype.onExecute = function()
{
	this.setOutputData(0, parseFloat( this.properties["value"] ) );
}

Constant.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.outputs[0].label = this.properties["value"].toFixed(3);
}

Constant.prototype.onWidget = function(e,widget)
{
	if(widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("basic/const", Constant);


//Watch a value in the editor
function Watch()
{
	this.size = [60,20];
	this.addInput("value",0,{label:""});
	this.addOutput("value",0,{label:""});
	this.properties = { value:"" };
}

Watch.title = "Watch";
Watch.desc = "Show value of input";

Watch.prototype.onExecute = function()
{
	this.properties.value = this.getInputData(0);
	this.setOutputData(0, this.properties.value);
}

Watch.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this.inputs[0] && this.properties["value"] != null)	
	{
		if (this.properties["value"].constructor === Number )
			this.inputs[0].label = this.properties["value"].toFixed(3);
		else
			this.inputs[0].label = this.properties["value"];
	}
}

LiteGraph.registerNodeType("basic/watch", Watch);



/*
LiteGraph.registerNodeType("math/sinusoid",{
	title: "Sin",
	desc: "Sinusoidal value generator",
	bgImageUrl: "nodes/imgs/icon-sin.png",

	inputs: [["f",'number'],["q",'number'],["a",'number'],["t",'number']],
	outputs: [["",'number']],
	properties: {amplitude:1.0, freq: 1, phase:0},

	onExecute: function()
	{
		var f = this.getInputData(0);
		if(f != null)
			this.properties["freq"] = f;

		var q = this.getInputData(1);
		if(q != null)
			this.properties["phase"] = q;

		var a = this.getInputData(2);
		if(a != null)
			this.properties["amplitude"] = a;

		var t = this.graph.getFixedTime();
		if(this.getInputData(3) != null)
			t = this.getInputData(3);
		// t = t/(2*Math.PI); t = (t-Math.floor(t))*(2*Math.PI);

		var v = this.properties["amplitude"] * Math.sin((2*Math.PI) * t * this.properties["freq"] + this.properties["phase"]);
		this.setOutputData(0, v );
	},

	onDragBackground: function(ctx)
	{
		this.boxcolor = colorToString(v > 0 ? [0.5,0.8,1,0.5] : [0,0,0,0.5]);
		this.setDirtyCanvas(true);
	},
});
*/

/*
LiteGraph.registerNodeType("basic/number",{
	title: "Number",

// System vars *********************************

LiteGraph.registerNodeType("session/info",{
	title: "Time",
	desc: "Seconds since start",

	outputs: [["secs",'number']],
	properties: {scale:1.0},
	onExecute: function()
	{
		this.setOutputData(0, this.session.getTime() * this.properties.scale);
	}
});

LiteGraph.registerNodeType("system/fixedtime",{
	title: "F.Time",
	desc: "Constant time value",

	outputs: [["secs",'number']],
	properties: {scale:1.0},
	onExecute: function()
	{
		this.setOutputData(0, this.session.getFixedTime() * this.properties.scale);
	}
});


LiteGraph.registerNodeType("system/elapsedtime",{
	title: "Elapsed",
	desc: "Seconds elapsed since last execution",

	outputs: [["secs",'number']],
	properties: {scale:1.0},
	onExecute: function()
	{
		this.setOutputData(0, this.session.getElapsedTime() * this.properties.scale);
	}
});

LiteGraph.registerNodeType("system/iterations",{
	title: "Iterations",
	desc: "Number of iterations (executions)",

	outputs: [["",'number']],
	onExecute: function()
	{
		this.setOutputData(0, this.session.iterations );
	}
});

LiteGraph.registerNodeType("system/trace",{
	desc: "Outputs input to browser's console",

	inputs: [["",0]],
	onExecute: function()
	{
		var data = this.getInputData(0);
		if(data)
			trace("DATA: "+data);
	}
});

/*
LiteGraph.registerNodeType("math/not",{
	title: "Not",
	desc: "0 -> 1 or 0 -> 1",
	inputs: [["A",'number']],
	outputs: [["!A",'number']],
	size: [60,22],
	onExecute: function()
	{
		var v = this.getInputData(0);
		if(v != null)
			this.setOutputData(0, v ? 0 : 1);
	}
});



// Nodes for network in and out 
LiteGraph.registerNodeType("network/general/network_input",{
	title: "N.Input",
	desc: "Network Input",
	outputs: [["",0]],
	color: "#00ff96",
	bgcolor: "#004327",

	setValue: function(v)
	{
		this.value = v;
	},

	onExecute: function()
	{
		this.setOutputData(0, this.value);
	}
});

LiteGraph.registerNodeType("network/general/network_output",{
	title: "N.Output",
	desc: "Network output",
	inputs: [["",0]],
	color: "#a8ff00",
	bgcolor: "#293e00",

	properties: {value:null},

	getValue: function()
	{
		return this.value;
	},

	onExecute: function()
	{
		this.value = this.getOutputData(0);
	}
});

LiteGraph.registerNodeType("network/network_trigger",{
	title: "N.Trigger",
	desc: "Network input trigger",
	outputs: [["",0]],
	color: "#ff9000",
	bgcolor: "#522e00",

	onTrigger: function(v)
	{
		this.triggerOutput(0,v);
	},
});

LiteGraph.registerNodeType("network/network_callback",{
	title: "N.Callback",
	desc: "Network callback output.",
	outputs: [["",0]],
	color: "#6A6",
	bgcolor: "#363",

	setTrigger: function(func)
	{
		this.callback = func;
	},

	onTrigger: function(v)
	{
		if(this.callback)
			this.callback(v);
	},
});

*/


})();