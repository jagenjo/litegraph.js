
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

function CopyPasteWithConnectionToUnselectedOutputTest()
{
	// number
	var nodeConstA = LiteGraph.createNode("basic/const");
	nodeConstA.pos = [200,200];
	graph.add(nodeConstA);
	nodeConstA.setValue(4.5);

	// number
	var nodeConstB = LiteGraph.createNode("basic/const");
	nodeConstB.pos = [200,300];
	graph.add(nodeConstB);
	nodeConstB.setValue(10);

	// math
	var nodeMath = LiteGraph.createNode("math/operation");
	nodeMath.pos = [400,200];
	graph.add(nodeMath);

	// connection
	nodeConstA.connect(0,nodeMath,0 );
	nodeConstB.connect(0,nodeMath,1 );

	// copy with unselected nodes connected
	graphcanvas.selectNodes([nodeMath]);
	graphcanvas.copyToClipboard();
	graphcanvas.pasteFromClipboard(true);

	var count = 1;
	var lastNode = null;
	for (const [key, element] of Object.entries(graphcanvas.selected_nodes)) {
		element.pos = [nodeMath.pos[0], nodeMath.pos[1] + 100 * count];
		lastNode = element
		count++;
	}

	// copy with unselected nodes unconnected
	graphcanvas.pasteFromClipboard(false);
	var count = 1;
	for (const [key, element] of Object.entries(graphcanvas.selected_nodes)) {
		element.pos = [nodeMath.pos[0], lastNode.pos[1] + 100 * count];
		count++;
	}
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
	var num_nodes = 200;
	var nodes = [];
	for(var i = 0; i < num_nodes; i++)
	{
		var n = LiteGraph.createNode("basic/watch",null, {pos: [(2000 * Math.random())|0, (2000 * Math.random())|0] });
		graph.add(n);
		nodes.push(n);
	}

	for(var i = 0; i < nodes.length; i++)
		nodes[ (Math.random() * nodes.length)|0 ].connect(0, nodes[ (Math.random() * nodes.length)|0 ], 0 );
}



//Show value inside the debug console
function TestWidgetsNode()
{
	this.addOutput("","number");
	this.properties = {};
	var that = this;
	this.slider = this.addWidget("slider","Slider", 0.5, function(v){}, { min: 0, max: 1} );
	this.number = this.addWidget("number","Number", 0.5, function(v){}, { min: 0, max: 100} );
	this.combo = this.addWidget("combo","Combo", "red", function(v){}, { values:["red","green","blue"]} );
	this.text = this.addWidget("text","Text", "edit me", function(v){}, {} );
	this.text2 = this.addWidget("text","Text", "multiline", function(v){}, { multiline:true } );
	this.toggle = this.addWidget("toggle","Toggle", true, function(v){}, { on: "enabled", off:"disabled"} );
	this.button = this.addWidget("button","Button", null, function(v){}, {} );
	this.toggle2 = this.addWidget("toggle","Disabled", true, function(v){}, { on: "enabled", off:"disabled"} );
	this.toggle2.disabled = true;
	this.size = this.computeSize();
	this.serialize_widgets = true;
}

TestWidgetsNode.title = "Widgets";

LiteGraph.registerNodeType("features/widgets", TestWidgetsNode );

//Show value inside the debug console
function TestSpecialNode()
{
	this.addInput("","number");
	this.addOutput("","number");
	this.properties = {};
	var that = this;
	this.size = this.computeSize();
	this.enabled = false;
	this.visible = false;
}

TestSpecialNode.title = "Custom Shapes";
TestSpecialNode.title_mode = LiteGraph.TRANSPARENT_TITLE;
TestSpecialNode.slot_start_y = 20;

TestSpecialNode.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed)
		return;

	ctx.fillStyle = "#555";
	ctx.fillRect(0,0,this.size[0],20);

	if(this.enabled)
	{
		ctx.fillStyle = "#AFB";
		ctx.beginPath();
		ctx.moveTo(this.size[0]-20,0);
		ctx.lineTo(this.size[0]-25,20);
		ctx.lineTo(this.size[0],20);
		ctx.lineTo(this.size[0],0);
		ctx.fill();
	}

	if(this.visible)
	{
		ctx.fillStyle = "#ABF";
		ctx.beginPath();
		ctx.moveTo(this.size[0]-40,0);
		ctx.lineTo(this.size[0]-45,20);
		ctx.lineTo(this.size[0]-25,20);
		ctx.lineTo(this.size[0]-20,0);
		ctx.fill();
	}

	ctx.strokeStyle = "#333";
	ctx.beginPath();
	ctx.moveTo(0,20);
	ctx.lineTo(this.size[0]+1,20);
	ctx.moveTo(this.size[0]-20,0);
	ctx.lineTo(this.size[0]-25,20);
	ctx.moveTo(this.size[0]-40,0);
	ctx.lineTo(this.size[0]-45,20);
	ctx.stroke();

	if( this.mouseOver )
	{
		ctx.fillStyle = "#AAA";
		ctx.fillText( "Example of helper", 0, this.size[1] + 14 );
	}
}

TestSpecialNode.prototype.onMouseDown = function(e, pos)
{
	if(pos[1] > 20)
		return;

	if( pos[0] > this.size[0] - 20)
		this.enabled = !this.enabled;
	else if( pos[0] > this.size[0] - 40)
		this.visible = !this.visible;
}

TestSpecialNode.prototype.onBounding = function(rect)
{
	if(!this.flags.collapsed && this.mouseOver )
		rect[3] = this.size[1] + 20;
}

LiteGraph.registerNodeType("features/shape", TestSpecialNode );



//Show value inside the debug console
function TestSlotsNode()
{
	this.addInput("C","number");
	this.addOutput("A","number");
	this.addOutput("B","number");
	this.horizontal = true;
	this.size = [100,40];
}

TestSlotsNode.title = "Flat Slots";


LiteGraph.registerNodeType("features/slots", TestSlotsNode );


//Show value inside the debug console
function TestPropertyEditorsNode()
{
	this.properties = {
		name: "foo",
		age: 10,
		alive: true,
		children: ["John","Emily","Charles"],
		skills: {
			speed: 10,
			dexterity: 100
		}
	}

	var that = this;
	this.addWidget("button","Log",null,function(){
		console.log(that.properties);
	});
}

TestPropertyEditorsNode.title = "Properties";


LiteGraph.registerNodeType("features/properties_editor", TestPropertyEditorsNode );



//Show value inside the debug console
function LargeInputNode()
{
	this.addInput("in 1","number");
	this.addInput("in 2","number");
	this.addInput("in 3","number");
	this.addInput("in 4","number");
	this.addInput("in 5","number");
	this.addInput("in 6","number");
	this.addInput("in 7","number");
	this.addInput("in 8","number");
	this.addInput("in 9","number");
	this.addInput("in 10","number");
	this.addInput("in 11","number");
	this.addInput("in 12","number");
	this.addInput("in 13","number");
	this.addInput("in 14","number");
	this.addInput("in 15","number");
	this.addInput("in 16","number");
	this.addInput("in 17","number");
	this.addInput("in 18","number");
	this.addInput("in 19","number");
	this.addInput("in 20","number");
	this.size = [200,410];
}

LargeInputNode.title = "Large Input Node";


LiteGraph.registerNodeType("features/largeinput_editor", LargeInputNode);

