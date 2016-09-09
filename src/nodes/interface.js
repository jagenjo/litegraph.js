//widgets
(function(){

	/* Button ****************/

	function WidgetButton()
	{
		this.addOutput( "clicked", LiteGraph.EVENT );
		this.addProperty( "text","" );
		this.addProperty( "font","40px Arial" );
		this.addProperty( "message", "" );
		this.size = [64,84];
	}

	WidgetButton.title = "Button";
	WidgetButton.desc = "Triggers an event";

	WidgetButton.prototype.onDrawForeground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		//ctx.font = "40px Arial";
		//ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillRect(1,1,this.size[0] - 3, this.size[1] - 3);
		ctx.fillStyle = "#AAF";
		ctx.fillRect(0,0,this.size[0] - 3, this.size[1] - 3);
		ctx.fillStyle = this.clicked ? "white" : (this.mouseOver ? "#668" : "#334");
		ctx.fillRect(1,1,this.size[0] - 4, this.size[1] - 4);

		if( this.properties.text || this.properties.text === 0 )
		{
			ctx.textAlign = "center";
			ctx.fillStyle = this.clicked ? "black" : "white";
			if( this.properties.font )
				ctx.font = this.properties.font;
			ctx.fillText(this.properties.text, this.size[0] * 0.5, this.size[1] * 0.85 );
			ctx.textAlign = "left";
		}
	}

	WidgetButton.prototype.onMouseDown = function(e, local_pos)
	{
		if(local_pos[0] > 1 && local_pos[1] > 1 && local_pos[0] < (this.size[0] - 2) && local_pos[1] < (this.size[1] - 2) )
		{
			this.clicked = true;
			this.trigger( "clicked", this.properties.message );
			return true;
		}
	}

	WidgetButton.prototype.onMouseUp = function(e)
	{
		this.clicked = false;
	}


	LiteGraph.registerNodeType("widget/button", WidgetButton );

	/* Knob ****************/

	function WidgetKnob()
	{
		this.addOutput("",'number');
		this.size = [64,84];
		this.properties = {min:0,max:1,value:0.5,wcolor:"#7AF",size:50};
	}

	WidgetKnob.title = "Knob";
	WidgetKnob.desc = "Circular controller";
	WidgetKnob.widgets = [{name:"increase",text:"+",type:"minibutton"},{name:"decrease",text:"-",type:"minibutton"}];


	WidgetKnob.prototype.onAdded = function()
	{
		this.value = (this.properties["value"] - this.properties["min"]) / (this.properties["max"] - this.properties["min"]);

		this.imgbg = this.loadImage("imgs/knob_bg.png");
		this.imgfg = this.loadImage("imgs/knob_fg.png");
	}

	WidgetKnob.prototype.onDrawImageKnob = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		var d = this.imgbg.width*0.5;
		var scale = this.size[0] / this.imgfg.width;

		ctx.save();
			ctx.translate(0,20);
			ctx.scale(scale,scale);
			ctx.drawImage(this.imgbg,0,0);
			//ctx.drawImage(this.imgfg,0,20);

			ctx.translate(d,d);
			ctx.rotate(this.value * (Math.PI*2) * 6/8 + Math.PI * 10/8);
			//ctx.rotate(this.value * (Math.PI*2));
			ctx.translate(-d,-d);
			ctx.drawImage(this.imgfg,0,0);

		ctx.restore();

		if(this.title)
		{
			ctx.font = "bold 16px Criticized,Tahoma";
			ctx.fillStyle="rgba(100,100,100,0.8)";
			ctx.textAlign = "center";
			ctx.fillText(this.title.toUpperCase(), this.size[0] * 0.5, 18 );
			ctx.textAlign = "left";
		}
	}

	WidgetKnob.prototype.onDrawVectorKnob = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//circle around
		ctx.lineWidth = 1;
		ctx.strokeStyle= this.mouseOver ? "#FFF" : "#AAA";
		ctx.fillStyle="#000";
		ctx.beginPath();
		ctx.arc(this.size[0] * 0.5,this.size[1] * 0.5 + 10,this.properties.size * 0.5,0,Math.PI*2,true);
		ctx.stroke();

		if(this.value > 0)
		{
			ctx.strokeStyle=this.properties["wcolor"];
			ctx.lineWidth = (this.properties.size * 0.2);
			ctx.beginPath();
			ctx.arc(this.size[0] * 0.5,this.size[1] * 0.5 + 10,this.properties.size * 0.35,Math.PI * -0.5 + Math.PI*2 * this.value,Math.PI * -0.5,true);
			ctx.stroke();
			ctx.lineWidth = 1;
		}

		ctx.font = (this.properties.size * 0.2) + "px Arial";
		ctx.fillStyle="#AAA";
		ctx.textAlign = "center";

		var str = this.properties["value"];
		if(typeof(str) == 'number')
			str = str.toFixed(2);

		ctx.fillText(str,this.size[0] * 0.5,this.size[1]*0.65);
		ctx.textAlign = "left";
	}

	WidgetKnob.prototype.onDrawForeground = function(ctx)
	{
		this.onDrawImageKnob(ctx);
	}

	WidgetKnob.prototype.onExecute = function()
	{
		this.setOutputData(0, this.properties["value"] );

		this.boxcolor = colorToString([this.value,this.value,this.value]);
	}

	WidgetKnob.prototype.onMouseDown = function(e)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//this.center = [this.imgbg.width * 0.5, this.imgbg.height * 0.5 + 20];
		//this.radius = this.imgbg.width * 0.5;
		this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
		this.radius = this.size[0] * 0.5;

		if(e.canvasY - this.pos[1] < 20 || distance([e.canvasX,e.canvasY],[this.pos[0] + this.center[0],this.pos[1] + this.center[1]]) > this.radius)
			return false;

		this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
		this.captureInput(true);

		/*
		var tmp = this.localToScreenSpace(0,0);
		this.trace(tmp[0] + "," + tmp[1]); */
		return true;
	}

	WidgetKnob.prototype.onMouseMove = function(e)
	{
		if(!this.oldmouse) return;

		var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];

		var v = this.value;
		v -= (m[1] - this.oldmouse[1]) * 0.01;
		if(v > 1.0) v = 1.0;
		else if(v < 0.0) v = 0.0;

		this.value = v;
		this.properties["value"] = this.properties["min"] + (this.properties["max"] - this.properties["min"]) * this.value;

		this.oldmouse = m;
		this.setDirtyCanvas(true);
	}

	WidgetKnob.prototype.onMouseUp = function(e)
	{
		if(this.oldmouse)
		{
			this.oldmouse = null;
			this.captureInput(false);
		}
	}

	WidgetKnob.prototype.onMouseLeave = function(e)
	{
		//this.oldmouse = null;
	}
	
	WidgetKnob.prototype.onWidget = function(e,widget)
	{
		if(widget.name=="increase")
			this.onPropertyChange("size", this.properties.size + 10);
		else if(widget.name=="decrease")
			this.onPropertyChange("size", this.properties.size - 10);
	}

	WidgetKnob.prototype.onPropertyChange = function(name,value)
	{
		if(name=="wcolor")
			this.properties[name] = value;
		else if(name=="size")
		{
			value = parseInt(value);
			this.properties[name] = value;
			this.size = [value+4,value+24];
			this.setDirtyCanvas(true,true);
		}
		else if(name=="min" || name=="max" || name=="value")
		{
			this.properties[name] = parseFloat(value);
		}
		else
			return false;
		return true;
	}

	LiteGraph.registerNodeType("widget/knob", WidgetKnob);

	//Widget H SLIDER
	function WidgetHSlider()
	{
		this.size = [160,26];
		this.addOutput("",'number');
		this.properties = {wcolor:"#7AF",min:0,max:1,value:0.5};
	}

	WidgetHSlider.title = "H.Slider";
	WidgetHSlider.desc = "Linear slider controller";

	WidgetHSlider.prototype.onInit = function()
	{
		this.value = 0.5;
		this.imgfg = this.loadImage("imgs/slider_fg.png");
	}

	WidgetHSlider.prototype.onDrawVectorial = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//border
		ctx.lineWidth = 1;
		ctx.strokeStyle= this.mouseOver ? "#FFF" : "#AAA";
		ctx.fillStyle="#000";
		ctx.beginPath();
		ctx.rect(2,0,this.size[0]-4,20);
		ctx.stroke();

		ctx.fillStyle=this.properties["wcolor"];
		ctx.beginPath();
		ctx.rect(2+(this.size[0]-4-20)*this.value,0, 20,20);
		ctx.fill();
	}

	WidgetHSlider.prototype.onDrawImage = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) 
			return;

		//border
		ctx.lineWidth = 1;
		ctx.fillStyle="#000";
		ctx.fillRect(2,9,this.size[0]-4,2);

		ctx.strokeStyle= "#333";
		ctx.beginPath();
		ctx.moveTo(2,9);
		ctx.lineTo(this.size[0]-4,9);
		ctx.stroke();

		ctx.strokeStyle= "#AAA";
		ctx.beginPath();
		ctx.moveTo(2,11);
		ctx.lineTo(this.size[0]-4,11);
		ctx.stroke();

		ctx.drawImage(this.imgfg, 2+(this.size[0]-4)*this.value - this.imgfg.width*0.5,-this.imgfg.height*0.5 + 10);
	},

	WidgetHSlider.prototype.onDrawForeground = function(ctx)
	{
		this.onDrawImage(ctx);
	}

	WidgetHSlider.prototype.onExecute = function()
	{
		this.properties["value"] = this.properties["min"] + (this.properties["max"] - this.properties["min"]) * this.value;
		this.setOutputData(0, this.properties["value"] );
		this.boxcolor = colorToString([this.value,this.value,this.value]);
	}

	WidgetHSlider.prototype.onMouseDown = function(e)
	{
		if(e.canvasY - this.pos[1] < 0)
			return false;

		this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
		this.captureInput(true);
		return true;
	}

	WidgetHSlider.prototype.onMouseMove = function(e)
	{
		if(!this.oldmouse) return;

		var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];

		var v = this.value;
		var delta = (m[0] - this.oldmouse[0]);
		v += delta / this.size[0];
		if(v > 1.0) v = 1.0;
		else if(v < 0.0) v = 0.0;

		this.value = v;

		this.oldmouse = m;
		this.setDirtyCanvas(true);
	}

	WidgetHSlider.prototype.onMouseUp = function(e)
	{
		this.oldmouse = null;
		this.captureInput(false);
	}

	WidgetHSlider.prototype.onMouseLeave = function(e)
	{
		//this.oldmouse = null;
	}

	WidgetHSlider.prototype.onPropertyChange = function(name,value)
	{
		if(name=="wcolor")
			this.properties[name] = value;
		else
			return false;
		return true;
	}

	LiteGraph.registerNodeType("widget/hslider", WidgetHSlider );


	function WidgetProgress()
	{
		this.size = [160,26];
		this.addInput("",'number');
		this.properties = {min:0,max:1,value:0,wcolor:"#AAF"};
	}

	WidgetProgress.title = "Progress";
	WidgetProgress.desc = "Shows data in linear progress";

	WidgetProgress.prototype.onExecute = function()
	{
		var v = this.getInputData(0);
		if( v != undefined )
			this.properties["value"] = v;
	}

	WidgetProgress.prototype.onDrawForeground = function(ctx)
	{
		//border
		ctx.lineWidth = 1;
		ctx.fillStyle=this.properties.wcolor;
		var v = (this.properties.value - this.properties.min) / (this.properties.max - this.properties.min);
		v = Math.min(1,v);
		v = Math.max(0,v);
		ctx.fillRect(2,2,(this.size[0]-4)*v,this.size[1]-4);
	}

	LiteGraph.registerNodeType("widget/progress", WidgetProgress);


	/*
	LiteGraph.registerNodeType("widget/kpad",{
		title: "KPad",
		desc: "bidimensional slider",
		size: [200,200],
		outputs: [["x",'number'],["y",'number']],
		properties:{x:0,y:0,borderColor:"#333",bgcolorTop:"#444",bgcolorBottom:"#000",shadowSize:1, borderRadius:2},

		createGradient: function(ctx)
		{
			this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
			this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
			this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
		},

		onDrawBackground: function(ctx)
		{
			if(!this.lineargradient)
				this.createGradient(ctx);

			ctx.lineWidth = 1;
			ctx.strokeStyle = this.properties["borderColor"];
			//ctx.fillStyle = "#ebebeb";
			ctx.fillStyle = this.lineargradient;

			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];
			ctx.roundRect(0,0,this.size[0],this.size[1],this.properties["shadowSize"]);
			ctx.fill();
			ctx.shadowColor = "rgba(0,0,0,0)";
			ctx.stroke();

			ctx.fillStyle = "#A00";
			ctx.fillRect(this.size[0] * this.properties["x"] - 5, this.size[1] * this.properties["y"] - 5,10,10);
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "update")
			{
				this.lineargradient = null;
				this.setDirtyCanvas(true);
			}
		},

		onExecute: function()
		{
			this.setOutputData(0, this.properties["x"] );
			this.setOutputData(1, this.properties["y"] );
		},

		onMouseDown: function(e)
		{
			if(e.canvasY - this.pos[1] < 0)
				return false;

			this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
			this.captureInput(true);
			return true;
		},

		onMouseMove: function(e)
		{
			if(!this.oldmouse) return;

			var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
			
			this.properties.x = m[0] / this.size[0];
			this.properties.y = m[1] / this.size[1];

			if(this.properties.x > 1.0) this.properties.x = 1.0;
			else if(this.properties.x < 0.0) this.properties.x = 0.0;

			if(this.properties.y > 1.0) this.properties.y = 1.0;
			else if(this.properties.y < 0.0) this.properties.y = 0.0;

			this.oldmouse = m;
			this.setDirtyCanvas(true);
		},

		onMouseUp: function(e)
		{
			if(this.oldmouse)
			{
				this.oldmouse = null;
				this.captureInput(false);
			}
		},

		onMouseLeave: function(e)
		{
			//this.oldmouse = null;
		}
	});



	LiteGraph.registerNodeType("widget/button", {
		title: "Button",
		desc: "A send command button",

		widgets: [{name:"test",text:"Test Button",type:"button"}],
		size: [100,40],
		properties:{text:"clickme",command:"",color:"#7AF",bgcolorTop:"#f0f0f0",bgcolorBottom:"#e0e0e0",fontsize:"16"},
		outputs:[["M","module"]],

		createGradient: function(ctx)
		{
			this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
			this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
			this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
		},

		drawVectorShape: function(ctx)
		{
			ctx.fillStyle = this.mouseOver ? this.properties["color"] : "#AAA";

			if(this.clicking) 
				ctx.fillStyle = "#FFF";

			ctx.strokeStyle = "#AAA";
			ctx.roundRect(5,5,this.size[0] - 10,this.size[1] - 10,4);
			ctx.stroke();

			if(this.mouseOver)
				ctx.fill();

			//ctx.fillRect(5,20,this.size[0] - 10,this.size[1] - 30);

			ctx.fillStyle = this.mouseOver ? "#000" : "#AAA";
			ctx.font = "bold " + this.properties["fontsize"] + "px Criticized,Tahoma";
			ctx.textAlign = "center";
			ctx.fillText(this.properties["text"],this.size[0]*0.5,this.size[1]*0.5 + 0.5*parseInt(this.properties["fontsize"]));
			ctx.textAlign = "left";
		},

		drawBevelShape: function(ctx)
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];

			if(!this.lineargradient)
				this.createGradient(ctx);

			ctx.fillStyle = this.mouseOver ? this.properties["color"] : this.lineargradient;
			if(this.clicking) 
				ctx.fillStyle = "#444";

			ctx.strokeStyle = "#FFF";
			ctx.roundRect(5,5,this.size[0] - 10,this.size[1] - 10,4);
			ctx.fill();
			ctx.shadowColor = "rgba(0,0,0,0)";
			ctx.stroke();

			ctx.fillStyle = this.mouseOver ? "#000" : "#444";
			ctx.font = "bold " + this.properties["fontsize"] + "px Century Gothic";
			ctx.textAlign = "center";
			ctx.fillText(this.properties["text"],this.size[0]*0.5,this.size[1]*0.5 + 0.40*parseInt(this.properties["fontsize"]));
			ctx.textAlign = "left";
		},

		onDrawForeground: function(ctx)
		{
			this.drawBevelShape(ctx);
		},

		clickButton: function()
		{
			var module = this.getOutputModule(0);
			if(this.properties["command"] && this.properties["command"] != "")
			{
				if (! module.executeAction(this.properties["command"]) )
					this.trace("Error executing action in other module");
			}
			else if(module && module.onTrigger)
			{
				module.onTrigger();  
			}
		},

		onMouseDown: function(e)
		{
			if(e.canvasY - this.pos[1] < 2)
				return false;
			this.clickButton();
			this.clicking = true;
			return true;
		},

		onMouseUp: function(e)
		{
			this.clicking = false;
		},

		onExecute: function()
		{
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "test")
			{
				this.clickButton();
			}
		},

		onPropertyChange: function(name,value)
		{
			this.properties[name] = value;
			return true;
		}
	});
	*/


	function WidgetText()
	{
		this.addInputs("",0);
		this.properties = { value:"...",font:"Arial", fontsize:18, color:"#AAA", align:"left", glowSize:0, decimals:1 };
	}

	WidgetText.title = "Text";
	WidgetText.desc = "Shows the input value";
	WidgetText.widgets = [{name:"resize",text:"Resize box",type:"button"},{name:"led_text",text:"LED",type:"minibutton"},{name:"normal_text",text:"Normal",type:"minibutton"}];

	WidgetText.prototype.onDrawForeground = function(ctx)
	{
		//ctx.fillStyle="#000";
		//ctx.fillRect(0,0,100,60);
		ctx.fillStyle = this.properties["color"];
		var v = this.properties["value"];

		if(this.properties["glowSize"])
		{
			ctx.shadowColor = this.properties["color"];
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["glowSize"];
		}
		else
			ctx.shadowColor = "transparent";

		var fontsize = this.properties["fontsize"];

		ctx.textAlign = this.properties["align"];
		ctx.font = fontsize.toString() + "px " + this.properties["font"];
		this.str = typeof(v) == 'number' ? v.toFixed(this.properties["decimals"]) : v;

		if( typeof(this.str) == 'string')
		{
			var lines = this.str.split("\\n");
			for(var i in lines)
				ctx.fillText(lines[i],this.properties["align"] == "left" ? 15 : this.size[0] - 15, fontsize * -0.15 + fontsize * (parseInt(i)+1) );
		}

		ctx.shadowColor = "transparent";
		this.last_ctx = ctx;
		ctx.textAlign = "left";
	}

	WidgetText.prototype.onExecute = function()
	{
		var v = this.getInputData(0);
		if(v != null)
			this.properties["value"] = v;
		else
			this.properties["value"] = "";
		this.setDirtyCanvas(true);
	}

	WidgetText.prototype.resize = function()
	{
		if(!this.last_ctx) return;

		var lines = this.str.split("\\n");
		this.last_ctx.font = this.properties["fontsize"] + "px " + this.properties["font"];
		var max = 0;
		for(var i in lines)
		{
			var w = this.last_ctx.measureText(lines[i]).width;
			if(max < w) max = w;
		}
		this.size[0] = max + 20;
		this.size[1] = 4 + lines.length * this.properties["fontsize"];

		this.setDirtyCanvas(true);
	}

	WidgetText.prototype.onWidget = function(e,widget)
	{
		if(widget.name == "resize")
			this.resize();
		else if (widget.name == "led_text")
		{
			this.properties["font"] = "Digital";
			this.properties["glowSize"] = 4;
			this.setDirtyCanvas(true);
		}
		else if (widget.name == "normal_text")
		{
			this.properties["font"] = "Arial";
			this.setDirtyCanvas(true);
		}
	}

	WidgetText.prototype.onPropertyChange = function(name,value)
	{
		this.properties[name] = value;
		this.str = typeof(value) == 'number' ? value.toFixed(3) : value;
		//this.resize();
		return true;
	}

	LiteGraph.registerNodeType("widget/text", WidgetText );


	function WidgetPanel()
	{
		this.size = [200,100];
		this.properties = {borderColor:"#ffffff",bgcolorTop:"#f0f0f0",bgcolorBottom:"#e0e0e0",shadowSize:2, borderRadius:3};
	}

	WidgetPanel.title =  "Panel";
	WidgetPanel.desc = "Non interactive panel";
	WidgetPanel.widgets = [{name:"update",text:"Update",type:"button"}];


	WidgetPanel.prototype.createGradient = function(ctx)
	{
		if(this.properties["bgcolorTop"] == "" || this.properties["bgcolorBottom"] == "")
		{
			this.lineargradient = 0;
			return;
		}

		this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
		this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
		this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
	}

	WidgetPanel.prototype.onDrawForeground = function(ctx)
	{
		if(this.lineargradient == null)
			this.createGradient(ctx);

		if(!this.lineargradient)
			return;

		ctx.lineWidth = 1;
		ctx.strokeStyle = this.properties["borderColor"];
		//ctx.fillStyle = "#ebebeb";
		ctx.fillStyle = this.lineargradient;

		if(this.properties["shadowSize"])
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];
		}
		else
			ctx.shadowColor = "transparent";

		ctx.roundRect(0,0,this.size[0]-1,this.size[1]-1,this.properties["shadowSize"]);
		ctx.fill();
		ctx.shadowColor = "transparent";
		ctx.stroke();
	}

	WidgetPanel.prototype.onWidget = function(e,widget)
	{
		if(widget.name == "update")
		{
			this.lineargradient = null;
			this.setDirtyCanvas(true);
		}
	}

	LiteGraph.registerNodeType("widget/panel", WidgetPanel );

})();