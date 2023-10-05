(function(global) {
    var LiteGraph = global.LiteGraph;

    //Converter
    function Converter() {
        this.addInput("in", 0);
		this.addOutput("out", 0);
        this.size = [80, 30];
    }

    Converter.title = "Converter";
    Converter.desc = "type A to type B";

    Converter.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                if (!output.links || !output.links.length) {
                    continue;
                }

                var result = null;
                switch (output.name) {
                    case "number":
                        result = v.length ? v[0] : parseFloat(v);
                        break;
                    case "vec2":
                    case "vec3":
                    case "vec4":
                        var result = null;
                        var count = 1;
                        switch (output.name) {
                            case "vec2":
                                count = 2;
                                break;
                            case "vec3":
                                count = 3;
                                break;
                            case "vec4":
                                count = 4;
                                break;
                        }

                        var result = new Float32Array(count);
                        if (v.length) {
                            for (
                                var j = 0;
                                j < v.length && j < result.length;
                                j++
                            ) {
                                result[j] = v[j];
                            }
                        } else {
                            result[0] = parseFloat(v);
                        }
                        break;
                }
                this.setOutputData(i, result);
            }
        }
    };

    Converter.prototype.onGetOutputs = function() {
        return [
            ["number", "number"],
            ["vec2", "vec2"],
            ["vec3", "vec3"],
            ["vec4", "vec4"]
        ];
    };

    LiteGraph.registerNodeType("math/converter", Converter);

    //Bypass
    function Bypass() {
        this.addInput("in");
        this.addOutput("out");
        this.size = [80, 30];
    }

    Bypass.title = "Bypass";
    Bypass.desc = "removes the type";

    Bypass.prototype.onExecute = function() {
        var v = this.getInputData(0);
        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/bypass", Bypass);

    function ToNumber() {
        this.addInput("in");
        this.addOutput("out");
    }

    ToNumber.title = "to Number";
    ToNumber.desc = "Cast to number";

    ToNumber.prototype.onExecute = function() {
        var v = this.getInputData(0);
        this.setOutputData(0, Number(v));
    };

    LiteGraph.registerNodeType("math/to_number", ToNumber);

    function MathRange() {
        this.addInput("in", "number", { locked: true });
        this.addOutput("out", "number", { locked: true });
        this.addOutput("clamped", "number", { locked: true });

        this.addProperty("in", 0);
        this.addProperty("in_min", 0);
        this.addProperty("in_max", 1);
        this.addProperty("out_min", 0);
        this.addProperty("out_max", 1);

        this.size = [120, 50];
    }

    MathRange.title = "Range";
    MathRange.desc = "Convert a number from one range to another";

    MathRange.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return (this._last_v || 0).toFixed(2);
        }
        return this.title;
    };

    MathRange.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                this.properties[input.name] = v;
            }
        }

        var v = this.properties["in"];
        if (v === undefined || v === null || v.constructor !== Number) {
            v = 0;
        }

        var in_min = this.properties.in_min;
        var in_max = this.properties.in_max;
        var out_min = this.properties.out_min;
        var out_max = this.properties.out_max;
		/*
		if( in_min > in_max )
		{
			in_min = in_max;
			in_max = this.properties.in_min;
		}
		if( out_min > out_max )
		{
			out_min = out_max;
			out_max = this.properties.out_min;
		}
		*/

        this._last_v = ((v - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
        this.setOutputData(0, this._last_v);
        this.setOutputData(1, clamp( this._last_v, out_min, out_max ));
    };

    MathRange.prototype.onDrawBackground = function(ctx) {
        //show the current value
        if (this._last_v) {
            this.outputs[0].label = this._last_v.toFixed(3);
        } else {
            this.outputs[0].label = "?";
        }
    };

    MathRange.prototype.onGetInputs = function() {
        return [
            ["in_min", "number"],
            ["in_max", "number"],
            ["out_min", "number"],
            ["out_max", "number"]
        ];
    };

    LiteGraph.registerNodeType("math/range", MathRange);

    function MathRand() {
        this.addOutput("value", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.size = [80, 30];
    }

    MathRand.title = "Rand";
    MathRand.desc = "Random number";

    MathRand.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                this.properties[input.name] = v;
            }
        }

        var min = this.properties.min;
        var max = this.properties.max;
        this._last_v = Math.random() * (max - min) + min;
        this.setOutputData(0, this._last_v);
    };

    MathRand.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = (this._last_v || 0).toFixed(3);
    };

    MathRand.prototype.onGetInputs = function() {
        return [["min", "number"], ["max", "number"]];
    };

    LiteGraph.registerNodeType("math/rand", MathRand);

    //basic continuous noise
    function MathNoise() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.addProperty("smooth", true);
        this.addProperty("seed", 0);
        this.addProperty("octaves", 1);
        this.addProperty("persistence", 0.8);
        this.addProperty("speed", 1);
        this.size = [90, 30];
    }

    MathNoise.title = "Noise";
    MathNoise.desc = "Random number with temporal continuity";
    MathNoise.data = null;

    MathNoise.getValue = function(f, smooth) {
        if (!MathNoise.data) {
            MathNoise.data = new Float32Array(1024);
            for (var i = 0; i < MathNoise.data.length; ++i) {
                MathNoise.data[i] = Math.random();
            }
        }
        f = f % 1024;
        if (f < 0) {
            f += 1024;
        }
        var f_min = Math.floor(f);
        var f = f - f_min;
        var r1 = MathNoise.data[f_min];
        var r2 = MathNoise.data[f_min == 1023 ? 0 : f_min + 1];
        if (smooth) {
            f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        }
        return r1 * (1 - f) + r2 * f;
    };

    MathNoise.prototype.onExecute = function() {
        var f = this.getInputData(0) || 0;
		var iterations = this.properties.octaves || 1;
		var r = 0;
		var amp = 1;
		var seed = this.properties.seed || 0;
		f += seed;
		var speed = this.properties.speed || 1;
		var total_amp = 0;
		for(var i = 0; i < iterations; ++i)
		{
			r += MathNoise.getValue(f * (1+i) * speed, this.properties.smooth) * amp;
			total_amp += amp;
			amp *= this.properties.persistence;
			if(amp < 0.001)
				break;
		}
		r /= total_amp;
        var min = this.properties.min;
        var max = this.properties.max;
        this._last_v = r * (max - min) + min;
        this.setOutputData(0, this._last_v);
    };

    MathNoise.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = (this._last_v || 0).toFixed(3);
    };

    LiteGraph.registerNodeType("math/noise", MathNoise);

    //generates spikes every random time
    function MathSpikes() {
        this.addOutput("out", "number");
        this.addProperty("min_time", 1);
        this.addProperty("max_time", 2);
        this.addProperty("duration", 0.2);
        this.size = [90, 30];
        this._remaining_time = 0;
        this._blink_time = 0;
    }

    MathSpikes.title = "Spikes";
    MathSpikes.desc = "spike every random time";

    MathSpikes.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time; //in secs

        this._remaining_time -= dt;
        this._blink_time -= dt;

        var v = 0;
        if (this._blink_time > 0) {
            var f = this._blink_time / this.properties.duration;
            v = 1 / (Math.pow(f * 8 - 4, 4) + 1);
        }

        if (this._remaining_time < 0) {
            this._remaining_time =
                Math.random() *
                    (this.properties.max_time - this.properties.min_time) +
                this.properties.min_time;
            this._blink_time = this.properties.duration;
            this.boxcolor = "#FFF";
        } else {
            this.boxcolor = "#000";
        }
        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/spikes", MathSpikes);

    //Math clamp
    function MathClamp() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.addProperty("min", 0);
        this.addProperty("max", 1);
    }

    MathClamp.title = "Clamp";
    MathClamp.desc = "Clamp number between min and max";
    //MathClamp.filter = "shader";

    MathClamp.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        v = Math.max(this.properties.min, v);
        v = Math.min(this.properties.max, v);
        this.setOutputData(0, v);
    };

    MathClamp.prototype.getCode = function(lang) {
        var code = "";
        if (this.isInputConnected(0)) {
            code +=
                "clamp({{0}}," +
                this.properties.min +
                "," +
                this.properties.max +
                ")";
        }
        return code;
    };

    LiteGraph.registerNodeType("math/clamp", MathClamp);

    //Math ABS
    function MathLerp() {
        this.properties = { f: 0.5 };
        this.addInput("A", "number");
        this.addInput("B", "number");

        this.addOutput("out", "number");
    }

    MathLerp.title = "Lerp";
    MathLerp.desc = "Linear Interpolation";

    MathLerp.prototype.onExecute = function() {
        var v1 = this.getInputData(0);
        if (v1 == null) {
            v1 = 0;
        }
        var v2 = this.getInputData(1);
        if (v2 == null) {
            v2 = 0;
        }

        var f = this.properties.f;

        var _f = this.getInputData(2);
        if (_f !== undefined) {
            f = _f;
        }

        this.setOutputData(0, v1 * (1 - f) + v2 * f);
    };

    MathLerp.prototype.onGetInputs = function() {
        return [["f", "number"]];
    };

    LiteGraph.registerNodeType("math/lerp", MathLerp);

    //Math ABS
    function MathAbs() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathAbs.title = "Abs";
    MathAbs.desc = "Absolute";

    MathAbs.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, Math.abs(v));
    };

    LiteGraph.registerNodeType("math/abs", MathAbs);

    //Math Floor
    function MathFloor() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathFloor.title = "Floor";
    MathFloor.desc = "Floor number to remove fractional part";

    MathFloor.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, Math.floor(v));
    };

    LiteGraph.registerNodeType("math/floor", MathFloor);

    //Math frac
    function MathFrac() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathFrac.title = "Frac";
    MathFrac.desc = "Returns fractional part";

    MathFrac.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, v % 1);
    };

    LiteGraph.registerNodeType("math/frac", MathFrac);

    //Math Floor
    function MathSmoothStep() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.properties = { A: 0, B: 1 };
    }

    MathSmoothStep.title = "Smoothstep";
    MathSmoothStep.desc = "Smoothstep";

    MathSmoothStep.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        var edge0 = this.properties.A;
        var edge1 = this.properties.B;

        // Scale, bias and saturate x to 0..1 range
        v = clamp((v - edge0) / (edge1 - edge0), 0.0, 1.0);
        // Evaluate polynomial
        v = v * v * (3 - 2 * v);

        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/smoothstep", MathSmoothStep);

    //Math scale
    function MathScale() {
        this.addInput("in", "number", { label: "" });
        this.addOutput("out", "number", { label: "" });
        this.size = [80, 30];
        this.addProperty("factor", 1);
    }

    MathScale.title = "Scale";
    MathScale.desc = "v * factor";

    MathScale.prototype.onExecute = function() {
        var value = this.getInputData(0);
        if (value != null) {
            this.setOutputData(0, value * this.properties.factor);
        }
    };

    LiteGraph.registerNodeType("math/scale", MathScale);

	//Gate
	function Gate() {
		this.addInput("v","boolean");
		this.addInput("A");
		this.addInput("B");
		this.addOutput("out");
	}

	Gate.title = "Gate";
	Gate.desc = "if v is true, then outputs A, otherwise B";

	Gate.prototype.onExecute = function() {
		var v = this.getInputData(0);
		this.setOutputData(0, this.getInputData( v ? 1 : 2 ));
	};

	LiteGraph.registerNodeType("math/gate", Gate);


    //Math Average
    function MathAverageFilter() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.addProperty("samples", 10);
        this._values = new Float32Array(10);
        this._current = 0;
    }

    MathAverageFilter.title = "Average";
    MathAverageFilter.desc = "Average Filter";

    MathAverageFilter.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }

        var num_samples = this._values.length;

        this._values[this._current % num_samples] = v;
        this._current += 1;
        if (this._current > num_samples) {
            this._current = 0;
        }

        var avr = 0;
        for (var i = 0; i < num_samples; ++i) {
            avr += this._values[i];
        }

        this.setOutputData(0, avr / num_samples);
    };

    MathAverageFilter.prototype.onPropertyChanged = function(name, value) {
        if (value < 1) {
            value = 1;
        }
        this.properties.samples = Math.round(value);
        var old = this._values;

        this._values = new Float32Array(this.properties.samples);
        if (old.length <= this._values.length) {
            this._values.set(old);
        } else {
            this._values.set(old.subarray(0, this._values.length));
        }
    };

    LiteGraph.registerNodeType("math/average", MathAverageFilter);

    //Math
    function MathTendTo() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("factor", 0.1);
        this.size = [80, 30];
        this._value = null;
    }

    MathTendTo.title = "TendTo";
    MathTendTo.desc = "moves the output value always closer to the input";

    MathTendTo.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }
        var f = this.properties.factor;
        if (this._value == null) {
            this._value = v;
        } else {
            this._value = this._value * (1 - f) + v * f;
        }
        this.setOutputData(0, this._value);
    };

    LiteGraph.registerNodeType("math/tendTo", MathTendTo);

    //Math operation
    function MathOperation() {
        this.addInput("A", "number,array,object");
        this.addInput("B", "number");
        this.addOutput("=", "number");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", "+", "enum", { values: MathOperation.values });
		this._func = MathOperation.funcs[this.properties.OP];
		this._result = []; //only used for arrays
    }

    MathOperation.values = ["+", "-", "*", "/", "%", "^", "max", "min"];
    MathOperation.funcs = {
        "+": function(A,B) { return A + B; },
        "-": function(A,B) { return A - B; },
        "x": function(A,B) { return A * B; },
        "X": function(A,B) { return A * B; },
        "*": function(A,B) { return A * B; },
        "/": function(A,B) { return A / B; },
        "%": function(A,B) { return A % B; },
        "^": function(A,B) { return Math.pow(A, B); },
        "max": function(A,B) { return Math.max(A, B); },
        "min": function(A,B) { return Math.min(A, B); }
    };

	MathOperation.title = "Operation";
    MathOperation.desc = "Easy math operators";
    MathOperation["@OP"] = {
        type: "enum",
        title: "operation",
        values: MathOperation.values
    };
    MathOperation.size = [100, 60];

    MathOperation.prototype.getTitle = function() {
		if(this.properties.OP == "max" || this.properties.OP == "min")
			return this.properties.OP + "(A,B)";
        return "A " + this.properties.OP + " B";
    };

    MathOperation.prototype.setValue = function(v) {
        if (typeof v == "string") {
            v = parseFloat(v);
        }
        this.properties["value"] = v;
    };

    MathOperation.prototype.onPropertyChanged = function(name, value)
	{
		if (name != "OP")
			return;
        this._func = MathOperation.funcs[this.properties.OP];
        if(!this._func)
        {
            console.warn("Unknown operation: " + this.properties.OP);
            this._func = function(A) { return A; };
        }
	}

    MathOperation.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        if ( A != null ) {
			if( A.constructor === Number )
	            this.properties["A"] = A;
        } else {
            A = this.properties["A"];
        }

        if (B != null) {
            this.properties["B"] = B;
        } else {
            B = this.properties["B"];
        }

        var func = MathOperation.funcs[this.properties.OP];

		var result;
		if(A.constructor === Number)
		{
	        result = 0;
			result = func(A,B);
		}
		else if(A.constructor === Array)
		{
			result = this._result;
			result.length = A.length;
			for(var i = 0; i < A.length; ++i)
				result[i] = func(A[i],B);
		}
		else
		{
			result = {};
			for(var i in A)
				result[i] = func(A[i],B);
		}
	    this.setOutputData(0, result);
    };

    MathOperation.prototype.onDrawBackground = function(ctx) {
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
    };

    LiteGraph.registerNodeType("math/operation", MathOperation);

    LiteGraph.registerSearchboxExtra("math/operation", "MAX", {
        properties: {OP:"max"},
        title: "MAX()"
    });

    LiteGraph.registerSearchboxExtra("math/operation", "MIN", {
        properties: {OP:"min"},
        title: "MIN()"
    });


    //Math compare
    function MathCompare() {
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("A==B", "boolean");
        this.addOutput("A!=B", "boolean");
        this.addProperty("A", 0);
        this.addProperty("B", 0);
    }

    MathCompare.title = "Compare";
    MathCompare.desc = "compares between two values";

    MathCompare.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        if (A !== undefined) {
            this.properties["A"] = A;
        } else {
            A = this.properties["A"];
        }

        if (B !== undefined) {
            this.properties["B"] = B;
        } else {
            B = this.properties["B"];
        }

        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            var output = this.outputs[i];
            if (!output.links || !output.links.length) {
                continue;
            }
            var value;
            switch (output.name) {
                case "A==B":
                    value = A == B;
                    break;
                case "A!=B":
                    value = A != B;
                    break;
                case "A>B":
                    value = A > B;
                    break;
                case "A<B":
                    value = A < B;
                    break;
                case "A<=B":
                    value = A <= B;
                    break;
                case "A>=B":
                    value = A >= B;
                    break;
            }
            this.setOutputData(i, value);
        }
    };

    MathCompare.prototype.onGetOutputs = function() {
        return [
            ["A==B", "boolean"],
            ["A!=B", "boolean"],
            ["A>B", "boolean"],
            ["A<B", "boolean"],
            ["A>=B", "boolean"],
            ["A<=B", "boolean"]
        ];
    };

    LiteGraph.registerNodeType("math/compare", MathCompare);

    LiteGraph.registerSearchboxExtra("math/compare", "==", {
        outputs: [["A==B", "boolean"]],
        title: "A==B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "!=", {
        outputs: [["A!=B", "boolean"]],
        title: "A!=B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", ">", {
        outputs: [["A>B", "boolean"]],
        title: "A>B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "<", {
        outputs: [["A<B", "boolean"]],
        title: "A<B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", ">=", {
        outputs: [["A>=B", "boolean"]],
        title: "A>=B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "<=", {
        outputs: [["A<=B", "boolean"]],
        title: "A<=B"
    });

    function MathCondition() {
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("true", "boolean");
        this.addOutput("false", "boolean");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", ">", "enum", { values: MathCondition.values });
		this.addWidget("combo","Cond.",this.properties.OP,{ property: "OP", values: MathCondition.values } );

        this.size = [80, 60];
    }

    MathCondition.values = [">", "<", "==", "!=", "<=", ">=", "||", "&&" ];
    MathCondition["@OP"] = {
        type: "enum",
        title: "operation",
        values: MathCondition.values
    };

    MathCondition.title = "Condition";
    MathCondition.desc = "evaluates condition between A and B";

    MathCondition.prototype.getTitle = function() {
        return "A " + this.properties.OP + " B";
    };

    MathCondition.prototype.onExecute = function() {
        var A = this.getInputData(0);
        if (A === undefined) {
            A = this.properties.A;
        } else {
            this.properties.A = A;
        }

        var B = this.getInputData(1);
        if (B === undefined) {
            B = this.properties.B;
        } else {
            this.properties.B = B;
        }

        var result = true;
        switch (this.properties.OP) {
            case ">":
                result = A > B;
                break;
            case "<":
                result = A < B;
                break;
            case "==":
                result = A == B;
                break;
            case "!=":
                result = A != B;
                break;
            case "<=":
                result = A <= B;
                break;
            case ">=":
                result = A >= B;
                break;
            case "||":
                result = A || B;
                break;
            case "&&":
                result = A && B;
                break;
        }

        this.setOutputData(0, result);
        this.setOutputData(1, !result);
    };

    LiteGraph.registerNodeType("math/condition", MathCondition);


    function MathBranch() {
        this.addInput("in", 0);
        this.addInput("cond", "boolean");
        this.addOutput("true", 0);
        this.addOutput("false", 0);
        this.size = [80, 60];
    }

    MathBranch.title = "Branch";
    MathBranch.desc = "If condition is true, outputs IN in true, otherwise in false";

    MathBranch.prototype.onExecute = function() {
        var V = this.getInputData(0);
        var cond = this.getInputData(1);

		if(cond)
		{
			this.setOutputData(0, V);
			this.setOutputData(1, null);
		}
		else
		{
			this.setOutputData(0, null);
			this.setOutputData(1, V);
		}
	}

    LiteGraph.registerNodeType("math/branch", MathBranch);


    function MathAccumulate() {
        this.addInput("inc", "number");
        this.addOutput("total", "number");
        this.addProperty("increment", 1);
        this.addProperty("value", 0);
    }

    MathAccumulate.title = "Accumulate";
    MathAccumulate.desc = "Increments a value every time";

    MathAccumulate.prototype.onExecute = function() {
        if (this.properties.value === null) {
            this.properties.value = 0;
        }

        var inc = this.getInputData(0);
        if (inc !== null) {
            this.properties.value += inc;
        } else {
            this.properties.value += this.properties.increment;
        }
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("math/accumulate", MathAccumulate);

    //Math Trigonometry
    function MathTrigonometry() {
        this.addInput("v", "number");
        this.addOutput("sin", "number");

        this.addProperty("amplitude", 1);
        this.addProperty("offset", 0);
        this.bgImageUrl = "nodes/imgs/icon-sin.png";
    }

    MathTrigonometry.title = "Trigonometry";
    MathTrigonometry.desc = "Sin Cos Tan";
    //MathTrigonometry.filter = "shader";

    MathTrigonometry.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }
        var amplitude = this.properties["amplitude"];
        var slot = this.findInputSlot("amplitude");
        if (slot != -1) {
            amplitude = this.getInputData(slot);
        }
        var offset = this.properties["offset"];
        slot = this.findInputSlot("offset");
        if (slot != -1) {
            offset = this.getInputData(slot);
        }

        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            var output = this.outputs[i];
            var value;
            switch (output.name) {
                case "sin":
                    value = Math.sin(v);
                    break;
                case "cos":
                    value = Math.cos(v);
                    break;
                case "tan":
                    value = Math.tan(v);
                    break;
                case "asin":
                    value = Math.asin(v);
                    break;
                case "acos":
                    value = Math.acos(v);
                    break;
                case "atan":
                    value = Math.atan(v);
                    break;
            }
            this.setOutputData(i, amplitude * value + offset);
        }
    };

    MathTrigonometry.prototype.onGetInputs = function() {
        return [["v", "number"], ["amplitude", "number"], ["offset", "number"]];
    };

    MathTrigonometry.prototype.onGetOutputs = function() {
        return [
            ["sin", "number"],
            ["cos", "number"],
            ["tan", "number"],
            ["asin", "number"],
            ["acos", "number"],
            ["atan", "number"]
        ];
    };

    LiteGraph.registerNodeType("math/trigonometry", MathTrigonometry);

    LiteGraph.registerSearchboxExtra("math/trigonometry", "SIN()", {
        outputs: [["sin", "number"]],
        title: "SIN()"
    });
    LiteGraph.registerSearchboxExtra("math/trigonometry", "COS()", {
        outputs: [["cos", "number"]],
        title: "COS()"
    });
    LiteGraph.registerSearchboxExtra("math/trigonometry", "TAN()", {
        outputs: [["tan", "number"]],
        title: "TAN()"
    });

    //math library for safe math operations without eval
    function MathFormula() {
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addOutput("", "number");
        this.properties = { x: 1.0, y: 1.0, formula: "x+y" };
        this.code_widget = this.addWidget(
            "text",
            "F(x,y)",
            this.properties.formula,
            function(v, canvas, node) {
                node.properties.formula = v;
            }
        );
        this.addWidget("toggle", "allow", LiteGraph.allow_scripts, function(v) {
            LiteGraph.allow_scripts = v;
        });
        this._func = null;
    }

    MathFormula.title = "Formula";
    MathFormula.desc = "Compute formula";
    MathFormula.size = [160, 100];

    MathAverageFilter.prototype.onPropertyChanged = function(name, value) {
        if (name == "formula") {
            this.code_widget.value = value;
        }
    };

    MathFormula.prototype.onExecute = function() {
        if (!LiteGraph.allow_scripts) {
            return;
        }

        var x = this.getInputData(0);
        var y = this.getInputData(1);
        if (x != null) {
            this.properties["x"] = x;
        } else {
            x = this.properties["x"];
        }

        if (y != null) {
            this.properties["y"] = y;
        } else {
            y = this.properties["y"];
        }

        var f = this.properties["formula"];

        var value;
        try {
            if (!this._func || this._func_code != this.properties.formula) {
                this._func = new Function(
                    "x",
                    "y",
                    "TIME",
                    "return " + this.properties.formula
                );
                this._func_code = this.properties.formula;
            }
            value = this._func(x, y, this.graph.globaltime);
            this.boxcolor = null;
        } catch (err) {
            this.boxcolor = "red";
        }
        this.setOutputData(0, value);
    };

    MathFormula.prototype.getTitle = function() {
        return this._func_code || "Formula";
    };

    MathFormula.prototype.onDrawBackground = function() {
        var f = this.properties["formula"];
        if (this.outputs && this.outputs.length) {
            this.outputs[0].label = f;
        }
    };

    LiteGraph.registerNodeType("math/formula", MathFormula);

    function Math3DVec2ToXY() {
        this.addInput("vec2", "vec2");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
    }

    Math3DVec2ToXY.title = "Vec2->XY";
    Math3DVec2ToXY.desc = "vector 2 to components";

    Math3DVec2ToXY.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
    };

    LiteGraph.registerNodeType("math3d/vec2-to-xy", Math3DVec2ToXY);

    function Math3DXYToVec2() {
        this.addInputs([["x", "number"], ["y", "number"]]);
        this.addOutput("vec2", "vec2");
        this.properties = { x: 0, y: 0 };
        this._data = new Float32Array(2);
    }

    Math3DXYToVec2.title = "XY->Vec2";
    Math3DXYToVec2.desc = "components to vector2";

    Math3DXYToVec2.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xy-to-vec2", Math3DXYToVec2);

    function Math3DVec3ToXYZ() {
        this.addInput("vec3", "vec3");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
    }

    Math3DVec3ToXYZ.title = "Vec3->XYZ";
    Math3DVec3ToXYZ.desc = "vector 3 to components";

    Math3DVec3ToXYZ.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
    };

    LiteGraph.registerNodeType("math3d/vec3-to-xyz", Math3DVec3ToXYZ);

    function Math3DXYZToVec3() {
        this.addInputs([["x", "number"], ["y", "number"], ["z", "number"]]);
        this.addOutput("vec3", "vec3");
        this.properties = { x: 0, y: 0, z: 0 };
        this._data = new Float32Array(3);
    }

    Math3DXYZToVec3.title = "XYZ->Vec3";
    Math3DXYZToVec3.desc = "components to vector3";

    Math3DXYZToVec3.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }
        var z = this.getInputData(2);
        if (z == null) {
            z = this.properties.z;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;
        data[2] = z;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3);

    function Math3DVec4ToXYZW() {
        this.addInput("vec4", "vec4");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
        this.addOutput("w", "number");
    }

    Math3DVec4ToXYZW.title = "Vec4->XYZW";
    Math3DVec4ToXYZW.desc = "vector 4 to components";

    Math3DVec4ToXYZW.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
        this.setOutputData(3, v[3]);
    };

    LiteGraph.registerNodeType("math3d/vec4-to-xyzw", Math3DVec4ToXYZW);

    function Math3DXYZWToVec4() {
        this.addInputs([
            ["x", "number"],
            ["y", "number"],
            ["z", "number"],
            ["w", "number"]
        ]);
        this.addOutput("vec4", "vec4");
        this.properties = { x: 0, y: 0, z: 0, w: 0 };
        this._data = new Float32Array(4);
    }

    Math3DXYZWToVec4.title = "XYZW->Vec4";
    Math3DXYZWToVec4.desc = "components to vector4";

    Math3DXYZWToVec4.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }
        var z = this.getInputData(2);
        if (z == null) {
            z = this.properties.z;
        }
        var w = this.getInputData(3);
        if (w == null) {
            w = this.properties.w;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;
        data[2] = z;
        data[3] = w;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xyzw-to-vec4", Math3DXYZWToVec4);

})(this);
