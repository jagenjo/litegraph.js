(function(global) {
	var LiteGraph = global.LiteGraph;

	var MIDI_COLOR = "#243";

	class MIDIEvent {
		constructor(data) {
			this.channel = 0;
			this.cmd = 0;
			this.data = new Uint32Array(3);

			if (data) {
				this.setup(data);
			}
		}

		fromJSON(o) {
			this.setup(o.data);
		}

		setup(data) {
			var raw_data = data;
			if (data.constructor === Object) {
				raw_data = data.data;
			}

			this.data.set(raw_data);

			var midiStatus = raw_data[0];
			this.status = midiStatus;

			var midiCommand = midiStatus & 0xf0;

			if (midiStatus >= 0xf0) {
				this.cmd = midiStatus;
			}
			else {
				this.cmd = midiCommand;
			}

			if (this.cmd == MIDIEvent.NOTEON && this.velocity == 0) {
				this.cmd = MIDIEvent.NOTEOFF;
			}

			this.cmd_str = MIDIEvent.commands[this.cmd] || "";

			if (
				midiCommand >= MIDIEvent.NOTEON ||
				midiCommand <= MIDIEvent.NOTEOFF
			) {
				this.channel = midiStatus & 0x0f;
			}
		}

		get velocity() {
			if (this.cmd == MIDIEvent.NOTEON) {
				return this.data[2];
			}
			return -1;
		}
		set velocity(v) {
			this.data[2] = v; //  v / 127;
		}

		static notes = [
			"A",
			"A#",
			"B",
			"C",
			"C#",
			"D",
			"D#",
			"E",
			"F",
			"F#",
			"G",
			"G#"
		];
		static note_to_index = {
			A: 0,
			"A#": 1,
			B: 2,
			C: 3,
			"C#": 4,
			D: 5,
			"D#": 6,
			E: 7,
			F: 8,
			"F#": 9,
			G: 10,
			"G#": 11
		};

		get note() {
			if (this.cmd != MIDIEvent.NOTEON) {
				return -1;
			}
			return MIDIEvent.toNoteString(this.data[1], true);
		}
		set note(v) {
			throw "notes cannot be assigned this way, must modify the data[1]";
		}

		get octave() {
			if (this.cmd != MIDIEvent.NOTEON) {
				return -1;
			}
			var octave = this.data[1] - 24;
			return Math.floor(octave / 12 + 1);
		}
		set octave(v) {
			throw "octave cannot be assigned this way, must modify the data[1]";
		}

		//returns HZs
		getPitch() {
			return Math.pow(2, (this.data[1] - 69) / 12) * 440;
		}

		static computePitch(note) {
			return Math.pow(2, (note - 69) / 12) * 440;
		}

		getCC() {
			return this.data[1];
		}

		getCCValue() {
			return this.data[2];
		}

		//not tested, there is a formula missing here
		getPitchBend() {
			return this.data[1] + (this.data[2] << 7) - 8192;
		}

		static computePitchBend(v1, v2) {
			return v1 + (v2 << 7) - 8192;
		}

		setCommandFromString(str) {
			this.cmd = MIDIEvent.computeCommandFromString(str);
		}

		static computeCommandFromString(str) {
			if (!str) {
				return 0;
			}

			if (str && str.constructor === Number) {
				return str;
			}

			str = str.toUpperCase();
			switch (str) {
				case "NOTE ON":
				case "NOTEON":
					return MIDIEvent.NOTEON;
					break;
				case "NOTE OFF":
				case "NOTEOFF":
					return MIDIEvent.NOTEON;
					break;
				case "KEY PRESSURE":
				case "KEYPRESSURE":
					return MIDIEvent.KEYPRESSURE;
					break;
				case "CONTROLLER CHANGE":
				case "CONTROLLERCHANGE":
				case "CC":
					return MIDIEvent.CONTROLLERCHANGE;
					break;
				case "PROGRAM CHANGE":
				case "PROGRAMCHANGE":
				case "PC":
					return MIDIEvent.PROGRAMCHANGE;
					break;
				case "CHANNEL PRESSURE":
				case "CHANNELPRESSURE":
					return MIDIEvent.CHANNELPRESSURE;
					break;
				case "PITCH BEND":
				case "PITCHBEND":
					return MIDIEvent.PITCHBEND;
					break;
				case "TIME TICK":
				case "TIMETICK":
					return MIDIEvent.TIMETICK;
					break;
				default:
					return Number(str); //assume its a hex code
			}
		}

		//transform from a pitch number to string like "C4"
		static toNoteString(d, skip_octave) {
			d = Math.round(d); //in case it has decimals
			var note = d - 21;
			var octave = Math.floor((d - 24) / 12 + 1);
			note = note % 12;
			if (note < 0) {
				note = 12 + note;
			}
			return MIDIEvent.notes[note] + (skip_octave ? "" : octave);
		}

		static NoteStringToPitch(str) {
			str = str.toUpperCase();
			var note = str[0];
			var octave = 4;

			if (str[1] == "#") {
				note += "#";
				if (str.length > 2) {
					octave = Number(str[2]);
				}
			}
			else {
				if (str.length > 1) {
					octave = Number(str[1]);
				}
			}
			var pitch = MIDIEvent.note_to_index[note];
			if (pitch == null) {
				return null;
			}
			return (octave - 1) * 12 + pitch + 21;
		}

		toString() {
			var str = "" + this.channel + ". ";
			switch (this.cmd) {
				case MIDIEvent.NOTEON:
					str += "NOTEON " + MIDIEvent.toNoteString(this.data[1]);
					break;
				case MIDIEvent.NOTEOFF:
					str += "NOTEOFF " + MIDIEvent.toNoteString(this.data[1]);
					break;
				case MIDIEvent.CONTROLLERCHANGE:
					str += "CC " + this.data[1] + " " + this.data[2];
					break;
				case MIDIEvent.PROGRAMCHANGE:
					str += "PC " + this.data[1];
					break;
				case MIDIEvent.PITCHBEND:
					str += "PITCHBEND " + this.getPitchBend();
					break;
				case MIDIEvent.KEYPRESSURE:
					str += "KEYPRESS " + this.data[1];
					break;
			}

			return str;
		}

		toHexString() {
			var str = "";
			for (var i = 0; i < this.data.length; i++) {
				str += this.data[i].toString(16) + " ";
			}
		}

		toJSON() {
			return {
				data: [this.data[0], this.data[1], this.data[2]],
				object_class: "MIDIEvent"
			};
		}

		static NOTEOFF = 0x80;
		static NOTEON = 0x90;
		static KEYPRESSURE = 0xa0;
		static CONTROLLERCHANGE = 0xb0;
		static PROGRAMCHANGE = 0xc0;
		static CHANNELPRESSURE = 0xd0;
		static PITCHBEND = 0xe0;
		static TIMETICK = 0xf8;

		static commands = {
			0x80: "note off",
			0x90: "note on",
			0xa0: "key pressure",
			0xb0: "controller change",
			0xc0: "program change",
			0xd0: "channel pressure",
			0xe0: "pitch bend",
			0xf0: "system",
			0xf2: "Song pos",
			0xf3: "Song select",
			0xf6: "Tune request",
			0xf8: "time tick",
			0xfa: "Start Song",
			0xfb: "Continue Song",
			0xfc: "Stop Song",
			0xfe: "Sensing",
			0xff: "Reset"
		};

		static commands_short = {
			0x80: "NOTEOFF",
			0x90: "NOTEOFF",
			0xa0: "KEYP",
			0xb0: "CC",
			0xc0: "PC",
			0xd0: "CP",
			0xe0: "PB",
			0xf0: "SYS",
			0xf2: "POS",
			0xf3: "SELECT",
			0xf6: "TUNEREQ",
			0xf8: "TT",
			0xfa: "START",
			0xfb: "CONTINUE",
			0xfc: "STOP",
			0xfe: "SENS",
			0xff: "RESET"
		};

		static commands_reversed = {};
	}

	for (var i in MIDIEvent.commands) {
		MIDIEvent.commands_reversed[MIDIEvent.commands[i]] = i;
	}

	LiteGraph.MIDIEvent = MIDIEvent;

	//MIDI wrapper, instantiate by MIDIIn and MIDIOut
	class MIDIInterface {
		constructor(on_ready, on_error) {
			if (!navigator.requestMIDIAccess) {
				this.error = "not suppoorted";
				if (on_error) {
					on_error("Not supported");
				}
				else {
					console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
				}
				return;
			}

			this.on_ready = on_ready;

			this.state = {
				note: [],
				cc: []
			};

			this.input_ports = null;
			this.input_ports_info = [];
			this.output_ports = null;
			this.output_ports_info = [];

			navigator.requestMIDIAccess().then(this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(
				this));
		}

		static input = null;
		static MIDIEvent = MIDIEvent;

		onMIDISuccess(midiAccess) {
			console.log("MIDI ready!");
			console.log(midiAccess);
			this.midi =
			midiAccess; // store in the global (in real usage, would probably keep in an object instance)
			this.updatePorts();

			if (this.on_ready) {
				this.on_ready(this);
			}
		}

		updatePorts() {
			var midi = this.midi;
			this.input_ports = midi.inputs;
			this.input_ports_info = [];
			this.output_ports = midi.outputs;
			this.output_ports_info = [];

			var num = 0;

			var it = this.input_ports.values();
			var it_value = it.next();
			while (it_value && it_value.done === false) {
				var port_info = it_value.value;
				this.input_ports_info.push(port_info);
				console.log("Input port [type:'" + port_info.type + "'] id:'" + port_info.id +
					"' manufacturer:'" + port_info.manufacturer + "' name:'" + port_info.name +
					"' version:'" + port_info.version + "'");
				num++;
				it_value = it.next();
			}
			this.num_input_ports = num;

			num = 0;
			var it = this.output_ports.values();
			var it_value = it.next();
			while (it_value && it_value.done === false) {
				var port_info = it_value.value;
				this.output_ports_info.push(port_info);
				console.log("Output port [type:'" + port_info.type + "'] id:'" + port_info.id +
					"' manufacturer:'" + port_info.manufacturer + "' name:'" + port_info.name +
					"' version:'" + port_info.version + "'");
				num++;
				it_value = it.next();
			}
			this.num_output_ports = num;
		}

		onMIDIFailure(msg) {
			console.error("Failed to get MIDI access - " + msg);
		}

		openInputPort(port, callback) {
			var input_port = this.input_ports.get("input-" + port);
			if (!input_port) {
				return false;
			}
			MIDIInterface.input = this;
			var that = this;

			input_port.onmidimessage = function(a) {
				var midi_event = new MIDIEvent(a.data);
				that.updateState(midi_event);
				if (callback) {
					callback(a.data, midi_event);
				}
				if (MIDIInterface.on_message) {
					MIDIInterface.on_message(a.data, midi_event);
				}
			};
			console.log("port open: ", input_port);
			return true;
		}

		static parseMsg(data) {}

		updateState(midi_event) {
			switch (midi_event.cmd) {
				case MIDIEvent.NOTEON:
					this.state.note[midi_event.value1 | 0] = midi_event.value2;
					break;
				case MIDIEvent.NOTEOFF:
					this.state.note[midi_event.value1 | 0] = 0;
					break;
				case MIDIEvent.CONTROLLERCHANGE:
					this.state.cc[midi_event.getCC()] = midi_event.getCCValue();
					break;
			}
		}

		sendMIDI(port, midi_data) {
			if (!midi_data) {
				return;
			}

			var output_port = this.output_ports_info[port]; //this.output_ports.get("output-" + port);
			if (!output_port) {
				return;
			}

			MIDIInterface.output = this;

			if (midi_data.constructor === MIDIEvent) {
				output_port.send(midi_data.data);
			}
			else {
				output_port.send(midi_data);
			}
		}
	}

	class LGMIDIIn {
		constructor() {
			this.addOutput("on_midi", LiteGraph.EVENT);
			this.addOutput("out", "midi");
			this.properties = {
				port: 0
			};
			this._last_midi_event = null;
			this._current_midi_event = null;
			this.boxcolor = "#AAA";
			this._last_time = 0;

			var that = this;
			new MIDIInterface(function(midi) {
				//open
				that._midi = midi;
				if (that._waiting) {
					that.onStart();
				}
				that._waiting = false;
			});
		}

		static MIDIInterface = MIDIInterface;

		static title = "MIDI Input";
		static desc = "Reads MIDI from a input port";
		static color = MIDI_COLOR;

		getPropertyInfo(name) {
			if (!this._midi) {
				return;
			}

			if (name == "port") {
				var values = {};
				for (var i = 0; i < this._midi.input_ports_info.length; ++i) {
					var input = this._midi.input_ports_info[i];
					values[i] = i + ".- " + input.name + " version:" + input.version;
				}
				return {
					type: "enum",
					values: values
				};
			}
		}

		onStart() {
			if (this._midi) {
				this._midi.openInputPort(
					this.properties.port,
					this.onMIDIEvent.bind(this)
				);
			}
			else {
				this._waiting = true;
			}
		}

		onMIDIEvent(data, midi_event) {
			this._last_midi_event = midi_event;
			this.boxcolor = "#AFA";
			this._last_time = LiteGraph.getTime();
			this.trigger("on_midi", midi_event);
			if (midi_event.cmd == MIDIEvent.NOTEON) {
				this.trigger("on_noteon", midi_event);
			}
			else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
				this.trigger("on_noteoff", midi_event);
			}
			else if (midi_event.cmd == MIDIEvent.CONTROLLERCHANGE) {
				this.trigger("on_cc", midi_event);
			}
			else if (midi_event.cmd == MIDIEvent.PROGRAMCHANGE) {
				this.trigger("on_pc", midi_event);
			}
			else if (midi_event.cmd == MIDIEvent.PITCHBEND) {
				this.trigger("on_pitchbend", midi_event);
			}
		}

		onDrawBackground(ctx) {
			this.boxcolor = "#AAA";
			if (!this.flags.collapsed && this._last_midi_event) {
				ctx.fillStyle = "white";
				var now = LiteGraph.getTime();
				var f = 1.0 - Math.max(0, (now - this._last_time) * 0.001);
				if (f > 0) {
					var t = ctx.globalAlpha;
					ctx.globalAlpha *= f;
					ctx.font = "12px Tahoma";
					ctx.fillText(
						this._last_midi_event.toString(),
						2,
						this.size[1] * 0.5 + 3
					);
					//ctx.fillRect(0,0,this.size[0],this.size[1]);
					ctx.globalAlpha = t;
				}
			}
		}

		onExecute() {
			if (this.outputs) {
				var last = this._last_midi_event;
				for (var i = 0; i < this.outputs.length; ++i) {
					var output = this.outputs[i];
					var v = null;
					switch (output.name) {
						case "midi":
							v = this._midi;
							break;
						case "last_midi":
							v = last;
							break;
						default:
							continue;
					}
					this.setOutputData(i, v);
				}
			}
		}

		onGetOutputs() {
			return [
				["last_midi", "midi"],
				["on_midi", LiteGraph.EVENT],
				["on_noteon", LiteGraph.EVENT],
				["on_noteoff", LiteGraph.EVENT],
				["on_cc", LiteGraph.EVENT],
				["on_pc", LiteGraph.EVENT],
				["on_pitchbend", LiteGraph.EVENT]
			];
		}
	}
	LiteGraph.registerNodeType("midi/input", LGMIDIIn);

	class LGMIDIOut {
		constructor() {
			this.addInput("send", LiteGraph.EVENT);
			this.properties = {
				port: 0
			};

			var that = this;
			new MIDIInterface(function(midi) {
				that._midi = midi;
				that.widget.options.values = that.getMIDIOutputs();
			});
			this.widget = this.addWidget("combo", "Device", this.properties.port, {
				property: "port",
				values: this.getMIDIOutputs.bind(this)
			});
			this.size = [340, 60];
		}

		static MIDIInterface = MIDIInterface;

		static title = "MIDI Output";
		static desc = "Sends MIDI to output channel";
		static color = MIDI_COLOR;

		onGetPropertyInfo(name) {
			if (!this._midi) {
				return;
			}

			if (name == "port") {
				var values = this.getMIDIOutputs();
				return {
					type: "enum",
					values: values
				};
			}
		}
		static default_ports = {
			0: "unknown"
		};

		getMIDIOutputs() {
			var values = {};
			if (!this._midi)
				return LGMIDIOut.default_ports;
			if (this._midi.output_ports_info)
				for (var i = 0; i < this._midi.output_ports_info.length; ++i) {
					var output = this._midi.output_ports_info[i];
					if (!output)
						continue;
					var name = i + ".- " + output.name + " version:" + output.version;
					values[i] = name;
				}
			return values;
		}

		onAction(event, midi_event) {
			//console.log(midi_event);
			if (!this._midi) {
				return;
			}
			if (event == "send") {
				this._midi.sendMIDI(this.properties.port, midi_event);
			}
			this.trigger("midi", midi_event);
		}

		onGetInputs() {
			return [
				["send", LiteGraph.ACTION]
			];
		}

		onGetOutputs() {
			return [
				["on_midi", LiteGraph.EVENT]
			];
		}
	}
	LiteGraph.registerNodeType("midi/output", LGMIDIOut);

	class LGMIDIShow {
		constructor() {
			this.addInput("on_midi", LiteGraph.EVENT);
			this._str = "";
			this.size = [200, 40];
		}

		static title = "MIDI Show";
		static desc = "Shows MIDI in the graph";
		static color = MIDI_COLOR;

		getTitle() {
			if (this.flags.collapsed) {
				return this._str;
			}
			return this.title;
		}

		onAction(event, midi_event) {
			if (!midi_event) {
				return;
			}
			if (midi_event.constructor === MIDIEvent) {
				this._str = midi_event.toString();
			}
			else {
				this._str = "???";
			}
		}

		onDrawForeground(ctx) {
			if (!this._str || this.flags.collapsed) {
				return;
			}

			ctx.font = "30px Arial";
			ctx.fillText(this._str, 10, this.size[1] * 0.8);
		}

		onGetInputs() {
			return [
				["in", LiteGraph.ACTION]
			];
		}

		onGetOutputs() {
			return [
				["on_midi", LiteGraph.EVENT]
			];
		}
	}
	LiteGraph.registerNodeType("midi/show", LGMIDIShow);

	class LGMIDIFilter {
		constructor() {
			this.properties = {
				channel: -1,
				cmd: -1,
				min_value: -1,
				max_value: -1
			};

			var that = this;
			this._learning = false;
			this.addWidget("button", "Learn", "", function() {
				that._learning = true;
				that.boxcolor = "#FA3";
			});

			this.addInput("in", LiteGraph.EVENT);
			this.addOutput("on_midi", LiteGraph.EVENT);
			this.boxcolor = "#AAA";
		}

		static title = "MIDI Filter";
		static desc = "Filters MIDI messages";
		static color = MIDI_COLOR;

		static "@cmd" = {
			type: "enum",
			title: "Command",
			values: MIDIEvent.commands_reversed
		};

		getTitle() {
			var str = null;
			if (this.properties.cmd == -1) {
				str = "Nothing";
			}
			else {
				str = MIDIEvent.commands_short[this.properties.cmd] || "Unknown";
			}

			if (
				this.properties.min_value != -1 &&
				this.properties.max_value != -1
			) {
				str +=
					" " +
					(this.properties.min_value == this.properties.max_value ?
						this.properties.max_value :
						this.properties.min_value +
						".." +
						this.properties.max_value);
			}

			return "Filter: " + str;
		}

		onPropertyChanged(name, value) {
			if (name == "cmd") {
				var num = Number(value);
				if (isNaN(num)) {
					num = MIDIEvent.commands[value] || 0;
				}
				this.properties.cmd = num;
			}
		}

		onAction(event, midi_event) {
			if (!midi_event || midi_event.constructor !== MIDIEvent) {
				return;
			}

			if (this._learning) {
				this._learning = false;
				this.boxcolor = "#AAA";
				this.properties.channel = midi_event.channel;
				this.properties.cmd = midi_event.cmd;
				this.properties.min_value = this.properties.max_value =
					midi_event.data[1];
			}
			else {
				if (
					this.properties.channel != -1 &&
					midi_event.channel != this.properties.channel
				) {
					return;
				}
				if (
					this.properties.cmd != -1 &&
					midi_event.cmd != this.properties.cmd
				) {
					return;
				}
				if (
					this.properties.min_value != -1 &&
					midi_event.data[1] < this.properties.min_value
				) {
					return;
				}
				if (
					this.properties.max_value != -1 &&
					midi_event.data[1] > this.properties.max_value
				) {
					return;
				}
			}

			this.trigger("on_midi", midi_event);
		}
	}
	LiteGraph.registerNodeType("midi/filter", LGMIDIFilter);

	class LGMIDIEvent {
		constructor() {
			this.properties = {
				channel: 0,
				cmd: 144, //0x90
				value1: 1,
				value2: 1
			};

			this.addInput("send", LiteGraph.EVENT);
			this.addInput("assign", LiteGraph.EVENT);
			this.addOutput("on_midi", LiteGraph.EVENT);

			this.midi_event = new MIDIEvent();
			this.gate = false;
		}

		static title = "MIDIEvent";
		static desc = "Create a MIDI Event";
		static color = MIDI_COLOR;

		onAction(event, midi_event) {
			if (event == "assign") {
				this.properties.channel = midi_event.channel;
				this.properties.cmd = midi_event.cmd;
				this.properties.value1 = midi_event.data[1];
				this.properties.value2 = midi_event.data[2];
				if (midi_event.cmd == MIDIEvent.NOTEON) {
					this.gate = true;
				}
				else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
					this.gate = false;
				}
				return;
			}

			//send
			var midi_event = this.midi_event;
			midi_event.channel = this.properties.channel;
			if (this.properties.cmd && this.properties.cmd.constructor === String) {
				midi_event.setCommandFromString(this.properties.cmd);
			}
			else {
				midi_event.cmd = this.properties.cmd;
			}
			midi_event.data[0] = midi_event.cmd | midi_event.channel;
			midi_event.data[1] = Number(this.properties.value1);
			midi_event.data[2] = Number(this.properties.value2);

			this.trigger("on_midi", midi_event);
		}

		onExecute() {
			var props = this.properties;

			if (this.inputs) {
				for (var i = 0; i < this.inputs.length; ++i) {
					var input = this.inputs[i];
					if (input.link == -1) {
						continue;
					}
					switch (input.name) {
						case "note":
							var v = this.getInputData(i);
							if (v != null) {
								if (v.constructor === String) {
									v = MIDIEvent.NoteStringToPitch(v);
								}
								this.properties.value1 = (v | 0) % 255;
							}
							break;
						case "cmd":
							var v = this.getInputData(i);
							if (v != null) {
								this.properties.cmd = v;
							}
							break;
						case "value1":
							var v = this.getInputData(i);
							if (v != null) {
								this.properties.value1 = clamp(v | 0, 0, 127);
							}
							break;
						case "value2":
							var v = this.getInputData(i);
							if (v != null) {
								this.properties.value2 = clamp(v | 0, 0, 127);
							}
							break;
					}
				}
			}

			if (this.outputs) {
				for (var i = 0; i < this.outputs.length; ++i) {
					var output = this.outputs[i];
					var v = null;
					switch (output.name) {
						case "midi":
							v = new MIDIEvent();
							v.setup([props.cmd, props.value1, props.value2]);
							v.channel = props.channel;
							break;
						case "command":
							v = props.cmd;
							break;
						case "cc":
							v = props.value1;
							break;
						case "cc_value":
							v = props.value2;
							break;
						case "note":
							v =
								props.cmd == MIDIEvent.NOTEON ||
								props.cmd == MIDIEvent.NOTEOFF ?
								props.value1 :
								null;
							break;
						case "velocity":
							v = props.cmd == MIDIEvent.NOTEON ? props.value2 : null;
							break;
						case "pitch":
							v =
								props.cmd == MIDIEvent.NOTEON ?
								MIDIEvent.computePitch(props.value1) :
								null;
							break;
						case "pitchbend":
							v =
								props.cmd == MIDIEvent.PITCHBEND ?
								MIDIEvent.computePitchBend(
									props.value1,
									props.value2
								) :
								null;
							break;
						case "gate":
							v = this.gate;
							break;
						default:
							continue;
					}
					if (v !== null) {
						this.setOutputData(i, v);
					}
				}
			}
		}

		onPropertyChanged(name, value) {
			if (name == "cmd") {
				this.properties.cmd = MIDIEvent.computeCommandFromString(value);
			}
		}

		onGetInputs() {
			return [
				["cmd", "number"],
				["note", "number"],
				["value1", "number"],
				["value2", "number"]
			];
		}

		onGetOutputs() {
			return [
				["midi", "midi"],
				["on_midi", LiteGraph.EVENT],
				["command", "number"],
				["note", "number"],
				["velocity", "number"],
				["cc", "number"],
				["cc_value", "number"],
				["pitch", "number"],
				["gate", "bool"],
				["pitchbend", "number"]
			];
		}
	}
	LiteGraph.registerNodeType("midi/event", LGMIDIEvent);

	class LGMIDICC {
		constructor() {
			this.properties = {
				//		channel: 0,
				cc: 1,
				value: 0
			};

			this.addOutput("value", "number");
		}

		static title = "MIDICC";
		static desc = "gets a Controller Change";
		static color = MIDI_COLOR;

		onExecute() {
			var props = this.properties;
			if (MIDIInterface.input) {
				this.properties.value =
					MIDIInterface.input.state.cc[this.properties.cc];
			}
			this.setOutputData(0, this.properties.value);
		}
	}
	LiteGraph.registerNodeType("midi/cc", LGMIDICC);

	class LGMIDIGenerator {
		constructor() {
			this.addInput("generate", LiteGraph.ACTION);
			this.addInput("scale", "string");
			this.addInput("octave", "number");
			this.addOutput("note", LiteGraph.EVENT);
			this.properties = {
				notes: "A,A#,B,C,C#,D,D#,E,F,F#,G,G#",
				octave: 2,
				duration: 0.5,
				mode: "sequence"
			};

			this.notes_pitches = LGMIDIGenerator.processScale(
				this.properties.notes
			);
			this.sequence_index = 0;
		}

		static title = "MIDI Generator";
		static desc = "Generates a random MIDI note";
		static color = MIDI_COLOR;

		static processScale(scale) {
			var notes = scale.split(",");
			for (var i = 0; i < notes.length; ++i) {
				var n = notes[i];
				if ((n.length == 2 && n[1] != "#") || n.length > 2) {
					notes[i] = -LiteGraph.MIDIEvent.NoteStringToPitch(n);
				}
				else {
					notes[i] = MIDIEvent.note_to_index[n] || 0;
				}
			}
			return notes;
		}

		onPropertyChanged(name, value) {
			if (name == "notes") {
				this.notes_pitches = LGMIDIGenerator.processScale(value);
			}
		}

		onExecute() {
			var octave = this.getInputData(2);
			if (octave != null) {
				this.properties.octave = octave;
			}

			var scale = this.getInputData(1);
			if (scale) {
				this.notes_pitches = LGMIDIGenerator.processScale(scale);
			}
		}

		onAction(event, midi_event) {
			//var range = this.properties.max - this.properties.min;
			//var pitch = this.properties.min + ((Math.random() * range)|0);
			var pitch = 0;
			var range = this.notes_pitches.length;
			var index = 0;

			if (this.properties.mode == "sequence") {
				index = this.sequence_index = (this.sequence_index + 1) % range;
			}
			else if (this.properties.mode == "random") {
				index = Math.floor(Math.random() * range);
			}

			var note = this.notes_pitches[index];
			if (note >= 0) {
				pitch = note + (this.properties.octave - 1) * 12 + 33;
			}
			else {
				pitch = -note;
			}

			var midi_event = new MIDIEvent();
			midi_event.setup([MIDIEvent.NOTEON, pitch, 10]);
			var duration = this.properties.duration || 1;
			this.trigger("note", midi_event);

			//noteoff
			setTimeout(
				function() {
					var midi_event = new MIDIEvent();
					midi_event.setup([MIDIEvent.NOTEOFF, pitch, 0]);
					this.trigger("note", midi_event);
				}.bind(this),
				duration * 1000
			);
		}
	}
	LiteGraph.registerNodeType("midi/generator", LGMIDIGenerator);

	class LGMIDITranspose {
		constructor() {
			this.properties = {
				amount: 0
			};
			this.addInput("in", LiteGraph.ACTION);
			this.addInput("amount", "number");
			this.addOutput("out", LiteGraph.EVENT);

			this.midi_event = new MIDIEvent();
		}

		static title = "MIDI Transpose";
		static desc = "Transpose a MIDI note";
		static color = MIDI_COLOR;

		onAction(event, midi_event) {
			if (!midi_event || midi_event.constructor !== MIDIEvent) {
				return;
			}

			if (
				midi_event.data[0] == MIDIEvent.NOTEON ||
				midi_event.data[0] == MIDIEvent.NOTEOFF
			) {
				this.midi_event = new MIDIEvent();
				this.midi_event.setup(midi_event.data);
				this.midi_event.data[1] = Math.round(
					this.midi_event.data[1] + this.properties.amount
				);
				this.trigger("out", this.midi_event);
			}
			else {
				this.trigger("out", midi_event);
			}
		}

		onExecute() {
			var amount = this.getInputData(1);
			if (amount != null) {
				this.properties.amount = amount;
			}
		}
	}
	LiteGraph.registerNodeType("midi/transpose", LGMIDITranspose);

	class LGMIDIQuantize {
		constructor() {
			this.properties = {
				scale: "A,A#,B,C,C#,D,D#,E,F,F#,G,G#"
			};
			this.addInput("note", LiteGraph.ACTION);
			this.addInput("scale", "string");
			this.addOutput("out", LiteGraph.EVENT);

			this.valid_notes = new Array(12);
			this.offset_notes = new Array(12);
			this.processScale(this.properties.scale);
		}

		static title = "MIDI Quantize Pitch";
		static desc = "Transpose a MIDI note tp fit an scale";
		static color = MIDI_COLOR;

		onPropertyChanged(name, value) {
			if (name == "scale") {
				this.processScale(value);
			}
		}

		processScale(scale) {
			this._current_scale = scale;
			this.notes_pitches = LGMIDIGenerator.processScale(scale);
			for (var i = 0; i < 12; ++i) {
				this.valid_notes[i] = this.notes_pitches.indexOf(i) != -1;
			}
			for (var i = 0; i < 12; ++i) {
				if (this.valid_notes[i]) {
					this.offset_notes[i] = 0;
					continue;
				}
				for (var j = 1; j < 12; ++j) {
					if (this.valid_notes[(i - j) % 12]) {
						this.offset_notes[i] = -j;
						break;
					}
					if (this.valid_notes[(i + j) % 12]) {
						this.offset_notes[i] = j;
						break;
					}
				}
			}
		}

		onAction(event, midi_event) {
			if (!midi_event || midi_event.constructor !== MIDIEvent) {
				return;
			}

			if (
				midi_event.data[0] == MIDIEvent.NOTEON ||
				midi_event.data[0] == MIDIEvent.NOTEOFF
			) {
				this.midi_event = new MIDIEvent();
				this.midi_event.setup(midi_event.data);
				var note = midi_event.note;
				var index = MIDIEvent.note_to_index[note];
				var offset = this.offset_notes[index];
				this.midi_event.data[1] += offset;
				this.trigger("out", this.midi_event);
			}
			else {
				this.trigger("out", midi_event);
			}
		}

		onExecute() {
			var scale = this.getInputData(1);
			if (scale != null && scale != this._current_scale) {
				this.processScale(scale);
			}
		}
	}
	LiteGraph.registerNodeType("midi/quantize", LGMIDIQuantize);

	class LGMIDIFromFile {
		constructor() {
			this.properties = {
				url: "",
				autoplay: true
			};

			this.addInput("play", LiteGraph.ACTION);
			this.addInput("pause", LiteGraph.ACTION);
			this.addOutput("note", LiteGraph.EVENT);
			this._midi = null;
			this._current_time = 0;
			this._playing = false;

			if (typeof MidiParser == "undefined") {
				console.error(
					"midi-parser.js not included, LGMidiPlay requires that library: https://raw.githubusercontent.com/colxi/midi-parser-js/master/src/main.js"
				);
				this.boxcolor = "red";
			}

		}

		static title = "MIDI fromFile";
		static desc = "Plays a MIDI file";
		static color = MIDI_COLOR;

		onAction(name) {
			if (name == "play")
				this.play();
			else if (name == "pause")
				this._playing = !this._playing;
		}

		onPropertyChanged(name, value) {
			if (name == "url")
				this.loadMIDIFile(value);
		}

		onExecute() {
			if (!this._midi)
				return;

			if (!this._playing)
				return;

			this._current_time += this.graph.elapsed_time;
			var current_time = this._current_time * 100;

			for (var i = 0; i < this._midi.tracks; ++i) {
				var track = this._midi.track[i];
				if (!track._last_pos) {
					track._last_pos = 0;
					track._time = 0;
				}

				var elem = track.event[track._last_pos];
				if (elem && (track._time + elem.deltaTime) <= current_time) {
					track._last_pos++;
					track._time += elem.deltaTime;

					if (elem.data) {
						var midi_cmd = elem.type << 4 + elem.channel;
						var midi_event = new MIDIEvent();
						midi_event.setup([midi_cmd, elem.data[0], elem.data[1]]);
						this.trigger("note", midi_event);
					}
				}

			}
		}

		play() {
			this._playing = true;
			this._current_time = 0;
			if (!this._midi)
				return;

			for (var i = 0; i < this._midi.tracks; ++i) {
				var track = this._midi.track[i];
				track._last_pos = 0;
				track._time = 0;
			}
		}

		loadMIDIFile(url) {
			var that = this;
			LiteGraph.fetchFile(url, "arraybuffer", function(data) {
				that.boxcolor = "#AFA";
				that._midi = MidiParser.parse(new Uint8Array(data));
				if (that.properties.autoplay)
					that.play();
			}, function(err) {
				that.boxcolor = "#FAA";
				that._midi = null;
			});
		}

		onDropFile(file) {
			this.properties.url = "";
			this.loadMIDIFile(file);
		}
	}
	LiteGraph.registerNodeType("midi/fromFile", LGMIDIFromFile);

	class LGMIDIPlay {
		constructor() {
			this.properties = {
				volume: 0.5,
				duration: 1
			};
			this.addInput("note", LiteGraph.ACTION);
			this.addInput("volume", "number");
			this.addInput("duration", "number");
			this.addOutput("note", LiteGraph.EVENT);

			if (typeof AudioSynth == "undefined") {
				console.error(
					"Audiosynth.js not included, LGMidiPlay requires that library"
				);
				this.boxcolor = "red";
			}
			else {
				var Synth = (this.synth = new AudioSynth());
				this.instrument = Synth.createInstrument("piano");
			}
		}

		static title = "MIDI Play";
		static desc = "Plays a MIDI note";
		static color = MIDI_COLOR;

		onAction(event, midi_event) {
			if (!midi_event || midi_event.constructor !== MIDIEvent) {
				return;
			}

			if (this.instrument && midi_event.data[0] == MIDIEvent.NOTEON) {
				var note = midi_event.note; //C#
				if (!note || note == "undefined" || note.constructor !== String) {
					return;
				}
				this.instrument.play(
					note,
					midi_event.octave,
					this.properties.duration,
					this.properties.volume
				);
			}
			this.trigger("note", midi_event);
		}

		onExecute() {
			var volume = this.getInputData(1);
			if (volume != null) {
				this.properties.volume = volume;
			}

			var duration = this.getInputData(2);
			if (duration != null) {
				this.properties.duration = duration;
			}
		}
	}
	LiteGraph.registerNodeType("midi/play", LGMIDIPlay);

	class LGMIDIKeys {
		constructor() {
			this.properties = {
				num_octaves: 2,
				start_octave: 2
			};
			this.addInput("note", LiteGraph.ACTION);
			this.addInput("reset", LiteGraph.ACTION);
			this.addOutput("note", LiteGraph.EVENT);
			this.size = [400, 100];
			this.keys = [];
			this._last_key = -1;
		}

		static title = "MIDI Keys";
		static desc = "Keyboard to play notes";
		static color = MIDI_COLOR;

		static keys = [{
				x: 0,
				w: 1,
				h: 1,
				t: 0
			},
			{
				x: 0.75,
				w: 0.5,
				h: 0.6,
				t: 1
			},
			{
				x: 1,
				w: 1,
				h: 1,
				t: 0
			},
			{
				x: 1.75,
				w: 0.5,
				h: 0.6,
				t: 1
			},
			{
				x: 2,
				w: 1,
				h: 1,
				t: 0
			},
			{
				x: 2.75,
				w: 0.5,
				h: 0.6,
				t: 1
			},
			{
				x: 3,
				w: 1,
				h: 1,
				t: 0
			},
			{
				x: 4,
				w: 1,
				h: 1,
				t: 0
			},
			{
				x: 4.75,
				w: 0.5,
				h: 0.6,
				t: 1
			},
			{
				x: 5,
				w: 1,
				h: 1,
				t: 0
			},
			{
				x: 5.75,
				w: 0.5,
				h: 0.6,
				t: 1
			},
			{
				x: 6,
				w: 1,
				h: 1,
				t: 0
			}
		];

		onDrawForeground(ctx) {
			if (this.flags.collapsed) {
				return;
			}

			var num_keys = this.properties.num_octaves * 12;
			this.keys.length = num_keys;
			var key_width = this.size[0] / (this.properties.num_octaves * 7);
			var key_height = this.size[1];

			ctx.globalAlpha = 1;

			for (
				var k = 0; k < 2; k++ //draw first whites (0) then blacks (1)
			) {
				for (var i = 0; i < num_keys; ++i) {
					var key_info = LGMIDIKeys.keys[i % 12];
					if (key_info.t != k) {
						continue;
					}
					var octave = Math.floor(i / 12);
					var x = octave * 7 * key_width + key_info.x * key_width;
					if (k == 0) {
						ctx.fillStyle = this.keys[i] ? "#CCC" : "white";
					}
					else {
						ctx.fillStyle = this.keys[i] ? "#333" : "black";
					}
					ctx.fillRect(
						x + 1,
						0,
						key_width * key_info.w - 2,
						key_height * key_info.h
					);
				}
			}
		}

		getKeyIndex(pos) {
			var num_keys = this.properties.num_octaves * 12;
			var key_width = this.size[0] / (this.properties.num_octaves * 7);
			var key_height = this.size[1];

			for (
				var k = 1; k >= 0; k-- //test blacks first (1) then whites (0)
			) {
				for (var i = 0; i < this.keys.length; ++i) {
					var key_info = LGMIDIKeys.keys[i % 12];
					if (key_info.t != k) {
						continue;
					}
					var octave = Math.floor(i / 12);
					var x = octave * 7 * key_width + key_info.x * key_width;
					var w = key_width * key_info.w;
					var h = key_height * key_info.h;
					if (pos[0] < x || pos[0] > x + w || pos[1] > h) {
						continue;
					}
					return i;
				}
			}
			return -1;
		}

		onAction(event, params) {
			if (event == "reset") {
				for (var i = 0; i < this.keys.length; ++i) {
					this.keys[i] = false;
				}
				return;
			}

			if (!params || params.constructor !== MIDIEvent) {
				return;
			}
			var midi_event = params;
			var start_note = (this.properties.start_octave - 1) * 12 + 29;
			var index = midi_event.data[1] - start_note;
			if (index >= 0 && index < this.keys.length) {
				if (midi_event.data[0] == MIDIEvent.NOTEON) {
					this.keys[index] = true;
				}
				else if (midi_event.data[0] == MIDIEvent.NOTEOFF) {
					this.keys[index] = false;
				}
			}

			this.trigger("note", midi_event);
		}

		onMouseDown(e, pos) {
			if (pos[1] < 0) {
				return;
			}
			var index = this.getKeyIndex(pos);
			this.keys[index] = true;
			this._last_key = index;
			var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
			var midi_event = new MIDIEvent();
			midi_event.setup([MIDIEvent.NOTEON, pitch, 100]);
			this.trigger("note", midi_event);
			return true;
		}

		onMouseMove(e, pos) {
			if (pos[1] < 0 || this._last_key == -1) {
				return;
			}
			this.setDirtyCanvas(true);
			var index = this.getKeyIndex(pos);
			if (this._last_key == index) {
				return true;
			}
			this.keys[this._last_key] = false;
			var pitch =
				(this.properties.start_octave - 1) * 12 + 29 + this._last_key;
			var midi_event = new MIDIEvent();
			midi_event.setup([MIDIEvent.NOTEOFF, pitch, 100]);
			this.trigger("note", midi_event);

			this.keys[index] = true;
			var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
			var midi_event = new MIDIEvent();
			midi_event.setup([MIDIEvent.NOTEON, pitch, 100]);
			this.trigger("note", midi_event);

			this._last_key = index;
			return true;
		}

		onMouseUp(e, pos) {
			if (pos[1] < 0) {
				return;
			}
			var index = this.getKeyIndex(pos);
			this.keys[index] = false;
			this._last_key = -1;
			var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
			var midi_event = new MIDIEvent();
			midi_event.setup([MIDIEvent.NOTEOFF, pitch, 100]);
			this.trigger("note", midi_event);
			return true;
		}
	}
	LiteGraph.registerNodeType("midi/keys", LGMIDIKeys);

	function now() {
		return window.performance.now();
	}
})(this);
