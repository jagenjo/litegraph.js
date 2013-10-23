var graph = null;
var graphcanvas = null;

$(window).load(function() {

	var id = null;
	if ($.getUrlVar("id") != null)
		id = parseInt($.getUrlVar("id"));
	else if (self.document.location.hash)
		id = parseInt( self.document.location.hash.substr(1) );

	$("#settings_button").click( function() { $("#settings-panel").toggle(); });
	$("#addnode_button").click( function() { onShowNodes() });
	$("#deletenode_button").click( function() { onDeleteNode() });
	$("#clonenode_button").click( function() { onCloneNode() });

	$("#playnode_button").click( function() {
		if(graph.status == LGraph.STATUS_STOPPED)
		{
			$(this).html("<img src='imgs/icon-stop.png'/> Stop");
			graph.start(1); 
		}
		else
		{
			$(this).html("<img src='imgs/icon-play.png'/> Play");
			graph.stop(); 
		}
	});
	
	$("#playstepnode_button").click( function() {
		graph.runStep(1);
		graphcanvas.draw(true,true);
	});
	
	$("#playfastnode_button").click( function() {
		graph.runStep(5000);
		graphcanvas.draw(true,true);
	});
	
	$("#collapsenode_button").click( function() { 
		/*
		for(var i in graphcanvas.nodes_selected)
			graphcanvas.nodes_selected[i].collapse();
		*/
		if(	graphcanvas.node_in_panel )
			graphcanvas.node_in_panel.collapse();

		graphcanvas.draw();
	});

	$("#pinnode_button").click( function() { 
		if(	graphcanvas.node_in_panel )
			graphcanvas.node_in_panel.pin();
	});
	
	$("#sendtobacknode_button").click( function() { 
		if(	graphcanvas.node_in_panel )
			graphcanvas.sendToBack( graphcanvas.node_in_panel );
		graphcanvas.draw(true);
	});



	$("#confirm-createnode_button").click(function() {
		var element = $(".node-type.selected")[0];
		var name = element.data;
		var n = LiteGraph.createNode(name);
		graph.add(n);
		n.pos = graphcanvas.convertOffsetToCanvas([30,30]);
		graphcanvas.draw(true,true);
		$("#modal-blocking-box").hide();
		$("#nodes-browser").hide();
	});

	$("#cancel-createnode_button").click(function() {
		$("#modal-blocking-box").hide();
		$("#nodes-browser").hide();
	});

	$("#close-area_button").click(function() {
		$("#modal-blocking-box").hide();
		$("#data-visor").hide();
	});
	
	$("#confirm-loadsession_button").click(function() {
		var element = $(".session-item.selected")[0];
		var info = element.data;

		var str = localStorage.getItem("graph_session_" + info.id );
		graph.stop();
		graph.unserialize(str);
	
		graphcanvas.draw(true,true);
		$("#modal-blocking-box").hide();
		$("#sessions-browser").hide();
	});

	$("#cancel-loadsession_button").click(function() {
		$("#modal-blocking-box").hide();
		$("#sessions-browser").hide();
	});

	$("#livemode_button").click( function() { 
		graphcanvas.switchLiveMode();
		graphcanvas.draw();
		var url = graphcanvas.live_mode ? "imgs/gauss_bg_medium.jpg" : "imgs/gauss_bg.jpg";
		$("#livemode_button").html(!graphcanvas.live_mode ? "<img src='imgs/icon-record.png'/> Live" : "<img src='imgs/icon-gear.png'/> Edit" );
		//$("canvas").css("background-image","url('"+url+"')");
	});

	$("#newsession_button").click( function() { 
		$("#main-area").hide();
		graph.clear();
		graphcanvas.draw();
		$("#main-area").show();
	});

	$("#savesession_button").click( function() { 
		onSaveSession();
	});

	$("#loadsession_button").click( function() { 
		onLoadSession();
	});

	$("#cancelsession-dialog_button").click(function()
	{
		$("#modal-blocking-box").hide();
		$("#savesession-dialog").hide();
	});

	$("#savesession-dialog_button").click(function()
	{
		var name = $("#session-name-input").val();
		var desc = $("#session-description-input").val();

		saveSession(name,desc);

		$("#modal-blocking-box").hide();
		$("#savesession-dialog").hide();

	});

	$("#closepanel_button").click(function()
	{
		graphcanvas.showNodePanel(null);
	});

	$("#maximize_button").click(function()
	{
		if($("#main").width() != window.innerWidth)
		{
			$("#main").width( (window.innerWidth).toString() + "px");
			$("#main").height( (window.innerHeight - 40).toString() + "px");
			graphcanvas.resizeCanvas(window.innerWidth,window.innerHeight - 100);
		}
		else
		{
			$("#main").width("800px");
			$("#main").height("660px");
			graphcanvas.resizeCanvas(800,600);
		}
	});

	$("#resetscale_button").click(function()
	{
		graph.config.canvas_scale = 1.0;
		graphcanvas.draw(true,true);
	});

	$("#resetpos_button").click(function()
	{
		graph.config.canvas_offset = [0,0];
		graphcanvas.draw(true,true);
	});

	$(".nodecolorbutton").click(function()
	{
		if(	graphcanvas.node_in_panel )
		{
			graphcanvas.node_in_panel.color = this.getAttribute("data-color");
			graphcanvas.node_in_panel.bgcolor = this.getAttribute("data-bgcolor");
		}
		graphcanvas.draw(true,true);
	});
	
	
	if ("onhashchange" in window) // does the browser support the hashchange event?
	{
		window.onhashchange = function () {
			var h = window.location.hash.substr(1);
			//action
			return false;
		}
	}

	LiteGraph.node_images_path = "../nodes_data/";
	graph = new LGraph();
	graphcanvas = new LGraphCanvas("graphcanvas",graph);
	graphcanvas.background_image = "imgs/grid.png";

	graph.onAfterExecute = function() { graphcanvas.draw(true) };
	demo();

	graph.onPlayEvent = function()
	{
		$("#playnode_button").addClass("playing");
		$("#playnode_button").removeClass("stopped");
	}

	graph.onStopEvent = function()
	{
		$("#playnode_button").addClass("stopped");
		$("#playnode_button").removeClass("playing");
	}

	graphcanvas.draw();

	//update load counter
	setInterval(function() {
		$("#cpuload .fgload").width( (2*graph.elapsed_time) * 90);
		if(graph.status == LGraph.STATUS_RUNNING)
			$("#gpuload .fgload").width( (graphcanvas.render_time*10) * 90);
		else
			$("#gpuload .fgload").width( 4 );
	},200);

	//LiteGraph.run(100);
});


function onShowNodes()
{
	$("#nodes-list").empty();

	for (var i in LiteGraph.registered_node_types)
	{
		var node = LiteGraph.registered_node_types[i];
		var categories = node.category.split("/");

		//create categories and find the propper one
		var root = $("#nodes-list")[0];
		for(var i in categories)
		{
			var result = $(root).find("#node-category_" + categories[i] + " .container");
			if (result.length == 0)
			{
				var element = document.createElement("div");
				element.id = "node-category_" + categories[i];
				element.className = "node-category";
				element.data = categories[i];
				element.innerHTML = "<strong class='title'>"+categories[i]+"</strong>";
				root.appendChild(element);

				$(element).find(".title").click(function(e){
					var element = $("#node-category_" + this.parentNode.data + " .container");
					$(element[0]).toggle();
				});


				var container = document.createElement("div");
				container.className = "container";
				element.appendChild(container);

				root = container;
			}
			else
				root = result[0];
		}

		//create entry
		var type = node.type;
		var element = document.createElement("div");
		element.innerHTML = "<strong>"+node.title+"</strong> " + (node.desc? node.desc : "");
		element.className = "node-type";
		element.id = "node-type-" + node.name;
		element.data = type;
		root.appendChild(element);
	}

	$(".node-type").click( function() { 
		$(".node-type.selected").removeClass("selected");
		$(this).addClass("selected");
		$("#confirm-createnode_button").attr("disabled",false);
	});

	$(".node-type").dblclick( function() { 
		$("#confirm-createnode_button").click();
	});

	$("#confirm-createnode_button").attr("disabled",true);

	$("#modal-blocking-box").show();
	$("#nodes-browser").show();
}

function onDeleteNode()
{
	if(!graphcanvas.node_in_panel) return;

	graph.remove( graphcanvas.node_in_panel );	
	graphcanvas.draw();
	$("#node-panel").hide();
	graphcanvas.node_in_panel = null;
}

function onCloneNode()
{
	if(!graphcanvas.node_in_panel) return;

	var n = graphcanvas.node_in_panel.clone();	
	n.pos[0] += 10;
	n.pos[1] += 10;

	graph.add(n);
	graphcanvas.draw();
}

function onSaveSession()
{
	if(graph.session["name"])
		$("#session-name-input").val(graph.session["name"]);

	if(graph.session["description"])
		$("#session-desc-input").val(graph.session["description"]);

	$("#modal-blocking-box").show();
	$("#savesession-dialog").show();
	//var str = LiteGraph.serialize();
	//localStorage.setItem("graph_session",str);
}

function saveSession(name,desc)
{
	desc = desc || "";

	graph.session["name"] = name;
	graph.session["description"] = desc;
	if(!graph.session["id"])
		graph.session["id"] = new Date().getTime();

	var str = graph.serializeSession();
	localStorage.setItem("graph_session_" + graph.session["id"],str);

	var sessions_str = localStorage.getItem("node_sessions");
	var sessions = [];

	if(sessions_str)
		sessions = JSON.parse(sessions_str);

	var pos = -1;
	for(var i = 0; i < sessions.length; i++)
		if( sessions[i].id == graph.session["id"] && sessions[i].name == name)
		{
			pos = i;
			break;
		}

	if(pos != -1)
	{	
		//already on the list
	}
	else
	{
		var current_session = {name:name, desc:desc, id:graph.session["id"]};
		sessions.unshift(current_session);
		localStorage.setItem("graph_sessions", JSON.stringify(sessions));
	}
}

function onLoadSession()
{
	$("#sessions-browser-list").empty();

	$("#modal-blocking-box").show();
	$("#sessions-browser").show();

	var sessions_str = localStorage.getItem("graph_sessions");
	var sessions = [];

	if(sessions_str)
		sessions = JSON.parse(sessions_str);

	for(var i in sessions)
	{
		var element = document.createElement("div");
		element.className = "session-item";
		element.data = sessions[i];
		$(element).html("<strong>"+sessions[i].name+"</strong><span>"+sessions[i].desc+"</span><span class='delete_session'>x</span>");
		$("#sessions-browser-list").append(element);
	}

	$(".session-item").click( function() { 
		$(".session-item.selected").removeClass("selected");
		$(this).addClass("selected");
		$("#confirm-loadsession_button").attr("disabled",false);
	});

	$(".session-item").dblclick( function() { 
		$("#confirm-loadsession_button").click();
	});

	$(".delete_session").click(function(e) {
		var root =  $(this).parent();
		var info = root[0].data;

		var sessions_str = localStorage.getItem("graph_sessions");
		var sessions = [];
		if(sessions_str)
			sessions = JSON.parse(sessions_str);
		var pos = -1;
		for(var i = 0; i < sessions.length; i++)
			if( sessions[i].id == info.id )
			{
				pos = i;
				break;
			}

		if(pos != -1)
		{
			sessions.splice(pos,1);
			localStorage.setItem("graph_sessions", JSON.stringify(sessions));
		}

		root.remove();
	});

	$("#confirm-loadsession_button").attr("disabled",true);

	/*
	LiteGraph.stop();
	var str = localStorage.getItem("graph_session");
	LiteGraph.unserialize(str);
	LiteGraph.draw();
	*/
}

function onShagraph()
{

}

function showImage(data)
{
	var img = new Image();
	img.src = data;
	$("#data-visor .content").empty();
	$("#data-visor .content").append(img);
	$("#modal-blocking-box").show();
	$("#data-visor").show();
}

function showElement(data)
{
	setTimeout(function(){
		$("#data-visor .content").empty();
		$("#data-visor .content").append(data);
		$("#modal-blocking-box").show();
		$("#data-visor").show();
	},100);
}


// ********* SEEDED RANDOM ******************************
function RandomNumberGenerator(seed)
{
	if (typeof(seed) == 'undefined')
	{
		var d = new Date();
		this.seed = 2345678901 + (d.getSeconds() * 0xFFFFFF) + (d.getMinutes() * 0xFFFF);
	}
	else
		this.seed = seed;

	this.A = 48271;
	this.M = 2147483647;
	this.Q = this.M / this.A;
	this.R = this.M % this.A;
	this.oneOverM = 1.0 / this.M;
	this.next = nextRandomNumber;
	return this;
}

function nextRandomNumber(){
  var hi = this.seed / this.Q;
  var lo = this.seed % this.Q;
  var test = this.A * lo - this.R * hi;
  if(test > 0){
    this.seed = test;
  } else {
    this.seed = test + this.M;
  }
  return (this.seed * this.oneOverM);
}

var RAND_GEN = RandomNumberGenerator(0);

function RandomSeed(s) { RAND_GEN = RandomNumberGenerator(s); };

function myrand(Min, Max){
  return Math.round((Max-Min) * RAND_GEN.next() + Min);
}

function myrandom() { return myrand(0,100000) / 100000; }

// @format (hex|rgb|null) : Format to return, default is integer
function random_color(format)
{
 var rint = Math.round(0xffffff * myrandom());
 switch(format)
 {
  case 'hex':
   return ('#0' + rint.toString(16)).replace(/^#0([0-9a-f]{6})$/i, '#$1');
  break;
  
  case 'rgb':
   return 'rgb(' + (rint >> 16) + ',' + (rint >> 8 & 255) + ',' + (rint & 255) + ')';
  break;
  
  default:
   return rint;
  break;
 }
}

$.extend({
  getUrlVars: function(){
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1];
    }
    return vars;
  },
  getUrlVar: function(name){
    return $.getUrlVars()[name];
  }
});

function trace(a)
{
	if(typeof(console) == "object")
		console.log(a);
}