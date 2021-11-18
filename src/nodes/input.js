(function(global) {
    var LiteGraph = global.LiteGraph;

    function GamepadInput() {
        this.addOutput("left_x_axis", "number");
        this.addOutput("left_y_axis", "number");
        this.addOutput("button_pressed", LiteGraph.EVENT);
        this.properties = { gamepad_index: 0, threshold: 0.1 };

        this._left_axis = new Float32Array(2);
        this._right_axis = new Float32Array(2);
        this._triggers = new Float32Array(2);
        this._previous_buttons = new Uint8Array(17);
        this._current_buttons = new Uint8Array(17);
    }

    GamepadInput.title = "Gamepad";
    GamepadInput.desc = "gets the input of the gamepad";

    GamepadInput.CENTER = 0;
    GamepadInput.LEFT = 1;
    GamepadInput.RIGHT = 2;
    GamepadInput.UP = 4;
    GamepadInput.DOWN = 8;

    GamepadInput.zero = new Float32Array(2);
    GamepadInput.buttons = [
        "a",
        "b",
        "x",
        "y",
        "lb",
        "rb",
        "lt",
        "rt",
        "back",
        "start",
        "ls",
        "rs",
        "home"
    ];

    GamepadInput.prototype.onExecute = function() {
        //get gamepad
        var gamepad = this.getGamepad();
        var threshold = this.properties.threshold || 0.0;

        if (gamepad) {
            this._left_axis[0] =
                Math.abs(gamepad.xbox.axes["lx"]) > threshold
                    ? gamepad.xbox.axes["lx"]
                    : 0;
            this._left_axis[1] =
                Math.abs(gamepad.xbox.axes["ly"]) > threshold
                    ? gamepad.xbox.axes["ly"]
                    : 0;
            this._right_axis[0] =
                Math.abs(gamepad.xbox.axes["rx"]) > threshold
                    ? gamepad.xbox.axes["rx"]
                    : 0;
            this._right_axis[1] =
                Math.abs(gamepad.xbox.axes["ry"]) > threshold
                    ? gamepad.xbox.axes["ry"]
                    : 0;
            this._triggers[0] =
                Math.abs(gamepad.xbox.axes["ltrigger"]) > threshold
                    ? gamepad.xbox.axes["ltrigger"]
                    : 0;
            this._triggers[1] =
                Math.abs(gamepad.xbox.axes["rtrigger"]) > threshold
                    ? gamepad.xbox.axes["rtrigger"]
                    : 0;
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                if (!output.links || !output.links.length) {
                    continue;
                }
                var v = null;

                if (gamepad) {
                    switch (output.name) {
                        case "left_axis":
                            v = this._left_axis;
                            break;
                        case "right_axis":
                            v = this._right_axis;
                            break;
                        case "left_x_axis":
                            v = this._left_axis[0];
                            break;
                        case "left_y_axis":
                            v = this._left_axis[1];
                            break;
                        case "right_x_axis":
                            v = this._right_axis[0];
                            break;
                        case "right_y_axis":
                            v = this._right_axis[1];
                            break;
                        case "trigger_left":
                            v = this._triggers[0];
                            break;
                        case "trigger_right":
                            v = this._triggers[1];
                            break;
                        case "a_button":
                            v = gamepad.xbox.buttons["a"] ? 1 : 0;
                            break;
                        case "b_button":
                            v = gamepad.xbox.buttons["b"] ? 1 : 0;
                            break;
                        case "x_button":
                            v = gamepad.xbox.buttons["x"] ? 1 : 0;
                            break;
                        case "y_button":
                            v = gamepad.xbox.buttons["y"] ? 1 : 0;
                            break;
                        case "lb_button":
                            v = gamepad.xbox.buttons["lb"] ? 1 : 0;
                            break;
                        case "rb_button":
                            v = gamepad.xbox.buttons["rb"] ? 1 : 0;
                            break;
                        case "ls_button":
                            v = gamepad.xbox.buttons["ls"] ? 1 : 0;
                            break;
                        case "rs_button":
                            v = gamepad.xbox.buttons["rs"] ? 1 : 0;
                            break;
                        case "hat_left":
                            v = gamepad.xbox.hatmap & GamepadInput.LEFT;
                            break;
                        case "hat_right":
                            v = gamepad.xbox.hatmap & GamepadInput.RIGHT;
                            break;
                        case "hat_up":
                            v = gamepad.xbox.hatmap & GamepadInput.UP;
                            break;
                        case "hat_down":
                            v = gamepad.xbox.hatmap & GamepadInput.DOWN;
                            break;
                        case "hat":
                            v = gamepad.xbox.hatmap;
                            break;
                        case "start_button":
                            v = gamepad.xbox.buttons["start"] ? 1 : 0;
                            break;
                        case "back_button":
                            v = gamepad.xbox.buttons["back"] ? 1 : 0;
                            break;
                        case "button_pressed":
                            for (
                                var j = 0;
                                j < this._current_buttons.length;
                                ++j
                            ) {
                                if (
                                    this._current_buttons[j] &&
                                    !this._previous_buttons[j]
                                ) {
                                    this.triggerSlot(
                                        i,
                                        GamepadInput.buttons[j]
                                    );
                                }
                            }
                            break;
                        default:
                            break;
                    }
                } else {
                    //if no gamepad is connected, output 0
                    switch (output.name) {
                        case "button_pressed":
                            break;
                        case "left_axis":
                        case "right_axis":
                            v = GamepadInput.zero;
                            break;
                        default:
                            v = 0;
                    }
                }
                this.setOutputData(i, v);
            }
        }
    };

	GamepadInput.mapping = {a:0,b:1,x:2,y:3,lb:4,rb:5,lt:6,rt:7,back:8,start:9,ls:10,rs:11 };
	GamepadInput.mapping_array = ["a","b","x","y","lb","rb","lt","rt","back","start","ls","rs"];

    GamepadInput.prototype.getGamepad = function() {
        var getGamepads =
            navigator.getGamepads ||
            navigator.webkitGetGamepads ||
            navigator.mozGetGamepads;
        if (!getGamepads) {
            return null;
        }
        var gamepads = getGamepads.call(navigator);
        var gamepad = null;

        this._previous_buttons.set(this._current_buttons);

        //pick the first connected
        for (var i = this.properties.gamepad_index; i < 4; i++) {
            if (!gamepads[i]) {
                continue;
            }
            gamepad = gamepads[i];

            //xbox controller mapping
            var xbox = this.xbox_mapping;
            if (!xbox) {
                xbox = this.xbox_mapping = {
                    axes: [],
                    buttons: {},
                    hat: "",
                    hatmap: GamepadInput.CENTER
                };
            }

            xbox.axes["lx"] = gamepad.axes[0];
            xbox.axes["ly"] = gamepad.axes[1];
            xbox.axes["rx"] = gamepad.axes[2];
            xbox.axes["ry"] = gamepad.axes[3];
            xbox.axes["ltrigger"] = gamepad.buttons[6].value;
            xbox.axes["rtrigger"] = gamepad.buttons[7].value;
            xbox.hat = "";
            xbox.hatmap = GamepadInput.CENTER;

            for (var j = 0; j < gamepad.buttons.length; j++) {
                this._current_buttons[j] = gamepad.buttons[j].pressed;

				if(j < 12)
				{
					xbox.buttons[ GamepadInput.mapping_array[j] ] = gamepad.buttons[j].pressed;
					if(gamepad.buttons[j].was_pressed)
						this.trigger( GamepadInput.mapping_array[j] + "_button_event" );
				}
				else //mapping of XBOX
					switch ( j ) //I use a switch to ensure that a player with another gamepad could play
					{
						case 12:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "up";
								xbox.hatmap |= GamepadInput.UP;
							}
							break;
						case 13:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "down";
								xbox.hatmap |= GamepadInput.DOWN;
							}
							break;
						case 14:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "left";
								xbox.hatmap |= GamepadInput.LEFT;
							}
							break;
						case 15:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "right";
								xbox.hatmap |= GamepadInput.RIGHT;
							}
							break;
						case 16:
							xbox.buttons["home"] = gamepad.buttons[j].pressed;
							break;
						default:
					}
            }
            gamepad.xbox = xbox;
            return gamepad;
        }
    };

    GamepadInput.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        //render gamepad state?
        var la = this._left_axis;
        var ra = this._right_axis;
        ctx.strokeStyle = "#88A";
        ctx.strokeRect(
            (la[0] + 1) * 0.5 * this.size[0] - 4,
            (la[1] + 1) * 0.5 * this.size[1] - 4,
            8,
            8
        );
        ctx.strokeStyle = "#8A8";
        ctx.strokeRect(
            (ra[0] + 1) * 0.5 * this.size[0] - 4,
            (ra[1] + 1) * 0.5 * this.size[1] - 4,
            8,
            8
        );
        var h = this.size[1] / this._current_buttons.length;
        ctx.fillStyle = "#AEB";
        for (var i = 0; i < this._current_buttons.length; ++i) {
            if (this._current_buttons[i]) {
                ctx.fillRect(0, h * i, 6, h);
            }
        }
    };

    GamepadInput.prototype.onGetOutputs = function() {
        return [
            ["left_axis", "vec2"],
            ["right_axis", "vec2"],
            ["left_x_axis", "number"],
            ["left_y_axis", "number"],
            ["right_x_axis", "number"],
            ["right_y_axis", "number"],
            ["trigger_left", "number"],
            ["trigger_right", "number"],
            ["a_button", "number"],
            ["b_button", "number"],
            ["x_button", "number"],
            ["y_button", "number"],
            ["lb_button", "number"],
            ["rb_button", "number"],
            ["ls_button", "number"],
            ["rs_button", "number"],
            ["start_button", "number"],
            ["back_button", "number"],
            ["a_button_event", LiteGraph.EVENT ],
            ["b_button_event", LiteGraph.EVENT ],
            ["x_button_event", LiteGraph.EVENT ],
            ["y_button_event", LiteGraph.EVENT ],
            ["lb_button_event", LiteGraph.EVENT ],
            ["rb_button_event", LiteGraph.EVENT ],
            ["ls_button_event", LiteGraph.EVENT ],
            ["rs_button_event", LiteGraph.EVENT ],
            ["start_button_event", LiteGraph.EVENT ],
            ["back_button_event", LiteGraph.EVENT ],
            ["hat_left", "number"],
            ["hat_right", "number"],
            ["hat_up", "number"],
            ["hat_down", "number"],
            ["hat", "number"],
            ["button_pressed", LiteGraph.EVENT]
        ];
    };

    LiteGraph.registerNodeType("input/gamepad", GamepadInput);

})(this);
