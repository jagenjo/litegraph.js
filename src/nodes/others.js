/*
LiteGraph.registerNodeType("graphics/supergraph", {
		title: "Supergraph",
		desc: "Shows a nice circular graph",

		inputs: [["x","number"],["y","number"],["c","color"]],
		outputs: [["","image"]],
		widgets: [{name:"clear_alpha",text:"Clear Alpha",type:"minibutton"},{name:"clear_color",text:"Clear color",type:"minibutton"}],
		properties: {size:256,bgcolor:"#000",lineWidth:1},
		bgcolor: "#000",
		flags: {allow_fastrender:true},
		onLoad: function()
		{
			this.createCanvas();
		},
		
		createCanvas: function()
		{
			this.canvas = document.createElement("canvas");
			this.canvas.width = this.properties["size"];
			this.canvas.height = this.properties["size"];
			this.oldpos = null;
			this.clearCanvas(true);
		},

		onExecute: function()
		{
			var x = this.getInputData(0);
			var y = this.getInputData(1);
			var c = this.getInputData(2);

			if(x == null && y == null) return;

			if(!x) x = 0;
			if(!y) y = 0;
			x*= 0.95;
			y*= 0.95;

			var size = this.properties["size"];
			if(size != this.canvas.width || size != this.canvas.height)
				this.createCanvas();

			if (!this.oldpos)
			{
				this.oldpos = [ (x * 0.5 + 0.5) * size, (y*0.5 + 0.5) * size];
				return;
			}

			var ctx = this.canvas.getContext("2d");

			if(c == null)
				c = "rgba(255,255,255,0.5)";
			else if(typeof(c) == "object")  //array
				c = colorToString(c);

			//stroke line
			ctx.strokeStyle = c;
			ctx.beginPath();
			ctx.moveTo( this.oldpos[0], this.oldpos[1] );
			this.oldpos = [ (x * 0.5 + 0.5) * size, (y*0.5 + 0.5) * size];
			ctx.lineTo( this.oldpos[0], this.oldpos[1] );
			ctx.stroke();

			this.canvas.dirty = true;
			this.setOutputData(0,this.canvas);
		},

		clearCanvas: function(alpha)
		{
			var ctx = this.canvas.getContext("2d");
			if(alpha)
			{
				ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
				this.trace("Clearing alpha");
			}
			else
			{
				ctx.fillStyle = this.properties["bgcolor"];
				ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
			}
		},
		
		onWidget: function(e,widget)
		{
			if(widget.name == "clear_color")
			{
				this.clearCanvas(false);
			}
			else if(widget.name == "clear_alpha")
			{
				this.clearCanvas(true);
			}
		},

		onPropertyChange: function(name,value)
		{
			if(name == "size")
			{
				this.properties["size"] = parseInt(value);
				this.createCanvas();
			}
			else if(name == "bgcolor")
			{
				this.properties["bgcolor"] = value;
				this.createCanvas();
			}
			else if(name == "lineWidth")
			{
				this.properties["lineWidth"] = parseInt(value);
				this.canvas.getContext("2d").lineWidth = this.properties["lineWidth"];
			}
			else
				return false;
				
			return true;
		}
	});
*/