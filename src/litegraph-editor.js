//Creates an interface to access extra features from a graph (like play, stop, live, etc)
function Editor(container_id, options) {
    options = options || {};

    //fill container
    var html = "<div class='header'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";
    html += "<div class='content'><div class='editor-area'><canvas class='graphcanvas' width='1000' height='500' tabindex=10></canvas></div></div>";
    html += "<div class='footer'><div class='tools tools-left'></div><div class='tools tools-right'></div></div>";

    var root = document.createElement("div");
    this.root = root;
    root.className = "litegraph-editor";
    root.innerHTML = html;

    this.tools = root.querySelector(".tools");
    this.content = root.querySelector(".content");
    this.footer = root.querySelector(".footer");

    var canvas = root.querySelector(".graphcanvas");

    //create graph
    var graph = (this.graph = new LGraph());
    var graphcanvas = (this.graphcanvas = new LGraphCanvas(canvas, graph));
    graphcanvas.background_image = "imgs/grid.png";
    graph.onAfterExecute = function() {
        graphcanvas.draw(true);
    };

	graphcanvas.onDropItem = this.onDropItem.bind(this);
	graphcanvas.onShowNodePanel = this.onShowNodePanel.bind(this);

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
    var parent = document.getElementById(container_id);
    if (parent) {
        parent.appendChild(root);
    }

    graphcanvas.resize();
    //graphcanvas.draw(true,true);
}

Editor.prototype.addLoadCounter = function() {
    var meter = document.createElement("div");
    meter.className = "headerpanel loadmeter toolbar-widget";

    var html =
        "<div class='cpuload'><strong>CPU</strong> <div class='bgload'><div class='fgload'></div></div></div>";
    html +=
        "<div class='gpuload'><strong>GFX</strong> <div class='bgload'><div class='fgload'></div></div></div>";

    meter.innerHTML = html;
    this.root.querySelector(".header .tools-left").appendChild(meter);
    var self = this;

    setInterval(function() {
        meter.querySelector(".cpuload .fgload").style.width =
            2 * self.graph.execution_time * 90 + "px";
        if (self.graph.status == LGraph.STATUS_RUNNING) {
            meter.querySelector(".gpuload .fgload").style.width =
                self.graphcanvas.render_time * 10 * 90 + "px";
        } else {
            meter.querySelector(".gpuload .fgload").style.width = 4 + "px";
        }
    }, 200);
};

Editor.prototype.addToolsButton = function( id, name, icon_url, callback, container ) {
    if (!container) {
        container = ".tools";
    }

    var button = this.createButton(name, icon_url, callback);
    button.id = id;
    this.root.querySelector(container).appendChild(button);
};

Editor.prototype.createPanel = function(title, options) {
	options = options || {};

    var ref_window = options.window || window;
    var root = document.createElement("div");
    root.className = "dialog";
    root.innerHTML = "<div class='dialog-header'><span class='dialog-title'></span></div><div class='dialog-content'></div><div class='dialog-footer'></div>";
    root.header = root.querySelector(".dialog-header");
	if(options.closable)
	{
	    var close = document.createElement("span");
		close.innerHTML = "&#10005;";
		close.classList.add("close");
		close.addEventListener("click",function(){
			root.close();
		});
		root.header.appendChild(close);
	}
    root.title_element = root.querySelector(".dialog-title");
	root.title_element.innerText = title;
    root.content = root.querySelector(".dialog-content");
    root.footer = root.querySelector(".dialog-footer");
	root.close = function()
	{
		this.parentNode.removeChild(this);
	}

	root.addHTML = function(code, classname)
	{
		var elem = document.createElement("div");
		if(classname)
			elem.className = classname;
		elem.innerHTML = code;
		root.content.appendChild(elem);
		return elem;
	}

	root.addButton = function( name, callback, options )
	{
		var elem = document.createElement("button");
		elem.innerText = name;
		elem.options = options;
		elem.addEventListener("click",callback);
		root.footer.appendChild(elem);
		return elem;
	}

	root.addSeparator = function()
	{
		var elem = document.createElement("div");
		elem.className = "separator";
		root.content.appendChild(elem);
	}

	root.addWidget = function( type, name, value, options, callback )
	{
		options = options || {};
		var str_value = String(value);
		if(type == "number")
			str_value = value.toFixed(3);

		var elem = document.createElement("div");
		elem.className = "property";
		elem.innerHTML = "<span class='property_name'></span><span class='property_value'></span>";
		elem.querySelector(".property_name").innerText = name;
		var value_element = elem.querySelector(".property_value");
		value_element.innerText = str_value;
		elem.dataset["property"] = name;
		elem.dataset["type"] = options.type || type;
		elem.options = options;
		elem.value = value;

		//if( type == "code" )
		//	elem.addEventListener("click", function(){ inner_showCodePad( node, this.dataset["property"] ); });
		if (type == "boolean")
		{
			elem.classList.add("boolean");
			if(value)
				elem.classList.add("bool-on");
			elem.addEventListener("click", function(){ 
				//var v = node.properties[this.dataset["property"]]; 
				//node.setProperty(this.dataset["property"],!v); this.innerText = v ? "true" : "false"; 
				var propname = this.dataset["property"];
				this.value = !this.value;
				this.classList.toggle("bool-on");
				this.querySelector(".property_value").innerText = this.value ? "true" : "false";
				innerChange(propname, this.value );
			});
		}
		else if (type == "string" || type == "number")
		{
			value_element.setAttribute("contenteditable",true);
			value_element.addEventListener("keydown", function(e){ 
				if(e.code == "Enter")
				{
					e.preventDefault();
					this.blur();
				}
			});
			value_element.addEventListener("blur", function(){ 
				var v = this.innerText;
				var propname = this.parentNode.dataset["property"];
				var proptype = this.parentNode.dataset["type"];
				if( proptype == "number")
					v = Number(v);
				innerChange(propname, v);
			});
		}
		else if (type == "enum")
			value_element.addEventListener("click", function(event){ 
				var values = options.values || [];
				var propname = this.parentNode.dataset["property"];
				var elem_that = this;
				var menu = new LiteGraph.ContextMenu(values,{
						event: event,
						className: "dark",
						callback: inner_clicked
					},
					ref_window);
				function inner_clicked(v, option, event) {
					//node.setProperty(propname,v); 
					//graphcanvas.dirty_canvas = true;
					elem_that.innerText = v;
					innerChange(propname,v);
					return false;
				}
			});

		root.content.appendChild(elem);

		function innerChange(name, value)
		{
			console.log("change",name,value);
			//that.dirty_canvas = true;
			if(options.callback)
				options.callback(name,value);
			if(callback)
				callback(name,value);
		}

		return elem;
	}

    return root;
};

Editor.prototype.createButton = function(name, icon_url, callback) {
    var button = document.createElement("button");
    if (icon_url) {
        button.innerHTML = "<img src='" + icon_url + "'/> ";
    }
    button.innerHTML += name;
	if(callback)
		button.addEventListener("click", callback );
    return button;
};

Editor.prototype.onLoadButton = function() {
    var panel = this.createPanel("Load session",{closable:true});
	//TO DO

    this.root.appendChild(panel);
};

Editor.prototype.onSaveButton = function() {};

Editor.prototype.onPlayButton = function() {
    var graph = this.graph;
    var button = this.root.querySelector("#playnode_button");

    if (graph.status == LGraph.STATUS_STOPPED) {
        button.innerHTML = "<img src='imgs/icon-stop.png'/> Stop";
        graph.start();
    } else {
        button.innerHTML = "<img src='imgs/icon-play.png'/> Play";
        graph.stop();
    }
};

Editor.prototype.onPlayStepButton = function() {
    var graph = this.graph;
    graph.runStep(1);
    this.graphcanvas.draw(true, true);
};

Editor.prototype.onLiveButton = function() {
    var is_live_mode = !this.graphcanvas.live_mode;
    this.graphcanvas.switchLiveMode(true);
    this.graphcanvas.draw();
    var url = this.graphcanvas.live_mode
        ? "imgs/gauss_bg_medium.jpg"
        : "imgs/gauss_bg.jpg";
    var button = this.root.querySelector("#livemode_button");
    button.innerHTML = !is_live_mode
        ? "<img src='imgs/icon-record.png'/> Live"
        : "<img src='imgs/icon-gear.png'/> Edit";
};

Editor.prototype.onDropItem = function(e)
{
	var that = this;
	for(var i = 0; i < e.dataTransfer.files.length; ++i)
	{
		var file = e.dataTransfer.files[i];
		var ext = LGraphCanvas.getFileExtension(file.name);
		var reader = new FileReader();
		if(ext == "json")
		{
			reader.onload = function(event) {
				var data = JSON.parse( event.target.result );
				that.graph.configure(data);
			};
			reader.readAsText(file);
		}
	}
}

//shows the left side panel with the node info
Editor.prototype.onShowNodePanel = function(node)
{
	window.SELECTED_NODE = node;
	var panel = document.querySelector("#node-panel");
	if(panel)
		panel.close();
    var ref_window = this.graphcanvas.getCanvasWindow();
	panel = this.createPanel(node.title || "",{closable: true, window: ref_window });
	panel.id = "node-panel";
	panel.classList.add("settings");
	var that = this;
	var graphcanvas = this.graphcanvas;

	function inner_refresh()
	{
		panel.content.innerHTML = ""; //clear
		panel.addHTML("<span class='node_type'>"+node.type+"</span><span class='node_desc'>"+(node.constructor.desc || "")+"</span><span class='separator'></span>");

		panel.addHTML("<h3>Properties</h3>");

		for(var i in node.properties)
		{
			var value = node.properties[i];
			var info = node.getPropertyInfo(i);
			var type = info.type || "string";

			//in case the user wants control over the side panel widget
			if( node.onAddPropertyToPanel && node.onAddPropertyToPanel(i,panel) )
				continue;

			panel.addWidget( info.widget || info.type, i, value, info, function(name,value){
				node.setProperty(name,value);
				graphcanvas.dirty_canvas = true;
			});
		}

		panel.addSeparator();

		/*
		panel.addHTML("<h3>Connections</h3>");
		var connection_containers = panel.addHTML("<div class='inputs connections_side'></div><div class='outputs connections_side'></div>","connections");
		var inputs = connection_containers.querySelector(".inputs");
		var outputs = connection_containers.querySelector(".outputs");
		*/


		panel.addButton("Delete",function(){
            node.graph.remove(node);
			panel.close();
		}).classList.add("delete");
	}

	function inner_showCodePad( node, propname )
	{
		panel.style.top = "calc( 50% - 250px)";
		panel.style.left = "calc( 50% - 400px)";
		panel.style.width = "800px";
		panel.style.height = "500px";

		if(window.CodeFlask) //disabled for now
		{
			panel.content.innerHTML = "<div class='code'></div>";
			var flask = new CodeFlask( "div.code", { language: 'js' });
			flask.updateCode(node.properties[propname]);
			flask.onUpdate( function(code) {
				node.setProperty(propname, code);
			});
		}
		else
		{
			panel.content.innerHTML = "<textarea class='code'></textarea>";
			var textarea = panel.content.querySelector("textarea");
			textarea.value = node.properties[propname];
			textarea.addEventListener("keydown", function(e){
				//console.log(e);
				if(e.code == "Enter" && e.ctrlKey )
				{
					console.log("Assigned");
					node.setProperty(propname, textarea.value);
				}
			});
			textarea.style.height = "calc(100% - 40px)";
		}
		var assign = that.createButton( "Assign", null, function(){
			node.setProperty(propname, textarea.value);
		});
		panel.content.appendChild(assign);
		var button = that.createButton( "Close", null, function(){
			panel.style.height = "";
			inner_refresh();
		});
		button.style.float = "right";
		panel.content.appendChild(button);
	}

	inner_refresh();

	this.content.appendChild( panel );
}

Editor.prototype.goFullscreen = function() {
    if (this.root.requestFullscreen) {
        this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if (this.root.mozRequestFullscreen) {
        this.root.requestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else if (this.root.webkitRequestFullscreen) {
        this.root.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else {
        throw "Fullscreen not supported";
    }

    var self = this;
    setTimeout(function() {
        self.graphcanvas.resize();
    }, 100);
};

Editor.prototype.onFullscreenButton = function() {
    this.goFullscreen();
};

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

    var graphcanvas = new LGraphCanvas(canvas, this.graph);
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

LiteGraph.Editor = Editor;
