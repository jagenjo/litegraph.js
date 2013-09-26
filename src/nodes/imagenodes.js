LiteGraph.registerNodeType("color/palette",{
		title: "Palette",
		desc: "Generates a color",

		inputs: [["f","number"]],
		outputs: [["Color","color"]],
		properties: {colorA:"#444444",colorB:"#44AAFF",colorC:"#44FFAA",colorD:"#FFFFFF"},

		onExecute: function()
		{
			var c = [];

			if (this.properties.colorA != null)
				c.push( hex2num( this.properties.colorA ) );
			if (this.properties.colorB != null)
				c.push( hex2num( this.properties.colorB ) );
			if (this.properties.colorC != null)
				c.push( hex2num( this.properties.colorC ) );
			if (this.properties.colorD != null)
				c.push( hex2num( this.properties.colorD ) );

			var f = this.getInputData(0);
			if(f == null) f = 0.5;
			if (f > 1.0)
				f = 1.0;
			else if (f < 0.0)
				f = 0.0;

			if(c.length == 0)
				return;

			var result = [0,0,0];
			if(f == 0)
				result = c[0];
			else if(f == 1)
				result = c[ c.length - 1];
			else
			{
				var pos = (c.length - 1)* f;
				var c1 = c[ Math.floor(pos) ];
				var c2 = c[ Math.floor(pos)+1 ];
				var t = pos - Math.floor(pos);
				result[0] = c1[0] * (1-t) + c2[0] * (t);
				result[1] = c1[1] * (1-t) + c2[1] * (t);
				result[2] = c1[2] * (1-t) + c2[2] * (t);
			}

			/*
			c[0] = 1.0 - Math.abs( Math.sin( 0.1 * reModular.getTime() * Math.PI) );
			c[1] = Math.abs( Math.sin( 0.07 * reModular.getTime() * Math.PI) );
			c[2] = Math.abs( Math.sin( 0.01 * reModular.getTime() * Math.PI) );
			*/

			for(var i in result)
				result[i] /= 255;
			
			this.boxcolor = colorToString(result);
			this.setOutputData(0, result);
		}
	});

LiteGraph.registerNodeType("graphics/frame", {
		title: "Frame",
		desc: "Frame viewerew",

		inputs: [["","image"]],
		size: [200,200],
		widgets: [{name:"resize",text:"Resize box",type:"button"},{name:"view",text:"View Image",type:"button"}],

		onDrawBackground: function(ctx)
		{
			if(this.frame)
				ctx.drawImage(this.frame, 0,0,this.size[0],this.size[1]);
		},

		onExecute: function()
		{
			this.frame = this.getInputData(0);
			this.setDirtyCanvas(true);
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "resize" && this.frame)
			{
				var width = this.frame.width;
				var height = this.frame.height;

				if(!width && this.frame.videoWidth != null )
				{
					width = this.frame.videoWidth;
					height = this.frame.videoHeight;
				}

				if(width && height)
					this.size = [width, height];
				this.setDirtyCanvas(true,true);
			}
			else if(widget.name == "view")
				this.show();
		},

		show: function()
		{
			//var str = this.canvas.toDataURL("image/png");
			if(showElement && this.frame)
				showElement(this.frame);
		}
	});

LiteGraph.registerNodeType("visualization/graph", {
		desc: "Shows a graph of the inputs",

		inputs: [["",0],["",0],["",0],["",0]],
		size: [200,200],
		properties: {min:-1,max:1,bgColor:"#000"},
		onDrawBackground: function(ctx)
		{
			/*
			ctx.save();
			ctx.beginPath();
			ctx.rect(2,2,this.size[0] - 4, this.size[1]-4);
			ctx.clip();
			//*/

			var colors = ["#FFF","#FAA","#AFA","#AAF"];

			if(this.properties.bgColor != null && this.properties.bgColor != "")
			{
				ctx.fillStyle="#000";
				ctx.fillRect(2,2,this.size[0] - 4, this.size[1]-4);
			}

			if(this.data)
			{
				var min = this.properties["min"];
				var max = this.properties["max"];

				for(var i in this.data)
				{
					var data = this.data[i];
					if(!data) continue;

					if(this.getInputInfo(i) == null) continue;

					ctx.strokeStyle = colors[i];
					ctx.beginPath();

					var d = data.length / this.size[0];
					for(var j = 0; j < data.length; j += d)
					{
						var value = data[ Math.floor(j) ];
						value = (value - min) / (max - min);
						if (value > 1.0) value = 1.0;
						else if(value < 0) value = 0;

						if(j == 0)
							ctx.moveTo( j / d, (this.size[1] - 5) - (this.size[1] - 10) * value);
						else
							ctx.lineTo( j / d, (this.size[1] - 5) - (this.size[1] - 10) * value);
					}

					ctx.stroke();
				}
			}
			//*/

			//ctx.restore();
		},

		onExecute: function()
		{
			if(!this.data) this.data = [];

			for(var i in this.inputs)
			{
				var value = this.getInputData(i);

				if(typeof(value) == "number")
				{
					value = value ? value : 0;
					if(!this.data[i])
						this.data[i] = [];
					this.data[i].push(value);

					if(this.data[i].length > (this.size[1] - 4))
						this.data[i] = this.data[i].slice(1,this.data[i].length);
				}
				else
					this.data[i] = value;
			}

			if(this.data.length)
				this.setDirtyCanvas(true);
		}
	});

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


LiteGraph.registerNodeType("graphics/imagefade", {
		title: "Image fade",
		desc: "Fades between images",

		inputs: [["img1","image"],["img2","image"],["fade","number"]],
		outputs: [["","image"]],
		properties: {fade:0.5,width:512,height:512},
		widgets: [{name:"resizeA",text:"Resize to A",type:"button"},{name:"resizeB",text:"Resize to B",type:"button"}],

		onLoad: function()
		{
			this.createCanvas();
			var ctx = this.canvas.getContext("2d");
			ctx.fillStyle = "#000";
			ctx.fillRect(0,0,this.properties["width"],this.properties["height"]);
		},
		
		createCanvas: function()
		{
			this.canvas = document.createElement("canvas");
			this.canvas.width = this.properties["width"];
			this.canvas.height = this.properties["height"];
		},

		onExecute: function()
		{
			var ctx = this.canvas.getContext("2d");
			this.canvas.width = this.canvas.width;

			var A = this.getInputData(0);
			if (A != null)
			{
				ctx.drawImage(A,0,0,this.canvas.width, this.canvas.height);
			}

			var fade = this.getInputData(2);
			if(fade == null)
				fade = this.properties["fade"];
			else
				this.properties["fade"] = fade;

			ctx.globalAlpha = fade;
			var B = this.getInputData(1);
			if (B != null)
			{
				ctx.drawImage(B,0,0,this.canvas.width, this.canvas.height);
			}
			ctx.globalAlpha = 1.0;

			this.setOutputData(0,this.canvas);
			this.setDirtyCanvas(true);
		}
	});

LiteGraph.registerNodeType("graphics/image", {
		title: "Image",
		desc: "Image loader",

		inputs: [],
		outputs: [["frame","image"]],
		properties: {"url":""},
		widgets: [{name:"load",text:"Load",type:"button"}],

		onLoad: function()
		{
			if(this.properties["url"] != "" && this.img == null)
			{
				this.loadImage(this.properties["url"]);
			}
		},

		onStart: function()
		{
		},

		onExecute: function()
		{
			if(!this.img)
				this.boxcolor = "#000";
			if(this.img && this.img.width)
				this.setOutputData(0,this.img);
			else
				this.setOutputData(0,null);
			if(this.img.dirty)
				this.img.dirty = false;
		},

		onPropertyChange: function(name,value)
		{
			this.properties[name] = value;
			if (name == "url" && value != "")
				this.loadImage(value);

			return true;
		},

		loadImage: function(url)
		{
			if(url == "")
			{
				this.img = null;
				return;
			}

			this.trace("loading image...");
			this.img = document.createElement("img");
			this.img.src = "miniproxy.php?url=" + url;
			this.boxcolor = "#F95";
			var that = this;
			this.img.onload = function()
			{
				that.trace("Image loaded, size: " + that.img.width + "x" + that.img.height );
				this.dirty = true;
				that.boxcolor = "#9F9";
				that.setDirtyCanvas(true);
			}
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "load")
			{
				this.loadImage(this.properties["url"]);
			}
		}
	});

LiteGraph.registerNodeType("graphics/cropImage", {
		title: "Crop",
		desc: "Crop Image",

		inputs: [["","image"]],
		outputs: [["","image"]],
		properties: {width:256,height:256,x:0,y:0,scale:1.0 },
		size: [50,20],

		onLoad: function()
		{
			this.createCanvas();
		},
		
		createCanvas: function()
		{
			this.canvas = document.createElement("canvas");
			this.canvas.width = this.properties["width"];
			this.canvas.height = this.properties["height"];
		},

		onExecute: function()
		{
			var input = this.getInputData(0);
			if(!input) return;

			if(input.width)
			{
				var ctx = this.canvas.getContext("2d");

				ctx.drawImage(input, -this.properties["x"],-this.properties["y"], input.width * this.properties["scale"], input.height * this.properties["scale"]);
				this.setOutputData(0,this.canvas);
			}
			else
				this.setOutputData(0,null);
		},

		onPropertyChange: function(name,value)
		{
			this.properties[name] = value;

			if(name == "scale")
			{
				this.properties[name] = parseFloat(value);
				if(this.properties[name] == 0)
				{
					this.trace("Error in scale");
					this.properties[name] = 1.0;
				}
			}
			else
				this.properties[name] = parseInt(value);

			this.createCanvas();

			return true;
		}
	});


LiteGraph.registerNodeType("graphics/video", {
		title: "Video",
		desc: "Video playback",

		inputs: [["t","number"]],
		outputs: [["frame","image"],["t","number"],["d","number"]],
		properties: {"url":""},
		widgets: [{name:"play",text:"PLAY",type:"minibutton"},{name:"stop",text:"STOP",type:"minibutton"},{name:"demo",text:"Demo video",type:"button"},{name:"mute",text:"Mute video",type:"button"}],

		onClick: function(e)
		{
			if(!this.video) return;

			//press play
			if( distance( [e.canvasX,e.canvasY], [ this.pos[0] + 55, this.pos[1] + 40] ) < 20 )
			{
				this.play();
				return true;
			}
		},

		onKeyDown: function(e)
		{
			if(e.keyCode == 32)
				this.playPause();
		},

		onLoad: function()
		{
			if(this.properties.url != "")
				this.loadVideo(this.properties.url);
		},

		play: function()
		{
			if(this.video)
			{
				this.trace("Video playing");
				this.video.play();
			}
		},

		playPause: function()
		{
			if(this.video)
			{
				if(this.video.paused)
					this.play();
				else
					this.pause();
			}
		},

		stop: function()
		{
			if(this.video)
			{
				this.trace("Video stopped");
				this.video.pause();
				this.video.currentTime = 0;
			}
		},

		pause: function()
		{
			if(this.video)
			{
				this.trace("Video paused");
				this.video.pause();
			}
		},

		onExecute: function()
		{
			if(!this.video)
				return;

			var t = this.getInputData(0);
			if(t && t >= 0 && t <= 1.0)
			{
				this.video.currentTime = t * this.video.duration;
				this.video.pause();
			}

			this.video.dirty = true;
			this.setOutputData(0,this.video);
			this.setOutputData(1,this.video.currentTime);
			this.setOutputData(2,this.video.duration);
			this.setDirtyCanvas(true);
		},

		onStart: function()
		{
			//this.play();
		},

		onStop: function()
		{
			this.pause();
		},

		loadVideo: function(url)
		{
			this.video = document.createElement("video");
			if(url)
				this.video.src = url;
			else
			{
				this.video.src = "modules/data/video.webm";
				this.properties.url = this.video.src;
			}
			this.video.type = "type=video/mp4";
			//this.video.loop = true; //not work in FF
			this.video.muted = true;
			this.video.autoplay = false;

			//if(reModular.status == "running") this.play();

			var that = this;
			this.video.addEventListener("loadedmetadata",function(e) {
				//onload
				that.trace("Duration: " + that.video.duration + " seconds");
				that.trace("Size: " + that.video.videoWidth + "," + that.video.videoHeight);
				that.setDirtyCanvas(true);
				this.width = this.videoWidth;
				this.height = this.videoHeight;
			});
			this.video.addEventListener("progress",function(e) {
				//onload
				//that.trace("loading...");
			});
			this.video.addEventListener("error",function(e) {
				that.trace("Error loading video: " + this.src);
				if (this.error) {
				 switch (this.error.code) {
				   case this.error.MEDIA_ERR_ABORTED:
					  that.trace("You stopped the video.");
					  break;
				   case this.error.MEDIA_ERR_NETWORK:
					  that.trace("Network error - please try again later.");
					  break;
				   case this.error.MEDIA_ERR_DECODE:
					  that.trace("Video is broken..");
					  break;
				   case this.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
					  that.trace("Sorry, your browser can't play this video.");
					  break;
				 }
				}
			});

			this.video.addEventListener("ended",function(e) {
				that.trace("Ended.");
				this.play();
			});

			//$("body").append(this.video);
		},

		onPropertyChange: function(name,value)
		{
			this.properties[name] = value;
			if (name == "url" && value != "")
				this.loadVideo(value);

			return true;
		},
		onWidget: function(e,widget)
		{
			if(widget.name == "demo")
			{
				this.loadVideo();
			}
			else if(widget.name == "play")
			{
				if(this.video)
					this.playPause();
			}
			if(widget.name == "stop")
			{
				this.stop();
			}
			else if(widget.name == "mute")
			{
				if(this.video)
					this.video.muted = !this.video.muted;
			}

		}
	});
