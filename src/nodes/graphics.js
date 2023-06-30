(function(global) {
    var LiteGraph = global.LiteGraph;

    function GraphicsPlot() {
        this.addInput("A", "Number");
        this.addInput("B", "Number");
        this.addInput("C", "Number");
        this.addInput("D", "Number");

        this.values = [[], [], [], []];
        this.properties = { scale: 2 };
    }

    GraphicsPlot.title = "Plot";
    GraphicsPlot.desc = "Plots data over time";
    GraphicsPlot.colors = ["#FFF", "#F99", "#9F9", "#99F"];

    GraphicsPlot.prototype.onExecute = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        var size = this.size;

        for (var i = 0; i < 4; ++i) {
            var v = this.getInputData(i);
            if (v == null) {
                continue;
            }
            var values = this.values[i];
            values.push(v);
            if (values.length > size[0]) {
                values.shift();
            }
        }
    };

    GraphicsPlot.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        var size = this.size;

        var scale = (0.5 * size[1]) / this.properties.scale;
        var colors = GraphicsPlot.colors;
        var offset = size[1] * 0.5;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, size[0], size[1]);
        ctx.strokeStyle = "#555";
        ctx.beginPath();
        ctx.moveTo(0, offset);
        ctx.lineTo(size[0], offset);
        ctx.stroke();

        if (this.inputs) {
            for (var i = 0; i < 4; ++i) {
                var values = this.values[i];
                if (!this.inputs[i] || !this.inputs[i].link) {
                    continue;
                }
                ctx.strokeStyle = colors[i];
                ctx.beginPath();
                var v = values[0] * scale * -1 + offset;
                ctx.moveTo(0, clamp(v, 0, size[1]));
                for (var j = 1; j < values.length && j < size[0]; ++j) {
                    var v = values[j] * scale * -1 + offset;
                    ctx.lineTo(j, clamp(v, 0, size[1]));
                }
                ctx.stroke();
            }
        }
    };

    LiteGraph.registerNodeType("graphics/plot", GraphicsPlot);

    function GraphicsImage() {
        this.addOutput("frame", "image");
        this.properties = { url: "" };
    }

    GraphicsImage.title = "Image";
    GraphicsImage.desc = "Image loader";
    GraphicsImage.widgets = [{ name: "load", text: "Load", type: "button" }];

    GraphicsImage.supported_extensions = ["jpg", "jpeg", "png", "gif"];

    GraphicsImage.prototype.onAdded = function() {
        if (this.properties["url"] != "" && this.img == null) {
            this.loadImage(this.properties["url"]);
        }
    };

    GraphicsImage.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        if (this.img && this.size[0] > 5 && this.size[1] > 5 && this.img.width) {
            ctx.drawImage(this.img, 0, 0, this.size[0], this.size[1]);
        }
    };

    GraphicsImage.prototype.onExecute = function() {
        if (!this.img) {
            this.boxcolor = "#000";
        }
        if (this.img && this.img.width) {
            this.setOutputData(0, this.img);
        } else {
            this.setOutputData(0, null);
        }
        if (this.img && this.img.dirty) {
            this.img.dirty = false;
        }
    };

    GraphicsImage.prototype.onPropertyChanged = function(name, value) {
        this.properties[name] = value;
        if (name == "url" && value != "") {
            this.loadImage(value);
        }

        return true;
    };

    GraphicsImage.prototype.loadImage = function(url, callback) {
        if (url == "") {
            this.img = null;
            return;
        }

        this.img = document.createElement("img");

        if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
            url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
        }

        this.img.src = url;
        this.boxcolor = "#F95";
        var that = this;
        this.img.onload = function() {
            if (callback) {
                callback(this);
            }
            console.log( "Image loaded, size: " + that.img.width + "x" + that.img.height );
            this.dirty = true;
            that.boxcolor = "#9F9";
            that.setDirtyCanvas(true);
        };
        this.img.onerror = function() {
			console.log("error loading the image:" + url);
		}
    };

    GraphicsImage.prototype.onWidget = function(e, widget) {
        if (widget.name == "load") {
            this.loadImage(this.properties["url"]);
        }
    };

    GraphicsImage.prototype.onDropFile = function(file) {
        var that = this;
        if (this._url) {
            URL.revokeObjectURL(this._url);
        }
        this._url = URL.createObjectURL(file);
        this.properties.url = this._url;
        this.loadImage(this._url, function(img) {
            that.size[1] = (img.height / img.width) * that.size[0];
        });
    };

    LiteGraph.registerNodeType("graphics/image", GraphicsImage);

    function ColorPalette() {
        this.addInput("f", "number");
        this.addOutput("Color", "color");
        this.properties = {
            colorA: "#444444",
            colorB: "#44AAFF",
            colorC: "#44FFAA",
            colorD: "#FFFFFF"
        };
    }

    ColorPalette.title = "Palette";
    ColorPalette.desc = "Generates a color";

    ColorPalette.prototype.onExecute = function() {
        var c = [];

        if (this.properties.colorA != null) {
            c.push(hex2num(this.properties.colorA));
        }
        if (this.properties.colorB != null) {
            c.push(hex2num(this.properties.colorB));
        }
        if (this.properties.colorC != null) {
            c.push(hex2num(this.properties.colorC));
        }
        if (this.properties.colorD != null) {
            c.push(hex2num(this.properties.colorD));
        }

        var f = this.getInputData(0);
        if (f == null) {
            f = 0.5;
        }
        if (f > 1.0) {
            f = 1.0;
        } else if (f < 0.0) {
            f = 0.0;
        }

        if (c.length == 0) {
            return;
        }

        var result = [0, 0, 0];
        if (f == 0) {
            result = c[0];
        } else if (f == 1) {
            result = c[c.length - 1];
        } else {
            var pos = (c.length - 1) * f;
            var c1 = c[Math.floor(pos)];
            var c2 = c[Math.floor(pos) + 1];
            var t = pos - Math.floor(pos);
            result[0] = c1[0] * (1 - t) + c2[0] * t;
            result[1] = c1[1] * (1 - t) + c2[1] * t;
            result[2] = c1[2] * (1 - t) + c2[2] * t;
        }

        /*
	c[0] = 1.0 - Math.abs( Math.sin( 0.1 * reModular.getTime() * Math.PI) );
	c[1] = Math.abs( Math.sin( 0.07 * reModular.getTime() * Math.PI) );
	c[2] = Math.abs( Math.sin( 0.01 * reModular.getTime() * Math.PI) );
	*/

        for (var i=0; i < result.length; i++) {
            result[i] /= 255;
        }

        this.boxcolor = colorToString(result);
        this.setOutputData(0, result);
    };

    LiteGraph.registerNodeType("color/palette", ColorPalette);

    function ImageFrame() {
        this.addInput("", "image,canvas");
        this.size = [200, 200];
    }

    ImageFrame.title = "Frame";
    ImageFrame.desc = "Frame viewerew";
    ImageFrame.widgets = [
        { name: "resize", text: "Resize box", type: "button" },
        { name: "view", text: "View Image", type: "button" }
    ];

    ImageFrame.prototype.onDrawBackground = function(ctx) {
        if (this.frame && !this.flags.collapsed) {
            ctx.drawImage(this.frame, 0, 0, this.size[0], this.size[1]);
        }
    };

    ImageFrame.prototype.onExecute = function() {
        this.frame = this.getInputData(0);
        this.setDirtyCanvas(true);
    };

    ImageFrame.prototype.onWidget = function(e, widget) {
        if (widget.name == "resize" && this.frame) {
            var width = this.frame.width;
            var height = this.frame.height;

            if (!width && this.frame.videoWidth != null) {
                width = this.frame.videoWidth;
                height = this.frame.videoHeight;
            }

            if (width && height) {
                this.size = [width, height];
            }
            this.setDirtyCanvas(true, true);
        } else if (widget.name == "view") {
            this.show();
        }
    };

    ImageFrame.prototype.show = function() {
        //var str = this.canvas.toDataURL("image/png");
        if (showElement && this.frame) {
            showElement(this.frame);
        }
    };

    LiteGraph.registerNodeType("graphics/frame", ImageFrame);

    function ImageFade() {
        this.addInputs([
            ["img1", "image"],
            ["img2", "image"],
            ["fade", "number"]
        ]);
        this.addOutput("", "image");
        this.properties = { fade: 0.5, width: 512, height: 512 };
    }

    ImageFade.title = "Image fade";
    ImageFade.desc = "Fades between images";
    ImageFade.widgets = [
        { name: "resizeA", text: "Resize to A", type: "button" },
        { name: "resizeB", text: "Resize to B", type: "button" }
    ];

    ImageFade.prototype.onAdded = function() {
        this.createCanvas();
        var ctx = this.canvas.getContext("2d");
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, this.properties["width"], this.properties["height"]);
    };

    ImageFade.prototype.createCanvas = function() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.properties["width"];
        this.canvas.height = this.properties["height"];
    };

    ImageFade.prototype.onExecute = function() {
        var ctx = this.canvas.getContext("2d");
        this.canvas.width = this.canvas.width;

        var A = this.getInputData(0);
        if (A != null) {
            ctx.drawImage(A, 0, 0, this.canvas.width, this.canvas.height);
        }

        var fade = this.getInputData(2);
        if (fade == null) {
            fade = this.properties["fade"];
        } else {
            this.properties["fade"] = fade;
        }

        ctx.globalAlpha = fade;
        var B = this.getInputData(1);
        if (B != null) {
            ctx.drawImage(B, 0, 0, this.canvas.width, this.canvas.height);
        }
        ctx.globalAlpha = 1.0;

        this.setOutputData(0, this.canvas);
        this.setDirtyCanvas(true);
    };

    LiteGraph.registerNodeType("graphics/imagefade", ImageFade);

    function ImageCrop() {
        this.addInput("", "image");
        this.addOutput("", "image");
        this.properties = { width: 256, height: 256, x: 0, y: 0, scale: 1.0 };
        this.size = [50, 20];
    }

    ImageCrop.title = "Crop";
    ImageCrop.desc = "Crop Image";

    ImageCrop.prototype.onAdded = function() {
        this.createCanvas();
    };

    ImageCrop.prototype.createCanvas = function() {
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.properties["width"];
        this.canvas.height = this.properties["height"];
    };

    ImageCrop.prototype.onExecute = function() {
        var input = this.getInputData(0);
        if (!input) {
            return;
        }

        if (input.width) {
            var ctx = this.canvas.getContext("2d");

            ctx.drawImage(
                input,
                -this.properties["x"],
                -this.properties["y"],
                input.width * this.properties["scale"],
                input.height * this.properties["scale"]
            );
            this.setOutputData(0, this.canvas);
        } else {
            this.setOutputData(0, null);
        }
    };

    ImageCrop.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        if (this.canvas) {
            ctx.drawImage(
                this.canvas,
                0,
                0,
                this.canvas.width,
                this.canvas.height,
                0,
                0,
                this.size[0],
                this.size[1]
            );
        }
    };

    ImageCrop.prototype.onPropertyChanged = function(name, value) {
        this.properties[name] = value;

        if (name == "scale") {
            this.properties[name] = parseFloat(value);
            if (this.properties[name] == 0) {
                console.error("Error in scale");
                this.properties[name] = 1.0;
            }
        } else {
            this.properties[name] = parseInt(value);
        }

        this.createCanvas();

        return true;
    };

    LiteGraph.registerNodeType("graphics/cropImage", ImageCrop);

    //CANVAS stuff

    function CanvasNode() {
        this.addInput("clear", LiteGraph.ACTION);
        this.addOutput("", "canvas");
        this.properties = { width: 512, height: 512, autoclear: true };

        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
    }

    CanvasNode.title = "Canvas";
    CanvasNode.desc = "Canvas to render stuff";

    CanvasNode.prototype.onExecute = function() {
        var canvas = this.canvas;
        var w = this.properties.width | 0;
        var h = this.properties.height | 0;
        if (canvas.width != w) {
            canvas.width = w;
        }
        if (canvas.height != h) {
            canvas.height = h;
        }

        if (this.properties.autoclear) {
            this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        this.setOutputData(0, canvas);
    };

    CanvasNode.prototype.onAction = function(action, param) {
        if (action == "clear") {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    };

    LiteGraph.registerNodeType("graphics/canvas", CanvasNode);

    function DrawImageNode() {
        this.addInput("canvas", "canvas");
        this.addInput("img", "image,canvas");
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.properties = { x: 0, y: 0, opacity: 1 };
    }

    DrawImageNode.title = "DrawImage";
    DrawImageNode.desc = "Draws image into a canvas";

    DrawImageNode.prototype.onExecute = function() {
        var canvas = this.getInputData(0);
        if (!canvas) {
            return;
        }

        var img = this.getInputOrProperty("img");
        if (!img) {
            return;
        }

        var x = this.getInputOrProperty("x");
        var y = this.getInputOrProperty("y");
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, x, y);
    };

    LiteGraph.registerNodeType("graphics/drawImage", DrawImageNode);

    function DrawRectangleNode() {
        this.addInput("canvas", "canvas");
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addInput("w", "number");
        this.addInput("h", "number");
        this.properties = {
            x: 0,
            y: 0,
            w: 10,
            h: 10,
            color: "white",
            opacity: 1
        };
    }

    DrawRectangleNode.title = "DrawRectangle";
    DrawRectangleNode.desc = "Draws rectangle in canvas";

    DrawRectangleNode.prototype.onExecute = function() {
        var canvas = this.getInputData(0);
        if (!canvas) {
            return;
        }

        var x = this.getInputOrProperty("x");
        var y = this.getInputOrProperty("y");
        var w = this.getInputOrProperty("w");
        var h = this.getInputOrProperty("h");
        var ctx = canvas.getContext("2d");
        ctx.fillRect(x, y, w, h);
    };

    LiteGraph.registerNodeType("graphics/drawRectangle", DrawRectangleNode);

    function ImageVideo() {
        this.addInput("t", "number");
        this.addOutputs([["frame", "image"], ["t", "number"], ["d", "number"]]);
        this.properties = { url: "", use_proxy: true };
    }

    ImageVideo.title = "Video";
    ImageVideo.desc = "Video playback";
    ImageVideo.widgets = [
        { name: "play", text: "PLAY", type: "minibutton" },
        { name: "stop", text: "STOP", type: "minibutton" },
        { name: "demo", text: "Demo video", type: "button" },
        { name: "mute", text: "Mute video", type: "button" }
    ];

    ImageVideo.prototype.onExecute = function() {
        if (!this.properties.url) {
            return;
        }

        if (this.properties.url != this._video_url) {
            this.loadVideo(this.properties.url);
        }

        if (!this._video || this._video.width == 0) {
            return;
        }

        var t = this.getInputData(0);
        if (t && t >= 0 && t <= 1.0) {
            this._video.currentTime = t * this._video.duration;
            this._video.pause();
        }

        this._video.dirty = true;
        this.setOutputData(0, this._video);
        this.setOutputData(1, this._video.currentTime);
        this.setOutputData(2, this._video.duration);
        this.setDirtyCanvas(true);
    };

    ImageVideo.prototype.onStart = function() {
        this.play();
    };

    ImageVideo.prototype.onStop = function() {
        this.stop();
    };

    ImageVideo.prototype.loadVideo = function(url) {
        this._video_url = url;

		var pos = url.substr(0,10).indexOf(":");
		var protocol = "";
		if(pos != -1)
			protocol = url.substr(0,pos);

		var host = "";
		if(protocol)
		{
			host = url.substr(0,url.indexOf("/",protocol.length + 3));
			host = host.substr(protocol.length+3);
		}

        if (
            this.properties.use_proxy &&
            protocol &&
            LiteGraph.proxy &&
			host != location.host
        ) {
            url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
        }

        this._video = document.createElement("video");
        this._video.src = url;
        this._video.type = "type=video/mp4";

        this._video.muted = true;
        this._video.autoplay = true;

        var that = this;
        this._video.addEventListener("loadedmetadata", function(e) {
            //onload
            console.log("Duration: " + this.duration + " seconds");
            console.log("Size: " + this.videoWidth + "," + this.videoHeight);
            that.setDirtyCanvas(true);
            this.width = this.videoWidth;
            this.height = this.videoHeight;
        });
        this._video.addEventListener("progress", function(e) {
            //onload
            console.log("video loading...");
        });
        this._video.addEventListener("error", function(e) {
            console.error("Error loading video: " + this.src);
            if (this.error) {
                switch (this.error.code) {
                    case this.error.MEDIA_ERR_ABORTED:
                        console.error("You stopped the video.");
                        break;
                    case this.error.MEDIA_ERR_NETWORK:
                        console.error("Network error - please try again later.");
                        break;
                    case this.error.MEDIA_ERR_DECODE:
                        console.error("Video is broken..");
                        break;
                    case this.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        console.error("Sorry, your browser can't play this video.");
                        break;
                }
            }
        });

        this._video.addEventListener("ended", function(e) {
            console.log("Video Ended.");
            this.play(); //loop
        });

        //document.body.appendChild(this.video);
    };

    ImageVideo.prototype.onPropertyChanged = function(name, value) {
        this.properties[name] = value;
        if (name == "url" && value != "") {
            this.loadVideo(value);
        }

        return true;
    };

    ImageVideo.prototype.play = function() {
        if (this._video && this._video.videoWidth ) { //is loaded
            this._video.play();
        }
    };

    ImageVideo.prototype.playPause = function() {
        if (!this._video) {
            return;
        }
        if (this._video.paused) {
            this.play();
        } else {
            this.pause();
        }
    };

    ImageVideo.prototype.stop = function() {
        if (!this._video) {
            return;
        }
        this._video.pause();
        this._video.currentTime = 0;
    };

    ImageVideo.prototype.pause = function() {
        if (!this._video) {
            return;
        }
        console.log("Video paused");
        this._video.pause();
    };

    ImageVideo.prototype.onWidget = function(e, widget) {
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
    };

    LiteGraph.registerNodeType("graphics/video", ImageVideo);

    // Texture Webcam *****************************************
    function ImageWebcam() {
        this.addOutput("Webcam", "image");
        this.properties = { filterFacingMode: false, facingMode: "user" };
        this.boxcolor = "black";
        this.frame = 0;
    }

    ImageWebcam.title = "Webcam";
    ImageWebcam.desc = "Webcam image";
    ImageWebcam.is_webcam_open = false;

    ImageWebcam.prototype.openStream = function() {
        if (!navigator.mediaDevices.getUserMedia) {
            console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
            return;
        }

        this._waiting_confirmation = true;

        // Not showing vendor prefixes.
        var constraints = {
            audio: false,
            video: !this.properties.filterFacingMode ? true : { facingMode: this.properties.facingMode }
        };
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(this.streamReady.bind(this))
            .catch(onFailSoHard);

        var that = this;
        function onFailSoHard(e) {
            console.log("Webcam rejected", e);
            that._webcam_stream = false;
            ImageWebcam.is_webcam_open = false;
            that.boxcolor = "red";
            that.trigger("stream_error");
        }
    };

    ImageWebcam.prototype.closeStream = function() {
        if (this._webcam_stream) {
            var tracks = this._webcam_stream.getTracks();
            if (tracks.length) {
                for (var i = 0; i < tracks.length; ++i) {
                    tracks[i].stop();
                }
            }
            ImageWebcam.is_webcam_open = false;
            this._webcam_stream = null;
            this._video = null;
            this.boxcolor = "black";
            this.trigger("stream_closed");
        }
    };

    ImageWebcam.prototype.onPropertyChanged = function(name, value) {
        if (name == "facingMode") {
            this.properties.facingMode = value;
            this.closeStream();
            this.openStream();
        }
    };

    ImageWebcam.prototype.onRemoved = function() {
        this.closeStream();
    };

    ImageWebcam.prototype.streamReady = function(localMediaStream) {
        this._webcam_stream = localMediaStream;
        //this._waiting_confirmation = false;
        this.boxcolor = "green";

        var video = this._video;
        if (!video) {
            video = document.createElement("video");
            video.autoplay = true;
            video.srcObject = localMediaStream;
            this._video = video;
            //document.body.appendChild( video ); //debug
            //when video info is loaded (size and so)
            video.onloadedmetadata = function(e) {
                // Ready to go. Do some stuff.
                console.log(e);
                ImageWebcam.is_webcam_open = true;
            };
        }

        this.trigger("stream_ready", video);
    };

    ImageWebcam.prototype.onExecute = function() {
        if (this._webcam_stream == null && !this._waiting_confirmation) {
            this.openStream();
        }

        if (!this._video || !this._video.videoWidth) {
            return;
        }

        this._video.frame = ++this.frame;
        this._video.width = this._video.videoWidth;
        this._video.height = this._video.videoHeight;
        this.setOutputData(0, this._video);
        for (var i = 1; i < this.outputs.length; ++i) {
            if (!this.outputs[i]) {
                continue;
            }
            switch (this.outputs[i].name) {
                case "width":
                    this.setOutputData(i, this._video.videoWidth);
                    break;
                case "height":
                    this.setOutputData(i, this._video.videoHeight);
                    break;
            }
        }
    };

    ImageWebcam.prototype.getExtraMenuOptions = function(graphcanvas) {
        var that = this;
        var txt = !that.properties.show ? "Show Frame" : "Hide Frame";
        return [
            {
                content: txt,
                callback: function() {
                    that.properties.show = !that.properties.show;
                }
            }
        ];
    };

    ImageWebcam.prototype.onDrawBackground = function(ctx) {
        if (
            this.flags.collapsed ||
            this.size[1] <= 20 ||
            !this.properties.show
        ) {
            return;
        }

        if (!this._video) {
            return;
        }

        //render to graph canvas
        ctx.save();
        ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
        ctx.restore();
    };

    ImageWebcam.prototype.onGetOutputs = function() {
        return [
            ["width", "number"],
            ["height", "number"],
            ["stream_ready", LiteGraph.EVENT],
            ["stream_closed", LiteGraph.EVENT],
            ["stream_error", LiteGraph.EVENT]
        ];
    };

    LiteGraph.registerNodeType("graphics/webcam", ImageWebcam);
})(this);
