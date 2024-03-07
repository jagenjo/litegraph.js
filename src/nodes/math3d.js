(function(global) {
	var LiteGraph = global.LiteGraph;

	class Math3DMat4 {
		constructor() {
			this.addInput("T", "vec3");
			this.addInput("R", "vec3");
			this.addInput("S", "vec3");
			this.addOutput("mat4", "mat4");
			this.properties = {
				"T": [0, 0, 0],
				"R": [0, 0, 0],
				"S": [1, 1, 1],
				R_in_degrees: true
			};
			this._result = mat4.create();
			this._must_update = true;
		}

		static title = "mat4";
		static temp_quat = new Float32Array([0, 0, 0, 1]);
		static temp_mat4 = new Float32Array(16);
		static temp_vec3 = new Float32Array(3);

		onPropertyChanged(name, value) {
			this._must_update = true;
		}

		onExecute() {
			var M = this._result;
			var Q = Math3DMat4.temp_quat;
			var temp_mat4 = Math3DMat4.temp_mat4;
			var temp_vec3 = Math3DMat4.temp_vec3;

			var T = this.getInputData(0);
			var R = this.getInputData(1);
			var S = this.getInputData(2);

			if (this._must_update || T || R || S) {
				T = T || this.properties.T;
				R = R || this.properties.R;
				S = S || this.properties.S;
				mat4.identity(M);
				mat4.translate(M, M, T);
				if (this.properties.R_in_degrees) {
					temp_vec3.set(R);
					vec3.scale(temp_vec3, temp_vec3, DEG2RAD);
					quat.fromEuler(Q, temp_vec3);
				}
				else
					quat.fromEuler(Q, R);
				mat4.fromQuat(temp_mat4, Q);
				mat4.multiply(M, M, temp_mat4);
				mat4.scale(M, M, S);
			}

			this.setOutputData(0, M);
		}
	}
	LiteGraph.registerNodeType("math3d/mat4", Math3DMat4);

	//Math 3D operation
	class Math3DOperation {
		constructor() {
			this.addInput("A", "number,vec3");
			this.addInput("B", "number,vec3");
			this.addOutput("=", "number,vec3");
			this.addProperty("OP", "+", "enum", {
				values: Math3DOperation.values
			});
			this._result = vec3.create();
		}

		static values = ["+", "-", "*", "/", "%", "^", "max", "min", "dot", "cross"];
		static title = "Operation";
		static desc = "Easy math 3D operators";
		static "@OP" = {
			type: "enum",
			title: "operation",
			values: Math3DOperation.values
		};
		static size = [100, 60];

		getTitle() {
			if (this.properties.OP == "max" || this.properties.OP == "min")
				return this.properties.OP + "(A,B)";
			return "A " + this.properties.OP + " B";
		}

		onExecute() {
			var A = this.getInputData(0);
			var B = this.getInputData(1);
			if (A == null || B == null)
				return;
			if (A.constructor === Number)
				A = [A, A, A];
			if (B.constructor === Number)
				B = [B, B, B];

			var result = this._result;
			switch (this.properties.OP) {
				case "+":
					result = vec3.add(result, A, B);
					break;
				case "-":
					result = vec3.sub(result, A, B);
					break;
				case "x":
				case "X":
				case "*":
					result = vec3.mul(result, A, B);
					break;
				case "/":
					result = vec3.div(result, A, B);
					break;
				case "%":
					result[0] = A[0] % B[0];
					result[1] = A[1] % B[1];
					result[2] = A[2] % B[2];
					break;
				case "^":
					result[0] = Math.pow(A[0], B[0]);
					result[1] = Math.pow(A[1], B[1]);
					result[2] = Math.pow(A[2], B[2]);
					break;
				case "max":
					result[0] = Math.max(A[0], B[0]);
					result[1] = Math.max(A[1], B[1]);
					result[2] = Math.max(A[2], B[2]);
					break;
				case "min":
					result[0] = Math.min(A[0], B[0]);
					result[1] = Math.min(A[1], B[1]);
					result[2] = Math.min(A[2], B[2]);
				case "dot":
					result = vec3.dot(A, B);
					break;
				case "cross":
					vec3.cross(result, A, B);
					break;
				default:
					console.warn("Unknown operation: " + this.properties.OP);
			}
			this.setOutputData(0, result);
		}

		onDrawBackground(ctx) {
			if (this.flags.collapsed) {
				return;
			}

			ctx.font = "40px Arial";
			ctx.fillStyle = "#666";
			ctx.textAlign = "center";
			ctx.fillText(
				this.properties.OP,
				this.size[0] * 0.5,
				(this.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * 0.5
			);
			ctx.textAlign = "left";
		}
	}
	LiteGraph.registerSearchboxExtra("math3d/operation", "CROSS()", {
		properties: {
			"OP": "cross"
		},
		title: "CROSS()"
	});

	LiteGraph.registerSearchboxExtra("math3d/operation", "DOT()", {
		properties: {
			"OP": "dot"
		},
		title: "DOT()"
	});
	LiteGraph.registerNodeType("math3d/operation", Math3DOperation);

	class Math3DVec3Scale {
		constructor() {
			this.addInput("in", "vec3");
			this.addInput("f", "number");
			this.addOutput("out", "vec3");
			this.properties = {
				f: 1
			};
			this._data = new Float32Array(3);
		}

		static title = "vec3_scale";
		static desc = "scales the components of a vec3";

		onExecute() {
			var v = this.getInputData(0);
			if (v == null) {
				return;
			}
			var f = this.getInputData(1);
			if (f == null) {
				f = this.properties.f;
			}

			var data = this._data;
			data[0] = v[0] * f;
			data[1] = v[1] * f;
			data[2] = v[2] * f;
			this.setOutputData(0, data);
		}
	}
	LiteGraph.registerNodeType("math3d/vec3-scale", Math3DVec3Scale);

	class Math3DVec3Length {
		constructor() {
			this.addInput("in", "vec3");
			this.addOutput("out", "number");
		}

		static title = "vec3_length";
		static desc = "returns the module of a vector";

		onExecute() {
			var v = this.getInputData(0);
			if (v == null) {
				return;
			}
			var dist = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
			this.setOutputData(0, dist);
		}
	}
	LiteGraph.registerNodeType("math3d/vec3-length", Math3DVec3Length);

	class Math3DVec3Normalize {
		constructor() {
			this.addInput("in", "vec3");
			this.addOutput("out", "vec3");
			this._data = new Float32Array(3);
		}

		static title = "vec3_normalize";
		static desc = "returns the vector normalized";

		onExecute() {
			var v = this.getInputData(0);
			if (v == null) {
				return;
			}
			var dist = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
			var data = this._data;
			data[0] = v[0] / dist;
			data[1] = v[1] / dist;
			data[2] = v[2] / dist;

			this.setOutputData(0, data);
		}
	}
	LiteGraph.registerNodeType("math3d/vec3-normalize", Math3DVec3Normalize);

	class Math3DVec3Lerp {
		constructor() {
			this.addInput("A", "vec3");
			this.addInput("B", "vec3");
			this.addInput("f", "vec3");
			this.addOutput("out", "vec3");
			this.properties = {
				f: 0.5
			};
			this._data = new Float32Array(3);
		}

		static title = "vec3_lerp";
		static desc = "returns the interpolated vector";

		onExecute() {
			var A = this.getInputData(0);
			if (A == null) {
				return;
			}
			var B = this.getInputData(1);
			if (B == null) {
				return;
			}
			var f = this.getInputOrProperty("f");

			var data = this._data;
			data[0] = A[0] * (1 - f) + B[0] * f;
			data[1] = A[1] * (1 - f) + B[1] * f;
			data[2] = A[2] * (1 - f) + B[2] * f;

			this.setOutputData(0, data);
		}
	}
	LiteGraph.registerNodeType("math3d/vec3-lerp", Math3DVec3Lerp);

	class Math3DVec3Dot {
		constructor() {
			this.addInput("A", "vec3");
			this.addInput("B", "vec3");
			this.addOutput("out", "number");
		}

		static title = "vec3_dot";
		static desc = "returns the dot product";

		onExecute() {
			var A = this.getInputData(0);
			if (A == null) {
				return;
			}
			var B = this.getInputData(1);
			if (B == null) {
				return;
			}

			var dot = A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
			this.setOutputData(0, dot);
		}
	}
	LiteGraph.registerNodeType("math3d/vec3-dot", Math3DVec3Dot);

	//if glMatrix is installed...
	if (global.glMatrix) {
		class Math3DQuaternion {
			constructor() {
				this.addOutput("quat", "quat");
				this.properties = {
					x: 0,
					y: 0,
					z: 0,
					w: 1,
					normalize: false
				};
				this._value = quat.create();
			}

			static title = "Quaternion";
			static desc = "quaternion";

			onExecute() {
				this._value[0] = this.getInputOrProperty("x");
				this._value[1] = this.getInputOrProperty("y");
				this._value[2] = this.getInputOrProperty("z");
				this._value[3] = this.getInputOrProperty("w");
				if (this.properties.normalize) {
					quat.normalize(this._value, this._value);
				}
				this.setOutputData(0, this._value);
			}

			onGetInputs() {
				return [
					["x", "number"],
					["y", "number"],
					["z", "number"],
					["w", "number"]
				];
			}
		}
		LiteGraph.registerNodeType("math3d/quaternion", Math3DQuaternion);

		class Math3DRotation {
			constructor() {
				this.addInputs([
					["degrees", "number"],
					["axis", "vec3"]
				]);
				this.addOutput("quat", "quat");
				this.properties = {
					angle: 90.0,
					axis: vec3.fromValues(0, 1, 0)
				};

				this._value = quat.create();
			}

			static title = "Rotation";
			static desc = "quaternion rotation";

			onExecute() {
				var angle = this.getInputData(0);
				if (angle == null) {
					angle = this.properties.angle;
				}
				var axis = this.getInputData(1);
				if (axis == null) {
					axis = this.properties.axis;
				}

				var R = quat.setAxisAngle(this._value, axis, angle * 0.0174532925);
				this.setOutputData(0, R);
			}
		}
		LiteGraph.registerNodeType("math3d/rotation", Math3DRotation);

		class MathEulerToQuat {
			constructor() {
				this.addInput("euler", "vec3");
				this.addOutput("quat", "quat");
				this.properties = {
					euler: [0, 0, 0],
					use_yaw_pitch_roll: false
				};
				this._degs = vec3.create();
				this._value = quat.create();
			}

			static title = "Euler->Quat";
			static desc = "Converts euler angles (in degrees) to quaternion";

			onExecute() {
				var euler = this.getInputData(0);
				if (euler == null) {
					euler = this.properties.euler;
				}
				vec3.scale(this._degs, euler, DEG2RAD);
				if (this.properties.use_yaw_pitch_roll)
					this._degs = [this._degs[2], this._degs[0], this._degs[1]];
				var R = quat.fromEuler(this._value, this._degs);
				this.setOutputData(0, R);
			}
		}
		LiteGraph.registerNodeType("math3d/euler_to_quat", MathEulerToQuat);

		class MathQuatToEuler {
			constructor() {
				this.addInput(["quat", "quat"]);
				this.addOutput("euler", "vec3");
				this._value = vec3.create();
			}

			static title = "Euler->Quat";
			static desc = "Converts rotX,rotY,rotZ in degrees to quat";

			onExecute() {
				var q = this.getInputData(0);
				if (!q)
					return;
				var R = quat.toEuler(this._value, q);
				vec3.scale(this._value, this._value, DEG2RAD);
				this.setOutputData(0, this._value);
			}
		}
		LiteGraph.registerNodeType("math3d/quat_to_euler", MathQuatToEuler);

		//Math3D rotate vec3
		class Math3DRotateVec3 {
			constructor() {
				this.addInputs([
					["vec3", "vec3"],
					["quat", "quat"]
				]);
				this.addOutput("result", "vec3");
				this.properties = {
					vec: [0, 0, 1]
				};
			}

			static title = "Rot. Vec3";
			static desc = "rotate a point";

			onExecute() {
				var vec = this.getInputData(0);
				if (vec == null) {
					vec = this.properties.vec;
				}
				var quat = this.getInputData(1);
				if (quat == null) {
					this.setOutputData(vec);
				}
				else {
					this.setOutputData(
						0,
						vec3.transformQuat(vec3.create(), vec, quat)
					);
				}
			}
		}
		LiteGraph.registerNodeType("math3d/rotate_vec3", Math3DRotateVec3);

		class Math3DMultQuat {
			constructor() {
				this.addInputs([
					["A", "quat"],
					["B", "quat"]
				]);
				this.addOutput("A*B", "quat");

				this._value = quat.create();
			}

			static title = "Mult. Quat";
			static desc = "rotate quaternion";

			onExecute() {
				var A = this.getInputData(0);
				if (A == null) {
					return;
				}
				var B = this.getInputData(1);
				if (B == null) {
					return;
				}

				var R = quat.multiply(this._value, A, B);
				this.setOutputData(0, R);
			}
		}
		LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat);

		class Math3DQuatSlerp {
			constructor() {
				this.addInputs([
					["A", "quat"],
					["B", "quat"],
					["factor", "number"]
				]);
				this.addOutput("slerp", "quat");
				this.addProperty("factor", 0.5);

				this._value = quat.create();
			}

			static title = "Quat Slerp";
			static desc = "quaternion spherical interpolation";

			onExecute() {
				var A = this.getInputData(0);
				if (A == null) {
					return;
				}
				var B = this.getInputData(1);
				if (B == null) {
					return;
				}
				var factor = this.properties.factor;
				if (this.getInputData(2) != null) {
					factor = this.getInputData(2);
				}

				var R = quat.slerp(this._value, A, B, factor);
				this.setOutputData(0, R);
			}
		}
		LiteGraph.registerNodeType("math3d/quat-slerp", Math3DQuatSlerp);

		//Math3D rotate vec3
		class Math3DRemapRange {
			constructor() {
				this.addInput("vec3", "vec3");
				this.addOutput("remap", "vec3");
				this.addOutput("clamped", "vec3");
				this.properties = {
					clamp: true,
					range_min: [-1, -1, 0],
					range_max: [1, 1, 0],
					target_min: [-1, -1, 0],
					target_max: [1, 1, 0]
				};
				this._value = vec3.create();
				this._clamped = vec3.create();
			}

			static title = "Remap Range";
			static desc = "remap a 3D range";

			onExecute() {
				var vec = this.getInputData(0);
				if (vec)
					this._value.set(vec);
				var range_min = this.properties.range_min;
				var range_max = this.properties.range_max;
				var target_min = this.properties.target_min;
				var target_max = this.properties.target_max;

				//swap to avoid errors
				/*
				if(range_min > range_max)
				{
					range_min = range_max;
					range_max = this.properties.range_min;
				}

				if(target_min > target_max)
				{
					target_min = target_max;
					target_max = this.properties.target_min;
				}
				*/

				for (var i = 0; i < 3; ++i) {
					var r = range_max[i] - range_min[i];
					this._clamped[i] = clamp(this._value[i], range_min[i], range_max[i]);
					if (r == 0) {
						this._value[i] = (target_min[i] + target_max[i]) * 0.5;
						continue;
					}

					var n = (this._value[i] - range_min[i]) / r;
					if (this.properties.clamp)
						n = clamp(n, 0, 1);
					var t = target_max[i] - target_min[i];
					this._value[i] = target_min[i] + n * t;
				}

				this.setOutputData(0, this._value);
				this.setOutputData(1, this._clamped);
			}
		}
		LiteGraph.registerNodeType("math3d/remap_range", Math3DRemapRange);

	} //glMatrix
	else if (LiteGraph.debug)
		console.warn("No glmatrix found, some Math3D nodes may not work");

})(this);
