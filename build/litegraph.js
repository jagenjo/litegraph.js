//packer version

(function(global){
// *************************************************************
//   LiteGraph CLASS                                     *******
// *************************************************************

/* FYI: links are stored in graph.links with this structure per object
{
	id: number
	type: string,
	origin_id: number,
	origin_slot: number,
	target_id: number,
	target_slot: number,
	data: *
};
*/

/**
* The Global Scope. It contains all the registered node classes.
*
* @class LiteGraph
* @constructor
*/

var LiteGraph = global.LiteGraph = {

	CANVAS_GRID_SIZE: 10,
	
	NODE_TITLE_HEIGHT: 20,
	NODE_SLOT_HEIGHT: 15,
	NODE_WIDGET_HEIGHT: 20,
	NODE_WIDTH: 140,
	NODE_MIN_WIDTH: 50,
	NODE_COLLAPSED_RADIUS: 10,
	NODE_COLLAPSED_WIDTH: 80,
	NODE_TITLE_COLOR: "#999",
	NODE_TEXT_SIZE: 14,
	NODE_TEXT_COLOR: "#AAA",
	NODE_SUBTEXT_SIZE: 12,
	NODE_DEFAULT_COLOR: "#333",
	NODE_DEFAULT_BGCOLOR: "#444",
	NODE_DEFAULT_BOXCOLOR: "#666",
	NODE_DEFAULT_SHAPE: "box",
	DEFAULT_SHADOW_COLOR: "rgba(0,0,0,0.5)",

	LINK_COLOR: "#AAD",
	EVENT_LINK_COLOR: "#F85",
	CONNECTING_LINK_COLOR: "#AFA",

	MAX_NUMBER_OF_NODES: 1000, //avoid infinite loops
	DEFAULT_POSITION: [100,100],//default node position
	VALID_SHAPES: ["default","box","round","card"], //,"circle"

	//shapes are used for nodes but also for slots
	BOX_SHAPE: 1,
	ROUND_SHAPE: 2,
	CIRCLE_SHAPE: 3,
	CARD_SHAPE: 4,
	ARROW_SHAPE: 5,

	//enums
	INPUT: 1,
	OUTPUT: 2,

	EVENT: -1, //for outputs
	ACTION: -1, //for inputs

	ALWAYS: 0,
	ON_EVENT: 1,
	NEVER: 2,
	ON_TRIGGER: 3,

	UP: 1,
	DOWN:2,
	LEFT:3,
	RIGHT:4,
	CENTER:5,

	NORMAL_TITLE: 0,
	NO_TITLE: 1,
	TRANSPARENT_TITLE: 2,
	AUTOHIDE_TITLE: 3,

	proxy: null, //used to redirect calls
	node_images_path: "",

	debug: false,
	throw_errors: true,
	allow_scripts: true,
	registered_node_types: {}, //nodetypes by string
	node_types_by_file_extension: {}, //used for droping files in the canvas
	Nodes: {}, //node types by classname

	/**
	* Register a node class so it can be listed when the user wants to create a new one
	* @method registerNodeType
	* @param {String} type name of the node and path
	* @param {Class} base_class class containing the structure of a node
	*/

	registerNodeType: function(type, base_class)
	{
		if(!base_class.prototype)
			throw("Cannot register a simple object, it must be a class with a prototype");
		base_class.type = type;

		if(LiteGraph.debug)
			console.log("Node registered: " + type);

		var categories = type.split("/");
		var classname = base_class.name;

		var pos = type.lastIndexOf("/");
		base_class.category = type.substr(0,pos);

		if(!base_class.title)
			base_class.title = classname;
		//info.name = name.substr(pos+1,name.length - pos);

		//extend class
		if(base_class.prototype) //is a class
			for(var i in LGraphNode.prototype)
				if(!base_class.prototype[i])
					base_class.prototype[i] = LGraphNode.prototype[i];

		Object.defineProperty( base_class.prototype, "shape",{
			set: function(v) {
				switch(v)
				{
					case "default": delete this._shape; break;
					case "box": this._shape = LiteGraph.BOX_SHAPE; break;
					case "round": this._shape = LiteGraph.ROUND_SHAPE; break;
					case "circle": this._shape = LiteGraph.CIRCLE_SHAPE; break;
					case "card": this._shape = LiteGraph.CARD_SHAPE; break;
					default:
						this._shape = v;
				}
			},
			get: function(v)
			{
				return this._shape;
			},
			enumerable: true
		});

		this.registered_node_types[ type ] = base_class;
		if(base_class.constructor.name)
			this.Nodes[ classname ] = base_class;

		//warnings
		if(base_class.prototype.onPropertyChange)
			console.warn("LiteGraph node class " + type + " has onPropertyChange method, it must be called onPropertyChanged with d at the end");

		if( base_class.supported_extensions )
		{
			for(var i in base_class.supported_extensions )
				this.node_types_by_file_extension[ base_class.supported_extensions[i].toLowerCase() ] = base_class;
		}
	},

	/**
	* Create a new node type by passing a function, it wraps it with a propper class and generates inputs according to the parameters of the function.
	* Useful to wrap simple methods that do not require properties, and that only process some input to generate an output.
	* @method wrapFunctionAsNode
	* @param {String} name node name with namespace (p.e.: 'math/sum')
	* @param {Function} func
	* @param {Array} param_types [optional] an array containing the type of every parameter, otherwise parameters will accept any type
	* @param {String} return_type [optional] string with the return type, otherwise it will be generic
	*/
	wrapFunctionAsNode: function( name, func, param_types, return_type )
	{
		var params = Array(func.length);
		var code = "";
		var names = LiteGraph.getParameterNames( func );
		for(var i = 0; i < names.length; ++i)
			code += "this.addInput('"+names[i]+"',"+(param_types && param_types[i] ? "'" + param_types[i] + "'" : "0") + ");\n";
		code += "this.addOutput('out',"+( return_type ? "'" + return_type + "'" : 0 )+");\n";
		var classobj = Function(code);
		classobj.title = name.split("/").pop();
		classobj.desc = "Generated from " + func.name;
		classobj.prototype.onExecute = function onExecute()
		{
			for(var i = 0; i < params.length; ++i)
				params[i] = this.getInputData(i);
			var r = func.apply( this, params );
			this.setOutputData(0,r);
		}
		this.registerNodeType( name, classobj );
	},

	/**
	* Adds this method to all nodetypes, existing and to be created
	* (You can add it to LGraphNode.prototype but then existing node types wont have it)
	* @method addNodeMethod
	* @param {Function} func
	*/
	addNodeMethod: function( name, func )
	{
		LGraphNode.prototype[name] = func;
		for(var i in this.registered_node_types)
		{
			var type = this.registered_node_types[i];
			if(type.prototype[name])
				type.prototype["_" + name] = type.prototype[name]; //keep old in case of replacing
			type.prototype[name] = func;
		}
	},

	/**
	* Create a node of a given type with a name. The node is not attached to any graph yet.
	* @method createNode
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @param {String} name a name to distinguish from other nodes
	* @param {Object} options to set options
	*/

	createNode: function( type, title, options )
	{
		var base_class = this.registered_node_types[type];
		if (!base_class)
		{
			if(LiteGraph.debug)
				console.log("GraphNode type \"" + type + "\" not registered.");
			return null;
		}

		var prototype = base_class.prototype || base_class;

		title = title || base_class.title || type;

		var node = new base_class( title );
		node.type = type;

		if(!node.title && title) node.title = title;
		if(!node.properties) node.properties = {};
		if(!node.properties_info) node.properties_info = [];
		if(!node.flags) node.flags = {};
		if(!node.size) node.size = node.computeSize();
		if(!node.pos) node.pos = LiteGraph.DEFAULT_POSITION.concat();
		if(!node.mode) node.mode = LiteGraph.ALWAYS;

		//extra options
		if(options)
		{
			for(var i in options)
				node[i] = options[i];
		}

		return node;
	},

	/**
	* Returns a registered node type with a given name
	* @method getNodeType
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @return {Class} the node class
	*/

	getNodeType: function(type)
	{
		return this.registered_node_types[type];
	},


	/**
	* Returns a list of node types matching one category
	* @method getNodeType
	* @param {String} category category name
	* @return {Array} array with all the node classes
	*/

	getNodeTypesInCategory: function( category, filter )
	{
		var r = [];
		for(var i in this.registered_node_types)
		{
			var type = this.registered_node_types[i];
			if(filter && type.filter && type.filter != filter)
				continue;

			if(category == "" )
			{
				if (type.category == null)
					r.push(type);
			}
			else if (type.category == category)
				r.push(type);
		}

		return r;
	},

	/**
	* Returns a list with all the node type categories
	* @method getNodeTypesCategories
	* @return {Array} array with all the names of the categories
	*/

	getNodeTypesCategories: function()
	{
		var categories = {"":1};
		for(var i in this.registered_node_types)
			if(this.registered_node_types[i].category && !this.registered_node_types[i].skip_list)
				categories[ this.registered_node_types[i].category ] = 1;
		var result = [];
		for(var i in categories)
			result.push(i);
		return result;
	},

	//debug purposes: reloads all the js scripts that matches a wilcard
	reloadNodes: function (folder_wildcard)
	{
		var tmp = document.getElementsByTagName("script");
		//weird, this array changes by its own, so we use a copy
		var script_files = [];
		for(var i in tmp)
			script_files.push(tmp[i]);


		var docHeadObj = document.getElementsByTagName("head")[0];
		folder_wildcard = document.location.href + folder_wildcard;

		for(var i in script_files)
		{
			var src = script_files[i].src;
			if( !src || src.substr(0,folder_wildcard.length ) != folder_wildcard)
				continue;

			try
			{
				if(LiteGraph.debug)
					console.log("Reloading: " + src);
				var dynamicScript = document.createElement("script");
				dynamicScript.type = "text/javascript";
				dynamicScript.src = src;
				docHeadObj.appendChild(dynamicScript);
				docHeadObj.removeChild(script_files[i]);
			}
			catch (err)
			{
				if(LiteGraph.throw_errors)
					throw err;
				if(LiteGraph.debug)
					console.log("Error while reloading " + src);
			}
		}

		if(LiteGraph.debug)
			console.log("Nodes reloaded");
	},

	//separated just to improve if it doesnt work
	cloneObject: function(obj, target)
	{
		if(obj == null) return null;
		var r = JSON.parse( JSON.stringify( obj ) );
		if(!target) return r;

		for(var i in r)
			target[i] = r[i];
		return target;
	},

	isValidConnection: function( type_a, type_b )
	{
		if( !type_a ||  //generic output
			!type_b || //generic input
			type_a == type_b || //same type (is valid for triggers)
			type_a == LiteGraph.EVENT && type_b == LiteGraph.ACTION )
        return true;

		// Enforce string type to handle toLowerCase call (-1 number not ok)
		type_a = String(type_a); 
		type_b = String(type_b);
		type_a = type_a.toLowerCase();
		type_b = type_b.toLowerCase();

		// For nodes supporting multiple connection types
		if( type_a.indexOf(",") == -1 && type_b.indexOf(",") == -1 )
			return type_a == type_b;

		// Check all permutations to see if one is valid
		var supported_types_a = type_a.split(",");
		var supported_types_b = type_b.split(",");
		for(var i = 0; i < supported_types_a.length; ++i)
			for(var j = 0; j < supported_types_b.length; ++j)
				if( supported_types_a[i] == supported_types_b[j] )
					return true;

		return false;
	}
};

//timer that works everywhere
if(typeof(performance) != "undefined")
	LiteGraph.getTime = performance.now.bind(performance);
else if(typeof(Date) != "undefined" && Date.now)
	LiteGraph.getTime = Date.now.bind(Date);
else if(typeof(process) != "undefined")
	LiteGraph.getTime = function(){
		var t = process.hrtime();
		return t[0]*0.001 + t[1]*(1e-6);
	}
else
  LiteGraph.getTime = function getTime() { return (new Date).getTime(); }






//*********************************************************************************
// LGraph CLASS
//*********************************************************************************

/**
* LGraph is the class that contain a full graph. We instantiate one and add nodes to it, and then we can run the execution loop.
*
* @class LGraph
* @constructor
* @param {Object} o data from previous serialization [optional]
*/

function LGraph( o )
{
	if (LiteGraph.debug)
		console.log("Graph created");
	this.list_of_graphcanvas = null;
	this.clear();

	if(o)
		this.configure(o);
}

global.LGraph = LiteGraph.LGraph = LGraph;

//default supported types
LGraph.supported_types = ["number","string","boolean"];

//used to know which types of connections support this graph (some graphs do not allow certain types)
LGraph.prototype.getSupportedTypes = function() { return this.supported_types || LGraph.supported_types; }

LGraph.STATUS_STOPPED = 1;
LGraph.STATUS_RUNNING = 2;

/**
* Removes all nodes from this graph
* @method clear
*/

LGraph.prototype.clear = function()
{
	this.stop();
	this.status = LGraph.STATUS_STOPPED;

	this.last_node_id = 1;
	this.last_link_id = 1;

	this._version = -1; //used to detect changes

	//safe clear
	if(this._nodes)
	for(var i = 0; i < this._nodes.length; ++i)
	{
		var node = this._nodes[i];
		if(node.onRemoved)
			node.onRemoved();
	}

	//nodes
	this._nodes = [];
	this._nodes_by_id = {};
	this._nodes_in_order = []; //nodes that are executable sorted in execution order
	this._nodes_executable = null; //nodes that contain onExecute

	//other scene stuff
	this._groups = [];

	//links
	this.links = {}; //container with all the links

	//iterations
	this.iteration = 0;

	//custom data
	this.config = {};

	//timing
	this.globaltime = 0;
	this.runningtime = 0;
	this.fixedtime =  0;
	this.fixedtime_lapse = 0.01;
	this.elapsed_time = 0.01;
	this.last_update_time = 0;
	this.starttime = 0;

	this.catch_errors = true;

	//subgraph_data
	this.global_inputs = {};
	this.global_outputs = {};

	//notify canvas to redraw
	this.change();

	this.sendActionToCanvas("clear");
}

/**
* Attach Canvas to this graph
* @method attachCanvas
* @param {GraphCanvas} graph_canvas
*/

LGraph.prototype.attachCanvas = function(graphcanvas)
{
	if(graphcanvas.constructor != LGraphCanvas)
		throw("attachCanvas expects a LGraphCanvas instance");
	if(graphcanvas.graph && graphcanvas.graph != this)
		graphcanvas.graph.detachCanvas( graphcanvas );

	graphcanvas.graph = this;
	if(!this.list_of_graphcanvas)
		this.list_of_graphcanvas = [];
	this.list_of_graphcanvas.push(graphcanvas);
}

/**
* Detach Canvas from this graph
* @method detachCanvas
* @param {GraphCanvas} graph_canvas
*/
LGraph.prototype.detachCanvas = function(graphcanvas)
{
	if(!this.list_of_graphcanvas)
		return;

	var pos = this.list_of_graphcanvas.indexOf( graphcanvas );
	if(pos == -1)
		return;
	graphcanvas.graph = null;
	this.list_of_graphcanvas.splice(pos,1);
}

/**
* Starts running this graph every interval milliseconds.
* @method start
* @param {number} interval amount of milliseconds between executions, if 0 then it renders to the monitor refresh rate
*/

LGraph.prototype.start = function( interval )
{
	if( this.status == LGraph.STATUS_RUNNING )
		return;
	this.status = LGraph.STATUS_RUNNING;

	if(this.onPlayEvent)
		this.onPlayEvent();

	this.sendEventToAllNodes("onStart");

	//launch
	this.starttime = LiteGraph.getTime();
	this.last_update_time = this.starttime;
	interval = interval || 0;
	var that = this;

	if(interval == 0 && typeof(window) != "undefined" && window.requestAnimationFrame )
	{
		function on_frame()
		{
			if(that.execution_timer_id != -1)
				return;
			window.requestAnimationFrame(on_frame);
			that.runStep(1, !this.catch_errors );
		}
		this.execution_timer_id = -1;
		on_frame();
	}
	else
		this.execution_timer_id = setInterval( function() {
			//execute
			that.runStep(1, !this.catch_errors );
		},interval);
}

/**
* Stops the execution loop of the graph
* @method stop execution
*/

LGraph.prototype.stop = function()
{
	if( this.status == LGraph.STATUS_STOPPED )
		return;

	this.status = LGraph.STATUS_STOPPED;

	if(this.onStopEvent)
		this.onStopEvent();

	if(this.execution_timer_id != null)
	{
		if( this.execution_timer_id != -1 )
			clearInterval(this.execution_timer_id);
		this.execution_timer_id = null;
	}

	this.sendEventToAllNodes("onStop");
}

/**
* Run N steps (cycles) of the graph
* @method runStep
* @param {number} num number of steps to run, default is 1
*/

LGraph.prototype.runStep = function( num, do_not_catch_errors )
{
	num = num || 1;

	var start = LiteGraph.getTime();
	this.globaltime = 0.001 * (start - this.starttime);

	var nodes = this._nodes_executable ? this._nodes_executable : this._nodes;
	if(!nodes)
		return;

	if( do_not_catch_errors )
	{
		//iterations
		for(var i = 0; i < num; i++)
		{
			for( var j = 0, l = nodes.length; j < l; ++j )
			{
				var node = nodes[j];
				if( node.mode == LiteGraph.ALWAYS && node.onExecute )
					node.onExecute();
			}

			this.fixedtime += this.fixedtime_lapse;
			if( this.onExecuteStep )
				this.onExecuteStep();
		}

		if( this.onAfterExecute )
			this.onAfterExecute();
	}
	else
	{
		try
		{
			//iterations
			for(var i = 0; i < num; i++)
			{
				for( var j = 0, l = nodes.length; j < l; ++j )
				{
					var node = nodes[j];
					if( node.mode == LiteGraph.ALWAYS && node.onExecute )
						node.onExecute();
				}

				this.fixedtime += this.fixedtime_lapse;
				if( this.onExecuteStep )
					this.onExecuteStep();
			}

			if( this.onAfterExecute )
				this.onAfterExecute();
			this.errors_in_execution = false;
		}
		catch (err)
		{
			this.errors_in_execution = true;
			if(LiteGraph.throw_errors)
				throw err;
			if(LiteGraph.debug)
				console.log("Error during execution: " + err);
			this.stop();
		}
	}

	var now = LiteGraph.getTime();
	var elapsed = now - start;
	if (elapsed == 0)
		elapsed = 1;
	this.execution_time = 0.001 * elapsed;
	this.globaltime += 0.001 * elapsed;
	this.iteration += 1;
	this.elapsed_time = (now - this.last_update_time) * 0.001;
	this.last_update_time = now;
}

/**
* Updates the graph execution order according to relevance of the nodes (nodes with only outputs have more relevance than
* nodes with only inputs.
* @method updateExecutionOrder
*/
LGraph.prototype.updateExecutionOrder = function()
{
	this._nodes_in_order = this.computeExecutionOrder( false );
	this._nodes_executable = [];
	for(var i = 0; i < this._nodes_in_order.length; ++i)
		if( this._nodes_in_order[i].onExecute )
			this._nodes_executable.push( this._nodes_in_order[i] );
}

//This is more internal, it computes the order and returns it
LGraph.prototype.computeExecutionOrder = function( only_onExecute, set_level )
{
	var L = [];
	var S = [];
	var M = {};
	var visited_links = {}; //to avoid repeating links
	var remaining_links = {}; //to a

	//search for the nodes without inputs (starting nodes)
	for (var i = 0, l = this._nodes.length; i < l; ++i)
	{
		var node = this._nodes[i];
		if( only_onExecute && !node.onExecute )
			continue;

		M[node.id] = node; //add to pending nodes

		var num = 0; //num of input connections
		if(node.inputs)
			for(var j = 0, l2 = node.inputs.length; j < l2; j++)
				if(node.inputs[j] && node.inputs[j].link != null)
					num += 1;

		if(num == 0) //is a starting node
		{
			S.push(node);
			if(set_level)
				node._level = 1;
		}
		else //num of input links
		{
			if(set_level)
				node._level = 0;
			remaining_links[node.id] = num;
		}
	}

	while(true)
	{
		if(S.length == 0)
			break;

		//get an starting node
		var node = S.shift();
		L.push(node); //add to ordered list
		delete M[node.id]; //remove from the pending nodes

		if(!node.outputs)
			continue;

		//for every output
		for(var i = 0; i < node.outputs.length; i++)
		{
			var output = node.outputs[i];
			//not connected
			if(output == null || output.links == null || output.links.length == 0)
				continue;

			//for every connection
			for(var j = 0; j < output.links.length; j++)
			{
				var link_id = output.links[j];
				var link = this.links[link_id];
				if(!link)
					continue;

				//already visited link (ignore it)
				if(visited_links[ link.id ])
					continue;

				var target_node = this.getNodeById( link.target_id );
				if(target_node == null)
				{
					visited_links[ link.id ] = true;
					continue;
				}

				if(set_level && (!target_node._level || target_node._level <= node._level))
					target_node._level = node._level + 1;

				visited_links[link.id] = true; //mark as visited
				remaining_links[target_node.id] -= 1; //reduce the number of links remaining
				if (remaining_links[ target_node.id ] == 0)
					S.push(target_node); //if no more links, then add to starters array
			}
		}
	}

	//the remaining ones (loops)
	for(var i in M)
		L.push( M[i] );

	if( L.length != this._nodes.length && LiteGraph.debug )
		console.warn("something went wrong, nodes missing");

	var l = L.length;

	//save order number in the node
	for(var i = 0; i < l; ++i)
		L[i].order = i;

	//sort now by priority
	L = L.sort(function(A,B){ 
		var Ap = A.constructor.priority || A.priority || 0;
		var Bp = B.constructor.priority || B.priority || 0;
		if(Ap == Bp)
			return A.order - B.order;
		return Ap - Bp;
	});

	//save order number in the node, again...
	for(var i = 0; i < l; ++i)
		L[i].order = i;

	return L;
}

/**
* Returns all the nodes that could affect this one (ancestors) by crawling all the inputs recursively.
* It doesnt include the node itself
* @method getAncestors
* @return {Array} an array with all the LGraphNodes that affect this node, in order of execution
*/
LGraph.prototype.getAncestors = function( node )
{
	var ancestors = [];
	var pending = [node];
	var visited = {};

	while (pending.length)
	{
		var current = pending.shift();
		if(!current.inputs)
			continue;
		if( !visited[ current.id ] && current != node )
		{
			visited[ current.id ] = true;
			ancestors.push( current );
		}

		for(var i = 0; i < current.inputs.length;++i)
		{
			var input = current.getInputNode(i);
			if( input && ancestors.indexOf( input ) == -1)
			{
				pending.push( input );
			}
		}
	}

	ancestors.sort(function(a,b){ return a.order - b.order;});
	return ancestors;
}

/**
* Positions every node in a more readable manner
* @method arrange
*/
LGraph.prototype.arrange = function( margin )
{
	margin = margin || 40;

	var nodes = this.computeExecutionOrder( false, true );
	var columns = [];
	for(var i = 0; i < nodes.length; ++i)
	{
		var node = nodes[i];
		var col = node._level || 1;
		if(!columns[col])
			columns[col] = [];
		columns[col].push( node );
	}

	var x = margin;

	for(var i = 0; i < columns.length; ++i)
	{
		var column = columns[i];
		if(!column)
			continue;
		var max_size = 100;
		var y = margin;
		for(var j = 0; j < column.length; ++j)
		{
			var node = column[j];
			node.pos[0] = x;
			node.pos[1] = y;
			if(node.size[0] > max_size)
				max_size = node.size[0];
			y += node.size[1] + margin;
		}
		x += max_size + margin;
	}

	this.setDirtyCanvas(true,true);
}


/**
* Returns the amount of time the graph has been running in milliseconds
* @method getTime
* @return {number} number of milliseconds the graph has been running
*/
LGraph.prototype.getTime = function()
{
	return this.globaltime;
}

/**
* Returns the amount of time accumulated using the fixedtime_lapse var. This is used in context where the time increments should be constant
* @method getFixedTime
* @return {number} number of milliseconds the graph has been running
*/

LGraph.prototype.getFixedTime = function()
{
	return this.fixedtime;
}

/**
* Returns the amount of time it took to compute the latest iteration. Take into account that this number could be not correct
* if the nodes are using graphical actions
* @method getElapsedTime
* @return {number} number of milliseconds it took the last cycle
*/

LGraph.prototype.getElapsedTime = function()
{
	return this.elapsed_time;
}

/**
* Sends an event to all the nodes, useful to trigger stuff
* @method sendEventToAllNodes
* @param {String} eventname the name of the event (function to be called)
* @param {Array} params parameters in array format
*/

LGraph.prototype.sendEventToAllNodes = function( eventname, params, mode )
{
	mode = mode || LiteGraph.ALWAYS;

	var nodes = this._nodes_in_order ? this._nodes_in_order : this._nodes;
	if(!nodes)
		return;

	for( var j = 0, l = nodes.length; j < l; ++j )
	{
		var node = nodes[j];
		if(node[eventname] && node.mode == mode )
		{
			if(params === undefined)
				node[eventname]();
			else if(params && params.constructor === Array)
				node[eventname].apply( node, params );
			else
				node[eventname](params);
		}
	}
}

LGraph.prototype.sendActionToCanvas = function(action, params)
{
	if(!this.list_of_graphcanvas)
		return;

	for(var i = 0; i < this.list_of_graphcanvas.length; ++i)
	{
		var c = this.list_of_graphcanvas[i];
		if( c[action] )
			c[action].apply(c, params);
	}
}

/**
* Adds a new node instasnce to this graph
* @method add
* @param {LGraphNode} node the instance of the node
*/

LGraph.prototype.add = function( node, skip_compute_order)
{
	if(!node)
		return;

	//groups
	if( node.constructor === LGraphGroup )
	{
		this._groups.push( node );
		this.setDirtyCanvas(true);
		this.change();
		node.graph = this;
		this._version++;
		return;
	}

	//nodes
	if(node.id != -1 && this._nodes_by_id[node.id] != null)
	{
		console.warn("LiteGraph: there is already a node with this ID, changing it");
		node.id = ++this.last_node_id;
	}

	if(this._nodes.length >= LiteGraph.MAX_NUMBER_OF_NODES)
		throw("LiteGraph: max number of nodes in a graph reached");

	//give him an id
	if(node.id == null || node.id == -1)
		node.id = ++this.last_node_id;
	else if (this.last_node_id < node.id)
		this.last_node_id = node.id;


	node.graph = this;
	this._version++;

	this._nodes.push(node);
	this._nodes_by_id[node.id] = node;

	if(node.onAdded)
		node.onAdded( this );

	if(this.config.align_to_grid)
		node.alignToGrid();

	if(!skip_compute_order)
		this.updateExecutionOrder();

	if(this.onNodeAdded)
		this.onNodeAdded(node);


	this.setDirtyCanvas(true);
	this.change();

	return node; //to chain actions
}

/**
* Removes a node from the graph
* @method remove
* @param {LGraphNode} node the instance of the node
*/

LGraph.prototype.remove = function(node)
{
	if(node.constructor === LiteGraph.LGraphGroup)
	{
		var index = this._groups.indexOf(node);
		if(index != -1)
			this._groups.splice(index,1);
		node.graph = null;
		this._version++;
		this.setDirtyCanvas(true,true);
		this.change();
		return;
	}

	if(this._nodes_by_id[node.id] == null)
		return; //not found

	if(node.ignore_remove)
		return; //cannot be removed

	//disconnect inputs
	if(node.inputs)
		for(var i = 0; i < node.inputs.length; i++)
		{
			var slot = node.inputs[i];
			if(slot.link != null)
				node.disconnectInput(i);
		}

	//disconnect outputs
	if(node.outputs)
		for(var i = 0; i < node.outputs.length; i++)
		{
			var slot = node.outputs[i];
			if(slot.links != null && slot.links.length)
				node.disconnectOutput(i);
		}

	//node.id = -1; //why?

	//callback
	if(node.onRemoved)
		node.onRemoved();

	node.graph = null;
	this._version++;

	//remove from canvas render
	if(this.list_of_graphcanvas)
	{
		for(var i = 0; i < this.list_of_graphcanvas.length; ++i)
		{
			var canvas = this.list_of_graphcanvas[i];
			if(canvas.selected_nodes[node.id])
				delete canvas.selected_nodes[node.id];
			if(canvas.node_dragged == node)
				canvas.node_dragged = null;
		}
	}

	//remove from containers
	var pos = this._nodes.indexOf(node);
	if(pos != -1)
		this._nodes.splice(pos,1);
	delete this._nodes_by_id[node.id];

	if(this.onNodeRemoved)
		this.onNodeRemoved(node);

	this.setDirtyCanvas(true,true);
	this.change();

	this.updateExecutionOrder();
}

/**
* Returns a node by its id.
* @method getNodeById
* @param {Number} id
*/

LGraph.prototype.getNodeById = function( id )
{
	if( id == null )
		return null;
	return this._nodes_by_id[ id ];
}

/**
* Returns a list of nodes that matches a class
* @method findNodesByClass
* @param {Class} classObject the class itself (not an string)
* @return {Array} a list with all the nodes of this type
*/

LGraph.prototype.findNodesByClass = function(classObject)
{
	var r = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		if(this._nodes[i].constructor === classObject)
			r.push(this._nodes[i]);
	return r;
}

/**
* Returns a list of nodes that matches a type
* @method findNodesByType
* @param {String} type the name of the node type
* @return {Array} a list with all the nodes of this type
*/

LGraph.prototype.findNodesByType = function(type)
{
	var type = type.toLowerCase();
	var r = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		if(this._nodes[i].type.toLowerCase() == type )
			r.push(this._nodes[i]);
	return r;
}

/**
* Returns a list of nodes that matches a name
* @method findNodesByTitle
* @param {String} name the name of the node to search
* @return {Array} a list with all the nodes with this name
*/

LGraph.prototype.findNodesByTitle = function(title)
{
	var result = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		if(this._nodes[i].title == title)
			result.push(this._nodes[i]);
	return result;
}

/**
* Returns the top-most node in this position of the canvas
* @method getNodeOnPos
* @param {number} x the x coordinate in canvas space
* @param {number} y the y coordinate in canvas space
* @param {Array} nodes_list a list with all the nodes to search from, by default is all the nodes in the graph
* @return {LGraphNode} the node at this position or null
*/
LGraph.prototype.getNodeOnPos = function( x, y, nodes_list, margin )
{
	nodes_list = nodes_list || this._nodes;
	for (var i = nodes_list.length - 1; i >= 0; i--)
	{
		var n = nodes_list[i];
		if(n.isPointInside( x, y, margin ))
			return n;
	}
	return null;
}

/**
* Returns the top-most group in that position
* @method getGroupOnPos
* @param {number} x the x coordinate in canvas space
* @param {number} y the y coordinate in canvas space
* @return {LGraphGroup} the group or null
*/
LGraph.prototype.getGroupOnPos = function(x,y)
{
	for (var i = this._groups.length - 1; i >= 0; i--)
	{
		var g = this._groups[i];
		if(g.isPointInside( x, y, 2, true ))
			return g;
	}
	return null;
}

// ********** GLOBALS *****************

/**
* Tell this graph it has a global graph input of this type
* @method addGlobalInput
* @param {String} name
* @param {String} type
* @param {*} value [optional]
*/
LGraph.prototype.addGlobalInput = function(name, type, value)
{
	this.global_inputs[name] = { name: name, type: type, value: value };
	this._version++;

	if(this.onGlobalInputAdded)
		this.onGlobalInputAdded(name, type);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

/**
* Assign a data to the global graph input
* @method setGlobalInputData
* @param {String} name
* @param {*} data
*/
LGraph.prototype.setGlobalInputData = function(name, data)
{
	var input = this.global_inputs[name];
	if (!input)
		return;
	input.value = data;
}

/**
* Assign a data to the global graph input (same as setGlobalInputData)
* @method setInputData
* @param {String} name
* @param {*} data
*/
LGraph.prototype.setInputData = LGraph.prototype.setGlobalInputData;


/**
* Returns the current value of a global graph input
* @method getGlobalInputData
* @param {String} name
* @return {*} the data
*/
LGraph.prototype.getGlobalInputData = function(name)
{
	var input = this.global_inputs[name];
	if (!input)
		return null;
	return input.value;
}

/**
* Changes the name of a global graph input
* @method renameGlobalInput
* @param {String} old_name
* @param {String} new_name
*/
LGraph.prototype.renameGlobalInput = function(old_name, name)
{
	if(name == old_name)
		return;

	if(!this.global_inputs[old_name])
		return false;

	if(this.global_inputs[name])
	{
		console.error("there is already one input with that name");
		return false;
	}

	this.global_inputs[name] = this.global_inputs[old_name];
	delete this.global_inputs[old_name];
	this._version++;

	if(this.onGlobalInputRenamed)
		this.onGlobalInputRenamed(old_name, name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

/**
* Changes the type of a global graph input
* @method changeGlobalInputType
* @param {String} name
* @param {String} type
*/
LGraph.prototype.changeGlobalInputType = function(name, type)
{
	if(!this.global_inputs[name])
		return false;

	if(this.global_inputs[name].type && this.global_inputs[name].type.toLowerCase() == type.toLowerCase() )
		return;

	this.global_inputs[name].type = type;
	this._version++;
	if(this.onGlobalInputTypeChanged)
		this.onGlobalInputTypeChanged(name, type);
}

/**
* Removes a global graph input
* @method removeGlobalInput
* @param {String} name
* @param {String} type
*/
LGraph.prototype.removeGlobalInput = function(name)
{
	if(!this.global_inputs[name])
		return false;

	delete this.global_inputs[name];
	this._version++;

	if(this.onGlobalInputRemoved)
		this.onGlobalInputRemoved(name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
	return true;
}

/**
* Creates a global graph output
* @method addGlobalOutput
* @param {String} name
* @param {String} type
* @param {*} value
*/
LGraph.prototype.addGlobalOutput = function(name, type, value)
{
	this.global_outputs[name] = { name: name, type: type, value: value };
	this._version++;

	if(this.onGlobalOutputAdded)
		this.onGlobalOutputAdded(name, type);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

/**
* Assign a data to the global output
* @method setGlobalOutputData
* @param {String} name
* @param {String} value
*/
LGraph.prototype.setGlobalOutputData = function(name, value)
{
	var output = this.global_outputs[ name ];
	if (!output)
		return;
	output.value = value;
}

/**
* Returns the current value of a global graph output
* @method getGlobalOutputData
* @param {String} name
* @return {*} the data
*/
LGraph.prototype.getGlobalOutputData = function(name)
{
	var output = this.global_outputs[name];
	if (!output)
		return null;
	return output.value;
}

/**
* Returns the current value of a global graph output (sames as getGlobalOutputData)
* @method getOutputData
* @param {String} name
* @return {*} the data
*/
LGraph.prototype.getOutputData = LGraph.prototype.getGlobalOutputData;


/**
* Renames a global graph output
* @method renameGlobalOutput
* @param {String} old_name
* @param {String} new_name
*/
LGraph.prototype.renameGlobalOutput = function(old_name, name)
{
	if(!this.global_outputs[old_name])
		return false;

	if(this.global_outputs[name])
	{
		console.error("there is already one output with that name");
		return false;
	}

	this.global_outputs[name] = this.global_outputs[old_name];
	delete this.global_outputs[old_name];
	this._version++;

	if(this.onGlobalOutputRenamed)
		this.onGlobalOutputRenamed(old_name, name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

/**
* Changes the type of a global graph output
* @method changeGlobalOutputType
* @param {String} name
* @param {String} type
*/
LGraph.prototype.changeGlobalOutputType = function(name, type)
{
	if(!this.global_outputs[name])
		return false;

	if(this.global_outputs[name].type && this.global_outputs[name].type.toLowerCase() == type.toLowerCase() )
		return;

	this.global_outputs[name].type = type;
	this._version++;
	if(this.onGlobalOutputTypeChanged)
		this.onGlobalOutputTypeChanged(name, type);
}

/**
* Removes a global graph output
* @method removeGlobalOutput
* @param {String} name
*/
LGraph.prototype.removeGlobalOutput = function(name)
{
	if(!this.global_outputs[name])
		return false;
	delete this.global_outputs[name];
	this._version++;

	if(this.onGlobalOutputRemoved)
		this.onGlobalOutputRemoved(name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
	return true;
}

LGraph.prototype.triggerInput = function(name,value)
{
	var nodes = this.findNodesByTitle(name);
	for(var i = 0; i < nodes.length; ++i)
		nodes[i].onTrigger(value);
}

LGraph.prototype.setCallback = function(name,func)
{
	var nodes = this.findNodesByTitle(name);
	for(var i = 0; i < nodes.length; ++i)
		nodes[i].setTrigger(func);
}


LGraph.prototype.connectionChange = function( node )
{
	this.updateExecutionOrder();
	if( this.onConnectionChange )
		this.onConnectionChange( node );
	this._version++;
	this.sendActionToCanvas("onConnectionChange");
}

/**
* returns if the graph is in live mode
* @method isLive
*/

LGraph.prototype.isLive = function()
{
	if(!this.list_of_graphcanvas)
		return false;

	for(var i = 0; i < this.list_of_graphcanvas.length; ++i)
	{
		var c = this.list_of_graphcanvas[i];
		if(c.live_mode)
			return true;
	}
	return false;
}

/* Called when something visually changed (not the graph!) */
LGraph.prototype.change = function()
{
	if(LiteGraph.debug)
		console.log("Graph changed");
	this.sendActionToCanvas("setDirty",[true,true]);
	if(this.on_change)
		this.on_change(this);
}

LGraph.prototype.setDirtyCanvas = function(fg,bg)
{
	this.sendActionToCanvas("setDirty",[fg,bg]);
}

//save and recover app state ***************************************
/**
* Creates a Object containing all the info about this graph, it can be serialized
* @method serialize
* @return {Object} value of the node
*/
LGraph.prototype.serialize = function()
{
	var nodes_info = [];
	for(var i = 0, l = this._nodes.length; i < l; ++i)
		nodes_info.push( this._nodes[i].serialize() );

	//pack link info into a non-verbose format
	var links = [];
	for(var i in this.links) //links is an OBJECT
	{
		var link = this.links[i];
		links.push([ link.id, link.origin_id, link.origin_slot, link.target_id, link.target_slot, link.type ]);
	}

	var groups_info = [];
	for(var i = 0; i < this._groups.length; ++i)
		groups_info.push( this._groups[i].serialize() );

	var data = {
		last_node_id: this.last_node_id,
		last_link_id: this.last_link_id,
		nodes: nodes_info,
		links: links, 
		groups: groups_info,
		config: this.config
	};

	return data;
}


/**
* Configure a graph from a JSON string
* @method configure
* @param {String} str configure a graph from a JSON string
* @param {Boolean} returns if there was any error parsing
*/
LGraph.prototype.configure = function( data, keep_old )
{
	if(!data)
		return;

	if(!keep_old)
		this.clear();

	var nodes = data.nodes;

	//decode links info (they are very verbose)
	if(data.links && data.links.constructor === Array)
	{
		var links = [];
		for(var i = 0; i < data.links.length; ++i)
		{
			var link = data.links[i];
			links[ link[0] ] = { id: link[0], origin_id: link[1], origin_slot: link[2], target_id: link[3], target_slot: link[4], type: link[5] };
		}
		data.links = links;
	}

	//copy all stored fields
	for (var i in data)
		this[i] = data[i];

	var error = false;

	//create nodes
	this._nodes = [];
	if(nodes)
	{
		for(var i = 0, l = nodes.length; i < l; ++i)
		{
			var n_info = nodes[i]; //stored info
			var node = LiteGraph.createNode( n_info.type, n_info.title );
			if(!node)
			{
				if(LiteGraph.debug)
					console.log("Node not found: " + n_info.type);
				error = true;
				continue;
			}

			node.id = n_info.id; //id it or it will create a new id
			this.add(node, true); //add before configure, otherwise configure cannot create links
		}

		//configure nodes afterwards so they can reach each other
		for(var i = 0, l = nodes.length; i < l; ++i)
		{
			var n_info = nodes[i];
			var node = this.getNodeById( n_info.id );
			if(node)
				node.configure( n_info );
		}
	}

	//groups
	this._groups.length = 0;
	if( data.groups )
	for(var i = 0; i < data.groups.length; ++i )
	{
		var group = new LiteGraph.LGraphGroup();
		group.configure( data.groups[i] );
		this.add( group );
	}

	this.updateExecutionOrder();
	this._version++;
	this.setDirtyCanvas(true,true);
	return error;
}

LGraph.prototype.load = function(url)
{
	var that = this;
	var req = new XMLHttpRequest();
	req.open('GET', url, true);
	req.send(null);
	req.onload = function (oEvent) {
		if(req.status !== 200)
		{
			console.error("Error loading graph:",req.status,req.response);
			return;
		}
		var data = JSON.parse( req.response );
		that.configure(data);
	}
	req.onerror = function(err)
	{
		console.error("Error loading graph:",err);
	}
}

LGraph.prototype.onNodeTrace = function(node, msg, color)
{
	//TODO
}

// *************************************************************
//   Node CLASS                                          *******
// *************************************************************

/*
	title: string
	pos: [x,y]
	size: [x,y]

	input|output: every connection
		+  { name:string, type:string, pos: [x,y]=Optional, direction: "input"|"output", links: Array });

	flags:
		+ clip_area: if you render outside the node, it will be cliped
		+ unsafe_execution: not allowed for safe execution
		+ skip_repeated_outputs: when adding new outputs, it wont show if there is one already connected
		+ resizable: if set to false it wont be resizable with the mouse

	supported callbacks:
		+ onAdded: when added to graph
		+ onRemoved: when removed from graph
		+ onStart:	when the graph starts playing
		+ onStop:	when the graph stops playing
		+ onDrawForeground: render the inside widgets inside the node
		+ onDrawBackground: render the background area inside the node (only in edit mode)
		+ onMouseDown
		+ onMouseMove
		+ onMouseUp
		+ onMouseEnter
		+ onMouseLeave
		+ onExecute: execute the node
		+ onPropertyChanged: when a property is changed in the panel (return true to skip default behaviour)
		+ onGetInputs: returns an array of possible inputs
		+ onGetOutputs: returns an array of possible outputs
		+ onDblClick
		+ onSerialize
		+ onSelected
		+ onDeselected
		+ onDropItem : DOM item dropped over the node
		+ onDropFile : file dropped over the node
		+ onConnectInput : if returns false the incoming connection will be canceled
		+ onConnectionsChange : a connection changed (new one or removed) (LiteGraph.INPUT or LiteGraph.OUTPUT, slot, true if connected, link_info, input_info )
*/

/**
* Base Class for all the node type classes
* @class LGraphNode
* @param {String} name a name for the node
*/

function LGraphNode(title)
{
	this._ctor(title);
}

global.LGraphNode = LiteGraph.LGraphNode = LGraphNode;

LGraphNode.prototype._ctor = function( title )
{
	this.title = title || "Unnamed";
	this.size = [LiteGraph.NODE_WIDTH,60];
	this.graph = null;

	this._pos = new Float32Array(10,10);

	Object.defineProperty( this, "pos", {
		set: function(v)
		{
			if(!v || v.length < 2)
				return;
			this._pos[0] = v[0];
			this._pos[1] = v[1];
		},
		get: function()
		{
			return this._pos;
		},
		enumerable: true
	});

	this.id = -1; //not know till not added
	this.type = null;

	//inputs available: array of inputs
	this.inputs = [];
	this.outputs = [];
	this.connections = [];

	//local data
	this.properties = {}; //for the values
	this.properties_info = []; //for the info

	this.flags = {};
}

/**
* configure a node from an object containing the serialized info
* @method configure
*/
LGraphNode.prototype.configure = function(info)
{
	if(this.graph)
		this.graph._version++;

	for (var j in info)
	{
		if(j == "console")
			continue;

		if(j == "properties")
		{
			//i dont want to clone properties, I want to reuse the old container
			for(var k in info.properties)
			{
				this.properties[k] = info.properties[k];
				if(this.onPropertyChanged)
					this.onPropertyChanged(k,info.properties[k]);
			}
			continue;
		}

		if(info[j] == null)
			continue;

		else if (typeof(info[j]) == 'object') //object
		{
			if(this[j] && this[j].configure)
				this[j].configure( info[j] );
			else
				this[j] = LiteGraph.cloneObject(info[j], this[j]);
		}
		else //value
			this[j] = info[j];
	}

	if(!info.title)
		this.title = this.constructor.title;

	if(this.onConnectionsChange)
	{
		if(this.inputs)
		for(var i = 0; i < this.inputs.length; ++i)
		{
			var input = this.inputs[i];
			var link_info = this.graph ? this.graph.links[ input.link ] : null;
			this.onConnectionsChange( LiteGraph.INPUT, i, true, link_info, input ); //link_info has been created now, so its updated
		}

		if(this.outputs)
		for(var i = 0; i < this.outputs.length; ++i)
		{
			var output = this.outputs[i];
			if(!output.links)
				continue;
			for(var j = 0; j < output.links.length; ++j)
			{
				var link_info = this.graph ? this.graph.links[ output.links[j] ] : null;
				this.onConnectionsChange( LiteGraph.OUTPUT, i, true, link_info, output ); //link_info has been created now, so its updated
			}
		}
	}

	//FOR LEGACY, PLEASE REMOVE ON NEXT VERSION
	for(var i in this.inputs)
	{
		var input = this.inputs[i];
		if(!input.link || !input.link.length )
			continue;
		var link = input.link;
		if(typeof(link) != "object")
			continue;
		input.link = link[0];
		if(this.graph)
		this.graph.links[ link[0] ] = {
			id: link[0],
			origin_id: link[1],
			origin_slot: link[2],
			target_id: link[3],
			target_slot: link[4]
		};
	}
	for(var i in this.outputs)
	{
		var output = this.outputs[i];
		if(!output.links || output.links.length == 0)
			continue;
		for(var j in output.links)
		{
			var link = output.links[j];
			if(typeof(link) != "object")
				continue;
			output.links[j] = link[0];
		}
	}

	if( this.onConfigure )
		this.onConfigure( info );
}

/**
* serialize the content
* @method serialize
*/

LGraphNode.prototype.serialize = function()
{
	//create serialization object
	var o = {
		id: this.id,
		type: this.type,
		pos: this.pos,
		size: this.size,
		flags: LiteGraph.cloneObject(this.flags),
		mode: this.mode
	};

	if( this.inputs )
		o.inputs = this.inputs;

	if( this.outputs )
	{
		//clear outputs last data (because data in connections is never serialized but stored inside the outputs info)
		for(var i = 0; i < this.outputs.length; i++)
			delete this.outputs[i]._data;
		o.outputs = this.outputs;
	}

	if( this.title && this.title != this.constructor.title )
		o.title = this.title;

	if( this.properties )
		o.properties = LiteGraph.cloneObject( this.properties );

	if( !o.type )
		o.type = this.constructor.type;

	if( this.color )
		o.color = this.color;
	if( this.bgcolor )
		o.bgcolor = this.bgcolor;
	if( this.boxcolor )
		o.boxcolor = this.boxcolor;
	if( this.shape )
		o.shape = this.shape;

	if(this.onSerialize)
	{
		if( this.onSerialize(o) )
			console.warn("node onSerialize shouldnt return anything, data should be stored in the object pass in the first parameter");
	}

	return o;
}


/* Creates a clone of this node */
LGraphNode.prototype.clone = function()
{
	var node = LiteGraph.createNode(this.type);

	//we clone it because serialize returns shared containers
	var data = LiteGraph.cloneObject( this.serialize() );

	//remove links
	if(data.inputs)
		for(var i = 0; i < data.inputs.length; ++i)
			data.inputs[i].link = null;

	if(data.outputs)
		for(var i = 0; i < data.outputs.length; ++i)
		{
			if(data.outputs[i].links)
				data.outputs[i].links.length = 0;
		}

	delete data["id"];
	//remove links
	node.configure(data);

	return node;
}


/**
* serialize and stringify
* @method toString
*/

LGraphNode.prototype.toString = function()
{
	return JSON.stringify( this.serialize() );
}
//LGraphNode.prototype.unserialize = function(info) {} //this cannot be done from within, must be done in LiteGraph


/**
* get the title string
* @method getTitle
*/

LGraphNode.prototype.getTitle = function()
{
	return this.title || this.constructor.title;
}



// Execution *************************
/**
* sets the output data
* @method setOutputData
* @param {number} slot
* @param {*} data
*/
LGraphNode.prototype.setOutputData = function(slot, data)
{
	if(!this.outputs)
		return;

	//this maybe slow and a niche case
	//if(slot && slot.constructor === String)
	//	slot = this.findOutputSlot(slot);

	if(slot == -1 || slot >= this.outputs.length)
		return;

	var output_info = this.outputs[slot];
	if(!output_info)
		return;

	//store data in the output itself in case we want to debug
	output_info._data = data;

	//if there are connections, pass the data to the connections
	if( this.outputs[slot].links )
	{
		for(var i = 0; i < this.outputs[slot].links.length; i++)
		{
			var link_id = this.outputs[slot].links[i];
			this.graph.links[ link_id ].data = data;
		}
	}
}

/**
* Retrieves the input data (data traveling through the connection) from one slot
* @method getInputData
* @param {number} slot
* @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
* @return {*} data or if it is not connected returns undefined
*/
LGraphNode.prototype.getInputData = function( slot, force_update )
{
	if(!this.inputs)
		return; //undefined;

	if(slot >= this.inputs.length || this.inputs[slot].link == null)
		return;

	var link_id = this.inputs[slot].link;
	var link = this.graph.links[ link_id ];
	if(!link) //bug: weird case but it happens sometimes
		return null;

	if(!force_update)
		return link.data;

	//special case: used to extract data from the incomming connection before the graph has been executed
	var node = this.graph.getNodeById( link.origin_id );
	if(!node)
		return link.data;

	if(node.updateOutputData)
		node.updateOutputData( link.origin_slot );
	else if(node.onExecute)
		node.onExecute();

	return link.data;
}

/**
* Retrieves the input data from one slot using its name instead of slot number
* @method getInputDataByName
* @param {String} slot_name
* @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
* @return {*} data or if it is not connected returns null
*/
LGraphNode.prototype.getInputDataByName = function( slot_name, force_update )
{
	var slot = this.findInputSlot( slot_name );
	if( slot == -1 )
		return null;
	return this.getInputData( slot, force_update );
}


/**
* tells you if there is a connection in one input slot
* @method isInputConnected
* @param {number} slot
* @return {boolean}
*/
LGraphNode.prototype.isInputConnected = function(slot)
{
	if(!this.inputs)
		return false;
	return (slot < this.inputs.length && this.inputs[slot].link != null);
}

/**
* tells you info about an input connection (which node, type, etc)
* @method getInputInfo
* @param {number} slot
* @return {Object} object or null { link: id, name: string, type: string or 0 }
*/
LGraphNode.prototype.getInputInfo = function(slot)
{
	if(!this.inputs)
		return null;
	if(slot < this.inputs.length)
		return this.inputs[slot];
	return null;
}

/**
* returns the node connected in the input slot
* @method getInputNode
* @param {number} slot
* @return {LGraphNode} node or null
*/
LGraphNode.prototype.getInputNode = function( slot )
{
	if(!this.inputs)
		return null;
	if(slot >= this.inputs.length)
		return null;
	var input = this.inputs[slot];
	if(!input || input.link === null)
		return null;
	var link_info = this.graph.links[ input.link ];
	if(!link_info)
		return null;
	return this.graph.getNodeById( link_info.origin_id );
}


/**
* returns the value of an input with this name, otherwise checks if there is a property with that name
* @method getInputOrProperty
* @param {string} name
* @return {*} value
*/
LGraphNode.prototype.getInputOrProperty = function( name )
{
	if(!this.inputs || !this.inputs.length)
		return this.properties ? this.properties[name] : null;

	for(var i = 0, l = this.inputs.length; i < l; ++i)
		if(name == this.inputs[i].name)
		{
			var link_id = this.inputs[i].link;
			var link = this.graph.links[ link_id ];
			return link ? link.data : null;
		}
	return this.properties[name];
}




/**
* tells you the last output data that went in that slot
* @method getOutputData
* @param {number} slot
* @return {Object}  object or null
*/
LGraphNode.prototype.getOutputData = function(slot)
{
	if(!this.outputs)
		return null;
	if(slot >= this.outputs.length)
		return null;

	var info = this.outputs[slot];
	return info._data;
}


/**
* tells you info about an output connection (which node, type, etc)
* @method getOutputInfo
* @param {number} slot
* @return {Object}  object or null { name: string, type: string, links: [ ids of links in number ] }
*/
LGraphNode.prototype.getOutputInfo = function(slot)
{
	if(!this.outputs)
		return null;
	if(slot < this.outputs.length)
		return this.outputs[slot];
	return null;
}


/**
* tells you if there is a connection in one output slot
* @method isOutputConnected
* @param {number} slot
* @return {boolean}
*/
LGraphNode.prototype.isOutputConnected = function(slot)
{
	if(!this.outputs)
		return false;
	return (slot < this.outputs.length && this.outputs[slot].links && this.outputs[slot].links.length);
}

/**
* tells you if there is any connection in the output slots
* @method isAnyOutputConnected
* @return {boolean}
*/
LGraphNode.prototype.isAnyOutputConnected = function()
{
	if(!this.outputs)
		return false;
	for(var i = 0; i < this.outputs.length; ++i)
		if( this.outputs[i].links && this.outputs[i].links.length )
			return true;
	return false;
}


/**
* retrieves all the nodes connected to this output slot
* @method getOutputNodes
* @param {number} slot
* @return {array}
*/
LGraphNode.prototype.getOutputNodes = function(slot)
{
	if(!this.outputs || this.outputs.length == 0)
		return null;

	if(slot >= this.outputs.length)
		return null;

	var output = this.outputs[slot];
	if(!output.links || output.links.length == 0)
		return null;

	var r = [];
	for(var i = 0; i < output.links.length; i++)
	{
		var link_id = output.links[i];
		var link = this.graph.links[ link_id ];
		if(link)
		{
			var target_node = this.graph.getNodeById( link.target_id );
			if( target_node )
				r.push( target_node );
		}
	}
	return r;
}

/**
* Triggers an event in this node, this will trigger any output with the same name
* @method trigger
* @param {String} event name ( "on_play", ... ) if action is equivalent to false then the event is send to all
* @param {*} param
*/
LGraphNode.prototype.trigger = function( action, param )
{
	if( !this.outputs || !this.outputs.length )
		return;

	if(this.graph)
		this.graph._last_trigger_time = LiteGraph.getTime();

	for(var i = 0; i < this.outputs.length; ++i)
	{
		var output = this.outputs[ i ];
		if(!output || output.type !== LiteGraph.EVENT || (action && output.name != action) )
			continue;
		this.triggerSlot( i, param );
	}
}

/**
* Triggers an slot event in this node
* @method triggerSlot
* @param {Number} slot the index of the output slot
* @param {*} param
* @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
*/
LGraphNode.prototype.triggerSlot = function( slot, param, link_id )
{
	if( !this.outputs )
		return;

	var output = this.outputs[ slot ];
	if( !output )
		return;

	var links = output.links;
	if(!links || !links.length)
		return;

	if(this.graph)
		this.graph._last_trigger_time = LiteGraph.getTime();

	//for every link attached here
	for(var k = 0; k < links.length; ++k)
	{
		var id = links[k];
		if( link_id != null && link_id != id ) //to skip links
			continue;
		var link_info = this.graph.links[ links[k] ];
		if(!link_info) //not connected
			continue;
		link_info._last_time = LiteGraph.getTime();
		var node = this.graph.getNodeById( link_info.target_id );
		if(!node) //node not found?
			continue;

		//used to mark events in graph
		var target_connection = node.inputs[ link_info.target_slot ];

		if(node.onAction)
			node.onAction( target_connection.name, param );
		else if(node.mode === LiteGraph.ON_TRIGGER)
		{
			if(node.onExecute)
				node.onExecute(param);
		}
	}
}

/**
* add a new property to this node
* @method addProperty
* @param {string} name
* @param {*} default_value
* @param {string} type string defining the output type ("vec3","number",...)
* @param {Object} extra_info this can be used to have special properties of the property (like values, etc)
*/
LGraphNode.prototype.addProperty = function( name, default_value, type, extra_info )
{
	var o = { name: name, type: type, default_value: default_value };
	if(extra_info)
		for(var i in extra_info)
			o[i] = extra_info[i];
	if(!this.properties_info)
		this.properties_info = [];
	this.properties_info.push(o);
	if(!this.properties)
		this.properties = {};
	this.properties[ name ] = default_value;
	return o;
}


//connections

/**
* add a new output slot to use in this node
* @method addOutput
* @param {string} name
* @param {string} type string defining the output type ("vec3","number",...)
* @param {Object} extra_info this can be used to have special properties of an output (label, special color, position, etc)
*/
LGraphNode.prototype.addOutput = function(name,type,extra_info)
{
	var o = { name: name, type: type, links: null };
	if(extra_info)
		for(var i in extra_info)
			o[i] = extra_info[i];

	if(!this.outputs)
		this.outputs = [];
	this.outputs.push(o);
	if(this.onOutputAdded)
		this.onOutputAdded(o);
	this.size = this.computeSize();
	this.setDirtyCanvas(true,true);
	return o;
}

/**
* add a new output slot to use in this node
* @method addOutputs
* @param {Array} array of triplets like [[name,type,extra_info],[...]]
*/
LGraphNode.prototype.addOutputs = function(array)
{
	for(var i = 0; i < array.length; ++i)
	{
		var info = array[i];
		var o = {name:info[0],type:info[1],link:null};
		if(array[2])
			for(var j in info[2])
				o[j] = info[2][j];

		if(!this.outputs)
			this.outputs = [];
		this.outputs.push(o);
		if(this.onOutputAdded)
			this.onOutputAdded(o);
	}

	this.size = this.computeSize();
	this.setDirtyCanvas(true,true);
}

/**
* remove an existing output slot
* @method removeOutput
* @param {number} slot
*/
LGraphNode.prototype.removeOutput = function(slot)
{
	this.disconnectOutput(slot);
	this.outputs.splice(slot,1);
	for(var i = slot; i < this.outputs.length; ++i)
	{
		if( !this.outputs[i] || !this.outputs[i].links )
			continue;
		var links = this.outputs[i].links;
		for(var j = 0; j < links.length; ++j)
		{
			var link = this.graph.links[ links[j] ];
			if(!link)
				continue;
			link.origin_slot -= 1;
		}
	}

	this.size = this.computeSize();
	if(this.onOutputRemoved)
		this.onOutputRemoved(slot);
	this.setDirtyCanvas(true,true);
}

/**
* add a new input slot to use in this node
* @method addInput
* @param {string} name
* @param {string} type string defining the input type ("vec3","number",...), it its a generic one use 0
* @param {Object} extra_info this can be used to have special properties of an input (label, color, position, etc)
*/
LGraphNode.prototype.addInput = function(name,type,extra_info)
{
	type = type || 0;
	var o = {name:name,type:type,link:null};
	if(extra_info)
		for(var i in extra_info)
			o[i] = extra_info[i];

	if(!this.inputs)
		this.inputs = [];
	this.inputs.push(o);
	this.size = this.computeSize();
	if(this.onInputAdded)
		this.onInputAdded(o);
	this.setDirtyCanvas(true,true);
	return o;
}

/**
* add several new input slots in this node
* @method addInputs
* @param {Array} array of triplets like [[name,type,extra_info],[...]]
*/
LGraphNode.prototype.addInputs = function(array)
{
	for(var i = 0; i < array.length; ++i)
	{
		var info = array[i];
		var o = {name:info[0], type:info[1], link:null};
		if(array[2])
			for(var j in info[2])
				o[j] = info[2][j];

		if(!this.inputs)
			this.inputs = [];
		this.inputs.push(o);
		if(this.onInputAdded)
			this.onInputAdded(o);
	}

	this.size = this.computeSize();
	this.setDirtyCanvas(true,true);
}

/**
* remove an existing input slot
* @method removeInput
* @param {number} slot
*/
LGraphNode.prototype.removeInput = function(slot)
{
	this.disconnectInput(slot);
	this.inputs.splice(slot,1);
	for(var i = slot; i < this.inputs.length; ++i)
	{
		if(!this.inputs[i])
			continue;
		var link = this.graph.links[ this.inputs[i].link ];
		if(!link)
			continue;
		link.target_slot -= 1;
	}
	this.size = this.computeSize();
	if(this.onInputRemoved)
		this.onInputRemoved(slot);
	this.setDirtyCanvas(true,true);
}

/**
* add an special connection to this node (used for special kinds of graphs)
* @method addConnection
* @param {string} name
* @param {string} type string defining the input type ("vec3","number",...)
* @param {[x,y]} pos position of the connection inside the node
* @param {string} direction if is input or output
*/
LGraphNode.prototype.addConnection = function(name,type,pos,direction)
{
	var o = {
		name: name,
		type: type,
		pos: pos,
		direction: direction,
		links: null
	};
	this.connections.push( o );
	return o;
}

/**
* computes the size of a node according to its inputs and output slots
* @method computeSize
* @param {number} minHeight
* @return {number} the total size
*/
LGraphNode.prototype.computeSize = function( minHeight, out )
{
	var rows = Math.max( this.inputs ? this.inputs.length : 1, this.outputs ? this.outputs.length : 1);
	var size = out || new Float32Array([0,0]);
	rows = Math.max(rows, 1);
	var font_size = LiteGraph.NODE_TEXT_SIZE; //although it should be graphcanvas.inner_text_font size
	size[1] = (this.constructor.slot_start_y || 0) + rows * (font_size + 1) + 4;
	if( this.widgets && this.widgets.length )
		size[1] += this.widgets.length * (LiteGraph.NODE_WIDGET_HEIGHT + 4) + 8;

	var font_size = font_size;
	var title_width = compute_text_size( this.title );
	var input_width = 0;
	var output_width = 0;

	if(this.inputs)
		for(var i = 0, l = this.inputs.length; i < l; ++i)
		{
			var input = this.inputs[i];
			var text = input.label || input.name || "";
			var text_width = compute_text_size( text );
			if(input_width < text_width)
				input_width = text_width;
		}

	if(this.outputs)
		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			var output = this.outputs[i];
			var text = output.label || output.name || "";
			var text_width = compute_text_size( text );
			if(output_width < text_width)
				output_width = text_width;
		}

	size[0] = Math.max( input_width + output_width + 10, title_width );
	size[0] = Math.max( size[0], LiteGraph.NODE_WIDTH );
	if(this.widgets && this.widgets.length)
		size[0] = Math.max( size[0], LiteGraph.NODE_WIDTH * 1.5 );

	if(this.onResize)
		this.onResize(size);

	function compute_text_size( text )
	{
		if(!text)
			return 0;
		return font_size * text.length * 0.6;
	}

	return size;
}

/**
* Allows to pass 
* 
* @method addWidget
* @return {Float32Array[4]} the total size
*/
LGraphNode.prototype.addWidget = function( type, name, value, callback, options )
{
	if(!this.widgets)
		this.widgets = [];
	var w = {
		type: type.toLowerCase(),
		name: name,
		value: value,
		callback: callback,
		options: options || {}
	};

	if(w.options.y !== undefined )
		w.y = w.options.y;

	if( !callback )
		console.warn("LiteGraph addWidget('button',...) without a callback");
	if( type == "combo" && !w.options.values )
		throw("LiteGraph addWidget('combo',...) requires to pass values in options: { values:['red','blue'] }");
	this.widgets.push(w);
	return w;
}


/**
* returns the bounding of the object, used for rendering purposes
* bounding is: [topleft_cornerx, topleft_cornery, width, height]
* @method getBounding
* @return {Float32Array[4]} the total size
*/
LGraphNode.prototype.getBounding = function( out )
{
	out = out || new Float32Array(4);
	out[0] = this.pos[0] - 4;
	out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
	out[2] = this.size[0] + 4;
	out[3] = this.size[1] + LiteGraph.NODE_TITLE_HEIGHT;
	return out;
}

/**
* checks if a point is inside the shape of a node
* @method isPointInside
* @param {number} x
* @param {number} y
* @return {boolean}
*/
LGraphNode.prototype.isPointInside = function( x, y, margin, skip_title )
{
	margin = margin || 0;

	var margin_top = this.graph && this.graph.isLive() ? 0 : 20;
	if(skip_title)
		margin_top = 0;
	if(this.flags && this.flags.collapsed)
	{
		//if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
		if( isInsideRectangle( x, y, this.pos[0] - margin, this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT - margin, (this._collapsed_width||LiteGraph.NODE_COLLAPSED_WIDTH) + 2 * margin, LiteGraph.NODE_TITLE_HEIGHT + 2 * margin ) )
			return true;
	}
	else if ( (this.pos[0] - 4 - margin) < x && (this.pos[0] + this.size[0] + 4 + margin) > x
		&& (this.pos[1] - margin_top - margin) < y && (this.pos[1] + this.size[1] + margin) > y)
		return true;
	return false;
}

/**
* checks if a point is inside a node slot, and returns info about which slot
* @method getSlotInPosition
* @param {number} x
* @param {number} y
* @return {Object} if found the object contains { input|output: slot object, slot: number, link_pos: [x,y] }
*/
LGraphNode.prototype.getSlotInPosition = function( x, y )
{
	//search for inputs
	if(this.inputs)
		for(var i = 0, l = this.inputs.length; i < l; ++i)
		{
			var input = this.inputs[i];
			var link_pos = this.getConnectionPos( true,i );
			if( isInsideRectangle(x, y, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
				return { input: input, slot: i, link_pos: link_pos, locked: input.locked };
		}

	if(this.outputs)
		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			var output = this.outputs[i];
			var link_pos = this.getConnectionPos(false,i);
			if( isInsideRectangle(x, y, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
				return { output: output, slot: i, link_pos: link_pos, locked: output.locked };
		}

	return null;
}

/**
* returns the input slot with a given name (used for dynamic slots), -1 if not found
* @method findInputSlot
* @param {string} name the name of the slot
* @return {number} the slot (-1 if not found)
*/
LGraphNode.prototype.findInputSlot = function(name)
{
	if(!this.inputs)
		return -1;
	for(var i = 0, l = this.inputs.length; i < l; ++i)
		if(name == this.inputs[i].name)
			return i;
	return -1;
}

/**
* returns the output slot with a given name (used for dynamic slots), -1 if not found
* @method findOutputSlot
* @param {string} name the name of the slot
* @return {number} the slot (-1 if not found)
*/
LGraphNode.prototype.findOutputSlot = function(name)
{
	if(!this.outputs) return -1;
	for(var i = 0, l = this.outputs.length; i < l; ++i)
		if(name == this.outputs[i].name)
			return i;
	return -1;
}

/**
* connect this node output to the input of another node
* @method connect
* @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
* @param {LGraphNode} node the target node
* @param {number_or_string} target_slot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
* @return {boolean} if it was connected succesfully
*/
LGraphNode.prototype.connect = function( slot, target_node, target_slot )
{
	target_slot = target_slot || 0;

	if(!this.graph) //could be connected before adding it to a graph
	{
		console.log("Connect: Error, node doesnt belong to any graph. Nodes must be added first to a graph before connecting them."); //due to link ids being associated with graphs
		return false;
	}


	//seek for the output slot
	if( slot.constructor === String )
	{
		slot = this.findOutputSlot(slot);
		if(slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + slot);
			return false;
		}
	}
	else if(!this.outputs || slot >= this.outputs.length)
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	if(target_node && target_node.constructor === Number)
		target_node = this.graph.getNodeById( target_node );
	if(!target_node)
		throw("target node is null");

	//avoid loopback
	if(target_node == this)
		return false;

	//you can specify the slot by name
	if(target_slot.constructor === String)
	{
		target_slot = target_node.findInputSlot( target_slot );
		if(target_slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + target_slot);
			return false;
		}
	}
	else if( target_slot === LiteGraph.EVENT )
	{
		//search for first slot with event?
		/*
		//create input for trigger
		var input = target_node.addInput("onTrigger", LiteGraph.EVENT );
		target_slot = target_node.inputs.length - 1; //last one is the one created
		target_node.mode = LiteGraph.ON_TRIGGER;
		*/
		return false;
	}
	else if( !target_node.inputs || target_slot >= target_node.inputs.length )
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	//if there is something already plugged there, disconnect
	if(target_node.inputs[ target_slot ].link != null )
		target_node.disconnectInput( target_slot );

	//why here??
	//this.setDirtyCanvas(false,true);
	//this.graph.connectionChange( this );

	var output = this.outputs[slot];

	//allows nodes to block connection
	if(target_node.onConnectInput)
		if( target_node.onConnectInput( target_slot, output.type, output ) === false)
			return false;

	var input = target_node.inputs[target_slot];

	if( LiteGraph.isValidConnection( output.type, input.type ) )
	{
		var link_info = {
			id: this.graph.last_link_id++,
			type: input.type,
			origin_id: this.id,
			origin_slot: slot,
			target_id: target_node.id,
			target_slot: target_slot
		};

		//add to graph links list
		this.graph.links[ link_info.id ] = link_info;

		//connect in output
		if( output.links == null )
			output.links = [];
		output.links.push( link_info.id );
		//connect in input
		target_node.inputs[target_slot].link = link_info.id;
		if(this.graph)
			this.graph._version++;
		if(this.onConnectionsChange)
			this.onConnectionsChange( LiteGraph.OUTPUT, slot, true, link_info, output ); //link_info has been created now, so its updated
		if(target_node.onConnectionsChange)
			target_node.onConnectionsChange( LiteGraph.INPUT, target_slot, true, link_info, input );
		if( this.graph && this.graph.onNodeConnectionChange )
		{
			this.graph.onNodeConnectionChange( LiteGraph.INPUT, target_node, target_slot, this, slot );
			this.graph.onNodeConnectionChange( LiteGraph.OUTPUT, this, slot, target_node, target_slot );
		}
	}

	this.setDirtyCanvas(false,true);
	this.graph.connectionChange( this );

	return true;
}

/**
* disconnect one output to an specific node
* @method disconnectOutput
* @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
* @param {LGraphNode} target_node the target node to which this slot is connected [Optional, if not target_node is specified all nodes will be disconnected]
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectOutput = function( slot, target_node )
{
	if( slot.constructor === String )
	{
		slot = this.findOutputSlot(slot);
		if(slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + slot);
			return false;
		}
	}
	else if(!this.outputs || slot >= this.outputs.length)
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	//get output slot
	var output = this.outputs[slot];
	if(!output || !output.links || output.links.length == 0)
		return false;

	//one of the output links in this slot
	if(target_node)
	{
		if(target_node.constructor === Number)
			target_node = this.graph.getNodeById( target_node );
		if(!target_node)
			throw("Target Node not found");

		for(var i = 0, l = output.links.length; i < l; i++)
		{
			var link_id = output.links[i];
			var link_info = this.graph.links[ link_id ];

			//is the link we are searching for...
			if( link_info.target_id == target_node.id )
			{
				output.links.splice(i,1); //remove here
				var input = target_node.inputs[ link_info.target_slot ];
				input.link = null; //remove there
				delete this.graph.links[ link_id ]; //remove the link from the links pool
				if(this.graph)
					this.graph._version++;
				if(target_node.onConnectionsChange)
					target_node.onConnectionsChange( LiteGraph.INPUT, link_info.target_slot, false, link_info, input ); //link_info hasnt been modified so its ok
				if(this.onConnectionsChange)
					this.onConnectionsChange( LiteGraph.OUTPUT, slot, false, link_info, output );
				if( this.graph && this.graph.onNodeConnectionChange )
					this.graph.onNodeConnectionChange( LiteGraph.OUTPUT, this, slot );
				if( this.graph && this.graph.onNodeConnectionChange )
				{
					this.graph.onNodeConnectionChange( LiteGraph.OUTPUT, this, slot );
					this.graph.onNodeConnectionChange( LiteGraph.INPUT, target_node, link_info.target_slot );
				}
				break;
			}
		}
	}
	else //all the links in this output slot
	{
		for(var i = 0, l = output.links.length; i < l; i++)
		{
			var link_id = output.links[i];
			var link_info = this.graph.links[ link_id ];
			if(!link_info) //bug: it happens sometimes
				continue;

			var target_node = this.graph.getNodeById( link_info.target_id );
			var input = null;
			if(this.graph)
				this.graph._version++;
			if(target_node)
			{
				input = target_node.inputs[ link_info.target_slot ];
				input.link = null; //remove other side link
				if(target_node.onConnectionsChange)
					target_node.onConnectionsChange( LiteGraph.INPUT, link_info.target_slot, false, link_info, input ); //link_info hasnt been modified so its ok
				if( this.graph && this.graph.onNodeConnectionChange )
					this.graph.onNodeConnectionChange( LiteGraph.INPUT, target_node, link_info.target_slot );
			}
			delete this.graph.links[ link_id ]; //remove the link from the links pool
			if(this.onConnectionsChange)
				this.onConnectionsChange( LiteGraph.OUTPUT, slot, false, link_info, output );
			if( this.graph && this.graph.onNodeConnectionChange )
			{
				this.graph.onNodeConnectionChange( LiteGraph.OUTPUT, this, slot );
				this.graph.onNodeConnectionChange( LiteGraph.INPUT, target_node, link_info.target_slot );
			}
		}
		output.links = null;
	}


	this.setDirtyCanvas(false,true);
	this.graph.connectionChange( this );
	return true;
}

/**
* disconnect one input
* @method disconnectInput
* @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectInput = function( slot )
{
	//seek for the output slot
	if( slot.constructor === String )
	{
		slot = this.findInputSlot(slot);
		if(slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + slot);
			return false;
		}
	}
	else if(!this.inputs || slot >= this.inputs.length)
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	var input = this.inputs[slot];
	if(!input)
		return false;

	var link_id = this.inputs[slot].link;
	this.inputs[slot].link = null;

	//remove other side
	var link_info = this.graph.links[ link_id ];
	if( link_info )
	{
		var target_node = this.graph.getNodeById( link_info.origin_id );
		if(!target_node)
			return false;

		var output = target_node.outputs[ link_info.origin_slot ];
		if(!output || !output.links || output.links.length == 0)
			return false;

		//search in the inputs list for this link
		for(var i = 0, l = output.links.length; i < l; i++)
		{
			if( output.links[i] == link_id )
			{
				output.links.splice(i,1);
				break;
			}
		}

		delete this.graph.links[ link_id ]; //remove from the pool
		if(this.graph)
			this.graph._version++;
		if( this.onConnectionsChange )
			this.onConnectionsChange( LiteGraph.INPUT, slot, false, link_info, input );
		if( target_node.onConnectionsChange )
			target_node.onConnectionsChange( LiteGraph.OUTPUT, i, false, link_info, output );
		if( this.graph && this.graph.onNodeConnectionChange )
		{
			this.graph.onNodeConnectionChange( LiteGraph.OUTPUT, target_node, i );
			this.graph.onNodeConnectionChange( LiteGraph.INPUT, this, slot );
		}
	}

	this.setDirtyCanvas(false,true);
	this.graph.connectionChange( this );
	return true;
}

/**
* returns the center of a connection point in canvas coords
* @method getConnectionPos
* @param {boolean} is_input true if if a input slot, false if it is an output
* @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
* @return {[x,y]} the position
**/
LGraphNode.prototype.getConnectionPos = function( is_input, slot_number )
{
	if(this.flags.collapsed)
	{
		if(is_input)
			return [this.pos[0], this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5];
		else
			return [this.pos[0] + (this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH), this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5];
	}

	if(is_input && slot_number == -1)
	{
		return [this.pos[0] + 10, this.pos[1] + 10];
	}

	//hardcoded pos
	if(is_input && this.inputs && this.inputs.length > slot_number && this.inputs[slot_number].pos)
		return [this.pos[0] + this.inputs[slot_number].pos[0],this.pos[1] + this.inputs[slot_number].pos[1]];
	else if(!is_input && this.outputs && this.outputs.length > slot_number && this.outputs[slot_number].pos)
		return [this.pos[0] + this.outputs[slot_number].pos[0],this.pos[1] + this.outputs[slot_number].pos[1]];

	//horizontal distributed slots
	if(this.flags.horizontal)
	{
		if(is_input)
			return [this.pos[0] + (slot_number + 0.5) * (this.size[0] / (this.inputs.length)), this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT ];
		return [this.pos[0] + (slot_number + 0.5) * (this.size[0] / (this.outputs.length)), this.pos[1] + this.size[1] ];
	}
	
	//default
	if(is_input)
		return [this.pos[0] , this.pos[1] + 10 + slot_number * LiteGraph.NODE_SLOT_HEIGHT + (this.constructor.slot_start_y || 0) ];
	return [this.pos[0] + this.size[0] + 1, this.pos[1] + 10 + slot_number * LiteGraph.NODE_SLOT_HEIGHT + (this.constructor.slot_start_y || 0)];
}

/* Force align to grid */
LGraphNode.prototype.alignToGrid = function()
{
	this.pos[0] = LiteGraph.CANVAS_GRID_SIZE * Math.round(this.pos[0] / LiteGraph.CANVAS_GRID_SIZE);
	this.pos[1] = LiteGraph.CANVAS_GRID_SIZE * Math.round(this.pos[1] / LiteGraph.CANVAS_GRID_SIZE);
}


/* Console output */
LGraphNode.prototype.trace = function(msg)
{
	if(!this.console)
		this.console = [];
	this.console.push(msg);
	if(this.console.length > LGraphNode.MAX_CONSOLE)
		this.console.shift();

	this.graph.onNodeTrace(this,msg);
}

/* Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
LGraphNode.prototype.setDirtyCanvas = function(dirty_foreground, dirty_background)
{
	if(!this.graph)
		return;
	this.graph.sendActionToCanvas("setDirty",[dirty_foreground, dirty_background]);
}

LGraphNode.prototype.loadImage = function(url)
{
	var img = new Image();
	img.src = LiteGraph.node_images_path + url;
	img.ready = false;

	var that = this;
	img.onload = function() {
		this.ready = true;
		that.setDirtyCanvas(true);
	}
	return img;
}

//safe LGraphNode action execution (not sure if safe)
/*
LGraphNode.prototype.executeAction = function(action)
{
	if(action == "") return false;

	if( action.indexOf(";") != -1 || action.indexOf("}") != -1)
	{
		this.trace("Error: Action contains unsafe characters");
		return false;
	}

	var tokens = action.split("(");
	var func_name = tokens[0];
	if( typeof(this[func_name]) != "function")
	{
		this.trace("Error: Action not found on node: " + func_name);
		return false;
	}

	var code = action;

	try
	{
		var _foo = eval;
		eval = null;
		(new Function("with(this) { " + code + "}")).call(this);
		eval = _foo;
	}
	catch (err)
	{
		this.trace("Error executing action {" + action + "} :" + err);
		return false;
	}

	return true;
}
*/

/* Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
LGraphNode.prototype.captureInput = function(v)
{
	if(!this.graph || !this.graph.list_of_graphcanvas)
		return;

	var list = this.graph.list_of_graphcanvas;

	for(var i = 0; i < list.length; ++i)
	{
		var c = list[i];
		//releasing somebody elses capture?!
		if(!v && c.node_capturing_input != this)
			continue;

		//change
		c.node_capturing_input = v ? this : null;
	}
}

/**
* Collapse the node to make it smaller on the canvas
* @method collapse
**/
LGraphNode.prototype.collapse = function( force )
{
	this.graph._version++;
	if(this.constructor.collapsable === false && !force)
		return;
	if(!this.flags.collapsed)
		this.flags.collapsed = true;
	else
		this.flags.collapsed = false;
	this.setDirtyCanvas(true,true);
}

/**
* Forces the node to do not move or realign on Z
* @method pin
**/

LGraphNode.prototype.pin = function(v)
{
	this.graph._version++;
	if(v === undefined)
		this.flags.pinned = !this.flags.pinned;
	else
		this.flags.pinned = v;
}

LGraphNode.prototype.localToScreen = function(x,y, graphcanvas)
{
	return [(x + this.pos[0]) * graphcanvas.scale + graphcanvas.offset[0],
		(y + this.pos[1]) * graphcanvas.scale + graphcanvas.offset[1]];
}




function LGraphGroup( title )
{
	this._ctor( title );
}

global.LGraphGroup = LiteGraph.LGraphGroup = LGraphGroup;

LGraphGroup.prototype._ctor = function( title )
{
	this.title = title || "Group";
	this._bounding = new Float32Array([10,10,140,80]);
	this._pos = this._bounding.subarray(0,2);
	this._size = this._bounding.subarray(2,4);
	this._nodes = [];
	this.color = LGraphCanvas.node_colors.pale_blue ? LGraphCanvas.node_colors.pale_blue.groupcolor : "#AAA";
	this.graph = null;

	Object.defineProperty( this, "pos", {
		set: function(v)
		{
			if(!v || v.length < 2)
				return;
			this._pos[0] = v[0];
			this._pos[1] = v[1];
		},
		get: function()
		{
			return this._pos;
		},
		enumerable: true
	});

	Object.defineProperty( this, "size", {
		set: function(v)
		{
			if(!v || v.length < 2)
				return;
			this._size[0] = Math.max(140,v[0]);
			this._size[1] = Math.max(80,v[1]);
		},
		get: function()
		{
			return this._size;
		},
		enumerable: true
	});
}

LGraphGroup.prototype.configure = function(o)
{
	this.title = o.title;
	this._bounding.set( o.bounding );
	this.color = o.color;
}

LGraphGroup.prototype.serialize = function()
{
	var b = this._bounding;
	return {
		title: this.title,
		bounding: [ Math.round(b[0]), Math.round(b[1]), Math.round(b[2]), Math.round(b[3]) ],
		color: this.color
	};
}

LGraphGroup.prototype.move = function(deltax, deltay, ignore_nodes)
{
	this._pos[0] += deltax;
	this._pos[1] += deltay;
	if(ignore_nodes)
		return;
	for(var i = 0; i < this._nodes.length; ++i)
	{
		var node = this._nodes[i];
		node.pos[0] += deltax;
		node.pos[1] += deltay;
	}
}

LGraphGroup.prototype.recomputeInsideNodes = function()
{
	this._nodes.length = 0;
	var nodes = this.graph._nodes;
	var node_bounding = new Float32Array(4);

	for(var i = 0; i < nodes.length; ++i)
	{
		var node = nodes[i];
		node.getBounding( node_bounding );
		if(!overlapBounding( this._bounding, node_bounding ))
			continue; //out of the visible area
		this._nodes.push( node );
	}
}

LGraphGroup.prototype.isPointInside = LGraphNode.prototype.isPointInside;
LGraphGroup.prototype.setDirtyCanvas = LGraphNode.prototype.setDirtyCanvas;

//*********************************************************************************
// LGraphCanvas: LGraph renderer CLASS
//*********************************************************************************

/**
* This class is in charge of rendering one graph inside a canvas. And provides all the interaction required.
* Valid callbacks are: onNodeSelected, onNodeDeselected, onShowNodePanel, onNodeDblClicked
*
* @class LGraphCanvas
* @constructor
* @param {HTMLCanvas} canvas the canvas where you want to render (it accepts a selector in string format or the canvas element itself)
* @param {LGraph} graph [optional]
* @param {Object} options [optional] { skip_rendering, autoresize }
*/
function LGraphCanvas( canvas, graph, options )
{
	options = options || {};

	//if(graph === undefined)
  //	throw ("No graph assigned");
	this.background_image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQBJREFUeNrs1rEKwjAUhlETUkj3vP9rdmr1Ysammk2w5wdxuLgcMHyptfawuZX4pJSWZTnfnu/lnIe/jNNxHHGNn//HNbbv+4dr6V+11uF527arU7+u63qfa/bnmh8sWLBgwYJlqRf8MEptXPBXJXa37BSl3ixYsGDBMliwFLyCV/DeLIMFCxYsWLBMwSt4Be/NggXLYMGCBUvBK3iNruC9WbBgwYJlsGApeAWv4L1ZBgsWLFiwYJmCV/AK3psFC5bBggULloJX8BpdwXuzYMGCBctgwVLwCl7Be7MMFixYsGDBsu8FH1FaSmExVfAxBa/gvVmwYMGCZbBg/W4vAQYA5tRF9QYlv/QAAAAASUVORK5CYII='

	if(canvas && canvas.constructor === String )
		canvas = document.querySelector( canvas );

	this.max_zoom = 10;
	this.min_zoom = 0.1;
	this.zoom_modify_alpha = true; //otherwise it generates ugly patterns when scaling down too much

	this.title_text_font = "bold "+LiteGraph.NODE_TEXT_SIZE+"px Arial";
	this.inner_text_font = "normal "+LiteGraph.NODE_SUBTEXT_SIZE+"px Arial";
	this.node_title_color = LiteGraph.NODE_TITLE_COLOR;
	this.default_link_color = LiteGraph.LINK_COLOR;
	this.default_connection_color = {
		input_off: "#AAB",
		input_on: "#7F7",
		output_off: "#AAB",
		output_on: "#7F7"
	};

	this.highquality_render = true;
	this.use_gradients = false; //set to true to render titlebar with gradients
	this.editor_alpha = 1; //used for transition
	this.pause_rendering = false;
	this.render_shadows = true;
	this.clear_background = true;

	this.render_only_selected = true;
	this.live_mode = false;
	this.show_info = true;
	this.allow_dragcanvas = true;
	this.allow_dragnodes = true;
	this.allow_interaction = true; //allow to control widgets, buttons, collapse, etc
	this.allow_searchbox = true;
	this.allow_reconnect_links = false; //allows to change a connection with having to redo it again
	this.drag_mode = false;
	this.dragging_rectangle = null;

	this.filter = null; //allows to filter to only accept some type of nodes in a graph

	this.always_render_background = false;
	this.render_canvas_border = true;
	this.render_connections_shadows = false; //too much cpu
	this.render_connections_border = true;
	this.render_curved_connections = true;
	this.render_connection_arrows = true;
	this.render_execution_order = false;

	this.canvas_mouse = [0,0]; //mouse in canvas graph coordinates, where 0,0 is the top-left corner of the blue rectangle

	//to personalize the search box
	this.onSearchBox = null;
	this.onSearchBoxSelection = null;

	this.connections_width = 3;
	this.round_radius = 8;

	this.current_node = null;
	this.node_widget = null; //used for widgets
	this.last_mouse_position = [0,0];
	this.visible_area = new Float32Array(4);

	//link canvas and graph
	if(graph)
		graph.attachCanvas(this);

	this.setCanvas( canvas );
	this.clear();

	if(!options.skip_render)
		this.startRendering();

	this.autoresize = options.autoresize;
}

global.LGraphCanvas = LiteGraph.LGraphCanvas = LGraphCanvas;

LGraphCanvas.link_type_colors = {"-1":"#F85",'number':"#AAC","node":"#DCA"};
LGraphCanvas.gradients = {}; //cache of gradients

/**
* clears all the data inside
*
* @method clear
*/
LGraphCanvas.prototype.clear = function()
{
	this.frame = 0;
	this.last_draw_time = 0;
	this.render_time = 0;
	this.fps = 0;

	this.scale = 1;
	this.offset = [0,0];

	this.dragging_rectangle = null;

	this.selected_nodes = {};
	this.selected_group = null;

	this.visible_nodes = [];
	this.node_dragged = null;
	this.node_over = null;
	this.node_capturing_input = null;
	this.connecting_node = null;
	this.highlighted_links = {};

	this.dirty_canvas = true;
	this.dirty_bgcanvas = true;
	this.dirty_area = null;

	this.node_in_panel = null;
	this.node_widget = null;

	this.last_mouse = [0,0];
	this.last_mouseclick = 0;
	this.visible_area.set([0,0,0,0]);

	if(this.onClear)
		this.onClear();
	//this.UIinit();
}

/**
* assigns a graph, you can reasign graphs to the same canvas
*
* @method setGraph
* @param {LGraph} graph
*/
LGraphCanvas.prototype.setGraph = function( graph, skip_clear )
{
	if(this.graph == graph)
		return;

	if(!skip_clear)
		this.clear();

	if(!graph && this.graph)
	{
		this.graph.detachCanvas(this);
		return;
	}

	/*
	if(this.graph)
		this.graph.canvas = null; //remove old graph link to the canvas
	this.graph = graph;
	if(this.graph)
		this.graph.canvas = this;
	*/
	graph.attachCanvas(this);
	this.setDirty(true,true);
}

/**
* opens a graph contained inside a node in the current graph
*
* @method openSubgraph
* @param {LGraph} graph
*/
LGraphCanvas.prototype.openSubgraph = function(graph)
{
	if(!graph)
		throw("graph cannot be null");

	if(this.graph == graph)
		throw("graph cannot be the same");

	this.clear();

	if(this.graph)
	{
		if(!this._graph_stack)
			this._graph_stack = [];
		this._graph_stack.push(this.graph);
	}

	graph.attachCanvas(this);
	this.setDirty(true,true);
}

/**
* closes a subgraph contained inside a node
*
* @method closeSubgraph
* @param {LGraph} assigns a graph
*/
LGraphCanvas.prototype.closeSubgraph = function()
{
	if(!this._graph_stack || this._graph_stack.length == 0)
		return;
	var graph = this._graph_stack.pop();
	this.selected_nodes = {};
	this.highlighted_links = {};
	graph.attachCanvas(this);
	this.setDirty(true,true);
}

/**
* assigns a canvas
*
* @method setCanvas
* @param {Canvas} assigns a canvas (also accepts the ID of the element (not a selector)
*/
LGraphCanvas.prototype.setCanvas = function( canvas, skip_events )
{
	var that = this;

	if(canvas)
	{
		if( canvas.constructor === String )
		{
			canvas = document.getElementById(canvas);
			if(!canvas)
				throw("Error creating LiteGraph canvas: Canvas not found");
		}
	}

	if(canvas === this.canvas)
		return;

	if(!canvas && this.canvas)
	{
		//maybe detach events from old_canvas
		if(!skip_events)
			this.unbindEvents();
	}

	this.canvas = canvas;

	if(!canvas)
		return;

	//this.canvas.tabindex = "1000";
	canvas.className += " lgraphcanvas";
	canvas.data = this;

	//bg canvas: used for non changing stuff
	this.bgcanvas = null;
	if(!this.bgcanvas)
	{
		this.bgcanvas = document.createElement("canvas");
		this.bgcanvas.width = this.canvas.width;
		this.bgcanvas.height = this.canvas.height;
	}

	if(canvas.getContext == null)
	{
		if( canvas.localName != "canvas" )
			throw("Element supplied for LGraphCanvas must be a <canvas> element, you passed a " + canvas.localName );
		throw("This browser doesnt support Canvas");
	}

	var ctx = this.ctx = canvas.getContext("2d");
	if(ctx == null)
	{
		if(!canvas.webgl_enabled)
			console.warn("This canvas seems to be WebGL, enabling WebGL renderer");
		this.enableWebGL();
	}

	//input:  (move and up could be unbinded)
	this._mousemove_callback = this.processMouseMove.bind(this);
	this._mouseup_callback = this.processMouseUp.bind(this);

	if(!skip_events)
		this.bindEvents();
}

//used in some events to capture them
LGraphCanvas.prototype._doNothing = function doNothing(e) { e.preventDefault(); return false; };
LGraphCanvas.prototype._doReturnTrue = function doNothing(e) { e.preventDefault(); return true; };

/**
* binds mouse, keyboard, touch and drag events to the canvas
* @method bindEvents
**/
LGraphCanvas.prototype.bindEvents = function()
{
	if(	this._events_binded )
	{
		console.warn("LGraphCanvas: events already binded");
		return;
	}

	var canvas = this.canvas;
	var ref_window = this.getCanvasWindow();
	var document = ref_window.document; //hack used when moving canvas between windows

	this._mousedown_callback = this.processMouseDown.bind(this);
	this._mousewheel_callback = this.processMouseWheel.bind(this);

	canvas.addEventListener("mousedown", this._mousedown_callback, true ); //down do not need to store the binded
	canvas.addEventListener("mousemove", this._mousemove_callback );
	canvas.addEventListener("mousewheel", this._mousewheel_callback, false);

	canvas.addEventListener("contextmenu", this._doNothing );
	canvas.addEventListener("DOMMouseScroll", this._mousewheel_callback, false);

	//touch events
	//if( 'touchstart' in document.documentElement )
	{
		canvas.addEventListener("touchstart", this.touchHandler, true);
		canvas.addEventListener("touchmove", this.touchHandler, true);
		canvas.addEventListener("touchend", this.touchHandler, true);
		canvas.addEventListener("touchcancel", this.touchHandler, true);
	}

	//Keyboard ******************
	this._key_callback = this.processKey.bind(this);

	canvas.addEventListener("keydown", this._key_callback, true );
	document.addEventListener("keyup", this._key_callback, true ); //in document, otherwise it doesnt fire keyup

	//Droping Stuff over nodes ************************************
	this._ondrop_callback = this.processDrop.bind(this);

	canvas.addEventListener("dragover", this._doNothing, false );
	canvas.addEventListener("dragend", this._doNothing, false );
	canvas.addEventListener("drop", this._ondrop_callback, false );
	canvas.addEventListener("dragenter", this._doReturnTrue, false );

	this._events_binded = true;
}

/**
* unbinds mouse events from the canvas
* @method unbindEvents
**/
LGraphCanvas.prototype.unbindEvents = function()
{
	if(	!this._events_binded )
	{
		console.warn("LGraphCanvas: no events binded");
		return;
	}

	var ref_window = this.getCanvasWindow();
	var document = ref_window.document;

	this.canvas.removeEventListener( "mousedown", this._mousedown_callback );
	this.canvas.removeEventListener( "mousewheel", this._mousewheel_callback );
	this.canvas.removeEventListener( "DOMMouseScroll", this._mousewheel_callback );
	this.canvas.removeEventListener( "keydown", this._key_callback );
	document.removeEventListener( "keyup", this._key_callback );
	this.canvas.removeEventListener( "contextmenu", this._doNothing );
	this.canvas.removeEventListener( "drop", this._ondrop_callback );
	this.canvas.removeEventListener( "dragenter", this._doReturnTrue );

	this.canvas.removeEventListener("touchstart", this.touchHandler );
	this.canvas.removeEventListener("touchmove", this.touchHandler );
	this.canvas.removeEventListener("touchend", this.touchHandler );
	this.canvas.removeEventListener("touchcancel", this.touchHandler );

	this._mousedown_callback = null;
	this._mousewheel_callback = null;
	this._key_callback = null;
	this._ondrop_callback = null;

	this._events_binded = false;
}

LGraphCanvas.getFileExtension = function (url)
{
	var question = url.indexOf("?");
	if(question != -1)
		url = url.substr(0,question);
	var point = url.lastIndexOf(".");
	if(point == -1)
		return "";
	return url.substr(point+1).toLowerCase();
}

/**
* this function allows to render the canvas using WebGL instead of Canvas2D
* this is useful if you plant to render 3D objects inside your nodes, it uses litegl.js for webgl and canvas2DtoWebGL to emulate the Canvas2D calls in webGL
* @method enableWebGL
**/
LGraphCanvas.prototype.enableWebGL = function()
{
	if(typeof(GL) === undefined)
		throw("litegl.js must be included to use a WebGL canvas");
	if(typeof(enableWebGLCanvas) === undefined)
		throw("webglCanvas.js must be included to use this feature");

	this.gl = this.ctx = enableWebGLCanvas(this.canvas);
	this.ctx.webgl = true;
	this.bgcanvas = this.canvas;
	this.bgctx = this.gl;
	this.canvas.webgl_enabled = true;

	/*
	GL.create({ canvas: this.bgcanvas });
	this.bgctx = enableWebGLCanvas( this.bgcanvas );
	window.gl = this.gl;
	*/
}


/**
* marks as dirty the canvas, this way it will be rendered again
*
* @class LGraphCanvas
* @method setDirty
* @param {bool} fgcanvas if the foreground canvas is dirty (the one containing the nodes)
* @param {bool} bgcanvas if the background canvas is dirty (the one containing the wires)
*/
LGraphCanvas.prototype.setDirty = function( fgcanvas, bgcanvas )
{
	if(fgcanvas)
		this.dirty_canvas = true;
	if(bgcanvas)
		this.dirty_bgcanvas = true;
}

/**
* Used to attach the canvas in a popup
*
* @method getCanvasWindow
* @return {window} returns the window where the canvas is attached (the DOM root node)
*/
LGraphCanvas.prototype.getCanvasWindow = function()
{
	if(!this.canvas)
		return window;
	var doc = this.canvas.ownerDocument;
	return doc.defaultView || doc.parentWindow;
}

/**
* starts rendering the content of the canvas when needed
*
* @method startRendering
*/
LGraphCanvas.prototype.startRendering = function()
{
	if(this.is_rendering)
		return; //already rendering

	this.is_rendering = true;
	renderFrame.call(this);

	function renderFrame()
	{
		if(!this.pause_rendering)
			this.draw();

		var window = this.getCanvasWindow();
		if(this.is_rendering)
			window.requestAnimationFrame( renderFrame.bind(this) );
	}
}

/**
* stops rendering the content of the canvas (to save resources)
*
* @method stopRendering
*/
LGraphCanvas.prototype.stopRendering = function()
{
	this.is_rendering = false;
	/*
	if(this.rendering_timer_id)
	{
		clearInterval(this.rendering_timer_id);
		this.rendering_timer_id = null;
	}
	*/
}

/* LiteGraphCanvas input */

LGraphCanvas.prototype.processMouseDown = function(e)
{
	if(!this.graph)
		return;

	this.adjustMouseEvent(e);

	var ref_window = this.getCanvasWindow();
	var document = ref_window.document;
	LGraphCanvas.active_canvas = this;
	var that = this;

	//move mouse move event to the window in case it drags outside of the canvas
	this.canvas.removeEventListener("mousemove", this._mousemove_callback );
	ref_window.document.addEventListener("mousemove", this._mousemove_callback, true ); //catch for the entire window
	ref_window.document.addEventListener("mouseup", this._mouseup_callback, true );

	var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes, 5 );
	var skip_dragging = false;
	var skip_action = false;
	var now = LiteGraph.getTime();
	var is_double_click = (now - this.last_mouseclick) < 300;

	this.canvas_mouse[0] = e.canvasX;
	this.canvas_mouse[1] = e.canvasY;

    LiteGraph.closeAllContextMenus( ref_window );

	if(e.which == 1) //left button mouse
	{
		if( e.ctrlKey )
		{
			this.dragging_rectangle = new Float32Array(4);
			this.dragging_rectangle[0] = e.canvasX;
			this.dragging_rectangle[1] = e.canvasY;
			this.dragging_rectangle[2] = 1;
			this.dragging_rectangle[3] = 1;
			skip_action = true;
		}

		var clicking_canvas_bg = false;

		//when clicked on top of a node
		//and it is not interactive
		if( node && this.allow_interaction && !skip_action )
		{
			if( !this.live_mode && !node.flags.pinned )
				this.bringToFront( node ); //if it wasnt selected?

			//not dragging mouse to connect two slots
			if(!this.connecting_node && !node.flags.collapsed && !this.live_mode)
			{
				//Search for corner for resize
				if( !skip_action && node.flags.resizable !== false && isInsideRectangle( e.canvasX, e.canvasY, node.pos[0] + node.size[0] - 5, node.pos[1] + node.size[1] - 5 ,10,10 ))
				{
					this.resizing_node = node;
					this.canvas.style.cursor = "se-resize";
					skip_action = true;
				}
				else
				{
					//search for outputs
					if(node.outputs)
						for(var i = 0, l = node.outputs.length; i < l; ++i)
						{
							var output = node.outputs[i];
							var link_pos = node.getConnectionPos(false,i);
							if( isInsideRectangle( e.canvasX, e.canvasY, link_pos[0] - 15, link_pos[1] - 10, 30,20) )
							{
								this.connecting_node = node;
								this.connecting_output = output;
								this.connecting_pos = node.getConnectionPos(false,i);
								this.connecting_slot = i;

								if( e.shiftKey )
									node.disconnectOutput(i);

								if (is_double_click) {
									if (node.onOutputDblClick)
										node.onOutputDblClick(i, e);
								} else {
									if (node.onOutputClick)
										node.onOutputClick(i, e);
								}

								skip_action = true;
								break;
							}
						}

					//search for inputs
					if(node.inputs)
						for(var i = 0, l = node.inputs.length; i < l; ++i)
						{
							var input = node.inputs[i];
							var link_pos = node.getConnectionPos( true, i );
							if( isInsideRectangle(e.canvasX, e.canvasY, link_pos[0] - 15, link_pos[1] - 10, 30,20) )
							{
								if (is_double_click) {
									if (node.onInputDblClick)
										node.onInputDblClick(i, e);
								} else {
									if (node.onInputClick)
										node.onInputClick(i, e);
								}

								if(input.link !== null)
								{
									var link_info = this.graph.links[ input.link ]; //before disconnecting
									node.disconnectInput(i);

									if( this.allow_reconnect_links || e.shiftKey )
									{
										this.connecting_node = this.graph._nodes_by_id[ link_info.origin_id ];
										this.connecting_slot = link_info.origin_slot;
										this.connecting_output = this.connecting_node.outputs[ this.connecting_slot ];
										this.connecting_pos = this.connecting_node.getConnectionPos( false, this.connecting_slot);
									}

									this.dirty_bgcanvas = true;
									skip_action = true;
								}
							}
						}
				} //not resizing
			}

			//Search for corner
			if( !skip_action && isInsideRectangle(e.canvasX, e.canvasY, node.pos[0], node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT ))
			{
				node.collapse();
				skip_action = true;
			}

			//it wasnt clicked on the links boxes
			if(!skip_action)
			{
				var block_drag_node = false;

				//widgets
				var widget = this.processNodeWidgets( node, this.canvas_mouse, e );
				if(widget)
				{
					block_drag_node = true;
					this.node_widget = [node, widget];
				}

				//double clicking
				if (is_double_click && this.selected_nodes[ node.id ])
				{
					//double click node
					if( node.onDblClick)
						node.onDblClick(e);
					this.processNodeDblClicked( node );
					block_drag_node = true;
				}

				//if do not capture mouse
				if( node.onMouseDown && node.onMouseDown( e, [e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this ) )
				{
					block_drag_node = true;
				}
				else if(this.live_mode)
				{
					clicking_canvas_bg = true;
					block_drag_node = true;
				}

				if(!block_drag_node)
				{
					if(this.allow_dragnodes)
						this.node_dragged = node;
					if(!this.selected_nodes[ node.id ])
						this.processNodeSelected( node, e );
				}

				this.dirty_canvas = true;
			}
		}
		else //clicked outside of nodes
		{
			this.selected_group = this.graph.getGroupOnPos( e.canvasX, e.canvasY );
			this.selected_group_resizing = false;
			if( this.selected_group )
			{
				if( e.ctrlKey )
					this.dragging_rectangle = null;

				var dist = distance( [e.canvasX, e.canvasY], [ this.selected_group.pos[0] + this.selected_group.size[0], this.selected_group.pos[1] + this.selected_group.size[1] ] );
				if( (dist * this.scale) < 10 )
					this.selected_group_resizing = true;
				else
					this.selected_group.recomputeInsideNodes();
			}

			if( is_double_click )
				this.showSearchBox( e );
			
			clicking_canvas_bg = true;
		}

		if( !skip_action && clicking_canvas_bg && this.allow_dragcanvas )
		{
			this.dragging_canvas = true;
		}
	}
	else if (e.which == 2) //middle button
	{

	}
	else if (e.which == 3) //right button
	{
		this.processContextMenu( node, e );
	}

	//TODO
	//if(this.node_selected != prev_selected)
	//	this.onNodeSelectionChange(this.node_selected);

	this.last_mouse[0] = e.localX;
	this.last_mouse[1] = e.localY;
	this.last_mouseclick = LiteGraph.getTime();
	this.last_mouse_dragging = true;

	/*
	if( (this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null)
		this.draw();
	*/

	this.graph.change();

	//this is to ensure to defocus(blur) if a text input element is on focus
	if(!ref_window.document.activeElement || (ref_window.document.activeElement.nodeName.toLowerCase() != "input" && ref_window.document.activeElement.nodeName.toLowerCase() != "textarea"))
		e.preventDefault();
	e.stopPropagation();

	if(this.onMouseDown)
		this.onMouseDown(e);

	return false;
}

/**
* Called when a mouse move event has to be processed
* @method processMouseMove
**/
LGraphCanvas.prototype.processMouseMove = function(e)
{
	if(this.autoresize)
		this.resize();

	if(!this.graph)
		return;

	LGraphCanvas.active_canvas = this;
	this.adjustMouseEvent(e);
	var mouse = [e.localX, e.localY];
	var delta = [mouse[0] - this.last_mouse[0], mouse[1] - this.last_mouse[1]];
	this.last_mouse = mouse;
	this.canvas_mouse[0] = e.canvasX;
	this.canvas_mouse[1] = e.canvasY;
	e.dragging = this.last_mouse_dragging;

	if( this.node_widget )
	{
		this.processNodeWidgets( this.node_widget[0], this.canvas_mouse, e, this.node_widget[1] );
		this.dirty_canvas = true;
	}

	if( this.dragging_rectangle )
	{
		this.dragging_rectangle[2] = e.canvasX - this.dragging_rectangle[0];
		this.dragging_rectangle[3] = e.canvasY - this.dragging_rectangle[1];
		this.dirty_canvas = true;
	}
	else if (this.selected_group) //moving/resizing a group
	{
		if( this.selected_group_resizing )
			this.selected_group.size = [ e.canvasX - this.selected_group.pos[0], e.canvasY - this.selected_group.pos[1] ];
		else
		{
			var deltax = delta[0] / this.scale;
			var deltay = delta[1] / this.scale;
			this.selected_group.move( deltax, deltay, e.ctrlKey );
			if( this.selected_group._nodes.length)
				this.dirty_canvas = true;
		}
		this.dirty_bgcanvas = true;
	}
	else if(this.dragging_canvas)
	{
		this.offset[0] += delta[0] / this.scale;
		this.offset[1] += delta[1] / this.scale;
		this.dirty_canvas = true;
		this.dirty_bgcanvas = true;
	}
	else if(this.allow_interaction)
	{
		if(this.connecting_node)
			this.dirty_canvas = true;

		//get node over
		var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes );

		//remove mouseover flag
		for(var i = 0, l = this.graph._nodes.length; i < l; ++i)
		{
			if(this.graph._nodes[i].mouseOver && node != this.graph._nodes[i])
			{
				//mouse leave
				this.graph._nodes[i].mouseOver = false;
				if(this.node_over && this.node_over.onMouseLeave)
					this.node_over.onMouseLeave(e);
				this.node_over = null;
				this.dirty_canvas = true;
			}
		}

		//mouse over a node
		if(node)
		{
			//this.canvas.style.cursor = "move";
			if(!node.mouseOver)
			{
				//mouse enter
				node.mouseOver = true;
				this.node_over = node;
				this.dirty_canvas = true;

				if(node.onMouseEnter) node.onMouseEnter(e);
			}

			//in case the node wants to do something
			if(node.onMouseMove)
				node.onMouseMove(e, [e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this);

			//if dragging a link 
			if(this.connecting_node)
			{
				var pos = this._highlight_input || [0,0]; //to store the output of isOverNodeInput

				//on top of input
				if( this.isOverNodeBox( node, e.canvasX, e.canvasY ) )
				{
					//mouse on top of the corner box, dont know what to do
				}
				else
				{
					//check if I have a slot below de mouse
					var slot = this.isOverNodeInput( node, e.canvasX, e.canvasY, pos );
					if(slot != -1 && node.inputs[slot] )
					{
						var slot_type = node.inputs[slot].type;
						if( LiteGraph.isValidConnection( this.connecting_output.type, slot_type ) )
							this._highlight_input = pos;
					}
					else
						this._highlight_input = null;
				}
			}

			//Search for corner
			if(this.canvas)
			{
				if( isInsideRectangle(e.canvasX, e.canvasY, node.pos[0] + node.size[0] - 5, node.pos[1] + node.size[1] - 5 ,5,5 ))
					this.canvas.style.cursor = "se-resize";
				else
					this.canvas.style.cursor = "";
			}
		}
		else if(this.canvas)
			this.canvas.style.cursor = "";

		if(this.node_capturing_input && this.node_capturing_input != node && this.node_capturing_input.onMouseMove)
		{
			this.node_capturing_input.onMouseMove(e);
		}


		if(this.node_dragged && !this.live_mode)
		{
			for(var i in this.selected_nodes)
			{
				var n = this.selected_nodes[i];
				n.pos[0] += delta[0] / this.scale;
				n.pos[1] += delta[1] / this.scale;
			}

			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;
		}

		if(this.resizing_node && !this.live_mode)
		{
			//convert mouse to node space
			this.resizing_node.size[0] = e.canvasX - this.resizing_node.pos[0];
			this.resizing_node.size[1] = e.canvasY - this.resizing_node.pos[1];

			//constraint size
			var max_slots = Math.max( this.resizing_node.inputs ? this.resizing_node.inputs.length : 0, this.resizing_node.outputs ? this.resizing_node.outputs.length : 0);
			var min_height = max_slots * LiteGraph.NODE_SLOT_HEIGHT + ( this.resizing_node.widgets ? this.resizing_node.widgets.length : 0 ) * (LiteGraph.NODE_WIDGET_HEIGHT + 4 ) + 4;
			if(this.resizing_node.size[1] < min_height )
				this.resizing_node.size[1] = min_height;
			if(this.resizing_node.size[0] < LiteGraph.NODE_MIN_WIDTH)
				this.resizing_node.size[0] = LiteGraph.NODE_MIN_WIDTH;

			this.canvas.style.cursor = "se-resize";
			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;
		}
	}

	e.preventDefault();
	return false;
}

/**
* Called when a mouse up event has to be processed
* @method processMouseUp
**/
LGraphCanvas.prototype.processMouseUp = function(e)
{
	if(!this.graph)
		return;

	var window = this.getCanvasWindow();
	var document = window.document;
	LGraphCanvas.active_canvas = this;

	//restore the mousemove event back to the canvas
	document.removeEventListener("mousemove", this._mousemove_callback, true );
	this.canvas.addEventListener("mousemove", this._mousemove_callback, true);
	document.removeEventListener("mouseup", this._mouseup_callback, true );

	this.adjustMouseEvent(e);
	var now = LiteGraph.getTime();
	e.click_time = (now - this.last_mouseclick);
	this.last_mouse_dragging = false;

	if (e.which == 1) //left button
	{
		this.node_widget = null;

		if( this.selected_group )
		{
			var diffx = this.selected_group.pos[0] - Math.round( this.selected_group.pos[0] );
			var diffy = this.selected_group.pos[1] - Math.round( this.selected_group.pos[1] );
			this.selected_group.move( diffx, diffy, e.ctrlKey );
			this.selected_group.pos[0] = Math.round( this.selected_group.pos[0] );
			this.selected_group.pos[1] = Math.round( this.selected_group.pos[1] );
			if( this.selected_group._nodes.length )
				this.dirty_canvas = true;
			this.selected_group = null;
		}
		this.selected_group_resizing = false;

		if( this.dragging_rectangle )
		{
			if(this.graph)
			{
				var nodes = this.graph._nodes;
				var node_bounding = new Float32Array(4);
				this.deselectAllNodes();
				//compute bounding and flip if left to right
				var w = Math.abs( this.dragging_rectangle[2] );
				var h = Math.abs( this.dragging_rectangle[3] );
				var startx = this.dragging_rectangle[2] < 0 ? this.dragging_rectangle[0] - w : this.dragging_rectangle[0];
				var starty = this.dragging_rectangle[3] < 0 ? this.dragging_rectangle[1] - h : this.dragging_rectangle[1];
				this.dragging_rectangle[0] = startx; this.dragging_rectangle[1] = starty; this.dragging_rectangle[2] = w; this.dragging_rectangle[3] = h;

				//test against all nodes (not visible becasue the rectangle maybe start outside
				var to_select = [];
				for(var i = 0; i < nodes.length; ++i)
				{
					var node = nodes[i];
					node.getBounding( node_bounding );
					if(!overlapBounding( this.dragging_rectangle, node_bounding ))
						continue; //out of the visible area
					to_select.push(node);
				}
				if(to_select.length)
					this.selectNodes(to_select);
			}
			this.dragging_rectangle = null;
		}
		else if(this.connecting_node) //dragging a connection
		{
			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;

			var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes );

			//node below mouse
			if(node)
			{
				if( this.connecting_output.type == LiteGraph.EVENT && this.isOverNodeBox( node, e.canvasX, e.canvasY ) )
				{
					this.connecting_node.connect( this.connecting_slot, node, LiteGraph.EVENT );
				}
				else
				{
					//slot below mouse? connect
					var slot = this.isOverNodeInput(node, e.canvasX, e.canvasY);
					if(slot != -1)
					{
						this.connecting_node.connect(this.connecting_slot, node, slot);
					}
					else
					{ //not on top of an input
						var input = node.getInputInfo(0);
						//auto connect
						if(this.connecting_output.type == LiteGraph.EVENT)
							this.connecting_node.connect( this.connecting_slot, node, LiteGraph.EVENT );
						else
							if(input && !input.link && LiteGraph.isValidConnection( input.type && this.connecting_output.type ) )
								this.connecting_node.connect( this.connecting_slot, node, 0 );
					}
				}
			}

			this.connecting_output = null;
			this.connecting_pos = null;
			this.connecting_node = null;
			this.connecting_slot = -1;

		}//not dragging connection
		else if(this.resizing_node)
		{
			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;
			this.resizing_node = null;
		}
		else if(this.node_dragged) //node being dragged?
		{
			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;
			this.node_dragged.pos[0] = Math.round(this.node_dragged.pos[0]);
			this.node_dragged.pos[1] = Math.round(this.node_dragged.pos[1]);
			if(this.graph.config.align_to_grid)
				this.node_dragged.alignToGrid();
			this.node_dragged = null;
		}
		else //no node being dragged
		{
			//get node over
			var node = this.graph.getNodeOnPos( e.canvasX, e.canvasY, this.visible_nodes );
			if ( !node && e.click_time < 300 )
				this.deselectAllNodes();

			this.dirty_canvas = true;
			this.dragging_canvas = false;

			if( this.node_over && this.node_over.onMouseUp )
				this.node_over.onMouseUp(e, [e.canvasX - this.node_over.pos[0], e.canvasY - this.node_over.pos[1]], this );
			if( this.node_capturing_input && this.node_capturing_input.onMouseUp )
				this.node_capturing_input.onMouseUp(e, [e.canvasX - this.node_capturing_input.pos[0], e.canvasY - this.node_capturing_input.pos[1]] );
		}
	}
	else if (e.which == 2) //middle button
	{
		//trace("middle");
		this.dirty_canvas = true;
		this.dragging_canvas = false;
	}
	else if (e.which == 3) //right button
	{
		//trace("right");
		this.dirty_canvas = true;
		this.dragging_canvas = false;
	}

	/*
	if((this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null)
		this.draw();
	*/

	this.graph.change();

	e.stopPropagation();
	e.preventDefault();
	return false;
}

/**
* Called when a mouse wheel event has to be processed
* @method processMouseWheel
**/
LGraphCanvas.prototype.processMouseWheel = function(e)
{
	if(!this.graph || !this.allow_dragcanvas)
		return;

	var delta = (e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60);

	this.adjustMouseEvent(e);

	var zoom = this.scale;

	if (delta > 0)
		zoom *= 1.1;
	else if (delta < 0)
		zoom *= 1/(1.1);

	this.setZoom( zoom, [ e.localX, e.localY ] );

	/*
	if(this.rendering_timer_id == null)
		this.draw();
	*/

	this.graph.change();

	e.preventDefault();
	return false; // prevent default
}

/**
* retuns true if a position (in graph space) is on top of a node little corner box
* @method isOverNodeBox
**/
LGraphCanvas.prototype.isOverNodeBox = function( node, canvasx, canvasy )
{
	var title_height = LiteGraph.NODE_TITLE_HEIGHT;
	if( isInsideRectangle( canvasx, canvasy, node.pos[0] + 2, node.pos[1] + 2 - title_height, title_height - 4,title_height - 4) )
		return true;
	return false;
}

/**
* retuns true if a position (in graph space) is on top of a node input slot
* @method isOverNodeInput
**/
LGraphCanvas.prototype.isOverNodeInput = function(node, canvasx, canvasy, slot_pos )
{
	if(node.inputs)
		for(var i = 0, l = node.inputs.length; i < l; ++i)
		{
			var input = node.inputs[i];
			var link_pos = node.getConnectionPos(true,i);
			if( isInsideRectangle(canvasx, canvasy, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
			{
				if(slot_pos)
				{
					slot_pos[0] = link_pos[0];
					slot_pos[1] = link_pos[1];
				}
				return i;
			}
		}
	return -1;
}

/**
* process a key event
* @method processKey
**/
LGraphCanvas.prototype.processKey = function(e)
{
	if(!this.graph)
		return;

	var block_default = false;
	//console.log(e); //debug

	if(e.target.localName == "input")
		return;

	if(e.type == "keydown")
	{
		if(e.keyCode == 32) //esc
		{
			this.dragging_canvas = true;
			block_default = true;
		}

		//select all Control A
		if(e.keyCode == 65 && e.ctrlKey)
		{
			this.selectNodes();
			block_default = true;
		}

		if(e.code == "KeyC" && (e.metaKey || e.ctrlKey) && !e.shiftKey ) //copy
		{
			if(this.selected_nodes)
			{
				this.copyToClipboard();
				block_default = true;
			}
		}

		if(e.code == "KeyV" && (e.metaKey || e.ctrlKey) && !e.shiftKey ) //paste
		{
			this.pasteFromClipboard();
		}

		//delete or backspace
		if(e.keyCode == 46 || e.keyCode == 8)
		{
			if(e.target.localName != "input" && e.target.localName != "textarea")
			{
				this.deleteSelectedNodes();
				block_default = true;
			}
		}

		//collapse
		//...

		//TODO
		if(this.selected_nodes)
			for (var i in this.selected_nodes)
				if(this.selected_nodes[i].onKeyDown)
					this.selected_nodes[i].onKeyDown(e);
	}
	else if( e.type == "keyup" )
	{
		if(e.keyCode == 32)
			this.dragging_canvas = false;

		if(this.selected_nodes)
			for (var i in this.selected_nodes)
				if(this.selected_nodes[i].onKeyUp)
					this.selected_nodes[i].onKeyUp(e);
	}

	this.graph.change();

	if(block_default)
	{
		e.preventDefault();
		return false;
	}
}

LGraphCanvas.prototype.copyToClipboard = function()
{
	var clipboard_info = {
		nodes: [],
		links: []
	};
	var index = 0;
	var selected_nodes_array = [];
	for(var i in this.selected_nodes)
	{
		var node = this.selected_nodes[i];
		node._relative_id = index;
		selected_nodes_array.push( node );
		index += 1;
	}

	for(var i = 0; i < selected_nodes_array.length; ++i)
	{
		var node = selected_nodes_array[i];
		clipboard_info.nodes.push( node.clone().serialize() );
		if(node.inputs && node.inputs.length)
			for(var j = 0; j < node.inputs.length; ++j)
			{
				var input = node.inputs[j];
				if(!input || input.link == null)
					continue;
				var link_info = this.graph.links[ input.link ];
				if(!link_info)
					continue;
				var target_node = this.graph.getNodeById( link_info.origin_id );
				if(!target_node || !this.selected_nodes[ target_node.id ] ) //improve this by allowing connections to non-selected nodes
					continue; //not selected
				clipboard_info.links.push([ target_node._relative_id, j, node._relative_id, link_info.target_slot ]);
			}
	}
	localStorage.setItem( "litegrapheditor_clipboard", JSON.stringify( clipboard_info ) );
}

LGraphCanvas.prototype.pasteFromClipboard = function()
{
	var data = localStorage.getItem( "litegrapheditor_clipboard" );
	if(!data)
		return;

	//create nodes
	var clipboard_info = JSON.parse(data);
	var nodes = [];
	for(var i = 0; i < clipboard_info.nodes.length; ++i)
	{
		var node_data = clipboard_info.nodes[i];
		var node = LiteGraph.createNode( node_data.type );
		if(node)
		{
			node.configure(node_data);
			node.pos[0] += 5;
			node.pos[1] += 5;
			this.graph.add( node );
			nodes.push( node );
		}
	}

	//create links
	for(var i = 0; i < clipboard_info.links.length; ++i)
	{
		var link_info = clipboard_info.links[i];
		var origin_node = nodes[ link_info[0] ];
		var target_node = nodes[ link_info[2] ];
		origin_node.connect( link_info[1], target_node, link_info[3] );
	}

	this.selectNodes( nodes );
}

/**
* process a item drop event on top the canvas
* @method processDrop
**/
LGraphCanvas.prototype.processDrop = function(e)
{
	e.preventDefault();
	this.adjustMouseEvent(e);


	var pos = [e.canvasX,e.canvasY];
	var node = this.graph.getNodeOnPos(pos[0],pos[1]);

	if(!node)
	{
		var r = null;
		if(this.onDropItem)
			r = this.onDropItem( event );
		if(!r)
			this.checkDropItem(e);
		return;
	}

	if( node.onDropFile || node.onDropData )
	{
		var files = e.dataTransfer.files;
		if(files && files.length)
		{
			for(var i=0; i < files.length; i++)
			{
				var file = e.dataTransfer.files[0];
				var filename = file.name;
				var ext = LGraphCanvas.getFileExtension( filename );
				//console.log(file);

				if(node.onDropFile)
					node.onDropFile(file);

				if(node.onDropData)
				{
					//prepare reader
					var reader = new FileReader();
					reader.onload = function (event) {
						//console.log(event.target);
						var data = event.target.result;
						node.onDropData( data, filename, file );
					};

					//read data
					var type = file.type.split("/")[0];
					if(type == "text" || type == "")
						reader.readAsText(file);
					else if (type == "image")
						reader.readAsDataURL(file);
					else
						reader.readAsArrayBuffer(file);
				}
			}
		}
	}

	if(node.onDropItem)
	{
		if( node.onDropItem( event ) )
			return true;
	}

	if(this.onDropItem)
		return this.onDropItem( event );

	return false;
}

//called if the graph doesnt have a default drop item behaviour
LGraphCanvas.prototype.checkDropItem = function(e)
{
	if(e.dataTransfer.files.length)
	{
		var file = e.dataTransfer.files[0];
		var ext = LGraphCanvas.getFileExtension( file.name ).toLowerCase();
		var nodetype = LiteGraph.node_types_by_file_extension[ext];
		if(nodetype)
		{
			var node = LiteGraph.createNode( nodetype.type );
			node.pos = [e.canvasX, e.canvasY];
			this.graph.add( node );
			if( node.onDropFile )
				node.onDropFile( file );
		}
	}
}


LGraphCanvas.prototype.processNodeDblClicked = function(n)
{
	if(this.onShowNodePanel)
		this.onShowNodePanel(n);

	if(this.onNodeDblClicked)
		this.onNodeDblClicked(n);

	this.setDirty(true);
}

LGraphCanvas.prototype.processNodeSelected = function(node,e)
{
	this.selectNode( node, e && e.shiftKey );
	if(this.onNodeSelected)
		this.onNodeSelected(node);
}

LGraphCanvas.prototype.processNodeDeselected = function(node)
{
	this.deselectNode(node);
	if(this.onNodeDeselected)
		this.onNodeDeselected(node);
}

/**
* selects a given node (or adds it to the current selection)
* @method selectNode
**/
LGraphCanvas.prototype.selectNode = function( node, add_to_current_selection )
{
	if(node == null)
		this.deselectAllNodes();
	else
		this.selectNodes([node], add_to_current_selection );
}

/**
* selects several nodes (or adds them to the current selection)
* @method selectNodes
**/
LGraphCanvas.prototype.selectNodes = function( nodes, add_to_current_selection )
{
	if(!add_to_current_selection)
		this.deselectAllNodes();

	nodes = nodes || this.graph._nodes;
	for(var i = 0; i < nodes.length; ++i)
	{
		var node = nodes[i];
		if(node.selected)
			continue;

		if( !node.selected && node.onSelected )
			node.onSelected();
		node.selected = true;
		this.selected_nodes[ node.id ] = node;

		if(node.inputs)
			for(var j = 0; j < node.inputs.length; ++j)
				this.highlighted_links[ node.inputs[j].link ] = true;
		if(node.outputs)
			for(var j = 0; j < node.outputs.length; ++j)
			{
				var out = node.outputs[j];
				if( out.links )
					for(var k = 0; k < out.links.length; ++k)
						this.highlighted_links[ out.links[k] ] = true;
			}

	}

	this.setDirty(true);
}

/**
* removes a node from the current selection
* @method deselectNode
**/
LGraphCanvas.prototype.deselectNode = function( node )
{
	if(!node.selected)
		return;
	if(node.onDeselected)
		node.onDeselected();
	node.selected = false;

	//remove highlighted
	if(node.inputs)
		for(var i = 0; i < node.inputs.length; ++i)
			delete this.highlighted_links[ node.inputs[i].link ];
	if(node.outputs)
		for(var i = 0; i < node.outputs.length; ++i)
		{
			var out = node.outputs[i];
			if( out.links )
				for(var j = 0; j < out.links.length; ++j)
					delete this.highlighted_links[ out.links[j] ];
		}
}

/**
* removes all nodes from the current selection
* @method deselectAllNodes
**/
LGraphCanvas.prototype.deselectAllNodes = function()
{
	if(!this.graph)
		return;
	var nodes = this.graph._nodes;
	for(var i = 0, l = nodes.length; i < l; ++i)
	{
		var node = nodes[i];
		if(!node.selected)
			continue;
		if(node.onDeselected)
			node.onDeselected();
		node.selected = false;
	}
	this.selected_nodes = {};
	this.highlighted_links = {};
	this.setDirty(true);
}

/**
* deletes all nodes in the current selection from the graph
* @method deleteSelectedNodes
**/
LGraphCanvas.prototype.deleteSelectedNodes = function()
{
	for(var i in this.selected_nodes)
	{
		var m = this.selected_nodes[i];
		//if(m == this.node_in_panel) this.showNodePanel(null);
		this.graph.remove(m);
	}
	this.selected_nodes = {};
	this.highlighted_links = {};
	this.setDirty(true);
}

/**
* centers the camera on a given node
* @method centerOnNode
**/
LGraphCanvas.prototype.centerOnNode = function(node)
{
	this.offset[0] = -node.pos[0] - node.size[0] * 0.5 + (this.canvas.width * 0.5 / this.scale);
	this.offset[1] = -node.pos[1] - node.size[1] * 0.5 + (this.canvas.height * 0.5 / this.scale);
	this.setDirty(true,true);
}

/**
* adds some useful properties to a mouse event, like the position in graph coordinates
* @method adjustMouseEvent
**/
LGraphCanvas.prototype.adjustMouseEvent = function(e)
{
	if(this.canvas)
	{
		var b = this.canvas.getBoundingClientRect();
		e.localX = e.pageX - b.left;
		e.localY = e.pageY - b.top;
	}
	else
	{
		e.localX = e.pageX;
		e.localY = e.pageY;
	}

	e.deltaX = e.localX - this.last_mouse_position[0];
	e.deltaY = e.localY - this.last_mouse_position[1];

	this.last_mouse_position[0] = e.localX;
	this.last_mouse_position[1] = e.localY;

	e.canvasX = e.localX / this.scale - this.offset[0];
	e.canvasY = e.localY / this.scale - this.offset[1];
}

/**
* changes the zoom level of the graph (default is 1), you can pass also a place used to pivot the zoom
* @method setZoom
**/
LGraphCanvas.prototype.setZoom = function(value, zooming_center)
{
	if(!zooming_center && this.canvas)
		zooming_center = [this.canvas.width * 0.5,this.canvas.height * 0.5];

	var center = this.convertOffsetToCanvas( zooming_center );

	this.scale = value;

	if(this.scale > this.max_zoom)
		this.scale = this.max_zoom;
	else if(this.scale < this.min_zoom)
		this.scale = this.min_zoom;

	var new_center = this.convertOffsetToCanvas( zooming_center );
	var delta_offset = [new_center[0] - center[0], new_center[1] - center[1]];

	this.offset[0] += delta_offset[0];
	this.offset[1] += delta_offset[1];

	this.dirty_canvas = true;
	this.dirty_bgcanvas = true;
}

/**
* converts a coordinate in canvas2D space to graphcanvas space (NAME IS CONFUSION, SHOULD BE THE OTHER WAY AROUND)
* @method convertOffsetToCanvas
**/
LGraphCanvas.prototype.convertOffsetToCanvas = function( pos, out )
{
	out = out || [];
	out[0] = pos[0] / this.scale - this.offset[0];
	out[1] = pos[1] / this.scale - this.offset[1];
	return out;
}

/**
* converts a coordinate in graphcanvas space to canvas2D space (NAME IS CONFUSION, SHOULD BE THE OTHER WAY AROUND)
* @method convertCanvasToOffset
**/
LGraphCanvas.prototype.convertCanvasToOffset = function( pos, out )
{
	out = out || [];
	out[0] = (pos[0] + this.offset[0]) * this.scale;
	out[1] = (pos[1] + this.offset[1]) * this.scale;
	return out;
}

LGraphCanvas.prototype.convertEventToCanvas = function(e)
{
	var rect = this.canvas.getBoundingClientRect();
	return this.convertOffsetToCanvas([e.pageX - rect.left,e.pageY - rect.top]);
}

/**
* brings a node to front (above all other nodes)
* @method bringToFront
**/
LGraphCanvas.prototype.bringToFront = function(node)
{
	var i = this.graph._nodes.indexOf(node);
	if(i == -1) return;

	this.graph._nodes.splice(i,1);
	this.graph._nodes.push(node);
}

/**
* sends a node to the back (below all other nodes)
* @method sendToBack
**/
LGraphCanvas.prototype.sendToBack = function(node)
{
	var i = this.graph._nodes.indexOf(node);
	if(i == -1) return;

	this.graph._nodes.splice(i,1);
	this.graph._nodes.unshift(node);
}

/* Interaction */



/* LGraphCanvas render */
var temp = new Float32Array(4);

/**
* checks which nodes are visible (inside the camera area)
* @method computeVisibleNodes
**/
LGraphCanvas.prototype.computeVisibleNodes = function( nodes, out )
{
	var visible_nodes = out || [];
	visible_nodes.length = 0;
	nodes = nodes || this.graph._nodes;
	for(var i = 0, l = nodes.length; i < l; ++i)
	{
		var n = nodes[i];

		//skip rendering nodes in live mode
		if(this.live_mode && !n.onDrawBackground && !n.onDrawForeground)
			continue;

		if(!overlapBounding( this.visible_area, n.getBounding( temp ) ))
			continue; //out of the visible area

		visible_nodes.push(n);
	}
	return visible_nodes;
}

/**
* renders the whole canvas content, by rendering in two separated canvas, one containing the background grid and the connections, and one containing the nodes)
* @method draw
**/
LGraphCanvas.prototype.draw = function(force_canvas, force_bgcanvas)
{
	if(!this.canvas)
		return;

	//fps counting
	var now = LiteGraph.getTime();
	this.render_time = (now - this.last_draw_time)*0.001;
	this.last_draw_time = now;

	if(this.graph)
	{
		var startx = -this.offset[0];
		var starty = -this.offset[1];
		var endx = startx + this.canvas.width / this.scale;
		var endy = starty + this.canvas.height / this.scale;
		this.visible_area[0] = startx;
		this.visible_area[1] = starty;
		this.visible_area[2] = endx - startx;
		this.visible_area[3] = endy - starty;
	}

	if(this.dirty_bgcanvas || force_bgcanvas || this.always_render_background || (this.graph && this.graph._last_trigger_time && (now - this.graph._last_trigger_time) < 1000) )
		this.drawBackCanvas();

	if(this.dirty_canvas || force_canvas)
		this.drawFrontCanvas();

	this.fps = this.render_time ? (1.0 / this.render_time) : 0;
	this.frame += 1;
}

/**
* draws the front canvas (the one containing all the nodes)
* @method drawFrontCanvas
**/
LGraphCanvas.prototype.drawFrontCanvas = function()
{
	this.dirty_canvas = false;

	if(!this.ctx)
		this.ctx = this.bgcanvas.getContext("2d");
	var ctx = this.ctx;
	if(!ctx) //maybe is using webgl...
		return;

	if(ctx.start2D)
		ctx.start2D();

	var canvas = this.canvas;

	//reset in case of error
	ctx.restore();
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	//clip dirty area if there is one, otherwise work in full canvas
	if(this.dirty_area)
	{
		ctx.save();
		ctx.beginPath();
		ctx.rect(this.dirty_area[0],this.dirty_area[1],this.dirty_area[2],this.dirty_area[3]);
		ctx.clip();
	}

	//clear
	//canvas.width = canvas.width;
	if(this.clear_background)
		ctx.clearRect(0,0,canvas.width, canvas.height);

	//draw bg canvas
	if(this.bgcanvas == this.canvas)
		this.drawBackCanvas();
	else
		ctx.drawImage(this.bgcanvas,0,0);

	//rendering
	if(this.onRender)
		this.onRender(canvas, ctx);

	//info widget
	if(this.show_info)
		this.renderInfo(ctx);

	if(this.graph)
	{
		//apply transformations
		ctx.save();
		ctx.scale(this.scale,this.scale);
		ctx.translate( this.offset[0],this.offset[1] );

		//draw nodes
		var drawn_nodes = 0;
		var visible_nodes = this.computeVisibleNodes( null, this.visible_nodes );

		for (var i = 0; i < visible_nodes.length; ++i)
		{
			var node = visible_nodes[i];

			//transform coords system
			ctx.save();
			ctx.translate( node.pos[0], node.pos[1] );

			//Draw
			this.drawNode( node, ctx );
			drawn_nodes += 1;

			//Restore
			ctx.restore();
		}

		//on top (debug)
		if( this.render_execution_order)
			this.drawExecutionOrder(ctx);


		//connections ontop?
		if(this.graph.config.links_ontop)
			if(!this.live_mode)
				this.drawConnections(ctx);

		//current connection (the one being dragged by the mouse)
		if(this.connecting_pos != null)
		{
			ctx.lineWidth = this.connections_width;
			var link_color = null;
			switch( this.connecting_output.type )
			{
				case LiteGraph.EVENT: link_color = LiteGraph.EVENT_LINK_COLOR; break;
				default:
					link_color = LiteGraph.CONNECTING_LINK_COLOR;
			}
			//the connection being dragged by the mouse
			this.renderLink( ctx, this.connecting_pos, [this.canvas_mouse[0],this.canvas_mouse[1]], null, false, null, link_color, this.connecting_output.dir || (this.connecting_node.flags.horizontal ? LiteGraph.DOWN : LiteGraph.RIGHT), LiteGraph.CENTER );

			ctx.beginPath();
				if( this.connecting_output.type === LiteGraph.EVENT || this.connecting_output.shape === LiteGraph.BOX_SHAPE )
					ctx.rect( (this.connecting_pos[0] - 6) + 0.5, (this.connecting_pos[1] - 5) + 0.5,14,10);
				else
					ctx.arc( this.connecting_pos[0], this.connecting_pos[1],4,0,Math.PI*2);
			ctx.fill();

			ctx.fillStyle = "#ffcc00";
			if(this._highlight_input)
			{
				ctx.beginPath();
					ctx.arc( this._highlight_input[0], this._highlight_input[1],6,0,Math.PI*2);
				ctx.fill();
			}
		}

		if( this.dragging_rectangle )
		{
			ctx.strokeStyle = "#FFF";
			ctx.strokeRect( this.dragging_rectangle[0], this.dragging_rectangle[1], this.dragging_rectangle[2], this.dragging_rectangle[3] );
		}


		ctx.restore();
	}

	if(this.dirty_area)
	{
		ctx.restore();
		//this.dirty_area = null;
	}

	if(ctx.finish2D) //this is a function I use in webgl renderer
		ctx.finish2D();
}

/**
* draws some useful stats in the corner of the canvas
* @method renderInfo
**/
LGraphCanvas.prototype.renderInfo = function( ctx, x, y )
{
	x = x || 0;
	y = y || 0;

	ctx.save();
	ctx.translate( x, y );

	ctx.font = "10px Arial";
	ctx.fillStyle = "#888";
	if(this.graph)
	{
		ctx.fillText( "T: " + this.graph.globaltime.toFixed(2)+"s",5,13*1 );
		ctx.fillText( "I: " + this.graph.iteration,5,13*2 );
		ctx.fillText( "N: " + this.graph._nodes.length + " [" + this.visible_nodes.length + "]",5,13*3  );
		ctx.fillText( "V: " + this.graph._version,5,13*4 );
		ctx.fillText( "FPS:" + this.fps.toFixed(2),5,13*5 );
	}
	else
		ctx.fillText( "No graph selected",5,13*1 );
	ctx.restore();
}

/**
* draws the back canvas (the one containing the background and the connections)
* @method drawBackCanvas
**/
LGraphCanvas.prototype.drawBackCanvas = function()
{
	var canvas = this.bgcanvas;
	if(canvas.width != this.canvas.width ||
		canvas.height != this.canvas.height)
	{
		canvas.width = this.canvas.width;
		canvas.height = this.canvas.height;
	}

	if(!this.bgctx)
		this.bgctx = this.bgcanvas.getContext("2d");
	var ctx = this.bgctx;
	if(ctx.start)
		ctx.start();

	//clear
	if(this.clear_background)
		ctx.clearRect(0,0,canvas.width, canvas.height);

	if(this._graph_stack && this._graph_stack.length)
	{
		ctx.save();
		var parent_graph = this._graph_stack[ this._graph_stack.length - 1];
		var subgraph_node = this.graph._subgraph_node;
		ctx.strokeStyle = subgraph_node.bgcolor;
		ctx.lineWidth = 10;
		ctx.strokeRect(1,1,canvas.width-2,canvas.height-2);
		ctx.lineWidth = 1;
		ctx.font = "40px Arial"
		ctx.textAlign = "center";
		ctx.fillStyle = subgraph_node.bgcolor;
		ctx.fillText( subgraph_node.getTitle(), canvas.width * 0.5, 40 );
		ctx.restore();
	}

	var bg_already_painted = false;
	if(this.onRenderBackground)
		bg_already_painted = this.onRenderBackground( canvas, ctx );

	//reset in case of error
	ctx.restore();
	ctx.setTransform(1, 0, 0, 1, 0, 0);

	if(this.graph)
	{
		//apply transformations
		ctx.save();
		ctx.scale(this.scale,this.scale);
		ctx.translate(this.offset[0],this.offset[1]);

		//render BG
		if(this.background_image && this.scale > 0.5 && !bg_already_painted)
		{
			if (this.zoom_modify_alpha)
				ctx.globalAlpha = (1.0 - 0.5 / this.scale) * this.editor_alpha;
			else
				ctx.globalAlpha = this.editor_alpha;
			ctx.imageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
			if(!this._bg_img || this._bg_img.name != this.background_image)
			{
				this._bg_img = new Image();
				this._bg_img.name = this.background_image;
				this._bg_img.src = this.background_image;
				var that = this;
				this._bg_img.onload = function() {
					that.draw(true,true);
				}
			}

			var pattern = null;
			if(this._pattern == null && this._bg_img.width > 0)
			{
				pattern = ctx.createPattern( this._bg_img, 'repeat' );
				this._pattern_img = this._bg_img;
				this._pattern = pattern;
			}
			else
				pattern = this._pattern;
			if(pattern)
			{
				ctx.fillStyle = pattern;
				ctx.fillRect(this.visible_area[0],this.visible_area[1],this.visible_area[2],this.visible_area[3]);
				ctx.fillStyle = "transparent";
			}

			ctx.globalAlpha = 1.0;
			ctx.imageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = true;
		}

		//groups
		if(this.graph._groups.length && !this.live_mode)
			this.drawGroups(canvas, ctx);

		if(this.onBackgroundRender)
			this.onBackgroundRender(canvas, ctx);

		//DEBUG: show clipping area
		//ctx.fillStyle = "red";
		//ctx.fillRect( this.visible_area[0] + 10, this.visible_area[1] + 10, this.visible_area[2] - 20, this.visible_area[3] - 20);

		//bg
		if (this.render_canvas_border) {
			ctx.strokeStyle = "#235";
			ctx.strokeRect(0,0,canvas.width,canvas.height);
		}

		if(this.render_connections_shadows)
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 6;
		}
		else
			ctx.shadowColor = "rgba(0,0,0,0)";

		//draw connections
		if(!this.live_mode)
			this.drawConnections(ctx);

		ctx.shadowColor = "rgba(0,0,0,0)";

		//restore state
		ctx.restore();
	}

	if(ctx.finish)
		ctx.finish();

	this.dirty_bgcanvas = false;
	this.dirty_canvas = true; //to force to repaint the front canvas with the bgcanvas
}

var temp_vec2 = new Float32Array(2);

/**
* draws the given node inside the canvas
* @method drawNode
**/
LGraphCanvas.prototype.drawNode = function(node, ctx )
{
	var glow = false;
	this.current_node = node;

	var color = node.color || node.constructor.color || LiteGraph.NODE_DEFAULT_COLOR;
	var bgcolor = node.bgcolor || node.constructor.bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

	//shadow and glow
	if (node.mouseOver)
		glow = true;

	//only render if it forces it to do it
	if(this.live_mode)
	{
		if(!node.flags.collapsed)
		{
			ctx.shadowColor = "transparent";
			if(node.onDrawForeground)
				node.onDrawForeground(ctx, this, this.canvas );
		}

		return;
	}

	var editor_alpha = this.editor_alpha;
	ctx.globalAlpha = editor_alpha;

	if(this.render_shadows)
	{
		ctx.shadowColor = LiteGraph.DEFAULT_SHADOW_COLOR;
		ctx.shadowOffsetX = 2 * this.scale;
		ctx.shadowOffsetY = 2 * this.scale;
		ctx.shadowBlur = 3 * this.scale;
	}
	else
		ctx.shadowColor = "transparent";

	//custom draw collapsed method (draw after shadows because they are affected)
	if(node.flags.collapsed && node.onDrawCollaped && node.onDrawCollapsed(ctx, this) == true)
		return;

	//clip if required (mask)
	var shape = node._shape || LiteGraph.BOX_SHAPE;
	var size = temp_vec2;
	temp_vec2.set( node.size );
	if( node.flags.collapsed )
	{
		ctx.font = this.inner_text_font;
		var title = node.getTitle ? node.getTitle() : node.title;
		node._collapsed_width = Math.min( node.size[0], ctx.measureText(title).width + 40 );//LiteGraph.NODE_COLLAPSED_WIDTH;
		size[0] = node._collapsed_width;
		size[1] = 0;
	}
	
	if( node.flags.clip_area ) //Start clipping
	{
		ctx.save();
		ctx.beginPath();
		if(shape == LiteGraph.BOX_SHAPE)
			ctx.rect(0,0,size[0], size[1]);
		else if (shape == LiteGraph.ROUND_SHAPE)
			ctx.roundRect(0,0,size[0], size[1],10);
		else if (shape == LiteGraph.CIRCLE_SHAPE)
			ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
		ctx.clip();
	}

	//draw shape
	this.drawNodeShape( node, ctx, size, color, bgcolor, node.selected, node.mouseOver );
	ctx.shadowColor = "transparent";

	//connection slots
	ctx.textAlign = node.flags.horizontal ? "center" : "left";
	ctx.font = this.inner_text_font;

	var render_text = this.scale > 0.6;

	var out_slot = this.connecting_output;
	ctx.lineWidth = 1;

	var max_y = 0;

	//render inputs and outputs
	if(!node.flags.collapsed)
	{
		//input connection slots
		if(node.inputs)
			for(var i = 0; i < node.inputs.length; i++)
			{
				var slot = node.inputs[i];

				ctx.globalAlpha = editor_alpha;
				//change opacity of incompatible slots when dragging a connection
				if ( this.connecting_node && LiteGraph.isValidConnection( slot.type && out_slot.type ) )
					ctx.globalAlpha = 0.4 * editor_alpha;

				ctx.fillStyle = slot.link != null ? (slot.color_on || this.default_connection_color.input_on) : (slot.color_off || this.default_connection_color.input_off);

				var pos = node.getConnectionPos( true, i );
				pos[0] -= node.pos[0];
				pos[1] -= node.pos[1];
				if( max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT*0.5 )
					max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT*0.5;

				ctx.beginPath();

				if (slot.type === LiteGraph.EVENT || slot.shape === LiteGraph.BOX_SHAPE) {
                    ctx.rect((pos[0] - 6) + 0.5, (pos[1] - 5) + 0.5, 14, 10);
                } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(pos[0] + 8, pos[1] + 0.5);
                    ctx.lineTo(pos[0] - 4, (pos[1] + 6) + 0.5);
                    ctx.lineTo(pos[0] - 4, (pos[1] - 6) + 0.5);
                    ctx.closePath();
                } else {
                    ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                }

				ctx.fill();

				//render name
				if(render_text)
				{
					var text = slot.label != null ? slot.label : slot.name;
					if(text)
					{
						ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
						if( node.flags.horizontal || slot.dir == LiteGraph.UP )
							ctx.fillText(text,pos[0],pos[1] - 10);
						else
							ctx.fillText(text,pos[0] + 10,pos[1] + 5);
					}
				}
			}

		//output connection slots
		if(this.connecting_node)
			ctx.globalAlpha = 0.4 * editor_alpha;

		ctx.textAlign = node.flags.horizontal ? "center" : "right";
		ctx.strokeStyle = "black";
		if(node.outputs)
			for(var i = 0; i < node.outputs.length; i++)
			{
				var slot = node.outputs[i];

				var pos = node.getConnectionPos(false,i);
				pos[0] -= node.pos[0];
				pos[1] -= node.pos[1];
				if( max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT*0.5)
					max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT*0.5;

				ctx.fillStyle = slot.links && slot.links.length ? (slot.color_on || this.default_connection_color.output_on) : (slot.color_off || this.default_connection_color.output_off);
				ctx.beginPath();
				//ctx.rect( node.size[0] - 14,i*14,10,10);

				if (slot.type === LiteGraph.EVENT || slot.shape === LiteGraph.BOX_SHAPE) {
					ctx.rect((pos[0] - 6) + 0.5,(pos[1] - 5) + 0.5,14,10);
                } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(pos[0] + 8, pos[1] + 0.5);
                    ctx.lineTo(pos[0] - 4, (pos[1] + 6) + 0.5);
                    ctx.lineTo(pos[0] - 4, (pos[1] - 6) + 0.5);
                    ctx.closePath();
                } else {
                    ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                }

				//trigger
				//if(slot.node_id != null && slot.slot == -1)
				//	ctx.fillStyle = "#F85";

				//if(slot.links != null && slot.links.length)
				ctx.fill();
				ctx.stroke();

				//render output name
				if(render_text)
				{
					var text = slot.label != null ? slot.label : slot.name;
					if(text)
					{
						ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
						if( node.flags.horizontal || slot.dir == LiteGraph.DOWN )
							ctx.fillText(text,pos[0],pos[1] - 8);
						else
							ctx.fillText(text, pos[0] - 10,pos[1] + 5);
					}
				}
			}

		ctx.textAlign = "left";
		ctx.globalAlpha = 1;

		if(node.widgets)
		{
			if( node.flags.horizontal || node.flags.widgets_up )
				max_y = 2;
			this.drawNodeWidgets( node, max_y, ctx, (this.node_widget && this.node_widget[0] == node) ? this.node_widget[1] : null );
		}

		//draw foreground
		if(node.onDrawForeground)
			node.onDrawForeground( ctx, this, this.canvas );
	}
	else //if collapsed
	{
		if(node.inputs)
		{
			for(var i = 0; i < node.inputs.length; i++)
			{
				var slot = node.inputs[i];
				if( slot.link == null )
					continue;
				ctx.fillStyle = slot.color_on || this.default_connection_color.input_on;
				ctx.beginPath();
				if ( slot.type === LiteGraph.EVENT || slot.shape === LiteGraph.BOX_SHAPE) {
					ctx.rect(0.5, 4 - LiteGraph.NODE_TITLE_HEIGHT + 0.5,14,LiteGraph.NODE_TITLE_HEIGHT - 8);
                } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(8, LiteGraph.NODE_TITLE_HEIGHT * -0.5);
                    ctx.lineTo(-4, LiteGraph.NODE_TITLE_HEIGHT * -0.8);
                    ctx.lineTo(-4, LiteGraph.NODE_TITLE_HEIGHT * -0.2);
                    ctx.closePath();
                } else {
                    ctx.arc(0, LiteGraph.NODE_TITLE_HEIGHT * -0.5, 4, 0, Math.PI * 2);
                }
				ctx.fill();
				break;
			}
		}

		if(node.outputs)
		{
			for(var i = 0; i < node.outputs.length; i++)
			{
				var slot = node.outputs[i];
				if(!slot.links || !slot.links.length)
					continue;
				ctx.fillStyle = slot.color_on || this.default_connection_color.output_on;
				ctx.strokeStyle = "black";
				ctx.beginPath();
				if (slot.type === LiteGraph.EVENT || slot.shape === LiteGraph.BOX_SHAPE) {
					ctx.rect( node._collapsed_width - 4 + 0.5, 4 - LiteGraph.NODE_TITLE_HEIGHT + 0.5,14,LiteGraph.NODE_TITLE_HEIGHT - 8);
                } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(node._collapsed_width + 6, LiteGraph.NODE_TITLE_HEIGHT * -0.5);
                    ctx.lineTo(node._collapsed_width - 6, LiteGraph.NODE_TITLE_HEIGHT * -0.8);
                    ctx.lineTo(node._collapsed_width - 6, LiteGraph.NODE_TITLE_HEIGHT * -0.2);
                    ctx.closePath();
                } else {
                    ctx.arc(node._collapsed_width, LiteGraph.NODE_TITLE_HEIGHT * -0.5, 4, 0, Math.PI * 2);
                }
				ctx.fill();
				ctx.stroke();
			}
		}
		
	}

	if(node.flags.clip_area)
		ctx.restore();

	ctx.globalAlpha = 1.0;
}

/**
* draws the shape of the given node in the canvas
* @method drawNodeShape
**/
LGraphCanvas.prototype.drawNodeShape = function( node, ctx, size, fgcolor, bgcolor, selected, mouse_over )
{
	//bg rect
	ctx.strokeStyle = fgcolor;
	ctx.fillStyle = bgcolor;

	var title_height = LiteGraph.NODE_TITLE_HEIGHT;

	//render node area depending on shape
	var shape = node._shape || node.constructor.shape || LiteGraph.BOX_SHAPE;
	var title_mode = node.constructor.title_mode;

	var render_title = true;
	if( title_mode == LiteGraph.TRANSPARENT_TITLE )
		render_title = false;
	else if( title_mode == LiteGraph.AUTOHIDE_TITLE && mouse_over)
		render_title = true;

	var areax = 0;
	var areay = render_title ? -title_height : 0;
	var areaw = size[0]+1;
	var areah = render_title ? size[1] + title_height : size[1];

	//full node shape
	if(!node.flags.collapsed)
	{
		ctx.beginPath();
		if(shape == LiteGraph.BOX_SHAPE || this.scale < 0.5)
			ctx.fillRect( areax, areay, areaw, areah );
		else if (shape == LiteGraph.ROUND_SHAPE || shape == LiteGraph.CARD_SHAPE)
			ctx.roundRect( areax, areay, areaw, areah, this.round_radius, shape == LiteGraph.CARD_SHAPE ? 0 : this.round_radius);
		else if (shape == LiteGraph.CIRCLE_SHAPE)
			ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
		ctx.fill();
	}
	ctx.shadowColor = "transparent";

	//image
	if (node.bgImage && node.bgImage.width)
		ctx.drawImage( node.bgImage, (size[0] - node.bgImage.width) * 0.5 , (size[1] - node.bgImage.height) * 0.5);

	if(node.bgImageUrl && !node.bgImage)
		node.bgImage = node.loadImage(node.bgImageUrl);

	if( node.onDrawBackground )
		node.onDrawBackground( ctx, this, this.canvas );

	//title bg (remember, it is rendered ABOVE the node)
	if(render_title || title_mode == LiteGraph.TRANSPARENT_TITLE )
	{
		//title bar
		if(title_mode != LiteGraph.TRANSPARENT_TITLE) //!node.flags.collapsed)
		{
			if(node.flags.collapsed)
				ctx.shadowColor = LiteGraph.DEFAULT_SHADOW_COLOR;
	
			//* gradient test
			if(this.use_gradients)
			{
				var grad = LGraphCanvas.gradients[ fgcolor ];
				if(!grad)
				{
					grad = LGraphCanvas.gradients[ fgcolor ] = ctx.createLinearGradient(0,0,400,0);
					grad.addColorStop(0, fgcolor);
					grad.addColorStop(1, "#000");
				}
				ctx.fillStyle = grad;
			}
			else
				ctx.fillStyle = fgcolor;

			var old_alpha = ctx.globalAlpha;
			//ctx.globalAlpha = 0.5 * old_alpha;
			ctx.beginPath();
			if(shape == LiteGraph.BOX_SHAPE || this.scale < 0.5)
				ctx.rect(0, -title_height, size[0]+1, title_height);
			else if ( shape == LiteGraph.ROUND_SHAPE || shape == LiteGraph.CARD_SHAPE )
				ctx.roundRect(0,-title_height,size[0]+1, title_height, this.round_radius, node.flags.collapsed ? this.round_radius : 0);
			ctx.fill();
			ctx.shadowColor = "transparent";
		}

		//title box
		if (shape == LiteGraph.ROUND_SHAPE || shape == LiteGraph.CIRCLE_SHAPE || shape == LiteGraph.CARD_SHAPE)
		{
			if( this.scale > 0.5 )
			{
				ctx.fillStyle = "black";
				ctx.beginPath();
				ctx.arc(title_height *0.5, title_height * -0.5, (title_height - 8) *0.5,0,Math.PI*2);
				ctx.fill();
			}

			ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
			ctx.beginPath();
			ctx.arc(title_height *0.5, title_height * -0.5, (title_height - 8) *0.4,0,Math.PI*2);
			ctx.fill();
		}
		else
		{
			if( this.scale > 0.5 )
			{
				ctx.fillStyle = "black";
				ctx.fillRect(4,-title_height + 4,title_height - 8,title_height - 8);
			}
			ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
			ctx.fillRect(5,-title_height + 5,title_height - 10,title_height - 10);
		}
		ctx.globalAlpha = old_alpha;

		//title text
		if( this.scale > 0.5 )
		{
			ctx.font = this.title_text_font;
			var title = node.getTitle();
			if(title)
			{
				if(selected)
					ctx.fillStyle = "white";
				else
					ctx.fillStyle = node.constructor.title_text_color || this.node_title_color;
				if( node.flags.collapsed )
				{
					ctx.textAlign =  "center";
					var measure = ctx.measureText(title);
					ctx.fillText( title, title_height + measure.width * 0.5, -title_height * 0.2 );
					ctx.textAlign =  "left";
				}
				else
				{
					ctx.textAlign =  "left";
					ctx.fillText( title, title_height, -title_height * 0.2 );
				}
			}
		}

		if(node.onDrawTitle)
			node.onDrawTitle(ctx);
	}

	//render selection marker
	if(selected)
	{
		if( title_mode == LiteGraph.TRANSPARENT_TITLE )
		{
			areay -= title_height;
			areah += title_height;
		}
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.8;
		ctx.beginPath();
		if(shape == LiteGraph.BOX_SHAPE)
			ctx.rect(-6 + areax,-6 + areay, 12 + areaw, 12 + areah );
		else if (shape == LiteGraph.ROUND_SHAPE || (shape == LiteGraph.CARD_SHAPE && node.flags.collapsed) )
			ctx.roundRect(-6 + areax,-6 + areay, 12 + areaw, 12 + areah , this.round_radius * 2);
		else if (shape == LiteGraph.CARD_SHAPE)
			ctx.roundRect(-6 + areax,-6 + areay, 12 + areaw, 12 + areah , this.round_radius * 2, 2);
		else if (shape == LiteGraph.CIRCLE_SHAPE)
			ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5 + 6, 0, Math.PI*2);
		ctx.strokeStyle = "#FFF";
		ctx.stroke();
		ctx.strokeStyle = fgcolor;
		ctx.globalAlpha = 1;
	}
}

/**
* draws every connection visible in the canvas
* OPTIMIZE THIS: precatch connections position instead of recomputing them every time
* @method drawConnections
**/
LGraphCanvas.prototype.drawConnections = function(ctx)
{
	var now = LiteGraph.getTime();
	var visible_area = this.visible_area;
	var margin_area = new Float32Array([visible_area[0] - 20, visible_area[1] - 20, visible_area[2] + 40, visible_area[3] + 40 ]);
	var link_bounding = new Float32Array(4);

	//draw connections
	ctx.lineWidth = this.connections_width;

	ctx.fillStyle = "#AAA";
	ctx.strokeStyle = "#AAA";
	ctx.globalAlpha = this.editor_alpha;
	//for every node
	var nodes = this.graph._nodes;
	for (var n = 0, l = nodes.length; n < l; ++n)
	{
		var node = nodes[n];
		//for every input (we render just inputs because it is easier as every slot can only have one input)
		if(!node.inputs || !node.inputs.length)
			continue;
	
		for(var i = 0; i < node.inputs.length; ++i)
		{
			var input = node.inputs[i];
			if(!input || input.link == null)
				continue;
			var link_id = input.link;
			var link = this.graph.links[ link_id ];
			if(!link)
				continue;

			//find link info
			var start_node = this.graph.getNodeById( link.origin_id );
			if(start_node == null) continue;
			var start_node_slot = link.origin_slot;
			var start_node_slotpos = null;
			if(start_node_slot == -1)
				start_node_slotpos = [start_node.pos[0] + 10, start_node.pos[1] + 10];
			else
				start_node_slotpos = start_node.getConnectionPos(false, start_node_slot);
			var end_node_slotpos = node.getConnectionPos(true,i);

			//compute link bounding
			link_bounding[0] = start_node_slotpos[0];
			link_bounding[1] = start_node_slotpos[1];
			link_bounding[2] = end_node_slotpos[0] - start_node_slotpos[0];
			link_bounding[3] = end_node_slotpos[1] - start_node_slotpos[1];
			if( link_bounding[2] < 0 ){
				link_bounding[0] += link_bounding[2];
				link_bounding[2] = Math.abs( link_bounding[2] );
			}
			if( link_bounding[3] < 0 ){
				link_bounding[1] += link_bounding[3];
				link_bounding[3] = Math.abs( link_bounding[3] );
			}

			//skip links outside of the visible area of the canvas
			if( !overlapBounding( link_bounding, margin_area ) )
				continue;

			var start_slot = start_node.outputs[start_node_slot];
			var end_slot = node.inputs[i];
			if(!start_slot || !end_slot) continue;
			var start_dir = start_slot.dir || (start_node.flags.horizontal ? LiteGraph.DOWN : LiteGraph.RIGHT);
			var end_dir = end_slot.dir || (node.flags.horizontal ? LiteGraph.UP : LiteGraph.LEFT);

			this.renderLink( ctx, start_node_slotpos, end_node_slotpos, link, false, 0, null, start_dir, end_dir );

			//event triggered rendered on top
			if(link && link._last_time && (now - link._last_time) < 1000 )
			{
				var f = 2.0 - (now - link._last_time) * 0.002;
				var tmp = ctx.globalAlpha;
				ctx.globalAlpha = tmp * f;
				this.renderLink( ctx, start_node_slotpos, end_node_slotpos, link, true, f, "white", start_dir, end_dir );
				ctx.globalAlpha = tmp;
			}
		}
	}
	ctx.globalAlpha = 1;
}

/**
* draws a link between two points
* @method renderLink
**/
LGraphCanvas.prototype.renderLink = function( ctx, a, b, link, skip_border, flow, color, start_dir, end_dir )
{
	if(!this.highquality_render)
	{
		ctx.beginPath();
		ctx.moveTo(a[0],a[1]);
		ctx.lineTo(b[0],b[1]);
		ctx.stroke();
		return;
	}

	start_dir = start_dir || LiteGraph.RIGHT;
	end_dir = end_dir || LiteGraph.LEFT;

	var dist = distance(a,b);

	if(this.render_connections_border && this.scale > 0.6)
		ctx.lineWidth = this.connections_width + 4;

	//choose color
	if( !color && link )
		color = LGraphCanvas.link_type_colors[ link.type ];
	if( !color )
		color = this.default_link_color;

	if( link != null && this.highlighted_links[ link.id ] )
		color = "#FFF";

	//begin line shape
	ctx.beginPath();

	if(this.render_curved_connections) //splines
	{
		ctx.moveTo(a[0],a[1]);
		var start_offset_x = 0;
		var start_offset_y = 0;
		var end_offset_x = 0;
		var end_offset_y = 0;
		switch(start_dir)
		{
			case LiteGraph.LEFT: start_offset_x = dist*-0.25; break;
			case LiteGraph.RIGHT: start_offset_x = dist*0.25; break;
			case LiteGraph.UP: start_offset_y = dist*-0.25; break;
			case LiteGraph.DOWN: start_offset_y = dist*0.25; break;
		}
		switch(end_dir)
		{
			case LiteGraph.LEFT: end_offset_x = dist*-0.25; break;
			case LiteGraph.RIGHT: end_offset_x = dist*0.25; break;
			case LiteGraph.UP: end_offset_y = dist*-0.25; break;
			case LiteGraph.DOWN: end_offset_y = dist*0.25; break;
		}
		ctx.bezierCurveTo(a[0] + start_offset_x, a[1] + start_offset_y,
							b[0] + end_offset_x , b[1] + end_offset_y,
							b[0], b[1] );
	}
	else //lines
	{
		ctx.moveTo(a[0]+10,a[1]);
		ctx.lineTo(((a[0]+10) + (b[0]-10))*0.5,a[1]);
		ctx.lineTo(((a[0]+10) + (b[0]-10))*0.5,b[1]);
		ctx.lineTo(b[0]-10,b[1]);
	}

	//rendering the outline of the connection can be a little bit slow
	if(this.render_connections_border && this.scale > 0.6 && !skip_border)
	{
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.stroke();
	}

	ctx.lineWidth = this.connections_width;
	ctx.fillStyle = ctx.strokeStyle = color;
	ctx.stroke();
	//end line shape

	//render arrow in the middle
	if( this.render_connection_arrows && this.scale >= 0.6 )
	{
		//render arrow
		if(this.render_connection_arrows && this.scale > 0.6)
		{
			//compute two points in the connection
			var pos = this.computeConnectionPoint(a, b, 0.5, start_dir, end_dir);
			var pos2 = this.computeConnectionPoint(a, b, 0.51, start_dir, end_dir);

			//compute the angle between them so the arrow points in the right direction
			var angle = 0;
			if(this.render_curved_connections)
				angle = -Math.atan2( pos2[0] - pos[0], pos2[1] - pos[1]);
			else
				angle = b[1] > a[1] ? 0 : Math.PI;

			//render arrow
			ctx.save();
			ctx.translate(pos[0],pos[1]);
			ctx.rotate(angle);
			ctx.beginPath();
			ctx.moveTo(-5,-5);
			ctx.lineTo(0,+5);
			ctx.lineTo(+5,-5);
			ctx.fill();
			ctx.restore();
		}
	}

	//render flowing points
	if(flow)
	{
		for(var i = 0; i < 5; ++i)
		{
			var f = (LiteGraph.getTime() * 0.001 + (i * 0.2)) % 1;
			var pos = this.computeConnectionPoint(a,b,f, start_dir, end_dir);
			ctx.beginPath();
			ctx.arc(pos[0],pos[1],5,0,2*Math.PI);
			ctx.fill();
		}
	}
}

LGraphCanvas.prototype.computeConnectionPoint = function(a,b,t,start_dir,end_dir)
{
	start_dir = start_dir || LiteGraph.RIGHT;
	end_dir = end_dir || LiteGraph.LEFT;

	var dist = distance(a,b);
	var p0 = a;
	var p1 = [ a[0], a[1] ];
	var p2 = [ b[0], b[1] ];
	var p3 = b;

	switch(start_dir)
	{
		case LiteGraph.LEFT: p1[0] += dist*-0.25; break;
		case LiteGraph.RIGHT: p1[0] += dist*0.25; break;
		case LiteGraph.UP: p1[1] += dist*-0.25; break;
		case LiteGraph.DOWN: p1[1] += dist*0.25; break;
	}
	switch(end_dir)
	{
		case LiteGraph.LEFT: p2[0] += dist*-0.25; break;
		case LiteGraph.RIGHT: p2[0] += dist*0.25; break;
		case LiteGraph.UP: p2[1] += dist*-0.25; break;
		case LiteGraph.DOWN: p2[1] += dist*0.25; break;
	}

	var c1 = (1-t)*(1-t)*(1-t);
	var c2 = 3*((1-t)*(1-t))*t;
	var c3 = 3*(1-t)*(t*t);
	var c4 = t*t*t;

	var x = c1*p0[0] + c2*p1[0] + c3*p2[0] + c4*p3[0];
	var y = c1*p0[1] + c2*p1[1] + c3*p2[1] + c4*p3[1];
	return [x,y];
}

LGraphCanvas.prototype.drawExecutionOrder = function(ctx)
{
	ctx.shadowColor = "transparent";
	ctx.globalAlpha = 0.25;

	ctx.textAlign = "center";
	ctx.strokeStyle = "white";
	ctx.globalAlpha = 0.75;

	var visible_nodes = this.visible_nodes;
	for (var i = 0; i < visible_nodes.length; ++i)
	{
		var node = visible_nodes[i];
		ctx.fillStyle = "black";
		ctx.fillRect( node.pos[0] - LiteGraph.NODE_TITLE_HEIGHT, node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT );
		if(node.order == 0)
			ctx.strokeRect( node.pos[0] - LiteGraph.NODE_TITLE_HEIGHT + 0.5, node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5, LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT );
		ctx.fillStyle = "#FFF";
		ctx.fillText( node.order, node.pos[0] + LiteGraph.NODE_TITLE_HEIGHT * -0.5, node.pos[1] - 6 );
	}
	ctx.globalAlpha = 1;
}


/**
* draws the widgets stored inside a node
* @method drawNodeWidgets
**/
LGraphCanvas.prototype.drawNodeWidgets = function( node, posY, ctx, active_widget )
{
	if(!node.widgets || !node.widgets.length)
		return 0;
	var width = node.size[0];
	var widgets = node.widgets;
	posY += 2;
	var H = LiteGraph.NODE_WIDGET_HEIGHT;
	var show_text = this.scale > 0.5;
	ctx.save();
	ctx.globalAlpha = this.editor_alpha;

	for(var i = 0; i < widgets.length; ++i)
	{
		var w = widgets[i];
		var y = posY;
		if(w.y)
			y = w.y;
		w.last_y = y;
		ctx.strokeStyle = "#AAA";
		ctx.fillStyle = "#222";
		ctx.textAlign = "left";

		switch( w.type )
		{
			case "button": 
				if(w.clicked)
				{
					ctx.fillStyle = "#AAA";
					w.clicked = false;
					this.dirty_canvas = true;
				}
				ctx.fillRect(10,y,width-20,H);
				ctx.strokeRect(10,y,width-20,H);
				if(show_text)
				{
					ctx.textAlign = "center";
					ctx.fillStyle = "#AAA";
					ctx.fillText( w.name, width*0.5, y + H*0.7 );
				}
				break;
			case "toggle":
				ctx.textAlign = "left";
				ctx.strokeStyle = "#AAA";
				ctx.fillStyle = "#111";
				ctx.beginPath();
				ctx.roundRect( 10, posY, width - 20, H,H*0.5 );
				ctx.fill();
				ctx.stroke();
				ctx.fillStyle = w.value ? "#89A" : "#333";
				ctx.beginPath();
				ctx.arc( width - 20, y + H*0.5, H * 0.36, 0, Math.PI * 2 );
				ctx.fill();
				if(show_text)
				{
					ctx.fillStyle = "#999";
					if(w.name != null)
						ctx.fillText( w.name, 20, y + H*0.7 );
					ctx.fillStyle = w.value ? "#DDD" : "#888";
					ctx.textAlign = "right";
					ctx.fillText( w.value ? (w.options.on || "true") : (w.options.off || "false"), width - 30, y + H*0.7 );
				}
				break;
			case "slider": 
				ctx.fillStyle = "#111";
				ctx.fillRect(10,y,width-20,H);
				var range = w.options.max - w.options.min;
				var nvalue = (w.value - w.options.min) / range;
				ctx.fillStyle = active_widget == w ? "#89A" : "#678";
				ctx.fillRect(10,y,nvalue*(width-20),H);
				ctx.strokeRect(10,y,width-20,H);
				if(show_text)
				{
					ctx.textAlign = "center";
					ctx.fillStyle = "#DDD";
					ctx.fillText( w.name + "  " + Number(w.value).toFixed(3), width*0.5, y + H*0.7 );
				}
				break;
			case "number":
			case "combo":
				ctx.textAlign = "left";
				ctx.strokeStyle = "#AAA";
				ctx.fillStyle = "#111";
				ctx.beginPath();
				ctx.roundRect( 10, posY, width - 20, H,H*0.5 );
				ctx.fill();
				ctx.stroke();
				if(show_text)
				{
					ctx.fillStyle = "#AAA";
					ctx.beginPath();
					ctx.moveTo( 26, posY + 5 );
					ctx.lineTo( 16, posY + H*0.5 );
					ctx.lineTo( 26, posY + H - 5 );
					ctx.moveTo( width - 26, posY + 5 );
					ctx.lineTo( width - 16, posY + H*0.5 );
					ctx.lineTo( width - 26, posY + H - 5 );
					ctx.fill();
					ctx.fillStyle = "#999";
					ctx.fillText( w.name, 30, y + H*0.7 );
					ctx.fillStyle = "#DDD";
					ctx.textAlign = "right";
					if(w.type == "number")
						ctx.fillText( Number(w.value).toFixed( w.options.precision !== undefined ? w.options.precision : 3), width - 40, y + H*0.7 );
					else
						ctx.fillText( w.value, width - 40, y + H*0.7 );
				}
				break;
			case "text":
				ctx.textAlign = "left";
				ctx.strokeStyle = "#AAA";
				ctx.fillStyle = "#111";
				ctx.beginPath();
				ctx.roundRect( 10, posY, width - 20, H,H*0.5 );
				ctx.fill();
				ctx.stroke();
				if(show_text)
				{
					ctx.fillStyle = "#999";
					if(w.name != null)
						ctx.fillText( w.name, 20, y + H*0.7 );
					ctx.fillStyle = "#DDD";
					ctx.textAlign = "right";
					ctx.fillText( w.value, width - 20, y + H*0.7 );
				}
				break;
			default:
				break;
		}
		posY += H + 4;
	}
	ctx.restore();
}

/**
* process an event on widgets 
* @method processNodeWidgets
**/
LGraphCanvas.prototype.processNodeWidgets = function( node, pos, event, active_widget )
{
	if(!node.widgets || !node.widgets.length)
		return null;

	var x = pos[0] - node.pos[0];
	var y = pos[1] - node.pos[1];
	var width = node.size[0];
	var that = this;

	for(var i = 0; i < node.widgets.length; ++i)
	{
		var w = node.widgets[i];
		if( w == active_widget || (x > 6 && x < (width - 12) && y > w.last_y && y < (w.last_y + LiteGraph.NODE_WIDGET_HEIGHT)) )
		{
			//inside widget
			switch( w.type )
			{
				case "button": 
					if(w.callback)
						setTimeout( function(){	w.callback( w, that, node, pos ); }, 20 );
					w.clicked = true;
					this.dirty_canvas = true;
					break;
				case "slider": 
					var range = w.options.max - w.options.min;
					var nvalue = Math.clamp( (x - 10) / (width - 20), 0, 1);
					w.value = w.options.min + (w.options.max - w.options.min) * nvalue;
					if(w.callback)
						setTimeout( function(){	w.callback( w.value, that, node, pos ); }, 20 );
					this.dirty_canvas = true;
					break;
				case "number": 
				case "combo": 
					if(event.type == "mousemove" && w.type == "number")
					{
						w.value += (event.deltaX * 0.1) * (w.options.step || 1);
						if(w.options.min != null && w.value < w.options.min)
							w.value = w.options.min;
						if(w.options.max != null && w.value > w.options.max)
							w.value = w.options.max;
					}
					else if( event.type == "mousedown" )
					{
						var delta = ( x < 40 ? -1 : ( x > width - 40 ? 1 : 0) );
						if (w.type == "number")
						{
							w.value += delta * 0.1 * (w.options.step || 1);
							if(w.options.min != null && w.value < w.options.min)
								w.value = w.options.min;
							if(w.options.max != null && w.value > w.options.max)
								w.value = w.options.max;
						}
						else if(delta)
						{
							var index = w.options.values.indexOf( w.value ) + delta;
							if( index >= w.options.values.length )
								index = 0;
							if( index < 0 )
								index = w.options.values.length - 1;
							w.value = w.options.values[ index ];
						}
					}
					if(w.callback)
						setTimeout( (function(){ this.callback( this.value, that, node, pos ); }).bind(w), 20 );
					this.dirty_canvas = true;
					break;
				case "toggle":
					if( event.type == "mousedown" )
					{
						w.value = !w.value;
						if(w.callback)
							setTimeout( function(){	w.callback( w.value, that, node, pos ); }, 20 );
					}
					break;
				case "text":
					if( event.type == "mousedown" )
						this.prompt( "Value", w.value, (function(v){ this.value = v; if(w.callback) w.callback(v, that, node ); }).bind(w), event );
					break;
			}

			return w;
		}
	}
	return null;
}

/**
* draws every group area in the background
* @method drawGroups
**/
LGraphCanvas.prototype.drawGroups = function(canvas, ctx)
{
	if(!this.graph)
		return;

	var groups = this.graph._groups;

	ctx.save();
	ctx.globalAlpha = 0.5 * this.editor_alpha;
	ctx.font = "24px Arial";

	for(var i = 0; i < groups.length; ++i)
	{
		var group = groups[i];

		if(!overlapBounding( this.visible_area, group._bounding ))
			continue; //out of the visible area

		ctx.fillStyle = group.color || "#335";
		ctx.strokeStyle = group.color || "#335";
		var pos = group._pos;
		var size = group._size;
		ctx.globalAlpha = 0.25 * this.editor_alpha;
		ctx.beginPath();
		ctx.rect( pos[0] + 0.5, pos[1] + 0.5, size[0], size[1] );
		ctx.fill();
		ctx.globalAlpha = this.editor_alpha;;
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo( pos[0] + size[0], pos[1] + size[1] );
		ctx.lineTo( pos[0] + size[0] - 10, pos[1] + size[1] );
		ctx.lineTo( pos[0] + size[0], pos[1] + size[1] - 10 );
		ctx.fill();

		ctx.fillText( group.title, pos[0] + 4, pos[1] + 24 );
	}

	ctx.restore();
}

/**
* resizes the canvas to a given size, if no size is passed, then it tries to fill the parentNode
* @method resize
**/
LGraphCanvas.prototype.resize = function(width, height)
{
	if(!width && !height)
	{
		var parent = this.canvas.parentNode;
		width = parent.offsetWidth;
		height = parent.offsetHeight;
	}

	if(this.canvas.width == width && this.canvas.height == height)
		return;

	this.canvas.width = width;
	this.canvas.height = height;
	this.bgcanvas.width = this.canvas.width;
	this.bgcanvas.height = this.canvas.height;
	this.setDirty(true,true);
}

/**
* switches to live mode (node shapes are not rendered, only the content)
* this feature was designed when graphs where meant to create user interfaces
* @method switchLiveMode
**/
LGraphCanvas.prototype.switchLiveMode = function(transition)
{
	if(!transition)
	{
		this.live_mode = !this.live_mode;
		this.dirty_canvas = true;
		this.dirty_bgcanvas = true;
		return;
	}

	var self = this;
	var delta = this.live_mode ? 1.1 : 0.9;
	if(this.live_mode)
	{
		this.live_mode = false;
		this.editor_alpha = 0.1;
	}

	var t = setInterval(function() {
		self.editor_alpha *= delta;
		self.dirty_canvas = true;
		self.dirty_bgcanvas = true;

		if(delta < 1  && self.editor_alpha < 0.01)
		{
			clearInterval(t);
			if(delta < 1)
				self.live_mode = true;
		}
		if(delta > 1 && self.editor_alpha > 0.99)
		{
			clearInterval(t);
			self.editor_alpha = 1;
		}
	},1);
}

LGraphCanvas.prototype.onNodeSelectionChange = function(node)
{
	return; //disabled
}

LGraphCanvas.prototype.touchHandler = function(event)
{
	//alert("foo");
    var touches = event.changedTouches,
        first = touches[0],
        type = "";

         switch(event.type)
    {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;
        case "touchend":   type = "mouseup"; break;
        default: return;
    }

             //initMouseEvent(type, canBubble, cancelable, view, clickCount,
    //           screenX, screenY, clientX, clientY, ctrlKey,
    //           altKey, shiftKey, metaKey, button, relatedTarget);

	var window = this.getCanvasWindow();
	var document = window.document;

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1,
                              first.screenX, first.screenY,
                              first.clientX, first.clientY, false,
                              false, false, false, 0/*left*/, null);
	first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
}

/* CONTEXT MENU ********************/

LGraphCanvas.onGroupAdd = function(info,entry,mouse_event)
{
	var canvas = LGraphCanvas.active_canvas;
	var ref_window = canvas.getCanvasWindow();
		
	var group = new LiteGraph.LGraphGroup();
	group.pos = canvas.convertEventToCanvas( mouse_event );
	canvas.graph.add( group );
}

LGraphCanvas.onMenuAdd = function( node, options, e, prev_menu )
{
	var canvas = LGraphCanvas.active_canvas;
	var ref_window = canvas.getCanvasWindow();

	var values = LiteGraph.getNodeTypesCategories();
	var entries = [];
	for(var i in values)
		if(values[i])
			entries.push({ value: values[i], content: values[i], has_submenu: true });

	//show categories
	var menu = new LiteGraph.ContextMenu( entries, { event: e, callback: inner_clicked, parentMenu: prev_menu }, ref_window);

	function inner_clicked( v, option, e )
	{
		var category = v.value;
		var node_types = LiteGraph.getNodeTypesInCategory( category, canvas.filter );
		var values = [];
		for(var i in node_types)
			if (!node_types[i].skip_list)
				values.push( { content: node_types[i].title, value: node_types[i].type });

		new LiteGraph.ContextMenu( values, {event: e, callback: inner_create, parentMenu: menu }, ref_window);
		return false;
	}

	function inner_create( v, e )
	{
		var first_event = prev_menu.getFirstEvent();
		var node = LiteGraph.createNode( v.value );
		if(node)
		{
			node.pos = canvas.convertEventToCanvas( first_event );
			canvas.graph.add( node );
		}
	}

	return false;
}

LGraphCanvas.onMenuCollapseAll = function()
{

}


LGraphCanvas.onMenuNodeEdit = function()
{

}

LGraphCanvas.showMenuNodeOptionalInputs = function( v, options, e, prev_menu, node )
{
	if(!node)
		return;

	var that = this;
	var canvas = LGraphCanvas.active_canvas;
	var ref_window = canvas.getCanvasWindow();

	var options = node.optional_inputs;
	if(node.onGetInputs)
		options = node.onGetInputs();

	var entries = [];
	if(options)
		for (var i in options)
		{
			var entry = options[i];
			if(!entry)
			{
				entries.push(null);
				continue;
			}
			var label = entry[0];
			if(entry[2] && entry[2].label)
				label = entry[2].label;
			var data = {content: label, value: entry};
			if(entry[1] == LiteGraph.ACTION)
				data.className = "event";
			entries.push(data);
		}

	if(this.onMenuNodeInputs)
		entries = this.onMenuNodeInputs( entries );

	if(!entries.length)
		return;

	var menu = new LiteGraph.ContextMenu(entries, { event: e, callback: inner_clicked, parentMenu: prev_menu, node: node }, ref_window);

	function inner_clicked(v, e, prev)
	{
		if(!node)
			return;

		if(v.callback)
			v.callback.call( that, node, v, e, prev );

		if(v.value)
		{
			node.addInput(v.value[0],v.value[1], v.value[2]);
			node.setDirtyCanvas(true,true);
		}
	}

	return false;
}

LGraphCanvas.showMenuNodeOptionalOutputs = function( v, options, e, prev_menu, node )
{
	if(!node)
		return;

	var that = this;
	var canvas = LGraphCanvas.active_canvas;
	var ref_window = canvas.getCanvasWindow();

	var options = node.optional_outputs;
	if(node.onGetOutputs)
		options = node.onGetOutputs();

	var entries = [];
	if(options)
		for (var i in options)
		{
			var entry = options[i];
			if(!entry) //separator?
			{
				entries.push(null);
				continue;
			}

			if(node.flags && node.flags.skip_repeated_outputs && node.findOutputSlot(entry[0]) != -1)
				continue; //skip the ones already on
			var label = entry[0];
			if(entry[2] && entry[2].label)
				label = entry[2].label;
			var data = {content: label, value: entry};
			if(entry[1] == LiteGraph.EVENT)
				data.className = "event";
			entries.push(data);
		}

	if(this.onMenuNodeOutputs)
		entries = this.onMenuNodeOutputs( entries );

	if(!entries.length)
		return;

	var menu = new LiteGraph.ContextMenu(entries, {event: e, callback: inner_clicked, parentMenu: prev_menu, node: node }, ref_window);

	function inner_clicked( v, e, prev )
	{
		if(!node)
			return;

		if(v.callback)
			v.callback.call( that, node, v, e, prev );

		if(!v.value)
			return;

		var value = v.value[1];

		if(value && (value.constructor === Object || value.constructor === Array)) //submenu why?
		{
			var entries = [];
			for(var i in value)
				entries.push({ content: i, value: value[i]});
			new LiteGraph.ContextMenu( entries, { event: e, callback: inner_clicked, parentMenu: prev_menu, node: node });
			return false;
		}
		else
		{
			node.addOutput( v.value[0], v.value[1], v.value[2]);
			node.setDirtyCanvas(true,true);
		}

	}

	return false;
}

LGraphCanvas.onShowMenuNodeProperties = function( value, options, e, prev_menu, node )
{
	if(!node || !node.properties)
		return;

	var that = this;
	var canvas = LGraphCanvas.active_canvas;
	var ref_window = canvas.getCanvasWindow();

	var entries = [];
		for (var i in node.properties)
		{
			var value = node.properties[i] !== undefined ? node.properties[i] : " ";
			//value could contain invalid html characters, clean that
			value = LGraphCanvas.decodeHTML(value);
			entries.push({content: "<span class='property_name'>" + i + "</span>" + "<span class='property_value'>" + value + "</span>", value: i});
		}
	if(!entries.length)
		return;

	var menu = new LiteGraph.ContextMenu(entries, {event: e, callback: inner_clicked, parentMenu: prev_menu, allow_html: true, node: node },ref_window);

	function inner_clicked( v, options, e, prev )
	{
		if(!node)
			return;
		var rect = this.getBoundingClientRect();
		canvas.showEditPropertyValue( node, v.value, { position: [rect.left, rect.top] });
	}

	return false;
}

LGraphCanvas.decodeHTML = function( str )
{
	var e = document.createElement("div");
	e.innerText = str;
	return e.innerHTML;
}

LGraphCanvas.onResizeNode = function( value, options, e, menu, node )
{
	if(!node)
		return;
	node.size = node.computeSize();
	node.setDirtyCanvas(true,true);
}


LGraphCanvas.onShowTitleEditor = function( value, options, e, menu, node )
{
	var input_html = "";

	var dialog = document.createElement("div");
	dialog.className = "graphdialog";
	dialog.innerHTML = "<span class='name'>Title</span><input autofocus type='text' class='value'/><button>OK</button>";
	var input = dialog.querySelector("input");
	if(input)
	{
		input.value = node.title;
        input.addEventListener("blur", function(e){
            this.focus();
        });
		input.addEventListener("keydown", function(e){
			if(e.keyCode != 13)
				return;
			inner();
			e.preventDefault();
			e.stopPropagation();
		});
	}

	var graphcanvas = LGraphCanvas.active_canvas;
	var canvas = graphcanvas.canvas;

	var rect = canvas.getBoundingClientRect();
	var offsetx = -20;
	var offsety = -20;
	if(rect)
	{
		offsetx -= rect.left;
		offsety -= rect.top;
	}

	if( event )
	{
		dialog.style.left = (event.pageX + offsetx) + "px";
		dialog.style.top = (event.pageY + offsety)+ "px";
	}
	else
	{
		dialog.style.left = (canvas.width * 0.5 + offsetx) + "px";
		dialog.style.top = (canvas.height * 0.5 + offsety) + "px";
	}

	var button = dialog.querySelector("button");
	button.addEventListener("click", inner );
	canvas.parentNode.appendChild( dialog );

	function inner()
	{
		setValue( input.value );
	}

	function setValue(value)
	{
		node.title = value;
		dialog.parentNode.removeChild( dialog );
		node.setDirtyCanvas(true,true);
	}
}

LGraphCanvas.prototype.prompt = function( title, value, callback, event )
{
	var that = this;
	var input_html = "";
	title = title || "";

	var dialog = document.createElement("div");
	dialog.className = "graphdialog rounded";
	dialog.innerHTML = "<span class='name'></span> <input autofocus type='text' class='value'/><button class='rounded'>OK</button>";
	dialog.close = function()
	{
		that.prompt_box = null;
		dialog.parentNode.removeChild( dialog );
	}

	dialog.addEventListener("mouseleave",function(e){
		 dialog.close();
	});

	if(that.prompt_box)
		that.prompt_box.close();
	that.prompt_box = dialog;

	var first = null;
	var timeout = null;
	var selected = null;

	var name_element = dialog.querySelector(".name");
	name_element.innerText = title;
	var value_element = dialog.querySelector(".value");
	value_element.value = value;

	var input = dialog.querySelector("input");
	input.addEventListener("keydown", function(e){
		if(e.keyCode == 27) //ESC
			dialog.close();
		else if(e.keyCode == 13)
		{
			if( callback )
				callback( this.value );
			dialog.close();
		}
		else
			return;
		e.preventDefault();
		e.stopPropagation();
	});

	var button = dialog.querySelector("button");
	button.addEventListener("click", function(e){
		if( callback )
			callback( input.value );
		that.setDirty(true);
		dialog.close();		
	});

	var graphcanvas = LGraphCanvas.active_canvas;
	var canvas = graphcanvas.canvas;

	var rect = canvas.getBoundingClientRect();
	var offsetx = -20;
	var offsety = -20;
	if(rect)
	{
		offsetx -= rect.left;
		offsety -= rect.top;
	}

	if( event )
	{
		dialog.style.left = (event.pageX + offsetx) + "px";
		dialog.style.top = (event.pageY + offsety)+ "px";
	}
	else
	{
		dialog.style.left = (canvas.width * 0.5 + offsetx) + "px";
		dialog.style.top = (canvas.height * 0.5 + offsety) + "px";
	}

	canvas.parentNode.appendChild( dialog );
	setTimeout( function(){	input.focus(); },10 );

	return dialog;
}


LGraphCanvas.search_filter = false;
LGraphCanvas.search_limit = -1;
LGraphCanvas.prototype.showSearchBox = function(event)
{
	var that = this;
	var input_html = "";

	var dialog = document.createElement("div");
	dialog.className = "litegraph litesearchbox graphdialog rounded";
	dialog.innerHTML = "<span class='name'>Search</span> <input autofocus type='text' class='value rounded'/><div class='helper'></div>";
	dialog.close = function()
	{
		that.search_box = null;
		dialog.parentNode.removeChild( dialog );
	}

	dialog.addEventListener("mouseleave",function(e){
		 dialog.close();
	});

	if(that.search_box)
		that.search_box.close();
	that.search_box = dialog;

	var helper = dialog.querySelector(".helper");

	var first = null;
	var timeout = null;
	var selected = null;

	var input = dialog.querySelector("input");
	if(input)
	{
        input.addEventListener("blur", function(e){
            this.focus();
        });
		input.addEventListener("keydown", function(e){

			if(e.keyCode == 38) //UP
				changeSelection(false);
			else if(e.keyCode == 40) //DOWN
				changeSelection(true);
			else if(e.keyCode == 27) //ESC
				dialog.close();
			else if(e.keyCode == 13)
			{
				if(selected)
					select( selected.innerHTML )
				else if(first)
					select(first);
				else
					dialog.close();
			}
			else
			{
				if(timeout)
					clearInterval(timeout);
				timeout = setTimeout( refreshHelper, 10 );
				return;
			}
			e.preventDefault();
			e.stopPropagation();
		});
	}

	var graphcanvas = LGraphCanvas.active_canvas;
	var canvas = graphcanvas.canvas;

	var rect = canvas.getBoundingClientRect();
	var offsetx = -20;
	var offsety = -20;
	if(rect)
	{
		offsetx -= rect.left;
		offsety -= rect.top;
	}

	if( event )
	{
		dialog.style.left = (event.pageX + offsetx) + "px";
		dialog.style.top = (event.pageY + offsety)+ "px";
	}
	else
	{
		dialog.style.left = (canvas.width * 0.5 + offsetx) + "px";
		dialog.style.top = (canvas.height * 0.5 + offsety) + "px";
	}

	canvas.parentNode.appendChild( dialog );
	input.focus();

	function select( name )
	{
		if(name)
		{
			if( that.onSearchBoxSelection )
				that.onSearchBoxSelection( name, event, graphcanvas );
			else
			{
				var node = LiteGraph.createNode( name );
				if(node)
				{
					node.pos = graphcanvas.convertEventToCanvas( event );
					graphcanvas.graph.add( node );
				}
			}
		}

		dialog.close();
	}

	function changeSelection( forward )
	{
		var prev = selected;
		if(selected)
			selected.classList.remove("selected");
		if(!selected)
			selected = forward ? helper.childNodes[0] : helper.childNodes[ helper.childNodes.length ];
		else
		{
			selected = forward ? selected.nextSibling : selected.previousSibling;
			if(!selected)
				selected = prev;
		}
		if(!selected)
			return;
		selected.classList.add("selected");
		selected.scrollIntoView();
	}

	function refreshHelper() {
        timeout = null;
        var str = input.value;
        first = null;
        helper.innerHTML = "";
        if (!str)
            return;

        if (that.onSearchBox){
            that.onSearchBox(help, str, graphcanvas);
    	} else {
            var c = 0;
        	if(LGraphCanvas.search_filter) {
        		str = str.toLowerCase();

        		var keys = Object.keys(LiteGraph.registered_node_types);
        		var filtered = keys.filter(function (item) {
					return item.toLowerCase().indexOf(str) !== -1;
                });
        		for(var i = 0; i < filtered.length; i++) {
                    addResult(filtered[i]);
                    if(LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit)
						break;
				}
			} else {
                for (var i in LiteGraph.registered_node_types) {
                    if (i.indexOf(str) != -1) {
                        addResult(i);
                        if(LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit)
							break;
                    }
                }
            }
        }

		function addResult(result) {
			var help = document.createElement("div");
			if (!first) first = result;
			help.innerText = result;
			help.className = "litegraph lite-search-item";
			help.addEventListener("click", function (e) {
				select(this.innerText);
			});
			helper.appendChild(help);
		}
	}

	return dialog;
}

LGraphCanvas.prototype.showEditPropertyValue = function( node, property, options )
{
	if(!node || node.properties[ property ] === undefined )
		return;

	options = options || {};
	var that = this;

	var type = "string";

	if(node.properties[ property ] !== null)
		type = typeof(node.properties[ property ]);

	//for arrays
	if(type == "object")
	{
		if( node.properties[ property ].length )
			type = "array";
	}

	var info = null;
	if(node.getPropertyInfo)
		info = node.getPropertyInfo(property);
	if(node.properties_info)
	{
		for(var i = 0; i < node.properties_info.length; ++i)
		{
			if( node.properties_info[i].name == property )
			{
				info = node.properties_info[i];
				break;
			}
		}
	}

	if(info !== undefined && info !== null && info.type )
		type = info.type;

	var input_html = "";

	if(type == "string" || type == "number" || type == "array")
		input_html = "<input autofocus type='text' class='value'/>";
	else if(type == "enum" && info.values)
	{
		input_html = "<select autofocus type='text' class='value'>";
		for(var i in info.values)
		{
			var v = info.values.constructor === Array ? info.values[i] : i;
			input_html += "<option value='"+v+"' "+(v == node.properties[property] ? "selected" : "")+">"+info.values[i]+"</option>";
		}
		input_html += "</select>";
	}
	else if(type == "boolean")
	{
		input_html = "<input autofocus type='checkbox' class='value' "+(node.properties[property] ? "checked" : "")+"/>";
	}
	else
	{
		console.warn("unknown type: " + type );
		return;
	}

	var dialog = this.createDialog( "<span class='name'>" + property + "</span>"+input_html+"<button>OK</button>" , options );

	if(type == "enum" && info.values)
	{
		var input = dialog.querySelector("select");
		input.addEventListener("change", function(e){
			setValue( e.target.value );
			//var index = e.target.value;
			//setValue( e.options[e.selectedIndex].value );
		});
	}
	else if(type == "boolean")
	{
		var input = dialog.querySelector("input");
		if(input)
		{
			input.addEventListener("click", function(e){
				setValue( !!input.checked );
			});
		}
	}
	else
	{
		var input = dialog.querySelector("input");
		if(input)
		{
            input.addEventListener("blur", function(e){
                this.focus();
            });
			input.value = node.properties[ property ] !== undefined ? node.properties[ property ] : "";
			input.addEventListener("keydown", function(e){
				if(e.keyCode != 13)
					return;
				inner();
				e.preventDefault();
				e.stopPropagation();
			});
		}
	}

	var button = dialog.querySelector("button");
	button.addEventListener("click", inner );

	function inner()
	{
		setValue( input.value );
	}

	function setValue(value)
	{
		if(typeof( node.properties[ property ] ) == "number")
			value = Number(value);
		if(type == "array")
			value = value.split(",").map(Number);
		node.properties[ property ] = value;
		if(node._graph)
			node._graph._version++;
		if(node.onPropertyChanged)
			node.onPropertyChanged( property, value );
		dialog.close();
		node.setDirtyCanvas(true,true);
	}
}

LGraphCanvas.prototype.createDialog = function( html, options )
{
	options = options || {};

	var dialog = document.createElement("div");
	dialog.className = "graphdialog";
	dialog.innerHTML = html;

	var rect = this.canvas.getBoundingClientRect();
	var offsetx = -20;
	var offsety = -20;
	if(rect)
	{
		offsetx -= rect.left;
		offsety -= rect.top;
	}

	if( options.position )
	{
		offsetx += options.position[0];
		offsety += options.position[1];
	}
	else if( options.event )
	{
		offsetx += options.event.pageX;
		offsety += options.event.pageY;
	}
	else //centered
	{
		offsetx += this.canvas.width * 0.5;
		offsety += this.canvas.height * 0.5;
	}

	dialog.style.left = offsetx + "px";
	dialog.style.top = offsety + "px";

	this.canvas.parentNode.appendChild( dialog );

	dialog.close = function()
	{
		if(this.parentNode)
			this.parentNode.removeChild( this );
	}

	return dialog;
}

LGraphCanvas.onMenuNodeCollapse = function( value, options, e, menu, node )
{
	node.collapse();
}

LGraphCanvas.onMenuNodePin = function( value, options, e, menu, node )
{
	node.pin();
}

LGraphCanvas.onMenuNodeMode = function( value, options, e, menu, node )
{
	new LiteGraph.ContextMenu(["Always","On Event","On Trigger","Never"], {event: e, callback: inner_clicked, parentMenu: menu, node: node });

	function inner_clicked(v)
	{
		if(!node)
			return;
		switch(v)
		{
			case "On Event": node.mode = LiteGraph.ON_EVENT; break;
			case "On Trigger": node.mode = LiteGraph.ON_TRIGGER; break;
			case "Never": node.mode = LiteGraph.NEVER; break;
			case "Always":
			default:
				node.mode = LiteGraph.ALWAYS; break;
		}
	}

	return false;
}

LGraphCanvas.onMenuNodeColors = function( value, options, e, menu, node )
{
	if(!node)
		throw("no node for color");

	var values = [];
	values.push({ value:null, content:"<span style='display: block; padding-left: 4px;'>No color</span>" });

	for(var i in LGraphCanvas.node_colors)
	{
		var color = LGraphCanvas.node_colors[i];
		var value = { value:i, content:"<span style='display: block; color: #999; padding-left: 4px; border-left: 8px solid "+color.color+"; background-color:"+color.bgcolor+"'>"+i+"</span>" };
		values.push(value);
	}
	new LiteGraph.ContextMenu( values, { event: e, callback: inner_clicked, parentMenu: menu, node: node });

	function inner_clicked(v)
	{
		if(!node)
			return;

		var color = v.value ? LGraphCanvas.node_colors[ v.value ] : null;
		if(color)
		{
			if(node.constructor === LiteGraph.LGraphGroup)
				node.color = color.groupcolor;
			else
			{
				node.color = color.color;
				node.bgcolor = color.bgcolor;
			}
		}
		else
		{
			delete node.color;
			delete node.bgcolor;
		}
		node.setDirtyCanvas(true,true);
	}

	return false;
}

LGraphCanvas.onMenuNodeShapes = function( value, options, e, menu, node )
{
	if(!node)
		throw("no node passed");

	new LiteGraph.ContextMenu( LiteGraph.VALID_SHAPES, { event: e, callback: inner_clicked, parentMenu: menu, node: node });

	function inner_clicked(v)
	{
		if(!node)
			return;
		node.shape = v;
		node.setDirtyCanvas(true);
	}

	return false;
}

LGraphCanvas.onMenuNodeRemove = function( value, options, e, menu, node )
{
	if(!node)
		throw("no node passed");

	if(node.removable === false)
		return;

	node.graph.remove(node);
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.onMenuNodeClone = function( value, options, e, menu, node )
{
	if(node.clonable == false) return;
	var newnode = node.clone();
	if(!newnode)
		return;
	newnode.pos = [node.pos[0]+5,node.pos[1]+5];
	node.graph.add(newnode);
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.node_colors = {
	"red": { color:"#322", bgcolor:"#533", groupcolor: "#A88" },
	"brown": { color:"#332922", bgcolor:"#593930", groupcolor: "#b06634" },
	"green": { color:"#232", bgcolor:"#353", groupcolor: "#8A8" },
	"blue": { color:"#223", bgcolor:"#335", groupcolor: "#88A" },
	"pale_blue": { color:"#2a363b", bgcolor:"#3f5159", groupcolor: "#3f789e" },
	"cyan": { color:"#233", bgcolor:"#355", groupcolor: "#8AA" },
	"purple": { color:"#323", bgcolor:"#535", groupcolor: "#a1309b" },
	"yellow": { color:"#432", bgcolor:"#653", groupcolor: "#b58b2a" },
	"black": { color:"#222", bgcolor:"#000", groupcolor: "#444" }
};

LGraphCanvas.prototype.getCanvasMenuOptions = function()
{
	var options = null;
	if(this.getMenuOptions)
		options = this.getMenuOptions();
	else
	{
		options = [
			{ content:"Add Node", has_submenu: true, callback: LGraphCanvas.onMenuAdd },
			{ content:"Add Group", callback: LGraphCanvas.onGroupAdd }
			//{content:"Collapse All", callback: LGraphCanvas.onMenuCollapseAll }
		];

		if(this._graph_stack && this._graph_stack.length > 0)
			options.push(null,{content:"Close subgraph", callback: this.closeSubgraph.bind(this) });
	}

	if(this.getExtraMenuOptions)
	{
		var extra = this.getExtraMenuOptions(this,options);
		if(extra)
			options = options.concat( extra );
	}

	return options;
}

//called by processContextMenu to extract the menu list
LGraphCanvas.prototype.getNodeMenuOptions = function( node )
{
	var options = null;

	if(node.getMenuOptions)
		options = node.getMenuOptions(this);
	else
		options = [
			{content:"Inputs", has_submenu: true, disabled:true, callback: LGraphCanvas.showMenuNodeOptionalInputs },
			{content:"Outputs", has_submenu: true, disabled:true, callback: LGraphCanvas.showMenuNodeOptionalOutputs },
			null,
			{content:"Properties", has_submenu: true, callback: LGraphCanvas.onShowMenuNodeProperties },
			null,
			{content:"Title", callback: LGraphCanvas.onShowTitleEditor },
			{content:"Mode", has_submenu: true, callback: LGraphCanvas.onMenuNodeMode },
			{content:"Resize", callback: LGraphCanvas.onResizeNode },
			{content:"Collapse", callback: LGraphCanvas.onMenuNodeCollapse },
			{content:"Pin", callback: LGraphCanvas.onMenuNodePin },
			{content:"Colors", has_submenu: true, callback: LGraphCanvas.onMenuNodeColors },
			{content:"Shapes", has_submenu: true, callback: LGraphCanvas.onMenuNodeShapes },
			null
		];

	if(node.getExtraMenuOptions)
	{
		var extra = node.getExtraMenuOptions(this);
		if(extra)
		{
			extra.push(null);
			options = extra.concat( options );
		}
	}

	if( node.clonable !== false )
			options.push({content:"Clone", callback: LGraphCanvas.onMenuNodeClone });
	if( node.removable !== false )
			options.push(null,{content:"Remove", callback: LGraphCanvas.onMenuNodeRemove });

	if(node.onGetInputs)
	{
		var inputs = node.onGetInputs();
		if(inputs && inputs.length)
			options[0].disabled = false;
	}

	if(node.onGetOutputs)
	{
		var outputs = node.onGetOutputs();
		if(outputs && outputs.length )
			options[1].disabled = false;
	}

	if(node.graph && node.graph.onGetNodeMenuOptions )
		node.graph.onGetNodeMenuOptions( options, node );

	return options;
}

LGraphCanvas.prototype.getGroupMenuOptions = function( node )
{
	var o = [
		{content:"Title", callback: LGraphCanvas.onShowTitleEditor },
		{content:"Color", has_submenu: true, callback: LGraphCanvas.onMenuNodeColors },
		null,
		{content:"Remove", callback: LGraphCanvas.onMenuNodeRemove }
	];

	return o;
}

LGraphCanvas.prototype.processContextMenu = function( node, event )
{
	var that = this;
	var canvas = LGraphCanvas.active_canvas;
	var ref_window = canvas.getCanvasWindow();

	var menu_info = null;
	var options = { event: event, callback: inner_option_clicked, extra: node };

	//check if mouse is in input
	var slot = null;
	if(node)
	{
		slot = node.getSlotInPosition( event.canvasX, event.canvasY );
		LGraphCanvas.active_node = node;
	}

	if(slot) //on slot
	{
		menu_info = [];
		if(slot && slot.output && slot.output.links && slot.output.links.length)
			menu_info.push( { content: "Disconnect Links", slot: slot } );
		menu_info.push( slot.locked ? "Cannot remove"  : { content: "Remove Slot", slot: slot } );
		menu_info.push( slot.nameLocked ? "Cannot rename" : { content: "Rename Slot", slot: slot } );
		options.title = (slot.input ? slot.input.type : slot.output.type) || "*";
		if(slot.input && slot.input.type == LiteGraph.ACTION)
			options.title = "Action";
		if(slot.output && slot.output.type == LiteGraph.EVENT)
			options.title = "Event";
	}
	else
	{
		if( node ) //on node
			menu_info = this.getNodeMenuOptions(node);
		else 
		{
			menu_info = this.getCanvasMenuOptions();
			var group = this.graph.getGroupOnPos( event.canvasX, event.canvasY );
			if( group ) //on group
				menu_info.push(null,{content:"Edit Group", has_submenu: true, submenu: { title:"Group", extra: group, options: this.getGroupMenuOptions( group ) }});
		}
	}

	//show menu
	if(!menu_info)
		return;

	var menu = new LiteGraph.ContextMenu( menu_info, options, ref_window );

	function inner_option_clicked( v, options, e )
	{
		if(!v)
			return;

		if(v.content == "Remove Slot")
		{
			var info = v.slot;
			if(info.input)
				node.removeInput( info.slot );
			else if(info.output)
				node.removeOutput( info.slot );
			return;
		}
		else if(v.content == "Disconnect Links")
		{
			var info = v.slot;
			if(info.output)
				node.disconnectOutput( info.slot );
			else if(info.input)
				node.disconnectInput( info.slot );
			return;
		}
		else if( v.content == "Rename Slot")
		{
			var info = v.slot;
            var slot_info = info.input ? node.getInputInfo( info.slot ) : node.getOutputInfo( info.slot );
			var dialog = that.createDialog( "<span class='name'>Name</span><input autofocus type='text'/><button>OK</button>" , options );
			var input = dialog.querySelector("input");
			if(input && slot_info){
				input.value = slot_info.label;
			}
			dialog.querySelector("button").addEventListener("click",function(e){
				if(input.value)
				{
					if( slot_info )
						slot_info.label = input.value;
					that.setDirty(true);
				}
				dialog.close();
			});
		}

		//if(v.callback)
		//	return v.callback.call(that, node, options, e, menu, that, event );
	}
}






//API *************************************************
//like rect but rounded corners
if(this.CanvasRenderingContext2D)
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, radius_low) {
  if ( radius === undefined ) {
    radius = 5;
  }

  if(radius_low === undefined)
	 radius_low  = radius;

  this.moveTo(x + radius, y);
  this.lineTo(x + width - radius, y);
  this.quadraticCurveTo(x + width, y, x + width, y + radius);

  this.lineTo(x + width, y + height - radius_low);
  this.quadraticCurveTo(x + width, y + height, x + width - radius_low, y + height);
  this.lineTo(x + radius_low, y + height);
  this.quadraticCurveTo(x, y + height, x, y + height - radius_low);
  this.lineTo(x, y + radius);
  this.quadraticCurveTo(x, y, x + radius, y);
}

function compareObjects(a,b)
{
	for(var i in a)
		if(a[i] != b[i])
			return false;
	return true;
}
LiteGraph.compareObjects = compareObjects;

function distance(a,b)
{
	return Math.sqrt( (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) );
}
LiteGraph.distance = distance;

function colorToString(c)
{
	return "rgba(" + Math.round(c[0] * 255).toFixed() + "," + Math.round(c[1] * 255).toFixed() + "," + Math.round(c[2] * 255).toFixed() + "," + (c.length == 4 ? c[3].toFixed(2) : "1.0") + ")";
}
LiteGraph.colorToString = colorToString;

function isInsideRectangle( x,y, left, top, width, height)
{
	if (left < x && (left + width) > x &&
		top < y && (top + height) > y)
		return true;
	return false;
}
LiteGraph.isInsideRectangle = isInsideRectangle;

//[minx,miny,maxx,maxy]
function growBounding( bounding, x,y)
{
	if(x < bounding[0])
		bounding[0] = x;
	else if(x > bounding[2])
		bounding[2] = x;

	if(y < bounding[1])
		bounding[1] = y;
	else if(y > bounding[3])
		bounding[3] = y;
}
LiteGraph.growBounding = growBounding;

//point inside boundin box
function isInsideBounding(p,bb)
{
	if (p[0] < bb[0][0] ||
		p[1] < bb[0][1] ||
		p[0] > bb[1][0] ||
		p[1] > bb[1][1])
		return false;
	return true;
}
LiteGraph.isInsideBounding = isInsideBounding;

//boundings overlap, format: [ startx, starty, width, height ]
function overlapBounding(a,b)
{
	var A_end_x = a[0] + a[2];
	var A_end_y = a[1] + a[3];
	var B_end_x = b[0] + b[2];
	var B_end_y = b[1] + b[3];

	if ( a[0] > B_end_x ||
		a[1] > B_end_y ||
		A_end_x < b[0] ||
		A_end_y < b[1])
		return false;
	return true;
}
LiteGraph.overlapBounding = overlapBounding;

//Convert a hex value to its decimal value - the inputted hex must be in the
//	format of a hex triplet - the kind we use for HTML colours. The function
//	will return an array with three values.
function hex2num(hex) {
	if(hex.charAt(0) == "#") hex = hex.slice(1); //Remove the '#' char - if there is one.
	hex = hex.toUpperCase();
	var hex_alphabets = "0123456789ABCDEF";
	var value = new Array(3);
	var k = 0;
	var int1,int2;
	for(var i=0;i<6;i+=2) {
		int1 = hex_alphabets.indexOf(hex.charAt(i));
		int2 = hex_alphabets.indexOf(hex.charAt(i+1));
		value[k] = (int1 * 16) + int2;
		k++;
	}
	return(value);
}

LiteGraph.hex2num = hex2num;

//Give a array with three values as the argument and the function will return
//	the corresponding hex triplet.
function num2hex(triplet) {
	var hex_alphabets = "0123456789ABCDEF";
	var hex = "#";
	var int1,int2;
	for(var i=0;i<3;i++) {
		int1 = triplet[i] / 16;
		int2 = triplet[i] % 16;

		hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
	}
	return(hex);
}

LiteGraph.num2hex = num2hex;

/* LiteGraph GUI elements used for canvas editing *************************************/

/**
* ContextMenu from LiteGUI
*
* @class ContextMenu
* @constructor
* @param {Array} values (allows object { title: "Nice text", callback: function ... })
* @param {Object} options [optional] Some options:\
* - title: title to show on top of the menu
* - callback: function to call when an option is clicked, it receives the item information
* - ignore_item_callbacks: ignores the callback inside the item, it just calls the options.callback
* - event: you can pass a MouseEvent, this way the ContextMenu appears in that position
*/
function ContextMenu( values, options )
{
	options = options || {};
	this.options = options;
	var that = this;

	//to link a menu with its parent
	if(options.parentMenu)
	{
		if( options.parentMenu.constructor !== this.constructor )
		{
			console.error("parentMenu must be of class ContextMenu, ignoring it");
			options.parentMenu = null;
		}
		else
		{
			this.parentMenu = options.parentMenu;
			this.parentMenu.lock = true;
			this.parentMenu.current_submenu = this;
		}
	}

	if(options.event && options.event.constructor !== MouseEvent && options.event.constructor !== CustomEvent)
	{
		console.error("Event passed to ContextMenu is not of type MouseEvent or CustomEvent. Ignoring it.");
		options.event = null;
	}

	var root = document.createElement("div");
	root.className = "litegraph litecontextmenu litemenubar-panel";
	root.style.minWidth = 100;
	root.style.minHeight = 100;
	root.style.pointerEvents = "none";
	setTimeout( function() { root.style.pointerEvents = "auto"; },100); //delay so the mouse up event is not caugh by this element

	//this prevents the default context browser menu to open in case this menu was created when pressing right button
	root.addEventListener("mouseup", function(e){
		e.preventDefault(); return true;
	}, true);
	root.addEventListener("contextmenu", function(e) {
		if(e.button != 2) //right button
			return false;
		e.preventDefault();
		return false;
	},true);

	root.addEventListener("mousedown", function(e){
		if(e.button == 2)
		{
			that.close();
			e.preventDefault(); return true;
		}
	}, true);

	function on_mouse_wheel(e)
	{
		var pos = parseInt( root.style.top );
		root.style.top = (pos + e.deltaY * 0.1).toFixed() + "px";
		e.preventDefault();
		return true;
	}

	root.addEventListener("wheel", on_mouse_wheel, true);
	root.addEventListener("mousewheel", on_mouse_wheel, true);


	this.root = root;

	//title
	if(options.title)
	{
		var element = document.createElement("div");
		element.className = "litemenu-title";
		element.innerHTML = options.title;
		root.appendChild(element);
	}

	//entries
	var num = 0;
	for(var i in values)
	{
		var name = values.constructor == Array ? values[i] : i;
		if( name != null && name.constructor !== String )
			name = name.content === undefined ? String(name) : name.content;
		var value = values[i];
		this.addItem( name, value, options );
		num++;
	}

	//close on leave
	root.addEventListener("mouseleave", function(e) {
		if(that.lock)
			return;
		that.close(e);
	});

	//insert before checking position
	var root_document = document;
	if(options.event)
		root_document = options.event.target.ownerDocument;

	if(!root_document)
		root_document = document;
	root_document.body.appendChild(root);

	//compute best position
	var left = options.left || 0;
	var top = options.top || 0;
	if(options.event)
	{
		left = (options.event.pageX - 10);
		top = (options.event.pageY - 10);
		if(options.title)
			top -= 20;

		if(options.parentMenu)
		{
			var rect = options.parentMenu.root.getBoundingClientRect();
			left = rect.left + rect.width;
		}

		var body_rect = document.body.getBoundingClientRect();
		var root_rect = root.getBoundingClientRect();

		if(left > (body_rect.width - root_rect.width - 10))
			left = (body_rect.width - root_rect.width - 10);
		if(top > (body_rect.height - root_rect.height - 10))
			top = (body_rect.height - root_rect.height - 10);
	}

	root.style.left = left + "px";
	root.style.top = top  + "px";
}

ContextMenu.prototype.addItem = function( name, value, options )
{
	var that = this;
	options = options || {};

	var element = document.createElement("div");
	element.className = "litemenu-entry submenu";

	var disabled = false;

	if(value === null)
	{
		element.classList.add("separator");
		//element.innerHTML = "<hr/>"
		//continue;
	}
	else
	{
		element.innerHTML = value && value.title ? value.title : name;
		element.value = value;

		if(value)
		{
			if(value.disabled)
			{
				disabled = true;
				element.classList.add("disabled");
			}
			if(value.submenu || value.has_submenu)
				element.classList.add("has_submenu");
		}

		if(typeof(value) == "function")
		{
			element.dataset["value"] = name;
			element.onclick_callback = value;
		}
		else
			element.dataset["value"] = value;

		if(value.className)
			element.className += " " + value.className;
	}

	this.root.appendChild(element);
	if(!disabled)
		element.addEventListener("click", inner_onclick);
	if(options.autoopen)
		element.addEventListener("mouseenter", inner_over);

	function inner_over(e)
	{
		var value = this.value;
		if(!value || !value.has_submenu)
			return;
		inner_onclick.call(this,e);
	}

	//menu option clicked
	function inner_onclick(e) {
		var value = this.value;
		var close_parent = true;

		if(that.current_submenu)
			that.current_submenu.close(e);

		//global callback
		if(options.callback)
		{
			var r = options.callback.call( this, value, options, e, that, options.node );
			if(r === true)
				close_parent = false;
		}

		//special cases
		if(value)
		{
			if (value.callback && !options.ignore_item_callbacks && value.disabled !== true )  //item callback
			{
				var r = value.callback.call( this, value, options, e, that, options.extra );
				if(r === true)
					close_parent = false;
			}
			if(value.submenu)
			{
				if(!value.submenu.options)
					throw("ContextMenu submenu needs options");
				var submenu = new that.constructor( value.submenu.options, {
					callback: value.submenu.callback,
					event: e,
					parentMenu: that,
					ignore_item_callbacks: value.submenu.ignore_item_callbacks,
					title: value.submenu.title,
					extra: value.submenu.extra,
					autoopen: options.autoopen
				});
				close_parent = false;
			}
		}

		if(close_parent && !that.lock)
			that.close();
	}

	return element;
}

ContextMenu.prototype.close = function(e, ignore_parent_menu)
{
	if(this.root.parentNode)
		this.root.parentNode.removeChild( this.root );
	if(this.parentMenu && !ignore_parent_menu)
	{
		this.parentMenu.lock = false;
		this.parentMenu.current_submenu = null;
		if( e === undefined )
			this.parentMenu.close();
		else if( e && !ContextMenu.isCursorOverElement( e, this.parentMenu.root) )
		{
			ContextMenu.trigger( this.parentMenu.root, "mouseleave", e );
		}
	}
	if(this.current_submenu)
		this.current_submenu.close(e, true);
}

//this code is used to trigger events easily (used in the context menu mouseleave
ContextMenu.trigger = function( element, event_name, params, origin )
{
	var evt = document.createEvent( 'CustomEvent' );
	evt.initCustomEvent( event_name, true,true, params ); //canBubble, cancelable, detail
	evt.srcElement = origin;
	if( element.dispatchEvent )
		element.dispatchEvent( evt );
	else if( element.__events )
		element.__events.dispatchEvent( evt );
	//else nothing seems binded here so nothing to do
	return evt;
}

//returns the top most menu
ContextMenu.prototype.getTopMenu = function()
{
	if( this.options.parentMenu )
		return this.options.parentMenu.getTopMenu();
	return this;
}

ContextMenu.prototype.getFirstEvent = function()
{
	if( this.options.parentMenu )
		return this.options.parentMenu.getFirstEvent();
	return this.options.event;
}



ContextMenu.isCursorOverElement = function( event, element )
{
	var left = event.pageX;
	var top = event.pageY;
	var rect = element.getBoundingClientRect();
	if(!rect)
		return false;
	if(top > rect.top && top < (rect.top + rect.height) &&
		left > rect.left && left < (rect.left + rect.width) )
		return true;
	return false;
}



LiteGraph.ContextMenu = ContextMenu;

LiteGraph.closeAllContextMenus = function( ref_window )
{
	ref_window = ref_window || window;

	var elements = ref_window.document.querySelectorAll(".litecontextmenu");
	if(!elements.length)
		return;

	var result = [];
	for(var i = 0; i < elements.length; i++)
		result.push(elements[i]);

	for(var i in result)
	{
		if(result[i].close)
			result[i].close();
		else if(result[i].parentNode)
			result[i].parentNode.removeChild( result[i] );
	}
}

LiteGraph.extendClass = function ( target, origin )
{
	for(var i in origin) //copy class properties
	{
		if(target.hasOwnProperty(i))
			continue;
		target[i] = origin[i];
	}

	if(origin.prototype) //copy prototype properties
		for(var i in origin.prototype) //only enumerables
		{
			if(!origin.prototype.hasOwnProperty(i))
				continue;

			if(target.prototype.hasOwnProperty(i)) //avoid overwritting existing ones
				continue;

			//copy getters
			if(origin.prototype.__lookupGetter__(i))
				target.prototype.__defineGetter__(i, origin.prototype.__lookupGetter__(i));
			else
				target.prototype[i] = origin.prototype[i];

			//and setters
			if(origin.prototype.__lookupSetter__(i))
				target.prototype.__defineSetter__(i, origin.prototype.__lookupSetter__(i));
		}
}

//used to create nodes from wrapping functions
LiteGraph.getParameterNames = function(func) {
    return (func + '')
      .replace(/[/][/].*$/mg,'') // strip single-line comments
      .replace(/\s+/g, '') // strip white space
      .replace(/[/][*][^/*]*[*][/]/g, '') // strip multi-line comments  /**/
      .split('){', 1)[0].replace(/^[^(]*[(]/, '') // extract the parameters
      .replace(/=[^,]+/g, '') // strip any ES6 defaults
      .split(',').filter(Boolean); // split & filter [""]
}

Math.clamp = function(v,a,b) { return (a > v ? a : (b < v ? b : v)); }

if( typeof(window) != "undefined" && !window["requestAnimationFrame"] )
{
	window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
		  window.mozRequestAnimationFrame    ||
		  (function( callback ){
			window.setTimeout(callback, 1000 / 60);
		  });
}

})(this);

if(typeof(exports) != "undefined")
	exports.LiteGraph = this.LiteGraph;

//basic nodes
(function(global){
var LiteGraph = global.LiteGraph;

//Constant
function Time()
{
	this.addOutput("in ms","number");
	this.addOutput("in sec","number");
}

Time.title = "Time";
Time.desc = "Time";

Time.prototype.onExecute = function()
{
	this.setOutputData(0, this.graph.globaltime * 1000 );
	this.setOutputData(1, this.graph.globaltime  );
}

LiteGraph.registerNodeType("basic/time", Time);


//Subgraph: a node that contains a graph
function Subgraph()
{
	var that = this;
	this.size = [120,80];

	//create inner graph
	this.subgraph = new LGraph();
	this.subgraph._subgraph_node = this;
	this.subgraph._is_subgraph = true;

	this.subgraph.onGlobalInputAdded = this.onSubgraphNewGlobalInput.bind(this);
	this.subgraph.onGlobalInputRenamed = this.onSubgraphRenamedGlobalInput.bind(this);
	this.subgraph.onGlobalInputTypeChanged = this.onSubgraphTypeChangeGlobalInput.bind(this);

	this.subgraph.onGlobalOutputAdded = this.onSubgraphNewGlobalOutput.bind(this);
	this.subgraph.onGlobalOutputRenamed = this.onSubgraphRenamedGlobalOutput.bind(this);
	this.subgraph.onGlobalOutputTypeChanged = this.onSubgraphTypeChangeGlobalOutput.bind(this);

	this.color = "#335";
	this.bgcolor = "#557";
}

Subgraph.title = "Subgraph";
Subgraph.desc = "Graph inside a node";

Subgraph.prototype.onDrawTitle = function(ctx)
{
	if(this.flags.collapsed)
		return;

	ctx.fillStyle = "#AAA";
	var w = LiteGraph.NODE_TITLE_HEIGHT;
	var x = this.size[0] - w;
	ctx.fillRect( x, -w, w,w );
	ctx.fillStyle = "#333";
	ctx.beginPath();
	ctx.moveTo( x+w*0.2, -w*0.6 );
	ctx.lineTo( x+w*0.8, -w*0.6 );
	ctx.lineTo( x+w*0.5, -w*0.3 );
	ctx.fill();
}

Subgraph.prototype.onMouseDown = function(e,pos,graphcanvas)
{
	if( !this.flags.collapsed && pos[0] > this.size[0] - LiteGraph.NODE_TITLE_HEIGHT && pos[1] < 0 )
	{
		var that = this;
		setTimeout(function(){ graphcanvas.openSubgraph( that.subgraph ); },10 );
	}
}

Subgraph.prototype.onSubgraphNewGlobalInput = function(name, type)
{
	//add input to the node
	this.addInput(name, type);
}

Subgraph.prototype.onSubgraphRenamedGlobalInput = function(oldname, name)
{
	var slot = this.findInputSlot( oldname );
	if(slot == -1)
		return;
	var info = this.getInputInfo(slot);
	info.name = name;
}

Subgraph.prototype.onSubgraphTypeChangeGlobalInput = function(name, type)
{
	var slot = this.findInputSlot( name );
	if(slot == -1)
		return;
	var info = this.getInputInfo(slot);
	info.type = type;
}


Subgraph.prototype.onSubgraphNewGlobalOutput = function(name, type)
{
	//add output to the node
	this.addOutput(name, type);
}


Subgraph.prototype.onSubgraphRenamedGlobalOutput = function(oldname, name)
{
	var slot = this.findOutputSlot( oldname );
	if(slot == -1)
		return;
	var info = this.getOutputInfo(slot);
	info.name = name;
}

Subgraph.prototype.onSubgraphTypeChangeGlobalOutput = function(name, type)
{
	var slot = this.findOutputSlot( name );
	if(slot == -1)
		return;
	var info = this.getOutputInfo(slot);
	info.type = type;
}


Subgraph.prototype.getExtraMenuOptions = function(graphcanvas)
{
	var that = this;
	return [ {content:"Open", callback: 
		function() { 
			graphcanvas.openSubgraph( that.subgraph );
		}
	}];
}

Subgraph.prototype.onResize = function(size)
{
	size[1] += 20;
}

Subgraph.prototype.onExecute = function()
{
	//send inputs to subgraph global inputs
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var value = this.getInputData(i);
			this.subgraph.setGlobalInputData( input.name, value );
		}

	//execute
	this.subgraph.runStep();

	//send subgraph global outputs to outputs
	if(this.outputs)
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			var value = this.subgraph.getGlobalOutputData( output.name );
			this.setOutputData(i, value);
		}
}

Subgraph.prototype.configure = function(o)
{
	LGraphNode.prototype.configure.call(this, o);
	//this.subgraph.configure(o.graph);
}

Subgraph.prototype.serialize = function()
{
	var data = LGraphNode.prototype.serialize.call(this);
	data.subgraph = this.subgraph.serialize();
	return data;
}

Subgraph.prototype.clone = function()
{
	var node = LiteGraph.createNode(this.type);
	var data = this.serialize();
	delete data["id"];
	delete data["inputs"];
	delete data["outputs"];
	node.configure(data);
	return node;
}


LiteGraph.registerNodeType("graph/subgraph", Subgraph );


//Input for a subgraph
function GlobalInput()
{

	//random name to avoid problems with other outputs when added
	var input_name = "input_" + (Math.random()*1000).toFixed();

	this.addOutput(input_name, null );

	this.properties = { name: input_name, type: null };

	var that = this;

	Object.defineProperty( this.properties, "name", {
		get: function() { 
			return input_name;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getOutputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			if(that.graph)
				that.graph.renameGlobalInput(input_name, v);
			input_name = v;
		},
		enumerable: true
	});

	Object.defineProperty( this.properties, "type", {
		get: function() { return that.outputs[0].type; },
		set: function(v) { 
			that.outputs[0].type = v; 
			if(that.graph)
				that.graph.changeGlobalInputType(input_name, that.outputs[0].type);
		},
		enumerable: true
	});
}

GlobalInput.title = "Input";
GlobalInput.desc = "Input of the graph";

//When added to graph tell the graph this is a new global input
GlobalInput.prototype.onAdded = function()
{
	this.graph.addGlobalInput( this.properties.name, this.properties.type );
}

GlobalInput.prototype.onExecute = function()
{
	var name = this.properties.name;

	//read from global input
	var	data = this.graph.global_inputs[name];
	if(!data) return;

	//put through output
	this.setOutputData(0,data.value);
}

LiteGraph.registerNodeType("graph/input", GlobalInput);



//Output for a subgraph
function GlobalOutput()
{
	//random name to avoid problems with other outputs when added
	var output_name = "output_" + (Math.random()*1000).toFixed();

	this.addInput(output_name, null);

	this._value = null;

	this.properties = {name: output_name, type: null };

	var that = this;

	Object.defineProperty(this.properties, "name", {
		get: function() { 
			return output_name;
		},
		set: function(v) {
			if(v == "")
				return;

			var info = that.getInputInfo(0);
			if(info.name == v)
				return;
			info.name = v;
			if(that.graph)
				that.graph.renameGlobalOutput(output_name, v);
			output_name = v;
		},
		enumerable: true
	});

	Object.defineProperty(this.properties, "type", {
		get: function() { return that.inputs[0].type; },
		set: function(v) { 
			that.inputs[0].type = v;
			if(that.graph)
				that.graph.changeGlobalInputType( output_name, that.inputs[0].type );
		},
		enumerable: true
	});
}

GlobalOutput.title = "Output";
GlobalOutput.desc = "Output of the graph";

GlobalOutput.prototype.onAdded = function()
{
	var name = this.graph.addGlobalOutput( this.properties.name, this.properties.type );
}

GlobalOutput.prototype.getValue = function()
{
	return this._value;
}

GlobalOutput.prototype.onExecute = function()
{
	this._value = this.getInputData(0);
	this.graph.setGlobalOutputData( this.properties.name, this._value );
}

LiteGraph.registerNodeType("graph/output", GlobalOutput);



//Constant
function Constant()
{
	this.addOutput("value","number");
	this.addProperty( "value", 1.0 );
	this.editable = { property:"value", type:"number" };
}

Constant.title = "Const";
Constant.desc = "Constant value";


Constant.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
};

Constant.prototype.onExecute = function()
{
	this.setOutputData(0, parseFloat( this.properties["value"] ) );
}

Constant.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.outputs[0].label = this.properties["value"].toFixed(3);
}

LiteGraph.registerNodeType("basic/const", Constant);


//Watch a value in the editor
function Watch()
{
	this.size = [60,20];
	this.addInput("value",0,{label:""});
	this.value = 0;
}

Watch.title = "Watch";
Watch.desc = "Show value of input";

Watch.prototype.onExecute = function()
{
	if( this.inputs[0] )	
		this.value = this.getInputData(0);
}

Watch.toString = function( o )
{
	if( o == null )
		return "null";
	else if (o.constructor === Number )
		return o.toFixed(3);
	else if (o.constructor === Array )
	{
		var str = "[";
		for(var i = 0; i < o.length; ++i)
			str += Watch.toString(o[i]) + ((i+1) != o.length ? "," : "");
		str += "]";
		return str;
	}
	else
		return String(o);
}

Watch.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	this.inputs[0].label = Watch.toString(this.value);
}

LiteGraph.registerNodeType("basic/watch", Watch);

//Watch a value in the editor
function Pass()
{
	this.addInput("in",0);
	this.addOutput("out",0);
	this.size = [40,20];
}

Pass.title = "Pass";
Pass.desc = "Allows to connect different types";

Pass.prototype.onExecute = function()
{
	this.setOutputData( 0, this.getInputData(0) );
}

LiteGraph.registerNodeType("basic/pass", Pass);


//Show value inside the debug console
function Console()
{
	this.mode = LiteGraph.ON_EVENT;
	this.size = [60,20];
	this.addProperty( "msg", "" );
	this.addInput("log", LiteGraph.EVENT);
	this.addInput("msg",0);
}

Console.title = "Console";
Console.desc = "Show value inside the console";

Console.prototype.onAction = function(action, param)
{
	if(action == "log")
		console.log( param );
	else if(action == "warn")
		console.warn( param );
	else if(action == "error")
		console.error( param );
}

Console.prototype.onExecute = function()
{
	var msg = this.getInputData(1);
	if(msg !== null)
		this.properties.msg = msg;
	console.log(msg);
}

Console.prototype.onGetInputs = function()
{
	return [["log",LiteGraph.ACTION],["warn",LiteGraph.ACTION],["error",LiteGraph.ACTION]];
}

LiteGraph.registerNodeType("basic/console", Console );



//Show value inside the debug console
function NodeScript()
{
	this.size = [60,20];
	this.addProperty( "onExecute", "" );
	this.addInput("in", "");
	this.addInput("in2", "");
	this.addOutput("out", "");
	this.addOutput("out2", "");

	this._func = null;
}

NodeScript.title = "Script";
NodeScript.desc = "executes a code";

NodeScript.widgets_info = {
	"onExecute": { type:"code" }
};

NodeScript.prototype.onPropertyChanged = function(name,value)
{
	if(name == "onExecute" && LiteGraph.allow_scripts )
	{
		this._func = null;
		try
		{
			this._func = new Function( value );
		}
		catch (err)
		{
			console.error("Error parsing script");
			console.error(err);
		}
	}
}

NodeScript.prototype.onExecute = function()
{
	if(!this._func)
		return;

	try
	{
		this._func.call(this);
	}
	catch (err)
	{
		console.error("Error in script");
		console.error(err);
	}
}

LiteGraph.registerNodeType("basic/script", NodeScript );


})(this);
//event related nodes
(function(global){
var LiteGraph = global.LiteGraph;

//Show value inside the debug console
function LogEvent()
{
	this.size = [60,20];
	this.addInput("event", LiteGraph.ACTION);
}

LogEvent.title = "Log Event";
LogEvent.desc = "Log event in console";

LogEvent.prototype.onAction = function( action, param )
{
	console.log( action, param );
}

LiteGraph.registerNodeType("events/log", LogEvent );


//Filter events
function FilterEvent()
{
	this.size = [60,20];
	this.addInput("event", LiteGraph.ACTION);
	this.addOutput("event", LiteGraph.EVENT);
	this.properties = {
		equal_to: "",
		has_property:"",
		property_equal_to: ""
	};
}

FilterEvent.title = "Filter Event";
FilterEvent.desc = "Blocks events that do not match the filter";

FilterEvent.prototype.onAction = function( action, param )
{
	if( param == null )
		return;

	if( this.properties.equal_to && this.properties.equal_to != param )
		return;

	if( this.properties.has_property )
	{
		var prop = param[ this.properties.has_property ];
		if( prop == null )
			return;

		if( this.properties.property_equal_to && this.properties.property_equal_to != prop )
			return;
	}

	this.triggerSlot(0,param);
}

LiteGraph.registerNodeType("events/filter", FilterEvent );

//Show value inside the debug console
function DelayEvent()
{
	this.size = [60,20];
	this.addProperty( "time", 1000 );
	this.addInput("event", LiteGraph.ACTION);
	this.addOutput("on_time", LiteGraph.EVENT);

	this._pending = [];
}

DelayEvent.title = "Delay";
DelayEvent.desc = "Delays one event";

DelayEvent.prototype.onAction = function(action, param)
{
	this._pending.push([ this.properties.time, param ]);
}

DelayEvent.prototype.onExecute = function()
{
	var dt = this.graph.elapsed_time * 1000; //in ms

	for(var i = 0; i < this._pending.length; ++i)
	{
		var action = this._pending[i];
		action[0] -= dt;
		if( action[0] > 0 )
			continue;
		
		//remove
		this._pending.splice(i,1); 
		--i;

		//trigger
		this.trigger(null, action[1]);
	}
}

DelayEvent.prototype.onGetInputs = function()
{
	return [["event",LiteGraph.ACTION]];
}

LiteGraph.registerNodeType("events/delay", DelayEvent );


//Show value inside the debug console
function TimerEvent()
{
	this.addProperty("interval", 1000);
	this.addProperty("event", "tick");
	this.addOutput("on_tick", LiteGraph.EVENT);
	this.time = 0;
	this.last_interval = 1000;
	this.triggered = false;
}

TimerEvent.title = "Timer";
TimerEvent.desc = "Sends an event every N milliseconds";

TimerEvent.prototype.onStart = function()
{
	this.time = 0;
}

TimerEvent.prototype.getTitle = function()
{
	return "Timer: " + this.last_interval.toString() + "ms";
}

TimerEvent.on_color = "#AAA";
TimerEvent.off_color = "#222";

TimerEvent.prototype.onDrawBackground = function()
{
	this.boxcolor = this.triggered ? TimerEvent.on_color : TimerEvent.off_color;
	this.triggered = false;
}

TimerEvent.prototype.onExecute = function()
{
	var dt = this.graph.elapsed_time * 1000; //in ms
	this.time += dt;
	this.last_interval = Math.max(1, this.getInputOrProperty("interval") | 0);

	if( this.time < this.last_interval || isNaN(this.last_interval) )
	{
		if( this.inputs && this.inputs.length > 1 && this.inputs[1] )
			this.setOutputData(1,false);
		return;
	}
	this.triggered = true;
	this.time = this.time % this.last_interval;
	this.trigger( "on_tick", this.properties.event );
	if( this.inputs && this.inputs.length > 1 && this.inputs[1] )
		this.setOutputData( 1, true );
}

TimerEvent.prototype.onGetInputs = function()
{
	return [["interval","number"]];
}

TimerEvent.prototype.onGetOutputs = function()
{
	return [["tick","boolean"]];
}

LiteGraph.registerNodeType("events/timer", TimerEvent );


})(this);
//widgets
(function(global){
var LiteGraph = global.LiteGraph;

	/* Button ****************/

	function WidgetButton()
	{
		this.addOutput( "clicked", LiteGraph.EVENT );
		this.addProperty( "text","" );
		this.addProperty( "font_size", 40 );
		this.addProperty( "message", "" );
		this.size = [64,84];
	}

	WidgetButton.title = "Button";
	WidgetButton.desc = "Triggers an event";

	WidgetButton.font = "Arial";
	WidgetButton.prototype.onDrawForeground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		//ctx.font = "40px Arial";
		//ctx.textAlign = "center";
		ctx.fillStyle = "black";
		ctx.fillRect(1,1,this.size[0] - 3, this.size[1] - 3);
		ctx.fillStyle = "#AAF";
		ctx.fillRect(0,0,this.size[0] - 3, this.size[1] - 3);
		ctx.fillStyle = this.clicked ? "white" : (this.mouseOver ? "#668" : "#334");
		ctx.fillRect(1,1,this.size[0] - 4, this.size[1] - 4);

		if( this.properties.text || this.properties.text === 0 )
		{
			var font_size = this.properties.font_size || 30;
			ctx.textAlign = "center";
			ctx.fillStyle = this.clicked ? "black" : "white";
			ctx.font = font_size + "px " + WidgetButton.font;
			ctx.fillText( this.properties.text, this.size[0] * 0.5, this.size[1] * 0.5 + font_size * 0.3 );
			ctx.textAlign = "left";
		}
	}

	WidgetButton.prototype.onMouseDown = function(e, local_pos)
	{
		if(local_pos[0] > 1 && local_pos[1] > 1 && local_pos[0] < (this.size[0] - 2) && local_pos[1] < (this.size[1] - 2) )
		{
			this.clicked = true;
			this.trigger( "clicked", this.properties.message );
			return true;
		}
	}

	WidgetButton.prototype.onMouseUp = function(e)
	{
		this.clicked = false;
	}


	LiteGraph.registerNodeType("widget/button", WidgetButton );


	function WidgetToggle()
	{
		this.addInput( "", "boolean" );
		this.addInput( "e", LiteGraph.ACTION );
		this.addOutput( "v", "boolean" );
		this.addOutput( "e", LiteGraph.EVENT );
		this.properties = { font: "", value: false };
		this.size = [124,64];
	}

	WidgetToggle.title = "Toggle";
	WidgetToggle.desc = "Toggles between true or false";

	WidgetToggle.prototype.onDrawForeground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		var size = this.size[1] * 0.5;
		var margin = 0.25;
		var h = this.size[1] * 0.8;

		ctx.fillStyle = "#AAA";
		ctx.fillRect(10, h - size,size,size);

		ctx.fillStyle = this.properties.value ? "#AEF" : "#000";
		ctx.fillRect(10+size*margin,h - size + size*margin,size*(1-margin*2),size*(1-margin*2));

		ctx.textAlign = "left";
		ctx.font = this.properties.font || ((size * 0.8).toFixed(0) + "px Arial");
		ctx.fillStyle = "#AAA";
		ctx.fillText( this.title, size + 20, h * 0.85 );
		ctx.textAlign = "left";
	}

	WidgetToggle.prototype.onAction = function(action)
	{
		this.properties.value = !this.properties.value;
		this.trigger( "e", this.properties.value );
	}

	WidgetToggle.prototype.onExecute = function()
	{
		var v = this.getInputData(0);
		if( v != null )
			this.properties.value = v;
		this.setOutputData( 0, this.properties.value );
	}

	WidgetToggle.prototype.onMouseDown = function(e, local_pos)
	{
		if(local_pos[0] > 1 && local_pos[1] > 1 && local_pos[0] < (this.size[0] - 2) && local_pos[1] < (this.size[1] - 2) )
		{
			this.properties.value = !this.properties.value;
			this.graph._version++;
			this.trigger( "e", this.properties.value );
			return true;
		}
	}

	LiteGraph.registerNodeType("widget/toggle", WidgetToggle );

	/* Number ****************/

	function WidgetNumber()
	{
		this.addOutput("",'number');
		this.size = [74,54];
		this.properties = {min:-1000,max:1000,value:1,step:1};
		this.old_y = -1;
		this._remainder = 0;
		this._precision = 0;
		this.mouse_captured = false;
	}

	WidgetNumber.title = "Number";
	WidgetNumber.desc = "Widget to select number value";

	WidgetNumber.pixels_threshold = 10;
	WidgetNumber.markers_color = "#666";

	WidgetNumber.prototype.onDrawForeground = function(ctx)
	{
		var x = this.size[0]*0.5;
		var h = this.size[1];
		if(h > 30)
		{
			ctx.fillStyle = WidgetNumber.markers_color;
			ctx.beginPath(); ctx.moveTo(x,h*0.1); ctx.lineTo(x+h*0.1,h*0.2); ctx.lineTo(x+h*-0.1,h*0.2); ctx.fill();
			ctx.beginPath(); ctx.moveTo(x,h*0.9); ctx.lineTo(x+h*0.1,h*0.8); ctx.lineTo(x+h*-0.1,h*0.8); ctx.fill();
			ctx.font = (h * 0.7).toFixed(1) + "px Arial";
		}
		else
			ctx.font = (h * 0.8).toFixed(1) + "px Arial";

		ctx.textAlign = "center";
		ctx.font = (h * 0.7).toFixed(1) + "px Arial";
		ctx.fillStyle = "#EEE";
		ctx.fillText( this.properties.value.toFixed( this._precision ), x, h * 0.75 );
	}

	WidgetNumber.prototype.onExecute = function()
	{
		this.setOutputData(0, this.properties.value );
	}

	WidgetNumber.prototype.onPropertyChanged = function(name,value)
	{
		var t = (this.properties.step + "").split(".");
		this._precision = t.length > 1 ? t[1].length : 0;
	}

	WidgetNumber.prototype.onMouseDown = function(e, pos)
	{
		if(pos[1] < 0)
			return;

		this.old_y = e.canvasY;
		this.captureInput(true);
		this.mouse_captured = true;

		return true;
	}

	WidgetNumber.prototype.onMouseMove = function(e)
	{
		if(!this.mouse_captured)
			return;

		var delta = this.old_y - e.canvasY;
		if(e.shiftKey)
			delta *= 10;
		if(e.metaKey || e.altKey)
			delta *= 0.1;
		this.old_y = e.canvasY;

		var steps = (this._remainder + delta / WidgetNumber.pixels_threshold);
		this._remainder = steps % 1;
		steps = steps|0;

		var v = Math.clamp( this.properties.value + steps * this.properties.step, this.properties.min, this.properties.max );
		this.properties.value = v;
		this.graph._version++;
		this.setDirtyCanvas(true);
	}

	WidgetNumber.prototype.onMouseUp = function(e,pos)
	{
		if(e.click_time < 200)
		{
			var steps = pos[1] > this.size[1] * 0.5 ? -1 : 1;
			this.properties.value = Math.clamp( this.properties.value + steps * this.properties.step, this.properties.min, this.properties.max );
			this.graph._version++;
			this.setDirtyCanvas(true);
		}

		if( this.mouse_captured )
		{
			this.mouse_captured = false;
			this.captureInput(false);
		}
	}

	LiteGraph.registerNodeType("widget/number", WidgetNumber );


	/* Knob ****************/

	function WidgetKnob()
	{
		this.addOutput("",'number');
		this.size = [64,84];
		this.properties = {min:0,max:1,value:0.5,wcolor:"#7AF",size:50};
	}

	WidgetKnob.title = "Knob";
	WidgetKnob.desc = "Circular controller";
	WidgetKnob.widgets = [{name:"increase",text:"+",type:"minibutton"},{name:"decrease",text:"-",type:"minibutton"}];


	WidgetKnob.prototype.onAdded = function()
	{
		this.value = (this.properties["value"] - this.properties["min"]) / (this.properties["max"] - this.properties["min"]);

		this.imgbg = this.loadImage("imgs/knob_bg.png");
		this.imgfg = this.loadImage("imgs/knob_fg.png");
	}

	WidgetKnob.prototype.onDrawImageKnob = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		var d = this.imgbg.width*0.5;
		var scale = this.size[0] / this.imgfg.width;

		ctx.save();
			ctx.translate(0,20);
			ctx.scale(scale,scale);
			ctx.drawImage(this.imgbg,0,0);
			//ctx.drawImage(this.imgfg,0,20);

			ctx.translate(d,d);
			ctx.rotate(this.value * (Math.PI*2) * 6/8 + Math.PI * 10/8);
			//ctx.rotate(this.value * (Math.PI*2));
			ctx.translate(-d,-d);
			ctx.drawImage(this.imgfg,0,0);

		ctx.restore();

		if(this.title)
		{
			ctx.font = "bold 16px Criticized,Tahoma";
			ctx.fillStyle="rgba(100,100,100,0.8)";
			ctx.textAlign = "center";
			ctx.fillText(this.title.toUpperCase(), this.size[0] * 0.5, 18 );
			ctx.textAlign = "left";
		}
	}

	WidgetKnob.prototype.onDrawVectorKnob = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//circle around
		ctx.lineWidth = 1;
		ctx.strokeStyle= this.mouseOver ? "#FFF" : "#AAA";
		ctx.fillStyle="#000";
		ctx.beginPath();
		ctx.arc(this.size[0] * 0.5,this.size[1] * 0.5 + 10,this.properties.size * 0.5,0,Math.PI*2,true);
		ctx.stroke();

		if(this.value > 0)
		{
			ctx.strokeStyle=this.properties["wcolor"];
			ctx.lineWidth = (this.properties.size * 0.2);
			ctx.beginPath();
			ctx.arc(this.size[0] * 0.5,this.size[1] * 0.5 + 10,this.properties.size * 0.35,Math.PI * -0.5 + Math.PI*2 * this.value,Math.PI * -0.5,true);
			ctx.stroke();
			ctx.lineWidth = 1;
		}

		ctx.font = (this.properties.size * 0.2) + "px Arial";
		ctx.fillStyle="#AAA";
		ctx.textAlign = "center";

		var str = this.properties["value"];
		if(typeof(str) == 'number')
			str = str.toFixed(2);

		ctx.fillText(str,this.size[0] * 0.5,this.size[1]*0.65);
		ctx.textAlign = "left";
	}

	WidgetKnob.prototype.onDrawForeground = function(ctx)
	{
		this.onDrawImageKnob(ctx);
	}

	WidgetKnob.prototype.onExecute = function()
	{
		this.setOutputData(0, this.properties["value"] );

		this.boxcolor = LiteGraph.colorToString([this.value,this.value,this.value]);
	}

	WidgetKnob.prototype.onMouseDown = function(e)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//this.center = [this.imgbg.width * 0.5, this.imgbg.height * 0.5 + 20];
		//this.radius = this.imgbg.width * 0.5;
		this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
		this.radius = this.size[0] * 0.5;

		if(e.canvasY - this.pos[1] < 20 || LiteGraph.distance([e.canvasX,e.canvasY],[this.pos[0] + this.center[0],this.pos[1] + this.center[1]]) > this.radius)
			return false;

		this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
		this.captureInput(true);

		/*
		var tmp = this.localToScreenSpace(0,0);
		this.trace(tmp[0] + "," + tmp[1]); */
		return true;
	}

	WidgetKnob.prototype.onMouseMove = function(e)
	{
		if(!this.oldmouse) return;

		var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];

		var v = this.value;
		v -= (m[1] - this.oldmouse[1]) * 0.01;
		if(v > 1.0) v = 1.0;
		else if(v < 0.0) v = 0.0;

		this.value = v;
		this.properties["value"] = this.properties["min"] + (this.properties["max"] - this.properties["min"]) * this.value;

		this.oldmouse = m;
		this.setDirtyCanvas(true);
	}

	WidgetKnob.prototype.onMouseUp = function(e)
	{
		if(this.oldmouse)
		{
			this.oldmouse = null;
			this.captureInput(false);
		}
	}

	WidgetKnob.prototype.onMouseLeave = function(e)
	{
		//this.oldmouse = null;
	}

	WidgetKnob.prototype.onPropertyChanged = function(name,value)
	{
		if(name=="wcolor")
			this.properties[name] = value;
		else if(name=="size")
		{
			value = parseInt(value);
			this.properties[name] = value;
			this.size = [value+4,value+24];
			this.setDirtyCanvas(true,true);
		}
		else if(name=="min" || name=="max" || name=="value")
		{
			this.properties[name] = parseFloat(value);
		}
		else
			return false;
		return true;
	}

	LiteGraph.registerNodeType("widget/knob", WidgetKnob);

	//Show value inside the debug console
	function WidgetSliderGUI()
	{
		this.addOutput("","number");
		this.properties = {
			value: 0.5,
			min: 0,
			max: 1,
			text: "V"
		};
		var that = this;
		this.size = [80,60];
		this.slider = this.addWidget("slider","V", this.properties.value, function(v){ that.properties.value = v; }, this.properties  );
	}

	WidgetSliderGUI.title = "Internal Slider";

	WidgetSliderGUI.prototype.onPropertyChanged = function(name,value)
	{
		if(name == "value")
			this.slider.value = value;
	}

	WidgetSliderGUI.prototype.onExecute = function()
	{
		this.setOutputData(0,this.properties.value);
	}


	LiteGraph.registerNodeType("widget/internal_slider", WidgetSliderGUI );

	//Widget H SLIDER
	function WidgetHSlider()
	{
		this.size = [160,26];
		this.addOutput("",'number');
		this.properties = {wcolor:"#7AF",min:0,max:1,value:0.5};
	}

	WidgetHSlider.title = "H.Slider";
	WidgetHSlider.desc = "Linear slider controller";

	WidgetHSlider.prototype.onAdded = function()
	{
		this.value = 0.5;
		this.imgfg = this.loadImage("imgs/slider_fg.png");
	}

	WidgetHSlider.prototype.onDrawVectorial = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//border
		ctx.lineWidth = 1;
		ctx.strokeStyle= this.mouseOver ? "#FFF" : "#AAA";
		ctx.fillStyle="#000";
		ctx.beginPath();
		ctx.rect(2,0,this.size[0]-4,20);
		ctx.stroke();

		ctx.fillStyle=this.properties["wcolor"];
		ctx.beginPath();
		ctx.rect(2+(this.size[0]-4-20)*this.value,0, 20,20);
		ctx.fill();
	}

	WidgetHSlider.prototype.onDrawImage = function(ctx)
	{
		if(!this.imgfg || !this.imgfg.width)
			return;

		//border
		ctx.lineWidth = 1;
		ctx.fillStyle="#000";
		ctx.fillRect(2,9,this.size[0]-4,2);

		ctx.strokeStyle= "#333";
		ctx.beginPath();
		ctx.moveTo(2,9);
		ctx.lineTo(this.size[0]-4,9);
		ctx.stroke();

		ctx.strokeStyle= "#AAA";
		ctx.beginPath();
		ctx.moveTo(2,11);
		ctx.lineTo(this.size[0]-4,11);
		ctx.stroke();

		ctx.drawImage(this.imgfg, 2+(this.size[0]-4)*this.value - this.imgfg.width*0.5,-this.imgfg.height*0.5 + 10);
	},

	WidgetHSlider.prototype.onDrawForeground = function(ctx)
	{
		this.onDrawImage(ctx);
	}

	WidgetHSlider.prototype.onExecute = function()
	{
		this.properties["value"] = this.properties["min"] + (this.properties["max"] - this.properties["min"]) * this.value;
		this.setOutputData(0, this.properties["value"] );
		this.boxcolor = LiteGraph.colorToString([this.value,this.value,this.value]);
	}

	WidgetHSlider.prototype.onMouseDown = function(e)
	{
		if(e.canvasY - this.pos[1] < 0)
			return false;

		this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
		this.captureInput(true);
		return true;
	}

	WidgetHSlider.prototype.onMouseMove = function(e)
	{
		if(!this.oldmouse) return;

		var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];

		var v = this.value;
		var delta = (m[0] - this.oldmouse[0]);
		v += delta / this.size[0];
		if(v > 1.0) v = 1.0;
		else if(v < 0.0) v = 0.0;

		this.value = v;

		this.oldmouse = m;
		this.setDirtyCanvas(true);
	}

	WidgetHSlider.prototype.onMouseUp = function(e)
	{
		this.oldmouse = null;
		this.captureInput(false);
	}

	WidgetHSlider.prototype.onMouseLeave = function(e)
	{
		//this.oldmouse = null;
	}

	WidgetHSlider.prototype.onPropertyChanged = function(name,value)
	{
		if(name=="wcolor")
			this.properties[name] = value;
		else
			return false;
		return true;
	}

	LiteGraph.registerNodeType("widget/hslider", WidgetHSlider );


	function WidgetProgress()
	{
		this.size = [160,26];
		this.addInput("",'number');
		this.properties = {min:0,max:1,value:0,wcolor:"#AAF"};
	}

	WidgetProgress.title = "Progress";
	WidgetProgress.desc = "Shows data in linear progress";

	WidgetProgress.prototype.onExecute = function()
	{
		var v = this.getInputData(0);
		if( v != undefined )
			this.properties["value"] = v;
	}

	WidgetProgress.prototype.onDrawForeground = function(ctx)
	{
		//border
		ctx.lineWidth = 1;
		ctx.fillStyle=this.properties.wcolor;
		var v = (this.properties.value - this.properties.min) / (this.properties.max - this.properties.min);
		v = Math.min(1,v);
		v = Math.max(0,v);
		ctx.fillRect(2,2,(this.size[0]-4)*v,this.size[1]-4);
	}

	LiteGraph.registerNodeType("widget/progress", WidgetProgress);


	function WidgetText()
	{
		this.addInputs("",0);
		this.properties = { value:"...",font:"Arial", fontsize:18, color:"#AAA", align:"left", glowSize:0, decimals:1 };
	}

	WidgetText.title = "Text";
	WidgetText.desc = "Shows the input value";
	WidgetText.widgets = [{name:"resize",text:"Resize box",type:"button"},{name:"led_text",text:"LED",type:"minibutton"},{name:"normal_text",text:"Normal",type:"minibutton"}];

	WidgetText.prototype.onDrawForeground = function(ctx)
	{
		//ctx.fillStyle="#000";
		//ctx.fillRect(0,0,100,60);
		ctx.fillStyle = this.properties["color"];
		var v = this.properties["value"];

		if(this.properties["glowSize"])
		{
			ctx.shadowColor = this.properties["color"];
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["glowSize"];
		}
		else
			ctx.shadowColor = "transparent";

		var fontsize = this.properties["fontsize"];

		ctx.textAlign = this.properties["align"];
		ctx.font = fontsize.toString() + "px " + this.properties["font"];
		this.str = typeof(v) == 'number' ? v.toFixed(this.properties["decimals"]) : v;

		if( typeof(this.str) == 'string')
		{
			var lines = this.str.split("\\n");
			for(var i in lines)
				ctx.fillText(lines[i],this.properties["align"] == "left" ? 15 : this.size[0] - 15, fontsize * -0.15 + fontsize * (parseInt(i)+1) );
		}

		ctx.shadowColor = "transparent";
		this.last_ctx = ctx;
		ctx.textAlign = "left";
	}

	WidgetText.prototype.onExecute = function()
	{
		var v = this.getInputData(0);
		if(v != null)
			this.properties["value"] = v;
		//this.setDirtyCanvas(true);
	}

	WidgetText.prototype.resize = function()
	{
		if(!this.last_ctx) return;

		var lines = this.str.split("\\n");
		this.last_ctx.font = this.properties["fontsize"] + "px " + this.properties["font"];
		var max = 0;
		for(var i in lines)
		{
			var w = this.last_ctx.measureText(lines[i]).width;
			if(max < w) max = w;
		}
		this.size[0] = max + 20;
		this.size[1] = 4 + lines.length * this.properties["fontsize"];

		this.setDirtyCanvas(true);
	}

	WidgetText.prototype.onPropertyChanged = function(name,value)
	{
		this.properties[name] = value;
		this.str = typeof(value) == 'number' ? value.toFixed(3) : value;
		//this.resize();
		return true;
	}

	LiteGraph.registerNodeType("widget/text", WidgetText );


	function WidgetPanel()
	{
		this.size = [200,100];
		this.properties = {borderColor:"#ffffff",bgcolorTop:"#f0f0f0",bgcolorBottom:"#e0e0e0",shadowSize:2, borderRadius:3};
	}

	WidgetPanel.title =  "Panel";
	WidgetPanel.desc = "Non interactive panel";
	WidgetPanel.widgets = [{name:"update",text:"Update",type:"button"}];


	WidgetPanel.prototype.createGradient = function(ctx)
	{
		if(this.properties["bgcolorTop"] == "" || this.properties["bgcolorBottom"] == "")
		{
			this.lineargradient = 0;
			return;
		}

		this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);
		this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);
		this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
	}

	WidgetPanel.prototype.onDrawForeground = function(ctx)
	{
		if(this.lineargradient == null)
			this.createGradient(ctx);

		if(!this.lineargradient)
			return;

		ctx.lineWidth = 1;
		ctx.strokeStyle = this.properties["borderColor"];
		//ctx.fillStyle = "#ebebeb";
		ctx.fillStyle = this.lineargradient;

		if(this.properties["shadowSize"])
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];
		}
		else
			ctx.shadowColor = "transparent";

		ctx.roundRect(0,0,this.size[0]-1,this.size[1]-1,this.properties["shadowSize"]);
		ctx.fill();
		ctx.shadowColor = "transparent";
		ctx.stroke();
	}

	LiteGraph.registerNodeType("widget/panel", WidgetPanel );

})(this);
(function(global){
var LiteGraph = global.LiteGraph;

function GamepadInput()
{
	this.addOutput("left_x_axis","number");
	this.addOutput("left_y_axis","number");
	this.addOutput( "button_pressed", LiteGraph.EVENT );
	this.properties = { gamepad_index: 0, threshold: 0.1 };

	this._left_axis = new Float32Array(2);
	this._right_axis = new Float32Array(2);
	this._triggers = new Float32Array(2);
	this._previous_buttons = new Uint8Array(17);
	this._current_buttons = new Uint8Array(17);
}

GamepadInput.title = "Gamepad";
GamepadInput.desc = "gets the input of the gamepad";

GamepadInput.zero = new Float32Array(2);
GamepadInput.buttons = ["a","b","x","y","lb","rb","lt","rt","back","start","ls","rs","home"];

GamepadInput.prototype.onExecute = function()
{
	//get gamepad
	var gamepad = this.getGamepad();
	var threshold = this.properties.threshold || 0.0;

	if(gamepad)
	{
		this._left_axis[0] = Math.abs( gamepad.xbox.axes["lx"] ) > threshold ? gamepad.xbox.axes["lx"] : 0;
		this._left_axis[1] = Math.abs( gamepad.xbox.axes["ly"] ) > threshold ? gamepad.xbox.axes["ly"] : 0;
		this._right_axis[0] = Math.abs( gamepad.xbox.axes["rx"] ) > threshold ? gamepad.xbox.axes["rx"] : 0;
		this._right_axis[1] = Math.abs( gamepad.xbox.axes["ry"] ) > threshold ? gamepad.xbox.axes["ry"] : 0;
		this._triggers[0] = Math.abs( gamepad.xbox.axes["ltrigger"] ) > threshold ? gamepad.xbox.axes["ltrigger"] : 0;
		this._triggers[1] = Math.abs( gamepad.xbox.axes["rtrigger"] ) > threshold ? gamepad.xbox.axes["rtrigger"] : 0;
	}

	if(this.outputs)
	{
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output.links || !output.links.length)
				continue;
			var v = null;

			if(gamepad)
			{
				switch( output.name )
				{
					case "left_axis": v = this._left_axis; break;
					case "right_axis": v = this._right_axis; break;
					case "left_x_axis": v = this._left_axis[0]; break;
					case "left_y_axis": v = this._left_axis[1]; break;
					case "right_x_axis": v = this._right_axis[0]; break;
					case "right_y_axis": v = this._right_axis[1]; break;
					case "trigger_left": v = this._triggers[0]; break;
					case "trigger_right": v = this._triggers[1]; break;
					case "a_button": v = gamepad.xbox.buttons["a"] ? 1 : 0; break;
					case "b_button": v = gamepad.xbox.buttons["b"] ? 1 : 0; break;
					case "x_button": v = gamepad.xbox.buttons["x"] ? 1 : 0; break;
					case "y_button": v = gamepad.xbox.buttons["y"] ? 1 : 0; break;
					case "lb_button": v = gamepad.xbox.buttons["lb"] ? 1 : 0; break;
					case "rb_button": v = gamepad.xbox.buttons["rb"] ? 1 : 0; break;
					case "ls_button": v = gamepad.xbox.buttons["ls"] ? 1 : 0; break;
					case "rs_button": v = gamepad.xbox.buttons["rs"] ? 1 : 0; break;
					case "start_button": v = gamepad.xbox.buttons["start"] ? 1 : 0; break;
					case "back_button": v = gamepad.xbox.buttons["back"] ? 1 : 0; break;
					case "button_pressed": 
						for(var j = 0; j < this._current_buttons.length; ++j)
						{
							if( this._current_buttons[j] && !this._previous_buttons[j] )
								this.triggerSlot( i, GamepadInput.buttons[j] );
						}
						break;
					default: break;
				}
			}
			else
			{
				//if no gamepad is connected, output 0
				switch( output.name )
				{
					case "button_pressed": break;
					case "left_axis":
					case "right_axis":
						v = GamepadInput.zero;
						break;
					default:
						v = 0;
				}
			}
			this.setOutputData(i,v);
		}
	}
}

GamepadInput.prototype.getGamepad = function()
{
	var getGamepads = navigator.getGamepads || navigator.webkitGetGamepads || navigator.mozGetGamepads; 
	if(!getGamepads)
		return null;
	var gamepads = getGamepads.call(navigator);
	var gamepad = null;

	this._previous_buttons.set( this._current_buttons );

	//pick the first connected
	for(var i = this.properties.gamepad_index; i < 4; i++)
	{
		if (gamepads[i])
		{
			gamepad = gamepads[i];

			//xbox controller mapping
			var xbox = this.xbox_mapping;
			if(!xbox)
				xbox = this.xbox_mapping = { axes:[], buttons:{}, hat: ""};

			xbox.axes["lx"] = gamepad.axes[0];
			xbox.axes["ly"] = gamepad.axes[1];
			xbox.axes["rx"] = gamepad.axes[2];
			xbox.axes["ry"] = gamepad.axes[3];
			xbox.axes["ltrigger"] = gamepad.buttons[6].value;
			xbox.axes["rtrigger"] = gamepad.buttons[7].value;

			for(var j = 0; j < gamepad.buttons.length; j++)
			{
				this._current_buttons[j] = gamepad.buttons[j].pressed;

				//mapping of XBOX
				switch(j) //I use a switch to ensure that a player with another gamepad could play
				{
					case 0: xbox.buttons["a"] = gamepad.buttons[j].pressed; break;
					case 1: xbox.buttons["b"] = gamepad.buttons[j].pressed; break;
					case 2: xbox.buttons["x"] = gamepad.buttons[j].pressed; break;
					case 3: xbox.buttons["y"] = gamepad.buttons[j].pressed; break;
					case 4: xbox.buttons["lb"] = gamepad.buttons[j].pressed; break;
					case 5: xbox.buttons["rb"] = gamepad.buttons[j].pressed; break;
					case 6: xbox.buttons["lt"] = gamepad.buttons[j].pressed; break;
					case 7: xbox.buttons["rt"] = gamepad.buttons[j].pressed; break;
					case 8: xbox.buttons["back"] = gamepad.buttons[j].pressed; break;
					case 9: xbox.buttons["start"] = gamepad.buttons[j].pressed; break;
					case 10: xbox.buttons["ls"] = gamepad.buttons[j].pressed; break;
					case 11: xbox.buttons["rs"] = gamepad.buttons[j].pressed; break;
					case 12: if( gamepad.buttons[j].pressed) xbox.hat += "up"; break;
					case 13: if( gamepad.buttons[j].pressed) xbox.hat += "down"; break;
					case 14: if( gamepad.buttons[j].pressed) xbox.hat += "left"; break;
					case 15: if( gamepad.buttons[j].pressed) xbox.hat += "right"; break;
					case 16: xbox.buttons["home"] = gamepad.buttons[j].pressed; break;
					default:
				}
			}
			gamepad.xbox = xbox;
			return gamepad;
		}	
	}
}

GamepadInput.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed)
		return;

	//render gamepad state?
	var la = this._left_axis;
	var ra = this._right_axis;
	ctx.strokeStyle = "#88A";
	ctx.strokeRect( (la[0] + 1) * 0.5 * this.size[0] - 4, (la[1] + 1) * 0.5 * this.size[1] - 4, 8, 8 );
	ctx.strokeStyle = "#8A8";
	ctx.strokeRect( (ra[0] + 1) * 0.5 * this.size[0] - 4, (ra[1] + 1) * 0.5 * this.size[1] - 4, 8, 8 );
	var h = this.size[1] / this._current_buttons.length
	ctx.fillStyle = "#AEB";
	for(var i = 0; i < this._current_buttons.length; ++i)
		if(this._current_buttons[i])
			ctx.fillRect( 0, h * i, 6, h);
}

GamepadInput.prototype.onGetOutputs = function() {
	return [
		["left_axis","vec2"],
		["right_axis","vec2"],
		["left_x_axis","number"],
		["left_y_axis","number"],
		["right_x_axis","number"],
		["right_y_axis","number"],
		["trigger_left","number"],
		["trigger_right","number"],
		["a_button","number"],
		["b_button","number"],
		["x_button","number"],
		["y_button","number"],
		["lb_button","number"],
		["rb_button","number"],
		["ls_button","number"],
		["rs_button","number"],
		["start","number"],
		["back","number"],
		["button_pressed", LiteGraph.EVENT]
	];
}

LiteGraph.registerNodeType("input/gamepad", GamepadInput );

})(this);
(function(global){
var LiteGraph = global.LiteGraph;

//Converter
function Converter()
{
	this.addInput("in","*");
	this.size = [60,20];
}

Converter.title = "Converter";
Converter.desc = "type A to type B";

Converter.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		return;

	if(this.outputs)
		for(var i = 0; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output.links || !output.links.length)
				continue;

			var result = null;
			switch( output.name )
			{
				case "number": result = v.length ? v[0] : parseFloat(v); break;
				case "vec2": 
				case "vec3": 
				case "vec4": 
					var result = null;
					var count = 1;
					switch(output.name)
					{
						case "vec2": count = 2; break;
						case "vec3": count = 3; break;
						case "vec4": count = 4; break;
					}

					var result = new Float32Array( count );
					if( v.length )
					{
						for(var j = 0; j < v.length && j < result.length; j++)
							result[j] = v[j];
					}
					else
						result[0] = parseFloat(v);
					break;
			}
			this.setOutputData(i, result);
		}
}

Converter.prototype.onGetOutputs = function() {
	return [["number","number"],["vec2","vec2"],["vec3","vec3"],["vec4","vec4"]];
}

LiteGraph.registerNodeType("math/converter", Converter );


//Bypass
function Bypass()
{
	this.addInput("in");
	this.addOutput("out");
	this.size = [60,20];
}

Bypass.title = "Bypass";
Bypass.desc = "removes the type";

Bypass.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	this.setOutputData(0, v);
}

LiteGraph.registerNodeType("math/bypass", Bypass );



function MathRange()
{
	this.addInput("in","number",{locked:true});
	this.addOutput("out","number",{locked:true});

	this.addProperty( "in", 0 );
	this.addProperty( "in_min", 0 );
	this.addProperty( "in_max", 1 );
	this.addProperty( "out_min", 0 );
	this.addProperty( "out_max", 1 );

	this.size = [80,20];
}

MathRange.title = "Range";
MathRange.desc = "Convert a number from one range to another";

MathRange.prototype.getTitle = function()
{
	if(this.flags.collapsed)
		return (this._last_v || 0).toFixed(2);
	return this.title;
}

MathRange.prototype.onExecute = function()
{
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[ input.name ] = v;
		}

	var v = this.properties["in"];
	if(v === undefined || v === null || v.constructor !== Number)
		v = 0;

	var in_min = this.properties.in_min;
	var in_max = this.properties.in_max;
	var out_min = this.properties.out_min;
	var out_max = this.properties.out_max;

	this._last_v = ((v - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
	this.setOutputData(0, this._last_v );
}

MathRange.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this._last_v)
		this.outputs[0].label = this._last_v.toFixed(3);
	else
		this.outputs[0].label = "?";
}

MathRange.prototype.onGetInputs = function() {
	return [["in_min","number"],["in_max","number"],["out_min","number"],["out_max","number"]];
}

LiteGraph.registerNodeType("math/range", MathRange);



function MathRand()
{
	this.addOutput("value","number");
	this.addProperty( "min", 0 );
	this.addProperty( "max", 1 );
	this.size = [60,20];
}

MathRand.title = "Rand";
MathRand.desc = "Random number";

MathRand.prototype.onExecute = function()
{
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[input.name] = v;
		}

	var min = this.properties.min;
	var max = this.properties.max;
	this._last_v = Math.random() * (max-min) + min;
	this.setOutputData(0, this._last_v );
}

MathRand.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this._last_v)
		this.outputs[0].label = this._last_v.toFixed(3);
	else
		this.outputs[0].label = "?";
}

MathRand.prototype.onGetInputs = function() {
	return [["min","number"],["max","number"]];
}

LiteGraph.registerNodeType("math/rand", MathRand);

//Math clamp
function MathClamp()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.addProperty( "min", 0 );
	this.addProperty( "max", 1 );
}

MathClamp.title = "Clamp";
MathClamp.desc = "Clamp number between min and max";
MathClamp.filter = "shader";

MathClamp.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	v = Math.max(this.properties.min,v);
	v = Math.min(this.properties.max,v);
	this.setOutputData(0, v );
}

MathClamp.prototype.getCode = function(lang)
{
	var code = "";
	if(this.isInputConnected(0))
		code += "clamp({{0}}," + this.properties.min + "," + this.properties.max + ")";
	return code;
}

LiteGraph.registerNodeType("math/clamp", MathClamp );



//Math ABS
function MathLerp()
{
	this.properties = { f: 0.5 };
	this.addInput("A","number");
	this.addInput("B","number");

	this.addOutput("out","number");
}

MathLerp.title = "Lerp";
MathLerp.desc = "Linear Interpolation";

MathLerp.prototype.onExecute = function()
{
	var v1 = this.getInputData(0);
	if(v1 == null)
		v1 = 0;
	var v2 = this.getInputData(1);
	if(v2 == null)
		v2 = 0;

	var f = this.properties.f;

	var _f = this.getInputData(2);
	if(_f !== undefined)
		f = _f;

	this.setOutputData(0, v1 * (1-f) + v2 * f );
}

MathLerp.prototype.onGetInputs = function()
{
	return [["f","number"]];
}

LiteGraph.registerNodeType("math/lerp", MathLerp);



//Math ABS
function MathAbs()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathAbs.title = "Abs";
MathAbs.desc = "Absolute";

MathAbs.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	this.setOutputData(0, Math.abs(v) );
}

LiteGraph.registerNodeType("math/abs", MathAbs);


//Math Floor
function MathFloor()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathFloor.title = "Floor";
MathFloor.desc = "Floor number to remove fractional part";

MathFloor.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;
	this.setOutputData(0, Math.floor(v) );
}

LiteGraph.registerNodeType("math/floor", MathFloor );


//Math frac
function MathFrac()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
}

MathFrac.title = "Frac";
MathFrac.desc = "Returns fractional part";

MathFrac.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) 
		return;
	this.setOutputData(0, v%1 );
}

LiteGraph.registerNodeType("math/frac",MathFrac);


//Math Floor
function MathSmoothStep()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.properties = { A: 0, B: 1 };
}

MathSmoothStep.title = "Smoothstep";
MathSmoothStep.desc = "Smoothstep";

MathSmoothStep.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v === undefined)
		return;

	var edge0 = this.properties.A;
	var edge1 = this.properties.B;

    // Scale, bias and saturate x to 0..1 range
    v = Math.clamp((v - edge0)/(edge1 - edge0), 0.0, 1.0); 
    // Evaluate polynomial
    v = v*v*(3 - 2*v);

	this.setOutputData(0, v );
}

LiteGraph.registerNodeType("math/smoothstep", MathSmoothStep );

//Math scale
function MathScale()
{
	this.addInput("in","number",{label:""});
	this.addOutput("out","number",{label:""});
	this.size = [60,20];
	this.addProperty( "factor", 1 );
}

MathScale.title = "Scale";
MathScale.desc = "v * factor";

MathScale.prototype.onExecute = function()
{
	var value = this.getInputData(0);
	if(value != null)
		this.setOutputData(0, value * this.properties.factor );
}

LiteGraph.registerNodeType("math/scale", MathScale );


//Math Average
function MathAverageFilter()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.addProperty( "samples", 10 );
	this._values = new Float32Array(10);
	this._current = 0;
}

MathAverageFilter.title = "Average";
MathAverageFilter.desc = "Average Filter";

MathAverageFilter.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		v = 0;

	var num_samples = this._values.length;

	this._values[ this._current % num_samples ] = v;
	this._current += 1;
	if(this._current > num_samples)
		this._current = 0;

	var avr = 0;
	for(var i = 0; i < num_samples; ++i)
		avr += this._values[i];

	this.setOutputData( 0, avr / num_samples );
}

MathAverageFilter.prototype.onPropertyChanged = function( name, value )
{
	if(value < 1)
		value = 1;
	this.properties.samples = Math.round(value);
	var old = this._values;

	this._values = new Float32Array( this.properties.samples );
	if(old.length <= this._values.length )
		this._values.set(old);
	else
		this._values.set( old.subarray( 0, this._values.length ) );
}

LiteGraph.registerNodeType("math/average", MathAverageFilter );


//Math 
function MathTendTo()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.addProperty( "factor", 0.1 );
	this.size = [60,20];
	this._value = null;
}

MathTendTo.title = "TendTo";
MathTendTo.desc = "moves the output value always closer to the input";

MathTendTo.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		v = 0;
	var f = this.properties.factor;
	if(this._value == null)
		this._value = v;
	else
		this._value = this._value * (1 - f) + v * f;
	this.setOutputData( 0, this._value );
}

LiteGraph.registerNodeType("math/tendTo", MathTendTo );


//Math operation
function MathOperation()
{
	this.addInput("A","number");
	this.addInput("B","number");
	this.addOutput("=","number");
	this.addProperty( "A", 1 );
	this.addProperty( "B", 1 );
	this.addProperty( "OP", "+", "enum", { values: MathOperation.values } );
}

MathOperation.values = ["+","-","*","/","%","^"];

MathOperation.title = "Operation";
MathOperation.desc = "Easy math operators";
MathOperation["@OP"] = { type:"enum", title: "operation", values: MathOperation.values };

MathOperation.prototype.getTitle = function()
{
	return "A " + this.properties.OP + " B";
}

MathOperation.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
}

MathOperation.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	var B = this.getInputData(1);
	if(A!=null)
		this.properties["A"] = A;
	else
		A = this.properties["A"];

	if(B!=null)
		this.properties["B"] = B;
	else
		B = this.properties["B"];

	var result = 0;
	switch(this.properties.OP)
	{
		case '+': result = A+B; break;
		case '-': result = A-B; break;
		case 'x': 
		case 'X': 
		case '*': result = A*B; break;
		case '/': result = A/B; break;
		case '%': result = A%B; break;
		case '^': result = Math.pow(A,B); break;
		default:
			console.warn("Unknown operation: " + this.properties.OP);
	}
	this.setOutputData(0, result );
}

MathOperation.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed)
		return;

	ctx.font = "40px Arial";
	ctx.fillStyle = "#CCC";
	ctx.textAlign = "center";
	ctx.fillText(this.properties.OP, this.size[0] * 0.5, this.size[1] * 0.35 + LiteGraph.NODE_TITLE_HEIGHT );
	ctx.textAlign = "left";
}

LiteGraph.registerNodeType("math/operation", MathOperation );
 

//Math compare
function MathCompare()
{
	this.addInput( "A","number" );
	this.addInput( "B","number" );
	this.addOutput("A==B","boolean");
	this.addOutput("A!=B","boolean");
	this.addProperty( "A", 0 );
	this.addProperty( "B", 0 );
}

MathCompare.title = "Compare";
MathCompare.desc = "compares between two values";

MathCompare.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	var B = this.getInputData(1);
	if(A !== undefined)
		this.properties["A"] = A;
	else
		A = this.properties["A"];

	if(B !== undefined)
		this.properties["B"] = B;
	else
		B = this.properties["B"];

	for(var i = 0, l = this.outputs.length; i < l; ++i)
	{
		var output = this.outputs[i];
		if(!output.links || !output.links.length)
			continue;
		switch( output.name )
		{
			case "A==B": value = A==B; break;
			case "A!=B": value = A!=B; break;
			case "A>B": value = A>B; break;
			case "A<B": value = A<B; break;
			case "A<=B": value = A<=B; break;
			case "A>=B": value = A>=B; break;
		}
		this.setOutputData(i, value );
	}
};

MathCompare.prototype.onGetOutputs = function()
{
	return [["A==B","boolean"],["A!=B","boolean"],["A>B","boolean"],["A<B","boolean"],["A>=B","boolean"],["A<=B","boolean"]];
}

LiteGraph.registerNodeType("math/compare",MathCompare);

function MathCondition()
{
	this.addInput("A","number");
	this.addInput("B","number");
	this.addOutput("out","boolean");
	this.addProperty( "A", 1 );
	this.addProperty( "B", 1 );
	this.addProperty( "OP", ">", "string", { values: MathCondition.values } );

	this.size = [60,40];
}

MathCondition.values = [">","<","==","!=","<=",">="];
MathCondition["@OP"] = { type:"enum", title: "operation", values: MathCondition.values };

MathCondition.title = "Condition";
MathCondition.desc = "evaluates condition between A and B";

MathCondition.prototype.onExecute = function()
{
	var A = this.getInputData(0);
	if(A === undefined)
		A = this.properties.A;
	else
		this.properties.A = A;

	var B = this.getInputData(1);
	if(B === undefined)
		B = this.properties.B;
	else
		this.properties.B = B;
		
	var result = true;
	switch(this.properties.OP)
	{
		case ">": result = A>B; break;
		case "<": result = A<B; break;
		case "==": result = A==B; break;
		case "!=": result = A!=B; break;
		case "<=": result = A<=B; break;
		case ">=": result = A>=B; break;
	}

	this.setOutputData(0, result );
}

LiteGraph.registerNodeType("math/condition", MathCondition);


function MathAccumulate()
{
	this.addInput("inc","number");
	this.addOutput("total","number");
	this.addProperty( "increment", 1 );
	this.addProperty( "value", 0 );
}

MathAccumulate.title = "Accumulate";
MathAccumulate.desc = "Increments a value every time";

MathAccumulate.prototype.onExecute = function()
{
	if(this.properties.value === null)
		this.properties.value = 0;

	var inc = this.getInputData(0);
	if(inc !== null)
		this.properties.value += inc;
	else
		this.properties.value += this.properties.increment;
	this.setOutputData(0, this.properties.value );
}

LiteGraph.registerNodeType("math/accumulate", MathAccumulate);

//Math Trigonometry
function MathTrigonometry()
{
	this.addInput("v","number");
	this.addOutput("sin","number");

	this.addProperty( "amplitude", 1 );
	this.addProperty( "offset", 0 );
	this.bgImageUrl = "nodes/imgs/icon-sin.png";
}

MathTrigonometry.title = "Trigonometry";
MathTrigonometry.desc = "Sin Cos Tan";
MathTrigonometry.filter = "shader";

MathTrigonometry.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null)
		v = 0;
	var amplitude = this.properties["amplitude"];
	var slot = this.findInputSlot("amplitude");
	if(slot != -1)
		amplitude = this.getInputData(slot);
	var offset = this.properties["offset"];
	slot = this.findInputSlot("offset");
	if(slot != -1)
		offset = this.getInputData(slot);

	for(var i = 0, l = this.outputs.length; i < l; ++i)
	{
		var output = this.outputs[i];
		switch( output.name )
		{
			case "sin": value = Math.sin(v); break;
			case "cos": value = Math.cos(v); break;
			case "tan": value = Math.tan(v); break;
			case "asin": value = Math.asin(v); break;
			case "acos": value = Math.acos(v); break;
			case "atan": value = Math.atan(v); break;
		}
		this.setOutputData(i, amplitude * value + offset);
	}
}

MathTrigonometry.prototype.onGetInputs = function()
{
	return [["v","number"],["amplitude","number"],["offset","number"]];
}


MathTrigonometry.prototype.onGetOutputs = function()
{
	return [["sin","number"],["cos","number"],["tan","number"],["asin","number"],["acos","number"],["atan","number"]];
}


LiteGraph.registerNodeType("math/trigonometry", MathTrigonometry );



//math library for safe math operations without eval
if(typeof(math) != undefined)
{
	function MathFormula()
	{
		this.addInputs("x","number");
		this.addInputs("y","number");
		this.addOutputs("","number");
		this.properties = {x:1.0, y:1.0, formula:"x+y"};
	}

	MathFormula.title = "Formula";
	MathFormula.desc = "Compute safe formula";
		
	MathFormula.prototype.onExecute = function()
	{
		var x = this.getInputData(0);
		var y = this.getInputData(1);
		if(x != null)
			this.properties["x"] = x;
		else
			x = this.properties["x"];

		if(y!=null)
			this.properties["y"] = y;
		else
			y = this.properties["y"];

		var f = this.properties["formula"];
		var value = math.eval(f,{x:x,y:y,T: this.graph.globaltime });
		this.setOutputData(0, value );
	}

	MathFormula.prototype.onDrawBackground = function()
	{
		var f = this.properties["formula"];
		this.outputs[0].label = f;
	}

	MathFormula.prototype.onGetOutputs = function()
	{
		return [["A-B","number"],["A*B","number"],["A/B","number"]];
	}

	LiteGraph.registerNodeType("math/formula", MathFormula );
}


function Math3DVec2ToXYZ()
{
	this.addInput("vec2","vec2");
	this.addOutput("x","number");
	this.addOutput("y","number");
}

Math3DVec2ToXYZ.title = "Vec2->XY";
Math3DVec2ToXYZ.desc = "vector 2 to components";

Math3DVec2ToXYZ.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
}

LiteGraph.registerNodeType("math3d/vec2-to-xyz", Math3DVec2ToXYZ );


function Math3DXYToVec2()
{
	this.addInputs([["x","number"],["y","number"]]);
	this.addOutput("vec2","vec2");
	this.properties = {x:0, y:0};
	this._data = new Float32Array(2);
}

Math3DXYToVec2.title = "XY->Vec2";
Math3DXYToVec2.desc = "components to vector2";

Math3DXYToVec2.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;

	var data = this._data;
	data[0] = x;
	data[1] = y;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xy-to-vec2", Math3DXYToVec2 );




function Math3DVec3ToXYZ()
{
	this.addInput("vec3","vec3");
	this.addOutput("x","number");
	this.addOutput("y","number");
	this.addOutput("z","number");
}

Math3DVec3ToXYZ.title = "Vec3->XYZ";
Math3DVec3ToXYZ.desc = "vector 3 to components";

Math3DVec3ToXYZ.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
	this.setOutputData( 2, v[2] );
}

LiteGraph.registerNodeType("math3d/vec3-to-xyz", Math3DVec3ToXYZ );


function Math3DXYZToVec3()
{
	this.addInputs([["x","number"],["y","number"],["z","number"]]);
	this.addOutput("vec3","vec3");
	this.properties = {x:0, y:0, z:0};
	this._data = new Float32Array(3);
}

Math3DXYZToVec3.title = "XYZ->Vec3";
Math3DXYZToVec3.desc = "components to vector3";

Math3DXYZToVec3.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;
	var z = this.getInputData(2);
	if(z == null) z = this.properties.z;

	var data = this._data;
	data[0] = x;
	data[1] = y;
	data[2] = z;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3 );



function Math3DVec4ToXYZW()
{
	this.addInput("vec4","vec4");
	this.addOutput("x","number");
	this.addOutput("y","number");
	this.addOutput("z","number");
	this.addOutput("w","number");
}

Math3DVec4ToXYZW.title = "Vec4->XYZW";
Math3DVec4ToXYZW.desc = "vector 4 to components";

Math3DVec4ToXYZW.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if(v == null) return;

	this.setOutputData( 0, v[0] );
	this.setOutputData( 1, v[1] );
	this.setOutputData( 2, v[2] );
	this.setOutputData( 3, v[3] );
}

LiteGraph.registerNodeType("math3d/vec4-to-xyzw", Math3DVec4ToXYZW );


function Math3DXYZWToVec4()
{
	this.addInputs([["x","number"],["y","number"],["z","number"],["w","number"]]);
	this.addOutput("vec4","vec4");
	this.properties = {x:0, y:0, z:0, w:0};
	this._data = new Float32Array(4);
}

Math3DXYZWToVec4.title = "XYZW->Vec4";
Math3DXYZWToVec4.desc = "components to vector4";

Math3DXYZWToVec4.prototype.onExecute = function()
{
	var x = this.getInputData(0);
	if(x == null) x = this.properties.x;
	var y = this.getInputData(1);
	if(y == null) y = this.properties.y;
	var z = this.getInputData(2);
	if(z == null) z = this.properties.z;
	var w = this.getInputData(3);
	if(w == null) w = this.properties.w;

	var data = this._data;
	data[0] = x;
	data[1] = y;
	data[2] = z;
	data[3] = w;

	this.setOutputData( 0, data );
}

LiteGraph.registerNodeType("math3d/xyzw-to-vec4", Math3DXYZWToVec4 );




//if glMatrix is installed...
if(global.glMatrix) 
{

	function Math3DQuaternion()
	{
		this.addOutput("quat","quat");
		this.properties = { x:0, y:0, z:0, w: 1 };
		this._value = quat.create();
	}

	Math3DQuaternion.title = "Quaternion";
	Math3DQuaternion.desc = "quaternion";

	Math3DQuaternion.prototype.onExecute = function()
	{
		this._value[0] = this.properties.x;
		this._value[1] = this.properties.y;
		this._value[2] = this.properties.z;
		this._value[3] = this.properties.w;
		this.setOutputData( 0, this._value );
	}

	LiteGraph.registerNodeType("math3d/quaternion", Math3DQuaternion );


	function Math3DRotation()
	{
		this.addInputs([["degrees","number"],["axis","vec3"]]);
		this.addOutput("quat","quat");
		this.properties = { angle:90.0, axis: vec3.fromValues(0,1,0) };

		this._value = quat.create();
	}

	Math3DRotation.title = "Rotation";
	Math3DRotation.desc = "quaternion rotation";

	Math3DRotation.prototype.onExecute = function()
	{
		var angle = this.getInputData(0);
		if(angle == null) angle = this.properties.angle;
		var axis = this.getInputData(1);
		if(axis == null) axis = this.properties.axis;

		var R = quat.setAxisAngle( this._value, axis, angle * 0.0174532925 );
		this.setOutputData( 0, R );
	}


	LiteGraph.registerNodeType("math3d/rotation", Math3DRotation );
	

	//Math3D rotate vec3
	function Math3DRotateVec3()
	{
		this.addInputs([["vec3","vec3"],["quat","quat"]]);
		this.addOutput("result","vec3");
		this.properties = { vec: [0,0,1] };
	}

	Math3DRotateVec3.title = "Rot. Vec3";
	Math3DRotateVec3.desc = "rotate a point";

	Math3DRotateVec3.prototype.onExecute = function()
	{
		var vec = this.getInputData(0);
		if(vec == null) vec = this.properties.vec;
		var quat = this.getInputData(1);
		if(quat == null)
			this.setOutputData(vec);
		else
			this.setOutputData( 0, vec3.transformQuat( vec3.create(), vec, quat ) );
	}

	LiteGraph.registerNodeType("math3d/rotate_vec3", Math3DRotateVec3);



	function Math3DMultQuat()
	{
		this.addInputs( [["A","quat"],["B","quat"]] );
		this.addOutput( "A*B","quat" );

		this._value = quat.create();
	}

	Math3DMultQuat.title = "Mult. Quat";
	Math3DMultQuat.desc = "rotate quaternion";

	Math3DMultQuat.prototype.onExecute = function()
	{
		var A = this.getInputData(0);
		if(A == null) return;
		var B = this.getInputData(1);
		if(B == null) return;

		var R = quat.multiply( this._value, A, B );
		this.setOutputData( 0, R );
	}

	LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat );


	function Math3DQuatSlerp()
	{
		this.addInputs( [["A","quat"],["B","quat"],["factor","number"]] );
		this.addOutput( "slerp","quat" );
		this.addProperty( "factor", 0.5 );

		this._value = quat.create();
	}

	Math3DQuatSlerp.title = "Quat Slerp";
	Math3DQuatSlerp.desc = "quaternion spherical interpolation";

	Math3DQuatSlerp.prototype.onExecute = function()
	{
		var A = this.getInputData(0);
		if(A == null)
			return;
		var B = this.getInputData(1);
		if(B == null)
			return;
		var factor = this.properties.factor;
		if( this.getInputData(2) != null )
			factor = this.getInputData(2);

		var R = quat.slerp( this._value, A, B, factor );
		this.setOutputData( 0, R );
	}

	LiteGraph.registerNodeType("math3d/quat-slerp", Math3DQuatSlerp );

} //glMatrix

})(this);
(function(global){
var LiteGraph = global.LiteGraph;

function Selector()
{
	this.addInput("sel","boolean");
	this.addOutput("value","number");
	this.properties = { A:0, B:1 };
	this.size = [60,20];
}

Selector.title = "Selector";
Selector.desc = "outputs A if selector is true, B if selector is false";

Selector.prototype.onExecute = function()
{
	var cond = this.getInputData(0);
	if(cond === undefined)
		return;

	for(var i = 1; i < this.inputs.length; i++)
	{
		var input = this.inputs[i];
		var v = this.getInputData(i);
		if(v === undefined)
			continue;
		this.properties[input.name] = v;
	}

	var A = this.properties.A;
	var B = this.properties.B;
	this.setOutputData(0, cond ? A : B );
}

Selector.prototype.onGetInputs = function() {
	return [["A",0],["B",0]];
}

LiteGraph.registerNodeType("logic/selector", Selector);

})(this);
(function(global){
var LiteGraph = global.LiteGraph;

function GraphicsPlot()
{
	this.addInput("A","Number");
	this.addInput("B","Number");
	this.addInput("C","Number");
	this.addInput("D","Number");

	this.values = [[],[],[],[]];
	this.properties = { scale: 2 };
}

GraphicsPlot.title = "Plot";
GraphicsPlot.desc = "Plots data over time";
GraphicsPlot.colors = ["#FFF","#F99","#9F9","#99F"];

GraphicsPlot.prototype.onExecute = function(ctx)
{
	if(this.flags.collapsed)
		return;

	var size = this.size;

	for(var i = 0; i < 4; ++i)
	{
		var v = this.getInputData(i);
		if(v == null)
			continue;
		var values = this.values[i];
		values.push(v);
		if(values.length > size[0])
			values.shift();
	}
}

GraphicsPlot.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed)
		return;

	var size = this.size;

	var scale = 0.5 * size[1] / this.properties.scale;
	var colors = GraphicsPlot.colors;
	var offset = size[1] * 0.5;

	ctx.fillStyle = "#000";
	ctx.fillRect(0,0, size[0],size[1]);
	ctx.strokeStyle = "#555";
	ctx.beginPath();
	ctx.moveTo(0, offset);
	ctx.lineTo(size[0], offset);
	ctx.stroke();

	for(var i = 0; i < 4; ++i)
	{
		var values = this.values[i];
		ctx.strokeStyle = colors[i];
		ctx.beginPath();
		var v = values[0] * scale * -1 + offset;
		ctx.moveTo(0, Math.clamp( v, 0, size[1]) );
		for(var j = 1; j < values.length && j < size[0]; ++j)
		{
			var v = values[j] * scale * -1 + offset;
			ctx.lineTo( j, Math.clamp( v, 0, size[1]) );
		}
		ctx.stroke();
	}
}

LiteGraph.registerNodeType("graphics/plot", GraphicsPlot);


function GraphicsImage()
{
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

	if(url.substr(0,4) == "http" && LiteGraph.proxy)
		url = LiteGraph.proxy + url.substr( url.indexOf(":") + 3 );

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
	this.addOutput("","image");
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
	this.properties = { url:"", use_proxy: true };
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

	if(this.properties.use_proxy && url.substr(0,4) == "http" && LiteGraph.proxy )
		url = LiteGraph.proxy + url.substr( url.indexOf(":") + 3 );

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
	if (!navigator.getUserMedia) {
	  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
	  return;
	}

	this._waiting_confirmation = true;

	// Not showing vendor prefixes.
	navigator.mediaDevices.getUserMedia({audio: false, video: true}).then( this.streamReady.bind(this) ).catch( onFailSoHard );

	var that = this;
	function onFailSoHard(e) {
		console.log('Webcam rejected', e);
		that._webcam_stream = false;
		that.boxcolor = "red";
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
		video.srcObject = localMediaStream;
		this._video = video;
		//document.body.appendChild( video ); //debug
		//when video info is loaded (size and so)
		video.onloadedmetadata = function(e) {
			// Ready to go. Do some stuff.
			console.log(e);
		};
	}
}

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


})(this);

(function(global){
var LiteGraph = global.LiteGraph;

//Works with Litegl.js to create WebGL nodes
global.LGraphTexture = null;

if(typeof(GL) != "undefined")
{
	function LGraphTexture()
	{
		this.addOutput("Texture","Texture");
		this.properties = { name:"", filter: true };
		this.size = [LGraphTexture.image_preview_size, LGraphTexture.image_preview_size];
	}

	global.LGraphTexture = LGraphTexture;

	LGraphTexture.title = "Texture";
	LGraphTexture.desc = "Texture";
	LGraphTexture.widgets_info = {"name": { widget:"texture"}, "filter": { widget:"checkbox"} };

	//REPLACE THIS TO INTEGRATE WITH YOUR FRAMEWORK
	LGraphTexture.loadTextureCallback = null; //function in charge of loading textures when not present in the container
	LGraphTexture.image_preview_size = 256;

	//flags to choose output texture type
	LGraphTexture.PASS_THROUGH = 1; //do not apply FX
	LGraphTexture.COPY = 2;			//create new texture with the same properties as the origin texture
	LGraphTexture.LOW = 3;			//create new texture with low precision (byte)
	LGraphTexture.HIGH = 4;			//create new texture with high precision (half-float)
	LGraphTexture.REUSE = 5;		//reuse input texture
	LGraphTexture.DEFAULT = 2;

	LGraphTexture.MODE_VALUES = {
		"pass through": LGraphTexture.PASS_THROUGH,
		"copy": LGraphTexture.COPY,
		"low": LGraphTexture.LOW,
		"high": LGraphTexture.HIGH,
		"reuse": LGraphTexture.REUSE,
		"default": LGraphTexture.DEFAULT
	};

	//returns the container where all the loaded textures are stored (overwrite if you have a Resources Manager)
	LGraphTexture.getTexturesContainer = function()
	{
		return gl.textures;
	}

	//process the loading of a texture (overwrite it if you have a Resources Manager)
	LGraphTexture.loadTexture = function(name, options)
	{
		options = options || {};
		var url = name;
		if(url.substr(0,7) == "http://")
		{
			if(LiteGraph.proxy) //proxy external files
				url = LiteGraph.proxy + url.substr(7);
		}

		var container = LGraphTexture.getTexturesContainer();
		var tex = container[ name ] = GL.Texture.fromURL(url, options);
		return tex;
	}

	LGraphTexture.getTexture = function(name)
	{
		var container = this.getTexturesContainer();

		if(!container)
			throw("Cannot load texture, container of textures not found");

		var tex = container[ name ];
		if(!tex && name && name[0] != ":")
			return this.loadTexture(name);

		return tex;
	}

	//used to compute the appropiate output texture
	LGraphTexture.getTargetTexture = function( origin, target, mode )
	{
		if(!origin)
			throw("LGraphTexture.getTargetTexture expects a reference texture");

		var tex_type = null;

		switch(mode)
		{
			case LGraphTexture.LOW: tex_type = gl.UNSIGNED_BYTE; break;
			case LGraphTexture.HIGH: tex_type = gl.HIGH_PRECISION_FORMAT; break;
			case LGraphTexture.REUSE: return origin; break;
			case LGraphTexture.COPY: 
			default: tex_type = origin ? origin.type : gl.UNSIGNED_BYTE; break;
		}

		if(!target || target.width != origin.width || target.height != origin.height || target.type != tex_type )
			target = new GL.Texture( origin.width, origin.height, { type: tex_type, format: gl.RGBA, filter: gl.LINEAR });

		return target;
	}


	LGraphTexture.getTextureType = function( precision, ref_texture )
	{
		var type = ref_texture ? ref_texture.type : gl.UNSIGNED_BYTE;
		switch( precision )
		{
			case LGraphTexture.HIGH: type = gl.HIGH_PRECISION_FORMAT; break;
			case LGraphTexture.LOW:  type = gl.UNSIGNED_BYTE; break;
			//no default
		}
		return type;
	}

	LGraphTexture.getNoiseTexture = function()
	{
		if(this._noise_texture)
			return this._noise_texture;

		var noise = new Uint8Array(512*512*4);
		for(var i = 0; i < 512*512*4; ++i)
			noise[i] = Math.random() * 255;

		var texture = GL.Texture.fromMemory(512,512,noise,{ format: gl.RGBA, wrap: gl.REPEAT, filter: gl.NEAREST });
		this._noise_texture = texture;
		return texture;
	}

	LGraphTexture.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._drop_texture = null;
			this.properties.name = "";
		}
		else
		{
			var texture = null;
			if( typeof(data) == "string" )
				texture = GL.Texture.fromURL( data );
			else if( filename.toLowerCase().indexOf(".dds") != -1 )
				texture = GL.Texture.fromDDSInMemory(data);
			else
			{
				var blob = new Blob([file]);
				var url = URL.createObjectURL(blob);
				texture = GL.Texture.fromURL( url );
			}

			this._drop_texture = texture;
			this.properties.name = filename;
		}
	}

	LGraphTexture.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		if(!this._drop_texture)
			return;
		return [ {content:"Clear", callback: 
			function() { 
				that._drop_texture = null;
				that.properties.name = "";
			}
		}];
	}

	LGraphTexture.prototype.onExecute = function()
	{
		var tex = null;
		if(this.isOutputConnected(1))
			tex = this.getInputData(0);		

		if(!tex && this._drop_texture)
			tex = this._drop_texture;

		if(!tex && this.properties.name)
			tex = LGraphTexture.getTexture( this.properties.name );

		if(!tex) 
			return;

		this._last_tex = tex;

		if(this.properties.filter === false)
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		else 
			tex.setParameter( gl.TEXTURE_MAG_FILTER, gl.LINEAR );

		this.setOutputData(0, tex);

		for(var i = 1; i < this.outputs.length; i++)
		{
			var output = this.outputs[i];
			if(!output)
				continue;
			var v = null;
			if(output.name == "width")
				v = tex.width;
			else if(output.name == "height")
				v = tex.height;
			else if(output.name == "aspect")
				v = tex.width / tex.height;
			this.setOutputData(i, v);
		}
	}

	LGraphTexture.prototype.onResourceRenamed = function(old_name,new_name)
	{
		if(this.properties.name == old_name)
			this.properties.name = new_name;
	}

	LGraphTexture.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20 )
			return;

		if( this._drop_texture && ctx.webgl )
		{
			ctx.drawImage( this._drop_texture, 0,0,this.size[0],this.size[1]);
			//this._drop_texture.renderQuad(this.pos[0],this.pos[1],this.size[0],this.size[1]);
			return;
		}


		//Different texture? then get it from the GPU
		if(this._last_preview_tex != this._last_tex)
		{
			if(ctx.webgl)
			{
				this._canvas = this._last_tex;
			}
			else
			{
				var tex_canvas = LGraphTexture.generateLowResTexturePreview(this._last_tex);
				if(!tex_canvas) 
					return;

				this._last_preview_tex = this._last_tex;
				this._canvas = cloneCanvas(tex_canvas);
			}
		}

		if(!this._canvas)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(this._canvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}


	//very slow, used at your own risk
	LGraphTexture.generateLowResTexturePreview = function(tex)
	{
		if(!tex)
			return null;

		var size = LGraphTexture.image_preview_size;
		var temp_tex = tex;

		if(tex.format == gl.DEPTH_COMPONENT)
			return null; //cannot generate from depth

		//Generate low-level version in the GPU to speed up
		if(tex.width > size || tex.height > size)
		{
			temp_tex = this._preview_temp_tex;
			if(!this._preview_temp_tex)
			{
				temp_tex = new GL.Texture(size,size, { minFilter: gl.NEAREST });
				this._preview_temp_tex = temp_tex;
			}

			//copy
			tex.copyTo(temp_tex);
			tex = temp_tex;
		}

		//create intermediate canvas with lowquality version
		var tex_canvas = this._preview_canvas;
		if(!tex_canvas)
		{
			tex_canvas = createCanvas(size,size);
			this._preview_canvas = tex_canvas;
		}

		if(temp_tex)
			temp_tex.toCanvas(tex_canvas);
		return tex_canvas;
	}

	LGraphTexture.prototype.getResources = function(res)
	{
		res[ this.properties.name ] = GL.Texture;
		return res;
	}

	LGraphTexture.prototype.onGetInputs = function()
	{
		return [["in","Texture"]];
	}


	LGraphTexture.prototype.onGetOutputs = function()
	{
		return [["width","number"],["height","number"],["aspect","number"]];
	}

	LiteGraph.registerNodeType("texture/texture", LGraphTexture );

	//**************************
	function LGraphTexturePreview()
	{
		this.addInput("Texture","Texture");
		this.properties = { flipY: false };
		this.size = [LGraphTexture.image_preview_size, LGraphTexture.image_preview_size];
	}

	LGraphTexturePreview.title = "Preview";
	LGraphTexturePreview.desc = "Show a texture in the graph canvas";
	LGraphTexturePreview.allow_preview = false;

	LGraphTexturePreview.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed)
			return;

		if(!ctx.webgl && !LGraphTexturePreview.allow_preview)
			return; //not working well

		var tex = this.getInputData(0);
		if(!tex)
			return;

		var tex_canvas = null;
		
		if(!tex.handle && ctx.webgl)
			tex_canvas = tex;
		else
			tex_canvas = LGraphTexture.generateLowResTexturePreview(tex);

		//render to graph canvas
		ctx.save();
		if(this.properties.flipY)
		{
			ctx.translate(0,this.size[1]);
			ctx.scale(1,-1);
		}
		ctx.drawImage(tex_canvas,0,0,this.size[0],this.size[1]);
		ctx.restore();
	}

	LiteGraph.registerNodeType("texture/preview", LGraphTexturePreview );

	//**************************************

	function LGraphTextureSave()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = {name:""};
	}

	LGraphTextureSave.title = "Save";
	LGraphTextureSave.desc = "Save a texture in the repository";

	LGraphTextureSave.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(this.properties.name)
		{
			//for cases where we want to perform something when storing it
			if( LGraphTexture.storeTexture )
				LGraphTexture.storeTexture( this.properties.name, tex );
			else
			{
				var container = LGraphTexture.getTexturesContainer();
				container[ this.properties.name ] = tex;
			}
		}

		this.setOutputData(0, tex);
	}

	LiteGraph.registerNodeType("texture/save", LGraphTextureSave );

	//****************************************************

	function LGraphTextureOperation()
	{
		this.addInput("Texture","Texture");
		this.addInput("TextureB","Texture");
		this.addInput("value","number");
		this.addOutput("Texture","Texture");
		this.help = "<p>pixelcode must be vec3</p>\
			<p>uvcode must be vec2, is optional</p>\
			<p><strong>uv:</strong> tex. coords</p><p><strong>color:</strong> texture</p><p><strong>colorB:</strong> textureB</p><p><strong>time:</strong> scene time</p><p><strong>value:</strong> input value</p>";

		this.properties = {value:1, uvcode:"", pixelcode:"color + colorB * value", precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureOperation.widgets_info = {
		"uvcode": { widget:"textarea", height: 100 }, 
		"pixelcode": { widget:"textarea", height: 100 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureOperation.title = "Operation";
	LGraphTextureOperation.desc = "Texture shader operation";

	LGraphTextureOperation.prototype.getExtraMenuOptions = function(graphcanvas)
	{
		var that = this;
		var txt = !that.properties.show ? "Show Texture" : "Hide Texture";
		return [ {content: txt, callback: 
			function() { 
				that.properties.show = !that.properties.show;
			}
		}];
	}

	LGraphTextureOperation.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20 || !this.properties.show)
			return;

		if(!this._tex)
			return;

		//only works if using a webgl renderer
		if(this._tex.gl != ctx)
			return;

		//render to graph canvas
		ctx.save();
		ctx.drawImage(this._tex, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	}

	LGraphTextureOperation.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		if(!this.properties.uvcode && !this.properties.pixelcode)
			return;

		var width = 512;
		var height = 512;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
		}

		var type = LGraphTexture.getTextureType( this.properties.precision, tex );

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		var uvcode = "";
		if(this.properties.uvcode)
		{
			uvcode = "uv = " + this.properties.uvcode;
			if(this.properties.uvcode.indexOf(";") != -1) //there are line breaks, means multiline code
				uvcode = this.properties.uvcode;
		}
		
		var pixelcode = "";
		if(this.properties.pixelcode)
		{
			pixelcode = "result = " + this.properties.pixelcode;
			if(this.properties.pixelcode.indexOf(";") != -1) //there are line breaks, means multiline code
				pixelcode = this.properties.pixelcode;
		}

		var shader = this._shader;

		if(!shader || this._shader_code != (uvcode + "|" + pixelcode) )
		{
			try
			{
				this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureOperation.pixel_shader, { UV_CODE: uvcode, PIXEL_CODE: pixelcode });
				this.boxcolor = "#00FF00";
			}
			catch (err)
			{
				console.log("Error compiling shader: ", err);
				this.boxcolor = "#FF0000";
				return;
			}
			this.boxcolor = "#FF0000";

			this._shader_code = (uvcode + "|" + pixelcode);
			shader = this._shader;
		}

		if(!shader)
		{
			this.boxcolor = "red";
			return;
		}
		else
			this.boxcolor = "green";

		var value = this.getInputData(2);
		if(value != null)
			this.properties.value = value;
		else
			value = parseFloat( this.properties.value );

		var time = this.graph.getTime();

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({u_texture:0, u_textureB:1, value: value, texSize:[width,height], time: time}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureOperation.pixel_shader = "precision highp float;\n\
			\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			varying vec2 v_coord;\n\
			uniform vec2 texSize;\n\
			uniform float time;\n\
			uniform float value;\n\
			\n\
			void main() {\n\
				vec2 uv = v_coord;\n\
				UV_CODE;\n\
				vec4 color4 = texture2D(u_texture, uv);\n\
				vec3 color = color4.rgb;\n\
				vec4 color4B = texture2D(u_textureB, uv);\n\
				vec3 colorB = color4B.rgb;\n\
				vec3 result = color;\n\
				float alpha = 1.0;\n\
				PIXEL_CODE;\n\
				gl_FragColor = vec4(result, alpha);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/operation", LGraphTextureOperation );

	//****************************************************

	function LGraphTextureShader()
	{
		this.addOutput("out","Texture");
		this.properties = {code:"", width: 512, height: 512, precision: LGraphTexture.DEFAULT };

		this.properties.code = "\nvoid main() {\n  vec2 uv = v_coord;\n  vec3 color = vec3(0.0);\n//your code here\n\ngl_FragColor = vec4(color, 1.0);\n}\n";
		this._uniforms = { in_texture:0, texSize: vec2.create(), time: 0 };
	}

	LGraphTextureShader.title = "Shader";
	LGraphTextureShader.desc = "Texture shader";
	LGraphTextureShader.widgets_info = {
		"code": { type:"code" },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureShader.prototype.onPropertyChanged = function(name, value)
	{
		if(name != "code")
			return;

		var shader = this.getShader();
		if(!shader)
			return;

		//update connections
		var uniforms = shader.uniformInfo;

		//remove deprecated slots
		if(this.inputs)
		{
			var already = {};
			for(var i = 0; i < this.inputs.length; ++i)
			{
				var info = this.getInputInfo(i);
				if(!info)
					continue;

				if( uniforms[ info.name ] && !already[ info.name ] )
				{
					already[ info.name ] = true;
					continue;
				}
				this.removeInput(i);
				i--;
			}
		}

		//update existing ones
		for(var i in uniforms)
		{
			var info = shader.uniformInfo[i];
			if(info.loc === null)
				continue; //is an attribute, not a uniform
			if(i == "time") //default one
				continue;

			var type = "number";
			if( this._shader.samplers[i] )
				type = "texture";
			else
			{
				switch(info.size)
				{
					case 1: type = "number"; break;
					case 2: type = "vec2"; break;
					case 3: type = "vec3"; break;
					case 4: type = "vec4"; break;
					case 9: type = "mat3"; break;
					case 16: type = "mat4"; break;
					default: continue;
				}
			}

			var slot = this.findInputSlot(i);
			if(slot == -1)
			{
				this.addInput(i,type);
				continue;
			}

			var input_info = this.getInputInfo(slot);
			if(!input_info)
				this.addInput(i,type);
			else
			{
				if(input_info.type == type)
					continue;
				this.removeInput(slot,type);
				this.addInput(i,type);
			}
		}
	}

	LGraphTextureShader.prototype.getShader = function()
	{
		//replug 
		if(this._shader && this._shader_code == this.properties.code)
			return this._shader;

		this._shader_code = this.properties.code;
		this._shader = new GL.Shader(Shader.SCREEN_VERTEX_SHADER, LGraphTextureShader.pixel_shader + this.properties.code );
		if(!this._shader) {
			this.boxcolor = "red";
			return null;
		}
		else
			this.boxcolor = "green";
		return this._shader;
	}

	LGraphTextureShader.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var shader = this.getShader();
		if(!shader)
			return;

		var tex_slot = 0;
		var in_tex = null;

		//set uniforms
		for(var i = 0; i < this.inputs.length; ++i)
		{
			var info = this.getInputInfo(i);
			var data = this.getInputData(i);
			if(data == null)
				continue;

			if(data.constructor === GL.Texture)
			{
				data.bind(tex_slot);
				if(!in_tex)
					in_tex = data;
				data = tex_slot;
				tex_slot++;
			}
			shader.setUniform( info.name, data ); //data is tex_slot
		}

		var uniforms = this._uniforms;
		var type = LGraphTexture.getTextureType( this.properties.precision, in_tex );

		//render to texture
		var w = this.properties.width|0;
		var h = this.properties.height|0;
		if(w == 0)
			w = in_tex ? in_tex.width : gl.canvas.width;
		if(h == 0)
			h = in_tex ? in_tex.height : gl.canvas.height;
		uniforms.texSize[0] = w;
		uniforms.texSize[1] = h;
		uniforms.time = this.graph.getTime();

		if(!this._tex || this._tex.type != type || this._tex.width != w || this._tex.height != h )
			this._tex = new GL.Texture( w, h, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		var tex = this._tex;
		tex.drawTo(function() {
			shader.uniforms( uniforms ).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureShader.pixel_shader = "precision highp float;\n\
			\n\
			varying vec2 v_coord;\n\
			uniform float time;\n\
	";

	LiteGraph.registerNodeType("texture/shader", LGraphTextureShader );

	// Texture Scale Offset

	function LGraphTextureScaleOffset()
	{
		this.addInput("in","Texture");
		this.addInput("scale","vec2");
		this.addInput("offset","vec2");
		this.addOutput("out","Texture");
		this.properties = { offset: vec2.fromValues(0,0), scale: vec2.fromValues(1,1), precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureScaleOffset.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureScaleOffset.title = "Scale/Offset";
	LGraphTextureScaleOffset.desc = "Applies an scaling and offseting";

	LGraphTextureScaleOffset.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0) || !tex)
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;
		var type = this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT;
		if (this.precision === LGraphTexture.DEFAULT)
			type = tex.type;

		if(!this._tex || this._tex.width != width || this._tex.height != height || this._tex.type != type )
			this._tex = new GL.Texture( width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureScaleOffset.pixel_shader );

		var scale = this.getInputData(1);
		if(scale)
		{
			this.properties.scale[0] = scale[0];
			this.properties.scale[1] = scale[1];
		}
		else
			scale = this.properties.scale;

		var offset = this.getInputData(2);
		if(offset)
		{
			this.properties.offset[0] = offset[0];
			this.properties.offset[1] = offset[1];
		}
		else
			offset = this.properties.offset;

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			tex.bind(0);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({u_texture:0, u_scale: scale, u_offset: offset}).draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureScaleOffset.pixel_shader = "precision highp float;\n\
			\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			varying vec2 v_coord;\n\
			uniform vec2 u_scale;\n\
			uniform vec2 u_offset;\n\
			\n\
			void main() {\n\
				vec2 uv = v_coord;\n\
				uv = uv / u_scale - u_offset;\n\
				gl_FragColor = texture2D(u_texture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/scaleOffset", LGraphTextureScaleOffset );



	// Warp (distort a texture) *************************

	function LGraphTextureWarp()
	{
		this.addInput("in","Texture");
		this.addInput("warp","Texture");
		this.addInput("factor","number");
		this.addOutput("out","Texture");
		this.properties = { factor: 0.01, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureWarp.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureWarp.title = "Warp";
	LGraphTextureWarp.desc = "Texture warp operation";

	LGraphTextureWarp.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH)
		{
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if(tex)
		{
			width = tex.width;
			height = tex.height;
			type = tex.type;
		}
		else if (texB)
		{
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if(!tex && !this._tex )
			this._tex = new GL.Texture( width, height, { type: this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT, format: gl.RGBA, filter: gl.LINEAR });
		else
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );

		var shader = this._shader;

		if(!shader)
			shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureWarp.pixel_shader );

		var factor = this.getInputData(2);
		if(factor != null)
			this.properties.factor = factor;
		else
			factor = parseFloat( this.properties.factor );

		this._tex.drawTo(function() {
			gl.disable( gl.DEPTH_TEST );
			gl.disable( gl.CULL_FACE );
			gl.disable( gl.BLEND );
			if(tex)	tex.bind(0);
			if(texB) texB.bind(1);
			var mesh = Mesh.getScreenQuad();
			shader.uniforms({u_texture:0, u_textureB:1, u_factor: factor }).draw( mesh );
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureWarp.pixel_shader = "precision highp float;\n\
			\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			varying vec2 v_coord;\n\
			uniform float u_factor;\n\
			\n\
			void main() {\n\
				vec2 uv = v_coord;\n\
				uv += ( texture2D(u_textureB, uv).rg - vec2(0.5)) * u_factor;\n\
				gl_FragColor = texture2D(u_texture, uv);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/warp", LGraphTextureWarp );

	//****************************************************

	// Texture to Viewport *****************************************
	function LGraphTextureToViewport()
	{
		this.addInput("Texture","Texture");
		this.properties = { additive: false, antialiasing: false, filter: true, disable_alpha: false, gamma: 1.0 };
		this.size[0] = 130;
	}

	LGraphTextureToViewport.title = "to Viewport";
	LGraphTextureToViewport.desc = "Texture to viewport";

	LGraphTextureToViewport.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex) 
			return;

		if(this.properties.disable_alpha)
			gl.disable( gl.BLEND );
		else
		{
			gl.enable( gl.BLEND );
			if(this.properties.additive)
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE );
			else
				gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
		}

		gl.disable( gl.DEPTH_TEST );
		var gamma = this.properties.gamma || 1.0;
		if( this.isInputConnected(1) )
			gamma = this.getInputData(1);

		tex.setParameter( gl.TEXTURE_MAG_FILTER, this.properties.filter ? gl.LINEAR : gl.NEAREST );

		if(this.properties.antialiasing)
		{
			if(!LGraphTextureToViewport._shader)
				LGraphTextureToViewport._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.aa_pixel_shader );

			var viewport = gl.getViewport(); //gl.getParameter(gl.VIEWPORT);
			var mesh = Mesh.getScreenQuad();
			tex.bind(0);
			LGraphTextureToViewport._shader.uniforms({u_texture:0, uViewportSize:[tex.width,tex.height], u_igamma: 1 / gamma,  inverseVP: [1/tex.width,1/tex.height] }).draw(mesh);
		}
		else
		{
			if(gamma != 1.0)
			{
				if(!LGraphTextureToViewport._gamma_shader)
					LGraphTextureToViewport._gamma_shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureToViewport.gamma_pixel_shader );
				tex.toViewport(LGraphTextureToViewport._gamma_shader, { u_texture:0, u_igamma: 1 / gamma });
			}
			else
				tex.toViewport();
		}
	}

	LGraphTextureToViewport.prototype.onGetInputs = function()
	{
		return [["gamma","number"]];
	}

	LGraphTextureToViewport.aa_pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 uViewportSize;\n\
			uniform vec2 inverseVP;\n\
			uniform float u_igamma;\n\
			#define FXAA_REDUCE_MIN   (1.0/ 128.0)\n\
			#define FXAA_REDUCE_MUL   (1.0 / 8.0)\n\
			#define FXAA_SPAN_MAX     8.0\n\
			\n\
			/* from mitsuhiko/webgl-meincraft based on the code on geeks3d.com */\n\
			vec4 applyFXAA(sampler2D tex, vec2 fragCoord)\n\
			{\n\
				vec4 color = vec4(0.0);\n\
				/*vec2 inverseVP = vec2(1.0 / uViewportSize.x, 1.0 / uViewportSize.y);*/\n\
				vec3 rgbNW = texture2D(tex, (fragCoord + vec2(-1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbNE = texture2D(tex, (fragCoord + vec2(1.0, -1.0)) * inverseVP).xyz;\n\
				vec3 rgbSW = texture2D(tex, (fragCoord + vec2(-1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbSE = texture2D(tex, (fragCoord + vec2(1.0, 1.0)) * inverseVP).xyz;\n\
				vec3 rgbM  = texture2D(tex, fragCoord  * inverseVP).xyz;\n\
				vec3 luma = vec3(0.299, 0.587, 0.114);\n\
				float lumaNW = dot(rgbNW, luma);\n\
				float lumaNE = dot(rgbNE, luma);\n\
				float lumaSW = dot(rgbSW, luma);\n\
				float lumaSE = dot(rgbSE, luma);\n\
				float lumaM  = dot(rgbM,  luma);\n\
				float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));\n\
				float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));\n\
				\n\
				vec2 dir;\n\
				dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));\n\
				dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));\n\
				\n\
				float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);\n\
				\n\
				float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);\n\
				dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX), dir * rcpDirMin)) * inverseVP;\n\
				\n\
				vec3 rgbA = 0.5 * (texture2D(tex, fragCoord * inverseVP + dir * (1.0 / 3.0 - 0.5)).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * (2.0 / 3.0 - 0.5)).xyz);\n\
				vec3 rgbB = rgbA * 0.5 + 0.25 * (texture2D(tex, fragCoord * inverseVP + dir * -0.5).xyz + \n\
					texture2D(tex, fragCoord * inverseVP + dir * 0.5).xyz);\n\
				\n\
				//return vec4(rgbA,1.0);\n\
				float lumaB = dot(rgbB, luma);\n\
				if ((lumaB < lumaMin) || (lumaB > lumaMax))\n\
					color = vec4(rgbA, 1.0);\n\
				else\n\
					color = vec4(rgbB, 1.0);\n\
				if(u_igamma != 1.0)\n\
					color.xyz = pow( color.xyz, vec3(u_igamma) );\n\
				return color;\n\
			}\n\
			\n\
			void main() {\n\
			   gl_FragColor = applyFXAA( u_texture, v_coord * uViewportSize) ;\n\
			}\n\
			";

	LGraphTextureToViewport.gamma_pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_igamma;\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, v_coord);\n\
				color.xyz = pow(color.xyz, vec3(u_igamma) );\n\
			   gl_FragColor = color;\n\
			}\n\
			";


	LiteGraph.registerNodeType("texture/toviewport", LGraphTextureToViewport );


	// Texture Copy *****************************************
	function LGraphTextureCopy()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { size: 0, generate_mipmaps: false, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureCopy.title = "Copy";
	LGraphTextureCopy.desc = "Copy Texture";
	LGraphTextureCopy.widgets_info = { 
		size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]},
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureCopy.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex && !this._temp_texture)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		//copy the texture
		if(tex)
		{
			var width = tex.width;
			var height = tex.height;

			if(this.properties.size != 0)
			{
				width = this.properties.size;
				height = this.properties.size;
			}

			var temp = this._temp_texture;

			var type = tex.type;
			if(this.properties.precision === LGraphTexture.LOW)
				type = gl.UNSIGNED_BYTE;
			else if(this.properties.precision === LGraphTexture.HIGH)
				type = gl.HIGH_PRECISION_FORMAT;

			if(!temp || temp.width != width || temp.height != height || temp.type != type )
			{
				var minFilter = gl.LINEAR;
				if( this.properties.generate_mipmaps && isPowerOfTwo(width) && isPowerOfTwo(height) )
					minFilter = gl.LINEAR_MIPMAP_LINEAR;
				this._temp_texture = new GL.Texture( width, height, { type: type, format: gl.RGBA, minFilter: minFilter, magFilter: gl.LINEAR });
			}
			tex.copyTo(this._temp_texture);

			if(this.properties.generate_mipmaps)
			{
				this._temp_texture.bind(0);
				gl.generateMipmap(this._temp_texture.texture_type);
				this._temp_texture.unbind(0);
			}
		}


		this.setOutputData(0,this._temp_texture);
	}

	LiteGraph.registerNodeType("texture/copy", LGraphTextureCopy );


	// Texture Downsample *****************************************
	function LGraphTextureDownsample()
	{
		this.addInput("Texture","Texture");
		this.addOutput("","Texture");
		this.properties = { iterations: 1, generate_mipmaps: false, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureDownsample.title = "Downsample";
	LGraphTextureDownsample.desc = "Downsample Texture";
	LGraphTextureDownsample.widgets_info = { 
		iterations: { type:"number", step: 1, precision: 0, min: 1 },
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureDownsample.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex && !this._temp_texture)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		//we do not allow any texture different than texture 2D
		if(!tex || tex.texture_type !== GL.TEXTURE_2D )
			return;

		var shader = LGraphTextureDownsample._shader;
		if(!shader)
			LGraphTextureDownsample._shader = shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureDownsample.pixel_shader );

		var width = tex.width|0;
		var height = tex.height|0;
		var type = tex.type;
		if(this.properties.precision === LGraphTexture.LOW)
			type = gl.UNSIGNED_BYTE;
		else if(this.properties.precision === LGraphTexture.HIGH)
			type = gl.HIGH_PRECISION_FORMAT;
		var iterations = this.properties.iterations || 1;

		var origin = tex;
		var target = null;

		var temp = [];
		var options = {
			type: type,
			format: tex.format
		};

		var offset = vec2.create();
		var uniforms = {
			u_offset: offset
		};

		if( this._texture )
			GL.Texture.releaseTemporary( this._texture );

		for(var i = 0; i < iterations; ++i)
		{
			offset[0] = 1/width;
			offset[1] = 1/height;
			width = width>>1 || 0;
			height = height>>1 || 0;
			target = GL.Texture.getTemporary( width, height, options );
			temp.push( target );
			origin.setParameter( GL.TEXTURE_MAG_FILTER, GL.NEAREST );
			origin.copyTo( target, shader, uniforms );
			if(width == 1 && height == 1)
				break; //nothing else to do
			origin = target;
		}

		//keep the last texture used
		this._texture = temp.pop();

		//free the rest
		for(var i = 0; i < temp.length; ++i)
			GL.Texture.releaseTemporary( temp[i] );

		if(this.properties.generate_mipmaps)
		{
			this._texture.bind(0);
			gl.generateMipmap(this._texture.texture_type);
			this._texture.unbind(0);
		}

		this.setOutputData(0,this._texture);
	}

	LGraphTextureDownsample.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_offset;\n\
			varying vec2 v_coord;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord );\n\
				color += texture2D(u_texture, v_coord + vec2( u_offset.x, 0.0 ) );\n\
				color += texture2D(u_texture, v_coord + vec2( 0.0, u_offset.y ) );\n\
				color += texture2D(u_texture, v_coord + vec2( u_offset.x, u_offset.y ) );\n\
			   gl_FragColor = color * 0.25;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/downsample", LGraphTextureDownsample );



	// Texture Copy *****************************************
	function LGraphTextureAverage()
	{
		this.addInput("Texture","Texture");
		this.addOutput("tex","Texture");
		this.addOutput("avg","vec4");
		this.addOutput("lum","number");
		this.properties = { mipmap_offset: 0, low_precision: false };

		this._uniforms = { u_texture: 0, u_mipmap_offset: this.properties.mipmap_offset };
		this._luminance = new Float32Array(4);
	}

	LGraphTextureAverage.title = "Average";
	LGraphTextureAverage.desc = "Compute a partial average (32 random samples) of a texture and stores it as a 1x1 pixel texture";

	LGraphTextureAverage.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0) && !this.isOutputConnected(1) && !this.isOutputConnected(2))
			return; //saves work

		if(!LGraphTextureAverage._shader)
		{
			LGraphTextureAverage._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureAverage.pixel_shader);
			//creates 32 random numbers and stores the, in two mat4 
			var samples = new Float32Array(32);
			for(var i = 0; i < 32; ++i)	
				samples[i] = Math.random();
			LGraphTextureAverage._shader.uniforms({u_samples_a: samples.subarray(0,16), u_samples_b: samples.subarray(16,32) });
		}

		var temp = this._temp_texture;
		var type = gl.UNSIGNED_BYTE;
		if(tex.type != type) //force floats, half floats cannot be read with gl.readPixels
			type = gl.FLOAT;

		if(!temp || temp.type != type )
			this._temp_texture = new GL.Texture( 1, 1, { type: type, format: gl.RGBA, filter: gl.NEAREST });

		var shader = LGraphTextureAverage._shader;
		var uniforms = this._uniforms;
		uniforms.u_mipmap_offset = this.properties.mipmap_offset;
		this._temp_texture.drawTo(function(){
			tex.toViewport( shader, uniforms );
		});

		this.setOutputData(0,this._temp_texture);

		if(this.isOutputConnected(1) || this.isOutputConnected(2))
		{
			var pixel = this._temp_texture.getPixels();
			if(pixel)
			{
				var v = this._luminance;
				var type = this._temp_texture.type;
				v.set( pixel );
				if(type == gl.UNSIGNED_BYTE)
					vec4.scale( v,v, 1/255 );
				else if(type == GL.HALF_FLOAT || type == GL.HALF_FLOAT_OES)
					vec4.scale( v,v, 1/(255*255) ); //is this correct?
				this.setOutputData(1,v);
				this.setOutputData(2,(v[0] + v[1] + v[2]) / 3);
			}

		}
	}

	LGraphTextureAverage.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			uniform mat4 u_samples_a;\n\
			uniform mat4 u_samples_b;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_mipmap_offset;\n\
			varying vec2 v_coord;\n\
			\n\
			void main() {\n\
				vec4 color = vec4(0.0);\n\
				for(int i = 0; i < 4; ++i)\n\
					for(int j = 0; j < 4; ++j)\n\
					{\n\
						color += texture2D(u_texture, vec2( u_samples_a[i][j], u_samples_b[i][j] ), u_mipmap_offset );\n\
						color += texture2D(u_texture, vec2( 1.0 - u_samples_a[i][j], 1.0 - u_samples_b[i][j] ), u_mipmap_offset );\n\
					}\n\
			   gl_FragColor = color * 0.03125;\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/average", LGraphTextureAverage );

	// Image To Texture *****************************************
	function LGraphImageToTexture()
	{
		this.addInput("Image","image");
		this.addOutput("","Texture");
		this.properties = {};
	}

	LGraphImageToTexture.title = "Image to Texture";
	LGraphImageToTexture.desc = "Uploads an image to the GPU";
	//LGraphImageToTexture.widgets_info = { size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]} };

	LGraphImageToTexture.prototype.onExecute = function()
	{
		var img = this.getInputData(0);
		if(!img)
			return;

		var width = img.videoWidth || img.width;
		var height = img.videoHeight || img.height;

		//this is in case we are using a webgl canvas already, no need to reupload it
		if(img.gltexture)
		{
			this.setOutputData(0,img.gltexture);
			return;
		}


		var temp = this._temp_texture;
		if(!temp || temp.width != width || temp.height != height )
			this._temp_texture = new GL.Texture( width, height, { format: gl.RGBA, filter: gl.LINEAR });

		try
		{
			this._temp_texture.uploadImage(img);
		}
		catch(err)
		{
			console.error("image comes from an unsafe location, cannot be uploaded to webgl: " + err);
			return;
		}

		this.setOutputData(0,this._temp_texture);
	}

	LiteGraph.registerNodeType("texture/imageToTexture", LGraphImageToTexture );


	// Texture LUT *****************************************
	function LGraphTextureLUT()
	{
		this.addInput("Texture","Texture");
		this.addInput("LUT","Texture");
		this.addInput("Intensity","number");
		this.addOutput("","Texture");
		this.properties = { intensity: 1, precision: LGraphTexture.DEFAULT, texture: null };

		if(!LGraphTextureLUT._shader)
			LGraphTextureLUT._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureLUT.pixel_shader );
	}

	LGraphTextureLUT.widgets_info = { 
		"texture": { widget:"texture"},
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLUT.title = "LUT";
	LGraphTextureLUT.desc = "Apply LUT to Texture";

	LGraphTextureLUT.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}

		if(!tex)
			return;

		var lut_tex = this.getInputData(1);

		if(!lut_tex)
			lut_tex = LGraphTexture.getTexture( this.properties.texture );

		if(!lut_tex)
		{
			this.setOutputData(0,tex);
			return;
		}

		lut_tex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		gl.bindTexture(gl.TEXTURE_2D, null);

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
			this.properties.intensity = intensity = this.getInputData(2);

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		//var mesh = Mesh.getScreenQuad();

		this._tex.drawTo(function() {
			lut_tex.bind(1);
			tex.toViewport( LGraphTextureLUT._shader, {u_texture:0, u_textureB:1, u_amount: intensity} );
		});

		this.setOutputData(0,this._tex);
	}

	LGraphTextureLUT.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_textureB;\n\
			uniform float u_amount;\n\
			\n\
			void main() {\n\
				 lowp vec4 textureColor = clamp( texture2D(u_texture, v_coord), vec4(0.0), vec4(1.0) );\n\
				 mediump float blueColor = textureColor.b * 63.0;\n\
				 mediump vec2 quad1;\n\
				 quad1.y = floor(floor(blueColor) / 8.0);\n\
				 quad1.x = floor(blueColor) - (quad1.y * 8.0);\n\
				 mediump vec2 quad2;\n\
				 quad2.y = floor(ceil(blueColor) / 8.0);\n\
				 quad2.x = ceil(blueColor) - (quad2.y * 8.0);\n\
				 highp vec2 texPos1;\n\
				 texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos1.y = 1.0 - ((quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 highp vec2 texPos2;\n\
				 texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);\n\
				 texPos2.y = 1.0 - ((quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g));\n\
				 lowp vec4 newColor1 = texture2D(u_textureB, texPos1);\n\
				 lowp vec4 newColor2 = texture2D(u_textureB, texPos2);\n\
				 lowp vec4 newColor = mix(newColor1, newColor2, fract(blueColor));\n\
				 gl_FragColor = vec4( mix( textureColor.rgb, newColor.rgb, u_amount), textureColor.w);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/LUT", LGraphTextureLUT );

	// Texture Channels *****************************************
	function LGraphTextureChannels()
	{
		this.addInput("Texture","Texture");

		this.addOutput("R","Texture");
		this.addOutput("G","Texture");
		this.addOutput("B","Texture");
		this.addOutput("A","Texture");

		this.properties = {};
		if(!LGraphTextureChannels._shader)
			LGraphTextureChannels._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureChannels.pixel_shader );
	}

	LGraphTextureChannels.title = "Texture to Channels";
	LGraphTextureChannels.desc = "Split texture channels";

	LGraphTextureChannels.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);
		if(!texA) return;

		if(!this._channels)
			this._channels = Array(4);

		var connections = 0;
		for(var i = 0; i < 4; i++)
		{
			if(this.isOutputConnected(i))
			{
				if(!this._channels[i] || this._channels[i].width != texA.width || this._channels[i].height != texA.height || this._channels[i].type != texA.type)
					this._channels[i] = new GL.Texture( texA.width, texA.height, { type: texA.type, format: gl.RGBA, filter: gl.LINEAR });
				connections++;
			}
			else
				this._channels[i] = null;
		}

		if(!connections)
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureChannels._shader;
		var masks = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

		for(var i = 0; i < 4; i++)
		{
			if(!this._channels[i])
				continue;

			this._channels[i].drawTo( function() {
				texA.bind(0);
				shader.uniforms({u_texture:0, u_mask: masks[i]}).draw(mesh);
			});
			this.setOutputData(i, this._channels[i]);
		}
	}

	LGraphTextureChannels.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec4 u_mask;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( vec3( length( texture2D(u_texture, v_coord) * u_mask )), 1.0 );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/textureChannels", LGraphTextureChannels );


	// Texture Channels to Texture *****************************************
	function LGraphChannelsTexture()
	{
		this.addInput("R","Texture");
		this.addInput("G","Texture");
		this.addInput("B","Texture");
		this.addInput("A","Texture");

		this.addOutput("Texture","Texture");

		this.properties = {};
		if(!LGraphChannelsTexture._shader)
			LGraphChannelsTexture._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphChannelsTexture.pixel_shader );
	}

	LGraphChannelsTexture.title = "Channels to Texture";
	LGraphChannelsTexture.desc = "Split texture channels";

	LGraphChannelsTexture.prototype.onExecute = function()
	{
		var tex = [ this.getInputData(0),
				this.getInputData(1),
				this.getInputData(2),
				this.getInputData(3) ];

		if(!tex[0] || !tex[1] || !tex[2] || !tex[3]) 
			return;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphChannelsTexture._shader;

		this._tex = LGraphTexture.getTargetTexture( tex[0], this._tex );

		this._tex.drawTo( function() {
			tex[0].bind(0);
			tex[1].bind(1);
			tex[2].bind(2);
			tex[3].bind(3);
			shader.uniforms({u_textureR:0, u_textureG:1, u_textureB:2, u_textureA:3 }).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphChannelsTexture.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_textureR;\n\
			uniform sampler2D u_textureG;\n\
			uniform sampler2D u_textureB;\n\
			uniform sampler2D u_textureA;\n\
			\n\
			void main() {\n\
			   gl_FragColor = vec4( \
						texture2D(u_textureR, v_coord).r,\
						texture2D(u_textureG, v_coord).r,\
						texture2D(u_textureB, v_coord).r,\
						texture2D(u_textureA, v_coord).r);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/channelsTexture", LGraphChannelsTexture );

	// Texture Color *****************************************
	function LGraphTextureColor()
	{
		this.addOutput("Texture","Texture");

		this._tex_color = vec4.create();
		this.properties = { color: vec4.create(), precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureColor.title = "Color";
	LGraphTextureColor.desc = "Generates a 1x1 texture with a constant color";

	LGraphTextureColor.widgets_info = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureColor.prototype.onDrawBackground = function( ctx )
	{
		var c = this.properties.color;
		ctx.fillStyle = "rgb(" + Math.floor(Math.clamp(c[0],0,1)*255) + "," + Math.floor(Math.clamp(c[1],0,1)*255) + "," + Math.floor(Math.clamp(c[2],0,1)*255) + ")";
		if(this.flags.collapsed)
			this.boxcolor = ctx.fillStyle;
		else
			ctx.fillRect(0,0,this.size[0],this.size[1]);
	}

	LGraphTextureColor.prototype.onExecute = function()
	{
		var type = this.properties.precision == LGraphTexture.HIGH ? LGraphTexture.HIGH_PRECISION_FORMAT : gl.UNSIGNED_BYTE;

		if(!this._tex || this._tex.type != type )
			this._tex = new GL.Texture(1,1,{ format: gl.RGBA, type: type, minFilter: gl.NEAREST });
		var color = this.properties.color;

		if(this.inputs)
		for(var i = 0; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			switch(input.name)
			{
				case 'RGB':
				case 'RGBA':
					color.set(v);
					break;
				case 'R': color[0] = v; break;
				case 'G': color[1] = v; break;
				case 'B': color[2] = v; break;
				case 'A': color[3] = v; break;
			}
		}
		
		if( vec4.sqrDist( this._tex_color, color) > 0.001 )
		{
			this._tex_color.set( color );
			this._tex.fill( color );
		}
		this.setOutputData(0, this._tex);
	}

	LGraphTextureColor.prototype.onGetInputs = function()
	{
		return [["RGB","vec3"],["RGBA","vec4"],["R","number"],["G","number"],["B","number"],["A","number"]];
	}

	LiteGraph.registerNodeType("texture/color", LGraphTextureColor );

	// Texture Channels to Texture *****************************************
	function LGraphTextureGradient()
	{
		this.addInput("A","color");
		this.addInput("B","color");
		this.addOutput("Texture","Texture");

		this.properties = { angle: 0, scale: 1, A:[0,0,0], B:[1,1,1], texture_size:32 };
		if(!LGraphTextureGradient._shader)
			LGraphTextureGradient._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureGradient.pixel_shader );

		this._uniforms = { u_angle: 0, u_colorA: vec3.create(), u_colorB: vec3.create()};
	}

	LGraphTextureGradient.title = "Gradient";
	LGraphTextureGradient.desc = "Generates a gradient";
	LGraphTextureGradient["@A"] = { type:"color" };
	LGraphTextureGradient["@B"] = { type:"color" };
	LGraphTextureGradient["@texture_size"] = { type:"enum", values:[32,64,128,256,512] };

	LGraphTextureGradient.prototype.onExecute = function()
	{
		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = GL.Mesh.getScreenQuad();
		var shader = LGraphTextureGradient._shader;

		var A = this.getInputData(0);
		if(!A)
			A = this.properties.A;
		var B = this.getInputData(1);
		if(!B)
			B = this.properties.B;

		//angle and scale
		for(var i = 2; i < this.inputs.length; i++)
		{
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if(v === undefined)
				continue;
			this.properties[ input.name ] = v;
		}

		var uniforms = this._uniforms;
		this._uniforms.u_angle = this.properties.angle * DEG2RAD;
		this._uniforms.u_scale = this.properties.scale;
		vec3.copy( uniforms.u_colorA, A );
		vec3.copy( uniforms.u_colorB, B );

		var size = parseInt( this.properties.texture_size );
		if(!this._tex || this._tex.width != size )
			this._tex = new GL.Texture( size, size, { format: gl.RGB, filter: gl.LINEAR });

		this._tex.drawTo( function() {
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	}

	LGraphTextureGradient.prototype.onGetInputs = function()
	{
		return [["angle","number"],["scale","number"]];
	}

	LGraphTextureGradient.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform float u_angle;\n\
			uniform float u_scale;\n\
			uniform vec3 u_colorA;\n\
			uniform vec3 u_colorB;\n\
			\n\
			vec2 rotate(vec2 v, float angle)\n\
			{\n\
				vec2 result;\n\
				float _cos = cos(angle);\n\
				float _sin = sin(angle);\n\
				result.x = v.x * _cos - v.y * _sin;\n\
				result.y = v.x * _sin + v.y * _cos;\n\
				return result;\n\
			}\n\
			void main() {\n\
				float f = (rotate(u_scale * (v_coord - vec2(0.5)), u_angle) + vec2(0.5)).x;\n\
				vec3 color = mix(u_colorA,u_colorB,clamp(f,0.0,1.0));\n\
			   gl_FragColor = vec4(color,1.0);\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/gradient", LGraphTextureGradient );

	// Texture Mix *****************************************
	function LGraphTextureMix()
	{
		this.addInput("A","Texture");
		this.addInput("B","Texture");
		this.addInput("Mixer","Texture");

		this.addOutput("Texture","Texture");
		this.properties = { factor: 0.5, precision: LGraphTexture.DEFAULT };
		this._uniforms = { u_textureA:0, u_textureB:1, u_textureMix:2, u_mix: vec4.create() };
	}

	LGraphTextureMix.title = "Mix";
	LGraphTextureMix.desc = "Generates a texture mixing two textures";

	LGraphTextureMix.widgets_info = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMix.prototype.onExecute = function()
	{
		var texA = this.getInputData(0);

		if(!this.isOutputConnected(0))
			return; //saves work
		
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,texA);
			return;
		}

		var texB = this.getInputData(1);
		if(!texA || !texB )
			return;

		var texMix = this.getInputData(2);

		var factor = this.getInputData(3);


		this._tex = LGraphTexture.getTargetTexture( texA, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = null;
		var uniforms = this._uniforms;
		if(texMix)
		{
			shader = LGraphTextureMix._shader_tex;
			if(!shader)
				shader = LGraphTextureMix._shader_tex = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureMix.pixel_shader, {"MIX_TEX":""});
		}
		else
		{
			shader = LGraphTextureMix._shader_factor;
			if(!shader)
				shader = LGraphTextureMix._shader_factor = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureMix.pixel_shader );
			var f = factor == null ? this.properties.factor : factor;
			uniforms.u_mix.set([f,f,f,f]);
		}

		this._tex.drawTo( function() {
			texA.bind(0);
			texB.bind(1);
			if(texMix)
				texMix.bind(2);
			shader.uniforms( uniforms ).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureMix.prototype.onGetInputs = function()
	{
		return [["factor","number"]];
	}

	LGraphTextureMix.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_textureA;\n\
			uniform sampler2D u_textureB;\n\
			#ifdef MIX_TEX\n\
				uniform sampler2D u_textureMix;\n\
			#else\n\
				uniform vec4 u_mix;\n\
			#endif\n\
			\n\
			void main() {\n\
				#ifdef MIX_TEX\n\
				   vec4 f = texture2D(u_textureMix, v_coord);\n\
				#else\n\
				   vec4 f = u_mix;\n\
				#endif\n\
			   gl_FragColor = mix( texture2D(u_textureA, v_coord), texture2D(u_textureB, v_coord), f );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/mix", LGraphTextureMix );

	// Texture Edges detection *****************************************
	function LGraphTextureEdges()
	{
		this.addInput("Tex.","Texture");

		this.addOutput("Edges","Texture");
		this.properties = { invert: true, threshold: false, factor: 1, precision: LGraphTexture.DEFAULT };

		if(!LGraphTextureEdges._shader)
			LGraphTextureEdges._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureEdges.pixel_shader );
	}

	LGraphTextureEdges.title = "Edges";
	LGraphTextureEdges.desc = "Detects edges";

	LGraphTextureEdges.widgets_info = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureEdges.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureEdges._shader;
		var invert = this.properties.invert;
		var factor = this.properties.factor;
		var threshold = this.properties.threshold ? 1 : 0;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({u_texture:0, u_isize:[1/tex.width,1/tex.height], u_factor: factor, u_threshold: threshold, u_invert: invert ? 1 : 0}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphTextureEdges.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_isize;\n\
			uniform int u_invert;\n\
			uniform float u_factor;\n\
			uniform float u_threshold;\n\
			\n\
			void main() {\n\
				vec4 center = texture2D(u_texture, v_coord);\n\
				vec4 up = texture2D(u_texture, v_coord + u_isize * vec2(0.0,1.0) );\n\
				vec4 down = texture2D(u_texture, v_coord + u_isize * vec2(0.0,-1.0) );\n\
				vec4 left = texture2D(u_texture, v_coord + u_isize * vec2(1.0,0.0) );\n\
				vec4 right = texture2D(u_texture, v_coord + u_isize * vec2(-1.0,0.0) );\n\
				vec4 diff = abs(center - up) + abs(center - down) + abs(center - left) + abs(center - right);\n\
				diff *= u_factor;\n\
				if(u_invert == 1)\n\
					diff.xyz = vec3(1.0) - diff.xyz;\n\
				if( u_threshold == 0.0 )\n\
					gl_FragColor = vec4( diff.xyz, center.a );\n\
				else\n\
					gl_FragColor = vec4( diff.x > 0.5 ? 1.0 : 0.0, diff.y > 0.5 ? 1.0 : 0.0, diff.z > 0.5 ? 1.0 : 0.0, center.a );\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/edges", LGraphTextureEdges );

	// Texture Depth *****************************************
	function LGraphTextureDepthRange()
	{
		this.addInput("Texture","Texture");
		this.addInput("Distance","number");
		this.addInput("Range","number");
		this.addOutput("Texture","Texture");
		this.properties = { distance:100, range: 50, only_depth: false, high_precision: false };
		this._uniforms = {u_texture:0, u_distance: 100, u_range: 50, u_camera_planes: null };
	}

	LGraphTextureDepthRange.title = "Depth Range";
	LGraphTextureDepthRange.desc = "Generates a texture with a depth range";

	LGraphTextureDepthRange.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);
		if(!tex) return;

		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.high_precision)
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;			

		if(!this._temp_texture || this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width || this._temp_texture.height != tex.height)
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		var uniforms = this._uniforms;

		//iterations
		var distance = this.properties.distance;
		if( this.isInputConnected(1) )
		{
			distance = this.getInputData(1);
			this.properties.distance = distance;
		}

		var range = this.properties.range;
		if( this.isInputConnected(2) )
		{
			range = this.getInputData(2);
			this.properties.range = range;
		}

		uniforms.u_distance = distance;
		uniforms.u_range = range;

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		if(!LGraphTextureDepthRange._shader)
		{
			LGraphTextureDepthRange._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureDepthRange.pixel_shader );
			LGraphTextureDepthRange._shader_onlydepth = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureDepthRange.pixel_shader, { ONLY_DEPTH:""} );
		}
		var shader = this.properties.only_depth ? LGraphTextureDepthRange._shader_onlydepth : LGraphTextureDepthRange._shader;

		//NEAR AND FAR PLANES
		var planes = null;
		if( tex.near_far_planes )
			planes = tex.near_far_planes;
		else if( window.LS && LS.Renderer._main_camera )
			planes = LS.Renderer._main_camera._uniforms.u_camera_planes;
		else
			planes = [0.1,1000]; //hardcoded
		uniforms.u_camera_planes = planes;


		this._temp_texture.drawTo( function() {
			tex.bind(0);
			shader.uniforms( uniforms ).draw(mesh);
		});

		this._temp_texture.near_far_planes = planes;
		this.setOutputData(0, this._temp_texture );
	}

	LGraphTextureDepthRange.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform float u_distance;\n\
			uniform float u_range;\n\
			\n\
			float LinearDepth()\n\
			{\n\
				float zNear = u_camera_planes.x;\n\
				float zFar = u_camera_planes.y;\n\
				float depth = texture2D(u_texture, v_coord).x;\n\
				depth = depth * 2.0 - 1.0;\n\
				return zNear * (depth + 1.0) / (zFar + zNear - depth * (zFar - zNear));\n\
			}\n\
			\n\
			void main() {\n\
				float depth = LinearDepth();\n\
				#ifdef ONLY_DEPTH\n\
				   gl_FragColor = vec4(depth);\n\
				#else\n\
					float diff = abs(depth * u_camera_planes.y - u_distance);\n\
					float dof = 1.0;\n\
					if(diff <= u_range)\n\
						dof = diff / u_range;\n\
				   gl_FragColor = vec4(dof);\n\
				#endif\n\
			}\n\
			";

	LiteGraph.registerNodeType("texture/depth_range", LGraphTextureDepthRange );

	// Texture Blur *****************************************
	function LGraphTextureBlur()
	{
		this.addInput("Texture","Texture");
		this.addInput("Iterations","number");
		this.addInput("Intensity","number");
		this.addOutput("Blurred","Texture");
		this.properties = { intensity: 1, iterations: 1, preserve_aspect: false, scale:[1,1], precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureBlur.title = "Blur";
	LGraphTextureBlur.desc = "Blur a texture";

	LGraphTextureBlur.widgets_info = {
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureBlur.max_iterations = 20;

	LGraphTextureBlur.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._final_texture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
		{
			//we need two textures to do the blurring
			//this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			temp = this._final_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
		}

		//iterations
		var iterations = this.properties.iterations;
		if( this.isInputConnected(1) )
		{
			iterations = this.getInputData(1);
			this.properties.iterations = iterations;
		}
		iterations = Math.min( Math.floor(iterations), LGraphTextureBlur.max_iterations );
		if(iterations == 0) //skip blurring
		{
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;
		if( this.isInputConnected(2) )
		{
			intensity = this.getInputData(2);
			this.properties.intensity = intensity;
		}

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if(!aspect && window.gl !== undefined)
			aspect = gl.canvas.height / gl.canvas.width;
		if(!aspect)
			aspect = 1;
		aspect = this.properties.preserve_aspect ? aspect : 1;

		var scale = this.properties.scale || [1,1];
		tex.applyBlur( aspect * scale[0], scale[1], intensity, temp );
		for(var i = 1; i < iterations; ++i)
			temp.applyBlur( aspect * scale[0] * (i+1), scale[1] * (i+1), intensity );

		this.setOutputData(0, temp );
	}

	/*
	LGraphTextureBlur.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_offset;\n\
			uniform float u_intensity;\n\
			void main() {\n\
			   vec4 sum = vec4(0.0);\n\
			   vec4 center = texture2D(u_texture, v_coord);\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -4.0) * 0.05/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -3.0) * 0.09/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -2.0) * 0.12/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * -1.0) * 0.15/0.98;\n\
			   sum += center * 0.16/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 4.0) * 0.05/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 3.0) * 0.09/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 2.0) * 0.12/0.98;\n\
			   sum += texture2D(u_texture, v_coord + u_offset * 1.0) * 0.15/0.98;\n\
			   gl_FragColor = u_intensity * sum;\n\
			}\n\
			";
	*/

	LiteGraph.registerNodeType("texture/blur", LGraphTextureBlur );


	// Texture Glow *****************************************
	//based in https://catlikecoding.com/unity/tutorials/advanced-rendering/bloom/
	function LGraphTextureGlow()
	{
		this.addInput("in","Texture");
		this.addInput("dirt","Texture");
		this.addOutput("out","Texture");
		this.addOutput("glow","Texture");
		this.properties = { enabled: true, intensity: 1, persistence: 0.99, iterations:16, threshold:0, scale: 1, dirt_factor: 0.5, precision: LGraphTexture.DEFAULT };
		this._textures = [];
		this._uniforms = { u_intensity: 1, u_texture: 0, u_glow_texture: 1, u_threshold: 0, u_texel_size: vec2.create() };
	}

	LGraphTextureGlow.title = "Glow";
	LGraphTextureGlow.desc = "Filters a texture giving it a glow effect";
	LGraphTextureGlow.weights = new Float32Array( [0.5,0.4,0.3,0.2] );

	LGraphTextureGlow.widgets_info = {
		"iterations": { type:"number", min: 0, max: 16, step: 1, precision: 0 },
		"threshold": { type:"number", min: 0, max: 10, step: 0.01, precision: 2 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureGlow.prototype.onGetInputs = function(){
		return [["enabled","boolean"],["threshold","number"],["intensity","number"],["persistence","number"],["iterations","number"],["dirt_factor","number"]];
	}

	LGraphTextureGlow.prototype.onGetOutputs = function(){
		return [["average","Texture"]];
	}

	LGraphTextureGlow.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isAnyOutputConnected())
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH || this.getInputOrProperty("enabled" ) === false )
		{
			this.setOutputData(0,tex);
			return;
		}		

		var width = tex.width;
		var height = tex.height;

		var texture_info = { format: tex.format, type: tex.type, minFilter: GL.LINEAR, magFilter: GL.LINEAR, wrap: gl.CLAMP_TO_EDGE	};
		var type = LGraphTexture.getTextureType( this.properties.precision, tex );

		var uniforms = this._uniforms;
		var textures = this._textures;

		//cut
		var shader = LGraphTextureGlow._cut_shader;
		if(!shader)
			shader = LGraphTextureGlow._cut_shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.cut_pixel_shader );

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		uniforms.u_threshold = this.getInputOrProperty("threshold");
		var currentDestination = textures[0] = GL.Texture.getTemporary( width, height, texture_info );
		tex.blit( currentDestination, shader.uniforms(uniforms) );
		var currentSource = currentDestination;

		var iterations = this.getInputOrProperty("iterations");
		iterations = Math.clamp( iterations, 1, 16) | 0;
		var texel_size = uniforms.u_texel_size;
		var intensity = this.getInputOrProperty("intensity");

		uniforms.u_intensity = 1;
		uniforms.u_delta = this.properties.scale; //1

		//downscale/upscale shader
		var shader = LGraphTextureGlow._shader;
		if(!shader)
			shader = LGraphTextureGlow._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.scale_pixel_shader );

		var i = 1;
		//downscale
		for (;i < iterations; i++) {
			width = width>>1;
			if( (height|0) > 1 )
				height = height>>1;
			if( width < 2 )
				break;
			currentDestination = textures[i] = GL.Texture.getTemporary( width, height, texture_info );
			texel_size[0] = 1 / currentSource.width; texel_size[1] = 1 / currentSource.height;
			currentSource.blit( currentDestination, shader.uniforms(uniforms) );
			currentSource = currentDestination;
		}

		//average
		if(this.isOutputConnected(2))
		{
			var average_texture = this._average_texture;
			if(!average_texture || average_texture.type != tex.type || average_texture.format != tex.format )
				average_texture = this._average_texture = new GL.Texture( 1, 1, { type: tex.type, format: tex.format, filter: gl.LINEAR });
			texel_size[0] = 1 / currentSource.width; texel_size[1] = 1 / currentSource.height;
			uniforms.u_intensity = intensity;
			uniforms.u_delta = 1;
			currentSource.blit( average_texture, shader.uniforms(uniforms) ); 
			this.setOutputData( 2, average_texture );
		}

		//upscale and blend 
		gl.enable( gl.BLEND );
		gl.blendFunc( gl.ONE, gl.ONE );
		uniforms.u_intensity = this.getInputOrProperty("persistence");
		uniforms.u_delta = 0.5;

		for (i -= 2; i >= 0; i--) // i-=2 =>  -1 to point to last element in array, -1 to go to texture above
		{ 
			currentDestination = textures[i];
			textures[i] = null;
			texel_size[0] = 1 / currentSource.width; texel_size[1] = 1 / currentSource.height;
			currentSource.blit( currentDestination, shader.uniforms(uniforms) );
			GL.Texture.releaseTemporary( currentSource );
			currentSource = currentDestination;
		}
		gl.disable( gl.BLEND );

		//glow
		if(this.isOutputConnected(1))
		{
			var glow_texture = this._glow_texture;
			if(!glow_texture || glow_texture.width != tex.width || glow_texture.height != tex.height || glow_texture.type != type || glow_texture.format != tex.format )
				glow_texture = this._glow_texture = new GL.Texture( tex.width,  tex.height, { type: type, format: tex.format, filter: gl.LINEAR });
			currentSource.blit( glow_texture );
			this.setOutputData( 1, glow_texture);
		}

		//final composition
		if(this.isOutputConnected(0))
		{
			var final_texture = this._final_texture;
			if(!final_texture || final_texture.width != tex.width || final_texture.height != tex.height || final_texture.type != type || final_texture.format != tex.format )
				final_texture = this._final_texture = new GL.Texture( tex.width, tex.height, { type: type, format: tex.format, filter: gl.LINEAR });

			var dirt_texture = this.getInputData(1);
			var dirt_factor = this.getInputOrProperty("dirt_factor");

			uniforms.u_intensity = intensity;

			shader = dirt_texture ? LGraphTextureGlow._dirt_final_shader : LGraphTextureGlow._final_shader;
			if(!shader)
			{
				if(dirt_texture)
					shader = LGraphTextureGlow._dirt_final_shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.final_pixel_shader, { USE_DIRT: "" } );
				else
					shader = LGraphTextureGlow._final_shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureGlow.final_pixel_shader );
			}

			final_texture.drawTo( function(){
				tex.bind(0);
				currentSource.bind(1);
				if(dirt_texture)
				{
					shader.setUniform( "u_dirt_factor", dirt_factor );
					shader.setUniform( "u_dirt_texture", dirt_texture.bind(2) );
				}
				shader.toViewport( uniforms );
			});
			this.setOutputData( 0, final_texture );
		}

		GL.Texture.releaseTemporary( currentSource );
	}

	LGraphTextureGlow.cut_pixel_shader = "precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_threshold;\n\
		void main() {\n\
			gl_FragColor = max( texture2D( u_texture, v_coord ) - vec4( u_threshold ), vec4(0.0) );\n\
		}"

	LGraphTextureGlow.scale_pixel_shader = "precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 u_texel_size;\n\
		uniform float u_delta;\n\
		uniform float u_intensity;\n\
		\n\
		vec4 sampleBox(vec2 uv) {\n\
			vec4 o = u_texel_size.xyxy * vec2(-u_delta, u_delta).xxyy;\n\
			vec4 s = texture2D( u_texture, uv + o.xy ) + texture2D( u_texture, uv + o.zy) + texture2D( u_texture, uv + o.xw) + texture2D( u_texture, uv + o.zw);\n\
			return s * 0.25;\n\
		}\n\
		void main() {\n\
			gl_FragColor = u_intensity * sampleBox( v_coord );\n\
		}"

	LGraphTextureGlow.final_pixel_shader = "precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_glow_texture;\n\
		#ifdef USE_DIRT\n\
			uniform sampler2D u_dirt_texture;\n\
		#endif\n\
		uniform vec2 u_texel_size;\n\
		uniform float u_delta;\n\
		uniform float u_intensity;\n\
		uniform float u_dirt_factor;\n\
		\n\
		vec4 sampleBox(vec2 uv) {\n\
			vec4 o = u_texel_size.xyxy * vec2(-u_delta, u_delta).xxyy;\n\
			vec4 s = texture2D( u_glow_texture, uv + o.xy ) + texture2D( u_glow_texture, uv + o.zy) + texture2D( u_glow_texture, uv + o.xw) + texture2D( u_glow_texture, uv + o.zw);\n\
			return s * 0.25;\n\
		}\n\
		void main() {\n\
			vec4 glow = sampleBox( v_coord );\n\
			#ifdef USE_DIRT\n\
				glow = mix( glow, glow * texture2D( u_dirt_texture, v_coord ), u_dirt_factor );\n\
			#endif\n\
			gl_FragColor = texture2D( u_texture, v_coord ) + u_intensity * glow;\n\
		}"

	LiteGraph.registerNodeType("texture/glow", LGraphTextureGlow );


	// Texture Blur *****************************************
	function LGraphTextureKuwaharaFilter()
	{
		this.addInput("Texture","Texture");
		this.addOutput("Filtered","Texture");
		this.properties = { intensity: 1, radius: 5 };
	}

	LGraphTextureKuwaharaFilter.title = "Kuwahara Filter";
	LGraphTextureKuwaharaFilter.desc = "Filters a texture giving an artistic oil canvas painting";

	LGraphTextureKuwaharaFilter.max_radius = 10;
	LGraphTextureKuwaharaFilter._shaders = [];

	LGraphTextureKuwaharaFilter.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._temp_texture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
		{
			//we need two textures to do the blurring
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			//this._final_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
		}

		//iterations
		var radius = this.properties.radius;
		radius = Math.min( Math.floor(radius), LGraphTextureKuwaharaFilter.max_radius );
		if(radius == 0) //skip blurring
		{
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if(!aspect && window.gl !== undefined)
			aspect = gl.canvas.height / gl.canvas.width;
		if(!aspect)
			aspect = 1;
		aspect = this.properties.preserve_aspect ? aspect : 1;

		if(!LGraphTextureKuwaharaFilter._shaders[ radius ])
			LGraphTextureKuwaharaFilter._shaders[ radius ] = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureKuwaharaFilter.pixel_shader, { RADIUS: radius.toFixed(0) });

		var shader = LGraphTextureKuwaharaFilter._shaders[ radius ];
		var mesh = GL.Mesh.getScreenQuad();
		tex.bind(0);

		this._temp_texture.drawTo( function() {
			shader.uniforms({ u_texture: 0, u_intensity: intensity, u_resolution: [tex.width, tex.height], u_iResolution: [1/tex.width,1/tex.height]}).draw(mesh);
		});

		this.setOutputData(0, this._temp_texture);
	}

//from https://www.shadertoy.com/view/MsXSz4
LGraphTextureKuwaharaFilter.pixel_shader = "\n\
	precision highp float;\n\
	varying vec2 v_coord;\n\
	uniform sampler2D u_texture;\n\
	uniform float u_intensity;\n\
	uniform vec2 u_resolution;\n\
	uniform vec2 u_iResolution;\n\
	#ifndef RADIUS\n\
		#define RADIUS 7\n\
	#endif\n\
	void main() {\n\
	\n\
		const int radius = RADIUS;\n\
		vec2 fragCoord = v_coord;\n\
		vec2 src_size = u_iResolution;\n\
		vec2 uv = v_coord;\n\
		float n = float((radius + 1) * (radius + 1));\n\
		int i;\n\
		int j;\n\
		vec3 m0 = vec3(0.0); vec3 m1 = vec3(0.0); vec3 m2 = vec3(0.0); vec3 m3 = vec3(0.0);\n\
		vec3 s0 = vec3(0.0); vec3 s1 = vec3(0.0); vec3 s2 = vec3(0.0); vec3 s3 = vec3(0.0);\n\
		vec3 c;\n\
		\n\
		for (int j = -radius; j <= 0; ++j)  {\n\
			for (int i = -radius; i <= 0; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m0 += c;\n\
				s0 += c * c;\n\
			}\n\
		}\n\
		\n\
		for (int j = -radius; j <= 0; ++j)  {\n\
			for (int i = 0; i <= radius; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m1 += c;\n\
				s1 += c * c;\n\
			}\n\
		}\n\
		\n\
		for (int j = 0; j <= radius; ++j)  {\n\
			for (int i = 0; i <= radius; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m2 += c;\n\
				s2 += c * c;\n\
			}\n\
		}\n\
		\n\
		for (int j = 0; j <= radius; ++j)  {\n\
			for (int i = -radius; i <= 0; ++i)  {\n\
				c = texture2D(u_texture, uv + vec2(i,j) * src_size).rgb;\n\
				m3 += c;\n\
				s3 += c * c;\n\
			}\n\
		}\n\
		\n\
		float min_sigma2 = 1e+2;\n\
		m0 /= n;\n\
		s0 = abs(s0 / n - m0 * m0);\n\
		\n\
		float sigma2 = s0.r + s0.g + s0.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m0, 1.0);\n\
		}\n\
		\n\
		m1 /= n;\n\
		s1 = abs(s1 / n - m1 * m1);\n\
		\n\
		sigma2 = s1.r + s1.g + s1.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m1, 1.0);\n\
		}\n\
		\n\
		m2 /= n;\n\
		s2 = abs(s2 / n - m2 * m2);\n\
		\n\
		sigma2 = s2.r + s2.g + s2.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m2, 1.0);\n\
		}\n\
		\n\
		m3 /= n;\n\
		s3 = abs(s3 / n - m3 * m3);\n\
		\n\
		sigma2 = s3.r + s3.g + s3.b;\n\
		if (sigma2 < min_sigma2) {\n\
			min_sigma2 = sigma2;\n\
			gl_FragColor = vec4(m3, 1.0);\n\
		}\n\
	}\n\
	";

	LiteGraph.registerNodeType("texture/kuwahara", LGraphTextureKuwaharaFilter );


	// Texture Webcam *****************************************
	function LGraphTextureWebcam()
	{
		this.addOutput("Webcam","Texture");
		this.properties = { texture_name: "" };
	}

	LGraphTextureWebcam.title = "Webcam";
	LGraphTextureWebcam.desc = "Webcam texture";


	LGraphTextureWebcam.prototype.openStream = function()
	{
		//Vendor prefixes hell
		if (!navigator.getUserMedia) {
		  //console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
		  return;
		}

		this._waiting_confirmation = true;
		var that = this;

		// Not showing vendor prefixes.
		navigator.mediaDevices.getUserMedia({audio: false, video: true}).then( this.streamReady.bind(this) ).catch( onFailSoHard );

		function onFailSoHard(e) {
			console.log('Webcam rejected', e);
			that._webcam_stream = false;
			that.boxcolor = "red";
		};
	}

	LGraphTextureWebcam.prototype.streamReady = function(localMediaStream)
	{
		this._webcam_stream = localMediaStream;
		//this._waiting_confirmation = false;

	    var video = this._video;
		if(!video)
		{
			video = document.createElement("video");
			video.autoplay = true;
		    video.srcObject = localMediaStream;
			this._video = video;
			//document.body.appendChild( video ); //debug
			//when video info is loaded (size and so)
			video.onloadedmetadata = function(e) {
				// Ready to go. Do some stuff.
				console.log(e);
			};
		}
	}

	LGraphTextureWebcam.prototype.onRemoved = function()
	{
		if(!this._webcam_stream)
			return;

		var tracks = this._webcam_stream.getTracks();
		if(tracks.length)
		{
			for(var i = 0;i < tracks.length; ++i)
				tracks[i].stop();
		}

		this._webcam_stream = null;
		this._video = null;
	}

	LGraphTextureWebcam.prototype.onDrawBackground = function(ctx)
	{
		if(this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!this._video)
			return;

		//render to graph canvas
		ctx.save();
		if(!ctx.webgl) //reverse image
			ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
		else
		{
			if(this._temp_texture)
				ctx.drawImage(this._temp_texture, 0, 0, this.size[0], this.size[1]);
		}
		ctx.restore();
	}

	LGraphTextureWebcam.prototype.onExecute = function()
	{
		if(this._webcam_stream == null && !this._waiting_confirmation)
			this.openStream();

		if(!this._video || !this._video.videoWidth)
			return;

		var width = this._video.videoWidth;
		var height = this._video.videoHeight;

		var temp = this._temp_texture;
		if(!temp || temp.width != width || temp.height != height )
			this._temp_texture = new GL.Texture( width, height, { format: gl.RGB, filter: gl.LINEAR });

		this._temp_texture.uploadImage( this._video );
		
		if(this.properties.texture_name)
		{
			var container = LGraphTexture.getTexturesContainer();
			container[ this.properties.texture_name ] = this._temp_texture;
		}

		this.setOutputData(0,this._temp_texture);
	}

	LiteGraph.registerNodeType("texture/webcam", LGraphTextureWebcam );



	//from https://github.com/spite/Wagner
	function LGraphLensFX()
	{
		this.addInput("in","Texture");
		this.addInput("f","number");
		this.addOutput("out","Texture");
		this.properties = { enabled: true, factor: 1, precision: LGraphTexture.LOW };

		this._uniforms = { u_texture: 0, u_factor: 1 };
	}

	LGraphLensFX.title = "Lens FX";
	LGraphLensFX.desc = "distortion and chromatic aberration";

	LGraphLensFX.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphLensFX.prototype.onGetInputs = function() { return [["enabled","boolean"]]; }

	LGraphLensFX.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH || this.getInputOrProperty("enabled" ) === false )
		{
			this.setOutputData(0, tex );
			return;
		}

		var temp = this._temp_texture;
		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = LGraphLensFX._shader;
		if(!shader)
			shader = LGraphLensFX._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphLensFX.pixel_shader );

		var factor = this.getInputData(1);
		if(factor == null)
			factor = this.properties.factor;

		var uniforms = this._uniforms;
		uniforms.u_factor = factor;

		//apply shader
		gl.disable( gl.DEPTH_TEST );
		temp.drawTo(function(){
			tex.bind(0);
			shader.uniforms(uniforms).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData(0,temp);
	}

	LGraphLensFX.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_factor;\n\
			vec2 barrelDistortion(vec2 coord, float amt) {\n\
				vec2 cc = coord - 0.5;\n\
				float dist = dot(cc, cc);\n\
				return coord + cc * dist * amt;\n\
			}\n\
			\n\
			float sat( float t )\n\
			{\n\
				return clamp( t, 0.0, 1.0 );\n\
			}\n\
			\n\
			float linterp( float t ) {\n\
				return sat( 1.0 - abs( 2.0*t - 1.0 ) );\n\
			}\n\
			\n\
			float remap( float t, float a, float b ) {\n\
				return sat( (t - a) / (b - a) );\n\
			}\n\
			\n\
			vec4 spectrum_offset( float t ) {\n\
				vec4 ret;\n\
				float lo = step(t,0.5);\n\
				float hi = 1.0-lo;\n\
				float w = linterp( remap( t, 1.0/6.0, 5.0/6.0 ) );\n\
				ret = vec4(lo,1.0,hi, 1.) * vec4(1.0-w, w, 1.0-w, 1.);\n\
			\n\
				return pow( ret, vec4(1.0/2.2) );\n\
			}\n\
			\n\
			const float max_distort = 2.2;\n\
			const int num_iter = 12;\n\
			const float reci_num_iter_f = 1.0 / float(num_iter);\n\
			\n\
			void main()\n\
			{	\n\
				vec2 uv=v_coord;\n\
				vec4 sumcol = vec4(0.0);\n\
				vec4 sumw = vec4(0.0);	\n\
				for ( int i=0; i<num_iter;++i )\n\
				{\n\
					float t = float(i) * reci_num_iter_f;\n\
					vec4 w = spectrum_offset( t );\n\
					sumw += w;\n\
					sumcol += w * texture2D( u_texture, barrelDistortion(uv, .6 * max_distort*t * u_factor ) );\n\
				}\n\
				gl_FragColor = sumcol / sumw;\n\
			}";

	LiteGraph.registerNodeType("texture/lensfx", LGraphLensFX );


	//simple exposition, but plan to expand it to support different gamma curves
	function LGraphExposition()
	{
		this.addInput("in","Texture");
		this.addInput("exp","number");
		this.addOutput("out","Texture");
		this.properties = { exposition: 1, precision: LGraphTexture.LOW };
		this._uniforms = { u_texture: 0, u_exposition: 1 };
	}

	LGraphExposition.title = "Exposition";
	LGraphExposition.desc = "Controls texture exposition";

	LGraphExposition.widgets_info = {
		"exposition": { widget:"slider", min:0,max:3 },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphExposition.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		var temp = this._temp_texture;
		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });

		var shader = LGraphExposition._shader;
		if(!shader)
			shader = LGraphExposition._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphExposition.pixel_shader );

		var exp = this.properties.exposition;
		var exp_input = this.getInputData(1);
		if(exp_input != null)
			exp = this.properties.exposition = exp_input;
		var uniforms = this._uniforms;

		//apply shader
		temp.drawTo(function(){
			gl.disable( gl.DEPTH_TEST );
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0,temp);
	}

	LGraphExposition.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_exposition;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, v_coord );\n\
				gl_FragColor = vec4( color.xyz * u_exposition, color.a );\n\
			}";

	LiteGraph.registerNodeType("texture/exposition", LGraphExposition );



	function LGraphToneMapping()
	{
		this.addInput("in","Texture");
		this.addInput("avg","number");
		this.addOutput("out","Texture");
		this.properties = { enabled: true, scale:1, gamma: 1, average_lum: 1, lum_white: 1, precision: LGraphTexture.LOW };

		this._uniforms = { 
			u_texture: 0,
			u_lumwhite2: 1,
			u_igamma: 1,
			u_scale: 1,
			u_average_lum: 1
		};
	}

	LGraphToneMapping.title = "Tone Mapping";
	LGraphToneMapping.desc = "Applies Tone Mapping to convert from high to low";

	LGraphToneMapping.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphToneMapping.prototype.onGetInputs = function() {
		return [["enabled","boolean"]];
	}

	LGraphToneMapping.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(!tex)
			return;

		if(!this.isOutputConnected(0))
			return; //saves work

		if(this.properties.precision === LGraphTexture.PASS_THROUGH || this.getInputOrProperty("enabled" ) === false )
		{
			this.setOutputData(0, tex );
			return;
		}

		var temp = this._temp_texture;

		if(!temp || temp.width != tex.width || temp.height != tex.height || temp.type != tex.type )
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });

		//apply shader
		var shader = LGraphToneMapping._shader;
		if(!shader)
			shader = LGraphToneMapping._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphToneMapping.pixel_shader );

		var avg = this.getInputData(1);
		if(avg != null)
			this.properties.average_lum = avg;

		var uniforms = this._uniforms;
		uniforms.u_lumwhite2 = this.properties.lum_white * this.properties.lum_white;
		uniforms.u_scale = this.properties.scale;
		uniforms.u_average_lum = this.properties.average_lum;
		uniforms.u_igamma = 1/this.properties.gamma;

		//apply shader
		gl.disable( gl.DEPTH_TEST );
		temp.drawTo(function(){
			tex.bind(0);
			shader.uniforms(uniforms).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData(0,this._temp_texture);
	}

	LGraphToneMapping.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_scale;\n\
			uniform float u_average_lum;\n\
			uniform float u_lumwhite2;\n\
			uniform float u_igamma;\n\
			vec3 RGB2xyY (vec3 rgb)\n\
			{\n\
				 const mat3 RGB2XYZ = mat3(0.4124, 0.3576, 0.1805,\n\
										   0.2126, 0.7152, 0.0722,\n\
										   0.0193, 0.1192, 0.9505);\n\
				vec3 XYZ = RGB2XYZ * rgb;\n\
				\n\
				float f = (XYZ.x + XYZ.y + XYZ.z);\n\
				return vec3(XYZ.x / f,\n\
							XYZ.y / f,\n\
							XYZ.y);\n\
			}\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, v_coord );\n\
				vec3 rgb = color.xyz;\n\
				//Ld - this part of the code is the same for both versions\n\
				float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));\n\
				float L = (u_scale / u_average_lum) * lum;\n\
				float Ld = (L * (1.0 + L / u_lumwhite2)) / (1.0 + L);\n\
				//first\n\
				//vec3 xyY = RGB2xyY(rgb);\n\
				//xyY.z *= Ld;\n\
				//rgb = xyYtoRGB(xyY);\n\
				//second\n\
				rgb = (rgb / lum) * Ld;\n\
				rgb = pow( rgb, vec3( u_igamma ) );\n\
				gl_FragColor = vec4( rgb, color.a );\n\
			}";


	LiteGraph.registerNodeType("texture/tonemapping", LGraphToneMapping );


	function LGraphTexturePerlin()
	{
		this.addOutput("out","Texture");
		this.properties = { width: 512, height: 512, seed:0, persistence: 0.1, octaves: 8, scale: 1, offset: [0,0], amplitude: 1, precision: LGraphTexture.DEFAULT };
		this._key = 0;
		this._uniforms = { u_persistence: 0.1, u_seed: 0, u_offset: vec2.create(), u_scale: 1, u_viewport: vec2.create() };
	}

	LGraphTexturePerlin.title = "Perlin";
	LGraphTexturePerlin.desc = "Generates a perlin noise texture";

	LGraphTexturePerlin.widgets_info = {
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES },
		width: { type: "Number", precision: 0, step: 1 },
		height: { type: "Number", precision: 0, step: 1 },
		octaves: { type: "Number", precision: 0, step: 1, min: 1, max: 50 }
	};

	LGraphTexturePerlin.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var w = this.properties.width|0;
		var h = this.properties.height|0;
		if(w == 0)	w = gl.viewport_data[2]; //0 means default
		if(h == 0)	h = gl.viewport_data[3]; //0 means default
		var type = LGraphTexture.getTextureType( this.properties.precision );

		var temp = this._temp_texture;
		if(!temp || temp.width != w || temp.height != h || temp.type != type )
			temp = this._temp_texture = new GL.Texture( w, h, { type: type, format: gl.RGB, filter: gl.LINEAR });

		//reusing old
		var key = w + h + type + this.properties.persistence + this.properties.octaves + this.properties.scale + this.properties.seed + this.properties.offset[0] + this.properties.offset[1] + this.properties.amplitude;
		if(key == this._key)
		{
			this.setOutputData( 0, temp );
			return;
		}
		this._key = key;

		//gather uniforms
		var uniforms = this._uniforms;
		uniforms.u_persistence = this.properties.persistence;
		uniforms.u_octaves = this.properties.octaves;
		uniforms.u_offset[0] = this.properties.offset[0];
		uniforms.u_offset[1] = this.properties.offset[1];
		uniforms.u_scale = this.properties.scale;
		uniforms.u_amplitude = this.properties.amplitude;
		uniforms.u_viewport[0] = w;
		uniforms.u_viewport[1] = h;
		uniforms.u_seed = this.properties.seed * 128;

		//render
		var shader = LGraphTexturePerlin._shader;
		if(!shader)
			shader = LGraphTexturePerlin._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTexturePerlin.pixel_shader );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		temp.drawTo( function() {
			shader.uniforms( uniforms ).draw( GL.Mesh.getScreenQuad() );
		});

		this.setOutputData( 0, temp );
	}

	LGraphTexturePerlin.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform vec2 u_offset;\n\
			uniform float u_scale;\n\
			uniform float u_persistence;\n\
			uniform int u_octaves;\n\
			uniform float u_amplitude;\n\
			uniform vec2 u_viewport;\n\
			uniform float u_seed;\n\
			#define M_PI 3.14159265358979323846\n\
			\n\
			float rand(vec2 c){	return fract(sin(dot(c.xy ,vec2( 12.9898 + u_seed,78.233 + u_seed))) * 43758.5453); }\n\
			\n\
			float noise(vec2 p, float freq ){\n\
				float unit = u_viewport.x/freq;\n\
				vec2 ij = floor(p/unit);\n\
				vec2 xy = mod(p,unit)/unit;\n\
				//xy = 3.*xy*xy-2.*xy*xy*xy;\n\
				xy = .5*(1.-cos(M_PI*xy));\n\
				float a = rand((ij+vec2(0.,0.)));\n\
				float b = rand((ij+vec2(1.,0.)));\n\
				float c = rand((ij+vec2(0.,1.)));\n\
				float d = rand((ij+vec2(1.,1.)));\n\
				float x1 = mix(a, b, xy.x);\n\
				float x2 = mix(c, d, xy.x);\n\
				return mix(x1, x2, xy.y);\n\
			}\n\
			\n\
			float pNoise(vec2 p, int res){\n\
				float persistance = u_persistence;\n\
				float n = 0.;\n\
				float normK = 0.;\n\
				float f = 4.;\n\
				float amp = 1.0;\n\
				int iCount = 0;\n\
				for (int i = 0; i<50; i++){\n\
					n+=amp*noise(p, f);\n\
					f*=2.;\n\
					normK+=amp;\n\
					amp*=persistance;\n\
					if (iCount >= res)\n\
						break;\n\
					iCount++;\n\
				}\n\
				float nf = n/normK;\n\
				return nf*nf*nf*nf;\n\
			}\n\
			void main() {\n\
				vec2 uv = v_coord * u_scale * u_viewport + u_offset * u_scale;\n\
				vec4 color = vec4( pNoise( uv, u_octaves ) * u_amplitude );\n\
				gl_FragColor = color;\n\
			}";

	LiteGraph.registerNodeType("texture/perlin", LGraphTexturePerlin );



	function LGraphTextureCanvas2D()
	{
		this.addOutput("out","Texture");
		this.properties = { code: "", width: 512, height: 512, precision: LGraphTexture.DEFAULT };
		this._func = null;
		this._temp_texture = null;
	}

	LGraphTextureCanvas2D.title = "Canvas2D";
	LGraphTextureCanvas2D.desc = "Executes Canvas2D code inside a texture or the viewport";

	LGraphTextureCanvas2D.widgets_info = {
		precision: { widget:"combo", values: LGraphTexture.MODE_VALUES },
		code: { type: "code" },
		width: { type: "Number", precision: 0, step: 1 },
		height: { type: "Number", precision: 0, step: 1 }
	};

	LGraphTextureCanvas2D.prototype.onPropertyChanged = function(name, value)
	{
		if(name == "code" && LiteGraph.allow_scripts )
		{
			this._func = null;
			try
			{
				this._func = new Function( "canvas", "ctx", "time", "script", value );
				this.boxcolor = "#00FF00";
			}
			catch (err)
			{
				this.boxcolor = "#FF0000";
				console.error("Error parsing script");
				console.error(err);
			}
		}
	}

	LGraphTextureCanvas2D.prototype.onExecute = function()
	{
		var func = this._func;
		if(!func || !this.isOutputConnected(0))
			return;

		if(!global.enableWebGLCanvas)
		{
			console.warn("cannot use LGraphTextureCanvas2D if Canvas2DtoWebGL is not included");
			return;
		}

		var width = this.properties.width || gl.canvas.width;
		var height = this.properties.height || gl.canvas.height;
		var temp = this._temp_texture;
		if(!temp || temp.width != width || temp.height != height )
			temp = this._temp_texture = new GL.Texture( width, height, { format: gl.RGBA, filter: gl.LINEAR });

		var that = this;
		var time = this.graph.getTime();
		temp.drawTo(function(){
			gl.start2D();
			try
			{
				if(func.draw)
					func.draw.call( that, gl.canvas, gl, time, func );
				else
					func.call( that, gl.canvas, gl, time, func );
				that.boxcolor = "#00FF00";
			}
			catch (err)
			{
				that.boxcolor = "#FF0000";
				console.error("Error executing script");
				console.error(err);
			}
			gl.finish2D();
		});

		this.setOutputData( 0, temp );
	}

	LiteGraph.registerNodeType("texture/canvas2D", LGraphTextureCanvas2D );


	function LGraphTextureMatte()
	{
		this.addInput("in","Texture");

		this.addOutput("out","Texture");
		this.properties = { key_color: vec3.fromValues(0.,1.,0.), threshold: 0.8, slope: 0.2, precision: LGraphTexture.DEFAULT };
	}

	LGraphTextureMatte.title = "Matte";
	LGraphTextureMatte.desc = "Extracts background";

	LGraphTextureMatte.widgets_info = { 
		"key_color": { widget:"color" },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMatte.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex)
			return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		if(!this._uniforms)
			this._uniforms = { u_texture: 0, u_key_color: this.properties.key_color, u_threshold: 1, u_slope: 1 };
		var uniforms = this._uniforms;

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureMatte._shader;
		if(!shader)
			shader = LGraphTextureMatte._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureMatte.pixel_shader );

		uniforms.u_key_color = this.properties.key_color;
		uniforms.u_threshold = this.properties.threshold;
		uniforms.u_slope = this.properties.slope;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms( uniforms ).draw( mesh );
		});

		this.setOutputData( 0, this._tex );
	}

	LGraphTextureMatte.pixel_shader = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec3 u_key_color;\n\
			uniform float u_threshold;\n\
			uniform float u_slope;\n\
			\n\
			void main() {\n\
				vec3 color = texture2D( u_texture, v_coord ).xyz;\n\
				float diff = length( normalize(color) - normalize(u_key_color) );\n\
				float edge = u_threshold * (1.0 - u_slope);\n\
				float alpha = smoothstep( edge, u_threshold, diff);\n\
				gl_FragColor = vec4( color, alpha );\n\
			}";

	LiteGraph.registerNodeType("texture/matte", LGraphTextureMatte );


	//***********************************
	//Cubemap reader (to pass a cubemap to a node that requires cubemaps and no images)
	function LGraphCubemap()
	{
		this.addOutput("Cubemap","Cubemap");
		this.properties = {name:""};
		this.size = [LGraphTexture.image_preview_size, LGraphTexture.image_preview_size];
	}

	LGraphCubemap.title = "Cubemap";

	LGraphCubemap.prototype.onDropFile = function(data, filename, file)
	{
		if(!data)
		{
			this._drop_texture = null;
			this.properties.name = "";
		}
		else
		{
			if( typeof(data) == "string" )
				this._drop_texture = GL.Texture.fromURL(data);
			else
				this._drop_texture = GL.Texture.fromDDSInMemory(data);
			this.properties.name = filename;
		}
	}

	LGraphCubemap.prototype.onExecute = function()
	{
		if(this._drop_texture)
		{
			this.setOutputData(0, this._drop_texture);
			return;
		}

		if(!this.properties.name)
			return;

		var tex = LGraphTexture.getTexture( this.properties.name );
		if(!tex) 
			return;

		this._last_tex = tex;
		this.setOutputData(0, tex);
	}

	LGraphCubemap.prototype.onDrawBackground = function(ctx)
	{
		if( this.flags.collapsed || this.size[1] <= 20)
			return;

		if(!ctx.webgl)
			return;

		var cube_mesh = gl.meshes["cube"];
		if(!cube_mesh)
			cube_mesh = gl.meshes["cube"] = GL.Mesh.cube({size:1});

		//var view = mat4.lookAt( mat4.create(), [0,0
	}

	LiteGraph.registerNodeType("texture/cubemap", LGraphCubemap );

} //litegl.js defined

})(this);
(function(global){
var LiteGraph = global.LiteGraph;

//Works with Litegl.js to create WebGL nodes
if(typeof(GL) != "undefined")
{

	// Texture Lens *****************************************
	function LGraphFXLens()
	{
		this.addInput("Texture","Texture");
		this.addInput("Aberration","number");
		this.addInput("Distortion","number");
		this.addInput("Blur","number");
		this.addOutput("Texture","Texture");
		this.properties = { aberration:1.0, distortion: 1.0, blur: 1.0, precision: LGraphTexture.DEFAULT };

		if(!LGraphFXLens._shader)
		{
			LGraphFXLens._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphFXLens.pixel_shader );
			LGraphFXLens._texture = new GL.Texture(3,1,{ format: gl.RGB, wrap: gl.CLAMP_TO_EDGE, magFilter: gl.LINEAR, minFilter: gl.LINEAR, pixel_data: [255,0,0, 0,255,0, 0,0,255] });
		}
	}

	LGraphFXLens.title = "Lens";
	LGraphFXLens.desc = "Camera Lens distortion";
	LGraphFXLens.widgets_info = {
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphFXLens.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		var aberration = this.properties.aberration;
		if( this.isInputConnected(1) )
		{
			aberration = this.getInputData(1);
			this.properties.aberration = aberration;
		}

		var distortion = this.properties.distortion;
		if( this.isInputConnected(2) )
		{
			distortion = this.getInputData(2);
			this.properties.distortion = distortion;
		}

		var blur = this.properties.blur;
		if( this.isInputConnected(3) )
		{
			blur = this.getInputData(3);
			this.properties.blur = blur;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var shader = LGraphFXLens._shader;
		//var camera = LS.Renderer._current_camera;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({u_texture:0, u_aberration: aberration, u_distortion: distortion, u_blur: blur })
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphFXLens.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform float u_aberration;\n\
			uniform float u_distortion;\n\
			uniform float u_blur;\n\
			\n\
			void main() {\n\
				vec2 coord = v_coord;\n\
				float dist = distance(vec2(0.5), coord);\n\
				vec2 dist_coord = coord - vec2(0.5);\n\
				float percent = 1.0 + ((0.5 - dist) / 0.5) * u_distortion;\n\
				dist_coord *= percent;\n\
				coord = dist_coord + vec2(0.5);\n\
				vec4 color = texture2D(u_texture,coord, u_blur * dist);\n\
				color.r = texture2D(u_texture,vec2(0.5) + dist_coord * (1.0+0.01*u_aberration), u_blur * dist ).r;\n\
				color.b = texture2D(u_texture,vec2(0.5) + dist_coord * (1.0-0.01*u_aberration), u_blur * dist ).b;\n\
				gl_FragColor = color;\n\
			}\n\
			";
		/*
			float normalized_tunable_sigmoid(float xs, float k)\n\
			{\n\
				xs = xs * 2.0 - 1.0;\n\
				float signx = sign(xs);\n\
				float absx = abs(xs);\n\
				return signx * ((-k - 1.0)*absx)/(2.0*(-2.0*k*absx+k-1.0)) + 0.5;\n\
			}\n\
		*/

	LiteGraph.registerNodeType("fx/lens", LGraphFXLens );
	global.LGraphFXLens = LGraphFXLens;

	/* not working yet
	function LGraphDepthOfField()
	{
		this.addInput("Color","Texture");
		this.addInput("Linear Depth","Texture");
		this.addInput("Camera","camera");
		this.addOutput("Texture","Texture");
		this.properties = { high_precision: false };
	}

	LGraphDepthOfField.title = "Depth Of Field";
	LGraphDepthOfField.desc = "Applies a depth of field effect";

	LGraphDepthOfField.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		var depth = this.getInputData(1);
		var camera = this.getInputData(2);

		if(!tex || !depth || !camera) 
		{
			this.setOutputData(0, tex);
			return;
		}

		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.high_precision)
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;			
		if(!this._temp_texture || this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width || this._temp_texture.height != tex.height)
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		var shader = LGraphDepthOfField._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphDepthOfField._pixel_shader );

		var screen_mesh = Mesh.getScreenQuad();

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		var camera_position = camera.getEye();
		var focus_point = camera.getCenter();
		var distance = vec3.distance( camera_position, focus_point );
		var far = camera.far;
		var focus_range = distance * 0.5;

		this._temp_texture.drawTo( function() {
			tex.bind(0);
			depth.bind(1);
			shader.uniforms({u_texture:0, u_depth_texture:1, u_resolution: [1/tex.width, 1/tex.height], u_far: far, u_focus_point: distance, u_focus_scale: focus_range }).draw(screen_mesh);
		});

		this.setOutputData(0, this._temp_texture);
	}

	//from http://tuxedolabs.blogspot.com.es/2018/05/bokeh-depth-of-field-in-single-pass.html
	LGraphDepthOfField._pixel_shader = "\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture; //Image to be processed\n\
		uniform sampler2D u_depth_texture; //Linear depth, where 1.0 == far plane\n\
		uniform vec2 u_iresolution; //The size of a pixel: vec2(1.0/width, 1.0/height)\n\
		uniform float u_far; // Far plane\n\
		uniform float u_focus_point;\n\
		uniform float u_focus_scale;\n\
		\n\
		const float GOLDEN_ANGLE = 2.39996323;\n\
		const float MAX_BLUR_SIZE = 20.0;\n\
		const float RAD_SCALE = 0.5; // Smaller = nicer blur, larger = faster\n\
		\n\
		float getBlurSize(float depth, float focusPoint, float focusScale)\n\
		{\n\
		 float coc = clamp((1.0 / focusPoint - 1.0 / depth)*focusScale, -1.0, 1.0);\n\
		 return abs(coc) * MAX_BLUR_SIZE;\n\
		}\n\
		\n\
		vec3 depthOfField(vec2 texCoord, float focusPoint, float focusScale)\n\
		{\n\
		 float centerDepth = texture2D(u_depth_texture, texCoord).r * u_far;\n\
		 float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);\n\
		 vec3 color = texture2D(u_texture, v_coord).rgb;\n\
		 float tot = 1.0;\n\
		\n\
		 float radius = RAD_SCALE;\n\
		 for (float ang = 0.0; ang < 100.0; ang += GOLDEN_ANGLE)\n\
		 {\n\
		  vec2 tc = texCoord + vec2(cos(ang), sin(ang)) * u_iresolution * radius;\n\
			\n\
		  vec3 sampleColor = texture2D(u_texture, tc).rgb;\n\
		  float sampleDepth = texture2D(u_depth_texture, tc).r * u_far;\n\
		  float sampleSize = getBlurSize( sampleDepth, focusPoint, focusScale );\n\
		  if (sampleDepth > centerDepth)\n\
		   sampleSize = clamp(sampleSize, 0.0, centerSize*2.0);\n\
			\n\
		  float m = smoothstep(radius-0.5, radius+0.5, sampleSize);\n\
		  color += mix(color/tot, sampleColor, m);\n\
		  tot += 1.0;\n\
		  radius += RAD_SCALE/radius;\n\
		  if(radius>=MAX_BLUR_SIZE)\n\
			 return color / tot;\n\
		 }\n\
		 return color / tot;\n\
		}\n\
		void main()\n\
		{\n\
			gl_FragColor = vec4( depthOfField( v_coord, u_focus_point, u_focus_scale ), 1.0 );\n\
			//gl_FragColor = vec4( texture2D(u_depth_texture, v_coord).r );\n\
		}\n\
		";

	LiteGraph.registerNodeType("fx/DOF", LGraphDepthOfField );
	global.LGraphDepthOfField = LGraphDepthOfField;
	*/

	//*******************************************************

	function LGraphFXBokeh()
	{
		this.addInput("Texture","Texture");
		this.addInput("Blurred","Texture");
		this.addInput("Mask","Texture");
		this.addInput("Threshold","number");
		this.addOutput("Texture","Texture");
		this.properties = { shape: "", size: 10, alpha: 1.0, threshold: 1.0, high_precision: false };
	}

	LGraphFXBokeh.title = "Bokeh";
	LGraphFXBokeh.desc = "applies an Bokeh effect";

	LGraphFXBokeh.widgets_info = {"shape": { widget:"texture" }};

	LGraphFXBokeh.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);
		var blurred_tex = this.getInputData(1);
		var mask_tex = this.getInputData(2);
		if(!tex || !mask_tex || !this.properties.shape) 
		{
			this.setOutputData(0, tex);
			return;
		}

		if(!blurred_tex)
			blurred_tex = tex;

		var shape_tex = LGraphTexture.getTexture( this.properties.shape );
		if(!shape_tex)
			return;

		var threshold = this.properties.threshold;
		if( this.isInputConnected(3) )
		{
			threshold = this.getInputData(3);
			this.properties.threshold = threshold;
		}


		var precision = gl.UNSIGNED_BYTE;
		if(this.properties.high_precision)
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;			
		if(!this._temp_texture || this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width || this._temp_texture.height != tex.height)
			this._temp_texture = new GL.Texture( tex.width, tex.height, { type: precision, format: gl.RGBA, filter: gl.LINEAR });

		//iterations
		var size = this.properties.size;

		var first_shader = LGraphFXBokeh._first_shader;
		if(!first_shader)
			first_shader = LGraphFXBokeh._first_shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXBokeh._first_pixel_shader );

		var second_shader = LGraphFXBokeh._second_shader;
		if(!second_shader)
			second_shader = LGraphFXBokeh._second_shader = new GL.Shader( LGraphFXBokeh._second_vertex_shader, LGraphFXBokeh._second_pixel_shader );

		var points_mesh = this._points_mesh;
		if(!points_mesh || points_mesh._width != tex.width || points_mesh._height != tex.height || points_mesh._spacing != 2)
			points_mesh = this.createPointsMesh( tex.width, tex.height, 2 );

		var screen_mesh = Mesh.getScreenQuad();

		var point_size = this.properties.size;
		var min_light = this.properties.min_light;
		var alpha = this.properties.alpha;

		gl.disable( gl.DEPTH_TEST );
		gl.disable( gl.BLEND );

		this._temp_texture.drawTo( function() {
			tex.bind(0);
			blurred_tex.bind(1);
			mask_tex.bind(2);
			first_shader.uniforms({u_texture:0, u_texture_blur:1, u_mask: 2, u_texsize: [tex.width, tex.height] })
				.draw(screen_mesh);
		});

		this._temp_texture.drawTo( function() {
			//clear because we use blending
			//gl.clearColor(0.0,0.0,0.0,1.0);
			//gl.clear( gl.COLOR_BUFFER_BIT );
			gl.enable( gl.BLEND );
			gl.blendFunc( gl.ONE, gl.ONE );

			tex.bind(0);
			shape_tex.bind(3);
			second_shader.uniforms({u_texture:0, u_mask: 2, u_shape:3, u_alpha: alpha, u_threshold: threshold, u_pointSize: point_size, u_itexsize: [1.0/tex.width, 1.0/tex.height] })
				.draw(points_mesh, gl.POINTS);
		});

		this.setOutputData(0, this._temp_texture);
	}

	LGraphFXBokeh.prototype.createPointsMesh = function(width, height, spacing)
	{
		var nwidth = Math.round(width / spacing);
		var nheight = Math.round(height / spacing);

		var vertices = new Float32Array(nwidth * nheight * 2);

		var ny = -1;
		var dx = 2/width * spacing;
		var dy = 2/height * spacing;
		for(var y = 0; y < nheight; ++y )
		{
			var nx = -1;
			for(var x = 0; x < nwidth; ++x )
			{
				var pos = y*nwidth*2 + x*2;
				vertices[pos] = nx;
				vertices[pos+1] = ny;
				nx += dx;
			}
			ny += dy;
		}

		this._points_mesh = GL.Mesh.load({vertices2D: vertices});
		this._points_mesh._width = width;
		this._points_mesh._height = height;
		this._points_mesh._spacing = spacing;

		return this._points_mesh;
	}

	/*
	LGraphTextureBokeh._pixel_shader = "precision highp float;\n\
			varying vec2 a_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_shape;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_texture, gl_PointCoord );\n\
				color *= v_color * u_alpha;\n\
				gl_FragColor = color;\n\
			}\n";
	*/

	LGraphFXBokeh._first_pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_texture_blur;\n\
			uniform sampler2D u_mask;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				vec4 blurred_color = texture2D(u_texture_blur, v_coord);\n\
				float mask = texture2D(u_mask, v_coord).x;\n\
			   gl_FragColor = mix(color, blurred_color, mask);\n\
			}\n\
			";

	LGraphFXBokeh._second_vertex_shader = "precision highp float;\n\
			attribute vec2 a_vertex2D;\n\
			varying vec4 v_color;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_mask;\n\
			uniform vec2 u_itexsize;\n\
			uniform float u_pointSize;\n\
			uniform float u_threshold;\n\
			void main() {\n\
				vec2 coord = a_vertex2D * 0.5 + 0.5;\n\
				v_color = texture2D( u_texture, coord );\n\
				v_color += texture2D( u_texture, coord + vec2(u_itexsize.x, 0.0) );\n\
				v_color += texture2D( u_texture, coord + vec2(0.0, u_itexsize.y));\n\
				v_color += texture2D( u_texture, coord + u_itexsize);\n\
				v_color *= 0.25;\n\
				float mask = texture2D(u_mask, coord).x;\n\
				float luminance = length(v_color) * mask;\n\
				/*luminance /= (u_pointSize*u_pointSize)*0.01 */;\n\
				luminance -= u_threshold;\n\
				if(luminance < 0.0)\n\
				{\n\
					gl_Position.x = -100.0;\n\
					return;\n\
				}\n\
				gl_PointSize = u_pointSize;\n\
				gl_Position = vec4(a_vertex2D,0.0,1.0);\n\
			}\n\
			";

	LGraphFXBokeh._second_pixel_shader = "precision highp float;\n\
			varying vec4 v_color;\n\
			uniform sampler2D u_shape;\n\
			uniform float u_alpha;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_shape, gl_PointCoord );\n\
				color *= v_color * u_alpha;\n\
				gl_FragColor = color;\n\
			}\n";


	LiteGraph.registerNodeType("fx/bokeh", LGraphFXBokeh );
	global.LGraphFXBokeh = LGraphFXBokeh;

	//************************************************

	function LGraphFXGeneric()
	{
		this.addInput("Texture","Texture");
		this.addInput("value1","number");
		this.addInput("value2","number");
		this.addOutput("Texture","Texture");
		this.properties = { fx: "halftone", value1: 1, value2: 1, precision: LGraphTexture.DEFAULT };
	}

	LGraphFXGeneric.title = "FX";
	LGraphFXGeneric.desc = "applies an FX from a list";

	LGraphFXGeneric.widgets_info = {
		"fx": { widget:"combo", values:["halftone","pixelate","lowpalette","noise","gamma"] },
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};
	LGraphFXGeneric.shaders = {};

	LGraphFXGeneric.prototype.onExecute = function()
	{
		if(!this.isOutputConnected(0))
			return; //saves work

		var tex = this.getInputData(0);
		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex)
			return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		//iterations
		var value1 = this.properties.value1;
		if( this.isInputConnected(1) )
		{
			value1 = this.getInputData(1);
			this.properties.value1 = value1;
		}

		var value2 = this.properties.value2;
		if( this.isInputConnected(2) )
		{
			value2 = this.getInputData(2);
			this.properties.value2 = value2;
		}
	
		var fx = this.properties.fx;
		var shader = LGraphFXGeneric.shaders[ fx ];
		if(!shader)
		{
			var pixel_shader_code = LGraphFXGeneric["pixel_shader_" + fx ];
			if(!pixel_shader_code)
				return;

			shader = LGraphFXGeneric.shaders[ fx ] = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, pixel_shader_code );
		}


		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );
		var mesh = Mesh.getScreenQuad();
		var camera = global.LS ? LS.Renderer._current_camera : null;
		if(camera)
			camera_planes = [LS.Renderer._current_camera.near, LS.Renderer._current_camera.far];
		else
			camera_planes = [1,100];

		var noise = null;
		if(fx == "noise")
			noise = LGraphTexture.getNoiseTexture();

		this._tex.drawTo( function() {
			tex.bind(0);
			if(fx == "noise")
				noise.bind(1);

			shader.uniforms({u_texture:0, u_noise:1, u_size: [tex.width, tex.height], u_rand:[ Math.random(), Math.random() ], u_value1: value1, u_value2: value2, u_camera_planes: camera_planes })
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphFXGeneric.pixel_shader_halftone = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			float pattern() {\n\
				float s = sin(u_value1 * 3.1415), c = cos(u_value1 * 3.1415);\n\
				vec2 tex = v_coord * u_size.xy;\n\
				vec2 point = vec2(\n\
				   c * tex.x - s * tex.y ,\n\
				   s * tex.x + c * tex.y \n\
				) * u_value2;\n\
				return (sin(point.x) * sin(point.y)) * 4.0;\n\
			}\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				float average = (color.r + color.g + color.b) / 3.0;\n\
				gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);\n\
			}\n";

	LGraphFXGeneric.pixel_shader_pixelate = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			void main() {\n\
				vec2 coord = vec2( floor(v_coord.x * u_value1) / u_value1, floor(v_coord.y * u_value2) / u_value2 );\n\
				vec4 color = texture2D(u_texture, coord);\n\
				gl_FragColor = color;\n\
			}\n";

	LGraphFXGeneric.pixel_shader_lowpalette = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform vec2 u_camera_planes;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				gl_FragColor = floor(color * u_value1) / u_value1;\n\
			}\n";

	LGraphFXGeneric.pixel_shader_noise = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform sampler2D u_noise;\n\
			uniform vec2 u_size;\n\
			uniform float u_value1;\n\
			uniform float u_value2;\n\
			uniform vec2 u_rand;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				vec3 noise = texture2D(u_noise, v_coord * vec2(u_size.x / 512.0, u_size.y / 512.0) + u_rand).xyz - vec3(0.5);\n\
				gl_FragColor = vec4( color.xyz + noise * u_value1, color.a );\n\
			}\n";

	LGraphFXGeneric.pixel_shader_gamma = "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_value1;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				float gamma = 1.0 / u_value1;\n\
				gl_FragColor = vec4( pow( color.xyz, vec3(gamma) ), color.a );\n\
			}\n";


	LiteGraph.registerNodeType("fx/generic", LGraphFXGeneric );
	global.LGraphFXGeneric = LGraphFXGeneric;


	// Vigneting ************************************

	function LGraphFXVigneting()
	{
		this.addInput("Tex.","Texture");
		this.addInput("intensity","number");

		this.addOutput("Texture","Texture");
		this.properties = { intensity: 1, invert: false, precision: LGraphTexture.DEFAULT };

		if(!LGraphFXVigneting._shader)
			LGraphFXVigneting._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphFXVigneting.pixel_shader );
	}

	LGraphFXVigneting.title = "Vigneting";
	LGraphFXVigneting.desc = "Vigneting";

	LGraphFXVigneting.widgets_info = { 
		"precision": { widget:"combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphFXVigneting.prototype.onExecute = function()
	{
		var tex = this.getInputData(0);

		if(this.properties.precision === LGraphTexture.PASS_THROUGH )
		{
			this.setOutputData(0,tex);
			return;
		}		

		if(!tex) return;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );

		var intensity = this.properties.intensity;
		if( this.isInputConnected(1) )
		{
			intensity = this.getInputData(1);
			this.properties.intensity = intensity;
		}

		gl.disable( gl.BLEND );
		gl.disable( gl.DEPTH_TEST );

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphFXVigneting._shader;
		var invert = this.properties.invert;

		this._tex.drawTo( function() {
			tex.bind(0);
			shader.uniforms({u_texture:0, u_intensity: intensity, u_isize:[1/tex.width,1/tex.height], u_invert: invert ? 1 : 0}).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	}

	LGraphFXVigneting.pixel_shader = "precision highp float;\n\
			precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_intensity;\n\
			uniform int u_invert;\n\
			\n\
			void main() {\n\
				float luminance = 1.0 - length( v_coord - vec2(0.5) ) * 1.414;\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				if(u_invert == 1)\n\
					luminance = 1.0 - luminance;\n\
				luminance = mix(1.0, luminance, u_intensity);\n\
			   gl_FragColor = vec4( luminance * color.xyz, color.a);\n\
			}\n\
			";

	LiteGraph.registerNodeType("fx/vigneting", LGraphFXVigneting );
	global.LGraphFXVigneting = LGraphFXVigneting;
}

})(this);
(function( global )
{
var LiteGraph = global.LiteGraph;

function MIDIEvent( data )
{
	this.channel = 0;
	this.cmd = 0;

	if(data)
		this.setup(data)
	else
		this.data = [0,0,0];
}

MIDIEvent.prototype.setup = function( raw_data )
{
	this.data = raw_data;

	var midiStatus = raw_data[0];
	this.status = midiStatus;

	var midiCommand = midiStatus & 0xF0;

	if(midiStatus >= 0xF0)
		this.cmd = midiStatus;
	else
		this.cmd = midiCommand;

	if(this.cmd == MIDIEvent.NOTEON && this.velocity == 0)
		this.cmd = MIDIEvent.NOTEOFF;

	this.cmd_str = MIDIEvent.commands[ this.cmd ] || "";

	if ( midiCommand >= MIDIEvent.NOTEON || midiCommand <= MIDIEvent.NOTEOFF ) {
		this.channel =  midiStatus & 0x0F;
	}
}

Object.defineProperty( MIDIEvent.prototype, "velocity", {
	get: function() {
		if(this.cmd == MIDIEvent.NOTEON)
			return this.data[2];
		return -1;
	},
	set: function(v) {
		this.data[2] = v; //  v / 127;
	},
	enumerable: true
});

MIDIEvent.notes = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];

//returns HZs
MIDIEvent.prototype.getPitch = function()
{
	return Math.pow(2, (this.data[1] - 69) / 12 ) * 440;
}

MIDIEvent.computePitch = function( note )
{
	return Math.pow(2, (note - 69) / 12 ) * 440;
}

MIDIEvent.prototype.getCC = function()
{
	return this.data[1];
}

MIDIEvent.prototype.getCCValue = function()
{
	return this.data[2];
}

//not tested, there is a formula missing here
MIDIEvent.prototype.getPitchBend = function()
{
	return this.data[1] + (this.data[2] << 7) - 8192;
}

MIDIEvent.computePitchBend = function(v1,v2)
{
	return v1 + (v2 << 7) - 8192;
}

MIDIEvent.prototype.setCommandFromString = function( str )
{
	this.cmd = MIDIEvent.computeCommandFromString(str);
}

MIDIEvent.computeCommandFromString = function( str )
{
	if(!str)
		return 0;

	if(str && str.constructor === Number)
		return str;

	str = str.toUpperCase();
	switch( str )
	{
		case "NOTE ON":
		case "NOTEON": return MIDIEvent.NOTEON; break;
		case "NOTE OFF":
		case "NOTEOFF": return MIDIEvent.NOTEON; break;
		case "KEY PRESSURE": 
		case "KEYPRESSURE": return MIDIEvent.KEYPRESSURE; break;
		case "CONTROLLER CHANGE": 
		case "CONTROLLERCHANGE": 
		case "CC": return MIDIEvent.CONTROLLERCHANGE; break;
		case "PROGRAM CHANGE":
		case "PROGRAMCHANGE":
		case "PC": return MIDIEvent.PROGRAMCHANGE; break;
		case "CHANNEL PRESSURE":
		case "CHANNELPRESSURE": return MIDIEvent.CHANNELPRESSURE; break;
		case "PITCH BEND":
		case "PITCHBEND": return MIDIEvent.PITCHBEND; break;
		case "TIME TICK":
		case "TIMETICK": return MIDIEvent.TIMETICK; break;
		default: return Number(str); //asume its a hex code
	}
}

MIDIEvent.toNoteString = function(d)
{
	var note = d - 21;
	var octave = d - 24;
	note = note % 12;
	if(note < 0)
		note = 12 + note;
	return MIDIEvent.notes[ note ] + Math.floor(octave / 12 + 1);
}

MIDIEvent.prototype.toString = function()
{
	var str = "" + this.channel + ". " ;
	switch( this.cmd )
	{
		case MIDIEvent.NOTEON: str += "NOTEON " + MIDIEvent.toNoteString( this.data[1] ); break;
		case MIDIEvent.NOTEOFF: str += "NOTEOFF " + MIDIEvent.toNoteString( this.data[1] ); break;
		case MIDIEvent.CONTROLLERCHANGE: str += "CC " + this.data[1] + " " + this.data[2]; break;
		case MIDIEvent.PROGRAMCHANGE: str += "PC " + this.data[1]; break;
		case MIDIEvent.PITCHBEND: str += "PITCHBEND " + this.getPitchBend(); break;
		case MIDIEvent.KEYPRESSURE: str += "KEYPRESS " + this.data[1]; break;
	}

	return str;
}

MIDIEvent.prototype.toHexString = function()
{
	var str = "";
	for(var i = 0; i < this.data.length; i++)
		str += this.data[i].toString(16) + " ";
}

MIDIEvent.NOTEOFF = 0x80;
MIDIEvent.NOTEON = 0x90;
MIDIEvent.KEYPRESSURE = 0xA0;
MIDIEvent.CONTROLLERCHANGE = 0xB0;
MIDIEvent.PROGRAMCHANGE = 0xC0;
MIDIEvent.CHANNELPRESSURE = 0xD0;
MIDIEvent.PITCHBEND = 0xE0;
MIDIEvent.TIMETICK = 0xF8;

MIDIEvent.commands = {
	0x80: "note off",
	0x90: "note on",
	0xA0: "key pressure",
	0xB0: "controller change",
	0xC0: "program change",
	0xD0: "channel pressure",
	0xE0: "pitch bend",
	0xF0: "system",
	0xF2: "Song pos",
	0xF3: "Song select",
	0xF6: "Tune request",
	0xF8: "time tick",
	0xFA: "Start Song",
	0xFB: "Continue Song",
	0xFC: "Stop Song",
	0xFE: "Sensing",
	0xFF: "Reset"
}

//MIDI wrapper
function MIDIInterface( on_ready, on_error )
{
	if(!navigator.requestMIDIAccess)
	{
		this.error = "not suppoorted";
		if(on_error)
			on_error("Not supported");
		else
			console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
		return;
	}

	this.on_ready = on_ready;

	this.state = {
		note: [],
		cc: []
	};



	navigator.requestMIDIAccess().then( this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(this) );
}

MIDIInterface.input = null;

MIDIInterface.MIDIEvent = MIDIEvent;

MIDIInterface.prototype.onMIDISuccess = function(midiAccess)
{
	console.log( "MIDI ready!" );
	console.log( midiAccess );
	this.midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)
	this.updatePorts();

	if (this.on_ready)
		this.on_ready(this);
}

MIDIInterface.prototype.updatePorts = function()
{
	var midi = this.midi;
	this.input_ports = midi.inputs;
	var num = 0;

	var it = this.input_ports.values();
	var it_value = it.next();
	while( it_value && it_value.done === false )
	{
		var port_info = it_value.value;
		console.log( "Input port [type:'" + port_info.type + "'] id:'" + port_info.id +
		  "' manufacturer:'" + port_info.manufacturer + "' name:'" + port_info.name +
		  "' version:'" + port_info.version + "'" );
			num++;
		it_value = it.next();
	}
	this.num_input_ports = num;

	num = 0;
	this.output_ports = midi.outputs;
	var it = this.output_ports.values();
	var it_value = it.next();
	while( it_value && it_value.done === false )
	{
		var port_info = it_value.value;
		console.log( "Output port [type:'" + port_info.type + "'] id:'" + port_info.id +
		  "' manufacturer:'" + port_info.manufacturer + "' name:'" + port_info.name +
		  "' version:'" + port_info.version + "'" );
			num++;
		it_value = it.next();
	  }
	this.num_output_ports = num;


	/* OLD WAY
	for (var i = 0; i < this.input_ports.size; ++i) {
		  var input = this.input_ports.get(i);
		  if(!input)
			  continue; //sometimes it is null?!
			console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
		  "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
		  "' version:'" + input.version + "'" );
			num++;
	  }
	this.num_input_ports = num;


	num = 0;
	this.output_ports = midi.outputs;
	for (var i = 0; i < this.output_ports.size; ++i) {
		  var output = this.output_ports.get(i);
		  if(!output)
			  continue; 
		console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
		  "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
		  "' version:'" + output.version + "'" );
			num++;
	  }
	this.num_output_ports = num;
	*/
}

MIDIInterface.prototype.onMIDIFailure = function(msg)
{
	console.error( "Failed to get MIDI access - " + msg );
}

MIDIInterface.prototype.openInputPort = function( port, callback )
{
	var input_port = this.input_ports.get( "input-" + port );
	if(!input_port)
		return false;
	MIDIInterface.input = this;
	var that = this;

	input_port.onmidimessage = function(a) {
		var midi_event = new MIDIEvent(a.data);
		that.updateState( midi_event );
		if(callback)
			callback(a.data, midi_event );
		if(MIDIInterface.on_message)
			MIDIInterface.on_message( a.data, midi_event );
	}
	console.log("port open: ", input_port);
	return true;
}

MIDIInterface.parseMsg = function(data)
{

}

MIDIInterface.prototype.updateState = function( midi_event )
{
	switch( midi_event.cmd )
	{
		case MIDIEvent.NOTEON: this.state.note[ midi_event.value1|0 ] = midi_event.value2; break;
		case MIDIEvent.NOTEOFF: this.state.note[ midi_event.value1|0 ] = 0; break;
		case MIDIEvent.CONTROLLERCHANGE: this.state.cc[ midi_event.getCC() ] = midi_event.getCCValue(); break;
	}
}

MIDIInterface.prototype.sendMIDI = function( port, midi_data )
{
	if( !midi_data )
		return;

	var output_port = this.output_ports.get( "output-" + port );
	if(!output_port)
		return;

	MIDIInterface.output = this;

	if( midi_data.constructor === MIDIEvent)
		output_port.send( midi_data.data ); 
	else
		output_port.send( midi_data ); 
}



function LGMIDIIn()
{
	this.addOutput( "on_midi", LiteGraph.EVENT );
	this.addOutput( "out", "midi" );
	this.properties = {port: 0};
	this._last_midi_event = null;
	this._current_midi_event = null;

	var that = this;
	new MIDIInterface( function( midi ){
		//open
		that._midi = midi;
		if(that._waiting)
			that.onStart();
		that._waiting = false;
	});
}

LGMIDIIn.MIDIInterface = MIDIInterface;

LGMIDIIn.title = "MIDI Input";
LGMIDIIn.desc = "Reads MIDI from a input port";

LGMIDIIn.prototype.getPropertyInfo = function(name)
{
	if(!this._midi)
		return;

	if(name == "port")
	{
		var values = {};
		for (var i = 0; i < this._midi.input_ports.size; ++i)
		{
			var input = this._midi.input_ports.get( "input-" + i);
			values[i] = i + ".- " + input.name + " version:" + input.version;
		}
		return { type: "enum", values: values };
	}
}

LGMIDIIn.prototype.onStart = function()
{
	if(this._midi)
		this._midi.openInputPort( this.properties.port, this.onMIDIEvent.bind(this) );
	else
		this._waiting = true;
}

LGMIDIIn.prototype.onMIDIEvent = function( data, midi_event )
{
	this._last_midi_event = midi_event;

	this.trigger( "on_midi", midi_event );
	if(midi_event.cmd == MIDIEvent.NOTEON)
		this.trigger( "on_noteon", midi_event );
	else if(midi_event.cmd == MIDIEvent.NOTEOFF)
		this.trigger( "on_noteoff", midi_event );
	else if(midi_event.cmd == MIDIEvent.CONTROLLERCHANGE)
		this.trigger( "on_cc", midi_event );
	else if(midi_event.cmd == MIDIEvent.PROGRAMCHANGE)
		this.trigger( "on_pc", midi_event );
	else if(midi_event.cmd == MIDIEvent.PITCHBEND)
		this.trigger( "on_pitchbend", midi_event );
}

LGMIDIIn.prototype.onExecute = function()
{
	if(this.outputs)
	{
		var last = this._last_midi_event;
		for(var i = 0; i < this.outputs.length; ++i)
		{
			var output = this.outputs[i];
			var v = null;
			switch (output.name)
			{
				case "midi": v = this._midi; break;
				case "last_midi": v = last; break;
				default:
					continue;
			}
			this.setOutputData( i, v );
		}
	}
}

LGMIDIIn.prototype.onGetOutputs = function() {
	return [
		["last_midi","midi"],
		["on_midi",LiteGraph.EVENT],
		["on_noteon",LiteGraph.EVENT],
		["on_noteoff",LiteGraph.EVENT],
		["on_cc",LiteGraph.EVENT],
		["on_pc",LiteGraph.EVENT],
		["on_pitchbend",LiteGraph.EVENT]
	];
}

LiteGraph.registerNodeType("midi/input", LGMIDIIn);


function LGMIDIOut()
{
	this.addInput( "send", LiteGraph.EVENT );
	this.properties = {port: 0};

	var that = this;
	new MIDIInterface( function( midi ){
		that._midi = midi;
	});
}

LGMIDIOut.MIDIInterface = MIDIInterface;

LGMIDIOut.title = "MIDI Output";
LGMIDIOut.desc = "Sends MIDI to output channel";

LGMIDIOut.prototype.getPropertyInfo = function(name)
{
	if(!this._midi)
		return;

	if(name == "port")
	{
		var values = {};
		for (var i = 0; i < this._midi.output_ports.size; ++i)
		{
			var output = this._midi.output_ports.get(i);
			values[i] = i + ".- " + output.name + " version:" + output.version;
		}
		return { type: "enum", values: values };
	}
}


LGMIDIOut.prototype.onAction = function(event, midi_event )
{
	console.log(midi_event);
	if(!this._midi)
		return;
	if(event == "send")
		this._midi.sendMIDI( this.port, midi_event );
	this.trigger("midi",midi_event);
}

LGMIDIOut.prototype.onGetInputs = function() {
	return [["send",LiteGraph.ACTION]];
}

LGMIDIOut.prototype.onGetOutputs = function() {
	return [["on_midi",LiteGraph.EVENT]];
}

LiteGraph.registerNodeType("midi/output", LGMIDIOut);


function LGMIDIShow()
{
	this.addInput( "on_midi", LiteGraph.EVENT );
	this._str = "";
	this.size = [200,40]
}

LGMIDIShow.title = "MIDI Show";
LGMIDIShow.desc = "Shows MIDI in the graph";

LGMIDIShow.prototype.onAction = function(event, midi_event )
{
	if(!midi_event)
		return;
	if(midi_event.constructor === MIDIEvent)
		this._str = midi_event.toString();
	else
		this._str = "???";
}

LGMIDIShow.prototype.onDrawForeground = function( ctx )
{
	if( !this._str )
		return;

	ctx.font = "30px Arial";
	ctx.fillText( this._str, 10, this.size[1] * 0.8 );
}

LGMIDIShow.prototype.onGetInputs = function() {
	return [["in",LiteGraph.ACTION]];
}

LGMIDIShow.prototype.onGetOutputs = function() {
	return [["on_midi",LiteGraph.EVENT]];
}

LiteGraph.registerNodeType("midi/show", LGMIDIShow);



function LGMIDIFilter()
{
	this.properties = {
		channel: -1,
		cmd: -1,
		min_value: -1,
		max_value: -1
	};

	this.addInput( "in", LiteGraph.EVENT );
	this.addOutput( "on_midi", LiteGraph.EVENT );
}

LGMIDIFilter.title = "MIDI Filter";
LGMIDIFilter.desc = "Filters MIDI messages";

LGMIDIFilter.prototype.onAction = function(event, midi_event )
{
	if(!midi_event || midi_event.constructor !== MIDIEvent)
		return;

	if( this.properties.channel != -1 && midi_event.channel != this.properties.channel)
		return;
	if(this.properties.cmd != -1 && midi_event.cmd != this.properties.cmd)
		return;
	if(this.properties.min_value != -1 && midi_event.data[1] < this.properties.min_value)
		return;
	if(this.properties.max_value != -1 && midi_event.data[1] > this.properties.max_value)
		return;
	this.trigger("on_midi",midi_event);
}

LiteGraph.registerNodeType("midi/filter", LGMIDIFilter);


function LGMIDIEvent()
{
	this.properties = {
		channel: 0,
		cmd: "CC",
		value1: 1,
		value2: 1
	};

	this.addInput( "send", LiteGraph.EVENT );
	this.addInput( "assign", LiteGraph.EVENT );
	this.addOutput( "on_midi", LiteGraph.EVENT );
}

LGMIDIEvent.title = "MIDIEvent";
LGMIDIEvent.desc = "Create a MIDI Event";

LGMIDIEvent.prototype.onAction = function( event, midi_event )
{
	if(event == "assign")
	{
		this.properties.channel = midi_event.channel;
		this.properties.cmd = midi_event.cmd;
		this.properties.value1 = midi_event.data[1];
		this.properties.value2 = midi_event.data[2];
		return;
	}

	//send
	var midi_event = new MIDIEvent();
	midi_event.channel = this.properties.channel;
	if(this.properties.cmd && this.properties.cmd.constructor === String)
		midi_event.setCommandFromString( this.properties.cmd );
	else
		midi_event.cmd = this.properties.cmd;
	midi_event.data[0] = midi_event.cmd | midi_event.channel;
	midi_event.data[1] = Number(this.properties.value1);
	midi_event.data[2] = Number(this.properties.value2);
	this.trigger("on_midi",midi_event);
}

LGMIDIEvent.prototype.onExecute = function()
{
	var props = this.properties;

	if(this.outputs)
	{
		for(var i = 0; i < this.outputs.length; ++i)
		{
			var output = this.outputs[i];
			var v = null;
			switch (output.name)
			{
				case "midi": 
					v = new MIDIEvent(); 
					v.setup([ props.cmd, props.value1, props.value2 ]);
					v.channel = props.channel;
					break;
				case "command": v = props.cmd; break;
				case "cc": v = props.value1; break;
				case "cc_value": v = props.value2; break;
				case "note": v = (props.cmd == MIDIEvent.NOTEON || props.cmd == MIDIEvent.NOTEOFF) ? props.value1 : null; break;
				case "velocity": v = props.cmd == MIDIEvent.NOTEON ? props.value2 : null; break;
				case "pitch": v = props.cmd == MIDIEvent.NOTEON ? MIDIEvent.computePitch( props.value1 ) : null; break;
				case "pitchbend": v = props.cmd == MIDIEvent.PITCHBEND ? MIDIEvent.computePitchBend( props.value1, props.value2 ) : null; break;
				default:
					continue;
			}
			if(v !== null)
				this.setOutputData( i, v );
		}
	}
}

LGMIDIEvent.prototype.onPropertyChanged = function(name,value)
{
	if(name == "cmd")
		this.properties.cmd = MIDIEvent.computeCommandFromString( value );
}


LGMIDIEvent.prototype.onGetOutputs = function() {
	return [
		["midi","midi"],
		["on_midi",LiteGraph.EVENT],
		["command","number"],
		["note","number"],
		["velocity","number"],
		["cc","number"],
		["cc_value","number"],
		["pitch","number"],
		["pitchbend","number"]
	];
}


LiteGraph.registerNodeType("midi/event", LGMIDIEvent);


function LGMIDICC()
{
	this.properties = {
//		channel: 0,
		cc: 1,
		value: 0
	};

	this.addOutput( "value", "number" );
}

LGMIDICC.title = "MIDICC";
LGMIDICC.desc = "gets a Controller Change";

LGMIDICC.prototype.onExecute = function()
{
	var props = this.properties;
	if( MIDIInterface.input )
		this.properties.value = MIDIInterface.input.state.cc[ this.properties.cc ];
	this.setOutputData( 0, this.properties.value );
}

LiteGraph.registerNodeType("midi/cc", LGMIDICC);




function now() { return window.performance.now() }

})( this );
(function( global )
{
var LiteGraph = global.LiteGraph;

var LGAudio = {};
global.LGAudio = LGAudio;

LGAudio.getAudioContext = function()
{
	if(!this._audio_context)
	{
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		if(!window.AudioContext)
		{
			console.error("AudioContext not supported by browser");
			return null;
		}
		this._audio_context = new AudioContext();	
		this._audio_context.onmessage = function(msg) { console.log("msg",msg);};
		this._audio_context.onended = function(msg) { console.log("ended",msg);};
		this._audio_context.oncomplete = function(msg) { console.log("complete",msg);};
	}

	//in case it crashes
	//if(this._audio_context.state == "suspended")
	//	this._audio_context.resume();
	return this._audio_context;
}

LGAudio.connect = function( audionodeA, audionodeB )
{
	try
	{
		audionodeA.connect( audionodeB );
	}
	catch (err)
	{
		console.warn("LGraphAudio:",err);
	}
}

LGAudio.disconnect = function( audionodeA, audionodeB )
{
	try
	{
		audionodeA.disconnect( audionodeB );
	}
	catch (err)
	{
		console.warn("LGraphAudio:",err);
	}
}

LGAudio.changeAllAudiosConnections = function( node, connect )
{
	if(node.inputs)
	{
		for(var i = 0; i < node.inputs.length; ++i)
		{
			var input = node.inputs[i];
			var link_info = node.graph.links[ input.link ];
			if(!link_info)
				continue;

			var origin_node = node.graph.getNodeById( link_info.origin_id );
			var origin_audionode = null;
			if( origin_node.getAudioNodeInOutputSlot )
				origin_audionode = origin_node.getAudioNodeInOutputSlot( link_info.origin_slot );
			else
				origin_audionode = origin_node.audionode;

			var target_audionode = null;
			if( node.getAudioNodeInInputSlot )
				target_audionode = node.getAudioNodeInInputSlot( i );
			else
				target_audionode = node.audionode;

			if(connect)
				LGAudio.connect( origin_audionode, target_audionode );
			else
				LGAudio.disconnect( origin_audionode, target_audionode );
		}
	}

	if(node.outputs)
	{
		for(var i = 0; i < node.outputs.length; ++i)
		{
			var output = node.outputs[i];
			for(var j = 0; j < output.links.length; ++j)
			{
				var link_info = node.graph.links[ output.links[j] ];
				if(!link_info)
					continue;

				var origin_audionode = null;
				if( node.getAudioNodeInOutputSlot )
					origin_audionode = node.getAudioNodeInOutputSlot( i );
				else
					origin_audionode = node.audionode;

				var target_node = node.graph.getNodeById( link_info.target_id );
				var target_audionode = null;
				if( target_node.getAudioNodeInInputSlot )
					target_audionode = target_node.getAudioNodeInInputSlot( link_info.target_slot );
				else
					target_audionode = target_node.audionode;

				if(connect)
					LGAudio.connect( origin_audionode, target_audionode );
				else
					LGAudio.disconnect( origin_audionode, target_audionode );
			}
		}
	}
}

//used by many nodes
LGAudio.onConnectionsChange = function( connection, slot, connected, link_info )
{
	//only process the outputs events
	if(connection != LiteGraph.OUTPUT)
		return;

	var target_node = null;
	if( link_info )
		target_node = this.graph.getNodeById( link_info.target_id );

	if( !target_node )
		return;

	//get origin audionode
	var local_audionode = null;
	if(this.getAudioNodeInOutputSlot)
		local_audionode = this.getAudioNodeInOutputSlot( slot );
	else
		local_audionode = this.audionode;

	//get target audionode
	var target_audionode = null;
	if(target_node.getAudioNodeInInputSlot)
		target_audionode = target_node.getAudioNodeInInputSlot( link_info.target_slot );
	else
		target_audionode = target_node.audionode;

	//do the connection/disconnection
	if( connected )	
		LGAudio.connect( local_audionode, target_audionode );
	else
		LGAudio.disconnect( local_audionode, target_audionode );
}

//this function helps creating wrappers to existing classes
LGAudio.createAudioNodeWrapper = function( class_object )
{
	var old_func = class_object.prototype.onPropertyChanged;

	class_object.prototype.onPropertyChanged = function(name, value)
	{
		if(old_func)
			old_func.call(this,name,value);

		if(!this.audionode)
			return;

		if( this.audionode[ name ] === undefined )
			return;

		if( this.audionode[ name ].value !== undefined )
			this.audionode[ name ].value = value;
		else
			this.audionode[ name ] = value;
	}

	class_object.prototype.onConnectionsChange = LGAudio.onConnectionsChange;
}

//contains the samples decoded of the loaded audios in AudioBuffer format
LGAudio.cached_audios = {};

LGAudio.loadSound = function( url, on_complete, on_error )
{
	if( LGAudio.cached_audios[ url ] && url.indexOf("blob:") == -1 )
	{
		if(on_complete)
			on_complete( LGAudio.cached_audios[ url ] );
		return;
	}

	if( LGAudio.onProcessAudioURL )
		url = LGAudio.onProcessAudioURL( url );

	//load new sample
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';

	var context = LGAudio.getAudioContext();

	// Decode asynchronously
	request.onload = function() {
		console.log("AudioSource loaded");
		context.decodeAudioData( request.response, function( buffer ) {
			console.log("AudioSource decoded");
			LGAudio.cached_audios[ url ] = buffer;
			if(on_complete)
				on_complete( buffer );
		}, onError);
	}
	request.send();

	function onError(err)
	{
		console.log("Audio loading sample error:",err);
		if(on_error)
			on_error(err);
	}

	return request;
}


//****************************************************

function LGAudioSource()
{
	this.properties = {
		src: "",
		gain: 0.5,
		loop: true,
		autoplay: true,
		playbackRate: 1
	};

	this._loading_audio = false;
	this._audiobuffer = null; //points to AudioBuffer with the audio samples decoded
	this._audionodes = [];
	this._last_sourcenode = null; //the last AudioBufferSourceNode (there could be more if there are several sounds playing)

	this.addOutput( "out", "audio" );
	this.addInput( "gain", "number" );

	//init context
	var context = LGAudio.getAudioContext();

	//create gain node to control volume
	this.audionode = context.createGain();
	this.audionode.graphnode = this;
	this.audionode.gain.value = this.properties.gain;

	//debug
	if(this.properties.src)
		this.loadSound( this.properties.src );
}

LGAudioSource["@src"] = { widget: "resource" };
LGAudioSource.supported_extensions = ["wav","ogg","mp3"];


LGAudioSource.prototype.onAdded = function(graph)
{
	if(graph.status === LGraph.STATUS_RUNNING)
		this.onStart();
}

LGAudioSource.prototype.onStart = function()
{
	if(!this._audiobuffer)
		return;

	if(this.properties.autoplay)
		this.playBuffer( this._audiobuffer );
}

LGAudioSource.prototype.onStop = function()
{
	this.stopAllSounds();
}

LGAudioSource.prototype.onPause = function()
{
	this.pauseAllSounds();
}

LGAudioSource.prototype.onUnpause = function()
{
	this.unpauseAllSounds();
	//this.onStart();
}


LGAudioSource.prototype.onRemoved = function()
{
	this.stopAllSounds();
	if(this._dropped_url)
		URL.revokeObjectURL( this._url );
}

LGAudioSource.prototype.stopAllSounds = function()
{
	//iterate and stop
	for(var i = 0; i < this._audionodes.length; ++i )
	{
		if(this._audionodes[i].started)
		{
			this._audionodes[i].started = false;
			this._audionodes[i].stop();
		}
		//this._audionodes[i].disconnect( this.audionode );
	}
	this._audionodes.length = 0;
}

LGAudioSource.prototype.pauseAllSounds = function()
{
	LGAudio.getAudioContext().suspend();
}

LGAudioSource.prototype.unpauseAllSounds = function()
{
	LGAudio.getAudioContext().resume();
}

LGAudioSource.prototype.onExecute = function()
{
	if(this.inputs)
		for(var i = 0; i < this.inputs.length; ++i)
		{
			var input = this.inputs[i];
			if(input.link == null)
				continue;
			var v = this.getInputData(i);
			if( v === undefined )
				continue;
			if( input.name == "gain" )
				this.audionode.gain.value = v;
			else if( input.name == "playbackRate" )
			{
				this.properties.playbackRate = v;
				for(var j = 0; j < this._audionodes.length; ++j)
					this._audionodes[j].playbackRate.value = v;
			}
		}

	if(this.outputs)
		for(var i = 0; i < this.outputs.length; ++i)
		{
			var output = this.outputs[i];
			if( output.name == "buffer" && this._audiobuffer )
				this.setOutputData( i, this._audiobuffer );
		}
}

LGAudioSource.prototype.onAction = function(event)
{
	if(this._audiobuffer)
	{
		if(event == "Play")
			this.playBuffer(this._audiobuffer);
		else if(event == "Stop")
			this.stopAllSounds();
	}
}

LGAudioSource.prototype.onPropertyChanged = function( name, value )
{
	if( name == "src" ) 
		this.loadSound( value );
	else if(name == "gain")
		this.audionode.gain.value = value;
	else if(name == "playbackRate")
	{
		for(var j = 0; j < this._audionodes.length; ++j)
			this._audionodes[j].playbackRate.value = value;
	}
}

LGAudioSource.prototype.playBuffer = function( buffer )
{
	var that = this;
	var context = LGAudio.getAudioContext();

	//create a new audionode (this is mandatory, AudioAPI doesnt like to reuse old ones)
	var audionode = context.createBufferSource(); //create a AudioBufferSourceNode
	this._last_sourcenode = audionode;
	audionode.graphnode = this;
	audionode.buffer = buffer;
	audionode.loop = this.properties.loop;
	audionode.playbackRate.value = this.properties.playbackRate;
	this._audionodes.push( audionode );
	audionode.connect( this.audionode ); //connect to gain
	this._audionodes.push( audionode );

	audionode.onended = function()
	{
		//console.log("ended!");
		that.trigger("ended");
		//remove
		var index = that._audionodes.indexOf( audionode );
		if(index != -1)
			that._audionodes.splice(index,1);
	}

	if(!audionode.started)
	{
		audionode.started = true;
		audionode.start();
	}
	return audionode;
}

LGAudioSource.prototype.loadSound = function( url )
{
	var that = this;

	//kill previous load
	if(this._request)
	{
		this._request.abort();
		this._request = null;
	}

	this._audiobuffer = null; //points to the audiobuffer once the audio is loaded
	this._loading_audio = false;

	if(!url)
		return;

	this._request = LGAudio.loadSound( url, inner );

	this._loading_audio = true;
	this.boxcolor = "#AA4";

	function inner( buffer )
	{
		this.boxcolor = LiteGraph.NODE_DEFAULT_BOXCOLOR;
		that._audiobuffer = buffer;
		that._loading_audio = false;
		//if is playing, then play it
		if(that.graph && that.graph.status === LGraph.STATUS_RUNNING)
			that.onStart(); //this controls the autoplay already
	}
}

//Helps connect/disconnect AudioNodes when new connections are made in the node
LGAudioSource.prototype.onConnectionsChange = LGAudio.onConnectionsChange;

LGAudioSource.prototype.onGetInputs = function()
{
	return [["playbackRate","number"],["Play",LiteGraph.ACTION],["Stop",LiteGraph.ACTION]];
}

LGAudioSource.prototype.onGetOutputs = function()
{
	return [["buffer","audiobuffer"],["ended",LiteGraph.EVENT]];
}

LGAudioSource.prototype.onDropFile = function(file)
{
	if(this._dropped_url)
		URL.revokeObjectURL( this._dropped_url );
	var url = URL.createObjectURL( file );
	this.properties.src = url;
	this.loadSound( url );
	this._dropped_url = url;
}


LGAudioSource.title = "Source";
LGAudioSource.desc = "Plays audio";
LiteGraph.registerNodeType("audio/source", LGAudioSource);


//****************************************************

function LGAudioMediaSource()
{
	this.properties = {
		gain: 0.5
	};

	this._audionodes = [];
	this._media_stream = null;

	this.addOutput( "out", "audio" );
	this.addInput( "gain", "number" );

	//create gain node to control volume
	var context = LGAudio.getAudioContext();
	this.audionode = context.createGain();
	this.audionode.graphnode = this;
	this.audionode.gain.value = this.properties.gain;
}


LGAudioMediaSource.prototype.onAdded = function(graph)
{
	if(graph.status === LGraph.STATUS_RUNNING)
		this.onStart();
}

LGAudioMediaSource.prototype.onStart = function()
{
	if(this._media_stream == null && !this._waiting_confirmation)
		this.openStream();
}

LGAudioMediaSource.prototype.onStop = function()
{
	this.audionode.gain.value = 0;
}

LGAudioMediaSource.prototype.onPause = function()
{
	this.audionode.gain.value = 0;
}

LGAudioMediaSource.prototype.onUnpause = function()
{
	this.audionode.gain.value = this.properties.gain;
}

LGAudioMediaSource.prototype.onRemoved = function()
{
	this.audionode.gain.value = 0;
	if( this.audiosource_node )
	{
		this.audiosource_node.disconnect( this.audionode );
		this.audiosource_node = null;
	}
	if(this._media_stream)
	{
		var tracks = this._media_stream.getTracks();
		if(tracks.length)
			tracks[0].stop();
	}
}

LGAudioMediaSource.prototype.openStream = function()
{
	if (!navigator.mediaDevices) {
	  console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
	  return;
	}

	this._waiting_confirmation = true;

	// Not showing vendor prefixes.
	navigator.mediaDevices.getUserMedia({audio: true, video: false}).then( this.streamReady.bind(this) ).catch( onFailSoHard );

	var that = this;
	function onFailSoHard(err) {
		console.log('Media rejected', err);
		that._media_stream = false;
		that.boxcolor = "red";
	};
}

LGAudioMediaSource.prototype.streamReady = function( localMediaStream )
{
	this._media_stream = localMediaStream;
	//this._waiting_confirmation = false;

	//init context
	if( this.audiosource_node )
		this.audiosource_node.disconnect( this.audionode );
	var context = LGAudio.getAudioContext();
	this.audiosource_node = context.createMediaStreamSource( localMediaStream );
	this.audiosource_node.graphnode = this;
	this.audiosource_node.connect( this.audionode );
	this.boxcolor = "white";
}

LGAudioMediaSource.prototype.onExecute = function()
{
	if(this._media_stream == null && !this._waiting_confirmation)
		this.openStream();


	if(this.inputs)
		for(var i = 0; i < this.inputs.length; ++i)
		{
			var input = this.inputs[i];
			if(input.link == null)
				continue;
			var v = this.getInputData(i);
			if( v === undefined )
				continue;
			if( input.name == "gain" )
				this.audionode.gain.value = this.properties.gain = v;
		}
}

LGAudioMediaSource.prototype.onAction = function(event)
{
	if(event == "Play")
		this.audionode.gain.value = this.properties.gain;
	else if(event == "Stop")
		this.audionode.gain.value = 0;
}

LGAudioMediaSource.prototype.onPropertyChanged = function( name, value )
{
	if(name == "gain")
		this.audionode.gain.value = value;
}

//Helps connect/disconnect AudioNodes when new connections are made in the node
LGAudioMediaSource.prototype.onConnectionsChange = LGAudio.onConnectionsChange;

LGAudioMediaSource.prototype.onGetInputs = function()
{
	return [["playbackRate","number"],["Play",LiteGraph.ACTION],["Stop",LiteGraph.ACTION]];
}

LGAudioMediaSource.title = "MediaSource";
LGAudioMediaSource.desc = "Plays microphone";
LiteGraph.registerNodeType("audio/media_source", LGAudioMediaSource);


//*****************************************************

function LGAudioAnalyser()
{
	this.properties = {
		fftSize: 2048,
		minDecibels: -100,
		maxDecibels: -10,
		smoothingTimeConstant: 0.5
	};

	var context = LGAudio.getAudioContext();

	this.audionode = context.createAnalyser();
	this.audionode.graphnode = this;
	this.audionode.fftSize = this.properties.fftSize;
	this.audionode.minDecibels = this.properties.minDecibels;
	this.audionode.maxDecibels = this.properties.maxDecibels;
	this.audionode.smoothingTimeConstant = this.properties.smoothingTimeConstant;

	this.addInput("in","audio");
	this.addOutput("freqs","array");
	this.addOutput("samples","array");

	this._freq_bin = null;
	this._time_bin = null;
}

LGAudioAnalyser.prototype.onPropertyChanged = function(name, value)
{
	this.audionode[ name ] = value;
}

LGAudioAnalyser.prototype.onExecute = function()
{
	if(this.isOutputConnected(0))
	{
		//send FFT
		var bufferLength = this.audionode.frequencyBinCount;
		if( !this._freq_bin || this._freq_bin.length != bufferLength )
			this._freq_bin = new Uint8Array( bufferLength );
		this.audionode.getByteFrequencyData( this._freq_bin );
		this.setOutputData(0,this._freq_bin);
	}

	//send analyzer
	if(this.isOutputConnected(1))
	{
		//send Samples
		var bufferLength = this.audionode.frequencyBinCount;
		if( !this._time_bin || this._time_bin.length != bufferLength )
			this._time_bin = new Uint8Array( bufferLength );
		this.audionode.getByteTimeDomainData( this._time_bin );
		this.setOutputData(1,this._time_bin);
	}


	//properties
	for(var i = 1; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
		if(input.link == null)
			continue;
		var v = this.getInputData(i);
		if (v !== undefined)
			this.audionode[ input.name ].value = v;
	}



	//time domain
	//this.audionode.getFloatTimeDomainData( dataArray );
}

LGAudioAnalyser.prototype.onGetInputs = function()
{
	return [["minDecibels","number"],["maxDecibels","number"],["smoothingTimeConstant","number"]];
}

LGAudioAnalyser.prototype.onGetOutputs = function()
{
	return [["freqs","array"],["samples","array"]];
}


LGAudioAnalyser.title = "Analyser";
LGAudioAnalyser.desc = "Audio Analyser";
LiteGraph.registerNodeType( "audio/analyser", LGAudioAnalyser );

//*****************************************************

function LGAudioGain()
{
	//default 
	this.properties = {
		gain: 1
	};

	this.audionode = LGAudio.getAudioContext().createGain();
	this.addInput("in","audio");
	this.addInput("gain","number");
	this.addOutput("out","audio");
}

LGAudioGain.prototype.onExecute = function()
{
	if(!this.inputs || !this.inputs.length)
		return;

	for(var i = 1; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
		var v = this.getInputData(i);
		if(v !== undefined)
			this.audionode[ input.name ].value = v;
	}
}

LGAudio.createAudioNodeWrapper( LGAudioGain );

LGAudioGain.title = "Gain";
LGAudioGain.desc = "Audio gain";
LiteGraph.registerNodeType("audio/gain", LGAudioGain);


function LGAudioConvolver()
{
	//default 
	this.properties = {
		impulse_src:"",
		normalize: true
	};

	this.audionode = LGAudio.getAudioContext().createConvolver();
	this.addInput("in","audio");
	this.addOutput("out","audio");
}

LGAudio.createAudioNodeWrapper( LGAudioConvolver );

LGAudioConvolver.prototype.onRemove = function()
{
	if(this._dropped_url)
		URL.revokeObjectURL( this._dropped_url );
}

LGAudioConvolver.prototype.onPropertyChanged = function( name, value )
{
	if( name == "impulse_src" ) 
		this.loadImpulse( value );
	else if( name == "normalize" ) 
		this.audionode.normalize = value;
}

LGAudioConvolver.prototype.onDropFile = function(file)
{
	if(this._dropped_url)
		URL.revokeObjectURL( this._dropped_url );
	this._dropped_url = URL.createObjectURL( file );
	this.properties.impulse_src = this._dropped_url;
	this.loadImpulse( this._dropped_url );
}

LGAudioConvolver.prototype.loadImpulse = function( url )
{
	var that = this;

	//kill previous load
	if(this._request)
	{
		this._request.abort();
		this._request = null;
	}

	this._impulse_buffer = null;
	this._loading_impulse = false;

	if(!url)
		return;

	//load new sample
	this._request = LGAudio.loadSound( url, inner );
	this._loading_impulse = true;

	// Decode asynchronously
	function inner( buffer ) {
			that._impulse_buffer = buffer;
			that.audionode.buffer = buffer;
			console.log("Impulse signal set");
			that._loading_impulse = false;
	}
}

LGAudioConvolver.title = "Convolver";
LGAudioConvolver.desc = "Convolves the signal (used for reverb)";
LiteGraph.registerNodeType("audio/convolver", LGAudioConvolver);


function LGAudioDynamicsCompressor()
{
	//default 
	this.properties = {
		threshold: -50,
		knee: 40,
		ratio: 12,
		reduction: -20,
		attack: 0,
		release: 0.25
	};

	this.audionode = LGAudio.getAudioContext().createDynamicsCompressor();
	this.addInput("in","audio");
	this.addOutput("out","audio");
}

LGAudio.createAudioNodeWrapper( LGAudioDynamicsCompressor );

LGAudioDynamicsCompressor.prototype.onExecute = function()
{
	if(!this.inputs || !this.inputs.length)
		return;
	for(var i = 1; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
		if(input.link == null)
			continue;
		var v = this.getInputData(i);
		if(v !== undefined)
			this.audionode[ input.name ].value = v;
	}
}

LGAudioDynamicsCompressor.prototype.onGetInputs = function()
{
	return [["threshold","number"],["knee","number"],["ratio","number"],["reduction","number"],["attack","number"],["release","number"]];
}

LGAudioDynamicsCompressor.title = "DynamicsCompressor";
LGAudioDynamicsCompressor.desc = "Dynamics Compressor";
LiteGraph.registerNodeType("audio/dynamicsCompressor", LGAudioDynamicsCompressor);


function LGAudioWaveShaper()
{
	//default 
	this.properties = {
	};

	this.audionode = LGAudio.getAudioContext().createWaveShaper();
	this.addInput("in","audio");
	this.addInput("shape","waveshape");
	this.addOutput("out","audio");
}

LGAudioWaveShaper.prototype.onExecute = function()
{
	if(!this.inputs || !this.inputs.length)
		return;
	var v = this.getInputData(1);
	if(v === undefined)
		return;
	this.audionode.curve = v;
}

LGAudioWaveShaper.prototype.setWaveShape = function(shape)
{
	this.audionode.curve = shape;
}

LGAudio.createAudioNodeWrapper( LGAudioWaveShaper );

/* disabled till I dont find a way to do a wave shape
LGAudioWaveShaper.title = "WaveShaper";
LGAudioWaveShaper.desc = "Distortion using wave shape";
LiteGraph.registerNodeType("audio/waveShaper", LGAudioWaveShaper);
*/

function LGAudioMixer()
{
	//default 
	this.properties = {
		gain1: 0.5,
		gain2: 0.5
	};

	this.audionode = LGAudio.getAudioContext().createGain();

	this.audionode1 = LGAudio.getAudioContext().createGain();
	this.audionode1.gain.value = this.properties.gain1;
	this.audionode2 = LGAudio.getAudioContext().createGain();
	this.audionode2.gain.value = this.properties.gain2;

	this.audionode1.connect( this.audionode );
	this.audionode2.connect( this.audionode );

	this.addInput("in1","audio");
	this.addInput("in1 gain","number");
	this.addInput("in2","audio");
	this.addInput("in2 gain","number");

	this.addOutput("out","audio");
}

LGAudioMixer.prototype.getAudioNodeInInputSlot = function( slot )
{
	if(slot == 0)
		return this.audionode1;
	else if(slot == 2)
		return this.audionode2;
}

LGAudioMixer.prototype.onPropertyChanged = function( name, value )
{
	if( name == "gain1" ) 
		this.audionode1.gain.value = value;
	else if( name == "gain2" ) 
		this.audionode2.gain.value = value;
}


LGAudioMixer.prototype.onExecute = function()
{
	if(!this.inputs || !this.inputs.length)
		return;

	for(var i = 1; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];

		if(input.link == null || input.type == "audio")
			continue;

		var v = this.getInputData(i);
		if(v === undefined)
			continue;

		if(i == 1)
			this.audionode1.gain.value = v;
		else if(i == 3)
			this.audionode2.gain.value = v;
	}
}

LGAudio.createAudioNodeWrapper( LGAudioMixer );

LGAudioMixer.title = "Mixer";
LGAudioMixer.desc = "Audio mixer";
LiteGraph.registerNodeType("audio/mixer", LGAudioMixer);


function LGAudioDelay()
{
	//default 
	this.properties = {
		delayTime: 0.5
	};

	this.audionode = LGAudio.getAudioContext().createDelay( 10 );
	this.audionode.delayTime.value = this.properties.delayTime;
	this.addInput("in","audio");
	this.addInput("time","number");
	this.addOutput("out","audio");
}

LGAudio.createAudioNodeWrapper( LGAudioDelay );

LGAudioDelay.prototype.onExecute = function()
{
	var v = this.getInputData(1);
	if(v !== undefined )
		this.audionode.delayTime.value = v;
}

LGAudioDelay.title = "Delay";
LGAudioDelay.desc = "Audio delay";
LiteGraph.registerNodeType("audio/delay", LGAudioDelay);


function LGAudioBiquadFilter()
{
	//default 
	this.properties = {
		frequency: 350,
		detune: 0,
		Q: 1
	};
	this.addProperty("type","lowpass","enum",{values:["lowpass","highpass","bandpass","lowshelf","highshelf","peaking","notch","allpass"]});	

	//create node
	this.audionode = LGAudio.getAudioContext().createBiquadFilter();

	//slots
	this.addInput("in","audio");
	this.addOutput("out","audio");
}

LGAudioBiquadFilter.prototype.onExecute = function()
{
	if(!this.inputs || !this.inputs.length)
		return;

	for(var i = 1; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
		if(input.link == null)
			continue;
		var v = this.getInputData(i);
		if(v !== undefined)
			this.audionode[ input.name ].value = v;
	}
}

LGAudioBiquadFilter.prototype.onGetInputs = function()
{
	return [["frequency","number"],["detune","number"],["Q","number"]];
}

LGAudio.createAudioNodeWrapper( LGAudioBiquadFilter );

LGAudioBiquadFilter.title = "BiquadFilter";
LGAudioBiquadFilter.desc = "Audio filter";
LiteGraph.registerNodeType("audio/biquadfilter", LGAudioBiquadFilter);




function LGAudioOscillatorNode()
{
	//default 
	this.properties = {
		frequency: 440,
		detune: 0,
		type: "sine"
	};
	this.addProperty("type","sine","enum",{values:["sine","square","sawtooth","triangle","custom"]});	

	//create node
	this.audionode = LGAudio.getAudioContext().createOscillator();

	//slots
	this.addOutput("out","audio");
}

LGAudioOscillatorNode.prototype.onStart = function()
{
	if(!this.audionode.started)
	{
		this.audionode.started = true;
		this.audionode.start();
	}
}

LGAudioOscillatorNode.prototype.onStop = function()
{
	if(this.audionode.started)
	{
		this.audionode.started = false;
		this.audionode.stop();
	}
}

LGAudioOscillatorNode.prototype.onPause = function()
{
	this.onStop();
}

LGAudioOscillatorNode.prototype.onUnpause = function()
{
	this.onStart();
}

LGAudioOscillatorNode.prototype.onExecute = function()
{
	if(!this.inputs || !this.inputs.length)
		return;

	for(var i = 0; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
		if(input.link == null)
			continue;
		var v = this.getInputData(i);
		if(v !== undefined)
			this.audionode[ input.name ].value = v;
	}
}

LGAudioOscillatorNode.prototype.onGetInputs = function()
{
	return [["frequency","number"],["detune","number"],["type","string"]];
}

LGAudio.createAudioNodeWrapper( LGAudioOscillatorNode );

LGAudioOscillatorNode.title = "Oscillator";
LGAudioOscillatorNode.desc = "Oscillator";
LiteGraph.registerNodeType("audio/oscillator", LGAudioOscillatorNode);


//*****************************************************

//EXTRA 


function LGAudioVisualization()
{
	this.properties = {
		continuous: true,
		mark: -1
	};

	this.addInput("data","array");
	this.addInput("mark","number");
	this.size = [300,200];
	this._last_buffer = null;
}

LGAudioVisualization.prototype.onExecute = function()
{
	this._last_buffer = this.getInputData(0);
	var v = this.getInputData(1);
	if(v !== undefined)
		this.properties.mark = v;
	this.setDirtyCanvas(true,false);
}

LGAudioVisualization.prototype.onDrawForeground = function(ctx)
{
	if(!this._last_buffer)
		return;

	var buffer = this._last_buffer;

	//delta represents how many samples we advance per pixel
	var delta = buffer.length / this.size[0];
	var h = this.size[1];

	ctx.fillStyle = "black";
	ctx.fillRect(0,0,this.size[0],this.size[1]);
	ctx.strokeStyle = "white";
	ctx.beginPath();
	var x = 0;

	if(this.properties.continuous)
	{
		ctx.moveTo(x,h);
		for(var i = 0; i < buffer.length; i+= delta)
		{
			ctx.lineTo(x,h - (buffer[i|0]/255) * h);
			x++;
		}
	}
	else
	{
		for(var i = 0; i < buffer.length; i+= delta)
		{
			ctx.moveTo(x+0.5,h);
			ctx.lineTo(x+0.5,h - (buffer[i|0]/255) * h);
			x++;
		}
	}
	ctx.stroke();

	if(this.properties.mark >= 0)
	{
		var samplerate = LGAudio.getAudioContext().sampleRate;
		var binfreq = samplerate / buffer.length;
		var x = 2 * (this.properties.mark / binfreq) / delta;
		if(x >= this.size[0])
			x = this.size[0]-1;
		ctx.strokeStyle = "red";
		ctx.beginPath();
		ctx.moveTo(x,h);
		ctx.lineTo(x,0);
		ctx.stroke();
	}
}

LGAudioVisualization.title = "Visualization";
LGAudioVisualization.desc = "Audio Visualization";
LiteGraph.registerNodeType("audio/visualization", LGAudioVisualization);


function LGAudioBandSignal()
{
	//default 
	this.properties = {
		band: 440,
		amplitude: 1
	};

	this.addInput("freqs","array");
	this.addOutput("signal","number");
}

LGAudioBandSignal.prototype.onExecute = function()
{
	this._freqs = this.getInputData(0);
	if( !this._freqs )
		return;

	var band = this.properties.band;
	var v = this.getInputData(1);
	if(v !== undefined)
		band = v;

	var samplerate = LGAudio.getAudioContext().sampleRate;
	var binfreq = samplerate / this._freqs.length;
	var index = 2 * (band / binfreq);
	var v = 0;
	if( index < 0 )
		v = this._freqs[ 0 ];
	if( index >= this._freqs.length )
		v = this._freqs[ this._freqs.length - 1];
	else
	{
		var pos = index|0;
		var v0 = this._freqs[ pos ];
		var v1 = this._freqs[ pos+1 ];
		var f = index - pos;
		v = v0 * (1-f) + v1 * f;
	}

	this.setOutputData( 0, (v/255) * this.properties.amplitude );
}

LGAudioBandSignal.prototype.onGetInputs = function()
{
	return [["band","number"]];
}

LGAudioBandSignal.title = "Signal";
LGAudioBandSignal.desc = "extract the signal of some frequency";
LiteGraph.registerNodeType("audio/signal", LGAudioBandSignal);


function LGAudioScript()
{
	if(!LGAudioScript.default_code)
	{
		var code = LGAudioScript.default_function.toString();
		var index = code.indexOf("{")+1;
		var index2 = code.lastIndexOf("}");
		LGAudioScript.default_code = code.substr(index, index2 - index);
	}

	//default 
	this.properties = {
		code: LGAudioScript.default_code
	};

	//create node
	var ctx = LGAudio.getAudioContext();
	if(ctx.createScriptProcessor)
		this.audionode = ctx.createScriptProcessor(4096,1,1); //buffer size, input channels, output channels
	else
	{
		console.warn("ScriptProcessorNode deprecated");
		this.audionode = ctx.createGain(); //bypass audio
	}

	this.processCode();
	if(!LGAudioScript._bypass_function)
		LGAudioScript._bypass_function = this.audionode.onaudioprocess;

	//slots
	this.addInput("in","audio");
	this.addOutput("out","audio");
}

LGAudioScript.prototype.onAdded = function( graph )
{
	if(graph.status == LGraph.STATUS_RUNNING)
		this.audionode.onaudioprocess = this._callback;
}

LGAudioScript["@code"] = { widget: "code" };

LGAudioScript.prototype.onStart = function()
{
	this.audionode.onaudioprocess = this._callback;
}

LGAudioScript.prototype.onStop = function()
{
	this.audionode.onaudioprocess = LGAudioScript._bypass_function;
}

LGAudioScript.prototype.onPause = function()
{
	this.audionode.onaudioprocess = LGAudioScript._bypass_function;
}

LGAudioScript.prototype.onUnpause = function()
{
	this.audionode.onaudioprocess = this._callback;
}

LGAudioScript.prototype.onExecute = function()
{
	//nothing! because we need an onExecute to receive onStart... fix that
}

LGAudioScript.prototype.onRemoved = function()
{
	this.audionode.onaudioprocess = LGAudioScript._bypass_function;
}

LGAudioScript.prototype.processCode = function()
{
	try
	{
		var func = new Function( "properties", this.properties.code );
		this._script = new func( this.properties );
		this._old_code = this.properties.code;
		this._callback = this._script.onaudioprocess;
	}
	catch (err)
	{
		console.error("Error in onaudioprocess code",err);
		this._callback = LGAudioScript._bypass_function;
		this.audionode.onaudioprocess = this._callback;
	}
}

LGAudioScript.prototype.onPropertyChanged = function( name, value )
{
	if(name == "code")
	{
		this.properties.code = value;
		this.processCode();
		if(this.graph && this.graph.status == LGraph.STATUS_RUNNING)
			this.audionode.onaudioprocess = this._callback;
	}
}

LGAudioScript.default_function = function()
{

this.onaudioprocess = function(audioProcessingEvent) {
  // The input buffer is the song we loaded earlier
  var inputBuffer = audioProcessingEvent.inputBuffer;

  // The output buffer contains the samples that will be modified and played
  var outputBuffer = audioProcessingEvent.outputBuffer;

  // Loop through the output channels (in this case there is only one)
  for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
    var inputData = inputBuffer.getChannelData(channel);
    var outputData = outputBuffer.getChannelData(channel);

    // Loop through the 4096 samples
    for (var sample = 0; sample < inputBuffer.length; sample++) {
      // make output equal to the same as the input
      outputData[sample] = inputData[sample];
    }
  }
}

}

LGAudio.createAudioNodeWrapper( LGAudioScript );

LGAudioScript.title = "Script";
LGAudioScript.desc = "apply script to signal";
LiteGraph.registerNodeType("audio/script", LGAudioScript);


function LGAudioDestination()
{
	this.audionode = LGAudio.getAudioContext().destination;
	this.addInput("in","audio");
}


LGAudioDestination.title = "Destination";
LGAudioDestination.desc = "Audio output";
LiteGraph.registerNodeType("audio/destination", LGAudioDestination);




})( this );
//event related nodes
(function(global){
var LiteGraph = global.LiteGraph;

function LGWebSocket()
{
	this.size = [60,20];
	this.addInput("send", LiteGraph.ACTION);
	this.addOutput("received", LiteGraph.EVENT);
	this.addInput("in", 0 );
	this.addOutput("out", 0 );
	this.properties = {
		url: "",
		room: "lgraph" //allows to filter messages
	};
	this._ws = null;
	this._last_data = [];
}

LGWebSocket.title = "WebSocket";
LGWebSocket.desc = "Send data through a websocket";

LGWebSocket.prototype.onPropertyChanged = function(name,value)
{
	if(name == "url")
		this.createSocket();
}

LGWebSocket.prototype.onExecute = function()
{
	if(!this._ws && this.properties.url)
		this.createSocket();

	if(!this._ws || this._ws.readyState != WebSocket.OPEN )
		return;

	var room = this.properties.room;

	for(var i = 1; i < this.inputs.length; ++i)
	{
		var data = this.getInputData(i);
		if(data != null)
		{
			var json;
			try
			{
				json = JSON.stringify({ type: 0, room: room, channel: i, data: data });
			}
			catch (err)
			{
				continue;
			}
			this._ws.send( json );
		}
	}

	for(var i = 1; i < this.outputs.length; ++i)
		this.setOutputData( i, this._last_data[i] );
}

LGWebSocket.prototype.createSocket = function()
{
	var that = this;
	var url = this.properties.url;
	if( url.substr(0,2) != "ws" )
		url = "ws://" + url;
	this._ws = new WebSocket( url );
	this._ws.onopen = function()
	{
		console.log("ready");
		that.boxcolor = "#8E8";
	}
	this._ws.onmessage = function(e)
	{
		var data = JSON.parse( e.data );
		if( data.room && data.room != this.properties.room )
			return;
		if( e.data.type == 1 )
			that.triggerSlot( 0, data );
		else
			that._last_data[ e.data.channel || 0 ] = data.data;
	}
	this._ws.onerror = function(e)
	{
		console.log("couldnt connect to websocket");
		that.boxcolor = "#E88";
	}
	this._ws.onclose = function(e)
	{
		console.log("connection closed");
		that.boxcolor = "#000";
	}
}

LGWebSocket.prototype.send = function(data)
{
	if(!this._ws || this._ws.readyState != WebSocket.OPEN )
		return;
	this._ws.send( JSON.stringify({ type:1, msg: data }) );
}

LGWebSocket.prototype.onAction = function( action, param )
{
	if(!this._ws || this._ws.readyState != WebSocket.OPEN )
		return;
	this._ws.send( { type: 1, room: this.properties.room, action: action, data: param } );
}

LGWebSocket.prototype.onGetInputs = function()
{
	return [["in",0]];
}

LGWebSocket.prototype.onGetOutputs = function()
{
	return [["out",0]];
}

LiteGraph.registerNodeType("network/websocket", LGWebSocket );


//It is like a websocket but using the SillyServer.js server that bounces packets back to all clients connected:
//For more information: https://github.com/jagenjo/SillyServer.js

function LGSillyClient()
{
	this.size = [60,20];
	this.addInput("send", LiteGraph.ACTION);
	this.addOutput("received", LiteGraph.EVENT);
	this.addInput("in", 0 );
	this.addOutput("out", 0 );
	this.properties = {
		url: "tamats.com:55000",
		room: "lgraph",
		save_bandwidth: true
	};

	this._server = null;
	this.createSocket();
	this._last_input_data = [];
	this._last_output_data = [];
}

LGSillyClient.title = "SillyClient";
LGSillyClient.desc = "Connects to SillyServer to broadcast messages";

LGSillyClient.prototype.onPropertyChanged = function(name,value)
{
	var final_url = (this.properties.url + "/" + this.properties.room);
	if(this._server && this._final_url != final_url )
	{
		this._server.connect( this.properties.url, this.properties.room );
		this._final_url = final_url;
	}
}

LGSillyClient.prototype.onExecute = function()
{
	if(!this._server || !this._server.is_connected)
		return;

	var save_bandwidth = this.properties.save_bandwidth;

	for(var i = 1; i < this.inputs.length; ++i)
	{
		var data = this.getInputData(i);
		if(data != null)
		{
			if( save_bandwidth && this._last_input_data[i] == data )
				continue;
			this._server.sendMessage( { type: 0, channel: i, data: data } );
			this._last_input_data[i] = data;
		}
	}

	for(var i = 1; i < this.outputs.length; ++i)
		this.setOutputData( i, this._last_output_data[i] );
}

LGSillyClient.prototype.createSocket = function()
{
	var that = this;
	if(typeof(SillyClient) == "undefined")
	{
		if(!this._error)
			console.error("SillyClient node cannot be used, you must include SillyServer.js");
		this._error = true;
		return;
	}

	this._server = new SillyClient();
	this._server.on_ready = function()
	{
		console.log("ready");
		that.boxcolor = "#8E8";
	}
	this._server.on_message = function(id,msg)
	{
		var data = null;
		try
		{
			data = JSON.parse( msg );
		}
		catch (err)
		{
			return;
		}
		
		if(data.type == 1)
			that.triggerSlot( 0, data );
		else
			that._last_output_data[ data.channel || 0 ] = data.data;
	}
	this._server.on_error = function(e)
	{
		console.log("couldnt connect to websocket");
		that.boxcolor = "#E88";
	}
	this._server.on_close = function(e)
	{
		console.log("connection closed");
		that.boxcolor = "#000";
	}

	if(this.properties.url && this.properties.room)
	{
		this._server.connect( this.properties.url, this.properties.room );
		this._final_url = (this.properties.url + "/" + this.properties.room);
	}
}

LGSillyClient.prototype.send = function(data)
{
	if(!this._server || !this._server.is_connected)
		return;
	this._server.sendMessage( { type:1, data: data } );
}

LGSillyClient.prototype.onAction = function( action, param )
{
	if(!this._server || !this._server.is_connected)
		return;
	this._server.sendMessage( { type: 1, action: action, data: param } );
}

LGSillyClient.prototype.onGetInputs = function()
{
	return [["in",0]];
}

LGSillyClient.prototype.onGetOutputs = function()
{
	return [["out",0]];
}

LiteGraph.registerNodeType("network/sillyclient", LGSillyClient );


})(this);
