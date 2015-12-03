(function(){

function GamepadInput()
{
	this.addOutput("left_x_axis","number");
	this.addOutput("left_y_axis","number");
	this.properties = {};
}

GamepadInput.title = "Gamepad";
GamepadInput.desc = "gets the input of the gamepad";

GamepadInput.prototype.onExecute = function()
{
	//get gamepad
	var gamepad = this.getGamepad();

	if(this.outputs)
	{
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			var v = null;

			if(gamepad)
			{
				switch( output.name )
				{
					case "left_axis": v = [ gamepad.xbox.axes["lx"], gamepad.xbox.axes["ly"]]; break;
					case "right_axis": v = [ gamepad.xbox.axes["rx"], gamepad.xbox.axes["ry"]]; break;
					case "left_x_axis": v = gamepad.xbox.axes["lx"]; break;
					case "left_y_axis": v = gamepad.xbox.axes["ly"]; break;
					case "right_x_axis": v = gamepad.xbox.axes["rx"]; break;
					case "right_y_axis": v = gamepad.xbox.axes["ry"]; break;
					case "trigger_left": v = gamepad.xbox.axes["ltrigger"]; break;
					case "trigger_right": v = gamepad.xbox.axes["rtrigger"]; break;
					case "a_button": v = gamepad.xbox.buttons["a"] ? 1 : 0; break;
					case "b_button": v = gamepad.xbox.buttons["b"] ? 1 : 0; break;
					case "x_button": v = gamepad.xbox.buttons["x"] ? 1 : 0; break;
					case "y_button": v = gamepad.xbox.buttons["y"] ? 1 : 0; break;
					case "lb_button": v = gamepad.xbox.buttons["lb"] ? 1 : 0; break;
					case "rb_button": v = gamepad.xbox.buttons["rb"] ? 1 : 0; break;
					case "ls_button": v = gamepad.xbox.buttons["ls"] ? 1 : 0; break;
					case "rs_button": v = gamepad.xbox.buttons["rs"] ? 1 : 0; break;
					case "start_button": v = gamepad.xbox.buttons["start"] ? 1 : 0; break;
					case "back_button": v = gamepad.xbox.buttons["back"] ? 1 : 0; break;
					default: break;
				}
			}
			else
			{
				//if no gamepad is connected, output 0
				switch( output.name )
				{
					case "left_axis":
					case "right_axis":
						v = [0,0];
						break;
					default:
						v = 0;
				}
			}
			this.setOutputData(i,v);
		}
	}
}

GamepadInput.prototype.getGamepad = function()
{
	var getGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads; 
	if(!getGamepads)
		return null;
	var gamepads = getGamepads.call(navigator);
	var gamepad = null;

	for(var i = 0; i < 4; i++)
	{
		if (gamepads[i])
		{
			gamepad = gamepads[i];

			//xbox controller mapping
			var xbox = this.xbox_mapping;
			if(!xbox)
				xbox = this.xbox_mapping = { axes:[], buttons:{}, hat: ""};

			xbox.axes["lx"] = gamepad.axes[0];
			xbox.axes["ly"] = gamepad.axes[1];
			xbox.axes["rx"] = gamepad.axes[2];
			xbox.axes["ry"] = gamepad.axes[3];
			xbox.axes["ltrigger"] = gamepad.buttons[6].value;
			xbox.axes["rtrigger"] = gamepad.buttons[7].value;

			for(var i = 0; i < gamepad.buttons.length; i++)
			{
				//mapping of XBOX
				switch(i) //I use a switch to ensure that a player with another gamepad could play
				{
					case 0: xbox.buttons["a"] = gamepad.buttons[i].pressed; break;
					case 1: xbox.buttons["b"] = gamepad.buttons[i].pressed; break;
					case 2: xbox.buttons["x"] = gamepad.buttons[i].pressed; break;
					case 3: xbox.buttons["y"] = gamepad.buttons[i].pressed; break;
					case 4: xbox.buttons["lb"] = gamepad.buttons[i].pressed; break;
					case 5: xbox.buttons["rb"] = gamepad.buttons[i].pressed; break;
					case 6: xbox.buttons["lt"] = gamepad.buttons[i].pressed; break;
					case 7: xbox.buttons["rt"] = gamepad.buttons[i].pressed; break;
					case 8: xbox.buttons["back"] = gamepad.buttons[i].pressed; break;
					case 9: xbox.buttons["start"] = gamepad.buttons[i].pressed; break;
					case 10: xbox.buttons["ls"] = gamepad.buttons[i].pressed; break;
					case 11: xbox.buttons["rs"] = gamepad.buttons[i].pressed; break;
					case 12: if( gamepad.buttons[i].pressed) xbox.hat += "up"; break;
					case 13: if( gamepad.buttons[i].pressed) xbox.hat += "down"; break;
					case 14: if( gamepad.buttons[i].pressed) xbox.hat += "left"; break;
					case 15: if( gamepad.buttons[i].pressed) xbox.hat += "right"; break;
					case 16: xbox.buttons["home"] = gamepad.buttons[i].pressed; break;
					default:
				}
			}
			gamepad.xbox = xbox;
			return gamepad;
		}	
	}
}

GamepadInput.prototype.onDrawBackground = function(ctx)
{
	//render
}

GamepadInput.prototype.onGetOutputs = function() {
	return [
		["left_axis","vec2"],
		["right_axis","vec2"],
		["left_x_axis","number"],
		["left_y_axis","number"],
		["right_x_axis","number"],
		["right_y_axis","number"],
		["trigger_left","number"],
		["trigger_right","number"],
		["a_button","number"],
		["b_button","number"],
		["x_button","number"],
		["y_button","number"],
		["lb_button","number"],
		["rb_button","number"],
		["ls_button","number"],
		["rs_button","number"],
		["start","number"],
		["back","number"]
	];
}

LiteGraph.registerNodeType("input/gamepad", GamepadInput );

})();