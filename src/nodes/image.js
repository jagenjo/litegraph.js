(function(){




function GraphicsImage()
{
	this.inputs = [];
	this.addOutput("frame","image");
	this.properties = {"url":""};
}

GraphicsImage.title = "Image";
GraphicsImage.desc = "Image loader";
GraphicsImage.widgets = [{name:"load",text:"Load",type:"button"}];

GraphicsImage.supported_extensions = ["jpg","jpeg","png","gif"];

GraphicsImage.prototype.onAdded = function()
{
	if(this.properties["url"] != "" && this.img == null)
	{
		this.loadImage( this.properties["url"] );
	}
}

GraphicsImage.prototype.onDrawBackground = function(ctx)
{
	if(this.img && this.size[0] > 5 && this.size[1] > 5)
		ctx.drawImage(this.img, 0,0,this.size[0],this.size[1]);
}


GraphicsImage.prototype.onExecute = function()
{
	if(!this.img)
		this.boxcolor = "#000";
	if(this.img && this.img.width)
		this.setOutputData(0,this.img);
	else
		this.setOutputData(0,null);
	if(this.img && this.img.dirty)
		this.img.dirty = false;
}

GraphicsImage.prototype.onPropertyChanged = function(name,value)
{
	this.properties[name] = value;
	if (name == "url" && value != "")
		this.loadImage(value);

	return true;
}

GraphicsImage.prototype.loadImage = function( url, callback )
{
	if(url == "")
	{
		this.img = null;
		return;
	}

	this.img = document.createElement("img");

	if(url.substr(0,7) == "http://")
	{
		if(LiteGraph.proxy) //proxy external files
			url = LiteGraph.proxy + url.substr(7);
	}

	this.img.src = url;
	this.boxcolor = "#F95";
	var that = this;
	this.img.onload = function()
	{
		if(callback)
			callback(this);
		that.trace("Image loaded, size: " + that.img.width + "x" + that.img.height );
		this.dirty = true;
		that.boxcolor = "#9F9";
		that.setDirtyCanvas(true);
	}
}

GraphicsImage.prototype.onWidget = function(e,widget)
{
	if(widget.name == "load")
	{
		this.loadImage(this.properties["url"]);
	}
}

GraphicsImage.prototype.onDropFile = function(file)
{
	var that = this;
	if(this._url)
		URL.revokeObjectURL( this._url );
	this._url = URL.createObjectURL( file );
	this.properties.url = this._url;
	this.loadImage( this._url, function(img){
		that.size[1] = (img.height / img.width) * that.size[0];
	});
}

LiteGraph.registerNodeType("graphics/image", GraphicsImage);



function ColorPalette()
{
	this.addInput("f","number");
	this.addOutput("Color","color");
	this.properties = {colorA:"#444444",colorB:"#44AAFF",colorC:"#44FFAA",colorD:"#FFFFFF"};

}

ColorPalette.title = "Palette";
ColorPalette.desc = "Generates a color";

ColorPalette.prototype.onExecute = function()
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


LiteGraph.registerNodeType("color/palette", ColorPalette );


function ImageFrame()
{
	this.addInput("","image");
	this.size = [200,200];
}

ImageFrame.title = "Frame";
ImageFrame.desc = "Frame viewerew";
ImageFrame.widgets = [{name:"resize",text:"Resize box",type:"button"},{name:"view",text:"View Image",type:"button"}];


ImageFrame.prototype.onDrawBackground = function(ctx)
{
	if(this.frame)
		ctx.drawImage(this.frame, 0,0,this.size[0],this.size[1]);
}

ImageFrame.prototype.onExecute = function()
{
	this.frame = this.getInputData(0);
	this.setDirtyCanvas(true);
}

ImageFrame.prototype.onWidget = function(e,widget)
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
}

ImageFrame.prototype.show = function()
{
	//var str = this.canvas.toDataURL("image/png");
	if(showElement && this.frame)
		showElement(this.frame);
}


LiteGraph.registerNodeType("graphics/frame", ImageFrame );



/*
LiteGraph.registerNodeType("visualization/graph", {
		desc: "Shows a graph of the inputs",

		inputs: [["",0],["",0],["",0],["",0]],
		size: [200,200],
		properties: {min:-1,max:1,bgColor:"#000"},
		onDrawBackground: function(ctx)
		{
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
*/

function ImageFade()
{
	this.addInputs([["img1","image"],["img2","image"],["fade","number"]]);
	this.addInput("","image");
	this.properties = {fade:0.5,width:512,height:512};
}

ImageFade.title = "Image fade";
ImageFade.desc = "Fades between images";
ImageFade.widgets = [{name:"resizeA",text:"Resize to A",type:"button"},{name:"resizeB",text:"Resize to B",type:"button"}];

ImageFade.prototype.onAdded = function()
{
	this.createCanvas();
	var ctx = this.canvas.getContext("2d");
	ctx.fillStyle = "#000";
	ctx.fillRect(0,0,this.properties["width"],this.properties["height"]);
}

ImageFade.prototype.createCanvas = function()
{
	this.canvas = document.createElement("canvas");
	this.canvas.width = this.properties["width"];
	this.canvas.height = this.properties["height"];
}

ImageFade.prototype.onExecute = function()
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

LiteGraph.registerNodeType("graphics/imagefade", ImageFade);



function ImageCrop()
{
	this.addInput("","image");
	this.addOutput("","image");
	this.properties = {width:256,height:256,x:0,y:0,scale:1.0 };
	this.size = [50,20];
}

ImageCrop.title = "Crop";
ImageCrop.desc = "Crop Image";

ImageCrop.prototype.onAdded = function()
{
	this.createCanvas();
}

ImageCrop.prototype.createCanvas = function()
{
	this.canvas = document.createElement("canvas");
	this.canvas.width = this.properties["width"];
	this.canvas.height = this.properties["height"];
}

ImageCrop.prototype.onExecute = function()
{
	var input = this.getInputData(0);
	if(!input)
		return;

	if(input.width)
	{
		var ctx = this.canvas.getContext("2d");

		ctx.drawImage(input, -this.properties["x"],-this.properties["y"], input.width * this.properties["scale"], input.height * this.properties["scale"]);
		this.setOutputData(0,this.canvas);
	}
	else
		this.setOutputData(0,null);
}

ImageCrop.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed)
		return;
	if(this.canvas)
		ctx.drawImage( this.canvas, 0,0,this.canvas.width,this.canvas.height, 0,0, this.size[0], this.size[1] );
}

ImageCrop.prototype.onPropertyChanged = function(name,value)
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

LiteGraph.registerNodeType("graphics/cropImage", ImageCrop );


function ImageVideo()
{
	this.addInput("t","number");
	this.addOutputs([["frame","image"],["t","number"],["d","number"]]);
	this.properties = {"url":""};
}

ImageVideo.title = "Video";
ImageVideo.desc = "Video playback";
ImageVideo.widgets = [{name:"play",text:"PLAY",type:"minibutton"},{name:"stop",text:"STOP",type:"minibutton"},{name:"demo",text:"Demo video",type:"button"},{name:"mute",text:"Mute video",type:"button"}];

ImageVideo.prototype.onExecute = function()
{
	if(!this.properties.url)
		return;

	if(this.properties.url != this._video_url)
		this.loadVideo(this.properties.url);

	if(!this._video || this._video.width == 0)
		return;

	var t = this.getInputData(0);
	if(t && t >= 0 && t <= 1.0)
	{
		this._video.currentTime = t * this._video.duration;
		this._video.pause();
	}

	this._video.dirty = true;
	this.setOutputData(0,this._video);
	this.setOutputData(1,this._video.currentTime);
	this.setOutputData(2,this._video.duration);
	this.setDirtyCanvas(true);
}

ImageVideo.prototype.onStart = function()
{
	this.play();
}

ImageVideo.prototype.onStop = function()
{
	this.stop();
}

ImageVideo.prototype.loadVideo = function(url)
{
	this._video_url = url;

	this._video = document.createElement("video");
	this._video.src = url;
	this._video.type = "type=video/mp4";

	this._video.muted = true;
	this._video.autoplay = true;

	var that = this;
	this._video.addEventListener("loadedmetadata",function(e) {
		//onload
		that.trace("Duration: " + this.duration + " seconds");
		that.trace("Size: " + this.videoWidth + "," + this.videoHeight);
		that.setDirtyCanvas(true);
		this.width = this.videoWidth;
		this.height = this.videoHeight;
	});
	this._video.addEventListener("progress",function(e) {
		//onload
		//that.trace("loading...");
	});
	this._video.addEventListener("error",function(e) {
		console.log("Error loading video: " + this.src);
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

	this._video.addEventListener("ended",function(e) {
		that.trace("Ended.");
		this.play(); //loop
	});

	//document.body.appendChild(this.video);
}

ImageVideo.prototype.onPropertyChanged = function(name,value)
{
	this.properties[name] = value;
	if (name == "url" && value != "")
		this.loadVideo(value);

	return true;
}

ImageVideo.prototype.play = function()
{
	if(this._video)
		this._video.play();
}

ImageVideo.prototype.playPause = function()
{
	if(!this._video)
		return;
	if(this._video.paused)
		this.play();
	else
		this.pause();
}

ImageVideo.prototype.stop = function()
{
	if(!this._video)
		return;
	this._video.pause();
	this._video.currentTime = 0;
}

ImageVideo.prototype.pause = function()
{
	if(!this._video)
		return;
	this.trace("Video paused");
	this._video.pause();
}

ImageVideo.prototype.onWidget = function(e,widget)
{
	/*
	if(widget.name == "demo")
	{
		this.loadVideo();
	}
	else if(widget.name == "play")
	{
		if(this._video)
			this.playPause();
	}
	if(widget.name == "stop")
	{
		this.stop();
	}
	else if(widget.name == "mute")
	{
		if(this._video)
			this._video.muted = !this._video.muted;
	}
	*/
}

LiteGraph.registerNodeType("graphics/video", ImageVideo );


// Texture Webcam *****************************************
function ImageWebcam()
{
	this.addOutput("Webcam","image");
	this.properties = {};
}

ImageWebcam.title = "Webcam";
ImageWebcam.desc = "Webcam image";


ImageWebcam.prototype.openStream = function()
{
	//Vendor prefixes hell
	navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
	window.URL = window.URL || window.webkitURL;

	if (!navigator.getUserMedia) {
	  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
	  return;
	}

	this._waiting_confirmation = true;

	// Not showing vendor prefixes.
	navigator.getUserMedia({video: true}, this.streamReady.bind(this), onFailSoHard);		

	var that = this;
	function onFailSoHard(e) {
		console.log('Webcam rejected', e);
		that._webcam_stream = false;
		that.box_color = "red";
	};
}

ImageWebcam.prototype.onRemoved = function()
{
	if(this._webcam_stream)
	{
		this._webcam_stream.stop();
		this._webcam_stream = null;
		this._video = null;
	}
}

ImageWebcam.prototype.streamReady = function(localMediaStream)
{
	this._webcam_stream = localMediaStream;
	//this._waiting_confirmation = false;

	var video = this._video;
	if(!video)
	{
		video = document.createElement("video");
		video.autoplay = true;
		video.src = window.URL.createObjectURL(localMediaStream);
		this._video = video;
		//document.body.appendChild( video ); //debug
		//when video info is loaded (size and so)
		video.onloadedmetadata = function(e) {
			// Ready to go. Do some stuff.
			console.log(e);
		};
	}
},

ImageWebcam.prototype.onExecute = function()
{
	if(this._webcam_stream == null && !this._waiting_confirmation)
		this.openStream();

	if(!this._video || !this._video.videoWidth) return;

	this._video.width = this._video.videoWidth;
	this._video.height = this._video.videoHeight;
	this.setOutputData(0, this._video);
}

ImageWebcam.prototype.getExtraMenuOptions = function(graphcanvas)
{
	var that = this;
	var txt = !that.properties.show ? "Show Frame" : "Hide Frame";
	return [ {content: txt, callback: 
		function() { 
			that.properties.show = !that.properties.show;
		}
	}];
}

ImageWebcam.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed || this.size[1] <= 20 || !this.properties.show)
		return;

	if(!this._video)
		return;

	//render to graph canvas
	ctx.save();
	ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
	ctx.restore();
}

LiteGraph.registerNodeType("graphics/webcam", ImageWebcam );


})();