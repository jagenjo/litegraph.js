(function(global){
var LiteGraph = global.LiteGraph;

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



function Math3DVec3Scale()
{
	this.addInput("in","vec3");
	this.addInput("f","number");
	this.addOutput("out","vec3");
	this.properties = {f:1};
	this._data = new Float32Array(3);
}

Math3DVec3Scale.title = "vec3_scale";
Math3DVec3Scale.desc = "scales the components of a vec3";

Math3DVec3Scale.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		return;
	var f = this.getInputData(1);
	if(f == null) f = this.properties.f;

	var data = this._data;
	data[0] = v[0] * f;
	data[1] = v[1] * f;
	data[2] = v[2] * f;
	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/vec3-scale", Math3DVec3Scale );

function Math3DVec3Length()
{
	this.addInput("in","vec3");
	this.addOutput("out","number");
}

Math3DVec3Length.title = "vec3_length";
Math3DVec3Length.desc = "returns the module of a vector";

Math3DVec3Length.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		return;
	var dist = Math.sqrt( v[0]*v[0] + v[1]*v[1] + v[2]*v[2] );
	this.setOutputData( 0, dist );
}

LiteGraph.registerNodeType("math3d/vec3-length", Math3DVec3Length );

function Math3DVec3Normalize()
{
	this.addInput("in","vec3");
	this.addOutput("out","vec3");
	this._data = new Float32Array(3);
}

Math3DVec3Normalize.title = "vec3_normalize";
Math3DVec3Normalize.desc = "returns the vector normalized";

Math3DVec3Normalize.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		return;
	var dist = Math.sqrt( v[0]*v[0] + v[1]*v[1] + v[2]*v[2] );
	var data = this._data;
	data[0] = v[0] / dist;
	data[1] = v[1] / dist;
	data[2] = v[2] / dist;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/vec3-normalize", Math3DVec3Normalize );

function Math3DVec3Lerp()
{
	this.addInput("A","vec3");
	this.addInput("B","vec3");
	this.addInput("f","vec3");
	this.addOutput("out","vec3");
	this.properties = { f: 0.5 };
	this._data = new Float32Array(3);
}

Math3DVec3Lerp.title = "vec3_lerp";
Math3DVec3Lerp.desc = "returns the interpolated vector";

Math3DVec3Lerp.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	if(A == null)
		return;
	var B = this.getInputData(1);
	if(B == null)
		return;
	var f = this.getInputOrProperty("f");

	var data = this._data;
	data[0] = A[0] * (1-f) + B[0] * f;
	data[1] = A[1] * (1-f) + B[1] * f;
	data[2] = A[2] * (1-f) + B[2] * f;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/vec3-lerp", Math3DVec3Lerp );


function Math3DVec3Dot()
{
	this.addInput("A","vec3");
	this.addInput("B","vec3");
	this.addOutput("out","number");
}

Math3DVec3Dot.title = "vec3_dot";
Math3DVec3Dot.desc = "returns the dot product";

Math3DVec3Dot.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	if(A == null)
		return;
	var B = this.getInputData(1);
	if(B == null)
		return;

	var dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
	this.setOutputData( 0, dot );
}

LiteGraph.registerNodeType("math3d/vec3-dot", Math3DVec3Dot );


//if glMatrix is installed...
if(global.glMatrix) 
{

	function Math3DQuaternion()
	{
		this.addOutput("quat","quat");
		this.properties = { x:0, y:0, z:0, w: 1 };
		this._value = quat.create();
	}

	Math3DQuaternion.title = "Quaternion";
	Math3DQuaternion.desc = "quaternion";

	Math3DQuaternion.prototype.onExecute = function()
	{
		this._value[0] = this.properties.x;
		this._value[1] = this.properties.y;
		this._value[2] = this.properties.z;
		this._value[3] = this.properties.w;
		this.setOutputData( 0, this._value );
	}

	LiteGraph.registerNodeType("math3d/quaternion", Math3DQuaternion );


	function Math3DRotation()
	{
		this.addInputs([["degrees","number"],["axis","vec3"]]);
		this.addOutput("quat","quat");
		this.properties = { angle:90.0, axis: vec3.fromValues(0,1,0) };

		this._value = quat.create();
	}

	Math3DRotation.title = "Rotation";
	Math3DRotation.desc = "quaternion rotation";

	Math3DRotation.prototype.onExecute = function()
	{
		var angle = this.getInputData(0);
		if(angle == null) angle = this.properties.angle;
		var axis = this.getInputData(1);
		if(axis == null) axis = this.properties.axis;

		var R = quat.setAxisAngle( this._value, axis, angle * 0.0174532925 );
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

		this._value = quat.create();
	}

	Math3DMultQuat.title = "Mult. Quat";
	Math3DMultQuat.desc = "rotate quaternion";

	Math3DMultQuat.prototype.onExecute = function()
	{
		var A = this.getInputData(0);
		if(A == null) return;
		var B = this.getInputData(1);
		if(B == null) return;

		var R = quat.multiply( this._value, A, B );
		this.setOutputData( 0, R );
	}

	LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat );


	function Math3DQuatSlerp()
	{
		this.addInputs( [["A","quat"],["B","quat"],["factor","number"]] );
		this.addOutput( "slerp","quat" );
		this.addProperty( "factor", 0.5 );

		this._value = quat.create();
	}

	Math3DQuatSlerp.title = "Quat Slerp";
	Math3DQuatSlerp.desc = "quaternion spherical interpolation";

	Math3DQuatSlerp.prototype.onExecute = function()
	{
		var A = this.getInputData(0);
		if(A == null)
			return;
		var B = this.getInputData(1);
		if(B == null)
			return;
		var factor = this.properties.factor;
		if( this.getInputData(2) != null )
			factor = this.getInputData(2);

		var R = quat.slerp( this._value, A, B, factor );
		this.setOutputData( 0, R );
	}

	LiteGraph.registerNodeType("math3d/quat-slerp", Math3DQuatSlerp );

} //glMatrix

})(this);