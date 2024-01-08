//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    //Show value inside the debug console
    function LogEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
    }

    LogEvent.title = "Log Event";
    LogEvent.desc = "Log event in console";

    LogEvent.prototype.onAction = function(action, param, options) {
        console.log(action, param);
    };

    LiteGraph.registerNodeType("events/log", LogEvent);

    //convert to Event if the value is true
    function TriggerEvent() {
        this.size = [60, 30];
        this.addInput("if", "");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
		this.properties = { only_on_change: true };
		this.prev = 0;
    }

    TriggerEvent.title = "TriggerEvent";
    TriggerEvent.desc = "Triggers event if input evaluates to true";

    TriggerEvent.prototype.onExecute = function( param, options) {
		var v = this.getInputData(0);
		var changed = (v != this.prev);
		if(this.prev === 0)
			changed = false;
		var must_resend = (changed && this.properties.only_on_change) || (!changed && !this.properties.only_on_change);
		if(v && must_resend )
	        this.triggerSlot(0, param, null, options);
		if(!v && must_resend)
	        this.triggerSlot(2, param, null, options);
		if(changed)
	        this.triggerSlot(1, param, null, options);
		this.prev = v;
    };

    LiteGraph.registerNodeType("events/trigger", TriggerEvent);

    //Sequence of events
    function Sequence() {
		var that = this;
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addWidget("button","+",null,function(){
	        that.addInput("", LiteGraph.ACTION);
	        that.addOutput("", LiteGraph.EVENT);
        });
        this.size = [90, 70];
        this.flags = { horizontal: true, render_box: false };
    }

    Sequence.title = "Sequence";
    Sequence.desc = "Triggers a sequence of events when an event arrives";

    Sequence.prototype.getTitle = function() {
        return "";
    };

    Sequence.prototype.onAction = function(action, param, options) {
        if (this.outputs) {
            options = options || {};
            for (var i = 0; i < this.outputs.length; ++i) {
				var output = this.outputs[i];
				//needs more info about this...
				if( options.action_call ) // CREATE A NEW ID FOR THE ACTION
	                options.action_call = options.action_call + "_seq_" + i;
				else
					options.action_call = this.id + "_" + (action ? action : "action")+"_seq_"+i+"_"+Math.floor(Math.random()*9999);
                this.triggerSlot(i, param, null, options);
            }
        }
    };

    LiteGraph.registerNodeType("events/sequence", Sequence);


   //Sequence of events
   function WaitAll() {
    var that = this;
    this.addInput("", LiteGraph.ACTION);
    this.addInput("", LiteGraph.ACTION);
    this.addOutput("", LiteGraph.EVENT);
    this.addWidget("button","+",null,function(){
        that.addInput("", LiteGraph.ACTION);
        that.size[0] = 90;
    });
    this.size = [90, 70];
    this.ready = [];
}

WaitAll.title = "WaitAll";
WaitAll.desc = "Wait until all input events arrive then triggers output";

WaitAll.prototype.getTitle = function() {
    return "";
};

WaitAll.prototype.onDrawBackground = function(ctx)
{
    if (this.flags.collapsed) {
        return;
    }
    for(var i = 0; i < this.inputs.length; ++i)
    {
        var y = i * LiteGraph.NODE_SLOT_HEIGHT + 10;
        ctx.fillStyle = this.ready[i] ? "#AFB" : "#000";
        ctx.fillRect(20, y, 10, 10);
    }
}

WaitAll.prototype.onAction = function(action, param, options, slot_index) {
    if(slot_index == null)
        return;

    //check all
    this.ready.length = this.outputs.length;
    this.ready[slot_index] = true;
    for(var i = 0; i < this.ready.length;++i)
        if(!this.ready[i])
            return;
    //pass
    this.reset();
    this.triggerSlot(0);
};

WaitAll.prototype.reset = function()
{
    this.ready.length = 0;
}

LiteGraph.registerNodeType("events/waitAll", WaitAll);    


    //Sequencer for events
    function Stepper() {
		var that = this;
		this.properties = { index: 0 };
        this.addInput("index", "number");
        this.addInput("step", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("index", "number");
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT,{removable:true});
        this.addWidget("button","+",null,function(){
	        that.addOutput("", LiteGraph.EVENT, {removable:true});
        });
        this.size = [120, 120];
        this.flags = { render_box: false };
    }

    Stepper.title = "Stepper";
    Stepper.desc = "Trigger events sequentially when an tick arrives";

	Stepper.prototype.onDrawBackground = function(ctx)
	{
        if (this.flags.collapsed) {
            return;
        }
		var index = this.properties.index || 0;
        ctx.fillStyle = "#AFB";
		var w = this.size[0];
        var y = (index + 1)* LiteGraph.NODE_SLOT_HEIGHT + 4;
        ctx.beginPath();
        ctx.moveTo(w - 30, y);
        ctx.lineTo(w - 30, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(w - 15, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
	}

	Stepper.prototype.onExecute = function()
	{
		var index = this.getInputData(0);
		if(index != null)
		{
			index = Math.floor(index);
			index = clamp( index, 0, this.outputs ? (this.outputs.length - 2) : 0 );
			if( index != this.properties.index )
			{
				this.properties.index = index;
			    this.triggerSlot( index+1 );
			}
		}

		this.setOutputData(0, this.properties.index );
	}

    Stepper.prototype.onAction = function(action, param) {
		if(action == "reset")
			this.properties.index = 0;
		else if(action == "step")
		{
            this.triggerSlot(this.properties.index+1, param);
			var n = this.outputs ? this.outputs.length - 1 : 0;
			this.properties.index = (this.properties.index + 1) % n;
        }
    };

    LiteGraph.registerNodeType("events/stepper", Stepper);

    //Filter events
    function FilterEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("event", LiteGraph.EVENT);
        this.properties = {
            equal_to: "",
            has_property: "",
            property_equal_to: ""
        };
    }

    FilterEvent.title = "Filter Event";
    FilterEvent.desc = "Blocks events that do not match the filter";

    FilterEvent.prototype.onAction = function(action, param, options) {
        if (param == null) {
            return;
        }

        if (this.properties.equal_to && this.properties.equal_to != param) {
            return;
        }

        if (this.properties.has_property) {
            var prop = param[this.properties.has_property];
            if (prop == null) {
                return;
            }

            if (
                this.properties.property_equal_to &&
                this.properties.property_equal_to != prop
            ) {
                return;
            }
        }

        this.triggerSlot(0, param, null, options);
    };

    LiteGraph.registerNodeType("events/filter", FilterEvent);


    function EventBranch() {
        this.addInput("in", LiteGraph.ACTION);
        this.addInput("cond", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.size = [120, 60];
		this._value = false;
    }

    EventBranch.title = "Branch";
    EventBranch.desc = "If condition is true, outputs triggers true, otherwise false";

    EventBranch.prototype.onExecute = function() {
		this._value = this.getInputData(1);
	}

    EventBranch.prototype.onAction = function(action, param, options) {
        this._value = this.getInputData(1);
		this.triggerSlot(this._value ? 0 : 1, param, null, options);
	}

    LiteGraph.registerNodeType("events/branch", EventBranch);

    //Show value inside the debug console
    function EventCounter() {
        this.addInput("inc", LiteGraph.ACTION);
        this.addInput("dec", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("num", "number");
        this.addProperty("doCountExecution", false, "boolean", {name: "Count Executions"});
        this.addWidget("toggle","Count Exec.",this.properties.doCountExecution,"doCountExecution");
        this.num = 0;
    }

    EventCounter.title = "Counter";
    EventCounter.desc = "Counts events";

    EventCounter.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return String(this.num);
        }
        return this.title;
    };

    EventCounter.prototype.onAction = function(action, param, options) {
        var v = this.num;
        if (action == "inc") {
            this.num += 1;
        } else if (action == "dec") {
            this.num -= 1;
        } else if (action == "reset") {
            this.num = 0;
        }
        if (this.num != v) {
            this.trigger("change", this.num);
        }
    };

    EventCounter.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AAA";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.num, this.size[0] * 0.5, this.size[1] * 0.5);
    };

    EventCounter.prototype.onExecute = function() {
        if(this.properties.doCountExecution){
            this.num += 1;
        }
        this.setOutputData(1, this.num);
    };

    LiteGraph.registerNodeType("events/counter", EventCounter);

    //Show value inside the debug console
    function DelayEvent() {
        this.size = [60, 30];
        this.addProperty("time_in_ms", 1000);
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("on_time", LiteGraph.EVENT);

        this._pending = [];
    }

    DelayEvent.title = "Delay";
    DelayEvent.desc = "Delays one event";

    DelayEvent.prototype.onAction = function(action, param, options) {
        var time = this.properties.time_in_ms;
        if (time <= 0) {
            this.trigger(null, param, options);
        } else {
            this._pending.push([time, param]);
        }
    };

    DelayEvent.prototype.onExecute = function(param, options) {
        var dt = this.graph.elapsed_time * 1000; //in ms

        if (this.isInputConnected(1)) {
            this.properties.time_in_ms = this.getInputData(1);
        }

        for (var i = 0; i < this._pending.length; ++i) {
            var actionPass = this._pending[i];
            actionPass[0] -= dt;
            if (actionPass[0] > 0) {
                continue;
            }

            //remove
            this._pending.splice(i, 1);
            --i;

            //trigger
            this.trigger(null, actionPass[1], options);
        }
    };

    DelayEvent.prototype.onGetInputs = function() {
        return [["event", LiteGraph.ACTION], ["time_in_ms", "number"]];
    };

    LiteGraph.registerNodeType("events/delay", DelayEvent);

    //Show value inside the debug console
    function TimerEvent() {
        this.addProperty("interval", 1000);
        this.addProperty("event", "tick");
        this.addOutput("on_tick", LiteGraph.EVENT);
        this.time = 0;
        this.last_interval = 1000;
        this.triggered = false;
    }

    TimerEvent.title = "Timer";
    TimerEvent.desc = "Sends an event every N milliseconds";

    TimerEvent.prototype.onStart = function() {
        this.time = 0;
    };

    TimerEvent.prototype.getTitle = function() {
        return "Timer: " + this.last_interval.toString() + "ms";
    };

    TimerEvent.on_color = "#AAA";
    TimerEvent.off_color = "#222";

    TimerEvent.prototype.onDrawBackground = function() {
        this.boxcolor = this.triggered
            ? TimerEvent.on_color
            : TimerEvent.off_color;
        this.triggered = false;
    };

    TimerEvent.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time * 1000; //in ms

        var trigger = this.time == 0;

        this.time += dt;
        this.last_interval = Math.max(
            1,
            this.getInputOrProperty("interval") | 0
        );

        if (
            !trigger &&
            (this.time < this.last_interval || isNaN(this.last_interval))
        ) {
            if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
                this.setOutputData(1, false);
            }
            return;
        }

        this.triggered = true;
        this.time = this.time % this.last_interval;
        this.trigger("on_tick", this.properties.event);
        if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
            this.setOutputData(1, true);
        }
    };

    TimerEvent.prototype.onGetInputs = function() {
        return [["interval", "number"]];
    };

    TimerEvent.prototype.onGetOutputs = function() {
        return [["tick", "boolean"]];
    };

    LiteGraph.registerNodeType("events/timer", TimerEvent);



    function SemaphoreEvent() {
        this.addInput("go", LiteGraph.ACTION );
        this.addInput("green", LiteGraph.ACTION );
        this.addInput("red", LiteGraph.ACTION );
        this.addOutput("continue", LiteGraph.EVENT );
        this.addOutput("blocked", LiteGraph.EVENT );
        this.addOutput("is_green", "boolean" );
		this._ready = false;
		this.properties = {};
		var that = this;
		this.addWidget("button","reset","",function(){
			that._ready = false;
		});
    }

    SemaphoreEvent.title = "Semaphore Event";
    SemaphoreEvent.desc = "Until both events are not triggered, it doesnt continue.";

	SemaphoreEvent.prototype.onExecute = function()
	{
		this.setOutputData(1,this._ready);
		this.boxcolor = this._ready ? "#9F9" : "#FA5";
	}

    SemaphoreEvent.prototype.onAction = function(action, param) {
		if( action == "go" )
			this.triggerSlot( this._ready ? 0 : 1 );
		else if( action == "green" )
			this._ready = true;
		else if( action == "red" )
			this._ready = false;
    };

    LiteGraph.registerNodeType("events/semaphore", SemaphoreEvent);

    function OnceEvent() {
        this.addInput("in", LiteGraph.ACTION );
        this.addInput("reset", LiteGraph.ACTION );
        this.addOutput("out", LiteGraph.EVENT );
		this._once = false;
		this.properties = {};
		var that = this;
		this.addWidget("button","reset","",function(){
			that._once = false;
		});
    }

    OnceEvent.title = "Once";
    OnceEvent.desc = "Only passes an event once, then gets locked";

    OnceEvent.prototype.onAction = function(action, param) {
		if( action == "in" && !this._once )
		{
			this._once = true;
			this.triggerSlot( 0, param );
		}
		else if( action == "reset" )
			this._once = false;
    };

    LiteGraph.registerNodeType("events/once", OnceEvent);

    function DataStore() {
        this.addInput("data", 0);
        this.addInput("assign", LiteGraph.ACTION);
        this.addOutput("data", 0);
		this._last_value = null;
		this.properties = { data: null, serialize: true };
		var that = this;
		this.addWidget("button","store","",function(){
			that.properties.data = that._last_value;
		});
    }

    DataStore.title = "Data Store";
    DataStore.desc = "Stores data and only changes when event is received";

	DataStore.prototype.onExecute = function()
	{
		this._last_value = this.getInputData(0);
		this.setOutputData(0, this.properties.data );
	}

    DataStore.prototype.onAction = function(action, param, options) {
		this.properties.data = this._last_value;
    };

	DataStore.prototype.onSerialize = function(o)
	{
		if(o.data == null)
			return;
		if(this.properties.serialize == false || (o.data.constructor !== String && o.data.constructor !== Number && o.data.constructor !== Boolean && o.data.constructor !== Array && o.data.constructor !== Object ))
			o.data = null;
	}

    LiteGraph.registerNodeType("basic/data_store", DataStore);



})(this);
