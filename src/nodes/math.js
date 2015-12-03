(function(){

//Converter
function Converter()
{
	this.addInput("in","*");
	this.size = [60,20];
}

Converter.title = "Converter";
Converter.desc = "type A to type B";

Converter.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		return;

	if(this.outputs)
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output.links || !output.links.length)
				continue;

			var result = null;
			switch( output.name )
			{
				case "number": result = v.length ? v[0] : parseFloat(v); break;
				case "vec2": 
				case "vec3": 
				case "vec4": 
					var result = null;
					var count = 1;
					switch(output.name)
					{
						case "vec2": count = 2; break;
						case "vec3": count = 3; break;
						case "vec4": count = 4; break;
					}

					var result = new Float32Array( count );
					if( v.length )
					{
						for(var j = 0; j < v.length && j < result.length; j++)
							result[j] = v[j];
					}
					else
						result[0] = parseFloat(v);
					break;
			}
			this.setOutputData(i, result);
		}
}

Converter.prototype.onGetOutputs = function() {
	return [["number","number"],["vec2","vec2"],["vec3","vec3"],["vec4","vec4"]];
}

LiteGraph.registerNodeType("math/converter", Converter );


//Bypass
function Bypass()
{
	this.addInput("in");
	this.addOutput("out");
	this.size = [60,20];
}

Bypass.title = "Bypass";
Bypass.desc = "removes the type";

Bypass.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	this.setOutputData(0, v);
}

LiteGraph.registerNodeType("math/bypass", Bypass );



function MathRange()
{
	this.addInput("in","number",{locked:true});
	this.addOutput("out","number",{locked:true});
	this.properties = { "in": 0, in_min:0, in_max:1, out_min: 0, out_max: 1 };
}

MathRange.title = "Range";
MathRange.desc = "Convert a number from one range to another";

MathRange.prototype.onExecute = function()
{
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[ input.name ] = v;
		}

	var v = this.properties["in"];
	if(v === undefined || v === null || v.constructor !== Number)
		v = 0;

	var in_min = this.properties.in_min;
	var in_max = this.properties.in_max;
	var out_min = this.properties.out_min;
	var out_max = this.properties.out_max;

	this._last_v = ((v - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
	this.setOutputData(0, this._last_v );
}

MathRange.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this._last_v)
		this.outputs[0].label = this._last_v.toFixed(3);
	else
		this.outputs[0].label = "?";
}

MathRange.prototype.onGetInputs = function() {
	return [["in_min","number"],["in_max","number"],["out_min","number"],["out_max","number"]];
}

LiteGraph.registerNodeType("math/range", MathRange);



function MathRand()
{
	this.addOutput("value","number");
	this.properties = { min:0, max:1 };
	this.size = [60,20];
}

MathRand.title = "Rand";
MathRand.desc = "Random number";

MathRand.prototype.onExecute = function()
{
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[input.name] = v;
		}

	var min = this.properties.min;
	var max = this.properties.max;
	this._last_v = Math.random() * (max-min) + min;
	this.setOutputData(0, this._last_v );
}

MathRand.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this._last_v)
		this.outputs[0].label = this._last_v.toFixed(3);
	else
		this.outputs[0].label = "?";
}

MathRand.prototype.onGetInputs = function() {
	return [["min","number"],["max","number"]];
}

LiteGraph.registerNodeType("math/rand", MathRand);

//Math clamp
function MathClamp()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.properties = {min:0, max:1};
}

MathClamp.title = "Clamp";
MathClamp.desc = "Clamp number between min and max";
MathClamp.filter = "shader";

MathClamp.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	v = Math.max(this.properties.min,v);
	v = Math.min(this.properties.max,v);
	this.setOutputData(0, v );
}

MathClamp.prototype.getCode = function(lang)
{
	var code = "";
	if(this.isInputConnected(0))
		code += "clamp({{0}}," + this.properties.min + "," + this.properties.max + ")";
	return code;
}

LiteGraph.registerNodeType("math/clamp", MathClamp );


//Math ABS
function MathAbs()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathAbs.title = "Abs";
MathAbs.desc = "Absolute";

MathAbs.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	this.setOutputData(0, Math.abs(v) );
}

LiteGraph.registerNodeType("math/abs", MathAbs);


//Math Floor
function MathFloor()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathFloor.title = "Floor";
MathFloor.desc = "Floor number to remove fractional part";

MathFloor.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	this.setOutputData(0, Math.floor(v) );
}

LiteGraph.registerNodeType("math/floor", MathFloor );


//Math frac
function MathFrac()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathFrac.title = "Frac";
MathFrac.desc = "Returns fractional part";

MathFrac.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) 
		return;
	this.setOutputData(0, v%1 );
}

LiteGraph.registerNodeType("math/frac",MathFrac);


//Math Floor
function MathSmoothStep()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.properties = { A: 0, B: 1 };
}

MathSmoothStep.title = "Smoothstep";
MathSmoothStep.desc = "Smoothstep";

MathSmoothStep.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v === undefined)
		return;

	var edge0 = this.properties.A;
	var edge1 = this.properties.B;

    // Scale, bias and saturate x to 0..1 range
    v = Math.clamp((v - edge0)/(edge1 - edge0), 0.0, 1.0); 
    // Evaluate polynomial
    v = v*v*(3 - 2*v);

	this.setOutputData(0, v );
}

LiteGraph.registerNodeType("math/smoothstep", MathSmoothStep );

//Math scale
function MathScale()
{
	this.addInput("in","number",{label:""});
	this.addOutput("out","number",{label:""});
	this.size = [60,20];
	this.properties = {"factor":1};
}

MathScale.title = "Scale";
MathScale.desc = "v * factor";

MathScale.prototype.onExecute = function()
{
	var value = this.getInputData(0);
	if(value != null)
		this.setOutputData(0, value * this.properties.factor );
}

LiteGraph.registerNodeType("math/scale", MathScale );


//Math operation
function MathOperation()
{
	this.addInput("A","number");
	this.addInput("B","number");
	this.addOutput("=","number");
	this.properties = {A:1.0, B:1.0, OP:"+"};
}

MathOperation.title = "Operation";
MathOperation.desc = "Easy math operators";
MathOperation["@OP"] = { type:"enum", title: "operation", values:["+","-","*","/","%","^"]};


MathOperation.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
}

MathOperation.prototype.onExecute = function()
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

	var result = 0;
	switch(this.properties.OP)
	{
		case '+': result = A+B; break;
		case '-': result = A-B; break;
		case '/': result = A/B; break;
		case '%': result = A%B; break;
		case '^': result = Math.pow(A,B); break;
	}
	this.setOutputData(0, result );
}

MathOperation.prototype.onDrawBackground = function(ctx)
{
	this.outputs[0].label = "A" + this.properties.OP + "B";
}

LiteGraph.registerNodeType("math/operation", MathOperation );
 

//Math compare
function MathCompare()
{
	this.addInput( "A","number" );
	this.addInput( "B","number" );
	this.addOutput("A==B","boolean");
	this.addOutput("A!=B","boolean");
	this.properties = {A:0,B:0};
}

MathCompare.title = "Compare";
MathCompare.desc = "compares between two values";

MathCompare.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	var B = this.getInputData(1);
	if(A !== undefined)
		this.properties["A"] = A;
	else
		A = this.properties["A"];

	if(B !== undefined)
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
};

MathCompare.prototype.onGetOutputs = function()
{
	return [["A==B","boolean"],["A!=B","boolean"],["A>B","boolean"],["A<B","boolean"],["A>=B","boolean"],["A<=B","boolean"]];
}

LiteGraph.registerNodeType("math/compare",MathCompare);

function MathCondition()
{
	this.addInput("A","number");
	this.addInput("B","number");
	this.addOutput("out","boolean");
	this.properties = { A:0, B:1, OP:">" };
	this.size = [60,40];
}

MathCondition["@OP"] = { type:"enum", title: "operation", values:[">","<","==","!=","<=",">="]};

MathCondition.title = "Condition";
MathCondition.desc = "evaluates condition between A and B";

MathCondition.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	if(A === undefined)
		A = this.properties.A;
	else
		this.properties.A = A;

	var B = this.getInputData(1);
	if(B === undefined)
		B = this.properties.B;
	else
		this.properties.B = B;
		
	var result = true;
	switch(this.properties.OP)
	{
		case ">": result = A>B; break;
		case "<": result = A<B; break;
		case "==": result = A==B; break;
		case "!=": result = A!=B; break;
		case "<=": result = A<=B; break;
		case ">=": result = A>=B; break;
	}

	this.setOutputData(0, result );
}

LiteGraph.registerNodeType("math/condition", MathCondition);


function MathAccumulate()
{
	this.addInput("inc","number");
	this.addOutput("total","number");
	this.properties = { increment: 0, value: 0 };
}

MathAccumulate.title = "Accumulate";
MathAccumulate.desc = "Increments a value every time";

MathAccumulate.prototype.onExecute = function()
{
	var inc = this.getInputData(0);
	if(inc !== null)
		this.properties.value += inc;
	else
		this.properties.value += this.properties.increment;
	this.setOutputData(0, this.properties.value );
}

LiteGraph.registerNodeType("math/accumulate", MathAccumulate);

//Math Trigonometry
function MathTrigonometry()
{
	this.addInput("v","number");
	this.addOutput("sin","number");
	this.properties = {amplitude:1.0, offset: 0};
	this.bgImageUrl = "nodes/imgs/icon-sin.png";
}

MathTrigonometry.title = "Trigonometry";
MathTrigonometry.desc = "Sin Cos Tan";
MathTrigonometry.filter = "shader";

MathTrigonometry.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	var amplitude = this.properties["amplitude"];
	var slot = this.findInputSlot("amplitude");
	if(slot != -1)
		amplitude = this.getInputData(slot);
	var offset = this.properties["offset"];
	slot = this.findInputSlot("offset");
	if(slot != -1)
		offset = this.getInputData(slot);

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
		this.setOutputData(i, amplitude * value + offset);
	}
}

MathTrigonometry.prototype.onGetInputs = function()
{
	return [["v","number"],["amplitude","number"],["offset","number"]];
}


MathTrigonometry.prototype.onGetOutputs = function()
{
	return [["sin","number"],["cos","number"],["tan","number"],["asin","number"],["acos","number"],["atan","number"]];
}


LiteGraph.registerNodeType("math/trigonometry", MathTrigonometry );



//math library for safe math operations without eval
if(window.math)
{
	function MathFormula()
	{
		this.addInputs("x","number");
		this.addInputs("y","number");
		this.addOutputs("","number");
		this.properties = {x:1.0, y:1.0, formula:"x+y"};
	}

	MathFormula.title = "Formula";
	MathFormula.desc = "Compute safe formula";
		
	MathFormula.prototype.onExecute = function()
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
	}

	MathFormula.prototype.onDrawBackground = function()
	{
		var f = this.properties["formula"];
		this.outputs[0].label = f;
	}

	MathFormula.prototype.onGetOutputs = function()
	{
		return [["A-B","number"],["A*B","number"],["A/B","number"]];
	}

	LiteGraph.registerNodeType("math/formula", MathFormula );
}


function Math3DVec2ToXYZ()
{
	this.addInput("vec2","vec2");
	this.addOutput("x","number");
	this.addOutput("y","number");
}

Math3DVec2ToXYZ.title = "Vec2->XY";
Math3DVec2ToXYZ.desc = "vector 2 to components";

Math3DVec2ToXYZ.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
}

LiteGraph.registerNodeType("math3d/vec2-to-xyz", Math3DVec2ToXYZ );


function Math3DXYToVec2()
{
	this.addInputs([["x","number"],["y","number"]]);
	this.addOutput("vec2","vec2");
	this.properties = {x:0, y:0};
	this._data = new Float32Array(2);
}

Math3DXYToVec2.title = "XY->Vec2";
Math3DXYToVec2.desc = "components to vector2";

Math3DXYToVec2.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;

	var data = this._data;
	data[0] = x;
	data[1] = y;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xy-to-vec2", Math3DXYToVec2 );




function Math3DVec3ToXYZ()
{
	this.addInput("vec3","vec3");
	this.addOutput("x","number");
	this.addOutput("y","number");
	this.addOutput("z","number");
}

Math3DVec3ToXYZ.title = "Vec3->XYZ";
Math3DVec3ToXYZ.desc = "vector 3 to components";

Math3DVec3ToXYZ.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
	this.setOutputData( 2, v[2] );
}

LiteGraph.registerNodeType("math3d/vec3-to-xyz", Math3DVec3ToXYZ );


function Math3DXYZToVec3()
{
	this.addInputs([["x","number"],["y","number"],["z","number"]]);
	this.addOutput("vec3","vec3");
	this.properties = {x:0, y:0, z:0};
	this._data = new Float32Array(3);
}

Math3DXYZToVec3.title = "XYZ->Vec3";
Math3DXYZToVec3.desc = "components to vector3";

Math3DXYZToVec3.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;
	var z = this.getInputData(2);
	if(z == null) z = this.properties.z;

	var data = this._data;
	data[0] = x;
	data[1] = y;
	data[2] = z;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3 );



function Math3DVec4ToXYZW()
{
	this.addInput("vec4","vec4");
	this.addOutput("x","number");
	this.addOutput("y","number");
	this.addOutput("z","number");
	this.addOutput("w","number");
}

Math3DVec4ToXYZW.title = "Vec4->XYZW";
Math3DVec4ToXYZW.desc = "vector 4 to components";

Math3DVec4ToXYZW.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
	this.setOutputData( 2, v[2] );
	this.setOutputData( 3, v[3] );
}

LiteGraph.registerNodeType("math3d/vec4-to-xyzw", Math3DVec4ToXYZW );


function Math3DXYZWToVec4()
{
	this.addInputs([["x","number"],["y","number"],["z","number"],["w","number"]]);
	this.addOutput("vec4","vec4");
	this.properties = {x:0, y:0, z:0, w:0};
	this._data = new Float32Array(4);
}

Math3DXYZWToVec4.title = "XYZW->Vec4";
Math3DXYZWToVec4.desc = "components to vector4";

Math3DXYZWToVec4.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;
	var z = this.getInputData(2);
	if(z == null) z = this.properties.z;
	var w = this.getInputData(3);
	if(w == null) w = this.properties.w;

	var data = this._data;
	data[0] = x;
	data[1] = y;
	data[2] = z;
	data[3] = w;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xyzw-to-vec4", Math3DXYZWToVec4 );




//if glMatrix is installed...
if(window.glMatrix) 
{


	function Math3DRotation()
	{
		this.addInputs([["degrees","number"],["axis","vec3"]]);
		this.addOutput("quat","quat");
		this.properties = { angle:90.0, axis: vec3.fromValues(0,1,0) };
	}

	Math3DRotation.title = "Rotation";
	Math3DRotation.desc = "quaternion rotation";

	Math3DRotation.prototype.onExecute = function()
	{
		var angle = this.getInputData(0);
		if(angle == null) angle = this.properties.angle;
		var axis = this.getInputData(1);
		if(axis == null) axis = this.properties.axis;

		var R = quat.setAxisAngle(quat.create(), axis, angle * 0.0174532925 );
		this.setOutputData( 0, R );
	}


	LiteGraph.registerNodeType("math3d/rotation", Math3DRotation );
	

	//Math3D rotate vec3
	function Math3DRotateVec3()
	{
		this.addInputs([["vec3","vec3"],["quat","quat"]]);
		this.addOutput("result","vec3");
		this.properties = { vec: [0,0,1] };
	}

	Math3DRotateVec3.title = "Rot. Vec3";
	Math3DRotateVec3.desc = "rotate a point";

	Math3DRotateVec3.prototype.onExecute = function()
	{
		var vec = this.getInputData(0);
		if(vec == null) vec = this.properties.vec;
		var quat = this.getInputData(1);
		if(quat == null)
			this.setOutputData(vec);
		else
			this.setOutputData( 0, vec3.transformQuat( vec3.create(), vec, quat ) );
	}

	LiteGraph.registerNodeType("math3d/rotate_vec3", Math3DRotateVec3);



	function Math3DMultQuat()
	{
		this.addInputs( [["A","quat"],["B","quat"]] );
		this.addOutput( "A*B","quat" );
	}

	Math3DMultQuat.title = "Mult. Quat";
	Math3DMultQuat.desc = "rotate quaternion";

	Math3DMultQuat.prototype.onExecute = function()
	{
		var A = this.getInputData(0);
		if(A == null) return;
		var B = this.getInputData(1);
		if(B == null) return;

		var R = quat.multiply(quat.create(), A,B);
		this.setOutputData( 0, R );
	}

	LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat );

} //glMatrix

})();