//packer version

// *************************************************************
//   LiteGraph CLASS                                     *******
// *************************************************************

/**
* The Global Scope. It contains all the registered node classes.
*
* @class LiteGraph
* @constructor
*/

var LiteGraph = {

	NODE_TITLE_HEIGHT: 16,
	NODE_SLOT_HEIGHT: 15,
	NODE_WIDTH: 140,
	NODE_MIN_WIDTH: 50,
	NODE_COLLAPSED_RADIUS: 10,
	NODE_COLLAPSED_WIDTH: 80,
	CANVAS_GRID_SIZE: 10,
	NODE_DEFAULT_COLOR: "#999",
	NODE_DEFAULT_BGCOLOR: "#444",
	NODE_DEFAULT_BOXCOLOR: "#AEF",
	NODE_DEFAULT_SHAPE: "box",
	MAX_NUMBER_OF_NODES: 1000, //avoid infinite loops
	DEFAULT_POSITION: [100,100],//default node position
	node_images_path: "",

	debug: false,
	throw_errors: true,
	registered_node_types: {},

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

		var pos = type.lastIndexOf("/");
		base_class.category = type.substr(0,pos);
		//info.name = name.substr(pos+1,name.length - pos);

		//extend class
		if(base_class.prototype) //is a class
			for(var i in LGraphNode.prototype)
				if(!base_class.prototype[i])
					base_class.prototype[i] = LGraphNode.prototype[i];

		this.registered_node_types[ type ] = base_class;
	},

	/**
	* Create a node of a given type with a name. The node is not attached to any graph yet.
	* @method createNode
	* @param {String} type full name of the node class. p.e. "math/sin"
	* @param {String} name a name to distinguish from other nodes
	* @param {Object} options to set options
	*/

	createNode: function(type, title, options)
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

		var node = new base_class( name );

		node.type = type;
		if(!node.title) node.title = title;
		if(!node.flags) node.flags = {};
		if(!node.size) node.size = node.computeSize();
		if(!node.pos) node.pos = LiteGraph.DEFAULT_POSITION.concat();

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

	getNodeTypesInCategory: function(category)
	{
		var r = [];
		for(var i in this.registered_node_types)
			if(category == "")
			{
				if (this.registered_node_types[i].category == null)
					r.push(this.registered_node_types[i]);
			}
			else if (this.registered_node_types[i].category == category)
				r.push(this.registered_node_types[i]);

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
	}
};

if(typeof(performance) != "undefined")
  LiteGraph.getTime = function getTime() { return performance.now(); }
else
  LiteGraph.getTime = function getTime() { return Date.now(); }




 

//*********************************************************************************
// LGraph CLASS                                  
//*********************************************************************************

/**
* LGraph is the class that contain a full graph. We instantiate one and add nodes to it, and then we can run the execution loop.
*
* @class LGraph
* @constructor
*/

function LGraph()
{
	if (LiteGraph.debug)
		console.log("Graph created");
	this.list_of_graphcanvas = null;
	this.clear();
}

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
	this.last_node_id = 0;

	//nodes
	this._nodes = [];
	this._nodes_by_id = {};

	//links
	this.last_link_id = 0;
	this.links = {}; //container with all the links

	//iterations
	this.iteration = 0;

	this.config = {
	};

	//timing
	this.globaltime = 0;
	this.runningtime = 0;
	this.fixedtime =  0;
	this.fixedtime_lapse = 0.01;
	this.elapsed_time = 0.01;
	this.starttime = 0;

	//globals
	this.global_inputs = {};
	this.global_outputs = {};

	//this.graph = {};
	this.debug = true;

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
	var pos = this.list_of_graphcanvas.indexOf(graphcanvas);
	if(pos == -1) return;
	graphcanvas.graph = null;
	this.list_of_graphcanvas.splice(pos,1);
}

/**
* Starts running this graph every interval milliseconds.
* @method start
* @param {number} interval amount of milliseconds between executions, default is 1
*/

LGraph.prototype.start = function(interval)
{
	if(this.status == LGraph.STATUS_RUNNING) return;
	this.status = LGraph.STATUS_RUNNING;

	if(this.onPlayEvent)
		this.onPlayEvent();

	this.sendEventToAllNodes("onStart");

	//launch
	this.starttime = LiteGraph.getTime();
	interval = interval || 1;
	var that = this;	

	this.execution_timer_id = setInterval( function() { 
		//execute
		that.runStep(1); 
	},interval);
}

/**
* Stops the execution loop of the graph
* @method stop execution
*/

LGraph.prototype.stop = function()
{
	if(this.status == LGraph.STATUS_STOPPED)
		return;

	this.status = LGraph.STATUS_STOPPED;

	if(this.onStopEvent)
		this.onStopEvent();

	if(this.execution_timer_id != null)
		clearInterval(this.execution_timer_id);
	this.execution_timer_id = null;

	this.sendEventToAllNodes("onStop");
}

/**
* Run N steps (cycles) of the graph
* @method runStep
* @param {number} num number of steps to run, default is 1
*/

LGraph.prototype.runStep = function(num)
{
	num = num || 1;

	var start = LiteGraph.getTime();
	this.globaltime = 0.001 * (start - this.starttime);

	try
	{
		for(var i = 0; i < num; i++)
		{
			this.sendEventToAllNodes("onExecute");
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

	var elapsed = LiteGraph.getTime() - start;
	if (elapsed == 0) elapsed = 1;
	this.elapsed_time = 0.001 * elapsed;
	this.globaltime += 0.001 * elapsed;
	this.iteration += 1;
}

/**
* Updates the graph execution order according to relevance of the nodes (nodes with only outputs have more relevance than
* nodes with only inputs.
* @method updateExecutionOrder
*/
	
LGraph.prototype.updateExecutionOrder = function()
{
	this._nodes_in_order = this.computeExecutionOrder();
}

//This is more internal, it computes the order and returns it
LGraph.prototype.computeExecutionOrder = function()
{
	var L = [];
	var S = [];
	var M = {};
	var visited_links = {}; //to avoid repeating links
	var remaining_links = {}; //to a
	
	//search for the nodes without inputs (starting nodes)
	for (var i in this._nodes)
	{
		var n = this._nodes[i];
		M[n.id] = n; //add to pending nodes

		var num = 0; //num of input connections
		if(n.inputs)
			for(var j = 0, l = n.inputs.length; j < l; j++)
				if(n.inputs[j] && n.inputs[j].link != null)
					num += 1;

		if(num == 0) //is a starting node
			S.push(n);
		else //num of input links 
			remaining_links[n.id] = num;
	}

	while(true)
	{
		if(S.length == 0)
			break;
			
		//get an starting node
		var n = S.shift();
		L.push(n); //add to ordered list
		delete M[n.id]; //remove from the pending nodes
		
		//for every output
		if(n.outputs)
			for(var i = 0; i < n.outputs.length; i++)
			{
				var output = n.outputs[i];
				//not connected
				if(output == null || output.links == null || output.links.length == 0)
					continue;

				//for every connection
				for(var j = 0; j < output.links.length; j++)
				{
					var link_id = output.links[j];
					var link = this.links[link_id];
					if(!link) continue;

					//already visited link (ignore it)
					if(visited_links[ link.id ])
						continue;

					var target_node = this.getNodeById( link.target_id );
					if(target_node == null)
					{
						visited_links[ link.id ] = true;
						continue;
					}

					visited_links[link.id] = true; //mark as visited
					remaining_links[target_node.id] -= 1; //reduce the number of links remaining
					if (remaining_links[target_node.id] == 0)
						S.push(target_node); //if no more links, then add to Starters array
				}
			}
	}
	
	//the remaining ones (loops)
	for(var i in M)
		L.push(M[i]);
		
	if(L.length != this._nodes.length && LiteGraph.debug)
		console.log("something went wrong, nodes missing");

	//save order number in the node
	for(var i in L)
		L[i].order = i;
	
	return L;
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
* @param {String} eventname the name of the event
* @param {Object} param an object containing the info
*/

LGraph.prototype.sendEventToAllNodes = function(eventname, param)
{
	var M = this._nodes_in_order ? this._nodes_in_order : this._nodes;
	for(var j in M)
		if(M[j][eventname])
			M[j][eventname](param);
}

LGraph.prototype.sendActionToCanvas = function(action, params)
{
	if(!this.list_of_graphcanvas) 
		return;

	for(var i in this.list_of_graphcanvas)
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

LGraph.prototype.add = function(node, skip_compute_order)
{
	if(!node || (node.id != -1 && this._nodes_by_id[node.id] != null))
		return; //already added

	if(this._nodes.length >= LiteGraph.MAX_NUMBER_OF_NODES)
		throw("LiteGraph: max number of nodes in a graph reached");

	//give him an id
	if(node.id == null || node.id == -1)
		node.id = this.last_node_id++;

	node.graph = this;

	this._nodes.push(node);
	this._nodes_by_id[node.id] = node;

	/*
	// rendering stuf... 
	if(node.bgImageUrl)
		node.bgImage = node.loadImage(node.bgImageUrl);
	*/

	if(node.onAdded)
		node.onAdded();

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

	node.id = -1;

	//callback
	if(node.onRemoved)
		node.onRemoved();

	node.graph = null;

	//remove from canvas render
	for(var i in this.list_of_graphcanvas)
	{
		var canvas = this.list_of_graphcanvas[i];
		if(canvas.selected_nodes[node.id])
			delete canvas.selected_nodes[node.id];
		if(canvas.node_dragged == node)
			canvas.node_dragged = null;
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
* @param {String} id
*/

LGraph.prototype.getNodeById = function(id)
{
	if(id==null) return null;
	return this._nodes_by_id[id];
}


/**
* Returns a list of nodes that matches a type
* @method findNodesByType
* @param {String} type the name of the node type
* @return {Array} a list with all the nodes of this type
*/

LGraph.prototype.findNodesByType = function(type)
{
	var r = [];
	for(var i in this._nodes)
		if(this._nodes[i].type == type)
			r.push(this._nodes[i]);
	return r;
}

/**
* Returns a list of nodes that matches a name
* @method findNodesByName
* @param {String} name the name of the node to search
* @return {Array} a list with all the nodes with this name
*/

LGraph.prototype.findNodesByTitle = function(title)
{
	var result = [];
	for (var i in this._nodes)
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
* @return {Array} a list with all the nodes that intersect this coordinate
*/

LGraph.prototype.getNodeOnPos = function(x,y, nodes_list)
{
	nodes_list = nodes_list || this._nodes;
	for (var i = nodes_list.length - 1; i >= 0; i--)
	{
		var n = nodes_list[i];
		if(n.isPointInsideNode(x,y))
			return n;
	}
	return null;
}

// ********** GLOBALS *****************

//Tell this graph has a global input of this type
LGraph.prototype.addGlobalInput = function(name, type, value)
{
	this.global_inputs[name] = { name: name, type: type, value: value };

	if(this.onGlobalInputAdded)
		this.onGlobalInputAdded(name, type);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

//assign a data to the global input
LGraph.prototype.setGlobalInputData = function(name, data)
{
	var input = this.global_inputs[name];
	if (!input)
		return;
	input.value = data;
}

//assign a data to the global input
LGraph.prototype.getGlobalInputData = function(name)
{
	var input = this.global_inputs[name];
	if (!input)
		return null;
	return input.value;
}

//rename the global input
LGraph.prototype.renameGlobalInput = function(old_name, name, data)
{
	if(!this.global_inputs[old_name])
		return false;

	if(this.global_inputs[name])
	{
		console.error("there is already one input with that name");
		return false;
	}

	this.global_inputs[name] = this.global_inputs[old_name];
	delete this.global_inputs[old_name];

	if(this.onGlobalInputRenamed)
		this.onGlobalInputRenamed(old_name, name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

LGraph.prototype.removeGlobalInput = function(name)
{
	if(!this.global_inputs[name])
		return false;

	delete this.global_inputs[name];

	if(this.onGlobalInputRemoved)
		this.onGlobalInputRemoved(name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
	return true;
}


LGraph.prototype.addGlobalOutput = function(name, type, value)
{
	this.global_outputs[name] = { name: name, type: type, value: value };

	if(this.onGlobalOutputAdded)
		this.onGlobalOutputAdded(name, type);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

//assign a data to the global output
LGraph.prototype.setGlobalOutputData = function(name, value)
{
	var output = this.global_outputs[ name ];
	if (!output)
		return;
	output.value = value;
}

//assign a data to the global input
LGraph.prototype.getGlobalOutputData = function(name)
{
	var output = this.global_outputs[name];
	if (!output)
		return null;
	return output.value;
}


//rename the global output
LGraph.prototype.renameGlobalOutput = function(old_name, name, data)
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

	if(this.onGlobalOutputRenamed)
		this.onGlobalOutputRenamed(old_name, name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
}

LGraph.prototype.removeGlobalOutput = function(name)
{
	if(!this.global_outputs[name])
		return false;
	delete this.global_outputs[name];

	if(this.onGlobalOutputRemoved)
		this.onGlobalOutputRemoved(name);

	if(this.onGlobalsChange)
		this.onGlobalsChange();
	return true;
}


/**
* Assigns a value to all the nodes that matches this name. This is used to create global variables of the node that
* can be easily accesed from the outside of the graph
* @method setInputData
* @param {String} name the name of the node
* @param {*} value value to assign to this node
*/

LGraph.prototype.setInputData = function(name,value)
{
	var m = this.findNodesByName(name);
	for(var i in m)
		m[i].setValue(value);
}

/**
* Returns the value of the first node with this name. This is used to access global variables of the graph from the outside
* @method setInputData
* @param {String} name the name of the node
* @return {*} value of the node
*/

LGraph.prototype.getOutputData = function(name)
{
	var n = this.findNodesByName(name);
	if(n.length)
		return m[0].getValue();
	return null;
}

//This feature is not finished yet, is to create graphs where nodes are not executed unless a trigger message is received

LGraph.prototype.triggerInput = function(name,value)
{
	var m = this.findNodesByName(name);
	for(var i in m)
		m[i].onTrigger(value);
}

LGraph.prototype.setCallback = function(name,func)
{
	var m = this.findNodesByName(name);
	for(var i in m)
		m[i].setTrigger(func);
}


LGraph.prototype.onConnectionChange = function()
{
	this.updateExecutionOrder();
}

/**
* returns if the graph is in live mode
* @method isLive
*/

LGraph.prototype.isLive = function()
{
	for(var i in this.list_of_graphcanvas)
	{
		var c = this.list_of_graphcanvas[i];
		if(c.live_mode) return true;
	}
	return false;
}

/* Called when something visually changed */
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
	for (var i in this._nodes)
		nodes_info.push( this._nodes[i].serialize() );

	//remove data from links, we dont want to store it
	for (var i in this.links)
		this.links[i].data = null;


	var data = {
//		graph: this.graph,

		iteration: this.iteration,
		frame: this.frame,
		last_node_id: this.last_node_id,
		last_link_id: this.last_link_id,
		links: LiteGraph.cloneObject( this.links ),

		config: this.config,
		nodes: nodes_info
	};

	return data;
}


/**
* Configure a graph from a JSON string 
* @method configure
* @param {String} str configure a graph from a JSON string
*/
LGraph.prototype.configure = function(data, keep_old)
{
	if(!keep_old)
		this.clear();

	var nodes = data.nodes;

	//copy all stored fields
	for (var i in data)
		this[i] = data[i];

	var error = false;

	//create nodes
	this._nodes = [];
	for (var i in nodes)
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
		node.configure(n_info);
	}

	this.updateExecutionOrder();
	this.setDirtyCanvas(true,true);
	return error;
}

LGraph.prototype.onNodeTrace = function(node, msg, color)
{
	//TODO
}

// *************************************************************
//   Node CLASS                                          *******
// *************************************************************

/* flags:
		+ skip_title_render
		+ clip_area
		+ unsafe_execution: not allowed for safe execution

	supported callbacks: 
		+ onAdded: when added to graph
		+ onRemoved: when removed from graph
		+ onStart:	when starts playing
		+ onStop:	when stops playing
		+ onDrawForeground: render the inside widgets inside the node
		+ onDrawBackground: render the background area inside the node (only in edit mode)
		+ onMouseDown
		+ onMouseMove
		+ onMouseUp
		+ onMouseEnter
		+ onMouseLeave
		+ onExecute: execute the node
		+ onPropertyChange: when a property is changed in the panel (return true to skip default behaviour)
		+ onGetInputs: returns an array of possible inputs
		+ onGetOutputs: returns an array of possible outputs
		+ onDblClick
		+ onSerialize
		+ onSelected
		+ onDeselected
*/

/**
* Base Class for all the node type classes
* @class LGraphNode
* @param {String} name a name for the node
*/

function LGraphNode(title)
{
	this.title = title || "Unnamed";
	this.size = [LiteGraph.NODE_WIDTH,60];
	this.graph = null;

	this.pos = [10,10];
	this.id = -1; //not know till not added
	this.type = null;

	//inputs available: array of inputs
	this.inputs = [];
	this.outputs = [];
	this.connections = [];

	//local data
	this.data = null; //persistent local data
	this.flags = {
		//skip_title_render: true,
		//unsafe_execution: false,
	};
}

/**
* configure a node from an object containing the serialized info
* @method configure
*/
LGraphNode.prototype.configure = function(info)
{
	for (var j in info)
	{
		if(j == "console") continue;

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
		this.graph.links[ link[0] ] = { id: link[0], origin_id: link[1], origin_slot: link[2], target_id: link[3], target_slot: link[4] };
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

}

/**
* serialize the content
* @method serialize
*/

LGraphNode.prototype.serialize = function()
{
	var o = {
		id: this.id,
		title: this.title,
		type: this.type,
		pos: this.pos,
		size: this.size,
		data: this.data,
		flags: LiteGraph.cloneObject(this.flags),
		inputs: this.inputs,
		outputs: this.outputs
	};

	if(this.properties)
		o.properties = LiteGraph.cloneObject(this.properties);

	if(!o.type)
		o.type = this.constructor.type;

	if(this.color)
		o.color = this.color;
	if(this.bgcolor)
		o.bgcolor = this.bgcolor;
	if(this.boxcolor)
		o.boxcolor = this.boxcolor;
	if(this.shape)
		o.shape = this.shape;

	if(this.onSerialize)
		this.onSerialize(o);

	return o;
}


/* Creates a clone of this node */
LGraphNode.prototype.clone = function()
{
	var node = LiteGraph.createNode(this.type);

	var data = this.serialize();
	delete data["id"];
	node.configure(data);

	/*
	node.size = this.size.concat();
	if(this.inputs)
		for(var i = 0, l = this.inputs.length; i < l; ++i)
		{
			if(node.findInputSlot( this.inputs[i].name ) == -1)
				node.addInput( this.inputs[i].name, this.inputs[i].type );
		}

	if(this.outputs)
		for(var i = 0, l = this.outputs.length; i < l; ++i)
		{
			if(node.findOutputSlot( this.outputs[i].name ) == -1)
				node.addOutput( this.outputs[i].name, this.outputs[i].type );
		}
	*/

	return node;
}

//reduced version of objectivize: NOT FINISHED
/*
LGraphNode.prototype.reducedObjectivize = function()
{
	var o = this.objectivize();
	
	var type = LiteGraph.getNodeType(o.type);

	if(type.title == o.title)
		delete o["title"];

	if(type.size && compareObjects(o.size,type.size))
		delete o["size"];

	if(type.properties && compareObjects(o.properties, type.properties))
		delete o["properties"];

	return o;
}
*/

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
LGraphNode.prototype.setOutputData = function(slot,data)
{
	if(!this.outputs) return;
	if(slot > -1 && slot < this.outputs.length && this.outputs[slot] && this.outputs[slot].links != null)
	{
		for(var i = 0; i < this.outputs[slot].links.length; i++)
		{
			var link_id = this.outputs[slot].links[i];
			this.graph.links[ link_id ].data = data;
		}
	}
}

/**
* retrieves the input data from one slot
* @method getInputData
* @param {number} slot
* @return {*} data
*/
LGraphNode.prototype.getInputData = function(slot)
{
	if(!this.inputs) return null;
	if(slot < this.inputs.length && this.inputs[slot].link != null)
		return this.graph.links[ this.inputs[slot].link ].data;
	return null;
}

/**
* tells you if there is a connection in one input slot
* @method isInputConnected
* @param {number} slot
* @return {boolean} 
*/
LGraphNode.prototype.isInputConnected = function(slot)
{
	if(!this.inputs) return null;
	return (slot < this.inputs.length && this.inputs[slot].link != null);
}

/**
* tells you info about an input connection (which node, type, etc)
* @method getInputInfo
* @param {number} slot
* @return {Object} 
*/
LGraphNode.prototype.getInputInfo = function(slot)
{
	if(!this.inputs) return null;
	if(slot < this.inputs.length)
		return this.inputs[slot];
	return null;
}


/**
* tells you info about an output connection (which node, type, etc)
* @method getOutputInfo
* @param {number} slot
* @return {Object} 
*/
LGraphNode.prototype.getOutputInfo = function(slot)
{
	if(!this.outputs) return null;
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
	if(!this.outputs) return null;
	return (slot < this.outputs.length && this.outputs[slot].links && this.outputs[slot].links.length);
}

/**
* retrieves all the nodes connected to this output slot
* @method getOutputNodes
* @param {number} slot
* @return {array} 
*/
LGraphNode.prototype.getOutputNodes = function(slot)
{
	if(!this.outputs || this.outputs.length == 0) return null;
	if(slot < this.outputs.length)
	{
		var output = this.outputs[slot];
		var r = [];
		for(var i = 0; i < output.length; i++)
			r.push( this.graph.getNodeById( output.links[i].target_id ));
		return r;
	}
	return null;
}

LGraphNode.prototype.triggerOutput = function(slot,param)
{
	var n = this.getOutputNode(slot);
	if(n && n.onTrigger)
		n.onTrigger(param);
}

//connections

/**
* add a new output slot to use in this node
* @method addOutput
* @param {string} name
* @param {string} type string defining the output type ("vec3","number",...)
* @param {Object} extra_info this can be used to have special properties of an output (special color, position, etc)
*/
LGraphNode.prototype.addOutput = function(name,type,extra_info)
{
	var o = {name:name,type:type,links:null};
	if(extra_info)
		for(var i in extra_info)
			o[i] = extra_info[i];

	if(!this.outputs) this.outputs = [];
	this.outputs.push(o);
	if(this.onOutputAdded)
		this.onOutputAdded(o);
	this.size = this.computeSize();
}

/**
* add a new output slot to use in this node
* @method addOutputs
* @param {Array} array of triplets like [[name,type,extra_info],[...]]
*/
LGraphNode.prototype.addOutputs = function(array)
{
	for(var i in array)
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
	this.size = this.computeSize();
	if(this.onOutputRemoved)
		this.onOutputRemoved(slot);
}

/**
* add a new input slot to use in this node
* @method addInput
* @param {string} name
* @param {string} type string defining the input type ("vec3","number",...)
* @param {Object} extra_info this can be used to have special properties of an input (special color, position, etc)
*/
LGraphNode.prototype.addInput = function(name,type,extra_info)
{
	var o = {name:name,type:type,link:null};
	if(extra_info)
		for(var i in extra_info)
			o[i] = extra_info[i];

	if(!this.inputs) this.inputs = [];
	this.inputs.push(o);
	this.size = this.computeSize();
	if(this.onInputAdded)
		this.onInputAdded(o);
}

/**
* add several new input slots in this node
* @method addInputs
* @param {Array} array of triplets like [[name,type,extra_info],[...]]
*/
LGraphNode.prototype.addInputs = function(array)
{
	for(var i in array)
	{
		var info = array[i];
		var o = {name:info[0],type:info[1],link:null};
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
	this.size = this.computeSize();
	if(this.onInputRemoved)
		this.onInputRemoved(slot);
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
	this.connections.push( {name:name,type:type,pos:pos,direction:direction,links:null});
}

/**
* computes the size of a node according to its inputs and output slots
* @method computeSize
* @param {number} minHeight
* @return {number} the total size
*/
LGraphNode.prototype.computeSize = function(minHeight)
{
	var rows = Math.max( this.inputs ? this.inputs.length : 1, this.outputs ? this.outputs.length : 1);
	var size = [0,0];
	size[1] = rows * 14 + 6;
	if(!this.inputs || this.inputs.length == 0 || !this.outputs || this.outputs.length == 0)
		size[0] = LiteGraph.NODE_WIDTH * 0.5;
	else
		size[0] = LiteGraph.NODE_WIDTH;
	return size;
}

/**
* returns the bounding of the object, used for rendering purposes
* @method getBounding
* @return {Float32Array[4]} the total size
*/
LGraphNode.prototype.getBounding = function()
{
	return new Float32Array([this.pos[0] - 4, this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, this.pos[0] + this.size[0] + 4, this.pos[1] + this.size[1] + LGraph.NODE_TITLE_HEIGHT]);
}

/**
* checks if a point is inside the shape of a node
* @method isPointInsideNode
* @param {number} x
* @param {number} y
* @return {boolean} 
*/
LGraphNode.prototype.isPointInsideNode = function(x,y)
{
	var margin_top = this.graph && this.graph.isLive() ? 0 : 20;
	if(this.flags.collapsed)
	{
		//if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
		if( isInsideRectangle(x,y, this.pos[0], this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_COLLAPSED_WIDTH, LiteGraph.NODE_TITLE_HEIGHT) )
			return true;
	}
	else if (this.pos[0] - 4 < x && (this.pos[0] + this.size[0] + 4) > x
		&& (this.pos[1] - margin_top) < y && (this.pos[1] + this.size[1]) > y)
		return true;
	return false;
}

/**
* returns the input slot with a given name (used for dynamic slots), -1 if not found
* @method findInputSlot
* @param {string} name the name of the slot 
* @return {number} the slot (-1 if not found)
*/
LGraphNode.prototype.findInputSlot = function(name)
{
	if(!this.inputs) return -1;
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
* @param {number_or_string} target_slot the input slot of the target node (could be the number of the slot or the string with the name of the slot)
* @return {boolean} if it was connected succesfully
*/
LGraphNode.prototype.connect = function(slot, node, target_slot)
{
	target_slot = target_slot || 0;

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

	//avoid loopback
	if(node == this) return false; 
	//if( node.constructor != LGraphNode ) throw ("LGraphNode.connect: node is not of type LGraphNode");

	if(target_slot.constructor === String)
	{
		target_slot = node.findInputSlot(target_slot);
		if(target_slot == -1)
		{
			if(LiteGraph.debug)
				console.log("Connect: Error, no slot of name " + target_slot);
			return false;
		}
	}
	else if(!node.inputs || target_slot >= node.inputs.length) 
	{
		if(LiteGraph.debug)
			console.log("Connect: Error, slot number not found");
		return false;
	}

	//if there is something already plugged there, disconnect
	if(target_slot != -1 && node.inputs[target_slot].link != null)
		node.disconnectInput(target_slot);
		
	//special case: -1 means node-connection, used for triggers
	var output = this.outputs[slot];
	if(target_slot == -1)
	{
		if( output.links == null )
			output.links = [];
		output.links.push({id:node.id, slot: -1});
	}
	else if(output.type == 0 ||  //generic output
			node.inputs[target_slot].type == 0 || //generic input
			output.type == node.inputs[target_slot].type) //same type
	{
		//info: link structure => [ 0:link_id, 1:start_node_id, 2:start_slot, 3:end_node_id, 4:end_slot ]
		//var link = [ this.graph.last_link_id++, this.id, slot, node.id, target_slot ];
		var link = { id: this.graph.last_link_id++, origin_id: this.id, origin_slot: slot, target_id: node.id, target_slot: target_slot };
		this.graph.links[ link.id ] = link;

		//connect
		if( output.links == null )	output.links = [];
		output.links.push( link.id );
		node.inputs[target_slot].link = link.id;

		this.setDirtyCanvas(false,true);
		this.graph.onConnectionChange();
	}
	return true;
}

/**
* disconnect one output to an specific node
* @method disconnectOutput
* @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
* @param {LGraphNode} target_node the target node to which this slot is connected [Optional, if not target_node is specified all nodes will be disconnected]
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectOutput = function(slot, target_node)
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
	if(!output.links || output.links.length == 0)
		return false;

	if(target_node)
	{
		for(var i = 0, l = output.links.length; i < l; i++)
		{
			var link_id = output.links[i];
			var link_info = this.graph.links[ link_id ];

			//is the link we are searching for...
			if( link_info.target_id == target_node.id )
			{
				output.links.splice(i,1); //remove here
				target_node.inputs[ link_info.target_slot ].link = null; //remove there
				delete this.graph.links[ link_id ]; //remove the link from the links pool
				break;
			}
		}
	}
	else
	{
		for(var i = 0, l = output.links.length; i < l; i++)
		{
			var link_id = output.links[i];
			var link_info = this.graph.links[ link_id ];

			var target_node = this.graph.getNodeById( link_info.target_id );
			if(target_node)
				target_node.inputs[ link_info.target_slot ].link = null; //remove other side link
		}
		output.links = null;
	}

	this.setDirtyCanvas(false,true);
	this.graph.onConnectionChange();
	return true;
}

/**
* disconnect one input
* @method disconnectInput
* @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
* @return {boolean} if it was disconnected succesfully
*/
LGraphNode.prototype.disconnectInput = function(slot)
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
	if(!input) return false;
	var link_id = this.inputs[slot].link;
	this.inputs[slot].link = null;

	//remove other side
	var link_info = this.graph.links[ link_id ];
	var node = this.graph.getNodeById( link_info.origin_id );
	if(!node) return false;

	var output = node.outputs[ link_info.origin_slot ];
	if(!output || !output.links || output.links.length == 0) 
		return false;

	//check outputs
	for(var i = 0, l = output.links.length; i < l; i++)
	{
		var link_id = output.links[i];
		var link_info = this.graph.links[ link_id ];
		if( link_info.target_id == this.id )
		{
			output.links.splice(i,1);
			break;
		}
	}

	this.setDirtyCanvas(false,true);
	this.graph.onConnectionChange();
	return true;
}

/**
* returns the center of a connection point in canvas coords
* @method getConnectionPos
* @param {boolean} is_input true if if a input slot, false if it is an output
* @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
* @return {[x,y]} the position
**/
LGraphNode.prototype.getConnectionPos = function(is_input,slot_number)
{
	if(this.flags.collapsed)
	{
		if(is_input)
			return [this.pos[0], this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5];
		else
			return [this.pos[0] + LiteGraph.NODE_COLLAPSED_WIDTH, this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5];
		//return [this.pos[0] + this.size[0] * 0.5, this.pos[1] + this.size[1] * 0.5];
	}

	if(is_input && slot_number == -1)
	{
		return [this.pos[0] + 10, this.pos[1] + 10];
	}

	if(is_input && this.inputs.length > slot_number && this.inputs[slot_number].pos)
		return [this.pos[0] + this.inputs[slot_number].pos[0],this.pos[1] + this.inputs[slot_number].pos[1]];
	else if(!is_input && this.outputs.length > slot_number && this.outputs[slot_number].pos)
		return [this.pos[0] + this.outputs[slot_number].pos[0],this.pos[1] + this.outputs[slot_number].pos[1]];

	if(!is_input) //output
		return [this.pos[0] + this.size[0] + 1, this.pos[1] + 10 + slot_number * LiteGraph.NODE_SLOT_HEIGHT];
	return [this.pos[0] , this.pos[1] + 10 + slot_number * LiteGraph.NODE_SLOT_HEIGHT];
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

/* Allows to get onMouseMove and onMouseUp events even if the mouse is out of focus */
LGraphNode.prototype.captureInput = function(v)
{
	if(!this.graph || !this.graph.list_of_graphcanvas)
		return;

	var list = this.graph.list_of_graphcanvas;

	for(var i in list)
	{
		var c = list[i];
		//releasing somebody elses capture?!
		if(!v && c.node_capturing_input != this)
			continue;

		//change
		c.node_capturing_input = v ? this : null;
		if(this.graph.debug)
			console.log(this.title + ": Capturing input " + (v?"ON":"OFF"));
	}
}

/**
* Collapse the node to make it smaller on the canvas
* @method collapse
**/
LGraphNode.prototype.collapse = function()
{
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



//*********************************************************************************
// LGraphCanvas: LGraph renderer CLASS                                  
//*********************************************************************************

/**
* The Global Scope. It contains all the registered node classes.
*
* @class LGraphCanvas
* @constructor
* @param {HTMLCanvas} canvas the canvas where you want to render (it accepts a selector in string format or the canvas itself)
* @param {LGraph} graph [optional]
*/
function LGraphCanvas(canvas, graph)
{
	//if(graph === undefined)
	//	throw ("No graph assigned");

	if(typeof(canvas) == "string")
		canvas = document.querySelector(canvas);

	if(!canvas)
		throw("no canvas found");

	//link canvas and graph
	if(graph)
		graph.attachCanvas(this);

	this.setCanvas(canvas);
	this.clear();

	this.startRendering();
}

LGraphCanvas.link_type_colors = {'number':"#AAC",'node':"#DCA"};


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

	this.selected_nodes = {};
	this.node_dragged = null;
	this.node_over = null;
	this.node_capturing_input = null;
	this.connecting_node = null;

	this.highquality_render = true;
	this.editor_alpha = 1; //used for transition
	this.pause_rendering = false;
	this.render_shadows = true;
	this.dirty_canvas = true;
	this.dirty_bgcanvas = true;
	this.dirty_area = null;

	this.render_only_selected = true;
	this.live_mode = false;
	this.show_info = true;
	this.allow_dragcanvas = true;
	this.allow_dragnodes = true;

	this.node_in_panel = null;

	this.last_mouse = [0,0];
	this.last_mouseclick = 0;

	this.title_text_font = "bold 14px Arial";
	this.inner_text_font = "normal 12px Arial";

	this.render_connections_shadows = false; //too much cpu
	this.render_connections_border = true;
	this.render_curved_connections = true;
	this.render_connection_arrows = true;

	this.connections_width = 4;

	if(this.onClear) this.onClear();
	//this.UIinit();
}

/**
* assigns a graph, you can reasign graphs to the same canvas
*
* @method setGraph
* @param {LGraph} graph
*/
LGraphCanvas.prototype.setGraph = function(graph)
{
	if(this.graph == graph) return;
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
	graph.attachCanvas(this);
	this.setDirty(true,true);
}

/**
* assigns a canvas
*
* @method setCanvas
* @param {Canvas} assigns a canvas
*/
LGraphCanvas.prototype.setCanvas = function(canvas)
{
	var that = this;

	//Canvas association
	if(typeof(canvas) == "string")
		canvas = document.getElementById(canvas);

	if(canvas == null)
		throw("Error creating LiteGraph canvas: Canvas not found");
	if(canvas == this.canvas) return;

	this.canvas = canvas;
	//this.canvas.tabindex = "1000";
	this.canvas.className += " lgraphcanvas";
	this.canvas.data = this;

	//bg canvas: used for non changing stuff
	this.bgcanvas = null;
	if(!this.bgcanvas)
	{
		this.bgcanvas = document.createElement("canvas");
		this.bgcanvas.width = this.canvas.width;
		this.bgcanvas.height = this.canvas.height;
	}

	if(this.canvas.getContext == null)
	{
		throw("This browser doesnt support Canvas");
	}

	this.ctx = this.canvas.getContext("2d");
	this.bgctx = this.bgcanvas.getContext("2d");

	//input:  (move and up could be unbinded)
	this._mousemove_callback = this.processMouseMove.bind(this);
	this._mouseup_callback = this.processMouseUp.bind(this);

	this.canvas.addEventListener("mousedown", this.processMouseDown.bind(this), true ); //down do not need to store the binded
	this.canvas.addEventListener("mousemove", this._mousemove_callback);

	this.canvas.addEventListener("contextmenu", function(e) { e.preventDefault(); return false; });
	

	this.canvas.addEventListener("mousewheel", this.processMouseWheel.bind(this), false);
	this.canvas.addEventListener("DOMMouseScroll", this.processMouseWheel.bind(this), false);

	//touch events
	//if( 'touchstart' in document.documentElement )
	{
		//alert("doo");
		this.canvas.addEventListener("touchstart", this.touchHandler, true);
		this.canvas.addEventListener("touchmove", this.touchHandler, true);
		this.canvas.addEventListener("touchend", this.touchHandler, true);
		this.canvas.addEventListener("touchcancel", this.touchHandler, true);    
	}

	//this.canvas.onselectstart = function () { return false; };
	this.canvas.addEventListener("keydown", function(e) { 
		that.processKeyDown(e); 
	});

	this.canvas.addEventListener("keyup", function(e) { 
		that.processKeyUp(e); 
	});
}

/*
LGraphCanvas.prototype.UIinit = function()
{
	var that = this;
	$("#node-console input").change(function(e)
	{
		if(e.target.value == "")
			return;

		var node = that.node_in_panel;
		if(!node)
			return;
			
		node.trace("] " + e.target.value, "#333");
		if(node.onConsoleCommand)
		{
			if(!node.onConsoleCommand(e.target.value))
				node.trace("command not found", "#A33");
		}
		else if (e.target.value == "info")
		{
			node.trace("Special methods:");
			for(var i in node)
			{
				if(typeof(node[i]) == "function" && LGraphNode.prototype[i] == null && i.substr(0,2) != "on" && i[0] != "_")
					node.trace(" + " + i);
			}
		}
		else
		{
			try
			{
				eval("var _foo = function() { return ("+e.target.value+"); }");
				var result = _foo.call(node);
				if(result)
					node.trace(result.toString());
				delete window._foo;
			}
			catch(err)
			{
				node.trace("error: " + err, "#A33");
			}
		}
		
		this.value = "";
	});
}
*/

/**
* marks as dirty the canvas, this way it will be rendered again 
*
* @class LGraphCanvas
* @method setDirty
* @param {bool} fgcanvas if the foreground canvas is dirty (the one containing the nodes)
* @param {bool} bgcanvas if the background canvas is dirty (the one containing the wires)
*/
LGraphCanvas.prototype.setDirty = function(fgcanvas,bgcanvas)
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
	if(this.is_rendering) return; //already rendering

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


	/*
	this.rendering_timer_id = setInterval( function() { 
		//trace("Frame: " + new Date().getTime() );
		that.draw(); 
	}, 1000/50);
	*/
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
	if(!this.graph) return;

	this.adjustMouseEvent(e);
	
	var ref_window = this.getCanvasWindow();
	var document = ref_window.document;

	this.canvas.removeEventListener("mousemove", this._mousemove_callback );
	ref_window.document.addEventListener("mousemove", this._mousemove_callback, true ); //catch for the entire window
	ref_window.document.addEventListener("mouseup", this._mouseup_callback, true );

	var n = this.graph.getNodeOnPos(e.canvasX, e.canvasY, this.visible_nodes);
	var skip_dragging = false;

	if(e.which == 1) //left button mouse
	{
		//another node selected
		if(!e.shiftKey) //REFACTOR: integrate with function
		{
			var todeselect = [];
			for(var i in this.selected_nodes)
				if (this.selected_nodes[i] != n)
						todeselect.push(this.selected_nodes[i]);
			//two passes to avoid problems modifying the container
			for(var i in todeselect)
				this.processNodeDeselected(todeselect[i]);
		}
		var clicking_canvas_bg = false;

		//when clicked on top of a node
		//and it is not interactive
		if(n) 
		{
			if(!this.live_mode && !n.flags.pinned)
				this.bringToFront(n); //if it wasnt selected?
			var skip_action = false;

			//not dragging mouse to connect two slots
			if(!this.connecting_node && !n.flags.collapsed && !this.live_mode)
			{
				//search for outputs
				if(n.outputs)
					for(var i = 0, l = n.outputs.length; i < l; ++i)
					{
						var output = n.outputs[i];
						var link_pos = n.getConnectionPos(false,i);
						if( isInsideRectangle(e.canvasX, e.canvasY, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
						{
							this.connecting_node = n;
							this.connecting_output = output;
							this.connecting_pos = n.getConnectionPos(false,i);
							this.connecting_slot = i;

							skip_action = true;
							break;
						}
					}

				//search for inputs
				if(n.inputs)
					for(var i = 0, l = n.inputs.length; i < l; ++i)
					{
						var input = n.inputs[i];
						var link_pos = n.getConnectionPos(true,i);
						if( isInsideRectangle(e.canvasX, e.canvasY, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
						{
							if(input.link)
							{
								n.disconnectInput(i);
								this.dirty_bgcanvas = true;
								skip_action = true;
							}
						}
					}

				//Search for corner
				if( !skip_action && isInsideRectangle(e.canvasX, e.canvasY, n.pos[0] + n.size[0] - 5, n.pos[1] + n.size[1] - 5 ,5,5 ))
				{
					this.resizing_node = n;
					this.canvas.style.cursor = "se-resize";
					skip_action = true;
				}
			}

			//it wasnt clicked on the links boxes
			if(!skip_action) 
			{
				var block_drag_node = false;

				//double clicking
				var now = LiteGraph.getTime();
				if ((now - this.last_mouseclick) < 300 && this.selected_nodes[n.id])
				{
					//double click node
					if( n.onDblClick)
						n.onDblClick(e);
					this.processNodeDblClicked(n);
					block_drag_node = true;
				}

				//if do not capture mouse

				if( n.onMouseDown && n.onMouseDown(e) )
					block_drag_node = true;
				else if(this.live_mode)
				{
					clicking_canvas_bg = true;
					block_drag_node = true;
				}
				
				if(!block_drag_node)
				{
					if(this.allow_dragnodes)
						this.node_dragged = n;

					if(!this.selected_nodes[n.id])
						this.processNodeSelected(n,e);
				}

				this.dirty_canvas = true;
			}
		}
		else
			clicking_canvas_bg = true;

		if(clicking_canvas_bg && this.allow_dragcanvas)
		{
			this.dragging_canvas = true;
		}
	}
	else if (e.which == 2) //middle button
	{

	}
	else if (e.which == 3) //right button
	{
		this.processContextualMenu(n,e);
	}

	//TODO
	//if(this.node_selected != prev_selected)
	//	this.onNodeSelectionChange(this.node_selected);

	this.last_mouse[0] = e.localX;
	this.last_mouse[1] = e.localY;
	this.last_mouseclick = LiteGraph.getTime();
	this.canvas_mouse = [e.canvasX, e.canvasY];

	/*
	if( (this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null) 
		this.draw();
	*/

	this.graph.change();

	//this is to ensure to defocus(blur) if a text input element is on focus
	if(!ref_window.document.activeElement || (ref_window.document.activeElement.nodeName.toLowerCase() != "input" && ref_window.document.activeElement.nodeName.toLowerCase() != "textarea"))
		e.preventDefault();
	e.stopPropagation();
	return false;
}

LGraphCanvas.prototype.processMouseMove = function(e)
{
	if(!this.graph) return;

	this.adjustMouseEvent(e);
	var mouse = [e.localX, e.localY];
	var delta = [mouse[0] - this.last_mouse[0], mouse[1] - this.last_mouse[1]];
	this.last_mouse = mouse;
	this.canvas_mouse = [e.canvasX, e.canvasY];

	if(this.dragging_canvas)
	{
		this.offset[0] += delta[0] / this.scale;
		this.offset[1] += delta[1] / this.scale;
		this.dirty_canvas = true;
		this.dirty_bgcanvas = true;
	}
	else
	{
		if(this.connecting_node)
			this.dirty_canvas = true;

		//get node over
		var n = this.graph.getNodeOnPos(e.canvasX, e.canvasY, this.visible_nodes);

		//remove mouseover flag
		for(var i in this.graph._nodes)
		{
			if(this.graph._nodes[i].mouseOver && n != this.graph._nodes[i])
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
		if(n)
		{
			//this.canvas.style.cursor = "move";
			if(!n.mouseOver)
			{
				//mouse enter
				n.mouseOver = true;
				this.node_over = n;
				this.dirty_canvas = true;

				if(n.onMouseEnter) n.onMouseEnter(e);
			}

			if(n.onMouseMove) n.onMouseMove(e);

			//ontop of input
			if(this.connecting_node)
			{
				var pos = this._highlight_input || [0,0];
				var slot = this.isOverNodeInput(n, e.canvasX, e.canvasY, pos);
				if(slot != -1 && n.inputs[slot])
				{	
					var slot_type = n.inputs[slot].type;
					if(slot_type == this.connecting_output.type || slot_type == "*" || this.connecting_output.type == "*")
						this._highlight_input = pos;
				}
				else
					this._highlight_input = null;
			}

			//Search for corner
			if( isInsideRectangle(e.canvasX, e.canvasY, n.pos[0] + n.size[0] - 5, n.pos[1] + n.size[1] - 5 ,5,5 ))
				this.canvas.style.cursor = "se-resize";
			else
				this.canvas.style.cursor = null;
		}
		else
			this.canvas.style.cursor = null;

		if(this.node_capturing_input && this.node_capturing_input != n && this.node_capturing_input.onMouseMove)
		{
			this.node_capturing_input.onMouseMove(e);
		}


		if(this.node_dragged && !this.live_mode)
		{
			/*
			this.node_dragged.pos[0] += delta[0] / this.scale;
			this.node_dragged.pos[1] += delta[1] / this.scale;
			this.node_dragged.pos[0] = Math.round(this.node_dragged.pos[0]);
			this.node_dragged.pos[1] = Math.round(this.node_dragged.pos[1]);
			*/
			
			for(var i in this.selected_nodes)
			{
				var n = this.selected_nodes[i];
				
				n.pos[0] += delta[0] / this.scale;
				n.pos[1] += delta[1] / this.scale;
				//n.pos[0] = Math.round(n.pos[0]);
				//n.pos[1] = Math.round(n.pos[1]);
			}
			
			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;
		}

		if(this.resizing_node && !this.live_mode)
		{
			this.resizing_node.size[0] += delta[0] / this.scale;
			this.resizing_node.size[1] += delta[1] / this.scale;
			var max_slots = Math.max( this.resizing_node.inputs ? this.resizing_node.inputs.length : 0, this.resizing_node.outputs ? this.resizing_node.outputs.length : 0);
			if(this.resizing_node.size[1] < max_slots * LiteGraph.NODE_SLOT_HEIGHT + 4)
				this.resizing_node.size[1] = max_slots * LiteGraph.NODE_SLOT_HEIGHT + 4;
			if(this.resizing_node.size[0] < LiteGraph.NODE_MIN_WIDTH)
				this.resizing_node.size[0] = LiteGraph.NODE_MIN_WIDTH;

			this.canvas.style.cursor = "se-resize";
			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;
		}
	}

	/*
	if((this.dirty_canvas || this.dirty_bgcanvas) && this.rendering_timer_id == null) 
		this.draw();
	*/

	e.preventDefault();
	e.stopPropagation();
	return false;
	//this is not really optimal
	//this.graph.change();
}

LGraphCanvas.prototype.processMouseUp = function(e)
{
	if(!this.graph) return;

	var window = this.getCanvasWindow();
	var document = window.document;

	document.removeEventListener("mousemove", this._mousemove_callback, true );
	this.canvas.addEventListener("mousemove", this._mousemove_callback, true);
	document.removeEventListener("mouseup", this._mouseup_callback, true );

	this.adjustMouseEvent(e);

	if (e.which == 1) //left button
	{
		//dragging a connection
		if(this.connecting_node)
		{
			this.dirty_canvas = true;
			this.dirty_bgcanvas = true;

			var node = this.graph.getNodeOnPos(e.canvasX, e.canvasY, this.visible_nodes);

			//node below mouse
			if(node)
			{
			
				if(this.connecting_output.type == 'node')
				{
					this.connecting_node.connect(this.connecting_slot, node, -1);
				}
				else
				{
					//slot below mouse? connect
					var slot = this.isOverNodeInput(node, e.canvasX, e.canvasY);
					if(slot != -1)
					{
						this.connecting_node.connect(this.connecting_slot, node, slot);
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
			this.dirty_canvas = true;
			this.dragging_canvas = false;

			if( this.node_over && this.node_over.onMouseUp )
				this.node_over.onMouseUp(e);
			if( this.node_capturing_input && this.node_capturing_input.onMouseUp )
				this.node_capturing_input.onMouseUp(e);
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

LGraphCanvas.prototype.isOverNodeInput = function(node, canvasx, canvasy, slot_pos)
{
	if(node.inputs)
		for(var i = 0, l = node.inputs.length; i < l; ++i)
		{
			var input = node.inputs[i];
			var link_pos = node.getConnectionPos(true,i);
			if( isInsideRectangle(canvasx, canvasy, link_pos[0] - 10, link_pos[1] - 5, 20,10) )
			{
				if(slot_pos) { slot_pos[0] = link_pos[0]; slot_pos[1] = link_pos[1] };
				return i;
			}
		}
	return -1;
}

LGraphCanvas.prototype.processKeyDown = function(e) 
{
	if(!this.graph) return;
	var block_default = false;

	//select all Control A
	if(e.keyCode == 65 && e.ctrlKey)
	{
		this.selectAllNodes();
		block_default = true;
	}

	//delete or backspace
	if(e.keyCode == 46 || e.keyCode == 8)
	{
		this.deleteSelectedNodes();
	}

	//collapse
	//...

	//TODO
	if(this.selected_nodes) 
		for (var i in this.selected_nodes)
			if(this.selected_nodes[i].onKeyDown)
				this.selected_nodes[i].onKeyDown(e);

	this.graph.change();

	if(block_default)
	{
		e.preventDefault();
		return false;
	}
}

LGraphCanvas.prototype.processKeyUp = function(e) 
{
	if(!this.graph) return;
	//TODO
	if(this.selected_nodes)
		for (var i in this.selected_nodes)
			if(this.selected_nodes[i].onKeyUp)
				this.selected_nodes[i].onKeyUp(e);

	this.graph.change();
}

LGraphCanvas.prototype.processMouseWheel = function(e) 
{
	if(!this.graph) return;
	if(!this.allow_dragcanvas) return;

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

LGraphCanvas.prototype.processNodeSelected = function(n,e)
{
	n.selected = true;
	if (n.onSelected)
		n.onSelected();
		
	if(e && e.shiftKey) //add to selection
		this.selected_nodes[n.id] = n;
	else
	{
		this.selected_nodes = {};
		this.selected_nodes[ n.id ] = n;
	}
		
	this.dirty_canvas = true;

	if(this.onNodeSelected)
		this.onNodeSelected(n);

	//if(this.node_in_panel) this.showNodePanel(n);
}

LGraphCanvas.prototype.processNodeDeselected = function(n)
{
	n.selected = false;
	if(n.onDeselected)
		n.onDeselected();
		
	delete this.selected_nodes[n.id];

	if(this.onNodeDeselected)
		this.onNodeDeselected();

	this.dirty_canvas = true;

	//this.showNodePanel(null);
}

LGraphCanvas.prototype.processNodeDblClicked = function(n)
{
	if(this.onShowNodePanel)
		this.onShowNodePanel(n);

	if(this.onNodeDblClicked)
		this.onNodeDblClicked(n);

	this.setDirty(true);
}

LGraphCanvas.prototype.selectNode = function(node)
{
	this.deselectAllNodes();

	if(!node)
		return;

	if(!node.selected && node.onSelected)
		node.onSelected();
	node.selected = true;
	this.selected_nodes[ node.id ] = node;
	this.setDirty(true);
}

LGraphCanvas.prototype.selectAllNodes = function()
{
	for(var i in this.graph._nodes)
	{
		var n = this.graph._nodes[i];
		if(!n.selected && n.onSelected)
			n.onSelected();
		n.selected = true;
		this.selected_nodes[this.graph._nodes[i].id] = n;
	}

	this.setDirty(true);
}

LGraphCanvas.prototype.deselectAllNodes = function()
{
	for(var i in this.selected_nodes)
	{
		var n = this.selected_nodes;
		if(n.onDeselected)
			n.onDeselected();
		n.selected = false;
	}
	this.selected_nodes = {};
	this.setDirty(true);
}

LGraphCanvas.prototype.deleteSelectedNodes = function()
{
	for(var i in this.selected_nodes)
	{
		var m = this.selected_nodes[i];
		//if(m == this.node_in_panel) this.showNodePanel(null);
		this.graph.remove(m);
	}
	this.selected_nodes = {};
	this.setDirty(true);
}

LGraphCanvas.prototype.centerOnNode = function(node)
{
	this.offset[0] = -node.pos[0] - node.size[0] * 0.5 + (this.canvas.width * 0.5 / this.scale);
	this.offset[1] = -node.pos[1] - node.size[1] * 0.5 + (this.canvas.height * 0.5 / this.scale);
	this.setDirty(true,true);
}

LGraphCanvas.prototype.adjustMouseEvent = function(e)
{
	var b = this.canvas.getBoundingClientRect();
	e.localX = e.pageX - b.left;
	e.localY = e.pageY - b.top;

	e.canvasX = e.localX / this.scale - this.offset[0];
	e.canvasY = e.localY / this.scale - this.offset[1];
}

LGraphCanvas.prototype.setZoom = function(value, zooming_center)
{
	if(!zooming_center)
		zooming_center = [this.canvas.width * 0.5,this.canvas.height * 0.5];

	var center = this.convertOffsetToCanvas( zooming_center );

	this.scale = value;

	if(this.scale > 4)
		this.scale = 4;
	else if(this.scale < 0.1)
		this.scale = 0.1;
	
	var new_center = this.convertOffsetToCanvas( zooming_center );
	var delta_offset = [new_center[0] - center[0], new_center[1] - center[1]];

	this.offset[0] += delta_offset[0];
	this.offset[1] += delta_offset[1];

	this.dirty_canvas = true;
	this.dirty_bgcanvas = true;
}

LGraphCanvas.prototype.convertOffsetToCanvas = function(pos)
{
	return [pos[0] / this.scale - this.offset[0], pos[1] / this.scale - this.offset[1]];
}

LGraphCanvas.prototype.convertCanvasToOffset = function(pos)
{
	return [(pos[0] + this.offset[0]) * this.scale, 
		(pos[1] + this.offset[1]) * this.scale ];
}

LGraphCanvas.prototype.convertEventToCanvas = function(e)
{
	var rect = this.canvas.getClientRects()[0];
	return this.convertOffsetToCanvas([e.pageX - rect.left,e.pageY - rect.top]);
}

LGraphCanvas.prototype.bringToFront = function(n)
{
	var i = this.graph._nodes.indexOf(n);
	if(i == -1) return;
	
	this.graph._nodes.splice(i,1);
	this.graph._nodes.push(n);
}

LGraphCanvas.prototype.sendToBack = function(n)
{
	var i = this.graph._nodes.indexOf(n);
	if(i == -1) return;
	
	this.graph._nodes.splice(i,1);
	this.graph._nodes.unshift(n);
}
	
/* Interaction */



/* LGraphCanvas render */

LGraphCanvas.prototype.computeVisibleNodes = function()
{
	var visible_nodes = [];
	for (var i in this.graph._nodes)
	{
		var n = this.graph._nodes[i];

		//skip rendering nodes in live mode
		if(this.live_mode && !n.onDrawBackground && !n.onDrawForeground)
			continue;

		if(!overlapBounding(this.visible_area, n.getBounding() ))
			continue; //out of the visible area

		visible_nodes.push(n);
	}
	return visible_nodes;
}

LGraphCanvas.prototype.draw = function(force_canvas, force_bgcanvas)
{
	//fps counting
	var now = LiteGraph.getTime();
	this.render_time = (now - this.last_draw_time)*0.001;
	this.last_draw_time = now;

	if(this.graph)
	{
		var start = [-this.offset[0], -this.offset[1] ];
		var end = [start[0] + this.canvas.width / this.scale, start[1] + this.canvas.height / this.scale];
		this.visible_area = new Float32Array([start[0],start[1],end[0],end[1]]);
	}

	if(this.dirty_bgcanvas || force_bgcanvas)
		this.drawBgcanvas();

	if(this.dirty_canvas || force_canvas)
		this.drawFrontCanvas();

	this.fps = this.render_time ? (1.0 / this.render_time) : 0;
	this.frame += 1;
}

LGraphCanvas.prototype.drawFrontCanvas = function()
{
	var ctx = this.ctx;
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
	ctx.clearRect(0,0,canvas.width, canvas.height);

	//draw bg canvas
	ctx.drawImage(this.bgcanvas,0,0);

	//info widget
	if(this.show_info)
	{
		ctx.font = "10px Arial";
		ctx.fillStyle = "#888";
		if(this.graph)
		{
			ctx.fillText( "T: " + this.graph.globaltime.toFixed(2)+"s",5,13*1 );
			ctx.fillText( "I: " + this.graph.iteration,5,13*2 );
			ctx.fillText( "F: " + this.frame,5,13*3 );
			ctx.fillText( "FPS:" + this.fps.toFixed(2),5,13*4 );
		}
		else
			ctx.fillText( "No graph selected",5,13*1 );
	}

	if(this.graph)
	{
		//apply transformations
		ctx.save();
		ctx.scale(this.scale,this.scale);
		ctx.translate(this.offset[0],this.offset[1]);

		//draw nodes
		var drawn_nodes = 0;
		var visible_nodes = this.computeVisibleNodes();
		this.visible_nodes = visible_nodes;

		for (var i in visible_nodes)
		{
			var node = visible_nodes[i];

			//transform coords system
			ctx.save();
			ctx.translate( node.pos[0], node.pos[1] );

			//Draw
			this.drawNode(node, ctx );
			drawn_nodes += 1;

			//Restore
			ctx.restore();
		}
		
		//connections ontop?
		if(this.graph.config.links_ontop)
			if(!this.live_mode)
				this.drawConnections(ctx);

		//current connection
		if(this.connecting_pos != null)
		{
			ctx.lineWidth = this.connections_width;
			var link_color = this.connecting_output.type == 'node' ? "#F85" : "#AFA";
			this.renderLink(ctx, this.connecting_pos, [this.canvas_mouse[0],this.canvas_mouse[1]], link_color );

			ctx.beginPath();
			ctx.arc( this.connecting_pos[0], this.connecting_pos[1],4,0,Math.PI*2);
			/*
			if( this.connecting_output.round)
				ctx.arc( this.connecting_pos[0], this.connecting_pos[1],4,0,Math.PI*2);
			else
				ctx.rect( this.connecting_pos[0], this.connecting_pos[1],12,6);
			*/
			ctx.fill();

			ctx.fillStyle = "#ffcc00";
			if(this._highlight_input)
			{
				ctx.beginPath();
				ctx.arc( this._highlight_input[0], this._highlight_input[1],6,0,Math.PI*2);
				ctx.fill();
			}
		}
		ctx.restore();
	}

	if(this.dirty_area)
	{
		ctx.restore();
		//this.dirty_area = null;
	}

	this.dirty_canvas = false;
}

LGraphCanvas.prototype.drawBgcanvas = function()
{
	var canvas = this.bgcanvas;
	var ctx = this.bgctx;


	//clear
	canvas.width = canvas.width;

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
		if(this.background_image && this.scale > 0.5)
		{
			ctx.globalAlpha = (1.0 - 0.5 / this.scale) * this.editor_alpha;
			ctx.webkitImageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false
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
			if(this._bg_img != this._pattern_img && this._bg_img.width > 0)
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
				ctx.fillRect(this.visible_area[0],this.visible_area[1],this.visible_area[2]-this.visible_area[0],this.visible_area[3]-this.visible_area[1]);
				ctx.fillStyle = "transparent";
			}

			ctx.globalAlpha = 1.0;
		}

		//DEBUG: show clipping area
		//ctx.fillStyle = "red";
		//ctx.fillRect( this.visible_area[0] + 10, this.visible_area[1] + 10, this.visible_area[2] - this.visible_area[0] - 20, this.visible_area[3] - this.visible_area[1] - 20);

		//bg
		ctx.strokeStyle = "#235";
		ctx.strokeRect(0,0,canvas.width,canvas.height);

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

	this.dirty_bgcanvas = false;
	this.dirty_canvas = true; //to force to repaint the front canvas with the bgcanvas 
}

/* Renders the LGraphNode on the canvas */
LGraphCanvas.prototype.drawNode = function(node, ctx )
{
	var glow = false;

	var color = node.color || LiteGraph.NODE_DEFAULT_COLOR;
	//if (this.selected) color = "#88F";

	var render_title = true;
	if(node.flags.skip_title_render || node.graph.isLive())
		render_title = false;
	if(node.mouseOver)
		render_title = true;

	//shadow and glow
	if (node.mouseOver) glow = true;
	
	if(node.selected)
	{
		/*
		ctx.shadowColor = "#EEEEFF";//glow ? "#AAF" : "#000";
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 1;
		*/
	}
	else if(this.render_shadows)
	{
		ctx.shadowColor = "rgba(0,0,0,0.5)";
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		ctx.shadowBlur = 3;
	}
	else
		ctx.shadowColor = "transparent";

	//only render if it forces it to do it
	if(this.live_mode)
	{
		if(!node.flags.collapsed)
		{
			ctx.shadowColor = "transparent";
			//if(node.onDrawBackground)
			//	node.onDrawBackground(ctx);
			if(node.onDrawForeground)
				node.onDrawForeground(ctx);
		}

		return;
	}

	//draw in collapsed form
	/*
	if(node.flags.collapsed)
	{
		if(!node.onDrawCollapsed || node.onDrawCollapsed(ctx) == false)
			this.drawNodeCollapsed(node, ctx, color, node.bgcolor);
		return;
	}
	*/

	var editor_alpha = this.editor_alpha;
	ctx.globalAlpha = editor_alpha;

	//clip if required (mask)
	var shape = node.shape || "box";
	var size = new Float32Array(node.size);
	if(node.flags.collapsed)
		size.set([LiteGraph.NODE_COLLAPSED_WIDTH, 0]);

	//Start clipping
	if(node.flags.clip_area)
	{
		ctx.save();
		if(shape == "box")
		{
			ctx.beginPath();
			ctx.rect(0,0,size[0], size[1]);
		}
		else if (shape == "round")
		{
			ctx.roundRect(0,0,size[0], size[1],10);
		}
		else if (shape == "circle")
		{
			ctx.beginPath();
			ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
		}
		ctx.clip();
	}

	//draw shape
	this.drawNodeShape(node, ctx, size, color, node.bgcolor, !render_title, node.selected );
	ctx.shadowColor = "transparent";

	//connection slots
	ctx.textAlign = "left";
	ctx.font = this.inner_text_font;

	var render_text = this.scale > 0.6;

	//render inputs and outputs
	if(!node.flags.collapsed)
	{
		//input connection slots
		if(node.inputs)
			for(var i = 0; i < node.inputs.length; i++)
			{
				var slot = node.inputs[i];

				ctx.globalAlpha = editor_alpha;
				if (this.connecting_node != null && this.connecting_output.type != 0 && node.inputs[i].type != 0 && this.connecting_output.type != node.inputs[i].type)
					ctx.globalAlpha = 0.4 * editor_alpha;

				ctx.fillStyle = slot.link != null ? "#7F7" : "#AAA";

				var pos = node.getConnectionPos(true,i);
				pos[0] -= node.pos[0];
				pos[1] -= node.pos[1];

				ctx.beginPath();

				if (1 || slot.round)
					ctx.arc(pos[0],pos[1],4,0,Math.PI*2);
				//else
				//	ctx.rect((pos[0] - 6) + 0.5, (pos[1] - 5) + 0.5,14,10);

				ctx.fill();

				//render name
				if(render_text)
				{
					var text = slot.label != null ? slot.label : slot.name;
					if(text)
					{
						ctx.fillStyle = color; 
						ctx.fillText(text,pos[0] + 10,pos[1] + 5);
					}
				}
			}

		//output connection slots
		if(this.connecting_node)
			ctx.globalAlpha = 0.4 * editor_alpha;

		ctx.lineWidth = 1;

		ctx.textAlign = "right";
		ctx.strokeStyle = "black";
		if(node.outputs)
			for(var i = 0; i < node.outputs.length; i++)
			{
				var slot = node.outputs[i];

				var pos = node.getConnectionPos(false,i);
				pos[0] -= node.pos[0];
				pos[1] -= node.pos[1];

				ctx.fillStyle = slot.links && slot.links.length ? "#7F7" : "#AAA";
				ctx.beginPath();
				//ctx.rect( node.size[0] - 14,i*14,10,10);

				if (1 || slot.round)
					ctx.arc(pos[0],pos[1],4,0,Math.PI*2);
				//else
				//	ctx.rect((pos[0] - 6) + 0.5,(pos[1] - 5) + 0.5,14,10);

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
						ctx.fillStyle = color;
						ctx.fillText(text, pos[0] - 10,pos[1] + 5);
					}
				}
			}

		ctx.textAlign = "left";
		ctx.globalAlpha = 1;

		if(node.onDrawForeground)
			node.onDrawForeground(ctx);
	}//!collapsed

	if(node.flags.clip_area)
		ctx.restore();

	ctx.globalAlpha = 1.0;
}

/* Renders the node shape */
LGraphCanvas.prototype.drawNodeShape = function(node, ctx, size, fgcolor, bgcolor, no_title, selected )
{
	//bg rect
	ctx.strokeStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
	ctx.fillStyle = bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

	/* gradient test
	var grad = ctx.createLinearGradient(0,0,0,node.size[1]);
	grad.addColorStop(0, "#AAA");
	grad.addColorStop(0.5, fgcolor || LiteGraph.NODE_DEFAULT_COLOR);
	grad.addColorStop(1, bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR);
	ctx.fillStyle = grad;
	//*/

	var title_height = LiteGraph.NODE_TITLE_HEIGHT;

	//render depending on shape
	var shape = node.shape || "box";
	if(shape == "box")
	{
		if(selected)
		{
			ctx.strokeStyle = "#CCC";
			ctx.strokeRect(-0.5,no_title ? -0.5 : -title_height + -0.5, size[0]+2, no_title ? (size[1]+2) : (size[1] + title_height+2) );
			ctx.strokeStyle = fgcolor;
		}

		ctx.beginPath();
		ctx.rect(0,no_title ? 0.5 : -title_height + 0.5,size[0]+1, no_title ? size[1] : size[1] + title_height);
	}
	else if (node.shape == "round")
	{
		ctx.roundRect(0,no_title ? 0 : -title_height,size[0], no_title ? size[1] : size[1] + title_height, 10);
	}
	else if (node.shape == "circle")
	{
		ctx.beginPath();
		ctx.arc(size[0] * 0.5, size[1] * 0.5, size[0] * 0.5, 0, Math.PI*2);
	}

	ctx.fill();
	ctx.shadowColor = "transparent";

	//ctx.stroke();

	//image
	if (node.bgImage && node.bgImage.width)
		ctx.drawImage( node.bgImage, (size[0] - node.bgImage.width) * 0.5 , (size[1] - node.bgImage.height) * 0.5);

	if(node.bgImageUrl && !node.bgImage)
		node.bgImage = node.loadImage(node.bgImageUrl);

	if(node.onDrawBackground)
		node.onDrawBackground(ctx);

	//title bg
	if(!no_title)
	{
		ctx.fillStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
		var old_alpha = ctx.globalAlpha;
		ctx.globalAlpha = 0.5 * old_alpha;
		if(shape == "box")
		{
			ctx.beginPath();
			ctx.fillRect(0,-title_height,size[0]+1,title_height);
			ctx.stroke();
		}
		else if (shape == "round")
		{
			ctx.roundRect(0,-title_height,size[0], title_height,10,0);
			//ctx.fillRect(0,8,size[0],NODE_TITLE_HEIGHT - 12);
			ctx.fill();
			ctx.stroke();
		}

		//box
		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		if (shape == "round")
			ctx.arc(title_height *0.5, title_height * -0.5, (title_height - 6) *0.5,0,Math.PI*2);
		else
			ctx.rect(3,-title_height + 3,title_height - 6,title_height - 6);
		ctx.fill();
		ctx.globalAlpha = old_alpha;

		//title text
		ctx.font = this.title_text_font;
		var title = node.getTitle();
		if(title && this.scale > 0.8)
		{
			ctx.fillStyle = "#222";
			ctx.fillText( title, 16, 13 - title_height );
		}
	}
}

/* Renders the node when collapsed */
LGraphCanvas.prototype.drawNodeCollapsed = function(node, ctx, fgcolor, bgcolor)
{
	//draw default collapsed shape
	ctx.strokeStyle = fgcolor || LiteGraph.NODE_DEFAULT_COLOR;
	ctx.fillStyle = bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

	var collapsed_radius = LiteGraph.NODE_COLLAPSED_RADIUS;

	//circle shape
	var shape = node.shape || "box";
	if(shape == "circle")
	{
		ctx.beginPath();
		ctx.arc(node.size[0] * 0.5, node.size[1] * 0.5, collapsed_radius,0,Math.PI * 2);
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		ctx.arc(node.size[0] * 0.5, node.size[1] * 0.5, collapsed_radius * 0.5,0,Math.PI * 2);
		ctx.fill();
	}
	else if(shape == "round") //rounded box
	{
		ctx.beginPath();
		ctx.roundRect(node.size[0] * 0.5 - collapsed_radius, node.size[1] * 0.5 - collapsed_radius, 2*collapsed_radius,2*collapsed_radius,5);
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		ctx.roundRect(node.size[0] * 0.5 - collapsed_radius*0.5, node.size[1] * 0.5 - collapsed_radius*0.5, collapsed_radius,collapsed_radius,2);
		ctx.fill();
	}
	else //flat box
	{
		ctx.beginPath();
		//ctx.rect(node.size[0] * 0.5 - collapsed_radius, node.size[1] * 0.5 - collapsed_radius, 2*collapsed_radius, 2*collapsed_radius);
		ctx.rect(0, 0, node.size[0], collapsed_radius * 2 );
		ctx.fill();
		ctx.shadowColor = "rgba(0,0,0,0)";
		ctx.stroke();

		ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
		ctx.beginPath();
		//ctx.rect(node.size[0] * 0.5 - collapsed_radius*0.5, node.size[1] * 0.5 - collapsed_radius*0.5, collapsed_radius,collapsed_radius);
		ctx.rect(collapsed_radius*0.5, collapsed_radius*0.5, collapsed_radius, collapsed_radius);
		ctx.fill();
	}
}

LGraphCanvas.link_colors = ["#AAC","#ACA","#CAA"];

LGraphCanvas.prototype.drawConnections = function(ctx)
{
	//draw connections
	ctx.lineWidth = this.connections_width;

	ctx.fillStyle = "#AAA";
	ctx.strokeStyle = "#AAA";
	ctx.globalAlpha = this.editor_alpha;
	//for every node
	for (var n in this.graph._nodes)
	{
		var node = this.graph._nodes[n];
		//for every input (we render just inputs because it is easier as every slot can only have one input)
		if(node.inputs && node.inputs.length)
			for(var i in node.inputs)
			{
				var input = node.inputs[i];
				if(!input || input.link == null) 
					continue;
				var link_id = input.link;
				var link = this.graph.links[ link_id ];
				if(!link) continue;

				var start_node = this.graph.getNodeById( link.origin_id );
				if(start_node == null) continue;
				var start_node_slot = link.origin_slot;
				var start_node_slotpos = null;

				if(start_node_slot == -1)
					start_node_slotpos = [start_node.pos[0] + 10, start_node.pos[1] + 10];
				else
					start_node_slotpos = start_node.getConnectionPos(false, start_node_slot);

				var color = LGraphCanvas.link_type_colors[node.inputs[i].type];
				if(color == null)
					color = LGraphCanvas.link_colors[node.id % LGraphCanvas.link_colors.length];
				this.renderLink(ctx, start_node_slotpos, node.getConnectionPos(true,i), color );
			}
	}
	ctx.globalAlpha = 1;
}

LGraphCanvas.prototype.renderLink = function(ctx,a,b,color)
{
	if(!this.highquality_render)
	{
		ctx.beginPath();
		ctx.moveTo(a[0],a[1]);
		ctx.lineTo(b[0],b[1]);
		ctx.stroke();
		return;
	}

	var dist = distance(a,b);

	if(this.render_connections_border && this.scale > 0.6)
		ctx.lineWidth = this.connections_width + 4;

	ctx.beginPath();
	
	if(this.render_curved_connections) //splines
	{
		ctx.moveTo(a[0],a[1]);
		ctx.bezierCurveTo(a[0] + dist*0.25, a[1],
							b[0] - dist*0.25 , b[1],
							b[0] ,b[1] );
	}
	else //lines
	{
		ctx.moveTo(a[0]+10,a[1]);
		ctx.lineTo(((a[0]+10) + (b[0]-10))*0.5,a[1]);
		ctx.lineTo(((a[0]+10) + (b[0]-10))*0.5,b[1]);
		ctx.lineTo(b[0]-10,b[1]);
	}

	if(this.render_connections_border && this.scale > 0.6)
	{
		ctx.strokeStyle = "rgba(0,0,0,0.5)";
		ctx.stroke();
	}

	ctx.lineWidth = this.connections_width;
	ctx.fillStyle = ctx.strokeStyle = color;
	ctx.stroke();

	//render arrow
	if(this.render_connection_arrows && this.scale > 0.6)
	{
		//get two points in the bezier curve
		var pos = this.computeConnectionPoint(a,b,0.5);
		var pos2 = this.computeConnectionPoint(a,b,0.51);
		var angle = 0;
		if(this.render_curved_connections)
			angle = -Math.atan2( pos2[0] - pos[0], pos2[1] - pos[1]);
		else
			angle = b[1] > a[1] ? 0 : Math.PI;

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

LGraphCanvas.prototype.computeConnectionPoint = function(a,b,t)
{
	var dist = distance(a,b);
	var p0 = a;
	var p1 = [ a[0] + dist*0.25, a[1] ];
	var p2 = [ b[0] - dist*0.25, b[1] ];
	var p3 = b;

	var c1 = (1-t)*(1-t)*(1-t);
	var c2 = 3*((1-t)*(1-t))*t;
	var c3 = 3*(1-t)*(t*t);
	var c4 = t*t*t;

	var x = c1*p0[0] + c2*p1[0] + c3*p2[0] + c4*p3[0];
	var y = c1*p0[1] + c2*p1[1] + c3*p2[1] + c4*p3[1];
	return [x,y];
}

/*
LGraphCanvas.prototype.resizeCanvas = function(width,height)
{
	this.canvas.width = width;
	if(height)
		this.canvas.height = height;

	this.bgcanvas.width = this.canvas.width;
	this.bgcanvas.height = this.canvas.height;
	this.draw(true,true);
}
*/

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
	//if(this.node_in_panel) this.showNodePanel(node);
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
        case "touchmove":  type="mousemove"; break;        
        case "touchend":   type="mouseup"; break;
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

LGraphCanvas.onMenuAdd = function(node, e, prev_menu, canvas, first_event )
{
	var window = canvas.getCanvasWindow();

	var values = LiteGraph.getNodeTypesCategories();
	var entries = {};
	for(var i in values)
		if(values[i])
			entries[ i ] = { value: values[i], content: values[i]  , is_menu: true };

	var menu = LiteGraph.createContextualMenu(entries, {event: e, callback: inner_clicked, from: prev_menu}, window);

	function inner_clicked(v, e)
	{
		var category = v.value;
		var node_types = LiteGraph.getNodeTypesInCategory(category);
		var values = [];
		for(var i in node_types)
			values.push( { content: node_types[i].title, value: node_types[i].type });

		LiteGraph.createContextualMenu(values, {event: e, callback: inner_create, from: menu}, window);
		return false;
	}

	function inner_create(v, e)
	{
		var node = LiteGraph.createNode( v.value );
		if(node)
		{
			node.pos = canvas.convertEventToCanvas(first_event);
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

LGraphCanvas.onMenuNodeInputs = function(node, e, prev_menu)
{
	if(!node) return;

	var options = node.optional_inputs;
	if(node.onGetInputs)
		options = node.onGetInputs();
	if(options)
	{
		var entries = [];
		for (var i in options)
		{
			var option = options[i];
			var label = option[0];
			if(option[2] && option[2].label)
				label = option[2].label;
			entries.push({content: label, value: option});
		}
		var menu = LiteGraph.createContextualMenu(entries, {event: e, callback: inner_clicked, from: prev_menu});
	}

	function inner_clicked(v)
	{
		if(!node) return;
		node.addInput(v.value[0],v.value[1], v.value[2]);
	}

	return false;
}

LGraphCanvas.onMenuNodeOutputs = function(node, e, prev_menu)
{
	if(!node) return;

	var options = node.optional_outputs;
	if(node.onGetOutputs)
		options = node.onGetOutputs();
	if(options)
	{
		var entries = [];
		for (var i in options)
		{
			if(node.findOutputSlot(options[i][0]) != -1)
				continue; //skip the ones already on
			entries.push({content: options[i][0], value: options[i]});
		}
		if(entries.length)
			var menu = LiteGraph.createContextualMenu(entries, {event: e, callback: inner_clicked, from: prev_menu});
	}

	function inner_clicked(v)
	{
		if(!node) return;

		var value = v.value[1];

		if(value && (value.constructor === Object || value.constructor === Array)) //submenu
		{
			var entries = [];
			for(var i in value)
				entries.push({content: i, value: value[i]});
			LiteGraph.createContextualMenu(entries, {event: e, callback: inner_clicked, from: prev_menu});		
			return false;
		}
		else
			node.addOutput(v.value[0],v.value[1]);
	}

	return false;
}

LGraphCanvas.onMenuNodeCollapse = function(node)
{
	node.flags.collapsed = !node.flags.collapsed;
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.onMenuNodePin = function(node)
{
	node.pin();
}

LGraphCanvas.onMenuNodeColors = function(node, e, prev_menu)
{
	var values = [];
	for(var i in LGraphCanvas.node_colors)
	{
		var color = LGraphCanvas.node_colors[i];
		var value = {value:i, content:"<span style='display: block; color:"+color.color+"; background-color:"+color.bgcolor+"'>"+i+"</span>"};
		values.push(value);
	}
	LiteGraph.createContextualMenu(values, {event: e, callback: inner_clicked, from: prev_menu});

	function inner_clicked(v)
	{
		if(!node) return;
		var color = LGraphCanvas.node_colors[v.value];
		if(color)
		{
			node.color = color.color;
			node.bgcolor = color.bgcolor;
			node.setDirtyCanvas(true);
		}
	}

	return false;
}

LGraphCanvas.onMenuNodeShapes = function(node,e)
{
	LiteGraph.createContextualMenu(["box","round"], {event: e, callback: inner_clicked});

	function inner_clicked(v)
	{
		if(!node) return;
		node.shape = v;
		node.setDirtyCanvas(true);
	}

	return false;
}

LGraphCanvas.onMenuNodeRemove = function(node)
{
	if(node.removable == false) return;
	node.graph.remove(node);
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.onMenuNodeClone = function(node)
{
	if(node.clonable == false) return;
	var newnode = node.clone();
	if(!newnode) return;
	newnode.pos = [node.pos[0]+5,node.pos[1]+5];
	node.graph.add(newnode);
	node.setDirtyCanvas(true,true);
}

LGraphCanvas.node_colors = {
	"red": { color:"#FAA", bgcolor:"#A44" },
	"green": { color:"#AFA", bgcolor:"#4A4" },
	"blue": { color:"#AAF", bgcolor:"#44A" },
	"white": { color:"#FFF", bgcolor:"#AAA" }
};

LGraphCanvas.prototype.getCanvasMenuOptions = function()
{
	var options = null;
	if(this.getMenuOptions)
		options = this.getMenuOptions();
	else
	{
		options = [
			{content:"Add Node", is_menu: true, callback: LGraphCanvas.onMenuAdd }
			//{content:"Collapse All", callback: LGraphCanvas.onMenuCollapseAll }
		];

		if(this._graph_stack)
			options = [{content:"Close subgraph", callback: this.closeSubgraph.bind(this) },null].concat(options);
	}

	if(this.getExtraMenuOptions)
	{
		var extra = this.getExtraMenuOptions(this);
		extra.push(null);
		options = extra.concat( options );
	}

	return options;
}

LGraphCanvas.prototype.getNodeMenuOptions = function(node)
{
	var options = null;

	if(node.getMenuOptions)
		options = node.getMenuOptions(this);
	else
		options = [
			{content:"Inputs", is_menu: true, disabled:true, callback: LGraphCanvas.onMenuNodeInputs },
			{content:"Outputs", is_menu: true, disabled:true, callback: LGraphCanvas.onMenuNodeOutputs },
			null,
			{content:"Collapse", callback: LGraphCanvas.onMenuNodeCollapse },
			{content:"Pin", callback: LGraphCanvas.onMenuNodePin },
			{content:"Colors", is_menu: true, callback: LGraphCanvas.onMenuNodeColors },
			{content:"Shapes", is_menu: true, callback: LGraphCanvas.onMenuNodeShapes },
			null
		];

	if(node.getExtraMenuOptions)
	{
		var extra = node.getExtraMenuOptions(this);
		extra.push(null);
		options = extra.concat( options );
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

	return options;
}

LGraphCanvas.prototype.processContextualMenu = function(node,event)
{
	var that = this;
	var win = this.getCanvasWindow();

	var menu = LiteGraph.createContextualMenu(node ? this.getNodeMenuOptions(node) : this.getCanvasMenuOptions(), {event: event, callback: inner_option_clicked}, win);

	function inner_option_clicked(v,e)
	{
		if(!v) return;

		if(v.callback)
			return v.callback(node, e, menu, that, event );
	}
}






//API *************************************************
//function roundRect(ctx, x, y, width, height, radius, radius_low) {
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, radius_low) {
  if ( radius === undefined ) {
    radius = 5;
  }

  if(radius_low === undefined)
	 radius_low  = radius;

  this.beginPath();
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

function distance(a,b)
{
	return Math.sqrt( (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]) );
}

function colorToString(c)
{
	return "rgba(" + Math.round(c[0] * 255).toFixed() + "," + Math.round(c[1] * 255).toFixed() + "," + Math.round(c[2] * 255).toFixed() + "," + (c.length == 4 ? c[3].toFixed(2) : "1.0") + ")";
}

function isInsideRectangle(x,y, left, top, width, height)
{
	if (left < x && (left + width) > x &&
		top < y && (top + height) > y)
		return true;	
	return false;
}

//[minx,miny,maxx,maxy]
function growBounding(bounding, x,y)
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

//boundings overlap, format: [start,end]
function overlapBounding(a,b)
{
	if ( a[0] > b[2] ||
		a[1] > b[3] ||
		a[2] < b[0] ||
		a[3] < b[1])
		return false;
	return true;
}

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

/* LiteGraph GUI elements *************************************/

LiteGraph.createContextualMenu = function(values,options, ref_window)
{
	options = options || {};
	this.options = options;

	//allows to create graph canvas in separate window
	ref_window = ref_window || window;

	if(!options.from)
		LiteGraph.closeAllContextualMenus();

	var root = ref_window.document.createElement("div");
	root.className = "litecontextualmenu litemenubar-panel";
	this.root = root;
	var style = root.style;

	style.minWidth = "100px";
	style.minHeight = "20px";

	style.position = "fixed";
	style.top = "100px";
	style.left = "100px";
	style.color = "#AAF";
	style.padding = "2px";
	style.borderBottom = "2px solid #AAF";
	style.backgroundColor = "#444";

	//avoid a context menu in a context menu
	root.addEventListener("contextmenu", function(e) { e.preventDefault(); return false; });

	for(var i in values)
	{
		var item = values[i];
		var element = ref_window.document.createElement("div");
		element.className = "litemenu-entry";

		if(item == null)
		{
			element.className = "litemenu-entry separator";
			root.appendChild(element);
			continue;
		}

		if(item.is_menu)
			element.className += " submenu";

		if(item.disabled)
			element.className += " disabled";

		element.style.cursor = "pointer";
		element.dataset["value"] = typeof(item) == "string" ? item : item.value;
		element.data = item;
		if(typeof(item) == "string")
			element.innerHTML = values.constructor == Array ? values[i] : i;
		else
			element.innerHTML = item.content ? item.content : i;

		element.addEventListener("click", on_click );
		root.appendChild(element);
	}

	root.addEventListener("mouseover", function(e) {
		this.mouse_inside = true;
	});

	root.addEventListener("mouseout", function(e) {
		//console.log("OUT!");
		var aux = e.toElement;
		while(aux != this && aux != ref_window.document)
			aux = aux.parentNode;

		if(aux == this) return;
		this.mouse_inside = false;
		if(!this.block_close)
			this.closeMenu();
	});

	//insert before checking position
	ref_window.document.body.appendChild(root);

	var root_rect = root.getClientRects()[0];

	//link menus
	if(options.from)
	{
		options.from.block_close = true;
	}

	var left = options.left || 0;
	var top = options.top || 0;
	if(options.event)
	{
		left = (options.event.pageX - 10);
		top = (options.event.pageY - 10);
		if(options.left)
			left = options.left;

		var rect = ref_window.document.body.getClientRects()[0];

		if(options.from)
		{
			var parent_rect = options.from.getClientRects()[0];
			left = parent_rect.left + parent_rect.width;
		}

		
		if(left > (rect.width - root_rect.width - 10))
			left = (rect.width - root_rect.width - 10);
		if(top > (rect.height - root_rect.height - 10))
			top = (rect.height - root_rect.height - 10);
	}

	root.style.left = left + "px";
	root.style.top = top  + "px";

	function on_click(e) {
		var value = this.dataset["value"];
		var close = true;
		if(options.callback)
		{
			var ret = options.callback.call(root, this.data, e );
			if( ret != undefined ) close = ret;
		}

		if(close)
			LiteGraph.closeAllContextualMenus();
			//root.closeMenu();
	}

	root.closeMenu = function()
	{
		if(options.from)
		{
			options.from.block_close = false;
			if(!options.from.mouse_inside)
				options.from.closeMenu();
		}
		if(this.parentNode)
			ref_window.document.body.removeChild(this);
	};

	return root;
}

LiteGraph.closeAllContextualMenus = function()
{
	var elements = document.querySelectorAll(".litecontextualmenu");
	if(!elements.length) return;

	var result = [];
	for(var i = 0; i < elements.length; i++)
		result.push(elements[i]);

	for(var i in result)
		if(result[i].parentNode)
			result[i].parentNode.removeChild( result[i] );
}

LiteGraph.extendClass = function(origin, target)
{
	for(var i in origin) //copy class properties
		target[i] = origin[i];
	if(origin.prototype) //copy prototype properties
		for(var i in origin.prototype)
			target.prototype[i] = origin.prototype[i];
}

/*
LiteGraph.createNodetypeWrapper = function( class_object )
{
	//create Nodetype object
}
//LiteGraph.registerNodeType("scene/global", LGraphGlobal );
*/

if( !window["requestAnimationFrame"] )
{
	window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
		  window.mozRequestAnimationFrame    ||
		  (function( callback ){
			window.setTimeout(callback, 1000 / 60);
		  });
}



//basic nodes
(function(){


//Input for a subgraph
function GlobalInput()
{
	this.title = "Input";

	//random name to avoid problems with other outputs when added
	var genname = "input_" + (Math.random()*1000).toFixed();
	this.properties = { name: genname, type: "number" };
	this.addOutput("value",0);
}

GlobalInput.title = "Input";
GlobalInput.desc = "Input of the graph";

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
	this.title = "Output";

	//random name to avoid problems with other outputs when added
	var genname = "output_" + (Math.random()*1000).toFixed();
	this.properties = { name: genname, type: "number" };
	this.addInput("value","number");
}

GlobalOutput.title = "Ouput";
GlobalOutput.desc = "Output of the graph";

GlobalOutput.prototype.onAdded = function()
{
	var name = this.graph.addGlobalOutput( this.properties.name, this.properties.type );
}

GlobalOutput.prototype.onExecute = function()
{
	this.graph.setGlobalOutputData( this.properties.name, this.getInputData(0) );
}

LiteGraph.registerNodeType("graph/output", GlobalOutput);


//Subgraph: a node that contains a graph
function Subgraph()
{
	var that = this;
	this.subgraph = new LGraph();
	this.subgraph._subgraph_node = this;
	this.subgraph._is_subgraph = true;
	this.subgraph.onGlobalInputAdded = this.onSubgraphNewGlobalInput.bind(this);
	this.subgraph.onGlobalOutputAdded = this.onSubgraphNewGlobalOutput.bind(this);

	this.bgcolor = "#FA3";
}

Subgraph.title = "Subgraph";
Subgraph.desc = "Graph inside a node";

Subgraph.prototype.onSubgraphNewGlobalInput = function(name, type)
{
	this.addInput(name, type);
}

Subgraph.prototype.onSubgraphNewGlobalOutput = function(name, type)
{
	this.addOutput(name, type);
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


LiteGraph.registerNodeType("graph/subgraph", Subgraph);



//Constant
function Constant()
{
	this.addOutput("value","number");
	this.properties = { value:1.0 };
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

Constant.prototype.onWidget = function(e,widget)
{
	if(widget.name == "value")
		this.setValue(widget.value);
}

LiteGraph.registerNodeType("basic/const", Constant);


//Watch a value in the editor
function Watch()
{
	this.size = [60,20];
	this.addInput("value",0,{label:""});
	this.addOutput("value",0,{label:""});
	this.properties = { value:"" };
}

Watch.title = "Watch";
Watch.desc = "Show value of input";

Watch.prototype.onExecute = function()
{
	this.properties.value = this.getInputData(0);
	this.setOutputData(0, this.properties.value);
}

Watch.prototype.onDrawBackground = function(ctx)
{
	//show the current value
	if(this.inputs[0] && this.properties["value"] != null)	
	{
		if (this.properties["value"].constructor === Number )
			this.inputs[0].label = this.properties["value"].toFixed(3);
		else
			this.inputs[0].label = this.properties["value"];
	}
}

LiteGraph.registerNodeType("basic/watch", Watch);



/*
LiteGraph.registerNodeType("math/sinusoid",{
	title: "Sin",
	desc: "Sinusoidal value generator",
	bgImageUrl: "nodes/imgs/icon-sin.png",

	inputs: [["f",'number'],["q",'number'],["a",'number'],["t",'number']],
	outputs: [["",'number']],
	properties: {amplitude:1.0, freq: 1, phase:0},

	onExecute: function()
	{
		var f = this.getInputData(0);
		if(f != null)
			this.properties["freq"] = f;

		var q = this.getInputData(1);
		if(q != null)
			this.properties["phase"] = q;

		var a = this.getInputData(2);
		if(a != null)
			this.properties["amplitude"] = a;

		var t = this.graph.getFixedTime();
		if(this.getInputData(3) != null)
			t = this.getInputData(3);
		// t = t/(2*Math.PI); t = (t-Math.floor(t))*(2*Math.PI);

		var v = this.properties["amplitude"] * Math.sin((2*Math.PI) * t * this.properties["freq"] + this.properties["phase"]);
		this.setOutputData(0, v );
	},

	onDragBackground: function(ctx)
	{
		this.boxcolor = colorToString(v > 0 ? [0.5,0.8,1,0.5] : [0,0,0,0.5]);
		this.setDirtyCanvas(true);
	},
});
*/

/*
LiteGraph.registerNodeType("basic/number",{
	title: "Number",

// System vars *********************************

LiteGraph.registerNodeType("session/info",{
	title: "Time",
	desc: "Seconds since start",

	outputs: [["secs",'number']],
	properties: {scale:1.0},
	onExecute: function()
	{
		this.setOutputData(0, this.session.getTime() * this.properties.scale);
	}
});

LiteGraph.registerNodeType("system/fixedtime",{
	title: "F.Time",
	desc: "Constant time value",

	outputs: [["secs",'number']],
	properties: {scale:1.0},
	onExecute: function()
	{
		this.setOutputData(0, this.session.getFixedTime() * this.properties.scale);
	}
});


LiteGraph.registerNodeType("system/elapsedtime",{
	title: "Elapsed",
	desc: "Seconds elapsed since last execution",

	outputs: [["secs",'number']],
	properties: {scale:1.0},
	onExecute: function()
	{
		this.setOutputData(0, this.session.getElapsedTime() * this.properties.scale);
	}
});

LiteGraph.registerNodeType("system/iterations",{
	title: "Iterations",
	desc: "Number of iterations (executions)",

	outputs: [["",'number']],
	onExecute: function()
	{
		this.setOutputData(0, this.session.iterations );
	}
});

LiteGraph.registerNodeType("system/trace",{
	desc: "Outputs input to browser's console",

	inputs: [["",0]],
	onExecute: function()
	{
		var data = this.getInputData(0);
		if(data)
			trace("DATA: "+data);
	}
});

/*
LiteGraph.registerNodeType("math/not",{
	title: "Not",
	desc: "0 -> 1 or 0 -> 1",
	inputs: [["A",'number']],
	outputs: [["!A",'number']],
	size: [60,22],
	onExecute: function()
	{
		var v = this.getInputData(0);
		if(v != null)
			this.setOutputData(0, v ? 0 : 1);
	}
});



// Nodes for network in and out 
LiteGraph.registerNodeType("network/general/network_input",{
	title: "N.Input",
	desc: "Network Input",
	outputs: [["",0]],
	color: "#00ff96",
	bgcolor: "#004327",

	setValue: function(v)
	{
		this.value = v;
	},

	onExecute: function()
	{
		this.setOutputData(0, this.value);
	}
});

LiteGraph.registerNodeType("network/general/network_output",{
	title: "N.Output",
	desc: "Network output",
	inputs: [["",0]],
	color: "#a8ff00",
	bgcolor: "#293e00",

	properties: {value:null},

	getValue: function()
	{
		return this.value;
	},

	onExecute: function()
	{
		this.value = this.getOutputData(0);
	}
});

LiteGraph.registerNodeType("network/network_trigger",{
	title: "N.Trigger",
	desc: "Network input trigger",
	outputs: [["",0]],
	color: "#ff9000",
	bgcolor: "#522e00",

	onTrigger: function(v)
	{
		this.triggerOutput(0,v);
	},
});

LiteGraph.registerNodeType("network/network_callback",{
	title: "N.Callback",
	desc: "Network callback output.",
	outputs: [["",0]],
	color: "#6A6",
	bgcolor: "#363",

	setTrigger: function(func)
	{
		this.callback = func;
	},

	onTrigger: function(v)
	{
		if(this.callback)
			this.callback(v);
	},
});

*/


})();
//widgets
(function(){

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

		this.boxcolor = colorToString([this.value,this.value,this.value]);
	}

	WidgetKnob.prototype.onMouseDown = function(e)
	{
		if(!this.imgfg || !this.imgfg.width) return;

		//this.center = [this.imgbg.width * 0.5, this.imgbg.height * 0.5 + 20];
		//this.radius = this.imgbg.width * 0.5;
		this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
		this.radius = this.size[0] * 0.5;

		if(e.canvasY - this.pos[1] < 20 || distance([e.canvasX,e.canvasY],[this.pos[0] + this.center[0],this.pos[1] + this.center[1]]) > this.radius)
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
	
	WidgetKnob.prototype.onWidget = function(e,widget)
	{
		if(widget.name=="increase")
			this.onPropertyChange("size", this.properties.size + 10);
		else if(widget.name=="decrease")
			this.onPropertyChange("size", this.properties.size - 10);
	}

	WidgetKnob.prototype.onPropertyChange = function(name,value)
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

	//Widget H SLIDER
	function WidgetHSlider()
	{
		this.size = [160,26];
		this.addOutput("",'number');
		this.properties = {wcolor:"#7AF",min:0,max:1,value:0.5};
	}

	WidgetHSlider.title = "H.Slider";
	WidgetHSlider.desc = "Linear slider controller";

	WidgetHSlider.prototype.onInit = function()
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
		this.boxcolor = colorToString([this.value,this.value,this.value]);
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

	WidgetHSlider.prototype.onPropertyChange = function(name,value)
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


	/*
	LiteGraph.registerNodeType("widget/kpad",{
		title: "KPad",
		desc: "bidimensional slider",
		size: [200,200],
		outputs: [["x",'number'],["y",'number']],
		properties:{x:0,y:0,borderColor:"#333",bgcolorTop:"#444",bgcolorBottom:"#000",shadowSize:1, borderRadius:2},

		createGradient: function(ctx)
		{
			this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
			this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
			this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
		},

		onDrawBackground: function(ctx)
		{
			if(!this.lineargradient)
				this.createGradient(ctx);

			ctx.lineWidth = 1;
			ctx.strokeStyle = this.properties["borderColor"];
			//ctx.fillStyle = "#ebebeb";
			ctx.fillStyle = this.lineargradient;

			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];
			ctx.roundRect(0,0,this.size[0],this.size[1],this.properties["shadowSize"]);
			ctx.fill();
			ctx.shadowColor = "rgba(0,0,0,0)";
			ctx.stroke();

			ctx.fillStyle = "#A00";
			ctx.fillRect(this.size[0] * this.properties["x"] - 5, this.size[1] * this.properties["y"] - 5,10,10);
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "update")
			{
				this.lineargradient = null;
				this.setDirtyCanvas(true);
			}
		},

		onExecute: function()
		{
			this.setOutputData(0, this.properties["x"] );
			this.setOutputData(1, this.properties["y"] );
		},

		onMouseDown: function(e)
		{
			if(e.canvasY - this.pos[1] < 0)
				return false;

			this.oldmouse = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
			this.captureInput(true);
			return true;
		},

		onMouseMove: function(e)
		{
			if(!this.oldmouse) return;

			var m = [ e.canvasX - this.pos[0], e.canvasY - this.pos[1] ];
			
			this.properties.x = m[0] / this.size[0];
			this.properties.y = m[1] / this.size[1];

			if(this.properties.x > 1.0) this.properties.x = 1.0;
			else if(this.properties.x < 0.0) this.properties.x = 0.0;

			if(this.properties.y > 1.0) this.properties.y = 1.0;
			else if(this.properties.y < 0.0) this.properties.y = 0.0;

			this.oldmouse = m;
			this.setDirtyCanvas(true);
		},

		onMouseUp: function(e)
		{
			if(this.oldmouse)
			{
				this.oldmouse = null;
				this.captureInput(false);
			}
		},

		onMouseLeave: function(e)
		{
			//this.oldmouse = null;
		}
	});



	LiteGraph.registerNodeType("widget/button", {
		title: "Button",
		desc: "A send command button",

		widgets: [{name:"test",text:"Test Button",type:"button"}],
		size: [100,40],
		properties:{text:"clickme",command:"",color:"#7AF",bgcolorTop:"#f0f0f0",bgcolorBottom:"#e0e0e0",fontsize:"16"},
		outputs:[["M","module"]],

		createGradient: function(ctx)
		{
			this.lineargradient = ctx.createLinearGradient(0,0,0,this.size[1]);  
			this.lineargradient.addColorStop(0,this.properties["bgcolorTop"]);  
			this.lineargradient.addColorStop(1,this.properties["bgcolorBottom"]);
		},

		drawVectorShape: function(ctx)
		{
			ctx.fillStyle = this.mouseOver ? this.properties["color"] : "#AAA";

			if(this.clicking) 
				ctx.fillStyle = "#FFF";

			ctx.strokeStyle = "#AAA";
			ctx.roundRect(5,5,this.size[0] - 10,this.size[1] - 10,4);
			ctx.stroke();

			if(this.mouseOver)
				ctx.fill();

			//ctx.fillRect(5,20,this.size[0] - 10,this.size[1] - 30);

			ctx.fillStyle = this.mouseOver ? "#000" : "#AAA";
			ctx.font = "bold " + this.properties["fontsize"] + "px Criticized,Tahoma";
			ctx.textAlign = "center";
			ctx.fillText(this.properties["text"],this.size[0]*0.5,this.size[1]*0.5 + 0.5*parseInt(this.properties["fontsize"]));
			ctx.textAlign = "left";
		},

		drawBevelShape: function(ctx)
		{
			ctx.shadowColor = "#000";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = this.properties["shadowSize"];

			if(!this.lineargradient)
				this.createGradient(ctx);

			ctx.fillStyle = this.mouseOver ? this.properties["color"] : this.lineargradient;
			if(this.clicking) 
				ctx.fillStyle = "#444";

			ctx.strokeStyle = "#FFF";
			ctx.roundRect(5,5,this.size[0] - 10,this.size[1] - 10,4);
			ctx.fill();
			ctx.shadowColor = "rgba(0,0,0,0)";
			ctx.stroke();

			ctx.fillStyle = this.mouseOver ? "#000" : "#444";
			ctx.font = "bold " + this.properties["fontsize"] + "px Century Gothic";
			ctx.textAlign = "center";
			ctx.fillText(this.properties["text"],this.size[0]*0.5,this.size[1]*0.5 + 0.40*parseInt(this.properties["fontsize"]));
			ctx.textAlign = "left";
		},

		onDrawForeground: function(ctx)
		{
			this.drawBevelShape(ctx);
		},

		clickButton: function()
		{
			var module = this.getOutputModule(0);
			if(this.properties["command"] && this.properties["command"] != "")
			{
				if (! module.executeAction(this.properties["command"]) )
					this.trace("Error executing action in other module");
			}
			else if(module && module.onTrigger)
			{
				module.onTrigger();  
			}
		},

		onMouseDown: function(e)
		{
			if(e.canvasY - this.pos[1] < 2)
				return false;
			this.clickButton();
			this.clicking = true;
			return true;
		},

		onMouseUp: function(e)
		{
			this.clicking = false;
		},

		onExecute: function()
		{
		},

		onWidget: function(e,widget)
		{
			if(widget.name == "test")
			{
				this.clickButton();
			}
		},

		onPropertyChange: function(name,value)
		{
			this.properties[name] = value;
			return true;
		}
	});
	*/


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
		else
			this.properties["value"] = "";
		this.setDirtyCanvas(true);
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

	WidgetText.prototype.onWidget = function(e,widget)
	{
		if(widget.name == "resize")
			this.resize();
		else if (widget.name == "led_text")
		{
			this.properties["font"] = "Digital";
			this.properties["glowSize"] = 4;
			this.setDirtyCanvas(true);
		}
		else if (widget.name == "normal_text")
		{
			this.properties["font"] = "Arial";
			this.setDirtyCanvas(true);
		}
	}

	WidgetText.prototype.onPropertyChange = function(name,value)
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

	WidgetPanel.prototype.onWidget = function(e,widget)
	{
		if(widget.name == "update")
		{
			this.lineargradient = null;
			this.setDirtyCanvas(true);
		}
	}

	LiteGraph.registerNodeType("widget/panel", WidgetPanel );

})();
(function(){


function MathRand()
{
	this.addOutput("value","number");
	this.properties = { min:0, max:1 };
	this.size = [60,20];
}

MathRand.title = "Rand";
MathRand.desc = "Random number";

MathRand.prototype.onExecute = function()
{
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

LiteGraph.registerNodeType("math/rand", MathRand);

//Math clamp
function MathClamp()
{
	this.addInput("in","number");
	this.addOutput("out","number");
	this.size = [60,20];
	this.properties = {min:0, max:1};
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


//Math scale
function MathScale()
{
	this.addInput("in","number",{label:""});
	this.addOutput("out","number",{label:""});
	this.size = [60,20];
	this.properties = {"factor":1};
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


//Math operation
function MathOperation()
{
	this.addInput("A","number");
	this.addInput("B","number");
	this.addOutput("A+B","number");
	this.properties = {A:1.0, B:1.0};
}

MathOperation.title = "Operation";
MathOperation.desc = "Easy math operators";

MathOperation.prototype.setValue = function(v)
{
	if( typeof(v) == "string") v = parseFloat(v);
	this.properties["value"] = v;
	this.setDirtyCanvas(true);
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

	for(var i = 0, l = this.outputs.length; i < l; ++i)
	{
		var output = this.outputs[i];
		if(!output.links || !output.links.length)
			continue;
		var value = 0;
		switch( output.name )
		{
			case "A+B": value = A+B; break;
			case "A-B": value = A-B; break;
			case "A*B": value = A*B; break;
			case "A/B": value = A/B; break;
		}
		this.setOutputData(i, value );
	}
}

MathOperation.prototype.onGetOutputs = function()
{
	return [["A-B","number"],["A*B","number"],["A/B","number"]];
}

LiteGraph.registerNodeType("math/operation", MathOperation );


//Math compare
function MathCompare()
{
	this.addInputs( "A","number" );
	this.addInputs( "B","number" );
	this.addOutputs("A==B","number");
	this.addOutputs("A!=B","number");
	this.properties = {A:0,B:0};
}


MathCompare.title = "Compare";
MathCompare.desc = "compares between two values";

MathCompare.prototype.onExecute = function()
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
	return [["A==B","number"],["A!=B","number"],["A>B","number"],["A<B","number"],["A>=B","number"],["A<=B","number"]];
}

LiteGraph.registerNodeType("math/compare",MathCompare);

function MathAccumulate()
{
	this.addInput("inc","number");
	this.addOutput("total","number");
	this.properties = { increment: 0, value: 0 };
}

MathAccumulate.title = "Accumulate";
MathAccumulate.desc = "Increments a value every time";

MathAccumulate.prototype.onExecute = function()
{
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
	this.properties = {amplitude:1.0, offset: 0};
	this.bgImageUrl = "nodes/imgs/icon-sin.png";
}

MathTrigonometry.title = "Trigonometry";
MathTrigonometry.desc = "Sin Cos Tan";
MathTrigonometry.filter = "shader";

MathTrigonometry.prototype.onExecute = function()
{
	var v = this.getInputData(0);
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
if(window.math)
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


//if glMatrix is installed...
if(window.glMatrix) 
{
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

		this.setOutputData( 0, vec3.fromValues(x,y,z) );
	}

	LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3 );


	function Math3DRotation()
	{
		this.addInputs([["degrees","number"],["axis","vec3"]]);
		this.addOutput("quat","quat");
		this.properties = { angle:90.0, axis: vec3.fromValues(0,1,0) };
	}

	Math3DRotation.title = "Rotation";
	Math3DRotation.desc = "quaternion rotation";

	Math3DRotation.prototype.onExecute = function()
	{
		var angle = this.getInputData(0);
		if(angle == null) angle = this.properties.angle;
		var axis = this.getInputData(1);
		if(axis == null) axis = this.properties.axis;

		var R = quat.setAxisAngle(quat.create(), axis, angle * 0.0174532925 );
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
	}

	Math3DMultQuat.title = "Mult. Quat";
	Math3DMultQuat.desc = "rotate quaternion";

	Math3DMultQuat.prototype.onExecute = function()
	{
		var A = this.getInputData(0);
		if(A == null) return;
		var B = this.getInputData(1);
		if(B == null) return;

		var R = quat.multiply(quat.create(), A,B);
		this.setOutputData( 0, R );
	}

	LiteGraph.registerNodeType("math3d/mult-quat", Math3DMultQuat );

} //glMatrix

})();
(function(){


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


function GraphicsImage()
{
	this.inputs = [];
	this.addOutput("frame","image");
	this.properties = {"url":""};
}

GraphicsImage.title = "Image";
GraphicsImage.desc = "Image loader";
GraphicsImage.widgets = [{name:"load",text:"Load",type:"button"}];


GraphicsImage.prototype.onAdded = function()
{
	if(this.properties["url"] != "" && this.img == null)
	{
		this.loadImage(this.properties["url"]);
	}
}


GraphicsImage.prototype.onExecute = function()
{
	if(!this.img)
		this.boxcolor = "#000";
	if(this.img && this.img.width)
		this.setOutputData(0,this.img);
	else
		this.setOutputData(0,null);
	if(this.img.dirty)
		this.img.dirty = false;
}

GraphicsImage.prototype.onPropertyChange = function(name,value)
{
	this.properties[name] = value;
	if (name == "url" && value != "")
		this.loadImage(value);

	return true;
}

GraphicsImage.prototype.loadImage = function(url)
{
	if(url == "")
	{
		this.img = null;
		return;
	}

	this.trace("loading image...");
	this.img = document.createElement("img");
	this.img.src = "miniproxy.php?url=" + url;
	this.boxcolor = "#F95";
	var that = this;
	this.img.onload = function()
	{
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

LiteGraph.registerNodeType("graphics/image", GraphicsImage);



function ImageCrop()
{
	this.addInput("","image");
	this.addOutputs("","image");
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
	if(!input) return;

	if(input.width)
	{
		var ctx = this.canvas.getContext("2d");

		ctx.drawImage(input, -this.properties["x"],-this.properties["y"], input.width * this.properties["scale"], input.height * this.properties["scale"]);
		this.setOutputData(0,this.canvas);
	}
	else
		this.setOutputData(0,null);
}

ImageCrop.prototype.onPropertyChange = function(name,value)
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

LiteGraph.registerNodeType("graphics/cropImage", ImageFade );


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

ImageVideo.prototype.onPropertyChange = function(name,value)
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
		trace('Webcam rejected', e);
		that._webcam_stream = false;
		that.box_color = "red";
	};
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
	this._video.hieght = this._video.videoHeight;
	this.setOutputData(0, this._video);
}

LiteGraph.registerNodeType("graphics/webcam", ImageWebcam );


})();
