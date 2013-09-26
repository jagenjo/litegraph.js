//basic nodes

LiteGraph.registerNodeType("basic/const",{
	title: "Const",
	desc: "Constant",
	outputs: [["value","number"]],
	properties: {value:1.0},
	editable: { property:"value", type:"number" },

	setValue: function(v)
	{
		if( typeof(v) == "string") v = parseFloat(v);
		this.properties["value"] = v;
		this.setDirtyCanvas(true);
	},

	onExecute: function()
	{
		this.setOutputData(0, parseFloat( this.properties["value"] ) );
	},

	onDrawBackground: function(ctx)
	{
		//show the current value
		this.outputs[0].label = this.properties["value"].toFixed(3);
	},

	onWidget: function(e,widget)
	{
		if(widget.name == "value")
			this.setValue(widget.value);
	}
});

LiteGraph.registerNodeType("math/rand",{
	title: "Rand",
	desc: "Random number",
	outputs: [["value","number"]],
	properties: {min:0,max:1},
	size: [60,20],

	onExecute: function()
	{
		var min = this.properties.min;
		var max = this.properties.max;
		this._last_v = Math.random() * (max-min) + min;
		this.setOutputData(0, this._last_v );
	},

	onDrawBackground: function(ctx)
	{
		//show the current value
		if(this._last_v)
			this.outputs[0].label = this._last_v.toFixed(3);
		else
			this.outputs[0].label = "?";
	}
});

LiteGraph.registerNodeType("math/clamp",{
	title: "Clamp",
	desc: "Clamp number between min and max",
	inputs: [["in","number"]],
	outputs: [["out","number"]],
	size: [60,20],
	properties: {min:0,max:1},

	onExecute: function()
	{
		var v = this.getInputData(0);
		if(v == null) return;
		v = Math.max(this.properties.min,v);
		v = Math.min(this.properties.max,v);
		this.setOutputData(0, v );
	}
});

LiteGraph.registerNodeType("math/abs",{
	title: "Abs",
	desc: "Absolute",
	inputs: [["in","number"]],
	outputs: [["out","number"]],
	size: [60,20],

	onExecute: function()
	{
		var v = this.getInputData(0);
		if(v == null) return;
		this.setOutputData(0, Math.abs(v) );
	}
});

LiteGraph.registerNodeType("math/floor",{
	title: "Floor",
	desc: "Floor number to remove fractional part",
	inputs: [["in","number"]],
	outputs: [["out","number"]],
	size: [60,20],

	onExecute: function()
	{
		var v = this.getInputData(0);
		if(v == null) return;
		this.setOutputData(0, v|1 );
	}
});


LiteGraph.registerNodeType("math/frac",{
	title: "Frac",
	desc: "Returns fractional part",
	inputs: [["in","number"]],
	outputs: [["out","number"]],
	size: [60,20],

	onExecute: function()
	{
		var v = this.getInputData(0);
		if(v == null) return;
		this.setOutputData(0, v%1 );
	}
});


LiteGraph.registerNodeType("basic/watch", {
	title: "Watch",
	desc: "Show value",
	size: [60,20],
	inputs: [["value",0,{label:""}]],
	outputs: [["value",0,{label:""}]],
	properties: {value:""},

	onExecute: function()
	{
		this.properties.value = this.getInputData(0);
		this.setOutputData(0, this.properties.value);
	},

	onDrawBackground: function(ctx)
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
});


LiteGraph.registerNodeType("math/scale",{
	title: "Scale",
	desc: "1 - value",
	inputs: [["value","number",{label:""}]],
	outputs: [["value","number",{label:""}]],
	size:[70,20],
	properties: {"factor":1},

	onExecute: function()
	{
		var value = this.getInputData(0);
		if(value != null)
			this.setOutputData(0, value * this.properties.factor );
	}
});


LiteGraph.registerNodeType("math/operation",{
	title: "Operation",
	desc: "Easy math operators",
	inputs: [["A","number"],["B","number"]],
	outputs: [["A+B","number"]],
	size: [80,20],
	//optional_inputs: [["start","number"]],

	properties: {A:1.0, B:1.0},

	setValue: function(v)
	{
		if( typeof(v) == "string") v = parseFloat(v);
		this.properties["value"] = v;
		this.setDirtyCanvas(true);
	},

	onExecute: function()
	{
		var A = this.getInputData(0);
		var B = this.getInputData(1);
		if(A!=null)
			this.properties["A"] = A;
		else
			A = this.properties["A"];

		if(B!=null)
			this.properties["B"] = B;
		else
			B = this.properties["B"];

		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			var output = this.outputs[i];
			if(!output.links || !output.links.length)
				continue;
			switch( output.name )
			{
				case "A+B": value = A+B; break;
				case "A-B": value = A-B; break;
				case "A*B": value = A*B; break;
				case "A/B": value = A/B; break;
			}
			this.setOutputData(i, value );
		}
	},

	onGetOutputs: function()
	{
		return [["A-B","number"],["A*B","number"],["A/B","number"]];
	}
});

LiteGraph.registerNodeType("math/compare",{
	title: "Compare",
	desc: "compares between two values",

	inputs: [["A","number"],["B","number"]],
	outputs: [["A==B","number"],["A!=B","number"]],
	properties:{A:0,B:0},
	onExecute: function()
	{
		var A = this.getInputData(0);
		var B = this.getInputData(1);
		if(A!=null)
			this.properties["A"] = A;
		else
			A = this.properties["A"];

		if(B!=null)
			this.properties["B"] = B;
		else
			B = this.properties["B"];

		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			var output = this.outputs[i];
			if(!output.links || !output.links.length)
				continue;
			switch( output.name )
			{
				case "A==B": value = A==B; break;
				case "A!=B": value = A!=B; break;
				case "A>B": value = A>B; break;
				case "A<B": value = A<B; break;
				case "A<=B": value = A<=B; break;
				case "A>=B": value = A>=B; break;
			}
			this.setOutputData(i, value );
		}
	},

	onGetOutputs: function()
	{
		return [["A==B","number"],["A!=B","number"],["A>B","number"],["A<B","number"],["A>=B","number"],["A<=B","number"]];
	}
});

if(window.math) //math library for safe math operations without eval
LiteGraph.registerNodeType("math/formula",{
	title: "Formula",
	desc: "Compute safe formula",
	inputs: [["x","number"],["y","number"]],
	outputs: [["","number"]],
	properties: {x:1.0, y:1.0, formula:"x+y"},
	
	onExecute: function()
	{
		var x = this.getInputData(0);
		var y = this.getInputData(1);
		if(x != null)
			this.properties["x"] = x;
		else
			x = this.properties["x"];

		if(y!=null)
			this.properties["y"] = y;
		else
			y = this.properties["y"];

		var f = this.properties["formula"];
		var value = math.eval(f,{x:x,y:y,T: this.graph.globaltime });
		this.setOutputData(0, value );
	},

	onDrawBackground: function()
	{
		var f = this.properties["formula"];
		this.outputs[0].label = f;
	},

	onGetOutputs: function()
	{
		return [["A-B","number"],["A*B","number"],["A/B","number"]];
	}
});


LiteGraph.registerNodeType("math/trigonometry",{
	title: "Trigonometry",
	desc: "Sin Cos Tan",
	bgImageUrl: "nodes/imgs/icon-sin.png",

	inputs: [["v","number"]],
	outputs: [["sin","number"]],
	properties: {amplitude:1.0},
	size:[100,20],

	onExecute: function()
	{
		var v = this.getInputData(0);
		var amp = this.properties["amplitude"];
		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			var output = this.outputs[i];
			switch( output.name )
			{
				case "sin": value = Math.sin(v); break;
				case "cos": value = Math.cos(v); break;
				case "tan": value = Math.tan(v); break;
				case "asin": value = Math.asin(v); break;
				case "acos": value = Math.acos(v); break;
				case "atan": value = Math.atan(v); break;
			}
			this.setOutputData(i, amp * value );
		}
	},

	onGetOutputs: function()
	{
		return [["sin","number"],["cos","number"],["tan","number"],["asin","number"],["acos","number"],["atan","number"]];
	}
});

//if glMatrix is installed...
if(window.glMatrix) 
{
	LiteGraph.registerNodeType("math3d/vec3-to-xyz",{
		title: "Vec3->XYZ",
		desc: "vector 3 to components",
		inputs: [["vec3","vec3"]],
		outputs: [["x","number"],["y","number"],["z","number"]],

		onExecute: function()
		{
			var v = this.getInputData(0);
			if(v == null) return;

			this.setOutputData( 0, v[0] );
			this.setOutputData( 1, v[1] );
			this.setOutputData( 2, v[2] );
		}
	});

	LiteGraph.registerNodeType("math3d/xyz-to-vec3",{
		title: "XYZ->Vec3",
		desc: "components to vector3",
		inputs: [["x","number"],["y","number"],["z","number"]],
		outputs: [["vec3","vec3"]],

		onExecute: function()
		{
			var x = this.getInputData(0);
			if(x == null) x = 0;
			var y = this.getInputData(1);
			if(y == null) y = 0;
			var z = this.getInputData(2);
			if(z == null) z = 0;

			this.setOutputData( 0, vec3.fromValues(x,y,z) );
		}
	});

	LiteGraph.registerNodeType("math3d/rotation",{
		title: "Rotation",
		desc: "rotation quaternion",
		inputs: [["degrees","number"],["axis","vec3"]],
		outputs: [["quat","quat"]],
		properties: {angle:90.0, axis:[0,1,0]},

		onExecute: function()
		{
			var angle = this.getInputData(0);
			if(angle == null) angle = this.properties.angle;
			var axis = this.getInputData(1);
			if(axis == null) axis = this.properties.axis;

			var R = quat.setAxisAngle(quat.create(), axis, angle * 0.0174532925 );
			this.setOutputData( 0, R );
		}
	});

	LiteGraph.registerNodeType("math3d/rotate_vec3",{
		title: "Rot. Vec3",
		desc: "rotate a point",
		inputs: [["vec3","vec3"],["quat","quat"]],
		outputs: [["result","vec3"]],
		properties: {vec:[0,0,1]},

		onExecute: function()
		{
			var vec = this.getInputData(0);
			if(vec == null) vec = this.properties.vec;
			var quat = this.getInputData(1);
			if(quat == null)
				this.setOutputData(vec);
			else
				this.setOutputData( 0, vec3.transformQuat( vec3.create(), vec, quat ) );
		}
	});


	LiteGraph.registerNodeType("math3d/mult-quat",{
		title: "Mult. Quat",
		desc: "rotate quaternion",
		inputs: [["A","quat"],["B","quat"]],
		outputs: [["A*B","quat"]],

		onExecute: function()
		{
			var A = this.getInputData(0);
			if(A == null) return;
			var B = this.getInputData(1);
			if(B == null) return;

			var R = quat.multiply(quat.create(), A,B);
			this.setOutputData( 0, R );
		}
	});

} //glMatrix


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
	desc: "Fixed number output",
	outputs: [["","number"]],
	color: "#66A",
	bgcolor: "#336",
	widgets: [{name:"value",text:"Value",type:"input",property:"value"}],

	properties: {value:1.0},

	setValue: function(v)
	{
		if( typeof(v) == "string") v = parseFloat(v);
		this.properties["value"] = v;
		this.setDirtyCanvas(true);
	},

	onExecute: function()
	{
		this.outputs[0].name = this.properties["value"].toString();
		this.setOutputData(0, this.properties["value"]);
	},

	onWidget: function(e,widget)
	{
		if(widget.name == "value")
			this.setValue(widget.value);
	}
});


LiteGraph.registerNodeType("basic/string",{
	title: "String",
	desc: "Fixed string output",
	outputs: [["","string"]],
	color: "#66A",
	bgcolor: "#336",
	widgets: [{name:"value",text:"Value",type:"input"}],

	properties: {value:"..."},

	setValue: function(v)
	{
		this.properties["value"] = v;
		this.setDirtyCanvas(true);
	},

	onExecute: function()
	{
		this.outputs[0].name = this.properties["value"].toString();
		this.setOutputData(0, this.properties["value"]);
	},

	onWidget: function(e,widget)
	{
		if(widget.name == "value")
			this.setValue(widget.value);
	}
});

LiteGraph.registerNodeType("basic/trigger",{
	title: "Trigger",
	desc: "Triggers node action",
	inputs: [["!0","number"]],
	outputs: [["M","node"]],

	properties: {triggerName:null},

	onExecute: function()
	{
		if( this.getInputData(0) )
		{
			var m = this.getOutputNode(0);
			if(m && m.onTrigger)
				m.onTrigger();
			if(m && this.properties.triggerName && typeof(m[this.properties.triggerName]) == "function")
				m[this.properties.triggerName].call(m);
		}
	}
});


LiteGraph.registerNodeType("basic/switch",{
	title: "Switch",
	desc: "Switch between two inputs",
	inputs: [["i","number"],["A",0],["B",0]],
	outputs: [["",0]],

	onExecute: function()
	{
		var f = this.getInputData(0);
		if(f)
		{
			f = Math.round(f)+1;
			if(f < 1) f = 1;
			if(f > 2) f = 2;
			this.setOutputData(0, this.getInputData(f) );
		}
		else
			this.setOutputData(0, null);
	}
});

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