//event related nodes
(function(global) {
	var LiteGraph = global.LiteGraph;

	//Show value inside the debug console
	class LogEvent {
		constructor() {
			this.size = [60, 30];
			this.addInput("event", LiteGraph.ACTION);
		}

		static title = "Log Event";
		static desc = "Log event in console";

		onAction(action, param, options) {
			console.log(action, param);
		}
	}
	LiteGraph.registerNodeType("events/log", LogEvent);

	//convert to Event if the value is true
	class TriggerEvent {
		constructor() {
			this.size = [60, 30];
			this.addInput("if", "");
			this.addOutput("true", LiteGraph.EVENT);
			this.addOutput("change", LiteGraph.EVENT);
			this.addOutput("false", LiteGraph.EVENT);
			this.properties = {
				only_on_change: true
			};
			this.prev = 0;
		}

		static title = "TriggerEvent";
		static desc = "Triggers event if input evaluates to true";

		onExecute(param, options) {
			var v = this.getInputData(0);
			var changed = (v != this.prev);
			if (this.prev === 0)
				changed = false;
			var must_resend = (changed && this.properties.only_on_change) || (!changed && !this
				.properties.only_on_change);
			if (v && must_resend)
				this.triggerSlot(0, param, null, options);
			if (!v && must_resend)
				this.triggerSlot(2, param, null, options);
			if (changed)
				this.triggerSlot(1, param, null, options);
			this.prev = v;
		}
	}
	LiteGraph.registerNodeType("events/trigger", TriggerEvent);

	//Sequence of events
	class Sequence {
		constructor() {
			var that = this;
			this.addInput("", LiteGraph.ACTION);
			this.addInput("", LiteGraph.ACTION);
			this.addInput("", LiteGraph.ACTION);
			this.addOutput("", LiteGraph.EVENT);
			this.addOutput("", LiteGraph.EVENT);
			this.addOutput("", LiteGraph.EVENT);
			this.addWidget("button", "+", null, function() {
				that.addInput("", LiteGraph.ACTION);
				that.addOutput("", LiteGraph.EVENT);
			});
			this.size = [90, 70];
			this.flags = {
				horizontal: true,
				render_box: false
			};
		}

		static title = "Sequence";
		static desc = "Triggers a sequence of events when an event arrives";

		getTitle() {
			return "";
		}

		onAction(action, param, options) {
			if (this.outputs) {
				options = options || {};
				for (var i = 0; i < this.outputs.length; ++i) {
					var output = this.outputs[i];
					//needs more info about this...
					if (options.action_call) // CREATE A NEW ID FOR THE ACTION
						options.action_call = options.action_call + "_seq_" + i;
					else
						options.action_call = this.id + "_" + (action ? action : "action") + "_seq_" +
						i + "_" + Math.floor(Math.random() * 9999);
					this.triggerSlot(i, param, null, options);
				}
			}
		}
	}
	LiteGraph.registerNodeType("events/sequence", Sequence);

	//Sequence of events
	class WaitAll {
		constructor() {
			var that = this;
			this.addInput("", LiteGraph.ACTION);
			this.addInput("", LiteGraph.ACTION);
			this.addOutput("", LiteGraph.EVENT);
			this.addWidget("button", "+", null, function() {
				that.addInput("", LiteGraph.ACTION);
				that.size[0] = 90;
			});
			this.size = [90, 70];
			this.ready = [];
		}

		static title = "WaitAll";
		static desc = "Wait until all input events arrive then triggers output";

		getTitle() {
			return "";
		}

		onDrawBackground(ctx) {
			if (this.flags.collapsed) {
				return;
			}
			for (var i = 0; i < this.inputs.length; ++i) {
				var y = i * LiteGraph.NODE_SLOT_HEIGHT + 10;
				ctx.fillStyle = this.ready[i] ? "#AFB" : "#000";
				ctx.fillRect(20, y, 10, 10);
			}
		}

		onAction(action, param, options, slot_index) {
			if (slot_index == null)
				return;

			//check all
			this.ready.length = this.outputs.length;
			this.ready[slot_index] = true;
			for (var i = 0; i < this.ready.length; ++i)
				if (!this.ready[i])
					return;
			//pass
			this.reset();
			this.triggerSlot(0);
		}

		reset() {
			this.ready.length = 0;
		}
	}
	LiteGraph.registerNodeType("events/waitAll", WaitAll);

	//Sequencer for events
	class Stepper {
		constructor() {
			var that = this;
			this.properties = {
				index: 0
			};
			this.addInput("index", "number");
			this.addInput("step", LiteGraph.ACTION);
			this.addInput("reset", LiteGraph.ACTION);
			this.addOutput("index", "number");
			this.addOutput("", LiteGraph.EVENT);
			this.addOutput("", LiteGraph.EVENT);
			this.addOutput("", LiteGraph.EVENT, {
				removable: true
			});
			this.addWidget("button", "+", null, function() {
				that.addOutput("", LiteGraph.EVENT, {
					removable: true
				});
			});
			this.size = [120, 120];
			this.flags = {
				render_box: false
			};
		}

		static title = "Stepper";
		static desc = "Trigger events sequentially when an tick arrives";

		onDrawBackground(ctx) {
			if (this.flags.collapsed) {
				return;
			}
			var index = this.properties.index || 0;
			ctx.fillStyle = "#AFB";
			var w = this.size[0];
			var y = (index + 1) * LiteGraph.NODE_SLOT_HEIGHT + 4;
			ctx.beginPath();
			ctx.moveTo(w - 30, y);
			ctx.lineTo(w - 30, y + LiteGraph.NODE_SLOT_HEIGHT);
			ctx.lineTo(w - 15, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
			ctx.fill();
		}

		onExecute() {
			var index = this.getInputData(0);
			if (index != null) {
				index = Math.floor(index);
				index = clamp(index, 0, this.outputs ? (this.outputs.length - 2) : 0);
				if (index != this.properties.index) {
					this.properties.index = index;
					this.triggerSlot(index + 1);
				}
			}

			this.setOutputData(0, this.properties.index);
		}

		onAction(action, param) {
			if (action == "reset")
				this.properties.index = 0;
			else if (action == "step") {
				this.triggerSlot(this.properties.index + 1, param);
				var n = this.outputs ? this.outputs.length - 1 : 0;
				this.properties.index = (this.properties.index + 1) % n;
			}
		}
	}
	LiteGraph.registerNodeType("events/stepper", Stepper);

	//Filter events
	class FilterEvent {
		constructor() {
			this.size = [60, 30];
			this.addInput("event", LiteGraph.ACTION);
			this.addOutput("event", LiteGraph.EVENT);
			this.properties = {
				equal_to: "",
				has_property: "",
				property_equal_to: ""
			};
		}

		static title = "Filter Event";
		static desc = "Blocks events that do not match the filter";

		onAction(action, param, options) {
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
		}
	}
	LiteGraph.registerNodeType("events/filter", FilterEvent);

	class EventBranch {
		constructor() {
			this.addInput("in", LiteGraph.ACTION);
			this.addInput("cond", "boolean");
			this.addOutput("true", LiteGraph.EVENT);
			this.addOutput("false", LiteGraph.EVENT);
			this.size = [120, 60];
			this._value = false;
		}

		static title = "Branch";
		static desc = "If condition is true, outputs triggers true, otherwise false";

		onExecute() {
			this._value = this.getInputData(1);
		}

		onAction(action, param, options) {
			this._value = this.getInputData(1);
			this.triggerSlot(this._value ? 0 : 1, param, null, options);
		}
	}
	LiteGraph.registerNodeType("events/branch", EventBranch);

	//Show value inside the debug console
	class EventCounter {
		constructor() {
			this.addInput("inc", LiteGraph.ACTION);
			this.addInput("dec", LiteGraph.ACTION);
			this.addInput("reset", LiteGraph.ACTION);
			this.addOutput("change", LiteGraph.EVENT);
			this.addOutput("num", "number");
			this.addProperty("doCountExecution", false, "boolean", {
				name: "Count Executions"
			});
			this.addWidget("toggle", "Count Exec.", this.properties.doCountExecution,
				"doCountExecution");
			this.num = 0;
		}

		static title = "Counter";
		static desc = "Counts events";

		getTitle() {
			if (this.flags.collapsed) {
				return String(this.num);
			}
			return this.title;
		}

		onAction(action, param, options) {
			var v = this.num;
			if (action == "inc") {
				this.num += 1;
			}
			else if (action == "dec") {
				this.num -= 1;
			}
			else if (action == "reset") {
				this.num = 0;
			}
			if (this.num != v) {
				this.trigger("change", this.num);
			}
		}

		onDrawBackground(ctx) {
			if (this.flags.collapsed) {
				return;
			}
			ctx.fillStyle = "#AAA";
			ctx.font = "20px Arial";
			ctx.textAlign = "center";
			ctx.fillText(this.num, this.size[0] * 0.5, this.size[1] * 0.5);
		}

		onExecute() {
			if (this.properties.doCountExecution) {
				this.num += 1;
			}
			this.setOutputData(1, this.num);
		}
	}
	LiteGraph.registerNodeType("events/counter", EventCounter);

	//Show value inside the debug console
	class DelayEvent {
		constructor() {
			this.size = [60, 30];
			this.addProperty("time_in_ms", 1000);
			this.addInput("event", LiteGraph.ACTION);
			this.addOutput("on_time", LiteGraph.EVENT);

			this._pending = [];
		}

		static title = "Delay";
		static desc = "Delays one event";

		onAction(action, param, options) {
			var time = this.properties.time_in_ms;
			if (time <= 0) {
				this.trigger(null, param, options);
			}
			else {
				this._pending.push([time, param]);
			}
		}

		onExecute(param, options) {
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
		}

		onGetInputs() {
			return [
				["event", LiteGraph.ACTION],
				["time_in_ms", "number"]
			];
		}
	}
	LiteGraph.registerNodeType("events/delay", DelayEvent);

	//Show value inside the debug console
	class TimerEvent {
		constructor() {
			this.addProperty("interval", 1000);
			this.addProperty("event", "tick");
			this.addOutput("on_tick", LiteGraph.EVENT);
			this.time = 0;
			this.last_interval = 1000;
			this.triggered = false;
		}

		static title = "Timer";
		static desc = "Sends an event every N milliseconds";

		onStart() {
			this.time = 0;
		}

		getTitle() {
			return "Timer: " + this.last_interval.toString() + "ms";
		}

		static on_color = "#AAA";
		static off_color = "#222";

		onDrawBackground() {
			this.boxcolor = this.triggered ?
				TimerEvent.on_color :
				TimerEvent.off_color;
			this.triggered = false;
		}

		onExecute() {
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
		}

		onGetInputs() {
			return [
				["interval", "number"]
			];
		}

		onGetOutputs() {
			return [
				["tick", "boolean"]
			];
		}
	}
	LiteGraph.registerNodeType("events/timer", TimerEvent);

	class SemaphoreEvent {
		constructor() {
			this.addInput("go", LiteGraph.ACTION);
			this.addInput("green", LiteGraph.ACTION);
			this.addInput("red", LiteGraph.ACTION);
			this.addOutput("continue", LiteGraph.EVENT);
			this.addOutput("blocked", LiteGraph.EVENT);
			this.addOutput("is_green", "boolean");
			this._ready = false;
			this.properties = {};
			var that = this;
			this.addWidget("button", "reset", "", function() {
				that._ready = false;
			});
		}

		static title = "Semaphore Event";
		static desc = "Until both events are not triggered, it doesnt continue.";

		onExecute() {
			this.setOutputData(1, this._ready);
			this.boxcolor = this._ready ? "#9F9" : "#FA5";
		}

		onAction(action, param) {
			if (action == "go")
				this.triggerSlot(this._ready ? 0 : 1);
			else if (action == "green")
				this._ready = true;
			else if (action == "red")
				this._ready = false;
		}
	}
	LiteGraph.registerNodeType("events/semaphore", SemaphoreEvent);

	class OnceEvent {
		constructor() {
			this.addInput("in", LiteGraph.ACTION);
			this.addInput("reset", LiteGraph.ACTION);
			this.addOutput("out", LiteGraph.EVENT);
			this._once = false;
			this.properties = {};
			var that = this;
			this.addWidget("button", "reset", "", function() {
				that._once = false;
			});
		}

		static title = "Once";
		static desc = "Only passes an event once, then gets locked";

		onAction(action, param) {
			if (action == "in" && !this._once) {
				this._once = true;
				this.triggerSlot(0, param);
			}
			else if (action == "reset")
				this._once = false;
		}
	}
	LiteGraph.registerNodeType("events/once", OnceEvent);

	class DataStore {
		constructor() {
			this.addInput("data", 0);
			this.addInput("assign", LiteGraph.ACTION);
			this.addOutput("data", 0);
			this._last_value = null;
			this.properties = {
				data: null,
				serialize: true
			};
			var that = this;
			this.addWidget("button", "store", "", function() {
				that.properties.data = that._last_value;
			});
		}

		static title = "Data Store";
		static desc = "Stores data and only changes when event is received";

		onExecute() {
			this._last_value = this.getInputData(0);
			this.setOutputData(0, this.properties.data);
		}

		onAction(action, param, options) {
			this.properties.data = this._last_value;
		}

		onSerialize(o) {
			if (o.data == null)
				return;
			if (this.properties.serialize == false || (o.data.constructor !== String && o.data
					.constructor !== Number && o.data.constructor !== Boolean && o.data
					.constructor !== Array && o.data.constructor !== Object))
				o.data = null;
		}
	}
	LiteGraph.registerNodeType("basic/data_store", DataStore);

})(this);
