
LiteGraph.node_images_path = "../nodes_data/";
var editor = new LiteGraph.Editor("main");
window.graphcanvas = editor.graphcanvas;
window.graph = editor.graph;
window.addEventListener("resize", function() { editor.graphcanvas.resize(); } );
demo();

function trace(a)
{
	if(typeof(console) == "object")
		console.log(a);
}