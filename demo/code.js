
LiteGraph.node_images_path = "../nodes_data/";
var editor = new LiteGraph.Editor("main");
window.graphcanvas = editor.graphcanvas;
window.graph = editor.graph;
window.addEventListener("resize", function() { editor.graphcanvas.resize(); } );


//create scene selector
var elem = document.createElement("span");
elem.className = "selector";
elem.innerHTML = "Demo <select><option>Empty</option></select> <button id='save'>Save</button><button id='load'>Load</button>";
editor.tools.appendChild(elem);
var select = elem.querySelector("select");
select.addEventListener("change", function(e){
	var option = this.options[this.selectedIndex];
	var url = option.dataset["url"];
	
	if(url)
		graph.load( url );
	else
		graph.clear();
});

elem.querySelector("#save").addEventListener("click",function(){
	console.log("saved");
	localStorage.setItem( "graphdemo_save", JSON.stringify( graph.serialize() ) );
});

elem.querySelector("#load").addEventListener("click",function(){
	var data = localStorage.getItem( "graphdemo_save" );
	if(data)
		graph.configure( JSON.parse( data ) );
	console.log("loaded");
});

function addDemo( name, url )
{
	var option = document.createElement("option");
	option.dataset["url"] = url;
	option.innerHTML = name;
	select.appendChild( option );
}

//some examples
addDemo("Audio", "examples/audio.json");
addDemo("Audio Delay", "examples/audio_delay.json");
addDemo("Audio Reverb", "examples/audio_reverb.json");


