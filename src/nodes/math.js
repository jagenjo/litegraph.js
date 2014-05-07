(function(){


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

MathClamp.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	v = Math.max(this.properties.min,v);
	v = Math.min(this.properties.max,v);
	this.setOutputData(0, v );
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
	this.setOutputData(0, v|1 );
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
	this.addOutput("A+B","number");
	this.size = [80,20];
	this.properties = {A:1.0, B:1.0};
}

MathOperation.title = "Operation";
MathOperation.desc = "Easy math operators";

MathOperation.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
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

	for(var i = 0, l = this.outputs.length; i < l; ++i)
	{
		var output = this.outputs[i];
		if(!output.links || !output.links.length)
			continue;
		var value = 0;
		switch( output.name )
		{
			case "A+B": value = A+B; break;
			case "A-B": value = A-B; break;
			case "A*B": value = A*B; break;
			case "A/B": value = A/B; break;
		}
		this.setOutputData(i, value );
	}
}

MathOperation.prototype.onGetOutputs = function()
{
	return [["A-B","number"],["A*B","number"],["A/B","number"]];
}

LiteGraph.registerNodeType("math/operation", MathOperation );


//Math compare
function MathCompare()
{
	this.addInputs( "A","number" );
	this.addInputs( "B","number" );
	this.addOutputs("A==B","number");
	this.addOutputs("A!=B","number");
	this.properties = {A:0,B:0};
}


MathCompare.title = "Compare";
MathCompare.desc = "compares between two values";

MathCompare.prototype.onExecute = function()
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
};

MathCompare.prototype.onGetOutputs = function()
{
	return [["A==B","number"],["A!=B","number"],["A>B","number"],["A<B","number"],["A>=B","number"],["A<=B","number"]];
}

LiteGraph.registerNodeType("math/compare",MathCompare);

//Math Trigonometry
function MathTrigonometry()
{
	this.addInput("v","number");
	this.addOutput("sin","number");
	this.properties = {amplitude:1.0};
	this.bgImageUrl = "nodes/imgs/icon-sin.png";
}

MathTrigonometry.title = "Trigonometry";
MathTrigonometry.desc = "Sin Cos Tan";

MathTrigonometry.prototype.onExecute = function()
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


//if glMatrix is installed...
if(window.glMatrix) 
{
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
	}

	Math3DXYZToVec3.title = "XYZ->Vec3";
	Math3DXYZToVec3.desc = "components to vector3";

	Math3DXYZToVec3.prototype.onExecute = function()
	{
		var x = this.getInputData(0);
		if(x == null) x = 0;
		var y = this.getInputData(1);
		if(y == null) y = 0;
		var z = this.getInputData(2);
		if(z == null) z = 0;

		this.setOutputData( 0, vec3.fromValues(x,y,z) );
	}

	LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3 );


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