

//Creates an interface to access extra features from a graph (like play, stop, live, etc)
const Editor = class {
	
	constructor(container_id, options){
		
		console.assert(typeof container_id === 'string');
		const parent = document.getElementById(container_id);
		console.assert(parent instanceof HTMLElement);	
		
		options ||= {};

		const root = this.root = document.createElement("div");
		root.className = "litegraph litegraph-editor";
		root.innerHTML = `
		<div class='header'>
			<div class='tools tools-left'></div>
			<div class='tools tools-right'></div>
		</div>
		<div class='content'>
			<div class='editor-area'>
				<canvas class='graphcanvas' width='1000' height='500' tabindex=10></canvas>
			</div>
		</div>
		<div class='footer'>
			<div class='tools tools-left'></div>
			<div class='tools tools-right'></div>
		</div>`;

		this.tools = root.querySelector(".tools");
		this.content = root.querySelector(".content");
		this.footer = root.querySelector(".footer");
		const canvas = this.canvas = root.querySelector(".graphcanvas");

		//create graph
		const graph = this.graph = new LiteGraph.LGraph();
		const graphcanvas = this.graphcanvas = new LiteGraph.LGraphCanvas(canvas, graph);
		
		graphcanvas.background_image = "imgs/grid.png";
		
		graph.onAfterExecute = function(){
			graphcanvas.draw(true);
		}.bind(this);
		graphcanvas.onDropItem = this.onDropItem.bind(this);

		//add stuff
		//this.addToolsButton("loadsession_button","Load","imgs/icon-load.png", this.onLoadButton.bind(this), ".tools-left" );
		//this.addToolsButton("savesession_button","Save","imgs/icon-save.png", this.onSaveButton.bind(this), ".tools-left" );
		this.addLoadCounter();
		this.addToolsButton(
			"playnode_button",
			"Play",
			"imgs/icon-play.png",
			this.onPlayButton.bind(this),
			".tools-right"
		);
		this.addToolsButton(
			"playstepnode_button",
			"Step",
			"imgs/icon-playstep.png",
			this.onPlayStepButton.bind(this),
			".tools-right"
		);

		if (!options.skip_livemode) {
			this.addToolsButton(
				"livemode_button",
				"Live",
				"imgs/icon-record.png",
				this.onLiveButton.bind(this),
				".tools-right"
			);
		}
		if (!options.skip_maximize) {
			this.addToolsButton(
				"maximize_button",
				"",
				"imgs/icon-maximize.png",
				this.onFullscreenButton.bind(this),
				".tools-right"
			);
		}
		if (options.miniwindow) {
			this.addMiniWindow(300, 200);
		}

		//append to DOM
		parent.appendChild(root);
		graphcanvas.resize();
	}
	
	addLoadCounter() {
		const meter = document.createElement("div");
		meter.className = "headerpanel loadmeter toolbar-widget";
		meter.innerHTML = `
		<div class='cpuload'>
			<strong>CPU</strong> 
			<div class='bgload'>
				<div class='fgload'></div>
			</div>
		</div>
		<div class='gpuload'>
			<strong>GFX</strong>
			<div class='bgload'>
				<div class='fgload'></div>
			</div>
		</div>`;

		const parent = this.root.querySelector(".header .tools-left");
		console.assert(parent instanceof HTMLElement);
		parent.appendChild(meter);
		
		setInterval(() => {
			meter.querySelector(".cpuload .fgload").style.width = `${2 * this.graph.execution_time * 90}px`;
			if (this.graph.status == LGraph.STATUS_RUNNING) {
				meter.querySelector(".gpuload .fgload").style.width = `${this.graphcanvas.render_time * 10 * 90}px`;
			} else {
				meter.querySelector(".gpuload .fgload").style.width = `4px`;
			}
		}, 200);
	}

	addToolsButton( id, name, icon_url, callback, container = '.tools') {
    
		// DEV: are any of these arguments mandatory?
		
		const button = this.createButton(name, icon_url, callback);
		button.id = id;
		const parent = this.root.querySelector(container);
		console.assert(parent instanceof HTMLElement);
		parent.appendChild(button);
	}

	createButton(name, icon_url, callback) {
		const button = document.createElement("button");
		if (typeof icon_url === 'string') {
			const img = document.createElement('img');
			img.src = icon_url;
			button.appendChild(img);
		}
		button.classList.add("btn");
		if(typeof name == 'string') {
			button.innerHTML += name;
		}
		if(callback) {
			console.assert(typeof callback === 'function');
			button.addEventListener("click", callback );
		}
		return button;
	}	
	
	onLoadButton() {
		const panel = this.graphcanvas.createPanel("Load session",{closable:true});
		console.assert(panel instanceof HTMLElement);
		
		// DEV: This is a missing feature meant to load JSON from the specified file
		
	    this.root.appendChild(panel);
	}
	
	onSaveButton() {
		
		// DEV: This is a missing feature meant to save JSON to a specified file
		
	}
	
	onPlayButton() {
		
		// DEV: This toggles the play button.  There is still a bug where changing graphs while
		// playing will cause the button label to be backwards.
		
		const graph = this.graph;
		const button = this.root.querySelector("#playnode_button");
		console.assert(button instanceof HTMLElement);

		if (graph.status === LiteGraph.LGraph.STATUS_STOPPED) {
			
			// DEV: change this to use DOM
			
			button.innerHTML = "<img src='imgs/icon-stop.png'/> Stop";
			graph.start();
		} else {
			button.innerHTML = "<img src='imgs/icon-play.png'/> Play";
			graph.stop();
		}
	}
	
	onPlayStepButton() {
		this.graph.runStep(1);
		this.graphcanvas.draw(true, true);
	}
	
	onLiveButton() {
		let is_live_mode = this.graphcanvas.live_mode;
		
		this.graphcanvas.switchLiveMode(true);
		this.graphcanvas.draw();
		
		const button = this.root.querySelector("#livemode_button");
		console.assert(button instanceof HTMLElement);
		
		// DEV: change this to use DOM
		
		button.innerHTML = is_live_mode
			? "<img src='imgs/icon-record.png'/> Live"
			: "<img src='imgs/icon-gear.png'/> Edit";
	}
	
	onDropItem = (e) => {
		for (let i = 0; i < e.dataTransfer.files.length; ++i) {
			const file = e.dataTransfer.files[i];
			const ext = LiteGraph.LGraphCanvas.getFileExtension(file.name);
			const reader = new FileReader();
			if (ext == "json") {
				reader.onload = (event) => {
					try {
						const data = JSON.parse(event.target.result);
						this.graph.configure(data);
					} catch (error) {
						console.error("Error parsing JSON:", error);
					}
				};
				reader.onerror = (event) => {
					console.error("Error reading file:", event.target.error);
				};
				reader.readAsText(file);
			}
		}
	}
	
	goFullscreen() {
		if (this.root.requestFullscreen) {
			this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} else if (this.root.mozRequestFullscreen) {
			this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} else if (this.root.webkitRequestFullscreen) {
			this.root.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} else {
			throw "Fullscreen not supported";
		}

		setTimeout(() => {
			this.graphcanvas.resize();
		}, 100);
	}
	
	onFullscreenButton = function() {
		
		// DEV: This only enters fullscreen, it does not toggle it or leave it.
		
		this.goFullscreen();
	}
}


Editor.prototype.addMiniWindow = function(w, h) {
    var miniwindow = document.createElement("div");
    miniwindow.className = "litegraph miniwindow";
    miniwindow.innerHTML =
        "<canvas class='graphcanvas' width='" +
        w +
        "' height='" +
        h +
        "' tabindex=10></canvas>";
    var canvas = miniwindow.querySelector("canvas");
    var that = this;

    var graphcanvas = new LiteGraph.LGraphCanvas( canvas, this.graph );
    graphcanvas.show_info = false;
    graphcanvas.background_image = "imgs/grid.png";
    graphcanvas.scale = 0.25;
    graphcanvas.allow_dragnodes = false;
    graphcanvas.allow_interaction = false;
    graphcanvas.render_shadows = false;
    graphcanvas.max_zoom = 0.25;
    this.miniwindow_graphcanvas = graphcanvas;
    graphcanvas.onClear = function() {
        graphcanvas.scale = 0.25;
        graphcanvas.allow_dragnodes = false;
        graphcanvas.allow_interaction = false;
    };
    graphcanvas.onRenderBackground = function(canvas, ctx) {
        ctx.strokeStyle = "#567";
        var tl = that.graphcanvas.convertOffsetToCanvas([0, 0]);
        var br = that.graphcanvas.convertOffsetToCanvas([
            that.graphcanvas.canvas.width,
            that.graphcanvas.canvas.height
        ]);
        tl = this.convertCanvasToOffset(tl);
        br = this.convertCanvasToOffset(br);
        ctx.lineWidth = 1;
        ctx.strokeRect(
            Math.floor(tl[0]) + 0.5,
            Math.floor(tl[1]) + 0.5,
            Math.floor(br[0] - tl[0]),
            Math.floor(br[1] - tl[1])
        );
    };

    miniwindow.style.position = "absolute";
    miniwindow.style.top = "4px";
    miniwindow.style.right = "4px";

    var close_button = document.createElement("div");
    close_button.className = "corner-button";
    close_button.innerHTML = "&#10060;";
    close_button.addEventListener("click", function(e) {
        graphcanvas.setGraph(null);
        miniwindow.parentNode.removeChild(miniwindow);
    });
    miniwindow.appendChild(close_button);

    this.root.querySelector(".content").appendChild(miniwindow);
};

Editor.prototype.addMultiview = function()
{
	var canvas = this.canvas;
	this.graphcanvas.ctx.fillStyle = "black";
	this.graphcanvas.ctx.fillRect(0,0,canvas.width,canvas.height);
	this.graphcanvas.viewport = [0,0,canvas.width*0.5-2,canvas.height];

	var graphcanvas = new LiteGraph.LGraphCanvas( canvas, this.graph );
    graphcanvas.background_image = "imgs/grid.png";
    this.graphcanvas2 = graphcanvas;
	this.graphcanvas2.viewport = [canvas.width*0.5,0,canvas.width*0.5,canvas.height];
}

LiteGraph.Editor = Editor;
