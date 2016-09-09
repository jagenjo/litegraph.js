
function demo()
{
	multiConnection();
}

function multiConnection()
{


	var node_button = LiteGraph.createNode("widget/button");
	node_button.pos = [100,400];
	graph.add(node_button);

	var node_console = LiteGraph.createNode("basic/console");
	node_console.pos = [400,400];
	graph.add(node_console);
	node_button.connect(0, node_console );

	var node_const_A = LiteGraph.createNode("basic/const");
	node_const_A.pos = [200,200];
	graph.add(node_const_A);
	node_const_A.setValue(4.5);

	var node_const_B = LiteGraph.createNode("basic/const");
	node_const_B.pos = [200,300];
	graph.add(node_const_B);
	node_const_B.setValue(10);

	var node_math = LiteGraph.createNode("math/operation");
	node_math.pos = [400,200];
	graph.add(node_math);

	var node_watch = LiteGraph.createNode("basic/watch");
	node_watch.pos = [700,200];
	graph.add(node_watch);

	var node_watch2 = LiteGraph.createNode("basic/watch");
	node_watch2.pos = [700,300];
	graph.add(node_watch2);

	node_const_A.connect(0,node_math,0 );
	node_const_B.connect(0,node_math,1 );
	node_math.connect(0,node_watch,0 );
	node_math.connect(0,node_watch2,0 );
}

function sortTest()
{
	var rand = LiteGraph.createNode("math/rand",null, {pos: [10,100] });
	graph.add(rand);

	var nodes = [];
	for(var i = 4; i >= 1; i--)
	{
		var n = LiteGraph.createNode("basic/watch",null, {pos: [i * 120,100] });
		graph.add(n);
		nodes[i-1] = n;
	}

	rand.connect(0, nodes[0], 0);

	for(var i = 0; i < nodes.length - 1; i++)
		nodes[i].connect(0,nodes[i+1], 0);
}

function benchmark()
{
	var num_nodes = 500;
	var consts = [];
	for(var i = 0; i < num_nodes; i++)
	{
		var n = LiteGraph.createNode("math/rand",null, {pos: [(2000 * Math.random())|0, (2000 * Math.random())|0] });
		graph.add(n);
		consts.push(n);
	}

	var watches = [];
	for(var i = 0; i < num_nodes; i++)
	{
		var n = LiteGraph.createNode("basic/watch",null, {pos: [(2000 * Math.random())|0, (2000 * Math.random())|0] });
		graph.add(n);
		watches.push(n);
	}

	for(var i = 0; i < num_nodes; i++)
		consts[ (Math.random() * consts.length)|0 ].connect(0, watches[ (Math.random() * watches.length)|0 ], 0 );
}