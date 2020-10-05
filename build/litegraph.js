(function(global) {
    // *************************************************************
    //   LiteGraph CLASS                                     *******
    // *************************************************************

    /**
     * The Global Scope. It contains all the registered node classes.
     *
     * @class LiteGraph
     * @constructor
     */

    var LiteGraph = (global.LiteGraph = {
        VERSION: 0.4,

        CANVAS_GRID_SIZE: 10,

        NODE_TITLE_HEIGHT: 30,
        NODE_TITLE_TEXT_Y: 20,
        NODE_SLOT_HEIGHT: 20,
        NODE_WIDGET_HEIGHT: 20,
        NODE_WIDTH: 140,
        NODE_MIN_WIDTH: 50,
        NODE_COLLAPSED_RADIUS: 10,
        NODE_COLLAPSED_WIDTH: 80,
        NODE_TITLE_COLOR: "#999",
        NODE_SELECTED_TITLE_COLOR: "#FFF",
        NODE_TEXT_SIZE: 14,
        NODE_TEXT_COLOR: "#AAA",
        NODE_SUBTEXT_SIZE: 12,
        NODE_DEFAULT_COLOR: "#333",
        NODE_DEFAULT_BGCOLOR: "#353535",
        NODE_DEFAULT_BOXCOLOR: "#666",
        NODE_DEFAULT_SHAPE: "box",
        NODE_BOX_OUTLINE_COLOR: "#FFF",
        DEFAULT_SHADOW_COLOR: "rgba(0,0,0,0.5)",
        DEFAULT_GROUP_FONT: 24,

        WIDGET_BGCOLOR: "#222",
        WIDGET_OUTLINE_COLOR: "#666",
        WIDGET_TEXT_COLOR: "#DDD",
        WIDGET_SECONDARY_TEXT_COLOR: "#999",

        LINK_COLOR: "#9A9",
        EVENT_LINK_COLOR: "#A86",
        CONNECTING_LINK_COLOR: "#AFA",

        MAX_NUMBER_OF_NODES: 1000, //avoid infinite loops
        DEFAULT_POSITION: [100, 100], //default node position
        VALID_SHAPES: ["default", "box", "round", "card"], //,"circle"

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
        DOWN: 2,
        LEFT: 3,
        RIGHT: 4,
        CENTER: 5,

        STRAIGHT_LINK: 0,
        LINEAR_LINK: 1,
        SPLINE_LINK: 2,

        NORMAL_TITLE: 0,
        NO_TITLE: 1,
        TRANSPARENT_TITLE: 2,
        AUTOHIDE_TITLE: 3,

        proxy: null, //used to redirect calls
        node_images_path: "",

        debug: false,
        catch_exceptions: true,
        throw_errors: true,
        allow_scripts: false, //if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration), which could lead to exploits
        registered_node_types: {}, //nodetypes by string
        node_types_by_file_extension: {}, //used for dropping files in the canvas
        Nodes: {}, //node types by classname
		Globals: {}, //used to store vars between graphs

        searchbox_extras: {}, //used to add extra features to the search box
        auto_sort_node_types: false, // If set to true, will automatically sort node types / categories in the context menus
        stylise_property_names: false, // If set to true, will display property names like "firstName" and "first_name" as "First Name"

        /**
         * Stylise a property name that uses camel casing or underscores
         * @method stylisePropertyName
         * @param {String} name the property name to stylise
         * @return {String} the property name capitalised and separated by spaces
         */

        stylisePropertyName: function(name) {
            var prettyName = name
                .replace(/([a-z\d])([A-Z])/g, '$1 $2')
                .replace(/(.+?)_(.+?)/g, '$1 $2')
                .split(' ');

            for (var i = 0; i < prettyName.length; i++) {
                prettyName[i] = prettyName[i][0].toUpperCase() + prettyName[i].substr(1);
            }

            return prettyName.join(' ');
        },

        /**
         * Register a node class so it can be listed when the user wants to create a new one
         * @method registerNodeType
         * @param {String} type name of the node and path
         * @param {Class} base_class class containing the structure of a node
         */

        registerNodeType: function(type, base_class) {
            if (!base_class.prototype) {
                throw "Cannot register a simple object, it must be a class with a prototype";
            }
            base_class.type = type;

            if (LiteGraph.debug) {
                console.log("Node registered: " + type);
            }

            var categories = type.split("/");
            var classname = base_class.name;

            var pos = type.lastIndexOf("/");
            base_class.category = type.substr(0, pos);

            if (!base_class.title) {
                base_class.title = classname;
            }
            //info.name = name.substr(pos+1,name.length - pos);

            //extend class
            if (base_class.prototype) {
                //is a class
                for (var i in LGraphNode.prototype) {
                    if (!base_class.prototype[i]) {
                        base_class.prototype[i] = LGraphNode.prototype[i];
                    }
                }
            }

            var prev = this.registered_node_types[type];
			if(prev)
				console.log("replacing node type: " + type);
			else
			{
				if( !Object.hasOwnProperty( base_class.prototype, "shape") )
				Object.defineProperty(base_class.prototype, "shape", {
					set: function(v) {
						switch (v) {
							case "default":
								delete this._shape;
								break;
							case "box":
								this._shape = LiteGraph.BOX_SHAPE;
								break;
							case "round":
								this._shape = LiteGraph.ROUND_SHAPE;
								break;
							case "circle":
								this._shape = LiteGraph.CIRCLE_SHAPE;
								break;
							case "card":
								this._shape = LiteGraph.CARD_SHAPE;
								break;
							default:
								this._shape = v;
						}
					},
					get: function(v) {
						return this._shape;
					},
					enumerable: true,
					configurable: true
				});

				//warnings
				if (base_class.prototype.onPropertyChange) {
					console.warn(
						"LiteGraph node class " +
							type +
							" has onPropertyChange method, it must be called onPropertyChanged with d at the end"
					);
				}

				//used to know which nodes create when dragging files to the canvas
				if (base_class.supported_extensions) {
					for (var i in base_class.supported_extensions) {
						var ext = base_class.supported_extensions[i];
						if(ext && ext.constructor === String)
							this.node_types_by_file_extension[ ext.toLowerCase() ] = base_class;
					}
				}
			}

            this.registered_node_types[type] = base_class;
            if (base_class.constructor.name) {
                this.Nodes[classname] = base_class;
            }
            if (LiteGraph.onNodeTypeRegistered) {
                LiteGraph.onNodeTypeRegistered(type, base_class);
            }
            if (prev && LiteGraph.onNodeTypeReplaced) {
                LiteGraph.onNodeTypeReplaced(type, base_class, prev);
            }

            //warnings
            if (base_class.prototype.onPropertyChange) {
                console.warn(
                    "LiteGraph node class " +
                        type +
                        " has onPropertyChange method, it must be called onPropertyChanged with d at the end"
                );
            }

			//used to know which nodes create when dragging files to the canvas
            if (base_class.supported_extensions) {
                for (var i=0; i < base_class.supported_extensions.length; i++) {
					var ext = base_class.supported_extensions[i];
					if(ext && ext.constructor === String)
	                    this.node_types_by_file_extension[ ext.toLowerCase() ] = base_class;
                }
            }
        },

        /**
         * removes a node type from the system
         * @method unregisterNodeType
         * @param {String|Object} type name of the node or the node constructor itself
         */
        unregisterNodeType: function(type) {
			var base_class = type.constructor === String ? this.registered_node_types[type] : type;
			if(!base_class)
				throw("node type not found: " + type );
			delete this.registered_node_types[base_class.type];
			if(base_class.constructor.name)
				delete this.Nodes[base_class.constructor.name];
		},

        /**
         * Create a new nodetype by passing a function, it wraps it with a proper class and generates inputs according to the parameters of the function.
         * Useful to wrap simple methods that do not require properties, and that only process some input to generate an output.
         * @method wrapFunctionAsNode
         * @param {String} name node name with namespace (p.e.: 'math/sum')
         * @param {Function} func
         * @param {Array} param_types [optional] an array containing the type of every parameter, otherwise parameters will accept any type
         * @param {String} return_type [optional] string with the return type, otherwise it will be generic
         * @param {Object} properties [optional] properties to be configurable
         */
        wrapFunctionAsNode: function(
            name,
            func,
            param_types,
            return_type,
            properties
        ) {
            var params = Array(func.length);
            var code = "";
            var names = LiteGraph.getParameterNames(func);
            for (var i = 0; i < names.length; ++i) {
                code +=
                    "this.addInput('" +
                    names[i] +
                    "'," +
                    (param_types && param_types[i]
                        ? "'" + param_types[i] + "'"
                        : "0") +
                    ");\n";
            }
            code +=
                "this.addOutput('out'," +
                (return_type ? "'" + return_type + "'" : 0) +
                ");\n";
            if (properties) {
                code +=
                    "this.properties = " + JSON.stringify(properties) + ";\n";
            }
            var classobj = Function(code);
            classobj.title = name.split("/").pop();
            classobj.desc = "Generated from " + func.name;
            classobj.prototype.onExecute = function onExecute() {
                for (var i = 0; i < params.length; ++i) {
                    params[i] = this.getInputData(i);
                }
                var r = func.apply(this, params);
                this.setOutputData(0, r);
            };
            this.registerNodeType(name, classobj);
        },

        /**
         * Removes all previously registered node's types
         */
        clearRegisteredTypes: function() {
            this.registered_node_types = {};
            this.node_types_by_file_extension = {};
            this.Nodes = {};
            this.searchbox_extras = {};
        },

        /**
         * Adds this method to all nodetypes, existing and to be created
         * (You can add it to LGraphNode.prototype but then existing node types wont have it)
         * @method addNodeMethod
         * @param {Function} func
         */
        addNodeMethod: function(name, func) {
            LGraphNode.prototype[name] = func;
            for (var i in this.registered_node_types) {
                var type = this.registered_node_types[i];
                if (type.prototype[name]) {
                    type.prototype["_" + name] = type.prototype[name];
                } //keep old in case of replacing
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

        createNode: function(type, title, options) {
            var base_class = this.registered_node_types[type];
            if (!base_class) {
                if (LiteGraph.debug) {
                    console.log(
                        'GraphNode type "' + type + '" not registered.'
                    );
                }
                return null;
            }

            var prototype = base_class.prototype || base_class;

            title = title || base_class.title || type;

            var node = null;

            if (LiteGraph.catch_exceptions) {
                try {
                    node = new base_class(title);
                } catch (err) {
                    console.error(err);
                    return null;
                }
            } else {
                node = new base_class(title);
            }

            node.type = type;

            if (!node.title && title) {
                node.title = title;
            }
            if (!node.properties) {
                node.properties = {};
            }
            if (!node.properties_info) {
                node.properties_info = [];
            }
            if (!node.flags) {
                node.flags = {};
            }
            if (!node.size) {
                node.size = node.computeSize();
				//call onresize?
            }
            if (!node.pos) {
                node.pos = LiteGraph.DEFAULT_POSITION.concat();
            }
            if (!node.mode) {
                node.mode = LiteGraph.ALWAYS;
            }

            //extra options
            if (options) {
                for (var i in options) {
                    node[i] = options[i];
                }
            }

            return node;
        },

        /**
         * Returns a registered node type with a given name
         * @method getNodeType
         * @param {String} type full name of the node class. p.e. "math/sin"
         * @return {Class} the node class
         */
        getNodeType: function(type) {
            return this.registered_node_types[type];
        },

        /**
         * Returns a list of node types matching one category
         * @method getNodeType
         * @param {String} category category name
         * @return {Array} array with all the node classes
         */

        getNodeTypesInCategory: function(category, filter) {
            var r = [];
            for (var i in this.registered_node_types) {
                var type = this.registered_node_types[i];
                if (type.filter != filter) {
                    continue;
                }

                if (category == "") {
                    if (type.category == null) {
                        r.push(type);
                    }
                } else if (type.category == category) {
                    r.push(type);
                }
            }

            return this.auto_sort_node_types ? r.sort() : r;
        },

        /**
         * Returns a list with all the node type categories
         * @method getNodeTypesCategories
         * @param {String} filter only nodes with ctor.filter equal can be shown
         * @return {Array} array with all the names of the categories
         */
        getNodeTypesCategories: function( filter ) {
            var categories = { "": 1 };
            for (var i in this.registered_node_types) {
				var type = this.registered_node_types[i];
                if ( type.category && !type.skip_list )
                {
					if(type.filter != filter)
						continue;
                    categories[type.category] = 1;
                }
            }
            var result = [];
            for (var i in categories) {
                result.push(i);
            }
            return this.auto_sort_node_types ? result.sort() : result;
        },

        //debug purposes: reloads all the js scripts that matches a wildcard
        reloadNodes: function(folder_wildcard) {
            var tmp = document.getElementsByTagName("script");
            //weird, this array changes by its own, so we use a copy
            var script_files = [];
            for (var i=0; i < tmp.length; i++) {
                script_files.push(tmp[i]);
            }

            var docHeadObj = document.getElementsByTagName("head")[0];
            folder_wildcard = document.location.href + folder_wildcard;

            for (var i=0; i < script_files.length; i++) {
                var src = script_files[i].src;
                if (
                    !src ||
                    src.substr(0, folder_wildcard.length) != folder_wildcard
                ) {
                    continue;
                }

                try {
                    if (LiteGraph.debug) {
                        console.log("Reloading: " + src);
                    }
                    var dynamicScript = document.createElement("script");
                    dynamicScript.type = "text/javascript";
                    dynamicScript.src = src;
                    docHeadObj.appendChild(dynamicScript);
                    docHeadObj.removeChild(script_files[i]);
                } catch (err) {
                    if (LiteGraph.throw_errors) {
                        throw err;
                    }
                    if (LiteGraph.debug) {
                        console.log("Error while reloading " + src);
                    }
                }
            }

            if (LiteGraph.debug) {
                console.log("Nodes reloaded");
            }
        },

        //separated just to improve if it doesn't work
        cloneObject: function(obj, target) {
            if (obj == null) {
                return null;
            }
            var r = JSON.parse(JSON.stringify(obj));
            if (!target) {
                return r;
            }

            for (var i in r) {
                target[i] = r[i];
            }
            return target;
        },

        /**
         * Returns if the types of two slots are compatible (taking into account wildcards, etc)
         * @method isValidConnection
         * @param {String} type_a
         * @param {String} type_b
         * @return {Boolean} true if they can be connected
         */
        isValidConnection: function(type_a, type_b) {
            if (
                !type_a || //generic output
                !type_b || //generic input
                type_a == type_b || //same type (is valid for triggers)
                (type_a == LiteGraph.EVENT && type_b == LiteGraph.ACTION)
            ) {
                return true;
            }

            // Enforce string type to handle toLowerCase call (-1 number not ok)
            type_a = String(type_a);
            type_b = String(type_b);
            type_a = type_a.toLowerCase();
            type_b = type_b.toLowerCase();

            // For nodes supporting multiple connection types
            if (type_a.indexOf(",") == -1 && type_b.indexOf(",") == -1) {
                return type_a == type_b;
            }

            // Check all permutations to see if one is valid
            var supported_types_a = type_a.split(",");
            var supported_types_b = type_b.split(",");
            for (var i = 0; i < supported_types_a.length; ++i) {
                for (var j = 0; j < supported_types_b.length; ++j) {
                    if (supported_types_a[i] == supported_types_b[j]) {
                        return true;
                    }
                }
            }

            return false;
        },

        /**
         * Register a string in the search box so when the user types it it will recommend this node
         * @method registerSearchboxExtra
         * @param {String} node_type the node recommended
         * @param {String} description text to show next to it
         * @param {Object} data it could contain info of how the node should be configured
         * @return {Boolean} true if they can be connected
         */
        registerSearchboxExtra: function(node_type, description, data) {
            this.searchbox_extras[description.toLowerCase()] = {
                type: node_type,
                desc: description,
                data: data
            };
        },

        /**
         * Wrapper to load files (from url using fetch or from file using FileReader)
         * @method fetchFile
         * @param {String|File|Blob} url the url of the file (or the file itself)
         * @param {String} type an string to know how to fetch it: "text","arraybuffer","json","blob"
         * @param {Function} on_complete callback(data)
         * @param {Function} on_error in case of an error
         * @return {FileReader|Promise} returns the object used to 
         */
		fetchFile: function( url, type, on_complete, on_error ) {
			var that = this;
			if(!url)
				return null;

			type = type || "text";
			if( url.constructor === String )
			{
				if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
					url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
				}
				return fetch(url)
				.then(function(response) {
					if(!response.ok)
						 throw new Error("File not found"); //it will be catch below
					if(type == "arraybuffer")
						return response.arrayBuffer();
					else if(type == "text" || type == "string")
						return response.text();
					else if(type == "json")
						return response.json();
					else if(type == "blob")
						return response.blob();
				})
				.then(function(data) {
					if(on_complete)
						on_complete(data);
				})
				.catch(function(error) {
					console.error("error fetching file:",url);
					if(on_error)
						on_error(error);
				});
			}
			else if( url.constructor === File || url.constructor === Blob)
			{
				var reader = new FileReader();
				reader.onload = function(e)
				{
					var v = e.target.result;
					if( type == "json" )
						v = JSON.parse(v);
					if(on_complete)
						on_complete(v);
				}
				if(type == "arraybuffer")
					return reader.readAsArrayBuffer(url);
				else if(type == "text" || type == "json")
					return reader.readAsText(url);
				else if(type == "blob")
					return reader.readAsBinaryString(url);
			}
			return null;
		}
    });

    //timer that works everywhere
    if (typeof performance != "undefined") {
        LiteGraph.getTime = performance.now.bind(performance);
    } else if (typeof Date != "undefined" && Date.now) {
        LiteGraph.getTime = Date.now.bind(Date);
    } else if (typeof process != "undefined") {
        LiteGraph.getTime = function() {
            var t = process.hrtime();
            return t[0] * 0.001 + t[1] * 1e-6;
        };
    } else {
        LiteGraph.getTime = function getTime() {
            return new Date().getTime();
        };
    }

    //*********************************************************************************
    // LGraph CLASS
    //*********************************************************************************

    /**
     * LGraph is the class that contain a full graph. We instantiate one and add nodes to it, and then we can run the execution loop.
	 * supported callbacks:
		+ onNodeAdded: when a new node is added to the graph
		+ onNodeRemoved: when a node inside this graph is removed
		+ onNodeConnectionChange: some connection has changed in the graph (connected or disconnected)
     *
     * @class LGraph
     * @constructor
     * @param {Object} o data from previous serialization [optional]
     */

    function LGraph(o) {
        if (LiteGraph.debug) {
            console.log("Graph created");
        }
        this.list_of_graphcanvas = null;
        this.clear();

        if (o) {
            this.configure(o);
        }
    }

    global.LGraph = LiteGraph.LGraph = LGraph;

    //default supported types
    LGraph.supported_types = ["number", "string", "boolean"];

    //used to know which types of connections support this graph (some graphs do not allow certain types)
    LGraph.prototype.getSupportedTypes = function() {
        return this.supported_types || LGraph.supported_types;
    };

    LGraph.STATUS_STOPPED = 1;
    LGraph.STATUS_RUNNING = 2;

    /**
     * Removes all nodes from this graph
     * @method clear
     */

    LGraph.prototype.clear = function() {
        this.stop();
        this.status = LGraph.STATUS_STOPPED;

        this.last_node_id = 0;
        this.last_link_id = 0;

        this._version = -1; //used to detect changes

        //safe clear
        if (this._nodes) {
            for (var i = 0; i < this._nodes.length; ++i) {
                var node = this._nodes[i];
                if (node.onRemoved) {
                    node.onRemoved();
                }
            }
        }

        //nodes
        this._nodes = [];
        this._nodes_by_id = {};
        this._nodes_in_order = []; //nodes sorted in execution order
        this._nodes_executable = null; //nodes that contain onExecute sorted in execution order

        //other scene stuff
        this._groups = [];

        //links
        this.links = {}; //container with all the links

        //iterations
        this.iteration = 0;

        //custom data
        this.config = {};
		this.vars = {};
		this.extra = {}; //to store custom data

        //timing
        this.globaltime = 0;
        this.runningtime = 0;
        this.fixedtime = 0;
        this.fixedtime_lapse = 0.01;
        this.elapsed_time = 0.01;
        this.last_update_time = 0;
        this.starttime = 0;

        this.catch_errors = true;

        //subgraph_data
        this.inputs = {};
        this.outputs = {};

        //notify canvas to redraw
        this.change();

        this.sendActionToCanvas("clear");
    };

    /**
     * Attach Canvas to this graph
     * @method attachCanvas
     * @param {GraphCanvas} graph_canvas
     */

    LGraph.prototype.attachCanvas = function(graphcanvas) {
        if (graphcanvas.constructor != LGraphCanvas) {
            throw "attachCanvas expects a LGraphCanvas instance";
        }
        if (graphcanvas.graph && graphcanvas.graph != this) {
            graphcanvas.graph.detachCanvas(graphcanvas);
        }

        graphcanvas.graph = this;

        if (!this.list_of_graphcanvas) {
            this.list_of_graphcanvas = [];
        }
        this.list_of_graphcanvas.push(graphcanvas);
    };

    /**
     * Detach Canvas from this graph
     * @method detachCanvas
     * @param {GraphCanvas} graph_canvas
     */
    LGraph.prototype.detachCanvas = function(graphcanvas) {
        if (!this.list_of_graphcanvas) {
            return;
        }

        var pos = this.list_of_graphcanvas.indexOf(graphcanvas);
        if (pos == -1) {
            return;
        }
        graphcanvas.graph = null;
        this.list_of_graphcanvas.splice(pos, 1);
    };

    /**
     * Starts running this graph every interval milliseconds.
     * @method start
     * @param {number} interval amount of milliseconds between executions, if 0 then it renders to the monitor refresh rate
     */

    LGraph.prototype.start = function(interval) {
        if (this.status == LGraph.STATUS_RUNNING) {
            return;
        }
        this.status = LGraph.STATUS_RUNNING;

        if (this.onPlayEvent) {
            this.onPlayEvent();
        }

        this.sendEventToAllNodes("onStart");

        //launch
        this.starttime = LiteGraph.getTime();
        this.last_update_time = this.starttime;
        interval = interval || 0;
        var that = this;

		//execute once per frame
        if ( interval == 0 && typeof window != "undefined" && window.requestAnimationFrame ) {
            function on_frame() {
                if (that.execution_timer_id != -1) {
                    return;
                }
                window.requestAnimationFrame(on_frame);
				if(that.onBeforeStep)
					that.onBeforeStep();
                that.runStep(1, !that.catch_errors);
				if(that.onAfterStep)
					that.onAfterStep();
            }
            this.execution_timer_id = -1;
            on_frame();
        } else { //execute every 'interval' ms
            this.execution_timer_id = setInterval(function() {
                //execute
				if(that.onBeforeStep)
					that.onBeforeStep();
                that.runStep(1, !that.catch_errors);
				if(that.onAfterStep)
					that.onAfterStep();
            }, interval);
        }
    };

    /**
     * Stops the execution loop of the graph
     * @method stop execution
     */

    LGraph.prototype.stop = function() {
        if (this.status == LGraph.STATUS_STOPPED) {
            return;
        }

        this.status = LGraph.STATUS_STOPPED;

        if (this.onStopEvent) {
            this.onStopEvent();
        }

        if (this.execution_timer_id != null) {
            if (this.execution_timer_id != -1) {
                clearInterval(this.execution_timer_id);
            }
            this.execution_timer_id = null;
        }

        this.sendEventToAllNodes("onStop");
    };

    /**
     * Run N steps (cycles) of the graph
     * @method runStep
     * @param {number} num number of steps to run, default is 1
     * @param {Boolean} do_not_catch_errors [optional] if you want to try/catch errors 
     * @param {number} limit max number of nodes to execute (used to execute from start to a node)
     */

    LGraph.prototype.runStep = function(num, do_not_catch_errors, limit ) {
        num = num || 1;

        var start = LiteGraph.getTime();
        this.globaltime = 0.001 * (start - this.starttime);

        var nodes = this._nodes_executable
            ? this._nodes_executable
            : this._nodes;
        if (!nodes) {
            return;
        }

		limit = limit || nodes.length;

        if (do_not_catch_errors) {
            //iterations
            for (var i = 0; i < num; i++) {
                for (var j = 0; j < limit; ++j) {
                    var node = nodes[j];
                    if (node.mode == LiteGraph.ALWAYS && node.onExecute) {
                        node.onExecute(); //hard to send elapsed time
                    }
                }

                this.fixedtime += this.fixedtime_lapse;
                if (this.onExecuteStep) {
                    this.onExecuteStep();
                }
            }

            if (this.onAfterExecute) {
                this.onAfterExecute();
            }
        } else {
            try {
                //iterations
                for (var i = 0; i < num; i++) {
                    for (var j = 0; j < limit; ++j) {
                        var node = nodes[j];
                        if (node.mode == LiteGraph.ALWAYS && node.onExecute) {
                            node.onExecute();
                        }
                    }

                    this.fixedtime += this.fixedtime_lapse;
                    if (this.onExecuteStep) {
                        this.onExecuteStep();
                    }
                }

                if (this.onAfterExecute) {
                    this.onAfterExecute();
                }
                this.errors_in_execution = false;
            } catch (err) {
                this.errors_in_execution = true;
                if (LiteGraph.throw_errors) {
                    throw err;
                }
                if (LiteGraph.debug) {
                    console.log("Error during execution: " + err);
                }
                this.stop();
            }
        }

        var now = LiteGraph.getTime();
        var elapsed = now - start;
        if (elapsed == 0) {
            elapsed = 1;
        }
        this.execution_time = 0.001 * elapsed;
        this.globaltime += 0.001 * elapsed;
        this.iteration += 1;
        this.elapsed_time = (now - this.last_update_time) * 0.001;
        this.last_update_time = now;
    };

    /**
     * Updates the graph execution order according to relevance of the nodes (nodes with only outputs have more relevance than
     * nodes with only inputs.
     * @method updateExecutionOrder
     */
    LGraph.prototype.updateExecutionOrder = function() {
        this._nodes_in_order = this.computeExecutionOrder(false);
        this._nodes_executable = [];
        for (var i = 0; i < this._nodes_in_order.length; ++i) {
            if (this._nodes_in_order[i].onExecute) {
                this._nodes_executable.push(this._nodes_in_order[i]);
            }
        }
    };

    //This is more internal, it computes the executable nodes in order and returns it
    LGraph.prototype.computeExecutionOrder = function(
        only_onExecute,
        set_level
    ) {
        var L = [];
        var S = [];
        var M = {};
        var visited_links = {}; //to avoid repeating links
        var remaining_links = {}; //to a

        //search for the nodes without inputs (starting nodes)
        for (var i = 0, l = this._nodes.length; i < l; ++i) {
            var node = this._nodes[i];
            if (only_onExecute && !node.onExecute) {
                continue;
            }

            M[node.id] = node; //add to pending nodes

            var num = 0; //num of input connections
            if (node.inputs) {
                for (var j = 0, l2 = node.inputs.length; j < l2; j++) {
                    if (node.inputs[j] && node.inputs[j].link != null) {
                        num += 1;
                    }
                }
            }

            if (num == 0) {
                //is a starting node
                S.push(node);
                if (set_level) {
                    node._level = 1;
                }
            } //num of input links
            else {
                if (set_level) {
                    node._level = 0;
                }
                remaining_links[node.id] = num;
            }
        }

        while (true) {
            if (S.length == 0) {
                break;
            }

            //get an starting node
            var node = S.shift();
            L.push(node); //add to ordered list
            delete M[node.id]; //remove from the pending nodes

            if (!node.outputs) {
                continue;
            }

            //for every output
            for (var i = 0; i < node.outputs.length; i++) {
                var output = node.outputs[i];
                //not connected
                if (
                    output == null ||
                    output.links == null ||
                    output.links.length == 0
                ) {
                    continue;
                }

                //for every connection
                for (var j = 0; j < output.links.length; j++) {
                    var link_id = output.links[j];
                    var link = this.links[link_id];
                    if (!link) {
                        continue;
                    }

                    //already visited link (ignore it)
                    if (visited_links[link.id]) {
                        continue;
                    }

                    var target_node = this.getNodeById(link.target_id);
                    if (target_node == null) {
                        visited_links[link.id] = true;
                        continue;
                    }

                    if (
                        set_level &&
                        (!target_node._level ||
                            target_node._level <= node._level)
                    ) {
                        target_node._level = node._level + 1;
                    }

                    visited_links[link.id] = true; //mark as visited
                    remaining_links[target_node.id] -= 1; //reduce the number of links remaining
                    if (remaining_links[target_node.id] == 0) {
                        S.push(target_node);
                    } //if no more links, then add to starters array
                }
            }
        }

        //the remaining ones (loops)
        for (var i in M) {
            L.push(M[i]);
        }

        if (L.length != this._nodes.length && LiteGraph.debug) {
            console.warn("something went wrong, nodes missing");
        }

        var l = L.length;

        //save order number in the node
        for (var i = 0; i < l; ++i) {
            L[i].order = i;
        }

        //sort now by priority
        L = L.sort(function(A, B) {
            var Ap = A.constructor.priority || A.priority || 0;
            var Bp = B.constructor.priority || B.priority || 0;
            if (Ap == Bp) {
                //if same priority, sort by order
                return A.order - B.order;
            }
            return Ap - Bp; //sort by priority
        });

        //save order number in the node, again...
        for (var i = 0; i < l; ++i) {
            L[i].order = i;
        }

        return L;
    };

    /**
     * Returns all the nodes that could affect this one (ancestors) by crawling all the inputs recursively.
     * It doesn't include the node itself
     * @method getAncestors
     * @return {Array} an array with all the LGraphNodes that affect this node, in order of execution
     */
    LGraph.prototype.getAncestors = function(node) {
        var ancestors = [];
        var pending = [node];
        var visited = {};

        while (pending.length) {
            var current = pending.shift();
            if (!current.inputs) {
                continue;
            }
            if (!visited[current.id] && current != node) {
                visited[current.id] = true;
                ancestors.push(current);
            }

            for (var i = 0; i < current.inputs.length; ++i) {
                var input = current.getInputNode(i);
                if (input && ancestors.indexOf(input) == -1) {
                    pending.push(input);
                }
            }
        }

        ancestors.sort(function(a, b) {
            return a.order - b.order;
        });
        return ancestors;
    };

    /**
     * Positions every node in a more readable manner
     * @method arrange
     */
    LGraph.prototype.arrange = function(margin) {
        margin = margin || 100;

        var nodes = this.computeExecutionOrder(false, true);
        var columns = [];
        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            var col = node._level || 1;
            if (!columns[col]) {
                columns[col] = [];
            }
            columns[col].push(node);
        }

        var x = margin;

        for (var i = 0; i < columns.length; ++i) {
            var column = columns[i];
            if (!column) {
                continue;
            }
            var max_size = 100;
            var y = margin + LiteGraph.NODE_TITLE_HEIGHT;
            for (var j = 0; j < column.length; ++j) {
                var node = column[j];
                node.pos[0] = x;
                node.pos[1] = y;
                if (node.size[0] > max_size) {
                    max_size = node.size[0];
                }
                y += node.size[1] + margin + LiteGraph.NODE_TITLE_HEIGHT;
            }
            x += max_size + margin;
        }

        this.setDirtyCanvas(true, true);
    };

    /**
     * Returns the amount of time the graph has been running in milliseconds
     * @method getTime
     * @return {number} number of milliseconds the graph has been running
     */
    LGraph.prototype.getTime = function() {
        return this.globaltime;
    };

    /**
     * Returns the amount of time accumulated using the fixedtime_lapse var. This is used in context where the time increments should be constant
     * @method getFixedTime
     * @return {number} number of milliseconds the graph has been running
     */

    LGraph.prototype.getFixedTime = function() {
        return this.fixedtime;
    };

    /**
     * Returns the amount of time it took to compute the latest iteration. Take into account that this number could be not correct
     * if the nodes are using graphical actions
     * @method getElapsedTime
     * @return {number} number of milliseconds it took the last cycle
     */

    LGraph.prototype.getElapsedTime = function() {
        return this.elapsed_time;
    };

    /**
     * Sends an event to all the nodes, useful to trigger stuff
     * @method sendEventToAllNodes
     * @param {String} eventname the name of the event (function to be called)
     * @param {Array} params parameters in array format
     */
    LGraph.prototype.sendEventToAllNodes = function(eventname, params, mode) {
        mode = mode || LiteGraph.ALWAYS;

        var nodes = this._nodes_in_order ? this._nodes_in_order : this._nodes;
        if (!nodes) {
            return;
        }

        for (var j = 0, l = nodes.length; j < l; ++j) {
            var node = nodes[j];

            if (
                node.constructor === LiteGraph.Subgraph &&
                eventname != "onExecute"
            ) {
                if (node.mode == mode) {
                    node.sendEventToAllNodes(eventname, params, mode);
                }
                continue;
            }

            if (!node[eventname] || node.mode != mode) {
                continue;
            }
            if (params === undefined) {
                node[eventname]();
            } else if (params && params.constructor === Array) {
                node[eventname].apply(node, params);
            } else {
                node[eventname](params);
            }
        }
    };

    LGraph.prototype.sendActionToCanvas = function(action, params) {
        if (!this.list_of_graphcanvas) {
            return;
        }

        for (var i = 0; i < this.list_of_graphcanvas.length; ++i) {
            var c = this.list_of_graphcanvas[i];
            if (c[action]) {
                c[action].apply(c, params);
            }
        }
    };

    /**
     * Adds a new node instance to this graph
     * @method add
     * @param {LGraphNode} node the instance of the node
     */

    LGraph.prototype.add = function(node, skip_compute_order) {
        if (!node) {
            return;
        }

        //groups
        if (node.constructor === LGraphGroup) {
            this._groups.push(node);
            this.setDirtyCanvas(true);
            this.change();
            node.graph = this;
            this._version++;
            return;
        }

        //nodes
        if (node.id != -1 && this._nodes_by_id[node.id] != null) {
            console.warn(
                "LiteGraph: there is already a node with this ID, changing it"
            );
            node.id = ++this.last_node_id;
        }

        if (this._nodes.length >= LiteGraph.MAX_NUMBER_OF_NODES) {
            throw "LiteGraph: max number of nodes in a graph reached";
        }

        //give him an id
        if (node.id == null || node.id == -1) {
            node.id = ++this.last_node_id;
        } else if (this.last_node_id < node.id) {
            this.last_node_id = node.id;
        }

        node.graph = this;
        this._version++;

        this._nodes.push(node);
        this._nodes_by_id[node.id] = node;

        if (node.onAdded) {
            node.onAdded(this);
        }

        if (this.config.align_to_grid) {
            node.alignToGrid();
        }

        if (!skip_compute_order) {
            this.updateExecutionOrder();
        }

        if (this.onNodeAdded) {
            this.onNodeAdded(node);
        }

        this.setDirtyCanvas(true);
        this.change();

        return node; //to chain actions
    };

    /**
     * Removes a node from the graph
     * @method remove
     * @param {LGraphNode} node the instance of the node
     */

    LGraph.prototype.remove = function(node) {
        if (node.constructor === LiteGraph.LGraphGroup) {
            var index = this._groups.indexOf(node);
            if (index != -1) {
                this._groups.splice(index, 1);
            }
            node.graph = null;
            this._version++;
            this.setDirtyCanvas(true, true);
            this.change();
            return;
        }

        if (this._nodes_by_id[node.id] == null) {
            return;
        } //not found

        if (node.ignore_remove) {
            return;
        } //cannot be removed

        //disconnect inputs
        if (node.inputs) {
            for (var i = 0; i < node.inputs.length; i++) {
                var slot = node.inputs[i];
                if (slot.link != null) {
                    node.disconnectInput(i);
                }
            }
        }

        //disconnect outputs
        if (node.outputs) {
            for (var i = 0; i < node.outputs.length; i++) {
                var slot = node.outputs[i];
                if (slot.links != null && slot.links.length) {
                    node.disconnectOutput(i);
                }
            }
        }

        //node.id = -1; //why?

        //callback
        if (node.onRemoved) {
            node.onRemoved();
        }

        node.graph = null;
        this._version++;

        //remove from canvas render
        if (this.list_of_graphcanvas) {
            for (var i = 0; i < this.list_of_graphcanvas.length; ++i) {
                var canvas = this.list_of_graphcanvas[i];
                if (canvas.selected_nodes[node.id]) {
                    delete canvas.selected_nodes[node.id];
                }
                if (canvas.node_dragged == node) {
                    canvas.node_dragged = null;
                }
            }
        }

        //remove from containers
        var pos = this._nodes.indexOf(node);
        if (pos != -1) {
            this._nodes.splice(pos, 1);
        }
        delete this._nodes_by_id[node.id];

        if (this.onNodeRemoved) {
            this.onNodeRemoved(node);
        }

		//close panels
		this.sendActionToCanvas("checkPanels");

        this.setDirtyCanvas(true, true);
        this.change();

        this.updateExecutionOrder();
    };

    /**
     * Returns a node by its id.
     * @method getNodeById
     * @param {Number} id
     */

    LGraph.prototype.getNodeById = function(id) {
        if (id == null) {
            return null;
        }
        return this._nodes_by_id[id];
    };

    /**
     * Returns a list of nodes that matches a class
     * @method findNodesByClass
     * @param {Class} classObject the class itself (not an string)
     * @return {Array} a list with all the nodes of this type
     */
    LGraph.prototype.findNodesByClass = function(classObject, result) {
        result = result || [];
        result.length = 0;
        for (var i = 0, l = this._nodes.length; i < l; ++i) {
            if (this._nodes[i].constructor === classObject) {
                result.push(this._nodes[i]);
            }
        }
        return result;
    };

    /**
     * Returns a list of nodes that matches a type
     * @method findNodesByType
     * @param {String} type the name of the node type
     * @return {Array} a list with all the nodes of this type
     */
    LGraph.prototype.findNodesByType = function(type, result) {
        var type = type.toLowerCase();
        result = result || [];
        result.length = 0;
        for (var i = 0, l = this._nodes.length; i < l; ++i) {
            if (this._nodes[i].type.toLowerCase() == type) {
                result.push(this._nodes[i]);
            }
        }
        return result;
    };

    /**
     * Returns the first node that matches a name in its title
     * @method findNodeByTitle
     * @param {String} name the name of the node to search
     * @return {Node} the node or null
     */
    LGraph.prototype.findNodeByTitle = function(title) {
        for (var i = 0, l = this._nodes.length; i < l; ++i) {
            if (this._nodes[i].title == title) {
                return this._nodes[i];
            }
        }
        return null;
    };

    /**
     * Returns a list of nodes that matches a name
     * @method findNodesByTitle
     * @param {String} name the name of the node to search
     * @return {Array} a list with all the nodes with this name
     */
    LGraph.prototype.findNodesByTitle = function(title) {
        var result = [];
        for (var i = 0, l = this._nodes.length; i < l; ++i) {
            if (this._nodes[i].title == title) {
                result.push(this._nodes[i]);
            }
        }
        return result;
    };

    /**
     * Returns the top-most node in this position of the canvas
     * @method getNodeOnPos
     * @param {number} x the x coordinate in canvas space
     * @param {number} y the y coordinate in canvas space
     * @param {Array} nodes_list a list with all the nodes to search from, by default is all the nodes in the graph
     * @return {LGraphNode} the node at this position or null
     */
    LGraph.prototype.getNodeOnPos = function(x, y, nodes_list, margin) {
        nodes_list = nodes_list || this._nodes;
        for (var i = nodes_list.length - 1; i >= 0; i--) {
            var n = nodes_list[i];
            if (n.isPointInside(x, y, margin)) {
                return n;
            }
        }
        return null;
    };

    /**
     * Returns the top-most group in that position
     * @method getGroupOnPos
     * @param {number} x the x coordinate in canvas space
     * @param {number} y the y coordinate in canvas space
     * @return {LGraphGroup} the group or null
     */
    LGraph.prototype.getGroupOnPos = function(x, y) {
        for (var i = this._groups.length - 1; i >= 0; i--) {
            var g = this._groups[i];
            if (g.isPointInside(x, y, 2, true)) {
                return g;
            }
        }
        return null;
    };

    /**
     * Checks that the node type matches the node type registered, used when replacing a nodetype by a newer version during execution
     * this replaces the ones using the old version with the new version
     * @method checkNodeTypes
     */
    LGraph.prototype.checkNodeTypes = function() {
        var changes = false;
        for (var i = 0; i < this._nodes.length; i++) {
            var node = this._nodes[i];
            var ctor = LiteGraph.registered_node_types[node.type];
            if (node.constructor == ctor) {
                continue;
            }
            console.log("node being replaced by newer version: " + node.type);
            var newnode = LiteGraph.createNode(node.type);
            changes = true;
            this._nodes[i] = newnode;
            newnode.configure(node.serialize());
            newnode.graph = this;
            this._nodes_by_id[newnode.id] = newnode;
            if (node.inputs) {
                newnode.inputs = node.inputs.concat();
            }
            if (node.outputs) {
                newnode.outputs = node.outputs.concat();
            }
        }
        this.updateExecutionOrder();
    };

    // ********** GLOBALS *****************

    LGraph.prototype.onAction = function(action, param) {
        this._input_nodes = this.findNodesByClass(
            LiteGraph.GraphInput,
            this._input_nodes
        );
        for (var i = 0; i < this._input_nodes.length; ++i) {
            var node = this._input_nodes[i];
            if (node.properties.name != action) {
                continue;
            }
            node.onAction(action, param);
            break;
        }
    };

    LGraph.prototype.trigger = function(action, param) {
        if (this.onTrigger) {
            this.onTrigger(action, param);
        }
    };

    /**
     * Tell this graph it has a global graph input of this type
     * @method addGlobalInput
     * @param {String} name
     * @param {String} type
     * @param {*} value [optional]
     */
    LGraph.prototype.addInput = function(name, type, value) {
        var input = this.inputs[name];
        if (input) {
            //already exist
            return;
        }

		this.beforeChange();
        this.inputs[name] = { name: name, type: type, value: value };
        this._version++;
		this.afterChange();

        if (this.onInputAdded) {
            this.onInputAdded(name, type);
        }

        if (this.onInputsOutputsChange) {
            this.onInputsOutputsChange();
        }
    };

    /**
     * Assign a data to the global graph input
     * @method setGlobalInputData
     * @param {String} name
     * @param {*} data
     */
    LGraph.prototype.setInputData = function(name, data) {
        var input = this.inputs[name];
        if (!input) {
            return;
        }
        input.value = data;
    };

    /**
     * Returns the current value of a global graph input
     * @method getInputData
     * @param {String} name
     * @return {*} the data
     */
    LGraph.prototype.getInputData = function(name) {
        var input = this.inputs[name];
        if (!input) {
            return null;
        }
        return input.value;
    };

    /**
     * Changes the name of a global graph input
     * @method renameInput
     * @param {String} old_name
     * @param {String} new_name
     */
    LGraph.prototype.renameInput = function(old_name, name) {
        if (name == old_name) {
            return;
        }

        if (!this.inputs[old_name]) {
            return false;
        }

        if (this.inputs[name]) {
            console.error("there is already one input with that name");
            return false;
        }

        this.inputs[name] = this.inputs[old_name];
        delete this.inputs[old_name];
        this._version++;

        if (this.onInputRenamed) {
            this.onInputRenamed(old_name, name);
        }

        if (this.onInputsOutputsChange) {
            this.onInputsOutputsChange();
        }
    };

    /**
     * Changes the type of a global graph input
     * @method changeInputType
     * @param {String} name
     * @param {String} type
     */
    LGraph.prototype.changeInputType = function(name, type) {
        if (!this.inputs[name]) {
            return false;
        }

        if (
            this.inputs[name].type &&
            String(this.inputs[name].type).toLowerCase() ==
                String(type).toLowerCase()
        ) {
            return;
        }

        this.inputs[name].type = type;
        this._version++;
        if (this.onInputTypeChanged) {
            this.onInputTypeChanged(name, type);
        }
    };

    /**
     * Removes a global graph input
     * @method removeInput
     * @param {String} name
     * @param {String} type
     */
    LGraph.prototype.removeInput = function(name) {
        if (!this.inputs[name]) {
            return false;
        }

        delete this.inputs[name];
        this._version++;

        if (this.onInputRemoved) {
            this.onInputRemoved(name);
        }

        if (this.onInputsOutputsChange) {
            this.onInputsOutputsChange();
        }
        return true;
    };

    /**
     * Creates a global graph output
     * @method addOutput
     * @param {String} name
     * @param {String} type
     * @param {*} value
     */
    LGraph.prototype.addOutput = function(name, type, value) {
        this.outputs[name] = { name: name, type: type, value: value };
        this._version++;

        if (this.onOutputAdded) {
            this.onOutputAdded(name, type);
        }

        if (this.onInputsOutputsChange) {
            this.onInputsOutputsChange();
        }
    };

    /**
     * Assign a data to the global output
     * @method setOutputData
     * @param {String} name
     * @param {String} value
     */
    LGraph.prototype.setOutputData = function(name, value) {
        var output = this.outputs[name];
        if (!output) {
            return;
        }
        output.value = value;
    };

    /**
     * Returns the current value of a global graph output
     * @method getOutputData
     * @param {String} name
     * @return {*} the data
     */
    LGraph.prototype.getOutputData = function(name) {
        var output = this.outputs[name];
        if (!output) {
            return null;
        }
        return output.value;
    };

    /**
     * Renames a global graph output
     * @method renameOutput
     * @param {String} old_name
     * @param {String} new_name
     */
    LGraph.prototype.renameOutput = function(old_name, name) {
        if (!this.outputs[old_name]) {
            return false;
        }

        if (this.outputs[name]) {
            console.error("there is already one output with that name");
            return false;
        }

        this.outputs[name] = this.outputs[old_name];
        delete this.outputs[old_name];
        this._version++;

        if (this.onOutputRenamed) {
            this.onOutputRenamed(old_name, name);
        }

        if (this.onInputsOutputsChange) {
            this.onInputsOutputsChange();
        }
    };

    /**
     * Changes the type of a global graph output
     * @method changeOutputType
     * @param {String} name
     * @param {String} type
     */
    LGraph.prototype.changeOutputType = function(name, type) {
        if (!this.outputs[name]) {
            return false;
        }

        if (
            this.outputs[name].type &&
            String(this.outputs[name].type).toLowerCase() ==
                String(type).toLowerCase()
        ) {
            return;
        }

        this.outputs[name].type = type;
        this._version++;
        if (this.onOutputTypeChanged) {
            this.onOutputTypeChanged(name, type);
        }
    };

    /**
     * Removes a global graph output
     * @method removeOutput
     * @param {String} name
     */
    LGraph.prototype.removeOutput = function(name) {
        if (!this.outputs[name]) {
            return false;
        }
        delete this.outputs[name];
        this._version++;

        if (this.onOutputRemoved) {
            this.onOutputRemoved(name);
        }

        if (this.onInputsOutputsChange) {
            this.onInputsOutputsChange();
        }
        return true;
    };

    LGraph.prototype.triggerInput = function(name, value) {
        var nodes = this.findNodesByTitle(name);
        for (var i = 0; i < nodes.length; ++i) {
            nodes[i].onTrigger(value);
        }
    };

    LGraph.prototype.setCallback = function(name, func) {
        var nodes = this.findNodesByTitle(name);
        for (var i = 0; i < nodes.length; ++i) {
            nodes[i].setTrigger(func);
        }
    };

	//used for undo, called before any change is made to the graph
    LGraph.prototype.beforeChange = function(info) {
        if (this.onBeforeChange) {
            this.onBeforeChange(this,info);
        }
        this.sendActionToCanvas("onBeforeChange", this);
    };

	//used to resend actions, called after any change is made to the graph
    LGraph.prototype.afterChange = function(info) {
        if (this.onAfterChange) {
            this.onAfterChange(this,info);
        }
        this.sendActionToCanvas("onAfterChange", this);
    };

    LGraph.prototype.connectionChange = function(node, link_info) {
        this.updateExecutionOrder();
        if (this.onConnectionChange) {
            this.onConnectionChange(node);
        }
        this._version++;
        this.sendActionToCanvas("onConnectionChange");
    };

    /**
     * returns if the graph is in live mode
     * @method isLive
     */

    LGraph.prototype.isLive = function() {
        if (!this.list_of_graphcanvas) {
            return false;
        }

        for (var i = 0; i < this.list_of_graphcanvas.length; ++i) {
            var c = this.list_of_graphcanvas[i];
            if (c.live_mode) {
                return true;
            }
        }
        return false;
    };

    /**
     * clears the triggered slot animation in all links (stop visual animation)
     * @method clearTriggeredSlots
     */
    LGraph.prototype.clearTriggeredSlots = function() {
        for (var i in this.links) {
            var link_info = this.links[i];
            if (!link_info) {
                continue;
            }
            if (link_info._last_time) {
                link_info._last_time = 0;
            }
        }
    };

    /* Called when something visually changed (not the graph!) */
    LGraph.prototype.change = function() {
        if (LiteGraph.debug) {
            console.log("Graph changed");
        }
        this.sendActionToCanvas("setDirty", [true, true]);
        if (this.on_change) {
            this.on_change(this);
        }
    };

    LGraph.prototype.setDirtyCanvas = function(fg, bg) {
        this.sendActionToCanvas("setDirty", [fg, bg]);
    };

    /**
     * Destroys a link
     * @method removeLink
     * @param {Number} link_id
     */
    LGraph.prototype.removeLink = function(link_id) {
        var link = this.links[link_id];
        if (!link) {
            return;
        }
        var node = this.getNodeById(link.target_id);
        if (node) {
            node.disconnectInput(link.target_slot);
        }
    };

    //save and recover app state ***************************************
    /**
     * Creates a Object containing all the info about this graph, it can be serialized
     * @method serialize
     * @return {Object} value of the node
     */
    LGraph.prototype.serialize = function() {
        var nodes_info = [];
        for (var i = 0, l = this._nodes.length; i < l; ++i) {
            nodes_info.push(this._nodes[i].serialize());
        }

        //pack link info into a non-verbose format
        var links = [];
        for (var i in this.links) {
            //links is an OBJECT
            var link = this.links[i];
            if (!link.serialize) {
                //weird bug I havent solved yet
                console.warn(
                    "weird LLink bug, link info is not a LLink but a regular object"
                );
                var link2 = new LLink();
                for (var j in link) { 
                    link2[j] = link[j];
                }
                this.links[i] = link2;
                link = link2;
            }

            links.push(link.serialize());
        }

        var groups_info = [];
        for (var i = 0; i < this._groups.length; ++i) {
            groups_info.push(this._groups[i].serialize());
        }

        var data = {
            last_node_id: this.last_node_id,
            last_link_id: this.last_link_id,
            nodes: nodes_info,
            links: links,
            groups: groups_info,
            config: this.config,
			extra: this.extra,
            version: LiteGraph.VERSION
        };

		if(this.onSerialize)
			this.onSerialize(data);

        return data;
    };

    /**
     * Configure a graph from a JSON string
     * @method configure
     * @param {String} str configure a graph from a JSON string
     * @param {Boolean} returns if there was any error parsing
     */
    LGraph.prototype.configure = function(data, keep_old) {
        if (!data) {
            return;
        }

        if (!keep_old) {
            this.clear();
        }

        var nodes = data.nodes;

        //decode links info (they are very verbose)
        if (data.links && data.links.constructor === Array) {
            var links = [];
            for (var i = 0; i < data.links.length; ++i) {
                var link_data = data.links[i];
				if(!link_data) //weird bug
				{
					console.warn("serialized graph link data contains errors, skipping.");
					continue;
				}
                var link = new LLink();
                link.configure(link_data);
                links[link.id] = link;
            }
            data.links = links;
        }

        //copy all stored fields
        for (var i in data) {
			if(i == "nodes" || i == "groups" ) //links must be accepted
				continue;
            this[i] = data[i];
        }

        var error = false;

        //create nodes
        this._nodes = [];
        if (nodes) {
            for (var i = 0, l = nodes.length; i < l; ++i) {
                var n_info = nodes[i]; //stored info
                var node = LiteGraph.createNode(n_info.type, n_info.title);
                if (!node) {
                    if (LiteGraph.debug) {
                        console.log(
                            "Node not found or has errors: " + n_info.type
                        );
                    }

                    //in case of error we create a replacement node to avoid losing info
                    node = new LGraphNode();
                    node.last_serialization = n_info;
                    node.has_errors = true;
                    error = true;
                    //continue;
                }

                node.id = n_info.id; //id it or it will create a new id
                this.add(node, true); //add before configure, otherwise configure cannot create links
            }

            //configure nodes afterwards so they can reach each other
            for (var i = 0, l = nodes.length; i < l; ++i) {
                var n_info = nodes[i];
                var node = this.getNodeById(n_info.id);
                if (node) {
                    node.configure(n_info);
                }
            }
        }

        //groups
        this._groups.length = 0;
        if (data.groups) {
            for (var i = 0; i < data.groups.length; ++i) {
                var group = new LiteGraph.LGraphGroup();
                group.configure(data.groups[i]);
                this.add(group);
            }
        }

        this.updateExecutionOrder();

		this.extra = data.extra || {};

		if(this.onConfigure)
			this.onConfigure(data);

        this._version++;
        this.setDirtyCanvas(true, true);
        return error;
    };

    LGraph.prototype.load = function(url, callback) {
        var that = this;

		//from file
		if(url.constructor === File || url.constructor === Blob)
		{
			var reader = new FileReader();
			reader.addEventListener('load', function(event) {
				var data = JSON.parse(event.target.result);
				that.configure(data);
				if(callback)
					callback();
			});
			
			reader.readAsText(url);
			return;
		}

		//is a string, then an URL
        var req = new XMLHttpRequest();
        req.open("GET", url, true);
        req.send(null);
        req.onload = function(oEvent) {
            if (req.status !== 200) {
                console.error("Error loading graph:", req.status, req.response);
                return;
            }
            var data = JSON.parse( req.response );
            that.configure(data);
			if(callback)
				callback();
        };
        req.onerror = function(err) {
            console.error("Error loading graph:", err);
        };
    };

    LGraph.prototype.onNodeTrace = function(node, msg, color) {
        //TODO
    };

    //this is the class in charge of storing link information
    function LLink(id, type, origin_id, origin_slot, target_id, target_slot) {
        this.id = id;
        this.type = type;
        this.origin_id = origin_id;
        this.origin_slot = origin_slot;
        this.target_id = target_id;
        this.target_slot = target_slot;

        this._data = null;
        this._pos = new Float32Array(2); //center
    }

    LLink.prototype.configure = function(o) {
        if (o.constructor === Array) {
            this.id = o[0];
            this.origin_id = o[1];
            this.origin_slot = o[2];
            this.target_id = o[3];
            this.target_slot = o[4];
            this.type = o[5];
        } else {
            this.id = o.id;
            this.type = o.type;
            this.origin_id = o.origin_id;
            this.origin_slot = o.origin_slot;
            this.target_id = o.target_id;
            this.target_slot = o.target_slot;
        }
    };

    LLink.prototype.serialize = function() {
        return [
            this.id,
            this.origin_id,
            this.origin_slot,
            this.target_id,
            this.target_slot,
            this.type
        ];
    };

    LiteGraph.LLink = LLink;

    // *************************************************************
    //   Node CLASS                                          *******
    // *************************************************************

    /*
	title: string
	pos: [x,y]
	size: [x,y]

	input|output: every connection
		+  { name:string, type:string, pos: [x,y]=Optional, direction: "input"|"output", links: Array });

	general properties:
		+ clip_area: if you render outside the node, it will be clipped
		+ unsafe_execution: not allowed for safe execution
		+ skip_repeated_outputs: when adding new outputs, it wont show if there is one already connected
		+ resizable: if set to false it wont be resizable with the mouse
		+ horizontal: slots are distributed horizontally
		+ widgets_start_y: widgets start at y distance from the top of the node
	
	flags object:
		+ collapsed: if it is collapsed

	supported callbacks:
		+ onAdded: when added to graph (warning: this is called BEFORE the node is configured when loading)
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
		+ onBounding: in case this node has a bigger bounding than the node itself (the callback receives the bounding as [x,y,w,h])
		+ onDblClick: double clicked in the node
		+ onInputDblClick: input slot double clicked (can be used to automatically create a node connected)
		+ onOutputDblClick: output slot double clicked (can be used to automatically create a node connected)
		+ onConfigure: called after the node has been configured
		+ onSerialize: to add extra info when serializing (the callback receives the object that should be filled with the data)
		+ onSelected
		+ onDeselected
		+ onDropItem : DOM item dropped over the node
		+ onDropFile : file dropped over the node
		+ onConnectInput : if returns false the incoming connection will be canceled
		+ onConnectionsChange : a connection changed (new one or removed) (LiteGraph.INPUT or LiteGraph.OUTPUT, slot, true if connected, link_info, input_info )
		+ onAction: action slot triggered
		+ getExtraMenuOptions: to add option to context menu
*/

    /**
     * Base Class for all the node type classes
     * @class LGraphNode
     * @param {String} name a name for the node
     */

    function LGraphNode(title) {
        this._ctor(title);
    }

    global.LGraphNode = LiteGraph.LGraphNode = LGraphNode;

    LGraphNode.prototype._ctor = function(title) {
        this.title = title || "Unnamed";
        this.size = [LiteGraph.NODE_WIDTH, 60];
        this.graph = null;

        this._pos = new Float32Array(10, 10);

        Object.defineProperty(this, "pos", {
            set: function(v) {
                if (!v || v.length < 2) {
                    return;
                }
                this._pos[0] = v[0];
                this._pos[1] = v[1];
            },
            get: function() {
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
    };

    /**
     * configure a node from an object containing the serialized info
     * @method configure
     */
    LGraphNode.prototype.configure = function(info) {
        if (this.graph) {
            this.graph._version++;
        }
        for (var j in info) {
            if (j == "properties") {
                //i don't want to clone properties, I want to reuse the old container
                for (var k in info.properties) {
                    this.properties[k] = info.properties[k];
                    if (this.onPropertyChanged) {
                        this.onPropertyChanged( k, info.properties[k] );
                    }
                }
                continue;
            }

            if (info[j] == null) {
                continue;
            } else if (typeof info[j] == "object") {
                //object
                if (this[j] && this[j].configure) {
                    this[j].configure(info[j]);
                } else {
                    this[j] = LiteGraph.cloneObject(info[j], this[j]);
                }
            } //value
            else {
                this[j] = info[j];
            }
        }

        if (!info.title) {
            this.title = this.constructor.title;
        }

        if (this.onConnectionsChange) {
            if (this.inputs) {
                for (var i = 0; i < this.inputs.length; ++i) {
                    var input = this.inputs[i];
                    var link_info = this.graph
                        ? this.graph.links[input.link]
                        : null;
                    this.onConnectionsChange(
                        LiteGraph.INPUT,
                        i,
                        true,
                        link_info,
                        input
                    ); //link_info has been created now, so its updated
                }
            }

            if (this.outputs) {
                for (var i = 0; i < this.outputs.length; ++i) {
                    var output = this.outputs[i];
                    if (!output.links) {
                        continue;
                    }
                    for (var j = 0; j < output.links.length; ++j) {
                        var link_info = this.graph
                            ? this.graph.links[output.links[j]]
                            : null;
                        this.onConnectionsChange(
                            LiteGraph.OUTPUT,
                            i,
                            true,
                            link_info,
                            output
                        ); //link_info has been created now, so its updated
                    }
                }
            }
        }

		if( this.widgets )
		{
			for (var i = 0; i < this.widgets.length; ++i)
			{
				var w = this.widgets[i];
				if(!w)
					continue;
				if(w.options && w.options.property && this.properties[ w.options.property ])
					w.value = JSON.parse( JSON.stringify( this.properties[ w.options.property ] ) );
			}
			if (info.widgets_values) {
				for (var i = 0; i < info.widgets_values.length; ++i) {
					if (this.widgets[i]) {
						this.widgets[i].value = info.widgets_values[i];
					}
				}
			}
		}

        if (this.onConfigure) {
            this.onConfigure(info);
        }
    };

    /**
     * serialize the content
     * @method serialize
     */

    LGraphNode.prototype.serialize = function() {
        //create serialization object
        var o = {
            id: this.id,
            type: this.type,
            pos: this.pos,
            size: this.size,
            flags: LiteGraph.cloneObject(this.flags),
			order: this.order,
            mode: this.mode
        };

        //special case for when there were errors
        if (this.constructor === LGraphNode && this.last_serialization) {
            return this.last_serialization;
        }

        if (this.inputs) {
            o.inputs = this.inputs;
        }

        if (this.outputs) {
            //clear outputs last data (because data in connections is never serialized but stored inside the outputs info)
            for (var i = 0; i < this.outputs.length; i++) {
                delete this.outputs[i]._data;
            }
            o.outputs = this.outputs;
        }

        if (this.title && this.title != this.constructor.title) {
            o.title = this.title;
        }

        if (this.properties) {
            o.properties = LiteGraph.cloneObject(this.properties);
        }

        if (this.widgets && this.serialize_widgets) {
            o.widgets_values = [];
            for (var i = 0; i < this.widgets.length; ++i) {
				if(this.widgets[i])
	                o.widgets_values[i] = this.widgets[i].value;
				else
					o.widgets_values[i] = null;
            }
        }

        if (!o.type) {
            o.type = this.constructor.type;
        }

        if (this.color) {
            o.color = this.color;
        }
        if (this.bgcolor) {
            o.bgcolor = this.bgcolor;
        }
        if (this.boxcolor) {
            o.boxcolor = this.boxcolor;
        }
        if (this.shape) {
            o.shape = this.shape;
        }

        if (this.onSerialize) {
            if (this.onSerialize(o)) {
                console.warn(
                    "node onSerialize shouldnt return anything, data should be stored in the object pass in the first parameter"
                );
            }
        }

        return o;
    };

    /* Creates a clone of this node */
    LGraphNode.prototype.clone = function() {
        var node = LiteGraph.createNode(this.type);
        if (!node) {
            return null;
        }

        //we clone it because serialize returns shared containers
        var data = LiteGraph.cloneObject(this.serialize());

        //remove links
        if (data.inputs) {
            for (var i = 0; i < data.inputs.length; ++i) {
                data.inputs[i].link = null;
            }
        }

        if (data.outputs) {
            for (var i = 0; i < data.outputs.length; ++i) {
                if (data.outputs[i].links) {
                    data.outputs[i].links.length = 0;
                }
            }
        }

        delete data["id"];
        //remove links
        node.configure(data);

        return node;
    };

    /**
     * serialize and stringify
     * @method toString
     */

    LGraphNode.prototype.toString = function() {
        return JSON.stringify(this.serialize());
    };
    //LGraphNode.prototype.deserialize = function(info) {} //this cannot be done from within, must be done in LiteGraph

    /**
     * get the title string
     * @method getTitle
     */

    LGraphNode.prototype.getTitle = function() {
        return this.title || this.constructor.title;
    };

    /**
     * sets the value of a property
     * @method setProperty
     * @param {String} name
     * @param {*} value
     */
    LGraphNode.prototype.setProperty = function(name, value) {
        if (!this.properties) {
            this.properties = {};
        }
		if( value === this.properties[name] )
			return;
		var prev_value = this.properties[name];
        this.properties[name] = value;
        if (this.onPropertyChanged) {
            if( this.onPropertyChanged(name, value, prev_value) === false ) //abort change
				this.properties[name] = prev_value;
        }
		if(this.widgets) //widgets could be linked to properties
			for(var i = 0; i < this.widgets.length; ++i)
			{
				var w = this.widgets[i];
				if(!w)
					continue;
				if(w.options.property == name)
				{
					w.value = value;
					break;
				}
			}
    };

    // Execution *************************
    /**
     * sets the output data
     * @method setOutputData
     * @param {number} slot
     * @param {*} data
     */
    LGraphNode.prototype.setOutputData = function(slot, data) {
        if (!this.outputs) {
            return;
        }

        //this maybe slow and a niche case
        //if(slot && slot.constructor === String)
        //	slot = this.findOutputSlot(slot);

        if (slot == -1 || slot >= this.outputs.length) {
            return;
        }

        var output_info = this.outputs[slot];
        if (!output_info) {
            return;
        }

        //store data in the output itself in case we want to debug
        output_info._data = data;

        //if there are connections, pass the data to the connections
        if (this.outputs[slot].links) {
            for (var i = 0; i < this.outputs[slot].links.length; i++) {
                var link_id = this.outputs[slot].links[i];
				var link = this.graph.links[link_id];
				if(link)
					link.data = data;
            }
        }
    };

    /**
     * sets the output data type, useful when you want to be able to overwrite the data type
     * @method setOutputDataType
     * @param {number} slot
     * @param {String} datatype
     */
    LGraphNode.prototype.setOutputDataType = function(slot, type) {
        if (!this.outputs) {
            return;
        }
        if (slot == -1 || slot >= this.outputs.length) {
            return;
        }
        var output_info = this.outputs[slot];
        if (!output_info) {
            return;
        }
        //store data in the output itself in case we want to debug
        output_info.type = type;

        //if there are connections, pass the data to the connections
        if (this.outputs[slot].links) {
            for (var i = 0; i < this.outputs[slot].links.length; i++) {
                var link_id = this.outputs[slot].links[i];
                this.graph.links[link_id].type = type;
            }
        }
    };

    /**
     * Retrieves the input data (data traveling through the connection) from one slot
     * @method getInputData
     * @param {number} slot
     * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
     * @return {*} data or if it is not connected returns undefined
     */
    LGraphNode.prototype.getInputData = function(slot, force_update) {
        if (!this.inputs) {
            return;
        } //undefined;

        if (slot >= this.inputs.length || this.inputs[slot].link == null) {
            return;
        }

        var link_id = this.inputs[slot].link;
        var link = this.graph.links[link_id];
        if (!link) {
            //bug: weird case but it happens sometimes
            return null;
        }

        if (!force_update) {
            return link.data;
        }

        //special case: used to extract data from the incoming connection before the graph has been executed
        var node = this.graph.getNodeById(link.origin_id);
        if (!node) {
            return link.data;
        }

        if (node.updateOutputData) {
            node.updateOutputData(link.origin_slot);
        } else if (node.onExecute) {
            node.onExecute();
        }

        return link.data;
    };

    /**
     * Retrieves the input data type (in case this supports multiple input types)
     * @method getInputDataType
     * @param {number} slot
     * @return {String} datatype in string format
     */
    LGraphNode.prototype.getInputDataType = function(slot) {
        if (!this.inputs) {
            return null;
        } //undefined;

        if (slot >= this.inputs.length || this.inputs[slot].link == null) {
            return null;
        }
        var link_id = this.inputs[slot].link;
        var link = this.graph.links[link_id];
        if (!link) {
            //bug: weird case but it happens sometimes
            return null;
        }
        var node = this.graph.getNodeById(link.origin_id);
        if (!node) {
            return link.type;
        }
        var output_info = node.outputs[link.origin_slot];
        if (output_info) {
            return output_info.type;
        }
        return null;
    };

    /**
     * Retrieves the input data from one slot using its name instead of slot number
     * @method getInputDataByName
     * @param {String} slot_name
     * @param {boolean} force_update if set to true it will force the connected node of this slot to output data into this link
     * @return {*} data or if it is not connected returns null
     */
    LGraphNode.prototype.getInputDataByName = function(
        slot_name,
        force_update
    ) {
        var slot = this.findInputSlot(slot_name);
        if (slot == -1) {
            return null;
        }
        return this.getInputData(slot, force_update);
    };

    /**
     * tells you if there is a connection in one input slot
     * @method isInputConnected
     * @param {number} slot
     * @return {boolean}
     */
    LGraphNode.prototype.isInputConnected = function(slot) {
        if (!this.inputs) {
            return false;
        }
        return slot < this.inputs.length && this.inputs[slot].link != null;
    };

    /**
     * tells you info about an input connection (which node, type, etc)
     * @method getInputInfo
     * @param {number} slot
     * @return {Object} object or null { link: id, name: string, type: string or 0 }
     */
    LGraphNode.prototype.getInputInfo = function(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot < this.inputs.length) {
            return this.inputs[slot];
        }
        return null;
    };

    /**
     * Returns the link info in the connection of an input slot
     * @method getInputLink
     * @param {number} slot
     * @return {LLink} object or null
     */
    LGraphNode.prototype.getInputLink = function(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot < this.inputs.length) {
            var slot_info = this.inputs[slot];
			return this.graph.links[ slot_info.link ];
        }
        return null;
    };

    /**
     * returns the node connected in the input slot
     * @method getInputNode
     * @param {number} slot
     * @return {LGraphNode} node or null
     */
    LGraphNode.prototype.getInputNode = function(slot) {
        if (!this.inputs) {
            return null;
        }
        if (slot >= this.inputs.length) {
            return null;
        }
        var input = this.inputs[slot];
        if (!input || input.link === null) {
            return null;
        }
        var link_info = this.graph.links[input.link];
        if (!link_info) {
            return null;
        }
        return this.graph.getNodeById(link_info.origin_id);
    };

    /**
     * returns the value of an input with this name, otherwise checks if there is a property with that name
     * @method getInputOrProperty
     * @param {string} name
     * @return {*} value
     */
    LGraphNode.prototype.getInputOrProperty = function(name) {
        if (!this.inputs || !this.inputs.length) {
            return this.properties ? this.properties[name] : null;
        }

        for (var i = 0, l = this.inputs.length; i < l; ++i) {
            var input_info = this.inputs[i];
            if (name == input_info.name && input_info.link != null) {
                var link = this.graph.links[input_info.link];
                if (link) {
                    return link.data;
                }
            }
        }
        return this.properties[name];
    };

    /**
     * tells you the last output data that went in that slot
     * @method getOutputData
     * @param {number} slot
     * @return {Object}  object or null
     */
    LGraphNode.prototype.getOutputData = function(slot) {
        if (!this.outputs) {
            return null;
        }
        if (slot >= this.outputs.length) {
            return null;
        }

        var info = this.outputs[slot];
        return info._data;
    };

    /**
     * tells you info about an output connection (which node, type, etc)
     * @method getOutputInfo
     * @param {number} slot
     * @return {Object}  object or null { name: string, type: string, links: [ ids of links in number ] }
     */
    LGraphNode.prototype.getOutputInfo = function(slot) {
        if (!this.outputs) {
            return null;
        }
        if (slot < this.outputs.length) {
            return this.outputs[slot];
        }
        return null;
    };

    /**
     * tells you if there is a connection in one output slot
     * @method isOutputConnected
     * @param {number} slot
     * @return {boolean}
     */
    LGraphNode.prototype.isOutputConnected = function(slot) {
        if (!this.outputs) {
            return false;
        }
        return (
            slot < this.outputs.length &&
            this.outputs[slot].links &&
            this.outputs[slot].links.length
        );
    };

    /**
     * tells you if there is any connection in the output slots
     * @method isAnyOutputConnected
     * @return {boolean}
     */
    LGraphNode.prototype.isAnyOutputConnected = function() {
        if (!this.outputs) {
            return false;
        }
        for (var i = 0; i < this.outputs.length; ++i) {
            if (this.outputs[i].links && this.outputs[i].links.length) {
                return true;
            }
        }
        return false;
    };

    /**
     * retrieves all the nodes connected to this output slot
     * @method getOutputNodes
     * @param {number} slot
     * @return {array}
     */
    LGraphNode.prototype.getOutputNodes = function(slot) {
        if (!this.outputs || this.outputs.length == 0) {
            return null;
        }

        if (slot >= this.outputs.length) {
            return null;
        }

        var output = this.outputs[slot];
        if (!output.links || output.links.length == 0) {
            return null;
        }

        var r = [];
        for (var i = 0; i < output.links.length; i++) {
            var link_id = output.links[i];
            var link = this.graph.links[link_id];
            if (link) {
                var target_node = this.graph.getNodeById(link.target_id);
                if (target_node) {
                    r.push(target_node);
                }
            }
        }
        return r;
    };

    /**
     * Triggers an event in this node, this will trigger any output with the same name
     * @method trigger
     * @param {String} event name ( "on_play", ... ) if action is equivalent to false then the event is send to all
     * @param {*} param
     */
    LGraphNode.prototype.trigger = function(action, param) {
        if (!this.outputs || !this.outputs.length) {
            return;
        }

        if (this.graph)
            this.graph._last_trigger_time = LiteGraph.getTime();

        for (var i = 0; i < this.outputs.length; ++i) {
            var output = this.outputs[i];
            if ( !output || output.type !== LiteGraph.EVENT || (action && output.name != action) )
                continue;
            this.triggerSlot(i, param);
        }
    };

    /**
     * Triggers an slot event in this node
     * @method triggerSlot
     * @param {Number} slot the index of the output slot
     * @param {*} param
     * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
     */
    LGraphNode.prototype.triggerSlot = function(slot, param, link_id) {
        if (!this.outputs) {
            return;
        }

        var output = this.outputs[slot];
        if (!output) {
            return;
        }

        var links = output.links;
        if (!links || !links.length) {
            return;
        }

        if (this.graph) {
            this.graph._last_trigger_time = LiteGraph.getTime();
        }

        //for every link attached here
        for (var k = 0; k < links.length; ++k) {
            var id = links[k];
            if (link_id != null && link_id != id) {
                //to skip links
                continue;
            }
            var link_info = this.graph.links[links[k]];
            if (!link_info) {
                //not connected
                continue;
            }
            link_info._last_time = LiteGraph.getTime();
            var node = this.graph.getNodeById(link_info.target_id);
            if (!node) {
                //node not found?
                continue;
            }

            //used to mark events in graph
            var target_connection = node.inputs[link_info.target_slot];

			if (node.mode === LiteGraph.ON_TRIGGER)
			{
                if (node.onExecute) {
                    node.onExecute(param);
                }
			}
			else if (node.onAction) {
                node.onAction(target_connection.name, param);
            }
        }
    };

    /**
     * clears the trigger slot animation
     * @method clearTriggeredSlot
     * @param {Number} slot the index of the output slot
     * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
     */
    LGraphNode.prototype.clearTriggeredSlot = function(slot, link_id) {
        if (!this.outputs) {
            return;
        }

        var output = this.outputs[slot];
        if (!output) {
            return;
        }

        var links = output.links;
        if (!links || !links.length) {
            return;
        }

        //for every link attached here
        for (var k = 0; k < links.length; ++k) {
            var id = links[k];
            if (link_id != null && link_id != id) {
                //to skip links
                continue;
            }
            var link_info = this.graph.links[links[k]];
            if (!link_info) {
                //not connected
                continue;
            }
            link_info._last_time = 0;
        }
    };

    /**
     * changes node size and triggers callback
     * @method setSize
     * @param {vec2} size
     */
    LGraphNode.prototype.setSize = function(size)
	{
		this.size = size;
		if(this.onResize)
			this.onResize(this.size);
	}

    /**
     * add a new property to this node
     * @method addProperty
     * @param {string} name
     * @param {*} default_value
     * @param {string} type string defining the output type ("vec3","number",...)
     * @param {Object} extra_info this can be used to have special properties of the property (like values, etc)
     */
    LGraphNode.prototype.addProperty = function(
        name,
        default_value,
        type,
        extra_info
    ) {
        var o = { name: name, type: type, default_value: default_value };
        if (extra_info) {
            for (var i in extra_info) {
                o[i] = extra_info[i];
            }
        }
        if (!this.properties_info) {
            this.properties_info = [];
        }
        this.properties_info.push(o);
        if (!this.properties) {
            this.properties = {};
        }
        this.properties[name] = default_value;
        return o;
    };

    //connections

    /**
     * add a new output slot to use in this node
     * @method addOutput
     * @param {string} name
     * @param {string} type string defining the output type ("vec3","number",...)
     * @param {Object} extra_info this can be used to have special properties of an output (label, special color, position, etc)
     */
    LGraphNode.prototype.addOutput = function(name, type, extra_info) {
        var o = { name: name, type: type, links: null };
        if (extra_info) {
            for (var i in extra_info) {
                o[i] = extra_info[i];
            }
        }

        if (!this.outputs) {
            this.outputs = [];
        }
        this.outputs.push(o);
        if (this.onOutputAdded) {
            this.onOutputAdded(o);
        }
        this.setSize( this.computeSize() );
        this.setDirtyCanvas(true, true);
        return o;
    };

    /**
     * add a new output slot to use in this node
     * @method addOutputs
     * @param {Array} array of triplets like [[name,type,extra_info],[...]]
     */
    LGraphNode.prototype.addOutputs = function(array) {
        for (var i = 0; i < array.length; ++i) {
            var info = array[i];
            var o = { name: info[0], type: info[1], link: null };
            if (array[2]) {
                for (var j in info[2]) {
                    o[j] = info[2][j];
                }
            }

            if (!this.outputs) {
                this.outputs = [];
            }
            this.outputs.push(o);
            if (this.onOutputAdded) {
                this.onOutputAdded(o);
            }
        }

        this.setSize( this.computeSize() );
        this.setDirtyCanvas(true, true);
    };

    /**
     * remove an existing output slot
     * @method removeOutput
     * @param {number} slot
     */
    LGraphNode.prototype.removeOutput = function(slot) {
        this.disconnectOutput(slot);
        this.outputs.splice(slot, 1);
        for (var i = slot; i < this.outputs.length; ++i) {
            if (!this.outputs[i] || !this.outputs[i].links) {
                continue;
            }
            var links = this.outputs[i].links;
            for (var j = 0; j < links.length; ++j) {
                var link = this.graph.links[links[j]];
                if (!link) {
                    continue;
                }
                link.origin_slot -= 1;
            }
        }

        this.setSize( this.computeSize() );
        if (this.onOutputRemoved) {
            this.onOutputRemoved(slot);
        }
        this.setDirtyCanvas(true, true);
    };

    /**
     * add a new input slot to use in this node
     * @method addInput
     * @param {string} name
     * @param {string} type string defining the input type ("vec3","number",...), it its a generic one use 0
     * @param {Object} extra_info this can be used to have special properties of an input (label, color, position, etc)
     */
    LGraphNode.prototype.addInput = function(name, type, extra_info) {
        type = type || 0;
        var o = { name: name, type: type, link: null };
        if (extra_info) {
            for (var i in extra_info) {
                o[i] = extra_info[i];
            }
        }

        if (!this.inputs) {
            this.inputs = [];
        }

        this.inputs.push(o);
        this.setSize( this.computeSize() );

        if (this.onInputAdded) {
            this.onInputAdded(o);
        }

        this.setDirtyCanvas(true, true);
        return o;
    };

    /**
     * add several new input slots in this node
     * @method addInputs
     * @param {Array} array of triplets like [[name,type,extra_info],[...]]
     */
    LGraphNode.prototype.addInputs = function(array) {
        for (var i = 0; i < array.length; ++i) {
            var info = array[i];
            var o = { name: info[0], type: info[1], link: null };
            if (array[2]) {
                for (var j in info[2]) {
                    o[j] = info[2][j];
                }
            }

            if (!this.inputs) {
                this.inputs = [];
            }
            this.inputs.push(o);
            if (this.onInputAdded) {
                this.onInputAdded(o);
            }
        }

        this.setSize( this.computeSize() );
        this.setDirtyCanvas(true, true);
    };

    /**
     * remove an existing input slot
     * @method removeInput
     * @param {number} slot
     */
    LGraphNode.prototype.removeInput = function(slot) {
        this.disconnectInput(slot);
        var slot_info = this.inputs.splice(slot, 1);
        for (var i = slot; i < this.inputs.length; ++i) {
            if (!this.inputs[i]) {
                continue;
            }
            var link = this.graph.links[this.inputs[i].link];
            if (!link) {
                continue;
            }
            link.target_slot -= 1;
        }
        this.setSize( this.computeSize() );
        if (this.onInputRemoved) {
            this.onInputRemoved(slot, slot_info[0] );
        }
        this.setDirtyCanvas(true, true);
    };

    /**
     * add an special connection to this node (used for special kinds of graphs)
     * @method addConnection
     * @param {string} name
     * @param {string} type string defining the input type ("vec3","number",...)
     * @param {[x,y]} pos position of the connection inside the node
     * @param {string} direction if is input or output
     */
    LGraphNode.prototype.addConnection = function(name, type, pos, direction) {
        var o = {
            name: name,
            type: type,
            pos: pos,
            direction: direction,
            links: null
        };
        this.connections.push(o);
        return o;
    };

    /**
     * computes the minimum size of a node according to its inputs and output slots
     * @method computeSize
     * @param {number} minHeight
     * @return {number} the total size
     */
    LGraphNode.prototype.computeSize = function(out) {
        if (this.constructor.size) {
            return this.constructor.size.concat();
        }

        var rows = Math.max(
            this.inputs ? this.inputs.length : 1,
            this.outputs ? this.outputs.length : 1
        );
        var size = out || new Float32Array([0, 0]);
        rows = Math.max(rows, 1);
        var font_size = LiteGraph.NODE_TEXT_SIZE; //although it should be graphcanvas.inner_text_font size

        var font_size = font_size;
        var title_width = compute_text_size(this.title);
        var input_width = 0;
        var output_width = 0;

        if (this.inputs) {
            for (var i = 0, l = this.inputs.length; i < l; ++i) {
                var input = this.inputs[i];
                var text = input.label || input.name || "";
                var text_width = compute_text_size(text);
                if (input_width < text_width) {
                    input_width = text_width;
                }
            }
        }

        if (this.outputs) {
            for (var i = 0, l = this.outputs.length; i < l; ++i) {
                var output = this.outputs[i];
                var text = output.label || output.name || "";
                var text_width = compute_text_size(text);
                if (output_width < text_width) {
                    output_width = text_width;
                }
            }
        }

        size[0] = Math.max(input_width + output_width + 10, title_width);
        size[0] = Math.max(size[0], LiteGraph.NODE_WIDTH);
        if (this.widgets && this.widgets.length) {
            size[0] = Math.max(size[0], LiteGraph.NODE_WIDTH * 1.5);
        }

        size[1] = (this.constructor.slot_start_y || 0) + rows * LiteGraph.NODE_SLOT_HEIGHT;

        var widgets_height = 0;
        if (this.widgets && this.widgets.length) {
            for (var i = 0, l = this.widgets.length; i < l; ++i) {
                if (this.widgets[i].computeSize)
                    widgets_height += this.widgets[i].computeSize(size[0])[1] + 4;
                else
                    widgets_height += LiteGraph.NODE_WIDGET_HEIGHT + 4;
            }
            widgets_height += 8;
        }

        //compute height using widgets height
        if( this.widgets_up )
            size[1] = Math.max( size[1], widgets_height );
        else if( this.widgets_start_y != null )
            size[1] = Math.max( size[1], widgets_height + this.widgets_start_y );
        else
            size[1] += widgets_height;

        function compute_text_size(text) {
            if (!text) {
                return 0;
            }
            return font_size * text.length * 0.6;
        }

        if (
            this.constructor.min_height &&
            size[1] < this.constructor.min_height
        ) {
            size[1] = this.constructor.min_height;
        }

        size[1] += 6; //margin

        return size;
    };

    /**
     * returns all the info available about a property of this node.
     *
     * @method getPropertyInfo
     * @param {String} property name of the property
     * @return {Object} the object with all the available info
    */
    LGraphNode.prototype.getPropertyInfo = function( property )
	{
        var info = null;

		//there are several ways to define info about a property
		//legacy mode
		if (this.properties_info) {
            for (var i = 0; i < this.properties_info.length; ++i) {
                if (this.properties_info[i].name == property) {
                    info = this.properties_info[i];
                    break;
                }
            }
        }
		//litescene mode using the constructor
		if(this.constructor["@" + property])
			info = this.constructor["@" + property];

		if(this.constructor.widgets_info && this.constructor.widgets_info[property])
			info = this.constructor.widgets_info[property];

		//litescene mode using the constructor
		if (!info && this.onGetPropertyInfo) {
            info = this.onGetPropertyInfo(property);
        }

        if (!info)
            info = {};
		if(!info.type)
			info.type = typeof this.properties[property];
		if(info.widget == "combo")
			info.type = "enum";

		return info;
	}

    /**
     * Defines a widget inside the node, it will be rendered on top of the node, you can control lots of properties
     *
     * @method addWidget
     * @param {String} type the widget type (could be "number","string","combo"
     * @param {String} name the text to show on the widget
     * @param {String} value the default value
     * @param {Function|String} callback function to call when it changes (optionally, it can be the name of the property to modify)
     * @param {Object} options the object that contains special properties of this widget 
     * @return {Object} the created widget object
     */
    LGraphNode.prototype.addWidget = function( type, name, value, callback, options )
	{
        if (!this.widgets) {
            this.widgets = [];
        }

		if(!options && callback && callback.constructor === Object)
		{
			options = callback;
			callback = null;
		}

		if(options && options.constructor === String) //options can be the property name
			options = { property: options };

		if(callback && callback.constructor === String) //callback can be the property name
		{
			if(!options)
				options = {};
			options.property = callback;
			callback = null;
		}

		if(callback && callback.constructor !== Function)
		{
			console.warn("addWidget: callback must be a function");
			callback = null;
		}

        var w = {
            type: type.toLowerCase(),
            name: name,
            value: value,
            callback: callback,
            options: options || {}
        };

        if (w.options.y !== undefined) {
            w.y = w.options.y;
        }

        if (!callback && !w.options.callback && !w.options.property) {
            console.warn("LiteGraph addWidget(...) without a callback or property assigned");
        }
        if (type == "combo" && !w.options.values) {
            throw "LiteGraph addWidget('combo',...) requires to pass values in options: { values:['red','blue'] }";
        }
        this.widgets.push(w);
		this.setSize( this.computeSize() );
        return w;
    };

    LGraphNode.prototype.addCustomWidget = function(custom_widget) {
        if (!this.widgets) {
            this.widgets = [];
        }
        this.widgets.push(custom_widget);
        return custom_widget;
    };

    /**
     * returns the bounding of the object, used for rendering purposes
     * bounding is: [topleft_cornerx, topleft_cornery, width, height]
     * @method getBounding
     * @return {Float32Array[4]} the total size
     */
    LGraphNode.prototype.getBounding = function(out) {
        out = out || new Float32Array(4);
        out[0] = this.pos[0] - 4;
        out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
        out[2] = this.size[0] + 4;
        out[3] = this.size[1] + LiteGraph.NODE_TITLE_HEIGHT;

        if (this.onBounding) {
            this.onBounding(out);
        }
        return out;
    };

    /**
     * checks if a point is inside the shape of a node
     * @method isPointInside
     * @param {number} x
     * @param {number} y
     * @return {boolean}
     */
    LGraphNode.prototype.isPointInside = function(x, y, margin, skip_title) {
        margin = margin || 0;

        var margin_top = this.graph && this.graph.isLive() ? 0 : LiteGraph.NODE_TITLE_HEIGHT;
        if (skip_title) {
            margin_top = 0;
        }
        if (this.flags && this.flags.collapsed) {
            //if ( distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
            if (
                isInsideRectangle(
                    x,
                    y,
                    this.pos[0] - margin,
                    this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT - margin,
                    (this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH) +
                        2 * margin,
                    LiteGraph.NODE_TITLE_HEIGHT + 2 * margin
                )
            ) {
                return true;
            }
        } else if (
            this.pos[0] - 4 - margin < x &&
            this.pos[0] + this.size[0] + 4 + margin > x &&
            this.pos[1] - margin_top - margin < y &&
            this.pos[1] + this.size[1] + margin > y
        ) {
            return true;
        }
        return false;
    };

    /**
     * checks if a point is inside a node slot, and returns info about which slot
     * @method getSlotInPosition
     * @param {number} x
     * @param {number} y
     * @return {Object} if found the object contains { input|output: slot object, slot: number, link_pos: [x,y] }
     */
    LGraphNode.prototype.getSlotInPosition = function(x, y) {
        //search for inputs
        var link_pos = new Float32Array(2);
        if (this.inputs) {
            for (var i = 0, l = this.inputs.length; i < l; ++i) {
                var input = this.inputs[i];
                this.getConnectionPos(true, i, link_pos);
                if (
                    isInsideRectangle(
                        x,
                        y,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        20,
                        10
                    )
                ) {
                    return { input: input, slot: i, link_pos: link_pos };
                }
            }
        }

        if (this.outputs) {
            for (var i = 0, l = this.outputs.length; i < l; ++i) {
                var output = this.outputs[i];
                this.getConnectionPos(false, i, link_pos);
                if (
                    isInsideRectangle(
                        x,
                        y,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        20,
                        10
                    )
                ) {
                    return { output: output, slot: i, link_pos: link_pos };
                }
            }
        }

        return null;
    };

    /**
     * returns the input slot with a given name (used for dynamic slots), -1 if not found
     * @method findInputSlot
     * @param {string} name the name of the slot
     * @return {number} the slot (-1 if not found)
     */
    LGraphNode.prototype.findInputSlot = function(name) {
        if (!this.inputs) {
            return -1;
        }
        for (var i = 0, l = this.inputs.length; i < l; ++i) {
            if (name == this.inputs[i].name) {
                return i;
            }
        }
        return -1;
    };

    /**
     * returns the output slot with a given name (used for dynamic slots), -1 if not found
     * @method findOutputSlot
     * @param {string} name the name of the slot
     * @return {number} the slot (-1 if not found)
     */
    LGraphNode.prototype.findOutputSlot = function(name) {
        if (!this.outputs) {
            return -1;
        }
        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            if (name == this.outputs[i].name) {
                return i;
            }
        }
        return -1;
    };

    /**
     * connect this node output to the input of another node
     * @method connect
     * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} node the target node
     * @param {number_or_string} target_slot the input slot of the target node (could be the number of the slot or the string with the name of the slot, or -1 to connect a trigger)
     * @return {Object} the link_info is created, otherwise null
     */
    LGraphNode.prototype.connect = function(slot, target_node, target_slot) {
        target_slot = target_slot || 0;

        if (!this.graph) {
            //could be connected before adding it to a graph
            console.log(
                "Connect: Error, node doesn't belong to any graph. Nodes must be added first to a graph before connecting them."
            ); //due to link ids being associated with graphs
            return null;
        }

        //seek for the output slot
        if (slot.constructor === String) {
            slot = this.findOutputSlot(slot);
            if (slot == -1) {
                if (LiteGraph.debug) {
                    console.log("Connect: Error, no slot of name " + slot);
                }
                return null;
            }
        } else if (!this.outputs || slot >= this.outputs.length) {
            if (LiteGraph.debug) {
                console.log("Connect: Error, slot number not found");
            }
            return null;
        }

        if (target_node && target_node.constructor === Number) {
            target_node = this.graph.getNodeById(target_node);
        }
        if (!target_node) {
            throw "target node is null";
        }

        //avoid loopback
        if (target_node == this) {
            return null;
        }

        //you can specify the slot by name
        if (target_slot.constructor === String) {
            target_slot = target_node.findInputSlot(target_slot);
            if (target_slot == -1) {
                if (LiteGraph.debug) {
                    console.log(
                        "Connect: Error, no slot of name " + target_slot
                    );
                }
                return null;
            }
        } else if (target_slot === LiteGraph.EVENT) {
            //search for first slot with event?
            /*
		//create input for trigger
		var input = target_node.addInput("onTrigger", LiteGraph.EVENT );
		target_slot = target_node.inputs.length - 1; //last one is the one created
		target_node.mode = LiteGraph.ON_TRIGGER;
		*/
            return null;
        } else if (
            !target_node.inputs ||
            target_slot >= target_node.inputs.length
        ) {
            if (LiteGraph.debug) {
                console.log("Connect: Error, slot number not found");
            }
            return null;
        }

		var changed = false;

        //if there is something already plugged there, disconnect
        if (target_node.inputs[target_slot].link != null) {
			this.graph.beforeChange();
            target_node.disconnectInput(target_slot);
			changed = true;
        }

        //why here??
        //this.setDirtyCanvas(false,true);
        //this.graph.connectionChange( this );

        var output = this.outputs[slot];

        //allows nodes to block connection
        if (target_node.onConnectInput) {
            if ( target_node.onConnectInput(target_slot, output.type, output, this, slot) === false ) {
                return null;
            }
        }

        var input = target_node.inputs[target_slot];
        var link_info = null;

		//this slots cannot be connected (different types)
        if (!LiteGraph.isValidConnection(output.type, input.type))
		{
	        this.setDirtyCanvas(false, true);
			if(changed)
		        this.graph.connectionChange(this, link_info);
			return null;
		}

		if(!changed)
			this.graph.beforeChange();

		//create link class
		link_info = new LLink(
			++this.graph.last_link_id,
			input.type,
			this.id,
			slot,
			target_node.id,
			target_slot
		);

		//add to graph links list
		this.graph.links[link_info.id] = link_info;

		//connect in output
		if (output.links == null) {
			output.links = [];
		}
		output.links.push(link_info.id);
		//connect in input
		target_node.inputs[target_slot].link = link_info.id;
		if (this.graph) {
			this.graph._version++;
		}
		if (this.onConnectionsChange) {
			this.onConnectionsChange(
				LiteGraph.OUTPUT,
				slot,
				true,
				link_info,
				output
			);
		} //link_info has been created now, so its updated
		if (target_node.onConnectionsChange) {
			target_node.onConnectionsChange(
				LiteGraph.INPUT,
				target_slot,
				true,
				link_info,
				input
			);
		}
		if (this.graph && this.graph.onNodeConnectionChange) {
			this.graph.onNodeConnectionChange(
				LiteGraph.INPUT,
				target_node,
				target_slot,
				this,
				slot
			);
			this.graph.onNodeConnectionChange(
				LiteGraph.OUTPUT,
				this,
				slot,
				target_node,
				target_slot
			);
		}

        this.setDirtyCanvas(false, true);
		this.graph.afterChange();
		this.graph.connectionChange(this, link_info);

        return link_info;
    };

    /**
     * disconnect one output to an specific node
     * @method disconnectOutput
     * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} target_node the target node to which this slot is connected [Optional, if not target_node is specified all nodes will be disconnected]
     * @return {boolean} if it was disconnected successfully
     */
    LGraphNode.prototype.disconnectOutput = function(slot, target_node) {
        if (slot.constructor === String) {
            slot = this.findOutputSlot(slot);
            if (slot == -1) {
                if (LiteGraph.debug) {
                    console.log("Connect: Error, no slot of name " + slot);
                }
                return false;
            }
        } else if (!this.outputs || slot >= this.outputs.length) {
            if (LiteGraph.debug) {
                console.log("Connect: Error, slot number not found");
            }
            return false;
        }

        //get output slot
        var output = this.outputs[slot];
        if (!output || !output.links || output.links.length == 0) {
            return false;
        }

        //one of the output links in this slot
        if (target_node) {
            if (target_node.constructor === Number) {
                target_node = this.graph.getNodeById(target_node);
            }
            if (!target_node) {
                throw "Target Node not found";
            }

            for (var i = 0, l = output.links.length; i < l; i++) {
                var link_id = output.links[i];
                var link_info = this.graph.links[link_id];

                //is the link we are searching for...
                if (link_info.target_id == target_node.id) {
                    output.links.splice(i, 1); //remove here
                    var input = target_node.inputs[link_info.target_slot];
                    input.link = null; //remove there
                    delete this.graph.links[link_id]; //remove the link from the links pool
                    if (this.graph) {
                        this.graph._version++;
                    }
                    if (target_node.onConnectionsChange) {
                        target_node.onConnectionsChange(
                            LiteGraph.INPUT,
                            link_info.target_slot,
                            false,
                            link_info,
                            input
                        );
                    } //link_info hasn't been modified so its ok
                    if (this.onConnectionsChange) {
                        this.onConnectionsChange(
                            LiteGraph.OUTPUT,
                            slot,
                            false,
                            link_info,
                            output
                        );
                    }
                    if (this.graph && this.graph.onNodeConnectionChange) {
                        this.graph.onNodeConnectionChange(
                            LiteGraph.OUTPUT,
                            this,
                            slot
                        );
                    }
                    if (this.graph && this.graph.onNodeConnectionChange) {
                        this.graph.onNodeConnectionChange(
                            LiteGraph.OUTPUT,
                            this,
                            slot
                        );
                        this.graph.onNodeConnectionChange(
                            LiteGraph.INPUT,
                            target_node,
                            link_info.target_slot
                        );
                    }
                    break;
                }
            }
        } //all the links in this output slot
        else {
            for (var i = 0, l = output.links.length; i < l; i++) {
                var link_id = output.links[i];
                var link_info = this.graph.links[link_id];
                if (!link_info) {
                    //bug: it happens sometimes
                    continue;
                }

                var target_node = this.graph.getNodeById(link_info.target_id);
                var input = null;
                if (this.graph) {
                    this.graph._version++;
                }
                if (target_node) {
                    input = target_node.inputs[link_info.target_slot];
                    input.link = null; //remove other side link
                    if (target_node.onConnectionsChange) {
                        target_node.onConnectionsChange(
                            LiteGraph.INPUT,
                            link_info.target_slot,
                            false,
                            link_info,
                            input
                        );
                    } //link_info hasn't been modified so its ok
                    if (this.graph && this.graph.onNodeConnectionChange) {
                        this.graph.onNodeConnectionChange(
                            LiteGraph.INPUT,
                            target_node,
                            link_info.target_slot
                        );
                    }
                }
                delete this.graph.links[link_id]; //remove the link from the links pool
                if (this.onConnectionsChange) {
                    this.onConnectionsChange(
                        LiteGraph.OUTPUT,
                        slot,
                        false,
                        link_info,
                        output
                    );
                }
                if (this.graph && this.graph.onNodeConnectionChange) {
                    this.graph.onNodeConnectionChange(
                        LiteGraph.OUTPUT,
                        this,
                        slot
                    );
                    this.graph.onNodeConnectionChange(
                        LiteGraph.INPUT,
                        target_node,
                        link_info.target_slot
                    );
                }
            }
            output.links = null;
        }

        this.setDirtyCanvas(false, true);
        this.graph.connectionChange(this);
        return true;
    };

    /**
     * disconnect one input
     * @method disconnectInput
     * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
     * @return {boolean} if it was disconnected successfully
     */
    LGraphNode.prototype.disconnectInput = function(slot) {
        //seek for the output slot
        if (slot.constructor === String) {
            slot = this.findInputSlot(slot);
            if (slot == -1) {
                if (LiteGraph.debug) {
                    console.log("Connect: Error, no slot of name " + slot);
                }
                return false;
            }
        } else if (!this.inputs || slot >= this.inputs.length) {
            if (LiteGraph.debug) {
                console.log("Connect: Error, slot number not found");
            }
            return false;
        }

        var input = this.inputs[slot];
        if (!input) {
            return false;
        }

        var link_id = this.inputs[slot].link;
		if(link_id != null)
		{
			this.inputs[slot].link = null;

			//remove other side
			var link_info = this.graph.links[link_id];
			if (link_info) {
				var target_node = this.graph.getNodeById(link_info.origin_id);
				if (!target_node) {
					return false;
				}

				var output = target_node.outputs[link_info.origin_slot];
				if (!output || !output.links || output.links.length == 0) {
					return false;
				}

				//search in the inputs list for this link
				for (var i = 0, l = output.links.length; i < l; i++) {
					if (output.links[i] == link_id) {
						output.links.splice(i, 1);
						break;
					}
				}

				delete this.graph.links[link_id]; //remove from the pool
				if (this.graph) {
					this.graph._version++;
				}
				if (this.onConnectionsChange) {
					this.onConnectionsChange(
						LiteGraph.INPUT,
						slot,
						false,
						link_info,
						input
					);
				}
				if (target_node.onConnectionsChange) {
					target_node.onConnectionsChange(
						LiteGraph.OUTPUT,
						i,
						false,
						link_info,
						output
					);
				}
				if (this.graph && this.graph.onNodeConnectionChange) {
					this.graph.onNodeConnectionChange(
						LiteGraph.OUTPUT,
						target_node,
						i
					);
					this.graph.onNodeConnectionChange(LiteGraph.INPUT, this, slot);
				}
			}
		} //link != null

        this.setDirtyCanvas(false, true);
		if(this.graph)
	        this.graph.connectionChange(this);
        return true;
    };

    /**
     * returns the center of a connection point in canvas coords
     * @method getConnectionPos
     * @param {boolean} is_input true if if a input slot, false if it is an output
     * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {vec2} out [optional] a place to store the output, to free garbage
     * @return {[x,y]} the position
     **/
    LGraphNode.prototype.getConnectionPos = function(
        is_input,
        slot_number,
        out
    ) {
        out = out || new Float32Array(2);
        var num_slots = 0;
        if (is_input && this.inputs) {
            num_slots = this.inputs.length;
        }
        if (!is_input && this.outputs) {
            num_slots = this.outputs.length;
        }

        var offset = LiteGraph.NODE_SLOT_HEIGHT * 0.5;

        if (this.flags.collapsed) {
            var w = this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH;
            if (this.horizontal) {
                out[0] = this.pos[0] + w * 0.5;
                if (is_input) {
                    out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
                } else {
                    out[1] = this.pos[1];
                }
            } else {
                if (is_input) {
                    out[0] = this.pos[0];
                } else {
                    out[0] = this.pos[0] + w;
                }
                out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            }
            return out;
        }

        //weird feature that never got finished
        if (is_input && slot_number == -1) {
            out[0] = this.pos[0] + LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            out[1] = this.pos[1] + LiteGraph.NODE_TITLE_HEIGHT * 0.5;
            return out;
        }

        //hard-coded pos
        if (
            is_input &&
            num_slots > slot_number &&
            this.inputs[slot_number].pos
        ) {
            out[0] = this.pos[0] + this.inputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.inputs[slot_number].pos[1];
            return out;
        } else if (
            !is_input &&
            num_slots > slot_number &&
            this.outputs[slot_number].pos
        ) {
            out[0] = this.pos[0] + this.outputs[slot_number].pos[0];
            out[1] = this.pos[1] + this.outputs[slot_number].pos[1];
            return out;
        }

        //horizontal distributed slots
        if (this.horizontal) {
            out[0] =
                this.pos[0] + (slot_number + 0.5) * (this.size[0] / num_slots);
            if (is_input) {
                out[1] = this.pos[1] - LiteGraph.NODE_TITLE_HEIGHT;
            } else {
                out[1] = this.pos[1] + this.size[1];
            }
            return out;
        }

        //default vertical slots
        if (is_input) {
            out[0] = this.pos[0] + offset;
        } else {
            out[0] = this.pos[0] + this.size[0] + 1 - offset;
        }
        out[1] =
            this.pos[1] +
            (slot_number + 0.7) * LiteGraph.NODE_SLOT_HEIGHT +
            (this.constructor.slot_start_y || 0);
        return out;
    };

    /* Force align to grid */
    LGraphNode.prototype.alignToGrid = function() {
        this.pos[0] =
            LiteGraph.CANVAS_GRID_SIZE *
            Math.round(this.pos[0] / LiteGraph.CANVAS_GRID_SIZE);
        this.pos[1] =
            LiteGraph.CANVAS_GRID_SIZE *
            Math.round(this.pos[1] / LiteGraph.CANVAS_GRID_SIZE);
    };

    /* Console output */
    LGraphNode.prototype.trace = function(msg) {
        if (!this.console) {
            this.console = [];
        }

        this.console.push(msg);
        if (this.console.length > LGraphNode.MAX_CONSOLE) {
            this.console.shift();
        }

		if(this.graph.onNodeTrace)
	        this.graph.onNodeTrace(this, msg);
    };

    /* Forces to redraw or the main canvas (LGraphNode) or the bg canvas (links) */
    LGraphNode.prototype.setDirtyCanvas = function(
        dirty_foreground,
        dirty_background
    ) {
        if (!this.graph) {
            return;
        }
        this.graph.sendActionToCanvas("setDirty", [
            dirty_foreground,
            dirty_background
        ]);
    };

    LGraphNode.prototype.loadImage = function(url) {
        var img = new Image();
        img.src = LiteGraph.node_images_path + url;
        img.ready = false;

        var that = this;
        img.onload = function() {
            this.ready = true;
            that.setDirtyCanvas(true);
        };
        return img;
    };

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
    LGraphNode.prototype.captureInput = function(v) {
        if (!this.graph || !this.graph.list_of_graphcanvas) {
            return;
        }

        var list = this.graph.list_of_graphcanvas;

        for (var i = 0; i < list.length; ++i) {
            var c = list[i];
            //releasing somebody elses capture?!
            if (!v && c.node_capturing_input != this) {
                continue;
            }

            //change
            c.node_capturing_input = v ? this : null;
        }
    };

    /**
     * Collapse the node to make it smaller on the canvas
     * @method collapse
     **/
    LGraphNode.prototype.collapse = function(force) {
        this.graph._version++;
        if (this.constructor.collapsable === false && !force) {
            return;
        }
        if (!this.flags.collapsed) {
            this.flags.collapsed = true;
        } else {
            this.flags.collapsed = false;
        }
        this.setDirtyCanvas(true, true);
    };

    /**
     * Forces the node to do not move or realign on Z
     * @method pin
     **/

    LGraphNode.prototype.pin = function(v) {
        this.graph._version++;
        if (v === undefined) {
            this.flags.pinned = !this.flags.pinned;
        } else {
            this.flags.pinned = v;
        }
    };

    LGraphNode.prototype.localToScreen = function(x, y, graphcanvas) {
        return [
            (x + this.pos[0]) * graphcanvas.scale + graphcanvas.offset[0],
            (y + this.pos[1]) * graphcanvas.scale + graphcanvas.offset[1]
        ];
    };

    function LGraphGroup(title) {
        this._ctor(title);
    }

    global.LGraphGroup = LiteGraph.LGraphGroup = LGraphGroup;

    LGraphGroup.prototype._ctor = function(title) {
        this.title = title || "Group";
        this.font_size = 24;
        this.color = LGraphCanvas.node_colors.pale_blue
            ? LGraphCanvas.node_colors.pale_blue.groupcolor
            : "#AAA";
        this._bounding = new Float32Array([10, 10, 140, 80]);
        this._pos = this._bounding.subarray(0, 2);
        this._size = this._bounding.subarray(2, 4);
        this._nodes = [];
        this.graph = null;

        Object.defineProperty(this, "pos", {
            set: function(v) {
                if (!v || v.length < 2) {
                    return;
                }
                this._pos[0] = v[0];
                this._pos[1] = v[1];
            },
            get: function() {
                return this._pos;
            },
            enumerable: true
        });

        Object.defineProperty(this, "size", {
            set: function(v) {
                if (!v || v.length < 2) {
                    return;
                }
                this._size[0] = Math.max(140, v[0]);
                this._size[1] = Math.max(80, v[1]);
            },
            get: function() {
                return this._size;
            },
            enumerable: true
        });
    };

    LGraphGroup.prototype.configure = function(o) {
        this.title = o.title;
        this._bounding.set(o.bounding);
        this.color = o.color;
        this.font = o.font;
    };

    LGraphGroup.prototype.serialize = function() {
        var b = this._bounding;
        return {
            title: this.title,
            bounding: [
                Math.round(b[0]),
                Math.round(b[1]),
                Math.round(b[2]),
                Math.round(b[3])
            ],
            color: this.color,
            font: this.font
        };
    };

    LGraphGroup.prototype.move = function(deltax, deltay, ignore_nodes) {
        this._pos[0] += deltax;
        this._pos[1] += deltay;
        if (ignore_nodes) {
            return;
        }
        for (var i = 0; i < this._nodes.length; ++i) {
            var node = this._nodes[i];
            node.pos[0] += deltax;
            node.pos[1] += deltay;
        }
    };

    LGraphGroup.prototype.recomputeInsideNodes = function() {
        this._nodes.length = 0;
        var nodes = this.graph._nodes;
        var node_bounding = new Float32Array(4);

        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            node.getBounding(node_bounding);
            if (!overlapBounding(this._bounding, node_bounding)) {
                continue;
            } //out of the visible area
            this._nodes.push(node);
        }
    };

    LGraphGroup.prototype.isPointInside = LGraphNode.prototype.isPointInside;
    LGraphGroup.prototype.setDirtyCanvas = LGraphNode.prototype.setDirtyCanvas;

    //****************************************

    //Scale and Offset
    function DragAndScale(element, skip_events) {
        this.offset = new Float32Array([0, 0]);
        this.scale = 1;
        this.max_scale = 10;
        this.min_scale = 0.1;
        this.onredraw = null;
        this.enabled = true;
        this.last_mouse = [0, 0];
        this.element = null;
        this.visible_area = new Float32Array(4);

        if (element) {
            this.element = element;
            if (!skip_events) {
                this.bindEvents(element);
            }
        }
    }

    LiteGraph.DragAndScale = DragAndScale;

    DragAndScale.prototype.bindEvents = function(element) {
        this.last_mouse = new Float32Array(2);

        this._binded_mouse_callback = this.onMouse.bind(this);

        element.addEventListener("mousedown", this._binded_mouse_callback);
        element.addEventListener("mousemove", this._binded_mouse_callback);

        element.addEventListener(
            "mousewheel",
            this._binded_mouse_callback,
            false
        );
        element.addEventListener("wheel", this._binded_mouse_callback, false);
    };

    DragAndScale.prototype.computeVisibleArea = function() {
        if (!this.element) {
            this.visible_area[0] = this.visible_area[1] = this.visible_area[2] = this.visible_area[3] = 0;
            return;
        }
        var width = this.element.width;
        var height = this.element.height;
        var startx = -this.offset[0];
        var starty = -this.offset[1];
        var endx = startx + width / this.scale;
        var endy = starty + height / this.scale;
        this.visible_area[0] = startx;
        this.visible_area[1] = starty;
        this.visible_area[2] = endx - startx;
        this.visible_area[3] = endy - starty;
    };

    DragAndScale.prototype.onMouse = function(e) {
        if (!this.enabled) {
            return;
        }

        var canvas = this.element;
        var rect = canvas.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        e.canvasx = x;
        e.canvasy = y;
        e.dragging = this.dragging;

        var ignore = false;
        if (this.onmouse) {
            ignore = this.onmouse(e);
        }

        if (e.type == "mousedown") {
            this.dragging = true;
            canvas.removeEventListener(
                "mousemove",
                this._binded_mouse_callback
            );
            document.body.addEventListener(
                "mousemove",
                this._binded_mouse_callback
            );
            document.body.addEventListener(
                "mouseup",
                this._binded_mouse_callback
            );
        } else if (e.type == "mousemove") {
            if (!ignore) {
                var deltax = x - this.last_mouse[0];
                var deltay = y - this.last_mouse[1];
                if (this.dragging) {
                    this.mouseDrag(deltax, deltay);
                }
            }
        } else if (e.type == "mouseup") {
            this.dragging = false;
            document.body.removeEventListener(
                "mousemove",
                this._binded_mouse_callback
            );
            document.body.removeEventListener(
                "mouseup",
                this._binded_mouse_callback
            );
            canvas.addEventListener("mousemove", this._binded_mouse_callback);
        } else if (
            e.type == "mousewheel" ||
            e.type == "wheel" ||
            e.type == "DOMMouseScroll"
        ) {
            e.eventType = "mousewheel";
            if (e.type == "wheel") {
                e.wheel = -e.deltaY;
            } else {
                e.wheel =
                    e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60;
            }

            //from stack overflow
            e.delta = e.wheelDelta
                ? e.wheelDelta / 40
                : e.deltaY
                ? -e.deltaY / 3
                : 0;
            this.changeDeltaScale(1.0 + e.delta * 0.05);
        }

        this.last_mouse[0] = x;
        this.last_mouse[1] = y;

        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    DragAndScale.prototype.toCanvasContext = function(ctx) {
        ctx.scale(this.scale, this.scale);
        ctx.translate(this.offset[0], this.offset[1]);
    };

    DragAndScale.prototype.convertOffsetToCanvas = function(pos) {
        //return [pos[0] / this.scale - this.offset[0], pos[1] / this.scale - this.offset[1]];
        return [
            (pos[0] + this.offset[0]) * this.scale,
            (pos[1] + this.offset[1]) * this.scale
        ];
    };

    DragAndScale.prototype.convertCanvasToOffset = function(pos, out) {
        out = out || [0, 0];
        out[0] = pos[0] / this.scale - this.offset[0];
        out[1] = pos[1] / this.scale - this.offset[1];
        return out;
    };

    DragAndScale.prototype.mouseDrag = function(x, y) {
        this.offset[0] += x / this.scale;
        this.offset[1] += y / this.scale;

        if (this.onredraw) {
            this.onredraw(this);
        }
    };

    DragAndScale.prototype.changeScale = function(value, zooming_center) {
        if (value < this.min_scale) {
            value = this.min_scale;
        } else if (value > this.max_scale) {
            value = this.max_scale;
        }

        if (value == this.scale) {
            return;
        }

        if (!this.element) {
            return;
        }

        var rect = this.element.getBoundingClientRect();
        if (!rect) {
            return;
        }

        zooming_center = zooming_center || [
            rect.width * 0.5,
            rect.height * 0.5
        ];
        var center = this.convertCanvasToOffset(zooming_center);
        this.scale = value;
        if (Math.abs(this.scale - 1) < 0.01) {
            this.scale = 1;
        }

        var new_center = this.convertCanvasToOffset(zooming_center);
        var delta_offset = [
            new_center[0] - center[0],
            new_center[1] - center[1]
        ];

        this.offset[0] += delta_offset[0];
        this.offset[1] += delta_offset[1];

        if (this.onredraw) {
            this.onredraw(this);
        }
    };

    DragAndScale.prototype.changeDeltaScale = function(value, zooming_center) {
        this.changeScale(this.scale * value, zooming_center);
    };

    DragAndScale.prototype.reset = function() {
        this.scale = 1;
        this.offset[0] = 0;
        this.offset[1] = 0;
    };

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
    function LGraphCanvas(canvas, graph, options) {
        options = options || {};

        //if(graph === undefined)
        //	throw ("No graph assigned");
        this.background_image = LGraphCanvas.DEFAULT_BACKGROUND_IMAGE;

        if (canvas && canvas.constructor === String) {
            canvas = document.querySelector(canvas);
        }

        this.ds = new DragAndScale();
        this.zoom_modify_alpha = true; //otherwise it generates ugly patterns when scaling down too much

        this.title_text_font = "" + LiteGraph.NODE_TEXT_SIZE + "px Arial";
        this.inner_text_font =
            "normal " + LiteGraph.NODE_SUBTEXT_SIZE + "px Arial";
        this.node_title_color = LiteGraph.NODE_TITLE_COLOR;
        this.default_link_color = LiteGraph.LINK_COLOR;
        this.default_connection_color = {
            input_off: "#778",
            input_on: "#7F7",
            output_off: "#778",
            output_on: "#7F7"
        };

        this.highquality_render = true;
        this.use_gradients = false; //set to true to render titlebar with gradients
        this.editor_alpha = 1; //used for transition
        this.pause_rendering = false;
        this.clear_background = true;

		this.read_only = false; //if set to true users cannot modify the graph
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

		this.set_canvas_dirty_on_mouse_event = true; //forces to redraw the canvas if the mouse does anything
        this.always_render_background = false;
        this.render_shadows = true;
        this.render_canvas_border = true;
        this.render_connections_shadows = false; //too much cpu
        this.render_connections_border = true;
        this.render_curved_connections = false;
        this.render_connection_arrows = false;
        this.render_collapsed_slots = true;
        this.render_execution_order = false;
        this.render_title_colored = true;
		this.render_link_tooltip = true;

        this.links_render_mode = LiteGraph.SPLINE_LINK;

        this.mouse = [0, 0]; //mouse in canvas coordinates, where 0,0 is the top-left corner of the blue rectangle
        this.graph_mouse = [0, 0]; //mouse in graph coordinates, where 0,0 is the top-left corner of the blue rectangle
		this.canvas_mouse = this.graph_mouse; //LEGACY: REMOVE THIS, USE GRAPH_MOUSE INSTEAD

        //to personalize the search box
        this.onSearchBox = null;
        this.onSearchBoxSelection = null;

        //callbacks
        this.onMouse = null;
        this.onDrawBackground = null; //to render background objects (behind nodes and connections) in the canvas affected by transform
        this.onDrawForeground = null; //to render foreground objects (above nodes and connections) in the canvas affected by transform
        this.onDrawOverlay = null; //to render foreground objects not affected by transform (for GUIs)
		this.onDrawLinkTooltip = null; //called when rendering a tooltip
		this.onNodeMoved = null; //called after moving a node
		this.onSelectionChange = null; //called if the selection changes
		this.onConnectingChange = null; //called before any link changes
		this.onBeforeChange = null; //called before modifying the graph
		this.onAfterChange = null; //called after modifying the graph

        this.connections_width = 3;
        this.round_radius = 8;

        this.current_node = null;
        this.node_widget = null; //used for widgets
		this.over_link_center = null;
        this.last_mouse_position = [0, 0];
        this.visible_area = this.ds.visible_area;
        this.visible_links = [];

        //link canvas and graph
        if (graph) {
            graph.attachCanvas(this);
        }

        this.setCanvas(canvas);
        this.clear();

        if (!options.skip_render) {
            this.startRendering();
        }

        this.autoresize = options.autoresize;
    }

    global.LGraphCanvas = LiteGraph.LGraphCanvas = LGraphCanvas;

	LGraphCanvas.DEFAULT_BACKGROUND_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQBJREFUeNrs1rEKwjAUhlETUkj3vP9rdmr1Ysammk2w5wdxuLgcMHyptfawuZX4pJSWZTnfnu/lnIe/jNNxHHGNn//HNbbv+4dr6V+11uF527arU7+u63qfa/bnmh8sWLBgwYJlqRf8MEptXPBXJXa37BSl3ixYsGDBMliwFLyCV/DeLIMFCxYsWLBMwSt4Be/NggXLYMGCBUvBK3iNruC9WbBgwYJlsGApeAWv4L1ZBgsWLFiwYJmCV/AK3psFC5bBggULloJX8BpdwXuzYMGCBctgwVLwCl7Be7MMFixYsGDBsu8FH1FaSmExVfAxBa/gvVmwYMGCZbBg/W4vAQYA5tRF9QYlv/QAAAAASUVORK5CYII=";

    LGraphCanvas.link_type_colors = {
        "-1": LiteGraph.EVENT_LINK_COLOR,
        number: "#AAA",
        node: "#DCA"
    };
    LGraphCanvas.gradients = {}; //cache of gradients

    /**
     * clears all the data inside
     *
     * @method clear
     */
    LGraphCanvas.prototype.clear = function() {
        this.frame = 0;
        this.last_draw_time = 0;
        this.render_time = 0;
        this.fps = 0;

        //this.scale = 1;
        //this.offset = [0,0];

        this.dragging_rectangle = null;

        this.selected_nodes = {};
        this.selected_group = null;

        this.visible_nodes = [];
        this.node_dragged = null;
        this.node_over = null;
        this.node_capturing_input = null;
        this.connecting_node = null;
        this.highlighted_links = {};

		this.dragging_canvas = false;

        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
        this.dirty_area = null;

        this.node_in_panel = null;
        this.node_widget = null;

        this.last_mouse = [0, 0];
        this.last_mouseclick = 0;
        this.visible_area.set([0, 0, 0, 0]);

        if (this.onClear) {
            this.onClear();
        }
    };

    /**
     * assigns a graph, you can reassign graphs to the same canvas
     *
     * @method setGraph
     * @param {LGraph} graph
     */
    LGraphCanvas.prototype.setGraph = function(graph, skip_clear) {
        if (this.graph == graph) {
            return;
        }

        if (!skip_clear) {
            this.clear();
        }

        if (!graph && this.graph) {
            this.graph.detachCanvas(this);
            return;
        }

        graph.attachCanvas(this);

		//remove the graph stack in case a subgraph was open
		if (this._graph_stack)
			this._graph_stack = null;

        this.setDirty(true, true);
    };

    /**
     * returns the top level graph (in case there are subgraphs open on the canvas)
     *
     * @method getTopGraph
     * @return {LGraph} graph
     */
	LGraphCanvas.prototype.getTopGraph = function()
	{
		if(this._graph_stack.length)
			return this._graph_stack[0];
		return this.graph;
	}

    /**
     * opens a graph contained inside a node in the current graph
     *
     * @method openSubgraph
     * @param {LGraph} graph
     */
    LGraphCanvas.prototype.openSubgraph = function(graph) {
        if (!graph) {
            throw "graph cannot be null";
        }

        if (this.graph == graph) {
            throw "graph cannot be the same";
        }

        this.clear();

        if (this.graph) {
            if (!this._graph_stack) {
                this._graph_stack = [];
            }
            this._graph_stack.push(this.graph);
        }

        graph.attachCanvas(this);
		this.checkPanels();
        this.setDirty(true, true);
    };

    /**
     * closes a subgraph contained inside a node
     *
     * @method closeSubgraph
     * @param {LGraph} assigns a graph
     */
    LGraphCanvas.prototype.closeSubgraph = function() {
        if (!this._graph_stack || this._graph_stack.length == 0) {
            return;
        }
        var subgraph_node = this.graph._subgraph_node;
        var graph = this._graph_stack.pop();
        this.selected_nodes = {};
        this.highlighted_links = {};
        graph.attachCanvas(this);
        this.setDirty(true, true);
        if (subgraph_node) {
            this.centerOnNode(subgraph_node);
            this.selectNodes([subgraph_node]);
        }
    };

    /**
     * returns the visualy active graph (in case there are more in the stack)
     * @method getCurrentGraph
     * @return {LGraph} the active graph
     */
    LGraphCanvas.prototype.getCurrentGraph = function() {
        return this.graph;
    };

    /**
     * assigns a canvas
     *
     * @method setCanvas
     * @param {Canvas} assigns a canvas (also accepts the ID of the element (not a selector)
     */
    LGraphCanvas.prototype.setCanvas = function(canvas, skip_events) {
        var that = this;

        if (canvas) {
            if (canvas.constructor === String) {
                canvas = document.getElementById(canvas);
                if (!canvas) {
                    throw "Error creating LiteGraph canvas: Canvas not found";
                }
            }
        }

        if (canvas === this.canvas) {
            return;
        }

        if (!canvas && this.canvas) {
            //maybe detach events from old_canvas
            if (!skip_events) {
                this.unbindEvents();
            }
        }

        this.canvas = canvas;
        this.ds.element = canvas;

        if (!canvas) {
            return;
        }

        //this.canvas.tabindex = "1000";
        canvas.className += " lgraphcanvas";
        canvas.data = this;
        canvas.tabindex = "1"; //to allow key events

        //bg canvas: used for non changing stuff
        this.bgcanvas = null;
        if (!this.bgcanvas) {
            this.bgcanvas = document.createElement("canvas");
            this.bgcanvas.width = this.canvas.width;
            this.bgcanvas.height = this.canvas.height;
        }

        if (canvas.getContext == null) {
            if (canvas.localName != "canvas") {
                throw "Element supplied for LGraphCanvas must be a <canvas> element, you passed a " +
                    canvas.localName;
            }
            throw "This browser doesn't support Canvas";
        }

        var ctx = (this.ctx = canvas.getContext("2d"));
        if (ctx == null) {
            if (!canvas.webgl_enabled) {
                console.warn(
                    "This canvas seems to be WebGL, enabling WebGL renderer"
                );
            }
            this.enableWebGL();
        }

        //input:  (move and up could be unbinded)
        this._mousemove_callback = this.processMouseMove.bind(this);
        this._mouseup_callback = this.processMouseUp.bind(this);

        if (!skip_events) {
            this.bindEvents();
        }
    };

    //used in some events to capture them
    LGraphCanvas.prototype._doNothing = function doNothing(e) {
        e.preventDefault();
        return false;
    };
    LGraphCanvas.prototype._doReturnTrue = function doNothing(e) {
        e.preventDefault();
        return true;
    };

    /**
     * binds mouse, keyboard, touch and drag events to the canvas
     * @method bindEvents
     **/
    LGraphCanvas.prototype.bindEvents = function() {
        if (this._events_binded) {
            console.warn("LGraphCanvas: events already binded");
            return;
        }

        var canvas = this.canvas;

        var ref_window = this.getCanvasWindow();
        var document = ref_window.document; //hack used when moving canvas between windows

        this._mousedown_callback = this.processMouseDown.bind(this);
        this._mousewheel_callback = this.processMouseWheel.bind(this);

        canvas.addEventListener("mousedown", this._mousedown_callback, true); //down do not need to store the binded
        canvas.addEventListener("mousemove", this._mousemove_callback);
        canvas.addEventListener("mousewheel", this._mousewheel_callback, false);

        canvas.addEventListener("contextmenu", this._doNothing);
        canvas.addEventListener(
            "DOMMouseScroll",
            this._mousewheel_callback,
            false
        );

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

        canvas.addEventListener("keydown", this._key_callback, true);
        document.addEventListener("keyup", this._key_callback, true); //in document, otherwise it doesn't fire keyup

        //Dropping Stuff over nodes ************************************
        this._ondrop_callback = this.processDrop.bind(this);

        canvas.addEventListener("dragover", this._doNothing, false);
        canvas.addEventListener("dragend", this._doNothing, false);
        canvas.addEventListener("drop", this._ondrop_callback, false);
        canvas.addEventListener("dragenter", this._doReturnTrue, false);

        this._events_binded = true;
    };

    /**
     * unbinds mouse events from the canvas
     * @method unbindEvents
     **/
    LGraphCanvas.prototype.unbindEvents = function() {
        if (!this._events_binded) {
            console.warn("LGraphCanvas: no events binded");
            return;
        }

        var ref_window = this.getCanvasWindow();
        var document = ref_window.document;

        this.canvas.removeEventListener("mousedown", this._mousedown_callback);
        this.canvas.removeEventListener(
            "mousewheel",
            this._mousewheel_callback
        );
        this.canvas.removeEventListener(
            "DOMMouseScroll",
            this._mousewheel_callback
        );
        this.canvas.removeEventListener("keydown", this._key_callback);
        document.removeEventListener("keyup", this._key_callback);
        this.canvas.removeEventListener("contextmenu", this._doNothing);
        this.canvas.removeEventListener("drop", this._ondrop_callback);
        this.canvas.removeEventListener("dragenter", this._doReturnTrue);

        this.canvas.removeEventListener("touchstart", this.touchHandler);
        this.canvas.removeEventListener("touchmove", this.touchHandler);
        this.canvas.removeEventListener("touchend", this.touchHandler);
        this.canvas.removeEventListener("touchcancel", this.touchHandler);

        this._mousedown_callback = null;
        this._mousewheel_callback = null;
        this._key_callback = null;
        this._ondrop_callback = null;

        this._events_binded = false;
    };

    LGraphCanvas.getFileExtension = function(url) {
        var question = url.indexOf("?");
        if (question != -1) {
            url = url.substr(0, question);
        }
        var point = url.lastIndexOf(".");
        if (point == -1) {
            return "";
        }
        return url.substr(point + 1).toLowerCase();
    };

    /**
     * this function allows to render the canvas using WebGL instead of Canvas2D
     * this is useful if you plant to render 3D objects inside your nodes, it uses litegl.js for webgl and canvas2DtoWebGL to emulate the Canvas2D calls in webGL
     * @method enableWebGL
     **/
    LGraphCanvas.prototype.enableWebGL = function() {
        if (typeof GL === undefined) {
            throw "litegl.js must be included to use a WebGL canvas";
        }
        if (typeof enableWebGLCanvas === undefined) {
            throw "webglCanvas.js must be included to use this feature";
        }

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
    };

    /**
     * marks as dirty the canvas, this way it will be rendered again
     *
     * @class LGraphCanvas
     * @method setDirty
     * @param {bool} fgcanvas if the foreground canvas is dirty (the one containing the nodes)
     * @param {bool} bgcanvas if the background canvas is dirty (the one containing the wires)
     */
    LGraphCanvas.prototype.setDirty = function(fgcanvas, bgcanvas) {
        if (fgcanvas) {
            this.dirty_canvas = true;
        }
        if (bgcanvas) {
            this.dirty_bgcanvas = true;
        }
    };

    /**
     * Used to attach the canvas in a popup
     *
     * @method getCanvasWindow
     * @return {window} returns the window where the canvas is attached (the DOM root node)
     */
    LGraphCanvas.prototype.getCanvasWindow = function() {
        if (!this.canvas) {
            return window;
        }
        var doc = this.canvas.ownerDocument;
        return doc.defaultView || doc.parentWindow;
    };

    /**
     * starts rendering the content of the canvas when needed
     *
     * @method startRendering
     */
    LGraphCanvas.prototype.startRendering = function() {
        if (this.is_rendering) {
            return;
        } //already rendering

        this.is_rendering = true;
        renderFrame.call(this);

        function renderFrame() {
            if (!this.pause_rendering) {
                this.draw();
            }

            var window = this.getCanvasWindow();
            if (this.is_rendering) {
                window.requestAnimationFrame(renderFrame.bind(this));
            }
        }
    };

    /**
     * stops rendering the content of the canvas (to save resources)
     *
     * @method stopRendering
     */
    LGraphCanvas.prototype.stopRendering = function() {
        this.is_rendering = false;
        /*
	if(this.rendering_timer_id)
	{
		clearInterval(this.rendering_timer_id);
		this.rendering_timer_id = null;
	}
	*/
    };

    /* LiteGraphCanvas input */

	//used to block future mouse events (because of im gui)
	LGraphCanvas.prototype.blockClick = function()
	{
		this.block_click = true;
		this.last_mouseclick = 0;
	}

    LGraphCanvas.prototype.processMouseDown = function(e) {

		if( this.set_canvas_dirty_on_mouse_event )
			this.dirty_canvas = true;
		
		if (!this.graph) {
            return;
        }

        this.adjustMouseEvent(e);

        var ref_window = this.getCanvasWindow();
        var document = ref_window.document;
        LGraphCanvas.active_canvas = this;
        var that = this;

        //move mouse move event to the window in case it drags outside of the canvas
        this.canvas.removeEventListener("mousemove", this._mousemove_callback);
        ref_window.document.addEventListener(
            "mousemove",
            this._mousemove_callback,
            true
        ); //catch for the entire window
        ref_window.document.addEventListener(
            "mouseup",
            this._mouseup_callback,
            true
        );

        var node = this.graph.getNodeOnPos(
            e.canvasX,
            e.canvasY,
            this.visible_nodes,
            5
        );
        var skip_dragging = false;
        var skip_action = false;
        var now = LiteGraph.getTime();
        var is_double_click = now - this.last_mouseclick < 300;
		this.mouse[0] = e.localX;
		this.mouse[1] = e.localY;
        this.graph_mouse[0] = e.canvasX;
        this.graph_mouse[1] = e.canvasY;
		this.last_click_position = [this.mouse[0],this.mouse[1]];

        this.canvas.focus();

        LiteGraph.closeAllContextMenus(ref_window);

        if (this.onMouse)
		{
            if (this.onMouse(e) == true)
                return;
        }

		//left button mouse
        if (e.which == 1)
		{
            if (e.ctrlKey)
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
            if (node && this.allow_interaction && !skip_action && !this.read_only) {
                if (!this.live_mode && !node.flags.pinned) {
                    this.bringToFront(node);
                } //if it wasn't selected?

                //not dragging mouse to connect two slots
                if (
                    !this.connecting_node &&
                    !node.flags.collapsed &&
                    !this.live_mode
                ) {
                    //Search for corner for resize
                    if (
                        !skip_action &&
                        node.resizable !== false &&
                        isInsideRectangle(
                            e.canvasX,
                            e.canvasY,
                            node.pos[0] + node.size[0] - 5,
                            node.pos[1] + node.size[1] - 5,
                            10,
                            10
                        )
                    ) {
						this.graph.beforeChange();						
                        this.resizing_node = node;
                        this.canvas.style.cursor = "se-resize";
                        skip_action = true;
                    } else {
                        //search for outputs
                        if (node.outputs) {
                            for (
                                var i = 0, l = node.outputs.length;
                                i < l;
                                ++i
                            ) {
                                var output = node.outputs[i];
                                var link_pos = node.getConnectionPos(false, i);
                                if (
                                    isInsideRectangle(
                                        e.canvasX,
                                        e.canvasY,
                                        link_pos[0] - 15,
                                        link_pos[1] - 10,
                                        30,
                                        20
                                    )
                                ) {
                                    this.connecting_node = node;
                                    this.connecting_output = output;
                                    this.connecting_pos = node.getConnectionPos( false, i );
                                    this.connecting_slot = i;

                                    if (e.shiftKey) {
                                        node.disconnectOutput(i);
                                    }

                                    if (is_double_click) {
                                        if (node.onOutputDblClick) {
                                            node.onOutputDblClick(i, e);
                                        }
                                    } else {
                                        if (node.onOutputClick) {
                                            node.onOutputClick(i, e);
                                        }
                                    }

                                    skip_action = true;
                                    break;
                                }
                            }
                        }

                        //search for inputs
                        if (node.inputs) {
                            for (
                                var i = 0, l = node.inputs.length;
                                i < l;
                                ++i
                            ) {
                                var input = node.inputs[i];
                                var link_pos = node.getConnectionPos(true, i);
                                if (
                                    isInsideRectangle(
                                        e.canvasX,
                                        e.canvasY,
                                        link_pos[0] - 15,
                                        link_pos[1] - 10,
                                        30,
                                        20
                                    )
                                ) {
                                    if (is_double_click) {
                                        if (node.onInputDblClick) {
                                            node.onInputDblClick(i, e);
                                        }
                                    } else {
                                        if (node.onInputClick) {
                                            node.onInputClick(i, e);
                                        }
                                    }

                                    if (input.link !== null) {
                                        var link_info = this.graph.links[
                                            input.link
                                        ]; //before disconnecting
                                        node.disconnectInput(i);

                                        if (
                                            this.allow_reconnect_links ||
                                            e.shiftKey
                                        ) {
                                            this.connecting_node = this.graph._nodes_by_id[
                                                link_info.origin_id
                                            ];
                                            this.connecting_slot =
                                                link_info.origin_slot;
                                            this.connecting_output = this.connecting_node.outputs[
                                                this.connecting_slot
                                            ];
                                            this.connecting_pos = this.connecting_node.getConnectionPos( false, this.connecting_slot );
                                        }

                                        this.dirty_bgcanvas = true;
                                        skip_action = true;
                                    }
                                }
                            }
                        }
                    } //not resizing
                }

                //it wasn't clicked on the links boxes
                if (!skip_action) {
                    var block_drag_node = false;
					var pos = [e.canvasX - node.pos[0], e.canvasY - node.pos[1]];

                    //widgets
                    var widget = this.processNodeWidgets( node, this.graph_mouse, e );
                    if (widget) {
                        block_drag_node = true;
                        this.node_widget = [node, widget];
                    }

                    //double clicking
                    if (is_double_click && this.selected_nodes[node.id]) {
                        //double click node
                        if (node.onDblClick) {
                            node.onDblClick( e, pos, this );
                        }
                        this.processNodeDblClicked(node);
                        block_drag_node = true;
                    }

                    //if do not capture mouse
                    if ( node.onMouseDown && node.onMouseDown( e, pos, this ) ) {
                        block_drag_node = true;
                    } else {
						//open subgraph button
						if(node.subgraph && !node.skip_subgraph_button)
						{
							if ( !node.flags.collapsed && pos[0] > node.size[0] - LiteGraph.NODE_TITLE_HEIGHT && pos[1] < 0 ) {
								var that = this;
								setTimeout(function() {
									that.openSubgraph(node.subgraph);
								}, 10);
							}
						}

						if (this.live_mode) {
							clicking_canvas_bg = true;
	                        block_drag_node = true;
						}
                    }

                    if (!block_drag_node) {
                        if (this.allow_dragnodes) {
							this.graph.beforeChange();
                            this.node_dragged = node;
                        }
                        if (!this.selected_nodes[node.id]) {
                            this.processNodeSelected(node, e);
                        }
                    }

                    this.dirty_canvas = true;
                }
            } //clicked outside of nodes
            else {
                //search for link connector
				if(!this.read_only) 
					for (var i = 0; i < this.visible_links.length; ++i) {
						var link = this.visible_links[i];
						var center = link._pos;
						if (
							!center ||
							e.canvasX < center[0] - 4 ||
							e.canvasX > center[0] + 4 ||
							e.canvasY < center[1] - 4 ||
							e.canvasY > center[1] + 4
						) {
							continue;
						}
						//link clicked
						this.showLinkMenu(link, e);
						this.over_link_center = null; //clear tooltip
						break;
					}

                this.selected_group = this.graph.getGroupOnPos( e.canvasX, e.canvasY );
                this.selected_group_resizing = false;
                if (this.selected_group && !this.read_only ) {
                    if (e.ctrlKey) {
                        this.dragging_rectangle = null;
                    }

                    var dist = distance( [e.canvasX, e.canvasY], [ this.selected_group.pos[0] + this.selected_group.size[0], this.selected_group.pos[1] + this.selected_group.size[1] ] );
                    if (dist * this.ds.scale < 10) {
                        this.selected_group_resizing = true;
                    } else {
                        this.selected_group.recomputeInsideNodes();
                    }
                }

                if (is_double_click && !this.read_only && this.allow_searchbox) {
                    this.showSearchBox(e);
                }

                clicking_canvas_bg = true;
            }

            if (!skip_action && clicking_canvas_bg && this.allow_dragcanvas) {
                this.dragging_canvas = true;
            }
        } else if (e.which == 2) {
            //middle button
        } else if (e.which == 3) {
            //right button
			if(!this.read_only)
	            this.processContextMenu(node, e);
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
        if (
            !ref_window.document.activeElement ||
            (ref_window.document.activeElement.nodeName.toLowerCase() !=
                "input" &&
                ref_window.document.activeElement.nodeName.toLowerCase() !=
                    "textarea")
        ) {
            e.preventDefault();
        }
        e.stopPropagation();

        if (this.onMouseDown) {
            this.onMouseDown(e);
        }

        return false;
    };

    /**
     * Called when a mouse move event has to be processed
     * @method processMouseMove
     **/
    LGraphCanvas.prototype.processMouseMove = function(e) {
        if (this.autoresize) {
            this.resize();
        }

		if( this.set_canvas_dirty_on_mouse_event )
			this.dirty_canvas = true;

        if (!this.graph) {
            return;
        }

        LGraphCanvas.active_canvas = this;
        this.adjustMouseEvent(e);
        var mouse = [e.localX, e.localY];
		this.mouse[0] = mouse[0];
		this.mouse[1] = mouse[1];
        var delta = [
            mouse[0] - this.last_mouse[0],
            mouse[1] - this.last_mouse[1]
        ];
        this.last_mouse = mouse;
        this.graph_mouse[0] = e.canvasX;
        this.graph_mouse[1] = e.canvasY;

		if(this.block_click)
		{
			e.preventDefault();
			return false;
		}

        e.dragging = this.last_mouse_dragging;

        if (this.node_widget) {
            this.processNodeWidgets(
                this.node_widget[0],
                this.graph_mouse,
                e,
                this.node_widget[1]
            );
            this.dirty_canvas = true;
        }

        if (this.dragging_rectangle)
		{
            this.dragging_rectangle[2] = e.canvasX - this.dragging_rectangle[0];
            this.dragging_rectangle[3] = e.canvasY - this.dragging_rectangle[1];
            this.dirty_canvas = true;
        } 
		else if (this.selected_group && !this.read_only)
		{
            //moving/resizing a group
            if (this.selected_group_resizing) {
                this.selected_group.size = [
                    e.canvasX - this.selected_group.pos[0],
                    e.canvasY - this.selected_group.pos[1]
                ];
            } else {
                var deltax = delta[0] / this.ds.scale;
                var deltay = delta[1] / this.ds.scale;
                this.selected_group.move(deltax, deltay, e.ctrlKey);
                if (this.selected_group._nodes.length) {
                    this.dirty_canvas = true;
                }
            }
            this.dirty_bgcanvas = true;
        } else if (this.dragging_canvas) {
            this.ds.offset[0] += delta[0] / this.ds.scale;
            this.ds.offset[1] += delta[1] / this.ds.scale;
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
        } else if (this.allow_interaction && !this.read_only) {
            if (this.connecting_node) {
                this.dirty_canvas = true;
            }

            //get node over
            var node = this.graph.getNodeOnPos(e.canvasX,e.canvasY,this.visible_nodes);

            //remove mouseover flag
            for (var i = 0, l = this.graph._nodes.length; i < l; ++i) {
                if (this.graph._nodes[i].mouseOver && node != this.graph._nodes[i] ) {
                    //mouse leave
                    this.graph._nodes[i].mouseOver = false;
                    if (this.node_over && this.node_over.onMouseLeave) {
                        this.node_over.onMouseLeave(e);
                    }
                    this.node_over = null;
                    this.dirty_canvas = true;
                }
            }

            //mouse over a node
            if (node) {

				if(node.redraw_on_mouse)
                    this.dirty_canvas = true;

                //this.canvas.style.cursor = "move";
                if (!node.mouseOver) {
                    //mouse enter
                    node.mouseOver = true;
                    this.node_over = node;
                    this.dirty_canvas = true;

                    if (node.onMouseEnter) {
                        node.onMouseEnter(e);
                    }
                }

                //in case the node wants to do something
                if (node.onMouseMove) {
                    node.onMouseMove( e, [e.canvasX - node.pos[0], e.canvasY - node.pos[1]], this );
                }

                //if dragging a link
                if (this.connecting_node) {
                    var pos = this._highlight_input || [0, 0]; //to store the output of isOverNodeInput

                    //on top of input
                    if (this.isOverNodeBox(node, e.canvasX, e.canvasY)) {
                        //mouse on top of the corner box, don't know what to do
                    } else {
                        //check if I have a slot below de mouse
                        var slot = this.isOverNodeInput( node, e.canvasX, e.canvasY, pos );
                        if (slot != -1 && node.inputs[slot]) {
                            var slot_type = node.inputs[slot].type;
                            if ( LiteGraph.isValidConnection( this.connecting_output.type, slot_type ) ) {
                                this._highlight_input = pos;
                            }
                        } else {
                            this._highlight_input = null;
                        }
                    }
                }

                //Search for corner
                if (this.canvas) {
                    if (
                        isInsideRectangle(
                            e.canvasX,
                            e.canvasY,
                            node.pos[0] + node.size[0] - 5,
                            node.pos[1] + node.size[1] - 5,
                            5,
                            5
                        )
                    ) {
                        this.canvas.style.cursor = "se-resize";
                    } else {
                        this.canvas.style.cursor = "crosshair";
                    }
                }
            } else { //not over a node

                //search for link connector
				var over_link = null;
				for (var i = 0; i < this.visible_links.length; ++i) {
					var link = this.visible_links[i];
					var center = link._pos;
					if (
						!center ||
						e.canvasX < center[0] - 4 ||
						e.canvasX > center[0] + 4 ||
						e.canvasY < center[1] - 4 ||
						e.canvasY > center[1] + 4
					) {
						continue;
					}
					over_link = link;
					break;
				}
				if( over_link != this.over_link_center )
				{
					this.over_link_center = over_link;
	                this.dirty_canvas = true;
				}

				if (this.canvas) {
	                this.canvas.style.cursor = "";
				}
			} //end

			//send event to node if capturing input (used with widgets that allow drag outside of the area of the node)
            if ( this.node_capturing_input && this.node_capturing_input != node && this.node_capturing_input.onMouseMove ) {
                this.node_capturing_input.onMouseMove(e,[e.canvasX - this.node_capturing_input.pos[0],e.canvasY - this.node_capturing_input.pos[1]], this);
            }

			//node being dragged
            if (this.node_dragged && !this.live_mode) {
				//console.log("draggin!",this.selected_nodes);
                for (var i in this.selected_nodes) {
                    var n = this.selected_nodes[i];
                    n.pos[0] += delta[0] / this.ds.scale;
                    n.pos[1] += delta[1] / this.ds.scale;
                }

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
            }

            if (this.resizing_node && !this.live_mode) {
                //convert mouse to node space
				var desired_size = [ e.canvasX - this.resizing_node.pos[0], e.canvasY - this.resizing_node.pos[1] ];
				var min_size = this.resizing_node.computeSize();
				desired_size[0] = Math.max( min_size[0], desired_size[0] );
				desired_size[1] = Math.max( min_size[1], desired_size[1] );
				this.resizing_node.setSize( desired_size );

                this.canvas.style.cursor = "se-resize";
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
            }
        }

        e.preventDefault();
        return false;
    };

    /**
     * Called when a mouse up event has to be processed
     * @method processMouseUp
     **/
    LGraphCanvas.prototype.processMouseUp = function(e) {

		if( this.set_canvas_dirty_on_mouse_event )
			this.dirty_canvas = true;

        if (!this.graph)
            return;

        var window = this.getCanvasWindow();
        var document = window.document;
        LGraphCanvas.active_canvas = this;

        //restore the mousemove event back to the canvas
        document.removeEventListener("mousemove",this._mousemove_callback,true);
        this.canvas.addEventListener("mousemove",this._mousemove_callback,true);
        document.removeEventListener("mouseup", this._mouseup_callback, true);

        this.adjustMouseEvent(e);
        var now = LiteGraph.getTime();
        e.click_time = now - this.last_mouseclick;
        this.last_mouse_dragging = false;
		this.last_click_position = null;

		if(this.block_click)
		{
			console.log("foo");
			this.block_click = false; //used to avoid sending twice a click in a immediate button
		}

        if (e.which == 1) {

			if( this.node_widget )
			{
				this.processNodeWidgets( this.node_widget[0], this.graph_mouse, e );
			}

            //left button
            this.node_widget = null;

            if (this.selected_group) {
                var diffx =
                    this.selected_group.pos[0] -
                    Math.round(this.selected_group.pos[0]);
                var diffy =
                    this.selected_group.pos[1] -
                    Math.round(this.selected_group.pos[1]);
                this.selected_group.move(diffx, diffy, e.ctrlKey);
                this.selected_group.pos[0] = Math.round(
                    this.selected_group.pos[0]
                );
                this.selected_group.pos[1] = Math.round(
                    this.selected_group.pos[1]
                );
                if (this.selected_group._nodes.length) {
                    this.dirty_canvas = true;
                }
                this.selected_group = null;
            }
            this.selected_group_resizing = false;

            if (this.dragging_rectangle) {
                if (this.graph) {
                    var nodes = this.graph._nodes;
                    var node_bounding = new Float32Array(4);
                    this.deselectAllNodes();
                    //compute bounding and flip if left to right
                    var w = Math.abs(this.dragging_rectangle[2]);
                    var h = Math.abs(this.dragging_rectangle[3]);
                    var startx =
                        this.dragging_rectangle[2] < 0
                            ? this.dragging_rectangle[0] - w
                            : this.dragging_rectangle[0];
                    var starty =
                        this.dragging_rectangle[3] < 0
                            ? this.dragging_rectangle[1] - h
                            : this.dragging_rectangle[1];
                    this.dragging_rectangle[0] = startx;
                    this.dragging_rectangle[1] = starty;
                    this.dragging_rectangle[2] = w;
                    this.dragging_rectangle[3] = h;

                    //test against all nodes (not visible because the rectangle maybe start outside
                    var to_select = [];
                    for (var i = 0; i < nodes.length; ++i) {
                        var node = nodes[i];
                        node.getBounding(node_bounding);
                        if (
                            !overlapBounding(
                                this.dragging_rectangle,
                                node_bounding
                            )
                        ) {
                            continue;
                        } //out of the visible area
                        to_select.push(node);
                    }
                    if (to_select.length) {
                        this.selectNodes(to_select);
                    }
                }
                this.dragging_rectangle = null;
            } else if (this.connecting_node) {
                //dragging a connection
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;

                var node = this.graph.getNodeOnPos(
                    e.canvasX,
                    e.canvasY,
                    this.visible_nodes
                );

                //node below mouse
                if (node) {
                    if (
                        this.connecting_output.type == LiteGraph.EVENT &&
                        this.isOverNodeBox(node, e.canvasX, e.canvasY)
                    ) {
                        this.connecting_node.connect(
                            this.connecting_slot,
                            node,
                            LiteGraph.EVENT
                        );
                    } else {
                        //slot below mouse? connect
                        var slot = this.isOverNodeInput(
                            node,
                            e.canvasX,
                            e.canvasY
                        );
                        if (slot != -1) {
                            this.connecting_node.connect(
                                this.connecting_slot,
                                node,
                                slot
                            );
                        } else {
                            //not on top of an input
                            var input = node.getInputInfo(0);
                            //auto connect
                            if (
                                this.connecting_output.type == LiteGraph.EVENT
                            ) {
                                this.connecting_node.connect(
                                    this.connecting_slot,
                                    node,
                                    LiteGraph.EVENT
                                );
                            } else if (
                                input &&
                                !input.link &&
                                LiteGraph.isValidConnection(
                                    input.type && this.connecting_output.type
                                )
                            ) {
                                this.connecting_node.connect(
                                    this.connecting_slot,
                                    node,
                                    0
                                );
                            }
                        }
                    }
                }

                this.connecting_output = null;
                this.connecting_pos = null;
                this.connecting_node = null;
                this.connecting_slot = -1;
            } //not dragging connection
            else if (this.resizing_node) {
                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
				this.graph.afterChange(this.resizing_node);
                this.resizing_node = null;
            } else if (this.node_dragged) {
                //node being dragged?
                var node = this.node_dragged;
                if (
                    node &&
                    e.click_time < 300 &&
                    isInsideRectangle( e.canvasX, e.canvasY, node.pos[0], node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT, LiteGraph.NODE_TITLE_HEIGHT )
                ) {
                    node.collapse();
                }

                this.dirty_canvas = true;
                this.dirty_bgcanvas = true;
                this.node_dragged.pos[0] = Math.round(this.node_dragged.pos[0]);
                this.node_dragged.pos[1] = Math.round(this.node_dragged.pos[1]);
                if (this.graph.config.align_to_grid) {
                    this.node_dragged.alignToGrid();
                }
				if( this.onNodeMoved )
					this.onNodeMoved( this.node_dragged );
				this.graph.afterChange(this.node_dragged);
                this.node_dragged = null;
            } //no node being dragged
            else {
                //get node over
                var node = this.graph.getNodeOnPos(
                    e.canvasX,
                    e.canvasY,
                    this.visible_nodes
                );

                if (!node && e.click_time < 300) {
                    this.deselectAllNodes();
                }

                this.dirty_canvas = true;
                this.dragging_canvas = false;

                if (this.node_over && this.node_over.onMouseUp) {
                    this.node_over.onMouseUp( e, [ e.canvasX - this.node_over.pos[0], e.canvasY - this.node_over.pos[1] ], this );
                }
                if (
                    this.node_capturing_input &&
                    this.node_capturing_input.onMouseUp
                ) {
                    this.node_capturing_input.onMouseUp(e, [
                        e.canvasX - this.node_capturing_input.pos[0],
                        e.canvasY - this.node_capturing_input.pos[1]
                    ]);
                }
            }
        } else if (e.which == 2) {
            //middle button
            //trace("middle");
            this.dirty_canvas = true;
            this.dragging_canvas = false;
        } else if (e.which == 3) {
            //right button
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
    };

    /**
     * Called when a mouse wheel event has to be processed
     * @method processMouseWheel
     **/
    LGraphCanvas.prototype.processMouseWheel = function(e) {
        if (!this.graph || !this.allow_dragcanvas) {
            return;
        }

        var delta = e.wheelDeltaY != null ? e.wheelDeltaY : e.detail * -60;

        this.adjustMouseEvent(e);

        var scale = this.ds.scale;

        if (delta > 0) {
            scale *= 1.1;
        } else if (delta < 0) {
            scale *= 1 / 1.1;
        }

        //this.setZoom( scale, [ e.localX, e.localY ] );
        this.ds.changeScale(scale, [e.localX, e.localY]);

        this.graph.change();

        e.preventDefault();
        return false; // prevent default
    };

    /**
     * returns true if a position (in graph space) is on top of a node little corner box
     * @method isOverNodeBox
     **/
    LGraphCanvas.prototype.isOverNodeBox = function(node, canvasx, canvasy) {
        var title_height = LiteGraph.NODE_TITLE_HEIGHT;
        if (
            isInsideRectangle(
                canvasx,
                canvasy,
                node.pos[0] + 2,
                node.pos[1] + 2 - title_height,
                title_height - 4,
                title_height - 4
            )
        ) {
            return true;
        }
        return false;
    };

    /**
     * returns true if a position (in graph space) is on top of a node input slot
     * @method isOverNodeInput
     **/
    LGraphCanvas.prototype.isOverNodeInput = function(
        node,
        canvasx,
        canvasy,
        slot_pos
    ) {
        if (node.inputs) {
            for (var i = 0, l = node.inputs.length; i < l; ++i) {
                var input = node.inputs[i];
                var link_pos = node.getConnectionPos(true, i);
                var is_inside = false;
                if (node.horizontal) {
                    is_inside = isInsideRectangle(
                        canvasx,
                        canvasy,
                        link_pos[0] - 5,
                        link_pos[1] - 10,
                        10,
                        20
                    );
                } else {
                    is_inside = isInsideRectangle(
                        canvasx,
                        canvasy,
                        link_pos[0] - 10,
                        link_pos[1] - 5,
                        40,
                        10
                    );
                }
                if (is_inside) {
                    if (slot_pos) {
                        slot_pos[0] = link_pos[0];
                        slot_pos[1] = link_pos[1];
                    }
                    return i;
                }
            }
        }
        return -1;
    };

    /**
     * process a key event
     * @method processKey
     **/
    LGraphCanvas.prototype.processKey = function(e) {
        if (!this.graph) {
            return;
        }

        var block_default = false;
        //console.log(e); //debug

        if (e.target.localName == "input") {
            return;
        }

        if (e.type == "keydown") {
            if (e.keyCode == 32) {
                //esc
                this.dragging_canvas = true;
                block_default = true;
            }

            //select all Control A
            if (e.keyCode == 65 && e.ctrlKey) {
                this.selectNodes();
                block_default = true;
            }

            if (e.code == "KeyC" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                //copy
                if (this.selected_nodes) {
                    this.copyToClipboard();
                    block_default = true;
                }
            }

            if (e.code == "KeyV" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                //paste
                this.pasteFromClipboard();
            }

            //delete or backspace
            if (e.keyCode == 46 || e.keyCode == 8) {
                if (
                    e.target.localName != "input" &&
                    e.target.localName != "textarea"
                ) {
                    this.deleteSelectedNodes();
                    block_default = true;
                }
            }

            //collapse
            //...

            //TODO
            if (this.selected_nodes) {
                for (var i in this.selected_nodes) {
                    if (this.selected_nodes[i].onKeyDown) {
                        this.selected_nodes[i].onKeyDown(e);
                    }
                }
            }
        } else if (e.type == "keyup") {
            if (e.keyCode == 32) {
                this.dragging_canvas = false;
            }

            if (this.selected_nodes) {
                for (var i in this.selected_nodes) {
                    if (this.selected_nodes[i].onKeyUp) {
                        this.selected_nodes[i].onKeyUp(e);
                    }
                }
            }
        }

        this.graph.change();

        if (block_default) {
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        }
    };

    LGraphCanvas.prototype.copyToClipboard = function() {
        var clipboard_info = {
            nodes: [],
            links: []
        };
        var index = 0;
        var selected_nodes_array = [];
        for (var i in this.selected_nodes) {
            var node = this.selected_nodes[i];
            node._relative_id = index;
            selected_nodes_array.push(node);
            index += 1;
        }

        for (var i = 0; i < selected_nodes_array.length; ++i) {
            var node = selected_nodes_array[i];
			var cloned = node.clone();
			if(!cloned)
			{
				console.warn("node type not found: " + node.type );
				continue;
			}
            clipboard_info.nodes.push(cloned.serialize());
            if (node.inputs && node.inputs.length) {
                for (var j = 0; j < node.inputs.length; ++j) {
                    var input = node.inputs[j];
                    if (!input || input.link == null) {
                        continue;
                    }
                    var link_info = this.graph.links[input.link];
                    if (!link_info) {
                        continue;
                    }
                    var target_node = this.graph.getNodeById(
                        link_info.origin_id
                    );
                    if (!target_node || !this.selected_nodes[target_node.id]) {
                        //improve this by allowing connections to non-selected nodes
                        continue;
                    } //not selected
                    clipboard_info.links.push([
                        target_node._relative_id,
                        link_info.origin_slot, //j,
                        node._relative_id,
                        link_info.target_slot
                    ]);
                }
            }
        }
        localStorage.setItem(
            "litegrapheditor_clipboard",
            JSON.stringify(clipboard_info)
        );
    };

    LGraphCanvas.prototype.pasteFromClipboard = function() {
        var data = localStorage.getItem("litegrapheditor_clipboard");
        if (!data) {
            return;
        }

		this.graph.beforeChange();

        //create nodes
        var clipboard_info = JSON.parse(data);
        var nodes = [];
        for (var i = 0; i < clipboard_info.nodes.length; ++i) {
            var node_data = clipboard_info.nodes[i];
            var node = LiteGraph.createNode(node_data.type);
            if (node) {
                node.configure(node_data);
                node.pos[0] += 5;
                node.pos[1] += 5;
                this.graph.add(node);
                nodes.push(node);
            }
        }

        //create links
        for (var i = 0; i < clipboard_info.links.length; ++i) {
            var link_info = clipboard_info.links[i];
            var origin_node = nodes[link_info[0]];
            var target_node = nodes[link_info[2]];
			if( origin_node && target_node )
	            origin_node.connect(link_info[1], target_node, link_info[3]);
			else
				console.warn("Warning, nodes missing on pasting");
        }

        this.selectNodes(nodes);

		this.graph.afterChange();
    };

    /**
     * process a item drop event on top the canvas
     * @method processDrop
     **/
    LGraphCanvas.prototype.processDrop = function(e) {
        e.preventDefault();
        this.adjustMouseEvent(e);

        var pos = [e.canvasX, e.canvasY];
        var node = this.graph ? this.graph.getNodeOnPos(pos[0], pos[1]) : null;

        if (!node) {
            var r = null;
            if (this.onDropItem) {
                r = this.onDropItem(event);
            }
            if (!r) {
                this.checkDropItem(e);
            }
            return;
        }

        if (node.onDropFile || node.onDropData) {
            var files = e.dataTransfer.files;
            if (files && files.length) {
                for (var i = 0; i < files.length; i++) {
                    var file = e.dataTransfer.files[0];
                    var filename = file.name;
                    var ext = LGraphCanvas.getFileExtension(filename);
                    //console.log(file);

                    if (node.onDropFile) {
                        node.onDropFile(file);
                    }

                    if (node.onDropData) {
                        //prepare reader
                        var reader = new FileReader();
                        reader.onload = function(event) {
                            //console.log(event.target);
                            var data = event.target.result;
                            node.onDropData(data, filename, file);
                        };

                        //read data
                        var type = file.type.split("/")[0];
                        if (type == "text" || type == "") {
                            reader.readAsText(file);
                        } else if (type == "image") {
                            reader.readAsDataURL(file);
                        } else {
                            reader.readAsArrayBuffer(file);
                        }
                    }
                }
            }
        }

        if (node.onDropItem) {
            if (node.onDropItem(event)) {
                return true;
            }
        }

        if (this.onDropItem) {
            return this.onDropItem(event);
        }

        return false;
    };

    //called if the graph doesn't have a default drop item behaviour
    LGraphCanvas.prototype.checkDropItem = function(e) {
        if (e.dataTransfer.files.length) {
            var file = e.dataTransfer.files[0];
            var ext = LGraphCanvas.getFileExtension(file.name).toLowerCase();
            var nodetype = LiteGraph.node_types_by_file_extension[ext];
            if (nodetype) {
				this.graph.beforeChange();
                var node = LiteGraph.createNode(nodetype.type);
                node.pos = [e.canvasX, e.canvasY];
                this.graph.add(node);
                if (node.onDropFile) {
                    node.onDropFile(file);
                }
				this.graph.afterChange();
            }
        }
    };

    LGraphCanvas.prototype.processNodeDblClicked = function(n) {
        if (this.onShowNodePanel) {
            this.onShowNodePanel(n);
        }
		else
		{
			this.showShowNodePanel(n);
		}

        if (this.onNodeDblClicked) {
            this.onNodeDblClicked(n);
        }

        this.setDirty(true);
    };

    LGraphCanvas.prototype.processNodeSelected = function(node, e) {
        this.selectNode(node, e && e.shiftKey);
        if (this.onNodeSelected) {
            this.onNodeSelected(node);
        }
    };

    /**
     * selects a given node (or adds it to the current selection)
     * @method selectNode
     **/
    LGraphCanvas.prototype.selectNode = function(
        node,
        add_to_current_selection
    ) {
        if (node == null) {
            this.deselectAllNodes();
        } else {
            this.selectNodes([node], add_to_current_selection);
        }
    };

    /**
     * selects several nodes (or adds them to the current selection)
     * @method selectNodes
     **/
    LGraphCanvas.prototype.selectNodes = function( nodes, add_to_current_selection )
	{
        if (!add_to_current_selection) {
            this.deselectAllNodes();
        }

        nodes = nodes || this.graph._nodes;
        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            if (node.is_selected) {
                continue;
            }

            if (!node.is_selected && node.onSelected) {
                node.onSelected();
            }
            node.is_selected = true;
            this.selected_nodes[node.id] = node;

            if (node.inputs) {
                for (var j = 0; j < node.inputs.length; ++j) {
                    this.highlighted_links[node.inputs[j].link] = true;
                }
            }
            if (node.outputs) {
                for (var j = 0; j < node.outputs.length; ++j) {
                    var out = node.outputs[j];
                    if (out.links) {
                        for (var k = 0; k < out.links.length; ++k) {
                            this.highlighted_links[out.links[k]] = true;
                        }
                    }
                }
            }
        }

		if(	this.onSelectionChange )
			this.onSelectionChange( this.selected_nodes );

        this.setDirty(true);
    };

    /**
     * removes a node from the current selection
     * @method deselectNode
     **/
    LGraphCanvas.prototype.deselectNode = function(node) {
        if (!node.is_selected) {
            return;
        }
        if (node.onDeselected) {
            node.onDeselected();
        }
        node.is_selected = false;

        if (this.onNodeDeselected) {
            this.onNodeDeselected(node);
        }

        //remove highlighted
        if (node.inputs) {
            for (var i = 0; i < node.inputs.length; ++i) {
                delete this.highlighted_links[node.inputs[i].link];
            }
        }
        if (node.outputs) {
            for (var i = 0; i < node.outputs.length; ++i) {
                var out = node.outputs[i];
                if (out.links) {
                    for (var j = 0; j < out.links.length; ++j) {
                        delete this.highlighted_links[out.links[j]];
                    }
                }
            }
        }
    };

    /**
     * removes all nodes from the current selection
     * @method deselectAllNodes
     **/
    LGraphCanvas.prototype.deselectAllNodes = function() {
        if (!this.graph) {
            return;
        }
        var nodes = this.graph._nodes;
        for (var i = 0, l = nodes.length; i < l; ++i) {
            var node = nodes[i];
            if (!node.is_selected) {
                continue;
            }
            if (node.onDeselected) {
                node.onDeselected();
            }
            node.is_selected = false;
			if (this.onNodeDeselected) {
				this.onNodeDeselected(node);
			}
        }
        this.selected_nodes = {};
        this.current_node = null;
        this.highlighted_links = {};
		if(	this.onSelectionChange )
			this.onSelectionChange( this.selected_nodes );
        this.setDirty(true);
    };

    /**
     * deletes all nodes in the current selection from the graph
     * @method deleteSelectedNodes
     **/
    LGraphCanvas.prototype.deleteSelectedNodes = function() {

		this.graph.beforeChange();

        for (var i in this.selected_nodes) {
            var node = this.selected_nodes[i];

			if(node.block_delete)
				continue;

			//autoconnect when possible (very basic, only takes into account first input-output)
			if(node.inputs && node.inputs.length && node.outputs && node.outputs.length && LiteGraph.isValidConnection( node.inputs[0].type, node.outputs[0].type ) && node.inputs[0].link && node.outputs[0].links && node.outputs[0].links.length ) 
			{
				var input_link = node.graph.links[ node.inputs[0].link ];
				var output_link = node.graph.links[ node.outputs[0].links[0] ];
				var input_node = node.getInputNode(0);
				var output_node = node.getOutputNodes(0)[0];
				if(input_node && output_node)
					input_node.connect( input_link.origin_slot, output_node, output_link.target_slot );
			}
            this.graph.remove(node);
			if (this.onNodeDeselected) {
				this.onNodeDeselected(node);
			}
        }
        this.selected_nodes = {};
        this.current_node = null;
        this.highlighted_links = {};
        this.setDirty(true);
		this.graph.afterChange();
    };

    /**
     * centers the camera on a given node
     * @method centerOnNode
     **/
    LGraphCanvas.prototype.centerOnNode = function(node) {
        this.ds.offset[0] =
            -node.pos[0] -
            node.size[0] * 0.5 +
            (this.canvas.width * 0.5) / this.ds.scale;
        this.ds.offset[1] =
            -node.pos[1] -
            node.size[1] * 0.5 +
            (this.canvas.height * 0.5) / this.ds.scale;
        this.setDirty(true, true);
    };

    /**
     * adds some useful properties to a mouse event, like the position in graph coordinates
     * @method adjustMouseEvent
     **/
    LGraphCanvas.prototype.adjustMouseEvent = function(e) {
        if (this.canvas) {
            var b = this.canvas.getBoundingClientRect();
            e.localX = e.clientX - b.left;
            e.localY = e.clientY - b.top;
        } else {
            e.localX = e.clientX;
            e.localY = e.clientY;
        }

        e.deltaX = e.localX - this.last_mouse_position[0];
        e.deltaY = e.localY - this.last_mouse_position[1];

        this.last_mouse_position[0] = e.localX;
        this.last_mouse_position[1] = e.localY;

        e.canvasX = e.localX / this.ds.scale - this.ds.offset[0];
        e.canvasY = e.localY / this.ds.scale - this.ds.offset[1];
    };

    /**
     * changes the zoom level of the graph (default is 1), you can pass also a place used to pivot the zoom
     * @method setZoom
     **/
    LGraphCanvas.prototype.setZoom = function(value, zooming_center) {
        this.ds.changeScale(value, zooming_center);
        /*
	if(!zooming_center && this.canvas)
		zooming_center = [this.canvas.width * 0.5,this.canvas.height * 0.5];

	var center = this.convertOffsetToCanvas( zooming_center );

	this.ds.scale = value;

	if(this.scale > this.max_zoom)
		this.scale = this.max_zoom;
	else if(this.scale < this.min_zoom)
		this.scale = this.min_zoom;

	var new_center = this.convertOffsetToCanvas( zooming_center );
	var delta_offset = [new_center[0] - center[0], new_center[1] - center[1]];

	this.offset[0] += delta_offset[0];
	this.offset[1] += delta_offset[1];
	*/

        this.dirty_canvas = true;
        this.dirty_bgcanvas = true;
    };

    /**
     * converts a coordinate from graph coordinates to canvas2D coordinates
     * @method convertOffsetToCanvas
     **/
    LGraphCanvas.prototype.convertOffsetToCanvas = function(pos, out) {
        return this.ds.convertOffsetToCanvas(pos, out);
    };

    /**
     * converts a coordinate from Canvas2D coordinates to graph space
     * @method convertCanvasToOffset
     **/
    LGraphCanvas.prototype.convertCanvasToOffset = function(pos, out) {
        return this.ds.convertCanvasToOffset(pos, out);
    };

    //converts event coordinates from canvas2D to graph coordinates
    LGraphCanvas.prototype.convertEventToCanvasOffset = function(e) {
        var rect = this.canvas.getBoundingClientRect();
        return this.convertCanvasToOffset([
            e.clientX - rect.left,
            e.clientY - rect.top
        ]);
    };

    /**
     * brings a node to front (above all other nodes)
     * @method bringToFront
     **/
    LGraphCanvas.prototype.bringToFront = function(node) {
        var i = this.graph._nodes.indexOf(node);
        if (i == -1) {
            return;
        }

        this.graph._nodes.splice(i, 1);
        this.graph._nodes.push(node);
    };

    /**
     * sends a node to the back (below all other nodes)
     * @method sendToBack
     **/
    LGraphCanvas.prototype.sendToBack = function(node) {
        var i = this.graph._nodes.indexOf(node);
        if (i == -1) {
            return;
        }

        this.graph._nodes.splice(i, 1);
        this.graph._nodes.unshift(node);
    };

    /* Interaction */

    /* LGraphCanvas render */
    var temp = new Float32Array(4);

    /**
     * checks which nodes are visible (inside the camera area)
     * @method computeVisibleNodes
     **/
    LGraphCanvas.prototype.computeVisibleNodes = function(nodes, out) {
        var visible_nodes = out || [];
        visible_nodes.length = 0;
        nodes = nodes || this.graph._nodes;
        for (var i = 0, l = nodes.length; i < l; ++i) {
            var n = nodes[i];

            //skip rendering nodes in live mode
            if (this.live_mode && !n.onDrawBackground && !n.onDrawForeground) {
                continue;
            }

            if (!overlapBounding(this.visible_area, n.getBounding(temp))) {
                continue;
            } //out of the visible area

            visible_nodes.push(n);
        }
        return visible_nodes;
    };

    /**
     * renders the whole canvas content, by rendering in two separated canvas, one containing the background grid and the connections, and one containing the nodes)
     * @method draw
     **/
    LGraphCanvas.prototype.draw = function(force_canvas, force_bgcanvas) {
        if (!this.canvas || this.canvas.width == 0 || this.canvas.height == 0) {
            return;
        }

        //fps counting
        var now = LiteGraph.getTime();
        this.render_time = (now - this.last_draw_time) * 0.001;
        this.last_draw_time = now;

        if (this.graph) {
            this.ds.computeVisibleArea();
        }

        if (
            this.dirty_bgcanvas ||
            force_bgcanvas ||
            this.always_render_background ||
            (this.graph &&
                this.graph._last_trigger_time &&
                now - this.graph._last_trigger_time < 1000)
        ) {
            this.drawBackCanvas();
        }

        if (this.dirty_canvas || force_canvas) {
            this.drawFrontCanvas();
        }

        this.fps = this.render_time ? 1.0 / this.render_time : 0;
        this.frame += 1;
    };

    /**
     * draws the front canvas (the one containing all the nodes)
     * @method drawFrontCanvas
     **/
    LGraphCanvas.prototype.drawFrontCanvas = function() {
        this.dirty_canvas = false;

        if (!this.ctx) {
            this.ctx = this.bgcanvas.getContext("2d");
        }
        var ctx = this.ctx;
        if (!ctx) {
            //maybe is using webgl...
            return;
        }

        if (ctx.start2D) {
            ctx.start2D();
        }

        var canvas = this.canvas;

        //reset in case of error
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        //clip dirty area if there is one, otherwise work in full canvas
        if (this.dirty_area) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(
                this.dirty_area[0],
                this.dirty_area[1],
                this.dirty_area[2],
                this.dirty_area[3]
            );
            ctx.clip();
        }

        //clear
        //canvas.width = canvas.width;
        if (this.clear_background) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        //draw bg canvas
        if (this.bgcanvas == this.canvas) {
            this.drawBackCanvas();
        } else {
            ctx.drawImage( this.bgcanvas, 0, 0 );
        }

        //rendering
        if (this.onRender) {
            this.onRender(canvas, ctx);
        }

        //info widget
        if (this.show_info) {
            this.renderInfo(ctx);
        }

        if (this.graph) {
            //apply transformations
            ctx.save();
            this.ds.toCanvasContext(ctx);

            //draw nodes
            var drawn_nodes = 0;
            var visible_nodes = this.computeVisibleNodes(
                null,
                this.visible_nodes
            );

            for (var i = 0; i < visible_nodes.length; ++i) {
                var node = visible_nodes[i];

                //transform coords system
                ctx.save();
                ctx.translate(node.pos[0], node.pos[1]);

                //Draw
                this.drawNode(node, ctx);
                drawn_nodes += 1;

                //Restore
                ctx.restore();
            }

            //on top (debug)
            if (this.render_execution_order) {
                this.drawExecutionOrder(ctx);
            }

            //connections ontop?
            if (this.graph.config.links_ontop) {
                if (!this.live_mode) {
                    this.drawConnections(ctx);
                }
            }

            //current connection (the one being dragged by the mouse)
            if (this.connecting_pos != null) {
                ctx.lineWidth = this.connections_width;
                var link_color = null;

                switch (this.connecting_output.type) {
                    case LiteGraph.EVENT:
                        link_color = LiteGraph.EVENT_LINK_COLOR;
                        break;
                    default:
                        link_color = LiteGraph.CONNECTING_LINK_COLOR;
                }

                //the connection being dragged by the mouse
                this.renderLink(
                    ctx,
                    this.connecting_pos,
                    [this.graph_mouse[0], this.graph_mouse[1]],
                    null,
                    false,
                    null,
                    link_color,
                    this.connecting_output.dir ||
                        (this.connecting_node.horizontal
                            ? LiteGraph.DOWN
                            : LiteGraph.RIGHT),
                    LiteGraph.CENTER
                );

                ctx.beginPath();
                if (
                    this.connecting_output.type === LiteGraph.EVENT ||
                    this.connecting_output.shape === LiteGraph.BOX_SHAPE
                ) {
                    ctx.rect(
                        this.connecting_pos[0] - 6 + 0.5,
                        this.connecting_pos[1] - 5 + 0.5,
                        14,
                        10
                    );
                } else {
                    ctx.arc(
                        this.connecting_pos[0],
                        this.connecting_pos[1],
                        4,
                        0,
                        Math.PI * 2
                    );
                }
                ctx.fill();

                ctx.fillStyle = "#ffcc00";
                if (this._highlight_input) {
                    ctx.beginPath();
                    ctx.arc(
                        this._highlight_input[0],
                        this._highlight_input[1],
                        6,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }

			//the selection rectangle
            if (this.dragging_rectangle) {
                ctx.strokeStyle = "#FFF";
                ctx.strokeRect(
                    this.dragging_rectangle[0],
                    this.dragging_rectangle[1],
                    this.dragging_rectangle[2],
                    this.dragging_rectangle[3]
                );
            }

			//on top of link center
			if(this.over_link_center && this.render_link_tooltip)
				this.drawLinkTooltip( ctx, this.over_link_center );
			else
				if(this.onDrawLinkTooltip) //to remove
					this.onDrawLinkTooltip(ctx,null);

			//custom info
            if (this.onDrawForeground) {
                this.onDrawForeground(ctx, this.visible_rect);
            }

            ctx.restore();
        }

		//draws panel in the corner 
		if (this._graph_stack && this._graph_stack.length) {
			this.drawSubgraphPanel( ctx );
		}


        if (this.onDrawOverlay) {
            this.onDrawOverlay(ctx);
        }

        if (this.dirty_area) {
            ctx.restore();
            //this.dirty_area = null;
        }

        if (ctx.finish2D) {
            //this is a function I use in webgl renderer
            ctx.finish2D();
        }
    };

    /**
     * draws the panel in the corner that shows subgraph properties
     * @method drawSubgraphPanel
     **/
	LGraphCanvas.prototype.drawSubgraphPanel = function(ctx) {
		var subgraph = this.graph;
		var subnode = subgraph._subgraph_node;
		if(!subnode)
		{
			console.warn("subgraph without subnode");
			return;
		}

		var num = subnode.inputs ? subnode.inputs.length : 0;
		var w = 300;
		var h = Math.floor(LiteGraph.NODE_SLOT_HEIGHT * 1.6);

		ctx.fillStyle = "#111";
		ctx.globalAlpha = 0.8;
		ctx.beginPath();
		ctx.roundRect(10,10,w, (num + 1) * h + 50,8 );
		ctx.fill();
		ctx.globalAlpha = 1;

		ctx.fillStyle = "#888";
		ctx.font = "14px Arial";
		ctx.textAlign = "left";
		ctx.fillText( "Graph Inputs", 20, 34 );
		var pos = this.mouse;

		if( this.drawButton( w - 20, 20,20,20, "X", "#151515" ) )
		{
			this.closeSubgraph();
			return;
		}

		var y = 50;
		ctx.font = "20px Arial";
		if(subnode.inputs)
		for(var i = 0; i < subnode.inputs.length; ++i)
		{
			var input = subnode.inputs[i];
			if(input.not_subgraph_input)
				continue;

			//input button clicked
			if( this.drawButton( 20,y+2,w - 20, h - 2 ) )
			{
				var type = subnode.constructor.input_node_type || "graph/input";
				this.graph.beforeChange();
				var newnode = LiteGraph.createNode( type );
				if(newnode)
				{
					subgraph.add( newnode );
					this.block_click = false;
					this.last_click_position = null;
					this.selectNodes([newnode]);
					this.node_dragged = newnode;
					this.dragging_canvas = false;
					newnode.setProperty("name",input.name);
					newnode.setProperty("type",input.type);
					this.node_dragged.pos[0] = this.graph_mouse[0] - 5;
					this.node_dragged.pos[1] = this.graph_mouse[1] - 5;
					this.graph.afterChange();
				}
				else
					console.error("graph input node not found:",type);
			}

			ctx.fillStyle = "#9C9";
			ctx.beginPath();
			ctx.arc(w - 16,y + h * 0.5,5,0,2*Math.PI);
			ctx.fill();

			ctx.fillStyle = "#AAA";
			ctx.fillText( input.name, 50, y + h*0.75 );
			var tw = ctx.measureText( input.name );
			ctx.fillStyle = "#777";
			ctx.fillText( input.type, 50 + tw.width + 10, y + h*0.75 );

			y += h;
		}

		//add + button
		if( this.drawButton( 20,y+2,w - 20, h - 2, "+", "#151515", "#222" ) )
		{
			this.showSubgraphPropertiesDialog( subnode );
		}
	}

	//Draws a button into the canvas overlay and computes if it was clicked using the immediate gui paradigm
	LGraphCanvas.prototype.drawButton = function( x,y,w,h, text, bgcolor, hovercolor, textcolor )
	{
		var ctx = this.ctx;
		bgcolor = bgcolor || LiteGraph.NODE_DEFAULT_COLOR;
		hovercolor = hovercolor || "#555";
		textcolor = textcolor || LiteGraph.NODE_TEXT_COLOR;

		var pos = this.mouse;
		var hover = LiteGraph.isInsideRectangle( pos[0], pos[1], x,y,w,h );
		pos = this.last_click_position;
		var clicked = pos && LiteGraph.isInsideRectangle( pos[0], pos[1], x,y,w,h );

		ctx.fillStyle = hover ? hovercolor : bgcolor;
		if(clicked)
			ctx.fillStyle = "#AAA";
		ctx.beginPath();
		ctx.roundRect(x,y,w,h,4 );
		ctx.fill();

		if(text != null)
		{
			if(text.constructor == String)
			{
				ctx.fillStyle = textcolor;
				ctx.textAlign = "center";
				ctx.font = ((h * 0.65)|0) + "px Arial";
				ctx.fillText( text, x + w * 0.5,y + h * 0.75 );
				ctx.textAlign = "left";
			}
		}

		var was_clicked = clicked && !this.block_click;
		if(clicked)
			this.blockClick();
		return was_clicked;
	}

	LGraphCanvas.prototype.isAreaClicked = function( x,y,w,h, hold_click )
	{
		var pos = this.mouse;
		var hover = LiteGraph.isInsideRectangle( pos[0], pos[1], x,y,w,h );
		pos = this.last_click_position;
		var clicked = pos && LiteGraph.isInsideRectangle( pos[0], pos[1], x,y,w,h );
		var was_clicked = clicked && !this.block_click;
		if(clicked && hold_click)
			this.blockClick();
		return was_clicked;
	}

    /**
     * draws some useful stats in the corner of the canvas
     * @method renderInfo
     **/
    LGraphCanvas.prototype.renderInfo = function(ctx, x, y) {
        x = x || 10;
        y = y || this.canvas.height - 80;

        ctx.save();
        ctx.translate(x, y);

        ctx.font = "10px Arial";
        ctx.fillStyle = "#888";
        if (this.graph) {
            ctx.fillText( "T: " + this.graph.globaltime.toFixed(2) + "s", 5, 13 * 1 );
            ctx.fillText("I: " + this.graph.iteration, 5, 13 * 2 );
            ctx.fillText("N: " + this.graph._nodes.length + " [" + this.visible_nodes.length + "]", 5, 13 * 3 );
            ctx.fillText("V: " + this.graph._version, 5, 13 * 4);
            ctx.fillText("FPS:" + this.fps.toFixed(2), 5, 13 * 5);
        } else {
            ctx.fillText("No graph selected", 5, 13 * 1);
        }
        ctx.restore();
    };

    /**
     * draws the back canvas (the one containing the background and the connections)
     * @method drawBackCanvas
     **/
    LGraphCanvas.prototype.drawBackCanvas = function() {
        var canvas = this.bgcanvas;
        if (
            canvas.width != this.canvas.width ||
            canvas.height != this.canvas.height
        ) {
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
        }

        if (!this.bgctx) {
            this.bgctx = this.bgcanvas.getContext("2d");
        }
        var ctx = this.bgctx;
        if (ctx.start) {
            ctx.start();
        }

        //clear
        if (this.clear_background) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (this._graph_stack && this._graph_stack.length) {
            ctx.save();
            var parent_graph = this._graph_stack[this._graph_stack.length - 1];
            var subgraph_node = this.graph._subgraph_node;
            ctx.strokeStyle = subgraph_node.bgcolor;
            ctx.lineWidth = 10;
            ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
            ctx.lineWidth = 1;
            ctx.font = "40px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = subgraph_node.bgcolor || "#AAA";
            var title = "";
            for (var i = 1; i < this._graph_stack.length; ++i) {
                title +=
                    this._graph_stack[i]._subgraph_node.getTitle() + " >> ";
            }
            ctx.fillText(
                title + subgraph_node.getTitle(),
                canvas.width * 0.5,
                40
            );
            ctx.restore();
        }

        var bg_already_painted = false;
        if (this.onRenderBackground) {
            bg_already_painted = this.onRenderBackground(canvas, ctx);
        }

        //reset in case of error
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.visible_links.length = 0;

        if (this.graph) {
            //apply transformations
            ctx.save();
            this.ds.toCanvasContext(ctx);

            //render BG
            if (
                this.background_image &&
                this.ds.scale > 0.5 &&
                !bg_already_painted
            ) {
                if (this.zoom_modify_alpha) {
                    ctx.globalAlpha =
                        (1.0 - 0.5 / this.ds.scale) * this.editor_alpha;
                } else {
                    ctx.globalAlpha = this.editor_alpha;
                }
                ctx.imageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = false;
                if (
                    !this._bg_img ||
                    this._bg_img.name != this.background_image
                ) {
                    this._bg_img = new Image();
                    this._bg_img.name = this.background_image;
                    this._bg_img.src = this.background_image;
                    var that = this;
                    this._bg_img.onload = function() {
                        that.draw(true, true);
                    };
                }

                var pattern = null;
                if (this._pattern == null && this._bg_img.width > 0) {
                    pattern = ctx.createPattern(this._bg_img, "repeat");
                    this._pattern_img = this._bg_img;
                    this._pattern = pattern;
                } else {
                    pattern = this._pattern;
                }
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(
                        this.visible_area[0],
                        this.visible_area[1],
                        this.visible_area[2],
                        this.visible_area[3]
                    );
                    ctx.fillStyle = "transparent";
                }

                ctx.globalAlpha = 1.0;
                ctx.imageSmoothingEnabled = ctx.mozImageSmoothingEnabled = ctx.imageSmoothingEnabled = true;
            }

            //groups
            if (this.graph._groups.length && !this.live_mode) {
                this.drawGroups(canvas, ctx);
            }

            if (this.onDrawBackground) {
                this.onDrawBackground(ctx, this.visible_area);
            }
            if (this.onBackgroundRender) {
                //LEGACY
                console.error(
                    "WARNING! onBackgroundRender deprecated, now is named onDrawBackground "
                );
                this.onBackgroundRender = null;
            }

            //DEBUG: show clipping area
            //ctx.fillStyle = "red";
            //ctx.fillRect( this.visible_area[0] + 10, this.visible_area[1] + 10, this.visible_area[2] - 20, this.visible_area[3] - 20);

            //bg
            if (this.render_canvas_border) {
                ctx.strokeStyle = "#235";
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
            }

            if (this.render_connections_shadows) {
                ctx.shadowColor = "#000";
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.shadowBlur = 6;
            } else {
                ctx.shadowColor = "rgba(0,0,0,0)";
            }

            //draw connections
            if (!this.live_mode) {
                this.drawConnections(ctx);
            }

            ctx.shadowColor = "rgba(0,0,0,0)";

            //restore state
            ctx.restore();
        }

        if (ctx.finish) {
            ctx.finish();
        }

        this.dirty_bgcanvas = false;
        this.dirty_canvas = true; //to force to repaint the front canvas with the bgcanvas
    };

    var temp_vec2 = new Float32Array(2);

    /**
     * draws the given node inside the canvas
     * @method drawNode
     **/
    LGraphCanvas.prototype.drawNode = function(node, ctx) {
        var glow = false;
        this.current_node = node;

        var color = node.color || node.constructor.color || LiteGraph.NODE_DEFAULT_COLOR;
        var bgcolor = node.bgcolor || node.constructor.bgcolor || LiteGraph.NODE_DEFAULT_BGCOLOR;

        //shadow and glow
        if (node.mouseOver) {
            glow = true;
        }

        var low_quality = this.ds.scale < 0.6; //zoomed out

        //only render if it forces it to do it
        if (this.live_mode) {
            if (!node.flags.collapsed) {
                ctx.shadowColor = "transparent";
                if (node.onDrawForeground) {
                    node.onDrawForeground(ctx, this, this.canvas);
                }
            }
            return;
        }

        var editor_alpha = this.editor_alpha;
        ctx.globalAlpha = editor_alpha;

        if (this.render_shadows && !low_quality) {
            ctx.shadowColor = LiteGraph.DEFAULT_SHADOW_COLOR;
            ctx.shadowOffsetX = 2 * this.ds.scale;
            ctx.shadowOffsetY = 2 * this.ds.scale;
            ctx.shadowBlur = 3 * this.ds.scale;
        } else {
            ctx.shadowColor = "transparent";
        }

        //custom draw collapsed method (draw after shadows because they are affected)
        if (
            node.flags.collapsed &&
            node.onDrawCollapsed &&
            node.onDrawCollapsed(ctx, this) == true
        ) {
            return;
        }

        //clip if required (mask)
        var shape = node._shape || LiteGraph.BOX_SHAPE;
        var size = temp_vec2;
        temp_vec2.set(node.size);
        var horizontal = node.horizontal; // || node.flags.horizontal;

        if (node.flags.collapsed) {
            ctx.font = this.inner_text_font;
            var title = node.getTitle ? node.getTitle() : node.title;
            if (title != null) {
                node._collapsed_width = Math.min(
                    node.size[0],
                    ctx.measureText(title).width +
                        LiteGraph.NODE_TITLE_HEIGHT * 2
                ); //LiteGraph.NODE_COLLAPSED_WIDTH;
                size[0] = node._collapsed_width;
                size[1] = 0;
            }
        }

        if (node.clip_area) {
            //Start clipping
            ctx.save();
            ctx.beginPath();
            if (shape == LiteGraph.BOX_SHAPE) {
                ctx.rect(0, 0, size[0], size[1]);
            } else if (shape == LiteGraph.ROUND_SHAPE) {
                ctx.roundRect(0, 0, size[0], size[1], 10);
            } else if (shape == LiteGraph.CIRCLE_SHAPE) {
                ctx.arc(
                    size[0] * 0.5,
                    size[1] * 0.5,
                    size[0] * 0.5,
                    0,
                    Math.PI * 2
                );
            }
            ctx.clip();
        }

        //draw shape
        if (node.has_errors) {
            bgcolor = "red";
        }
        this.drawNodeShape(
            node,
            ctx,
            size,
            color,
            bgcolor,
            node.is_selected,
            node.mouseOver
        );
        ctx.shadowColor = "transparent";

        //draw foreground
        if (node.onDrawForeground) {
            node.onDrawForeground(ctx, this, this.canvas);
        }

        //connection slots
        ctx.textAlign = horizontal ? "center" : "left";
        ctx.font = this.inner_text_font;

        var render_text = !low_quality;

        var out_slot = this.connecting_output;
        ctx.lineWidth = 1;

        var max_y = 0;
        var slot_pos = new Float32Array(2); //to reuse

        //render inputs and outputs
        if (!node.flags.collapsed) {
            //input connection slots
            if (node.inputs) {
                for (var i = 0; i < node.inputs.length; i++) {
                    var slot = node.inputs[i];

                    ctx.globalAlpha = editor_alpha;
                    //change opacity of incompatible slots when dragging a connection
                    if ( this.connecting_node && !LiteGraph.isValidConnection( slot.type , out_slot.type) ) {
                        ctx.globalAlpha = 0.4 * editor_alpha;
                    }

                    ctx.fillStyle =
                        slot.link != null
                            ? slot.color_on ||
                              this.default_connection_color.input_on
                            : slot.color_off ||
                              this.default_connection_color.input_off;

                    var pos = node.getConnectionPos(true, i, slot_pos);
                    pos[0] -= node.pos[0];
                    pos[1] -= node.pos[1];
                    if (max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5) {
                        max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5;
                    }

                    ctx.beginPath();

                    if (
                        slot.type === LiteGraph.EVENT ||
                        slot.shape === LiteGraph.BOX_SHAPE
                    ) {
                        if (horizontal) {
                            ctx.rect(
                                pos[0] - 5 + 0.5,
                                pos[1] - 8 + 0.5,
                                10,
                                14
                            );
                        } else {
                            ctx.rect(
                                pos[0] - 6 + 0.5,
                                pos[1] - 5 + 0.5,
                                14,
                                10
                            );
                        }
                    } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                        ctx.moveTo(pos[0] + 8, pos[1] + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] + 6 + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] - 6 + 0.5);
                        ctx.closePath();
                    } else {
						if(low_quality)
	                        ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8 ); //faster
						else
	                        ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                    }
                    ctx.fill();

                    //render name
                    if (render_text) {
                        var text = slot.label != null ? slot.label : slot.name;
                        if (text) {
                            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
                            if (horizontal || slot.dir == LiteGraph.UP) {
                                ctx.fillText(text, pos[0], pos[1] - 10);
                            } else {
                                ctx.fillText(text, pos[0] + 10, pos[1] + 5);
                            }
                        }
                    }
                }
            }

            //output connection slots
            if (this.connecting_node) {
                ctx.globalAlpha = 0.4 * editor_alpha;
            }

            ctx.textAlign = horizontal ? "center" : "right";
            ctx.strokeStyle = "black";
            if (node.outputs) {
                for (var i = 0; i < node.outputs.length; i++) {
                    var slot = node.outputs[i];

                    var pos = node.getConnectionPos(false, i, slot_pos);
                    pos[0] -= node.pos[0];
                    pos[1] -= node.pos[1];
                    if (max_y < pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5) {
                        max_y = pos[1] + LiteGraph.NODE_SLOT_HEIGHT * 0.5;
                    }

                    ctx.fillStyle =
                        slot.links && slot.links.length
                            ? slot.color_on ||
                              this.default_connection_color.output_on
                            : slot.color_off ||
                              this.default_connection_color.output_off;
                    ctx.beginPath();
                    //ctx.rect( node.size[0] - 14,i*14,10,10);

                    if (
                        slot.type === LiteGraph.EVENT ||
                        slot.shape === LiteGraph.BOX_SHAPE
                    ) {
                        if (horizontal) {
                            ctx.rect(
                                pos[0] - 5 + 0.5,
                                pos[1] - 8 + 0.5,
                                10,
                                14
                            );
                        } else {
                            ctx.rect(
                                pos[0] - 6 + 0.5,
                                pos[1] - 5 + 0.5,
                                14,
                                10
                            );
                        }
                    } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                        ctx.moveTo(pos[0] + 8, pos[1] + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] + 6 + 0.5);
                        ctx.lineTo(pos[0] - 4, pos[1] - 6 + 0.5);
                        ctx.closePath();
                    } else {
						if(low_quality)
	                        ctx.rect(pos[0] - 4, pos[1] - 4, 8, 8 );
						else
	                        ctx.arc(pos[0], pos[1], 4, 0, Math.PI * 2);
                    }

                    //trigger
                    //if(slot.node_id != null && slot.slot == -1)
                    //	ctx.fillStyle = "#F85";

                    //if(slot.links != null && slot.links.length)
                    ctx.fill();
					if(!low_quality)
	                    ctx.stroke();

                    //render output name
                    if (render_text) {
                        var text = slot.label != null ? slot.label : slot.name;
                        if (text) {
                            ctx.fillStyle = LiteGraph.NODE_TEXT_COLOR;
                            if (horizontal || slot.dir == LiteGraph.DOWN) {
                                ctx.fillText(text, pos[0], pos[1] - 8);
                            } else {
                                ctx.fillText(text, pos[0] - 10, pos[1] + 5);
                            }
                        }
                    }
                }
            }

            ctx.textAlign = "left";
            ctx.globalAlpha = 1;

            if (node.widgets) {
				var widgets_y = max_y;
                if (horizontal || node.widgets_up) {
                    widgets_y = 2;
                }
				if( node.widgets_start_y != null )
                    widgets_y = node.widgets_start_y;
                this.drawNodeWidgets(
                    node,
                    widgets_y,
                    ctx,
                    this.node_widget && this.node_widget[0] == node
                        ? this.node_widget[1]
                        : null
                );
            }
        } else if (this.render_collapsed_slots) {
            //if collapsed
            var input_slot = null;
            var output_slot = null;

            //get first connected slot to render
            if (node.inputs) {
                for (var i = 0; i < node.inputs.length; i++) {
                    var slot = node.inputs[i];
                    if (slot.link == null) {
                        continue;
                    }
                    input_slot = slot;
                    break;
                }
            }
            if (node.outputs) {
                for (var i = 0; i < node.outputs.length; i++) {
                    var slot = node.outputs[i];
                    if (!slot.links || !slot.links.length) {
                        continue;
                    }
                    output_slot = slot;
                }
            }

            if (input_slot) {
                var x = 0;
                var y = LiteGraph.NODE_TITLE_HEIGHT * -0.5; //center
                if (horizontal) {
                    x = node._collapsed_width * 0.5;
                    y = -LiteGraph.NODE_TITLE_HEIGHT;
                }
                ctx.fillStyle = "#686";
                ctx.beginPath();
                if (
                    slot.type === LiteGraph.EVENT ||
                    slot.shape === LiteGraph.BOX_SHAPE
                ) {
                    ctx.rect(x - 7 + 0.5, y - 4, 14, 8);
                } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(x + 8, y);
                    ctx.lineTo(x + -4, y - 4);
                    ctx.lineTo(x + -4, y + 4);
                    ctx.closePath();
                } else {
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
            }

            if (output_slot) {
                var x = node._collapsed_width;
                var y = LiteGraph.NODE_TITLE_HEIGHT * -0.5; //center
                if (horizontal) {
                    x = node._collapsed_width * 0.5;
                    y = 0;
                }
                ctx.fillStyle = "#686";
                ctx.strokeStyle = "black";
                ctx.beginPath();
                if (
                    slot.type === LiteGraph.EVENT ||
                    slot.shape === LiteGraph.BOX_SHAPE
                ) {
                    ctx.rect(x - 7 + 0.5, y - 4, 14, 8);
                } else if (slot.shape === LiteGraph.ARROW_SHAPE) {
                    ctx.moveTo(x + 6, y);
                    ctx.lineTo(x - 6, y - 4);
                    ctx.lineTo(x - 6, y + 4);
                    ctx.closePath();
                } else {
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                }
                ctx.fill();
                //ctx.stroke();
            }
        }

        if (node.clip_area) {
            ctx.restore();
        }

        ctx.globalAlpha = 1.0;
    };

	//used by this.over_link_center
	LGraphCanvas.prototype.drawLinkTooltip = function( ctx, link )
	{
		var pos = link._pos;
		ctx.fillStyle = "black";
		ctx.beginPath();
		ctx.arc( pos[0], pos[1], 3, 0, Math.PI * 2 );
		ctx.fill();

		if(link.data == null)
			return;

		if(this.onDrawLinkTooltip)
			if( this.onDrawLinkTooltip(ctx,link,this) == true )
				return;

		var data = link.data;
		var text = null;

		if( data.constructor === Number )
			text = data.toFixed(2);
		else if( data.constructor === String )
			text = "\"" + data + "\"";
		else if( data.constructor === Boolean )
			text = String(data);
		else if (data.toToolTip)
			text = data.toToolTip();
		else
			text = "[" + data.constructor.name + "]";

		if(text == null)
			return;
		text = text.substr(0,30); //avoid weird

		ctx.font = "14px Courier New";
		var info = ctx.measureText(text);
		var w = info.width + 20;
		var h = 24;
		ctx.shadowColor = "black";
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		ctx.shadowBlur = 3;
		ctx.fillStyle = "#454";
		ctx.beginPath();
		ctx.roundRect( pos[0] - w*0.5, pos[1] - 15 - h, w, h,3, 3);
		ctx.moveTo( pos[0] - 10, pos[1] - 15 );
		ctx.lineTo( pos[0] + 10, pos[1] - 15 );
		ctx.lineTo( pos[0], pos[1] - 5 );
		ctx.fill();
        ctx.shadowColor = "transparent";
		ctx.textAlign = "center";
		ctx.fillStyle = "#CEC";
		ctx.fillText(text, pos[0], pos[1] - 15 - h * 0.3);
	}

    /**
     * draws the shape of the given node in the canvas
     * @method drawNodeShape
     **/
    var tmp_area = new Float32Array(4);

    LGraphCanvas.prototype.drawNodeShape = function(
        node,
        ctx,
        size,
        fgcolor,
        bgcolor,
        selected,
        mouse_over
    ) {
        //bg rect
        ctx.strokeStyle = fgcolor;
        ctx.fillStyle = bgcolor;

        var title_height = LiteGraph.NODE_TITLE_HEIGHT;
        var low_quality = this.ds.scale < 0.5;

        //render node area depending on shape
        var shape =
            node._shape || node.constructor.shape || LiteGraph.ROUND_SHAPE;

        var title_mode = node.constructor.title_mode;

        var render_title = true;
        if (title_mode == LiteGraph.TRANSPARENT_TITLE) {
            render_title = false;
        } else if (title_mode == LiteGraph.AUTOHIDE_TITLE && mouse_over) {
            render_title = true;
        }

        var area = tmp_area;
        area[0] = 0; //x
        area[1] = render_title ? -title_height : 0; //y
        area[2] = size[0] + 1; //w
        area[3] = render_title ? size[1] + title_height : size[1]; //h

        var old_alpha = ctx.globalAlpha;

        //full node shape
        //if(node.flags.collapsed)
        {
            ctx.beginPath();
            if (shape == LiteGraph.BOX_SHAPE || low_quality) {
                ctx.fillRect(area[0], area[1], area[2], area[3]);
            } else if (
                shape == LiteGraph.ROUND_SHAPE ||
                shape == LiteGraph.CARD_SHAPE
            ) {
                ctx.roundRect(
                    area[0],
                    area[1],
                    area[2],
                    area[3],
                    this.round_radius,
                    shape == LiteGraph.CARD_SHAPE ? 0 : this.round_radius
                );
            } else if (shape == LiteGraph.CIRCLE_SHAPE) {
                ctx.arc(
                    size[0] * 0.5,
                    size[1] * 0.5,
                    size[0] * 0.5,
                    0,
                    Math.PI * 2
                );
            }
            ctx.fill();

			//separator
			if(!node.flags.collapsed)
			{
				ctx.shadowColor = "transparent";
				ctx.fillStyle = "rgba(0,0,0,0.2)";
				ctx.fillRect(0, -1, area[2], 2);
			}
        }
        ctx.shadowColor = "transparent";

        if (node.onDrawBackground) {
            node.onDrawBackground(ctx, this, this.canvas, this.graph_mouse );
        }

        //title bg (remember, it is rendered ABOVE the node)
        if (render_title || title_mode == LiteGraph.TRANSPARENT_TITLE) {
            //title bar
            if (node.onDrawTitleBar) {
                node.onDrawTitleBar( ctx, title_height, size, this.ds.scale, fgcolor );
            } else if (
                title_mode != LiteGraph.TRANSPARENT_TITLE &&
                (node.constructor.title_color || this.render_title_colored)
            ) {
                var title_color = node.constructor.title_color || fgcolor;

                if (node.flags.collapsed) {
                    ctx.shadowColor = LiteGraph.DEFAULT_SHADOW_COLOR;
                }

                //* gradient test
                if (this.use_gradients) {
                    var grad = LGraphCanvas.gradients[title_color];
                    if (!grad) {
                        grad = LGraphCanvas.gradients[ title_color ] = ctx.createLinearGradient(0, 0, 400, 0);
                        grad.addColorStop(0, title_color);
                        grad.addColorStop(1, "#000");
                    }
                    ctx.fillStyle = grad;
                } else {
                    ctx.fillStyle = title_color;
                }

                //ctx.globalAlpha = 0.5 * old_alpha;
                ctx.beginPath();
                if (shape == LiteGraph.BOX_SHAPE || low_quality) {
                    ctx.rect(0, -title_height, size[0] + 1, title_height);
                } else if (  shape == LiteGraph.ROUND_SHAPE || shape == LiteGraph.CARD_SHAPE ) {
                    ctx.roundRect(
                        0,
                        -title_height,
                        size[0] + 1,
                        title_height,
                        this.round_radius,
                        node.flags.collapsed ? this.round_radius : 0
                    );
                }
                ctx.fill();
                ctx.shadowColor = "transparent";
            }

            //title box
            var box_size = 10;
            if (node.onDrawTitleBox) {
                node.onDrawTitleBox(ctx, title_height, size, this.ds.scale);
            } else if (
                shape == LiteGraph.ROUND_SHAPE ||
                shape == LiteGraph.CIRCLE_SHAPE ||
                shape == LiteGraph.CARD_SHAPE
            ) {
                if (low_quality) {
                    ctx.fillStyle = "black";
                    ctx.beginPath();
                    ctx.arc(
                        title_height * 0.5,
                        title_height * -0.5,
                        box_size * 0.5 + 1,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }

                ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
				if(low_quality)
					ctx.fillRect( title_height * 0.5 - box_size *0.5, title_height * -0.5 - box_size *0.5, box_size , box_size  );
				else
				{
					ctx.beginPath();
					ctx.arc(
						title_height * 0.5,
						title_height * -0.5,
						box_size * 0.5,
						0,
						Math.PI * 2
					);
					ctx.fill();
				}
            } else {
                if (low_quality) {
                    ctx.fillStyle = "black";
                    ctx.fillRect(
                        (title_height - box_size) * 0.5 - 1,
                        (title_height + box_size) * -0.5 - 1,
                        box_size + 2,
                        box_size + 2
                    );
                }
                ctx.fillStyle = node.boxcolor || LiteGraph.NODE_DEFAULT_BOXCOLOR;
                ctx.fillRect(
                    (title_height - box_size) * 0.5,
                    (title_height + box_size) * -0.5,
                    box_size,
                    box_size
                );
            }
            ctx.globalAlpha = old_alpha;

            //title text
            if (node.onDrawTitleText) {
                node.onDrawTitleText(
                    ctx,
                    title_height,
                    size,
                    this.ds.scale,
                    this.title_text_font,
                    selected
                );
            }
            if (!low_quality) {
                ctx.font = this.title_text_font;
                var title = String(node.getTitle());
                if (title) {
                    if (selected) {
                        ctx.fillStyle = LiteGraph.NODE_SELECTED_TITLE_COLOR;
                    } else {
                        ctx.fillStyle =
                            node.constructor.title_text_color ||
                            this.node_title_color;
                    }
                    if (node.flags.collapsed) {
                        ctx.textAlign = "left";
                        var measure = ctx.measureText(title);
                        ctx.fillText(
                            title.substr(0,20), //avoid urls too long
                            title_height,// + measure.width * 0.5,
                            LiteGraph.NODE_TITLE_TEXT_Y - title_height
                        );
                        ctx.textAlign = "left";
                    } else {
                        ctx.textAlign = "left";
                        ctx.fillText(
                            title,
                            title_height,
                            LiteGraph.NODE_TITLE_TEXT_Y - title_height
                        );
                    }
                }
            }

			//subgraph box
			if (!node.flags.collapsed && node.subgraph && !node.skip_subgraph_button) {
				var w = LiteGraph.NODE_TITLE_HEIGHT;
				var x = node.size[0] - w;
				var over = LiteGraph.isInsideRectangle( this.graph_mouse[0] - node.pos[0], this.graph_mouse[1] - node.pos[1], x+2, -w+2, w-4, w-4 );
				ctx.fillStyle = over ? "#888" : "#555";
				if( shape == LiteGraph.BOX_SHAPE || low_quality)
					ctx.fillRect(x+2, -w+2, w-4, w-4);
				else
				{
					ctx.beginPath();
					ctx.roundRect(x+2, -w+2, w-4, w-4,4);
					ctx.fill();
				}
				ctx.fillStyle = "#333";
				ctx.beginPath();
				ctx.moveTo(x + w * 0.2, -w * 0.6);
				ctx.lineTo(x + w * 0.8, -w * 0.6);
				ctx.lineTo(x + w * 0.5, -w * 0.3);
				ctx.fill();
			}

			//custom title render
            if (node.onDrawTitle) {
                node.onDrawTitle(ctx);
            }
        }

        //render selection marker
        if (selected) {
            if (node.onBounding) {
                node.onBounding(area);
            }

            if (title_mode == LiteGraph.TRANSPARENT_TITLE) {
                area[1] -= title_height;
                area[3] += title_height;
            }
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            if (shape == LiteGraph.BOX_SHAPE) {
                ctx.rect(
                    -6 + area[0],
                    -6 + area[1],
                    12 + area[2],
                    12 + area[3]
                );
            } else if (
                shape == LiteGraph.ROUND_SHAPE ||
                (shape == LiteGraph.CARD_SHAPE && node.flags.collapsed)
            ) {
                ctx.roundRect(
                    -6 + area[0],
                    -6 + area[1],
                    12 + area[2],
                    12 + area[3],
                    this.round_radius * 2
                );
            } else if (shape == LiteGraph.CARD_SHAPE) {
                ctx.roundRect(
                    -6 + area[0],
                    -6 + area[1],
                    12 + area[2],
                    12 + area[3],
                    this.round_radius * 2,
                    2
                );
            } else if (shape == LiteGraph.CIRCLE_SHAPE) {
                ctx.arc(
                    size[0] * 0.5,
                    size[1] * 0.5,
                    size[0] * 0.5 + 6,
                    0,
                    Math.PI * 2
                );
            }
            ctx.strokeStyle = LiteGraph.NODE_BOX_OUTLINE_COLOR;
            ctx.stroke();
            ctx.strokeStyle = fgcolor;
            ctx.globalAlpha = 1;
        }
    };

    var margin_area = new Float32Array(4);
    var link_bounding = new Float32Array(4);
    var tempA = new Float32Array(2);
    var tempB = new Float32Array(2);

    /**
     * draws every connection visible in the canvas
     * OPTIMIZE THIS: pre-catch connections position instead of recomputing them every time
     * @method drawConnections
     **/
    LGraphCanvas.prototype.drawConnections = function(ctx) {
        var now = LiteGraph.getTime();
        var visible_area = this.visible_area;
        margin_area[0] = visible_area[0] - 20;
        margin_area[1] = visible_area[1] - 20;
        margin_area[2] = visible_area[2] + 40;
        margin_area[3] = visible_area[3] + 40;

        //draw connections
        ctx.lineWidth = this.connections_width;

        ctx.fillStyle = "#AAA";
        ctx.strokeStyle = "#AAA";
        ctx.globalAlpha = this.editor_alpha;
        //for every node
        var nodes = this.graph._nodes;
        for (var n = 0, l = nodes.length; n < l; ++n) {
            var node = nodes[n];
            //for every input (we render just inputs because it is easier as every slot can only have one input)
            if (!node.inputs || !node.inputs.length) {
                continue;
            }

            for (var i = 0; i < node.inputs.length; ++i) {
                var input = node.inputs[i];
                if (!input || input.link == null) {
                    continue;
                }
                var link_id = input.link;
                var link = this.graph.links[link_id];
                if (!link) {
                    continue;
                }

                //find link info
                var start_node = this.graph.getNodeById(link.origin_id);
                if (start_node == null) {
                    continue;
                }
                var start_node_slot = link.origin_slot;
                var start_node_slotpos = null;
                if (start_node_slot == -1) {
                    start_node_slotpos = [
                        start_node.pos[0] + 10,
                        start_node.pos[1] + 10
                    ];
                } else {
                    start_node_slotpos = start_node.getConnectionPos(
                        false,
                        start_node_slot,
                        tempA
                    );
                }
                var end_node_slotpos = node.getConnectionPos(true, i, tempB);

                //compute link bounding
                link_bounding[0] = start_node_slotpos[0];
                link_bounding[1] = start_node_slotpos[1];
                link_bounding[2] = end_node_slotpos[0] - start_node_slotpos[0];
                link_bounding[3] = end_node_slotpos[1] - start_node_slotpos[1];
                if (link_bounding[2] < 0) {
                    link_bounding[0] += link_bounding[2];
                    link_bounding[2] = Math.abs(link_bounding[2]);
                }
                if (link_bounding[3] < 0) {
                    link_bounding[1] += link_bounding[3];
                    link_bounding[3] = Math.abs(link_bounding[3]);
                }

                //skip links outside of the visible area of the canvas
                if (!overlapBounding(link_bounding, margin_area)) {
                    continue;
                }

                var start_slot = start_node.outputs[start_node_slot];
                var end_slot = node.inputs[i];
                if (!start_slot || !end_slot) {
                    continue;
                }
                var start_dir =
                    start_slot.dir ||
                    (start_node.horizontal ? LiteGraph.DOWN : LiteGraph.RIGHT);
                var end_dir =
                    end_slot.dir ||
                    (node.horizontal ? LiteGraph.UP : LiteGraph.LEFT);

                this.renderLink(
                    ctx,
                    start_node_slotpos,
                    end_node_slotpos,
                    link,
                    false,
                    0,
                    null,
                    start_dir,
                    end_dir
                );

                //event triggered rendered on top
                if (link && link._last_time && now - link._last_time < 1000) {
                    var f = 2.0 - (now - link._last_time) * 0.002;
                    var tmp = ctx.globalAlpha;
                    ctx.globalAlpha = tmp * f;
                    this.renderLink(
                        ctx,
                        start_node_slotpos,
                        end_node_slotpos,
                        link,
                        true,
                        f,
                        "white",
                        start_dir,
                        end_dir
                    );
                    ctx.globalAlpha = tmp;
                }
            }
        }
        ctx.globalAlpha = 1;
    };

    /**
     * draws a link between two points
     * @method renderLink
     * @param {vec2} a start pos
     * @param {vec2} b end pos
     * @param {Object} link the link object with all the link info
     * @param {boolean} skip_border ignore the shadow of the link
     * @param {boolean} flow show flow animation (for events)
     * @param {string} color the color for the link
     * @param {number} start_dir the direction enum
     * @param {number} end_dir the direction enum
     * @param {number} num_sublines number of sublines (useful to represent vec3 or rgb)
     **/
    LGraphCanvas.prototype.renderLink = function(
        ctx,
        a,
        b,
        link,
        skip_border,
        flow,
        color,
        start_dir,
        end_dir,
        num_sublines
    ) {
        if (link) {
            this.visible_links.push(link);
        }

        //choose color
        if (!color && link) {
            color = link.color || LGraphCanvas.link_type_colors[link.type];
        }
        if (!color) {
            color = this.default_link_color;
        }
        if (link != null && this.highlighted_links[link.id]) {
            color = "#FFF";
        }

        start_dir = start_dir || LiteGraph.RIGHT;
        end_dir = end_dir || LiteGraph.LEFT;

        var dist = distance(a, b);

        if (this.render_connections_border && this.ds.scale > 0.6) {
            ctx.lineWidth = this.connections_width + 4;
        }
        ctx.lineJoin = "round";
        num_sublines = num_sublines || 1;
        if (num_sublines > 1) {
            ctx.lineWidth = 0.5;
        }

        //begin line shape
        ctx.beginPath();
        for (var i = 0; i < num_sublines; i += 1) {
            var offsety = (i - (num_sublines - 1) * 0.5) * 5;

            if (this.links_render_mode == LiteGraph.SPLINE_LINK) {
                ctx.moveTo(a[0], a[1] + offsety);
                var start_offset_x = 0;
                var start_offset_y = 0;
                var end_offset_x = 0;
                var end_offset_y = 0;
                switch (start_dir) {
                    case LiteGraph.LEFT:
                        start_offset_x = dist * -0.25;
                        break;
                    case LiteGraph.RIGHT:
                        start_offset_x = dist * 0.25;
                        break;
                    case LiteGraph.UP:
                        start_offset_y = dist * -0.25;
                        break;
                    case LiteGraph.DOWN:
                        start_offset_y = dist * 0.25;
                        break;
                }
                switch (end_dir) {
                    case LiteGraph.LEFT:
                        end_offset_x = dist * -0.25;
                        break;
                    case LiteGraph.RIGHT:
                        end_offset_x = dist * 0.25;
                        break;
                    case LiteGraph.UP:
                        end_offset_y = dist * -0.25;
                        break;
                    case LiteGraph.DOWN:
                        end_offset_y = dist * 0.25;
                        break;
                }
                ctx.bezierCurveTo(
                    a[0] + start_offset_x,
                    a[1] + start_offset_y + offsety,
                    b[0] + end_offset_x,
                    b[1] + end_offset_y + offsety,
                    b[0],
                    b[1] + offsety
                );
            } else if (this.links_render_mode == LiteGraph.LINEAR_LINK) {
                ctx.moveTo(a[0], a[1] + offsety);
                var start_offset_x = 0;
                var start_offset_y = 0;
                var end_offset_x = 0;
                var end_offset_y = 0;
                switch (start_dir) {
                    case LiteGraph.LEFT:
                        start_offset_x = -1;
                        break;
                    case LiteGraph.RIGHT:
                        start_offset_x = 1;
                        break;
                    case LiteGraph.UP:
                        start_offset_y = -1;
                        break;
                    case LiteGraph.DOWN:
                        start_offset_y = 1;
                        break;
                }
                switch (end_dir) {
                    case LiteGraph.LEFT:
                        end_offset_x = -1;
                        break;
                    case LiteGraph.RIGHT:
                        end_offset_x = 1;
                        break;
                    case LiteGraph.UP:
                        end_offset_y = -1;
                        break;
                    case LiteGraph.DOWN:
                        end_offset_y = 1;
                        break;
                }
                var l = 15;
                ctx.lineTo(
                    a[0] + start_offset_x * l,
                    a[1] + start_offset_y * l + offsety
                );
                ctx.lineTo(
                    b[0] + end_offset_x * l,
                    b[1] + end_offset_y * l + offsety
                );
                ctx.lineTo(b[0], b[1] + offsety);
            } else if (this.links_render_mode == LiteGraph.STRAIGHT_LINK) {
                ctx.moveTo(a[0], a[1]);
                var start_x = a[0];
                var start_y = a[1];
                var end_x = b[0];
                var end_y = b[1];
                if (start_dir == LiteGraph.RIGHT) {
                    start_x += 10;
                } else {
                    start_y += 10;
                }
                if (end_dir == LiteGraph.LEFT) {
                    end_x -= 10;
                } else {
                    end_y -= 10;
                }
                ctx.lineTo(start_x, start_y);
                ctx.lineTo((start_x + end_x) * 0.5, start_y);
                ctx.lineTo((start_x + end_x) * 0.5, end_y);
                ctx.lineTo(end_x, end_y);
                ctx.lineTo(b[0], b[1]);
            } else {
                return;
            } //unknown
        }

        //rendering the outline of the connection can be a little bit slow
        if (
            this.render_connections_border &&
            this.ds.scale > 0.6 &&
            !skip_border
        ) {
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.stroke();
        }

        ctx.lineWidth = this.connections_width;
        ctx.fillStyle = ctx.strokeStyle = color;
        ctx.stroke();
        //end line shape

        var pos = this.computeConnectionPoint(a, b, 0.5, start_dir, end_dir);
        if (link && link._pos) {
            link._pos[0] = pos[0];
            link._pos[1] = pos[1];
        }

        //render arrow in the middle
        if (
            this.ds.scale >= 0.6 &&
            this.highquality_render &&
            end_dir != LiteGraph.CENTER
        ) {
            //render arrow
            if (this.render_connection_arrows) {
                //compute two points in the connection
                var posA = this.computeConnectionPoint(
                    a,
                    b,
                    0.25,
                    start_dir,
                    end_dir
                );
                var posB = this.computeConnectionPoint(
                    a,
                    b,
                    0.26,
                    start_dir,
                    end_dir
                );
                var posC = this.computeConnectionPoint(
                    a,
                    b,
                    0.75,
                    start_dir,
                    end_dir
                );
                var posD = this.computeConnectionPoint(
                    a,
                    b,
                    0.76,
                    start_dir,
                    end_dir
                );

                //compute the angle between them so the arrow points in the right direction
                var angleA = 0;
                var angleB = 0;
                if (this.render_curved_connections) {
                    angleA = -Math.atan2(posB[0] - posA[0], posB[1] - posA[1]);
                    angleB = -Math.atan2(posD[0] - posC[0], posD[1] - posC[1]);
                } else {
                    angleB = angleA = b[1] > a[1] ? 0 : Math.PI;
                }

                //render arrow
                ctx.save();
                ctx.translate(posA[0], posA[1]);
                ctx.rotate(angleA);
                ctx.beginPath();
                ctx.moveTo(-5, -3);
                ctx.lineTo(0, +7);
                ctx.lineTo(+5, -3);
                ctx.fill();
                ctx.restore();
                ctx.save();
                ctx.translate(posC[0], posC[1]);
                ctx.rotate(angleB);
                ctx.beginPath();
                ctx.moveTo(-5, -3);
                ctx.lineTo(0, +7);
                ctx.lineTo(+5, -3);
                ctx.fill();
                ctx.restore();
            }

            //circle
            ctx.beginPath();
            ctx.arc(pos[0], pos[1], 5, 0, Math.PI * 2);
            ctx.fill();
        }

        //render flowing points
        if (flow) {
            ctx.fillStyle = color;
            for (var i = 0; i < 5; ++i) {
                var f = (LiteGraph.getTime() * 0.001 + i * 0.2) % 1;
                var pos = this.computeConnectionPoint(
                    a,
                    b,
                    f,
                    start_dir,
                    end_dir
                );
                ctx.beginPath();
                ctx.arc(pos[0], pos[1], 5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    };

    //returns the link center point based on curvature
    LGraphCanvas.prototype.computeConnectionPoint = function(
        a,
        b,
        t,
        start_dir,
        end_dir
    ) {
        start_dir = start_dir || LiteGraph.RIGHT;
        end_dir = end_dir || LiteGraph.LEFT;

        var dist = distance(a, b);
        var p0 = a;
        var p1 = [a[0], a[1]];
        var p2 = [b[0], b[1]];
        var p3 = b;

        switch (start_dir) {
            case LiteGraph.LEFT:
                p1[0] += dist * -0.25;
                break;
            case LiteGraph.RIGHT:
                p1[0] += dist * 0.25;
                break;
            case LiteGraph.UP:
                p1[1] += dist * -0.25;
                break;
            case LiteGraph.DOWN:
                p1[1] += dist * 0.25;
                break;
        }
        switch (end_dir) {
            case LiteGraph.LEFT:
                p2[0] += dist * -0.25;
                break;
            case LiteGraph.RIGHT:
                p2[0] += dist * 0.25;
                break;
            case LiteGraph.UP:
                p2[1] += dist * -0.25;
                break;
            case LiteGraph.DOWN:
                p2[1] += dist * 0.25;
                break;
        }

        var c1 = (1 - t) * (1 - t) * (1 - t);
        var c2 = 3 * ((1 - t) * (1 - t)) * t;
        var c3 = 3 * (1 - t) * (t * t);
        var c4 = t * t * t;

        var x = c1 * p0[0] + c2 * p1[0] + c3 * p2[0] + c4 * p3[0];
        var y = c1 * p0[1] + c2 * p1[1] + c3 * p2[1] + c4 * p3[1];
        return [x, y];
    };

    LGraphCanvas.prototype.drawExecutionOrder = function(ctx) {
        ctx.shadowColor = "transparent";
        ctx.globalAlpha = 0.25;

        ctx.textAlign = "center";
        ctx.strokeStyle = "white";
        ctx.globalAlpha = 0.75;

        var visible_nodes = this.visible_nodes;
        for (var i = 0; i < visible_nodes.length; ++i) {
            var node = visible_nodes[i];
            ctx.fillStyle = "black";
            ctx.fillRect(
                node.pos[0] - LiteGraph.NODE_TITLE_HEIGHT,
                node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT,
                LiteGraph.NODE_TITLE_HEIGHT,
                LiteGraph.NODE_TITLE_HEIGHT
            );
            if (node.order == 0) {
                ctx.strokeRect(
                    node.pos[0] - LiteGraph.NODE_TITLE_HEIGHT + 0.5,
                    node.pos[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5,
                    LiteGraph.NODE_TITLE_HEIGHT,
                    LiteGraph.NODE_TITLE_HEIGHT
                );
            }
            ctx.fillStyle = "#FFF";
            ctx.fillText(
                node.order,
                node.pos[0] + LiteGraph.NODE_TITLE_HEIGHT * -0.5,
                node.pos[1] - 6
            );
        }
        ctx.globalAlpha = 1;
    };

    /**
     * draws the widgets stored inside a node
     * @method drawNodeWidgets
     **/
    LGraphCanvas.prototype.drawNodeWidgets = function(
        node,
        posY,
        ctx,
        active_widget
    ) {
        if (!node.widgets || !node.widgets.length) {
            return 0;
        }
        var width = node.size[0];
        var widgets = node.widgets;
        posY += 2;
        var H = LiteGraph.NODE_WIDGET_HEIGHT;
        var show_text = this.ds.scale > 0.5;
        ctx.save();
        ctx.globalAlpha = this.editor_alpha;
        var outline_color = LiteGraph.WIDGET_OUTLINE_COLOR;
        var background_color = LiteGraph.WIDGET_BGCOLOR;
        var text_color = LiteGraph.WIDGET_TEXT_COLOR;
		var secondary_text_color = LiteGraph.WIDGET_SECONDARY_TEXT_COLOR;
        var margin = 15;

        for (var i = 0; i < widgets.length; ++i) {
            var w = widgets[i];
            var y = posY;
            if (w.y) {
                y = w.y;
            }
            w.last_y = y;
            ctx.strokeStyle = outline_color;
            ctx.fillStyle = "#222";
            ctx.textAlign = "left";
			if(w.disabled)
				ctx.globalAlpha *= 0.5;
			var widget_width = w.width || width;

            switch (w.type) {
                case "button":
                    if (w.clicked) {
                        ctx.fillStyle = "#AAA";
                        w.clicked = false;
                        this.dirty_canvas = true;
                    }
                    ctx.fillRect(margin, y, widget_width - margin * 2, H);
					if(show_text && !w.disabled)
	                    ctx.strokeRect( margin, y, widget_width - margin * 2, H );
                    if (show_text) {
                        ctx.textAlign = "center";
                        ctx.fillStyle = text_color;
                        ctx.fillText(w.name, widget_width * 0.5, y + H * 0.7);
                    }
                    break;
                case "toggle":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
                    if (show_text)
	                    ctx.roundRect(margin, posY, widget_width - margin * 2, H, H * 0.5);
					else
	                    ctx.rect(margin, posY, widget_width - margin * 2, H );
                    ctx.fill();
					if(show_text && !w.disabled)
	                    ctx.stroke();
                    ctx.fillStyle = w.value ? "#89A" : "#333";
                    ctx.beginPath();
                    ctx.arc( widget_width - margin * 2, y + H * 0.5, H * 0.36, 0, Math.PI * 2 );
                    ctx.fill();
                    if (show_text) {
                        ctx.fillStyle = secondary_text_color;
                        if (w.name != null) {
                            ctx.fillText(w.name, margin * 2, y + H * 0.7);
                        }
                        ctx.fillStyle = w.value ? text_color : secondary_text_color;
                        ctx.textAlign = "right";
                        ctx.fillText(
                            w.value
                                ? w.options.on || "true"
                                : w.options.off || "false",
                            widget_width - 40,
                            y + H * 0.7
                        );
                    }
                    break;
                case "slider":
                    ctx.fillStyle = background_color;
                    ctx.fillRect(margin, y, widget_width - margin * 2, H);
                    var range = w.options.max - w.options.min;
                    var nvalue = (w.value - w.options.min) / range;
                    ctx.fillStyle = active_widget == w ? "#89A" : "#678";
                    ctx.fillRect(margin, y, nvalue * (widget_width - margin * 2), H);
					if(show_text && !w.disabled)
	                    ctx.strokeRect(margin, y, widget_width - margin * 2, H);
                    if (w.marker) {
                        var marker_nvalue = (w.marker - w.options.min) / range;
                        ctx.fillStyle = "#AA9";
                        ctx.fillRect( margin + marker_nvalue * (widget_width - margin * 2), y, 2, H );
                    }
                    if (show_text) {
                        ctx.textAlign = "center";
                        ctx.fillStyle = text_color;
                        ctx.fillText(
                            w.name + "  " + Number(w.value).toFixed(3),
                            widget_width * 0.5,
                            y + H * 0.7
                        );
                    }
                    break;
                case "number":
                case "combo":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
					if(show_text)
	                    ctx.roundRect(margin, posY, widget_width - margin * 2, H, H * 0.5);
					else
	                    ctx.rect(margin, posY, widget_width - margin * 2, H );
                    ctx.fill();
                    if (show_text) {
						if(!w.disabled)
		                    ctx.stroke();
                        ctx.fillStyle = text_color;
						if(!w.disabled)
						{
							ctx.beginPath();
							ctx.moveTo(margin + 16, posY + 5);
							ctx.lineTo(margin + 6, posY + H * 0.5);
							ctx.lineTo(margin + 16, posY + H - 5);
							ctx.fill();
							ctx.beginPath();
							ctx.moveTo(widget_width - margin - 16, posY + 5);
							ctx.lineTo(widget_width - margin - 6, posY + H * 0.5);
							ctx.lineTo(widget_width - margin - 16, posY + H - 5);
							ctx.fill();
						}
                        ctx.fillStyle = secondary_text_color;
                        ctx.fillText(w.name, margin * 2 + 5, y + H * 0.7);
                        ctx.fillStyle = text_color;
                        ctx.textAlign = "right";
                        if (w.type == "number") {
                            ctx.fillText(
                                Number(w.value).toFixed(
                                    w.options.precision !== undefined
                                        ? w.options.precision
                                        : 3
                                ),
                                widget_width - margin * 2 - 20,
                                y + H * 0.7
                            );
                        } else {
							var v = w.value;
							if( w.options.values )
							{
								var values = w.options.values;
								if( values.constructor === Function )
									values = values();
								if(values && values.constructor !== Array)
									v = values[ w.value ];
							}
                            ctx.fillText(
                                v,
                                widget_width - margin * 2 - 20,
                                y + H * 0.7
                            );
                        }
                    }
                    break;
                case "string":
                case "text":
                    ctx.textAlign = "left";
                    ctx.strokeStyle = outline_color;
                    ctx.fillStyle = background_color;
                    ctx.beginPath();
                    if (show_text)
	                    ctx.roundRect(margin, posY, widget_width - margin * 2, H, H * 0.5);
					else
	                    ctx.rect( margin, posY, widget_width - margin * 2, H );
                    ctx.fill();
                    if (show_text) {
						ctx.save();
						ctx.beginPath();
						ctx.rect(margin, posY, widget_width - margin * 2, H);
						ctx.clip();

	                    ctx.stroke();
                        ctx.fillStyle = secondary_text_color;
                        if (w.name != null) {
                            ctx.fillText(w.name, margin * 2, y + H * 0.7);
                        }
                        ctx.fillStyle = text_color;
                        ctx.textAlign = "right";
                        ctx.fillText(String(w.value).substr(0,30), widget_width - margin * 2, y + H * 0.7); //30 chars max
						ctx.restore();
                    }
                    break;
                default:
                    if (w.draw) {
                        w.draw(ctx, node, widget_width, y, H);
                    }
                    break;
            }
            posY += (w.computeSize ? w.computeSize(widget_width)[1] : H) + 4;
			ctx.globalAlpha = this.editor_alpha;

        }
        ctx.restore();
		ctx.textAlign = "left";
    };

    /**
     * process an event on widgets
     * @method processNodeWidgets
     **/
    LGraphCanvas.prototype.processNodeWidgets = function(
        node,
        pos,
        event,
        active_widget
    ) {
        if (!node.widgets || !node.widgets.length) {
            return null;
        }

        var x = pos[0] - node.pos[0];
        var y = pos[1] - node.pos[1];
        var width = node.size[0];
        var that = this;
        var ref_window = this.getCanvasWindow();

        for (var i = 0; i < node.widgets.length; ++i) {
            var w = node.widgets[i];
			if(!w || w.disabled)
				continue;
			var widget_height = w.computeSize ? w.computeSize(width)[1] : LiteGraph.NODE_WIDGET_HEIGHT;
			var widget_width = w.width || width;
			//outside
			if ( w != active_widget && 
				(x < 6 || x > widget_width - 12 || y < w.last_y || y > w.last_y + widget_height) ) 
				continue;

			var old_value = w.value;

            //if ( w == active_widget || (x > 6 && x < widget_width - 12 && y > w.last_y && y < w.last_y + widget_height) ) {
			//inside widget
			switch (w.type) {
				case "button":
					if (event.type === "mousemove") {
						break;
					}
					if (w.callback) {
						setTimeout(function() {
							w.callback(w, that, node, pos, event);
						}, 20);
					}
					w.clicked = true;
					this.dirty_canvas = true;
					break;
				case "slider":
					var range = w.options.max - w.options.min;
					var nvalue = Math.clamp((x - 10) / (widget_width - 20), 0, 1);
					w.value =
						w.options.min +
						(w.options.max - w.options.min) * nvalue;
					if (w.callback) {
						setTimeout(function() {
							inner_value_change(w, w.value);
						}, 20);
					}
					this.dirty_canvas = true;
					break;
				case "number":
				case "combo":
					var old_value = w.value;
					if (event.type == "mousemove" && w.type == "number") {
						w.value += event.deltaX * 0.1 * (w.options.step || 1);
						if ( w.options.min != null && w.value < w.options.min ) {
							w.value = w.options.min;
						}
						if ( w.options.max != null && w.value > w.options.max ) {
							w.value = w.options.max;
						}
					} else if (event.type == "mousedown") {
						var values = w.options.values;
						if (values && values.constructor === Function) {
							values = w.options.values(w, node);
						}
						var values_list = null;
						
						if( w.type != "number")
							values_list = values.constructor === Array ? values : Object.keys(values);

						var delta = x < 40 ? -1 : x > widget_width - 40 ? 1 : 0;
						if (w.type == "number") {
							w.value += delta * 0.1 * (w.options.step || 1);
							if ( w.options.min != null && w.value < w.options.min ) {
								w.value = w.options.min;
							}
							if ( w.options.max != null && w.value > w.options.max ) {
								w.value = w.options.max;
							}
						} else if (delta) { //clicked in arrow, used for combos 
							var index = -1;
							this.last_mouseclick = 0; //avoids dobl click event
							if(values.constructor === Object)
								index = values_list.indexOf( String( w.value ) ) + delta;
							else
								index = values_list.indexOf( w.value ) + delta;
							if (index >= values_list.length) {
								index = values_list.length - 1;
							}
							if (index < 0) {
								index = 0;
							}
							if( values.constructor === Array )
								w.value = values[index];
							else
								w.value = index;
						} else { //combo clicked 
							var text_values = values != values_list ? Object.values(values) : values;
							var menu = new LiteGraph.ContextMenu(text_values, {
									scale: Math.max(1, this.ds.scale),
									event: event,
									className: "dark",
									callback: inner_clicked.bind(w)
								},
								ref_window);
							function inner_clicked(v, option, event) {
								if(values != values_list)
									v = text_values.indexOf(v);
								this.value = v;
								inner_value_change(this, v);
								that.dirty_canvas = true;
								return false;
							}
						}
					} //end mousedown
					else if(event.type == "mouseup" && w.type == "number")
					{
						var delta = x < 40 ? -1 : x > widget_width - 40 ? 1 : 0;
						if (event.click_time < 200 && delta == 0) {
							this.prompt("Value",w.value,function(v) {
									this.value = Number(v);
									inner_value_change(this, this.value);
								}.bind(w),
								event);
						}
					}

					if( old_value != w.value )
						setTimeout(
							function() {
								inner_value_change(this, this.value);
							}.bind(w),
							20
						);
					this.dirty_canvas = true;
					break;
				case "toggle":
					if (event.type == "mousedown") {
						w.value = !w.value;
						setTimeout(function() {
							inner_value_change(w, w.value);
						}, 20);
					}
					break;
				case "string":
				case "text":
					if (event.type == "mousedown") {
						this.prompt("Value",w.value,function(v) {
								this.value = v;
								inner_value_change(this, v);
							}.bind(w),
							event);
					}
					break;
				default:
					if (w.mouse) {
						this.dirty_canvas = w.mouse(event, [x, y], node);
					}
					break;
			} //end switch

			//value changed
			if( old_value != w.value )
			{
				if(node.onWidgetChanged)
					node.onWidgetChanged( w.name,w.value,old_value,w );
                node.graph._version++;
			}

			return w;
        }//end for

        function inner_value_change(widget, value) {
            widget.value = value;
            if ( widget.options && widget.options.property && node.properties[widget.options.property] !== undefined ) {
                node.setProperty( widget.options.property, value );
            }
            if (widget.callback) {
                widget.callback(widget.value, that, node, pos, event);
            }
        }

        return null;
    };

    /**
     * draws every group area in the background
     * @method drawGroups
     **/
    LGraphCanvas.prototype.drawGroups = function(canvas, ctx) {
        if (!this.graph) {
            return;
        }

        var groups = this.graph._groups;

        ctx.save();
        ctx.globalAlpha = 0.5 * this.editor_alpha;

        for (var i = 0; i < groups.length; ++i) {
            var group = groups[i];

            if (!overlapBounding(this.visible_area, group._bounding)) {
                continue;
            } //out of the visible area

            ctx.fillStyle = group.color || "#335";
            ctx.strokeStyle = group.color || "#335";
            var pos = group._pos;
            var size = group._size;
            ctx.globalAlpha = 0.25 * this.editor_alpha;
            ctx.beginPath();
            ctx.rect(pos[0] + 0.5, pos[1] + 0.5, size[0], size[1]);
            ctx.fill();
            ctx.globalAlpha = this.editor_alpha;
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pos[0] + size[0], pos[1] + size[1]);
            ctx.lineTo(pos[0] + size[0] - 10, pos[1] + size[1]);
            ctx.lineTo(pos[0] + size[0], pos[1] + size[1] - 10);
            ctx.fill();

            var font_size =
                group.font_size || LiteGraph.DEFAULT_GROUP_FONT_SIZE;
            ctx.font = font_size + "px Arial";
            ctx.fillText(group.title, pos[0] + 4, pos[1] + font_size);
        }

        ctx.restore();
    };

    LGraphCanvas.prototype.adjustNodesSize = function() {
        var nodes = this.graph._nodes;
        for (var i = 0; i < nodes.length; ++i) {
            nodes[i].size = nodes[i].computeSize();
        }
        this.setDirty(true, true);
    };

    /**
     * resizes the canvas to a given size, if no size is passed, then it tries to fill the parentNode
     * @method resize
     **/
    LGraphCanvas.prototype.resize = function(width, height) {
        if (!width && !height) {
            var parent = this.canvas.parentNode;
            width = parent.offsetWidth;
            height = parent.offsetHeight;
        }

        if (this.canvas.width == width && this.canvas.height == height) {
            return;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.bgcanvas.width = this.canvas.width;
        this.bgcanvas.height = this.canvas.height;
        this.setDirty(true, true);
    };

    /**
     * switches to live mode (node shapes are not rendered, only the content)
     * this feature was designed when graphs where meant to create user interfaces
     * @method switchLiveMode
     **/
    LGraphCanvas.prototype.switchLiveMode = function(transition) {
        if (!transition) {
            this.live_mode = !this.live_mode;
            this.dirty_canvas = true;
            this.dirty_bgcanvas = true;
            return;
        }

        var self = this;
        var delta = this.live_mode ? 1.1 : 0.9;
        if (this.live_mode) {
            this.live_mode = false;
            this.editor_alpha = 0.1;
        }

        var t = setInterval(function() {
            self.editor_alpha *= delta;
            self.dirty_canvas = true;
            self.dirty_bgcanvas = true;

            if (delta < 1 && self.editor_alpha < 0.01) {
                clearInterval(t);
                if (delta < 1) {
                    self.live_mode = true;
                }
            }
            if (delta > 1 && self.editor_alpha > 0.99) {
                clearInterval(t);
                self.editor_alpha = 1;
            }
        }, 1);
    };

    LGraphCanvas.prototype.onNodeSelectionChange = function(node) {
        return; //disabled
    };

    LGraphCanvas.prototype.touchHandler = function(event) {
        //alert("foo");
        var touches = event.changedTouches,
            first = touches[0],
            type = "";

        switch (event.type) {
            case "touchstart":
                type = "mousedown";
                break;
            case "touchmove":
                type = "mousemove";
                break;
            case "touchend":
                type = "mouseup";
                break;
            default:
                return;
        }

        //initMouseEvent(type, canBubble, cancelable, view, clickCount,
        //           screenX, screenY, clientX, clientY, ctrlKey,
        //           altKey, shiftKey, metaKey, button, relatedTarget);

        var window = this.getCanvasWindow();
        var document = window.document;

        var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent(
            type,
            true,
            true,
            window,
            1,
            first.screenX,
            first.screenY,
            first.clientX,
            first.clientY,
            false,
            false,
            false,
            false,
            0 /*left*/,
            null
        );
        first.target.dispatchEvent(simulatedEvent);
        event.preventDefault();
    };

    /* CONTEXT MENU ********************/

    LGraphCanvas.onGroupAdd = function(info, entry, mouse_event) {
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        var group = new LiteGraph.LGraphGroup();
        group.pos = canvas.convertEventToCanvasOffset(mouse_event);
        canvas.graph.add(group);
    };

    LGraphCanvas.onMenuAdd = function(node, options, e, prev_menu, callback) {
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();
		var graph = canvas.graph;
		if(!graph)
			return;

        var values = LiteGraph.getNodeTypesCategories( canvas.filter || graph.filter );
        var entries = [];
        for (var i=0; i < values.length; i++) {
            if (values[i]) {
				var name = values[i];
				if(name.indexOf("::") != -1) //in case it has a namespace like "shader::math/rand" it hides the namespace
					name = name.split("::")[1];
                entries.push({ value: values[i], content: name, has_submenu: true });
            }
        }

        //show categories
        var menu = new LiteGraph.ContextMenu( entries, { event: e, callback: inner_clicked, parentMenu: prev_menu }, ref_window );

        function inner_clicked(v, option, e) {
            var category = v.value;
            var node_types = LiteGraph.getNodeTypesInCategory( category, canvas.filter || graph.filter );
            var values = [];
            for (var i=0; i < node_types.length; i++) {
                if (!node_types[i].skip_list) {
                    values.push({
                        content: node_types[i].title,
                        value: node_types[i].type
                    });
                }
            }

            new LiteGraph.ContextMenu( values, { event: e, callback: inner_create, parentMenu: menu }, ref_window );
            return false;
        }

        function inner_create(v, e) {
            var first_event = prev_menu.getFirstEvent();
			canvas.graph.beforeChange();
            var node = LiteGraph.createNode(v.value);
            if (node) {
                node.pos = canvas.convertEventToCanvasOffset(first_event);
                canvas.graph.add(node);
            }
			if(callback)
				callback(node);
			canvas.graph.afterChange();
        }

        return false;
    };

    LGraphCanvas.onMenuCollapseAll = function() {};

    LGraphCanvas.onMenuNodeEdit = function() {};

    LGraphCanvas.showMenuNodeOptionalInputs = function(
        v,
        options,
        e,
        prev_menu,
        node
    ) {
        if (!node) {
            return;
        }

        var that = this;
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        var options = node.optional_inputs;
        if (node.onGetInputs) {
            options = node.onGetInputs();
        }

        var entries = [];
        if (options) {
            for (var i=0; i < options.length; i++) {
                var entry = options[i];
                if (!entry) {
                    entries.push(null);
                    continue;
                }
                var label = entry[0];
                if (entry[2] && entry[2].label) {
                    label = entry[2].label;
                }
                var data = { content: label, value: entry };
                if (entry[1] == LiteGraph.ACTION) {
                    data.className = "event";
                }
                entries.push(data);
            }
        }

        if (this.onMenuNodeInputs) {
            entries = this.onMenuNodeInputs(entries);
        }

        if (!entries.length) {
			console.log("no input entries");
            return;
        }

        var menu = new LiteGraph.ContextMenu(
            entries,
            {
                event: e,
                callback: inner_clicked,
                parentMenu: prev_menu,
                node: node
            },
            ref_window
        );

        function inner_clicked(v, e, prev) {
            if (!node) {
                return;
            }

            if (v.callback) {
                v.callback.call(that, node, v, e, prev);
            }

            if (v.value) {
				node.graph.beforeChange();
                node.addInput(v.value[0], v.value[1], v.value[2]);
                node.setDirtyCanvas(true, true);
				node.graph.afterChange();
            }
        }

        return false;
    };

    LGraphCanvas.showMenuNodeOptionalOutputs = function(
        v,
        options,
        e,
        prev_menu,
        node
    ) {
        if (!node) {
            return;
        }

        var that = this;
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        var options = node.optional_outputs;
        if (node.onGetOutputs) {
            options = node.onGetOutputs();
        }

        var entries = [];
        if (options) {
            for (var i=0; i < options.length; i++) {
                var entry = options[i];
                if (!entry) {
                    //separator?
                    entries.push(null);
                    continue;
                }

                if (
                    node.flags &&
                    node.flags.skip_repeated_outputs &&
                    node.findOutputSlot(entry[0]) != -1
                ) {
                    continue;
                } //skip the ones already on
                var label = entry[0];
                if (entry[2] && entry[2].label) {
                    label = entry[2].label;
                }
                var data = { content: label, value: entry };
                if (entry[1] == LiteGraph.EVENT) {
                    data.className = "event";
                }
                entries.push(data);
            }
        }

        if (this.onMenuNodeOutputs) {
            entries = this.onMenuNodeOutputs(entries);
        }

        if (!entries.length) {
            return;
        }

        var menu = new LiteGraph.ContextMenu(
            entries,
            {
                event: e,
                callback: inner_clicked,
                parentMenu: prev_menu,
                node: node
            },
            ref_window
        );

        function inner_clicked(v, e, prev) {
            if (!node) {
                return;
            }

            if (v.callback) {
                v.callback.call(that, node, v, e, prev);
            }

            if (!v.value) {
                return;
            }

            var value = v.value[1];

            if (
                value &&
                (value.constructor === Object || value.constructor === Array)
            ) {
                //submenu why?
                var entries = [];
                for (var i in value) {
                    entries.push({ content: i, value: value[i] });
                }
                new LiteGraph.ContextMenu(entries, {
                    event: e,
                    callback: inner_clicked,
                    parentMenu: prev_menu,
                    node: node
                });
                return false;
            } else {
				node.graph.beforeChange();
                node.addOutput(v.value[0], v.value[1], v.value[2]);
                node.setDirtyCanvas(true, true);
				node.graph.afterChange();
            }
        }

        return false;
    };

    LGraphCanvas.onShowMenuNodeProperties = function(
        value,
        options,
        e,
        prev_menu,
        node
    ) {
        if (!node || !node.properties) {
            return;
        }

        var that = this;
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        var entries = [];
        for (var i in node.properties) {
            var value = node.properties[i] !== undefined ? node.properties[i] : " ";
			if( typeof value == "object" )
				value = JSON.stringify(value);
			var info = node.getPropertyInfo(i);
			if(info.type == "enum" || info.type == "combo")
				value = LGraphCanvas.getPropertyPrintableValue( value, info.values );

            //value could contain invalid html characters, clean that
            value = LGraphCanvas.decodeHTML(value);

            var displayName = i;
            if (LiteGraph.stylise_property_names) {
                displayName = LiteGraph.stylisePropertyName(i);
            }

            entries.push({
                content:
                    "<span class='property_name'>" +
                    displayName +
                    "</span>" +
                    "<span class='property_value'>" +
                    value +
                    "</span>",
                value: i
            });
        }
        if (!entries.length) {
            return;
        }

        var menu = new LiteGraph.ContextMenu(
            entries,
            {
                event: e,
                callback: inner_clicked,
                parentMenu: prev_menu,
                allow_html: true,
                node: node
            },
            ref_window
        );

        function inner_clicked(v, options, e, prev) {
            if (!node) {
                return;
            }
            var rect = this.getBoundingClientRect();
            canvas.showEditPropertyValue(node, v.value, {
                position: [rect.left, rect.top]
            });
        }

        return false;
    };

    LGraphCanvas.decodeHTML = function(str) {
        var e = document.createElement("div");
        e.innerText = str;
        return e.innerHTML;
    };

    LGraphCanvas.onResizeNode = function(value, options, e, menu, node) {
        if (!node) {
            return;
        }
        node.size = node.computeSize();
        if (node.onResize)
            node.onResize(node.size);
        node.setDirtyCanvas(true, true);
    };

    LGraphCanvas.prototype.showLinkMenu = function(link, e) {
        var that = this;
		console.log(link);
		var options = ["Add Node",null,"Delete"];
        var menu = new LiteGraph.ContextMenu(options, {
            event: e,
			title: link.data != null ? link.data.constructor.name : null,
            callback: inner_clicked
        });

        function inner_clicked(v,options,e) {
            switch (v) {
                case "Add Node":
					LGraphCanvas.onMenuAdd(null, null, e, menu, function(node){
						console.log("node autoconnect");
						var node_left = that.graph.getNodeById( link.origin_id );
						var node_right = that.graph.getNodeById( link.target_id );
						if(!node.inputs || !node.inputs.length || !node.outputs || !node.outputs.length)
							return;
						if( node_left.outputs[ link.origin_slot ].type == node.inputs[0].type && node.outputs[0].type == node_right.inputs[0].type )
						{
							node_left.connect( link.origin_slot, node, 0 );
							node.connect( 0, node_right, link.target_slot );
							node.pos[0] -= node.size[0] * 0.5;
						}
					});
					break;
                case "Delete":
                    that.graph.removeLink(link.id);
                    break;
                default:
            }
        }

        return false;
    };

    LGraphCanvas.onShowPropertyEditor = function(item, options, e, menu, node) {
        var input_html = "";
        var property = item.property || "title";
        var value = node[property];

        var dialog = document.createElement("div");
        dialog.className = "graphdialog";
        dialog.innerHTML =
            "<span class='name'></span><input autofocus type='text' class='value'/><button>OK</button>";
        var title = dialog.querySelector(".name");
        title.innerText = property;
        var input = dialog.querySelector("input");
        if (input) {
            input.value = value;
            input.addEventListener("blur", function(e) {
                this.focus();
            });
            input.addEventListener("keydown", function(e) {
                if (e.keyCode != 13) {
                    return;
                }
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
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (event) {
            dialog.style.left = event.clientX + offsetx + "px";
            dialog.style.top = event.clientY + offsety + "px";
        } else {
            dialog.style.left = canvas.width * 0.5 + offsetx + "px";
            dialog.style.top = canvas.height * 0.5 + offsety + "px";
        }

        var button = dialog.querySelector("button");
        button.addEventListener("click", inner);
        canvas.parentNode.appendChild(dialog);

        function inner() {
            setValue(input.value);
        }

        function setValue(value) {
            if (item.type == "Number") {
                value = Number(value);
            } else if (item.type == "Boolean") {
                value = Boolean(value);
            }
            node[property] = value;
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
            node.setDirtyCanvas(true, true);
        }
    };

    LGraphCanvas.prototype.prompt = function(title, value, callback, event) {
        var that = this;
        var input_html = "";
        title = title || "";

        var modified = false;

        var dialog = document.createElement("div");
        dialog.className = "graphdialog rounded";
        dialog.innerHTML =
            "<span class='name'></span> <input autofocus type='text' class='value'/><button class='rounded'>OK</button>";
        dialog.close = function() {
            that.prompt_box = null;
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        };

        if (this.ds.scale > 1) {
            dialog.style.transform = "scale(" + this.ds.scale + ")";
        }

        dialog.addEventListener("mouseleave", function(e) {
            if (!modified) {
                dialog.close();
            }
        });

        if (that.prompt_box) {
            that.prompt_box.close();
        }
        that.prompt_box = dialog;

        var first = null;
        var timeout = null;
        var selected = null;

        var name_element = dialog.querySelector(".name");
        name_element.innerText = title;
        var value_element = dialog.querySelector(".value");
        value_element.value = value;

        var input = dialog.querySelector("input");
        input.addEventListener("keydown", function(e) {
            modified = true;
            if (e.keyCode == 27) {
                //ESC
                dialog.close();
            } else if (e.keyCode == 13) {
                if (callback) {
                    callback(this.value);
                }
                dialog.close();
            } else {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
        });

        var button = dialog.querySelector("button");
        button.addEventListener("click", function(e) {
            if (callback) {
                callback(input.value);
            }
            that.setDirty(true);
            dialog.close();
        });

        var graphcanvas = LGraphCanvas.active_canvas;
        var canvas = graphcanvas.canvas;

        var rect = canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (event) {
            dialog.style.left = event.clientX + offsetx + "px";
            dialog.style.top = event.clientY + offsety + "px";
        } else {
            dialog.style.left = canvas.width * 0.5 + offsetx + "px";
            dialog.style.top = canvas.height * 0.5 + offsety + "px";
        }

        canvas.parentNode.appendChild(dialog);
        setTimeout(function() {
            input.focus();
        }, 10);

        return dialog;
    };

    LGraphCanvas.search_limit = -1;
    LGraphCanvas.prototype.showSearchBox = function(event) {
        var that = this;
        var input_html = "";
        var graphcanvas = LGraphCanvas.active_canvas;
        var canvas = graphcanvas.canvas;
        var root_document = canvas.ownerDocument || document;

        var dialog = document.createElement("div");
        dialog.className = "litegraph litesearchbox graphdialog rounded";
        dialog.innerHTML =
            "<span class='name'>Search</span> <input autofocus type='text' class='value rounded'/><div class='helper'></div>";
        dialog.close = function() {
            that.search_box = null;
            root_document.body.focus();
			root_document.body.style.overflow = "";

            setTimeout(function() {
                that.canvas.focus();
            }, 20); //important, if canvas loses focus keys wont be captured
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        };

        var timeout_close = null;

        if (this.ds.scale > 1) {
            dialog.style.transform = "scale(" + this.ds.scale + ")";
        }

        dialog.addEventListener("mouseenter", function(e) {
            if (timeout_close) {
                clearTimeout(timeout_close);
                timeout_close = null;
            }
        });

        dialog.addEventListener("mouseleave", function(e) {
            //dialog.close();
            timeout_close = setTimeout(function() {
                dialog.close();
            }, 500);
        });

        if (that.search_box) {
            that.search_box.close();
        }
        that.search_box = dialog;

        var helper = dialog.querySelector(".helper");

        var first = null;
        var timeout = null;
        var selected = null;

        var input = dialog.querySelector("input");
        if (input) {
            input.addEventListener("blur", function(e) {
                this.focus();
            });
            input.addEventListener("keydown", function(e) {
                if (e.keyCode == 38) {
                    //UP
                    changeSelection(false);
                } else if (e.keyCode == 40) {
                    //DOWN
                    changeSelection(true);
                } else if (e.keyCode == 27) {
                    //ESC
                    dialog.close();
                } else if (e.keyCode == 13) {
                    if (selected) {
                        select(selected.innerHTML);
                    } else if (first) {
                        select(first);
                    } else {
                        dialog.close();
                    }
                } else {
                    if (timeout) {
                        clearInterval(timeout);
                    }
                    timeout = setTimeout(refreshHelper, 10);
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
				e.stopImmediatePropagation();
				return true;
            });
        }

		if( root_document.fullscreenElement )
	        root_document.fullscreenElement.appendChild(dialog);
		else
		{
		    root_document.body.appendChild(dialog);
			root_document.body.style.overflow = "hidden";
		}

        //compute best position
        var rect = canvas.getBoundingClientRect();

        var left = ( event ? event.clientX : (rect.left + rect.width * 0.5) ) - 80;
        var top = ( event ? event.clientY : (rect.top + rect.height * 0.5) ) - 20;
        dialog.style.left = left + "px";
        dialog.style.top = top + "px";

		//To avoid out of screen problems
		if(event.layerY > (rect.height - 200)) 
            helper.style.maxHeight = (rect.height - event.layerY - 20) + "px";

		/*
        var offsetx = -20;
        var offsety = -20;
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (event) {
            dialog.style.left = event.clientX + offsetx + "px";
            dialog.style.top = event.clientY + offsety + "px";
        } else {
            dialog.style.left = canvas.width * 0.5 + offsetx + "px";
            dialog.style.top = canvas.height * 0.5 + offsety + "px";
        }
        canvas.parentNode.appendChild(dialog);
		*/

        input.focus();

        function select(name) {
            if (name) {
                if (that.onSearchBoxSelection) {
                    that.onSearchBoxSelection(name, event, graphcanvas);
                } else {
                    var extra = LiteGraph.searchbox_extras[name.toLowerCase()];
                    if (extra) {
                        name = extra.type;
                    }

					graphcanvas.graph.beforeChange();
                    var node = LiteGraph.createNode(name);
                    if (node) {
                        node.pos = graphcanvas.convertEventToCanvasOffset(
                            event
                        );
                        graphcanvas.graph.add(node);
                    }

                    if (extra && extra.data) {
                        if (extra.data.properties) {
                            for (var i in extra.data.properties) {
                                node.addProperty( i, extra.data.properties[i] );
                            }
                        }
                        if (extra.data.inputs) {
                            node.inputs = [];
                            for (var i in extra.data.inputs) {
                                node.addOutput(
                                    extra.data.inputs[i][0],
                                    extra.data.inputs[i][1]
                                );
                            }
                        }
                        if (extra.data.outputs) {
                            node.outputs = [];
                            for (var i in extra.data.outputs) {
                                node.addOutput(
                                    extra.data.outputs[i][0],
                                    extra.data.outputs[i][1]
                                );
                            }
                        }
                        if (extra.data.title) {
                            node.title = extra.data.title;
                        }
                        if (extra.data.json) {
                            node.configure(extra.data.json);
                        }

						graphcanvas.graph.afterChange();
                    }
                }
            }

            dialog.close();
        }

        function changeSelection(forward) {
            var prev = selected;
            if (selected) {
                selected.classList.remove("selected");
            }
            if (!selected) {
                selected = forward
                    ? helper.childNodes[0]
                    : helper.childNodes[helper.childNodes.length];
            } else {
                selected = forward
                    ? selected.nextSibling
                    : selected.previousSibling;
                if (!selected) {
                    selected = prev;
                }
            }
            if (!selected) {
                return;
            }
            selected.classList.add("selected");
            selected.scrollIntoView({block: "end", behavior: "smooth"});
        }

        function refreshHelper() {
            timeout = null;
            var str = input.value;
            first = null;
            helper.innerHTML = "";
            if (!str) {
                return;
            }

            if (that.onSearchBox) {
                var list = that.onSearchBox(helper, str, graphcanvas);
                if (list) {
                    for (var i = 0; i < list.length; ++i) {
                        addResult(list[i]);
                    }
                }
            } else {
                var c = 0;
                str = str.toLowerCase();
				var filter = graphcanvas.filter || graphcanvas.graph.filter;

                //extras
                for (var i in LiteGraph.searchbox_extras) {
                    var extra = LiteGraph.searchbox_extras[i];
                    if (extra.desc.toLowerCase().indexOf(str) === -1) {
                        continue;
                    }
					var ctor = LiteGraph.registered_node_types[ extra.type ];
					if( ctor && ctor.filter != filter )
						continue;
                    addResult( extra.desc, "searchbox_extra" );
                    if ( LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit ) {
                        break;
                    }
                }

				var filtered = null;
                if (Array.prototype.filter) { //filter supported
                    var keys = Object.keys( LiteGraph.registered_node_types ); //types
                    var filtered = keys.filter( inner_test_filter );
                } else {
					filtered = [];
                    for (var i in LiteGraph.registered_node_types) {
						if( inner_test_filter(i) )
							filtered.push(i);
                    }
                }

				for (var i = 0; i < filtered.length; i++) {
					addResult(filtered[i]);
					if ( LGraphCanvas.search_limit !== -1 && c++ > LGraphCanvas.search_limit ) {
						break;
					}
				}

				function inner_test_filter( type )
				{
					var ctor = LiteGraph.registered_node_types[ type ];
					if(filter && ctor.filter != filter )
						return false;
					return type.toLowerCase().indexOf(str) !== -1;
				}
            }

            function addResult(type, className) {
                var help = document.createElement("div");
                if (!first) {
                    first = type;
                }
                help.innerText = type;
                help.dataset["type"] = escape(type);
                help.className = "litegraph lite-search-item";
                if (className) {
                    help.className += " " + className;
                }
                help.addEventListener("click", function(e) {
                    select(unescape(this.dataset["type"]));
                });
                helper.appendChild(help);
            }
        }

        return dialog;
    };

    LGraphCanvas.prototype.showEditPropertyValue = function( node, property, options ) {
        if (!node || node.properties[property] === undefined) {
            return;
        }

        options = options || {};
        var that = this;

        var info = node.getPropertyInfo(property);
		var type = info.type;

        var input_html = "";

        if (type == "string" || type == "number" || type == "array" || type == "object") {
            input_html = "<input autofocus type='text' class='value'/>";
        } else if ( (type == "enum" || type == "combo") && info.values) {
            input_html = "<select autofocus type='text' class='value'>";
            for (var i in info.values) {
                var v = i;
				if( info.values.constructor === Array )
					v = info.values[i];

                input_html +=
                    "<option value='" +
                    v +
                    "' " +
                    (v == node.properties[property] ? "selected" : "") +
                    ">" +
                    info.values[i] +
                    "</option>";
            }
            input_html += "</select>";
        } else if (type == "boolean") {
            input_html =
                "<input autofocus type='checkbox' class='value' " +
                (node.properties[property] ? "checked" : "") +
                "/>";
        } else {
            console.warn("unknown type: " + type);
            return;
        }

        var displayName = property;
        if (LiteGraph.stylise_property_names) {
            displayName = LiteGraph.stylisePropertyName(property);
        }

        var dialog = this.createDialog(
            "<span class='name'>" +
                displayName +
                "</span>" +
                input_html +
                "<button>OK</button>",
            options
        );

        if ((type == "enum" || type == "combo") && info.values) {
            var input = dialog.querySelector("select");
            input.addEventListener("change", function(e) {
                setValue(e.target.value);
                //var index = e.target.value;
                //setValue( e.options[e.selectedIndex].value );
            });
        } else if (type == "boolean") {
            var input = dialog.querySelector("input");
            if (input) {
                input.addEventListener("click", function(e) {
                    setValue(!!input.checked);
                });
            }
        } else {
            var input = dialog.querySelector("input");
            if (input) {
                input.addEventListener("blur", function(e) {
                    this.focus();
                });

                var v = node.properties[property] !== undefined ? node.properties[property] : "";
				if (v.constructor !== String) {
                    v = JSON.stringify(v);
                }

                input.value = v;
                input.addEventListener("keydown", function(e) {
                    if (e.keyCode != 13) {
                        return;
                    }
                    inner();
                    e.preventDefault();
                    e.stopPropagation();
                });
            }
        }

        var button = dialog.querySelector("button");
        button.addEventListener("click", inner);

        function inner() {
            setValue(input.value);
        }

        function setValue(value) {

			if(info && info.values && info.values.constructor === Object && info.values[value] != undefined )
				value = info.values[value];

            if (typeof node.properties[property] == "number") {
                value = Number(value);
            }
            if (type == "array" || type == "object") {
                value = JSON.parse(value);
            }
            node.properties[property] = value;
            if (node.graph) {
                node.graph._version++;
            }
            if (node.onPropertyChanged) {
                node.onPropertyChanged(property, value);
            }
			if(options.onclose)
				options.onclose();
            dialog.close();
            node.setDirtyCanvas(true, true);
        }

		return dialog;
    };

    LGraphCanvas.prototype.createDialog = function(html, options) {
        options = options || {};

        var dialog = document.createElement("div");
        dialog.className = "graphdialog";
        dialog.innerHTML = html;

        var rect = this.canvas.getBoundingClientRect();
        var offsetx = -20;
        var offsety = -20;
        if (rect) {
            offsetx -= rect.left;
            offsety -= rect.top;
        }

        if (options.position) {
            offsetx += options.position[0];
            offsety += options.position[1];
        } else if (options.event) {
            offsetx += options.event.clientX;
            offsety += options.event.clientY;
        } //centered
        else {
            offsetx += this.canvas.width * 0.5;
            offsety += this.canvas.height * 0.5;
        }

        dialog.style.left = offsetx + "px";
        dialog.style.top = offsety + "px";

        this.canvas.parentNode.appendChild(dialog);

        dialog.close = function() {
            if (this.parentNode) {
                this.parentNode.removeChild(this);
            }
        };

        return dialog;
    };

	LGraphCanvas.prototype.createPanel = function(title, options) {
		options = options || {};

		var ref_window = options.window || window;
		var root = document.createElement("div");
		root.className = "litegraph dialog";
		root.innerHTML = "<div class='dialog-header'><span class='dialog-title'></span></div><div class='dialog-content'></div><div class='dialog-footer'></div>";
		root.header = root.querySelector(".dialog-header");

		if(options.width)
			root.style.width = options.width + (options.width.constructor === Number ? "px" : "");
		if(options.height)
			root.style.height = options.height + (options.height.constructor === Number ? "px" : "");
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

		root.clear = function()
		{
			this.content.innerHTML = "";
		}

		root.addHTML = function(code, classname, on_footer)
		{
			var elem = document.createElement("div");
			if(classname)
				elem.className = classname;
			elem.innerHTML = code;
			if(on_footer)
				root.footer.appendChild(elem);
			else
				root.content.appendChild(elem);
			return elem;
		}

		root.addButton = function( name, callback, options )
		{
			var elem = document.createElement("button");
			elem.innerText = name;
			elem.options = options;
			elem.classList.add("btn");
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
			type = type.toLowerCase();
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
			else if (type == "enum" || type == "combo")
				var str_value = LGraphCanvas.getPropertyPrintableValue( value, options.values );
				value_element.innerText = str_value;

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

	LGraphCanvas.getPropertyPrintableValue = function(value, values)
	{
		if(!values)
			return String(value);

		if(values.constructor === Array)
		{
			return String(value);			
		}

		if(values.constructor === Object)
		{
			var desc_value = "";
			for(var k in values)
			{
				if(values[k] != value)
					continue;
				desc_value = k;
				break;
			}
			return String(value) + " ("+desc_value+")";
		}
	}

	LGraphCanvas.prototype.showShowNodePanel = function( node )
	{
		window.SELECTED_NODE = node;
		var panel = document.querySelector("#node-panel");
		if(panel)
			panel.close();
		var ref_window = this.getCanvasWindow();
		panel = this.createPanel(node.title || "",{closable: true, window: ref_window });
		panel.id = "node-panel";
		panel.node = node;
		panel.classList.add("settings");
		var that = this;
		var graphcanvas = this;

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
					graphcanvas.graph.beforeChange(node);
					node.setProperty(name,value);
					graphcanvas.graph.afterChange();
					graphcanvas.dirty_canvas = true;
				});
			}

			panel.addSeparator();

			if(node.onShowCustomPanelInfo)
				node.onShowCustomPanelInfo(panel);

			/*
			panel.addHTML("<h3>Connections</h3>");
			var connection_containers = panel.addHTML("<div class='inputs connections_side'></div><div class='outputs connections_side'></div>","connections");
			var inputs = connection_containers.querySelector(".inputs");
			var outputs = connection_containers.querySelector(".outputs");
			*/

			panel.addButton("Delete",function(){
				if(node.block_delete)
					return;
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

		this.canvas.parentNode.appendChild( panel );
	}
	
	LGraphCanvas.prototype.showSubgraphPropertiesDialog = function(node)
	{
		console.log("showing subgraph properties dialog");

		var old_panel = this.canvas.parentNode.querySelector(".subgraph_dialog");
		if(old_panel)
			old_panel.close();

		var panel = this.createPanel("Subgraph Inputs",{closable:true, width: 500});
		panel.node = node;
		panel.classList.add("subgraph_dialog");

		function inner_refresh()
		{
			panel.clear();

			//show currents
			if(node.inputs)
				for(var i = 0; i < node.inputs.length; ++i)
				{
					var input = node.inputs[i];
					if(input.not_subgraph_input)
						continue;
					var html = "<button>&#10005;</button> <span class='bullet_icon'></span><span class='name'></span><span class='type'></span>";
					var elem = panel.addHTML(html,"subgraph_property");
					elem.dataset["name"] = input.name;
					elem.dataset["slot"] = i;
					elem.querySelector(".name").innerText = input.name;
					elem.querySelector(".type").innerText = input.type;
					elem.querySelector("button").addEventListener("click",function(e){
						node.removeInput( Number( this.parentNode.dataset["slot"] ) );
						inner_refresh();
					});
				}
		}

		//add extra
		var html = " + <span class='label'>Name</span><input class='name'/><span class='label'>Type</span><input class='type'></input><button>+</button>";
		var elem = panel.addHTML(html,"subgraph_property extra", true);
		elem.querySelector("button").addEventListener("click", function(e){
			var elem = this.parentNode;
			var name = elem.querySelector(".name").value;
			var type = elem.querySelector(".type").value;
			if(!name || node.findInputSlot(name) != -1)
				return;
			node.addInput(name,type);
			elem.querySelector(".name").value = "";
			elem.querySelector(".type").value = "";
			inner_refresh();
		});

		inner_refresh();
	    this.canvas.parentNode.appendChild(panel);
		return panel;
	}

	LGraphCanvas.prototype.checkPanels = function()
	{
		if(!this.canvas)
			return;
		var panels = this.canvas.parentNode.querySelectorAll(".litegraph.dialog");
		for(var i = 0; i < panels.length; ++i)
		{
			var panel = panels[i];
			if( !panel.node )
				continue;
			if( !panel.node.graph || panel.graph != this.graph )
				panel.close();
		}
	}

    LGraphCanvas.onMenuNodeCollapse = function(value, options, e, menu, node) {
		node.graph.beforeChange(node);
        node.collapse();
		node.graph.afterChange(node);
    };

    LGraphCanvas.onMenuNodePin = function(value, options, e, menu, node) {
        node.pin();
    };

    LGraphCanvas.onMenuNodeMode = function(value, options, e, menu, node) {
        new LiteGraph.ContextMenu(
            ["Always", "On Event", "On Trigger", "Never"],
            { event: e, callback: inner_clicked, parentMenu: menu, node: node }
        );

        function inner_clicked(v) {
            if (!node) {
                return;
            }
            switch (v) {
                case "On Event":
                    node.mode = LiteGraph.ON_EVENT;
                    break;
                case "On Trigger":
                    node.mode = LiteGraph.ON_TRIGGER;
                    break;
                case "Never":
                    node.mode = LiteGraph.NEVER;
                    break;
                case "Always":
                default:
                    node.mode = LiteGraph.ALWAYS;
                    break;
            }
        }

        return false;
    };

    LGraphCanvas.onMenuNodeColors = function(value, options, e, menu, node) {
        if (!node) {
            throw "no node for color";
        }

        var values = [];
        values.push({
            value: null,
            content:
                "<span style='display: block; padding-left: 4px;'>No color</span>"
        });

        for (var i in LGraphCanvas.node_colors) {
            var color = LGraphCanvas.node_colors[i];
            var value = {
                value: i,
                content:
                    "<span style='display: block; color: #999; padding-left: 4px; border-left: 8px solid " +
                    color.color +
                    "; background-color:" +
                    color.bgcolor +
                    "'>" +
                    i +
                    "</span>"
            };
            values.push(value);
        }
        new LiteGraph.ContextMenu(values, {
            event: e,
            callback: inner_clicked,
            parentMenu: menu,
            node: node
        });

        function inner_clicked(v) {
            if (!node) {
                return;
            }

            var color = v.value ? LGraphCanvas.node_colors[v.value] : null;
            if (color) {
                if (node.constructor === LiteGraph.LGraphGroup) {
                    node.color = color.groupcolor;
                } else {
                    node.color = color.color;
                    node.bgcolor = color.bgcolor;
                }
            } else {
                delete node.color;
                delete node.bgcolor;
            }
            node.setDirtyCanvas(true, true);
        }

        return false;
    };

    LGraphCanvas.onMenuNodeShapes = function(value, options, e, menu, node) {
        if (!node) {
            throw "no node passed";
        }

        new LiteGraph.ContextMenu(LiteGraph.VALID_SHAPES, {
            event: e,
            callback: inner_clicked,
            parentMenu: menu,
            node: node
        });

        function inner_clicked(v) {
            if (!node) {
                return;
            }
			node.graph.beforeChange(node);
            node.shape = v;
			node.graph.afterChange(node);
            node.setDirtyCanvas(true);
        }

        return false;
    };

    LGraphCanvas.onMenuNodeRemove = function(value, options, e, menu, node) {
        if (!node) {
            throw "no node passed";
        }

        if (node.removable === false) {
            return;
        }

		var graph = node.graph;
		graph.beforeChange();
        graph.remove(node);
		graph.afterChange();
        node.setDirtyCanvas(true, true);
    };

    LGraphCanvas.onMenuNodeToSubgraph = function(value, options, e, menu, node) {
		var graph = node.graph;
		var graphcanvas = LGraphCanvas.active_canvas;
		if(!graphcanvas) //??
			return;

		var nodes_list = Object.values( graphcanvas.selected_nodes || {} );
		if( !nodes_list.length )
			nodes_list = [ node ];

		var subgraph_node = LiteGraph.createNode("graph/subgraph");
		subgraph_node.pos = node.pos.concat();
		graph.add(subgraph_node);

		subgraph_node.buildFromNodes( nodes_list );

		graphcanvas.deselectAllNodes();
        node.setDirtyCanvas(true, true);
    };

    LGraphCanvas.onMenuNodeClone = function(value, options, e, menu, node) {
        if (node.clonable == false) {
            return;
        }
        var newnode = node.clone();
        if (!newnode) {
            return;
        }
        newnode.pos = [node.pos[0] + 5, node.pos[1] + 5];

		node.graph.beforeChange();
        node.graph.add(newnode);
		node.graph.afterChange();

        node.setDirtyCanvas(true, true);
    };

    LGraphCanvas.node_colors = {
        red: { color: "#322", bgcolor: "#533", groupcolor: "#A88" },
        brown: { color: "#332922", bgcolor: "#593930", groupcolor: "#b06634" },
        green: { color: "#232", bgcolor: "#353", groupcolor: "#8A8" },
        blue: { color: "#223", bgcolor: "#335", groupcolor: "#88A" },
        pale_blue: {
            color: "#2a363b",
            bgcolor: "#3f5159",
            groupcolor: "#3f789e"
        },
        cyan: { color: "#233", bgcolor: "#355", groupcolor: "#8AA" },
        purple: { color: "#323", bgcolor: "#535", groupcolor: "#a1309b" },
        yellow: { color: "#432", bgcolor: "#653", groupcolor: "#b58b2a" },
        black: { color: "#222", bgcolor: "#000", groupcolor: "#444" }
    };

    LGraphCanvas.prototype.getCanvasMenuOptions = function() {
        var options = null;
        if (this.getMenuOptions) {
            options = this.getMenuOptions();
        } else {
            options = [
                {
                    content: "Add Node",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuAdd
                },
                { content: "Add Group", callback: LGraphCanvas.onGroupAdd }
                //{content:"Collapse All", callback: LGraphCanvas.onMenuCollapseAll }
            ];

            if (this._graph_stack && this._graph_stack.length > 0) {
                options.push(null, {
                    content: "Close subgraph",
                    callback: this.closeSubgraph.bind(this)
                });
            }
        }

        if (this.getExtraMenuOptions) {
            var extra = this.getExtraMenuOptions(this, options);
            if (extra) {
                options = options.concat(extra);
            }
        }

        return options;
    };

    //called by processContextMenu to extract the menu list
    LGraphCanvas.prototype.getNodeMenuOptions = function(node) {
        var options = null;

        if (node.getMenuOptions) {
            options = node.getMenuOptions(this);
        } else {
            options = [
                {
                    content: "Inputs",
                    has_submenu: true,
                    disabled: true,
                    callback: LGraphCanvas.showMenuNodeOptionalInputs
                },
                {
                    content: "Outputs",
                    has_submenu: true,
                    disabled: true,
                    callback: LGraphCanvas.showMenuNodeOptionalOutputs
                },
                null,
                {
                    content: "Properties",
                    has_submenu: true,
                    callback: LGraphCanvas.onShowMenuNodeProperties
                },
                null,
                {
                    content: "Title",
                    callback: LGraphCanvas.onShowPropertyEditor
                },
                {
                    content: "Mode",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuNodeMode
                },
                {
                    content: "Resize", callback: function() {
                        if(node.resizable) 
                            return LGraphCanvas.onResizeNode;
                    }
                },
                {
                    content: "Collapse",
                    callback: LGraphCanvas.onMenuNodeCollapse
                },
                { content: "Pin", callback: LGraphCanvas.onMenuNodePin },
                {
                    content: "Colors",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuNodeColors
                },
                {
                    content: "Shapes",
                    has_submenu: true,
                    callback: LGraphCanvas.onMenuNodeShapes
                },
                null
            ];
        }

        if (node.onGetInputs) {
            var inputs = node.onGetInputs();
            if (inputs && inputs.length) {
                options[0].disabled = false;
            }
        }

        if (node.onGetOutputs) {
            var outputs = node.onGetOutputs();
            if (outputs && outputs.length) {
                options[1].disabled = false;
            }
        }

        if (node.getExtraMenuOptions) {
            var extra = node.getExtraMenuOptions(this, options);
            if (extra) {
                extra.push(null);
                options = extra.concat(options);
            }
        }

        if (node.clonable !== false) {
            options.push({
                content: "Clone",
                callback: LGraphCanvas.onMenuNodeClone
            });
        }

		if(0) //TODO
		options.push({
			content: "To Subgraph",
			callback: LGraphCanvas.onMenuNodeToSubgraph
		});

		options.push(null, {
			content: "Remove",
			disabled: !(node.removable !== false && !node.block_delete ),
			callback: LGraphCanvas.onMenuNodeRemove
		});

        if (node.graph && node.graph.onGetNodeMenuOptions) {
            node.graph.onGetNodeMenuOptions(options, node);
        }

        return options;
    };

    LGraphCanvas.prototype.getGroupMenuOptions = function(node) {
        var o = [
            { content: "Title", callback: LGraphCanvas.onShowPropertyEditor },
            {
                content: "Color",
                has_submenu: true,
                callback: LGraphCanvas.onMenuNodeColors
            },
            {
                content: "Font size",
                property: "font_size",
                type: "Number",
                callback: LGraphCanvas.onShowPropertyEditor
            },
            null,
            { content: "Remove", callback: LGraphCanvas.onMenuNodeRemove }
        ];

        return o;
    };

    LGraphCanvas.prototype.processContextMenu = function(node, event) {
        var that = this;
        var canvas = LGraphCanvas.active_canvas;
        var ref_window = canvas.getCanvasWindow();

        var menu_info = null;
        var options = {
            event: event,
            callback: inner_option_clicked,
            extra: node
        };

		if(node)
			options.title = node.type;

        //check if mouse is in input
        var slot = null;
        if (node) {
            slot = node.getSlotInPosition(event.canvasX, event.canvasY);
            LGraphCanvas.active_node = node;
        }

        if (slot) {
            //on slot
            menu_info = [];
            if (node.getSlotMenuOptions) {
                menu_info = node.getSlotMenuOptions(slot);
            } else {
                if (
                    slot &&
                    slot.output &&
                    slot.output.links &&
                    slot.output.links.length
                ) {
                    menu_info.push({ content: "Disconnect Links", slot: slot });
                }
                var _slot = slot.input || slot.output;
                menu_info.push(
                    _slot.locked
                        ? "Cannot remove"
                        : { content: "Remove Slot", slot: slot }
                );
                menu_info.push(
                    _slot.nameLocked
                        ? "Cannot rename"
                        : { content: "Rename Slot", slot: slot }
                );
    
            }
            options.title =
                (slot.input ? slot.input.type : slot.output.type) || "*";
            if (slot.input && slot.input.type == LiteGraph.ACTION) {
                options.title = "Action";
            }
            if (slot.output && slot.output.type == LiteGraph.EVENT) {
                options.title = "Event";
            }
        } else {
            if (node) {
                //on node
                menu_info = this.getNodeMenuOptions(node);
            } else {
                menu_info = this.getCanvasMenuOptions();
                var group = this.graph.getGroupOnPos(
                    event.canvasX,
                    event.canvasY
                );
                if (group) {
                    //on group
                    menu_info.push(null, {
                        content: "Edit Group",
                        has_submenu: true,
                        submenu: {
                            title: "Group",
                            extra: group,
                            options: this.getGroupMenuOptions(group)
                        }
                    });
                }
            }
        }

        //show menu
        if (!menu_info) {
            return;
        }

        var menu = new LiteGraph.ContextMenu(menu_info, options, ref_window);

        function inner_option_clicked(v, options, e) {
            if (!v) {
                return;
            }

            if (v.content == "Remove Slot") {
                var info = v.slot;
                if (info.input) {
                    node.removeInput(info.slot);
                } else if (info.output) {
                    node.removeOutput(info.slot);
                }
                return;
            } else if (v.content == "Disconnect Links") {
                var info = v.slot;
                if (info.output) {
                    node.disconnectOutput(info.slot);
                } else if (info.input) {
                    node.disconnectInput(info.slot);
                }
                return;
            } else if (v.content == "Rename Slot") {
                var info = v.slot;
                var slot_info = info.input
                    ? node.getInputInfo(info.slot)
                    : node.getOutputInfo(info.slot);
                var dialog = that.createDialog(
                    "<span class='name'>Name</span><input autofocus type='text'/><button>OK</button>",
                    options
                );
                var input = dialog.querySelector("input");
                if (input && slot_info) {
                    input.value = slot_info.label || "";
                }
                dialog
                    .querySelector("button")
                    .addEventListener("click", function(e) {
                        if (input.value) {
                            if (slot_info) {
                                slot_info.label = input.value;
                            }
                            that.setDirty(true);
                        }
                        dialog.close();
                    });
            }

            //if(v.callback)
            //	return v.callback.call(that, node, options, e, menu, that, event );
        }
    };

    //API *************************************************
    //like rect but rounded corners
    if (typeof(window) != "undefined" && window.CanvasRenderingContext2D) {
        window.CanvasRenderingContext2D.prototype.roundRect = function(
            x,
            y,
            width,
            height,
            radius,
            radius_low
        ) {
            if (radius === undefined) {
                radius = 5;
            }

            if (radius_low === undefined) {
                radius_low = radius;
            }

            this.moveTo(x + radius, y);
            this.lineTo(x + width - radius, y);
            this.quadraticCurveTo(x + width, y, x + width, y + radius);

            this.lineTo(x + width, y + height - radius_low);
            this.quadraticCurveTo(
                x + width,
                y + height,
                x + width - radius_low,
                y + height
            );
            this.lineTo(x + radius_low, y + height);
            this.quadraticCurveTo(x, y + height, x, y + height - radius_low);
            this.lineTo(x, y + radius);
            this.quadraticCurveTo(x, y, x + radius, y);
        };
    }

    function compareObjects(a, b) {
        for (var i in a) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }
    LiteGraph.compareObjects = compareObjects;

    function distance(a, b) {
        return Math.sqrt(
            (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])
        );
    }
    LiteGraph.distance = distance;

    function colorToString(c) {
        return (
            "rgba(" +
            Math.round(c[0] * 255).toFixed() +
            "," +
            Math.round(c[1] * 255).toFixed() +
            "," +
            Math.round(c[2] * 255).toFixed() +
            "," +
            (c.length == 4 ? c[3].toFixed(2) : "1.0") +
            ")"
        );
    }
    LiteGraph.colorToString = colorToString;

    function isInsideRectangle(x, y, left, top, width, height) {
        if (left < x && left + width > x && top < y && top + height > y) {
            return true;
        }
        return false;
    }
    LiteGraph.isInsideRectangle = isInsideRectangle;

    //[minx,miny,maxx,maxy]
    function growBounding(bounding, x, y) {
        if (x < bounding[0]) {
            bounding[0] = x;
        } else if (x > bounding[2]) {
            bounding[2] = x;
        }

        if (y < bounding[1]) {
            bounding[1] = y;
        } else if (y > bounding[3]) {
            bounding[3] = y;
        }
    }
    LiteGraph.growBounding = growBounding;

    //point inside bounding box
    function isInsideBounding(p, bb) {
        if (
            p[0] < bb[0][0] ||
            p[1] < bb[0][1] ||
            p[0] > bb[1][0] ||
            p[1] > bb[1][1]
        ) {
            return false;
        }
        return true;
    }
    LiteGraph.isInsideBounding = isInsideBounding;

    //bounding overlap, format: [ startx, starty, width, height ]
    function overlapBounding(a, b) {
        var A_end_x = a[0] + a[2];
        var A_end_y = a[1] + a[3];
        var B_end_x = b[0] + b[2];
        var B_end_y = b[1] + b[3];

        if (
            a[0] > B_end_x ||
            a[1] > B_end_y ||
            A_end_x < b[0] ||
            A_end_y < b[1]
        ) {
            return false;
        }
        return true;
    }
    LiteGraph.overlapBounding = overlapBounding;

    //Convert a hex value to its decimal value - the inputted hex must be in the
    //	format of a hex triplet - the kind we use for HTML colours. The function
    //	will return an array with three values.
    function hex2num(hex) {
        if (hex.charAt(0) == "#") {
            hex = hex.slice(1);
        } //Remove the '#' char - if there is one.
        hex = hex.toUpperCase();
        var hex_alphabets = "0123456789ABCDEF";
        var value = new Array(3);
        var k = 0;
        var int1, int2;
        for (var i = 0; i < 6; i += 2) {
            int1 = hex_alphabets.indexOf(hex.charAt(i));
            int2 = hex_alphabets.indexOf(hex.charAt(i + 1));
            value[k] = int1 * 16 + int2;
            k++;
        }
        return value;
    }

    LiteGraph.hex2num = hex2num;

    //Give a array with three values as the argument and the function will return
    //	the corresponding hex triplet.
    function num2hex(triplet) {
        var hex_alphabets = "0123456789ABCDEF";
        var hex = "#";
        var int1, int2;
        for (var i = 0; i < 3; i++) {
            int1 = triplet[i] / 16;
            int2 = triplet[i] % 16;

            hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
        }
        return hex;
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
    function ContextMenu(values, options) {
        options = options || {};
        this.options = options;
        var that = this;

        //to link a menu with its parent
        if (options.parentMenu) {
            if (options.parentMenu.constructor !== this.constructor) {
                console.error(
                    "parentMenu must be of class ContextMenu, ignoring it"
                );
                options.parentMenu = null;
            } else {
                this.parentMenu = options.parentMenu;
                this.parentMenu.lock = true;
                this.parentMenu.current_submenu = this;
            }
        }

		var eventClass = null;
		if(options.event) //use strings because comparing classes between windows doesnt work
			eventClass = options.event.constructor.name;
        if ( eventClass !== "MouseEvent" &&
            eventClass !== "CustomEvent" &&
			eventClass !== "PointerEvent"
        ) {
            console.error(
                "Event passed to ContextMenu is not of type MouseEvent or CustomEvent. Ignoring it."
            );
            options.event = null;
        }

        var root = document.createElement("div");
        root.className = "litegraph litecontextmenu litemenubar-panel";
        if (options.className) {
            root.className += " " + options.className;
        }
        root.style.minWidth = 100;
        root.style.minHeight = 100;
        root.style.pointerEvents = "none";
        setTimeout(function() {
            root.style.pointerEvents = "auto";
        }, 100); //delay so the mouse up event is not caught by this element

        //this prevents the default context browser menu to open in case this menu was created when pressing right button
        root.addEventListener(
            "mouseup",
            function(e) {
                e.preventDefault();
                return true;
            },
            true
        );
        root.addEventListener(
            "contextmenu",
            function(e) {
                if (e.button != 2) {
                    //right button
                    return false;
                }
                e.preventDefault();
                return false;
            },
            true
        );

        root.addEventListener(
            "mousedown",
            function(e) {
                if (e.button == 2) {
                    that.close();
                    e.preventDefault();
                    return true;
                }
            },
            true
        );

        function on_mouse_wheel(e) {
            var pos = parseInt(root.style.top);
            root.style.top =
                (pos + e.deltaY * options.scroll_speed).toFixed() + "px";
            e.preventDefault();
            return true;
        }

        if (!options.scroll_speed) {
            options.scroll_speed = 0.1;
        }

        root.addEventListener("wheel", on_mouse_wheel, true);
        root.addEventListener("mousewheel", on_mouse_wheel, true);

        this.root = root;

        //title
        if (options.title) {
            var element = document.createElement("div");
            element.className = "litemenu-title";
            element.innerHTML = options.title;
            root.appendChild(element);
        }

        //entries
        var num = 0;
        for (var i=0; i < values.length; i++) {
            var name = values.constructor == Array ? values[i] : i;
            if (name != null && name.constructor !== String) {
                name = name.content === undefined ? String(name) : name.content;
            }
            var value = values[i];
            this.addItem(name, value, options);
            num++;
        }

        //close on leave
        root.addEventListener("mouseleave", function(e) {
            if (that.lock) {
                return;
            }
            if (root.closing_timer) {
                clearTimeout(root.closing_timer);
            }
            root.closing_timer = setTimeout(that.close.bind(that, e), 500);
            //that.close(e);
        });

        root.addEventListener("mouseenter", function(e) {
            if (root.closing_timer) {
                clearTimeout(root.closing_timer);
            }
        });

        //insert before checking position
        var root_document = document;
        if (options.event) {
            root_document = options.event.target.ownerDocument;
        }

        if (!root_document) {
            root_document = document;
        }

		if( root_document.fullscreenElement )
	        root_document.fullscreenElement.appendChild(root);
		else
		    root_document.body.appendChild(root);

        //compute best position
        var left = options.left || 0;
        var top = options.top || 0;
        if (options.event) {
            left = options.event.clientX - 10;
            top = options.event.clientY - 10;
            if (options.title) {
                top -= 20;
            }

            if (options.parentMenu) {
                var rect = options.parentMenu.root.getBoundingClientRect();
                left = rect.left + rect.width;
            }

            var body_rect = document.body.getBoundingClientRect();
            var root_rect = root.getBoundingClientRect();
			if(body_rect.height == 0)
				console.error("document.body height is 0. That is dangerous, set html,body { height: 100%; }");

            if (body_rect.width && left > body_rect.width - root_rect.width - 10) {
                left = body_rect.width - root_rect.width - 10;
            }
            if (body_rect.height && top > body_rect.height - root_rect.height - 10) {
                top = body_rect.height - root_rect.height - 10;
            }
        }

        root.style.left = left + "px";
        root.style.top = top + "px";

        if (options.scale) {
            root.style.transform = "scale(" + options.scale + ")";
        }
    }

    ContextMenu.prototype.addItem = function(name, value, options) {
        var that = this;
        options = options || {};

        var element = document.createElement("div");
        element.className = "litemenu-entry submenu";

        var disabled = false;

        if (value === null) {
            element.classList.add("separator");
            //element.innerHTML = "<hr/>"
            //continue;
        } else {
            element.innerHTML = value && value.title ? value.title : name;
            element.value = value;

            if (value) {
                if (value.disabled) {
                    disabled = true;
                    element.classList.add("disabled");
                }
                if (value.submenu || value.has_submenu) {
                    element.classList.add("has_submenu");
                }
            }

            if (typeof value == "function") {
                element.dataset["value"] = name;
                element.onclick_callback = value;
            } else {
                element.dataset["value"] = value;
            }

            if (value.className) {
                element.className += " " + value.className;
            }
        }

        this.root.appendChild(element);
        if (!disabled) {
            element.addEventListener("click", inner_onclick);
        }
        if (options.autoopen) {
            element.addEventListener("mouseenter", inner_over);
        }

        function inner_over(e) {
            var value = this.value;
            if (!value || !value.has_submenu) {
                return;
            }
            //if it is a submenu, autoopen like the item was clicked
            inner_onclick.call(this, e);
        }

        //menu option clicked
        function inner_onclick(e) {
            var value = this.value;
            var close_parent = true;

            if (that.current_submenu) {
                that.current_submenu.close(e);
            }

            //global callback
            if (options.callback) {
                var r = options.callback.call(
                    this,
                    value,
                    options,
                    e,
                    that,
                    options.node
                );
                if (r === true) {
                    close_parent = false;
                }
            }

            //special cases
            if (value) {
                if (
                    value.callback &&
                    !options.ignore_item_callbacks &&
                    value.disabled !== true
                ) {
                    //item callback
                    var r = value.callback.call(
                        this,
                        value,
                        options,
                        e,
                        that,
                        options.extra
                    );
                    if (r === true) {
                        close_parent = false;
                    }
                }
                if (value.submenu) {
                    if (!value.submenu.options) {
                        throw "ContextMenu submenu needs options";
                    }
                    var submenu = new that.constructor(value.submenu.options, {
                        callback: value.submenu.callback,
                        event: e,
                        parentMenu: that,
                        ignore_item_callbacks:
                            value.submenu.ignore_item_callbacks,
                        title: value.submenu.title,
                        extra: value.submenu.extra,
                        autoopen: options.autoopen
                    });
                    close_parent = false;
                }
            }

            if (close_parent && !that.lock) {
                that.close();
            }
        }

        return element;
    };

    ContextMenu.prototype.close = function(e, ignore_parent_menu) {
        if (this.root.parentNode) {
            this.root.parentNode.removeChild(this.root);
        }
        if (this.parentMenu && !ignore_parent_menu) {
            this.parentMenu.lock = false;
            this.parentMenu.current_submenu = null;
            if (e === undefined) {
                this.parentMenu.close();
            } else if (
                e &&
                !ContextMenu.isCursorOverElement(e, this.parentMenu.root)
            ) {
                ContextMenu.trigger(this.parentMenu.root, "mouseleave", e);
            }
        }
        if (this.current_submenu) {
            this.current_submenu.close(e, true);
        }

        if (this.root.closing_timer) {
            clearTimeout(this.root.closing_timer);
        }
    };

    //this code is used to trigger events easily (used in the context menu mouseleave
    ContextMenu.trigger = function(element, event_name, params, origin) {
        var evt = document.createEvent("CustomEvent");
        evt.initCustomEvent(event_name, true, true, params); //canBubble, cancelable, detail
        evt.srcElement = origin;
        if (element.dispatchEvent) {
            element.dispatchEvent(evt);
        } else if (element.__events) {
            element.__events.dispatchEvent(evt);
        }
        //else nothing seems binded here so nothing to do
        return evt;
    };

    //returns the top most menu
    ContextMenu.prototype.getTopMenu = function() {
        if (this.options.parentMenu) {
            return this.options.parentMenu.getTopMenu();
        }
        return this;
    };

    ContextMenu.prototype.getFirstEvent = function() {
        if (this.options.parentMenu) {
            return this.options.parentMenu.getFirstEvent();
        }
        return this.options.event;
    };

    ContextMenu.isCursorOverElement = function(event, element) {
        var left = event.clientX;
        var top = event.clientY;
        var rect = element.getBoundingClientRect();
        if (!rect) {
            return false;
        }
        if (
            top > rect.top &&
            top < rect.top + rect.height &&
            left > rect.left &&
            left < rect.left + rect.width
        ) {
            return true;
        }
        return false;
    };

    LiteGraph.ContextMenu = ContextMenu;

    LiteGraph.closeAllContextMenus = function(ref_window) {
        ref_window = ref_window || window;

        var elements = ref_window.document.querySelectorAll(".litecontextmenu");
        if (!elements.length) {
            return;
        }

        var result = [];
        for (var i = 0; i < elements.length; i++) {
            result.push(elements[i]);
        }

        for (var i=0; i < result.length; i++) {
            if (result[i].close) {
                result[i].close();
            } else if (result[i].parentNode) {
                result[i].parentNode.removeChild(result[i]);
            }
        }
    };

    LiteGraph.extendClass = function(target, origin) {
        for (var i in origin) {
            //copy class properties
            if (target.hasOwnProperty(i)) {
                continue;
            }
            target[i] = origin[i];
        }

        if (origin.prototype) {
            //copy prototype properties
            for (var i in origin.prototype) {
                //only enumerable
                if (!origin.prototype.hasOwnProperty(i)) {
                    continue;
                }

                if (target.prototype.hasOwnProperty(i)) {
                    //avoid overwriting existing ones
                    continue;
                }

                //copy getters
                if (origin.prototype.__lookupGetter__(i)) {
                    target.prototype.__defineGetter__(
                        i,
                        origin.prototype.__lookupGetter__(i)
                    );
                } else {
                    target.prototype[i] = origin.prototype[i];
                }

                //and setters
                if (origin.prototype.__lookupSetter__(i)) {
                    target.prototype.__defineSetter__(
                        i,
                        origin.prototype.__lookupSetter__(i)
                    );
                }
            }
        }
    };

	//used by some widgets to render a curve editor
	function CurveEditor( points )
	{
		this.points = points;
		this.selected = -1;
		this.nearest = -1;
		this.size = null; //stores last size used
		this.must_update = true;
		this.margin = 5;
	}

	CurveEditor.sampleCurve = function(f,points)
	{
		if(!points)
			return;
		for(var i = 0; i < points.length - 1; ++i)
		{
			var p = points[i];
			var pn = points[i+1];
			if(pn[0] < f)
				continue;
			var r = (pn[0] - p[0]);
			if( Math.abs(r) < 0.00001 )
				return p[1];
			var local_f = (f - p[0]) / r;
			return p[1] * (1.0 - local_f) + pn[1] * local_f;
		}
		return 0;
	}

	CurveEditor.prototype.draw = function( ctx, size, graphcanvas, background_color, line_color, inactive )
	{
		var points = this.points;
		if(!points)
			return;
		this.size = size;
		var w = size[0] - this.margin * 2;
		var h = size[1] - this.margin * 2;

		line_color = line_color || "#666";

		ctx.save();
		ctx.translate(this.margin,this.margin);

		if(background_color)
		{
			ctx.fillStyle = "#111";
			ctx.fillRect(0,0,w,h);
			ctx.fillStyle = "#222";
			ctx.fillRect(w*0.5,0,1,h);
			ctx.strokeStyle = "#333";
			ctx.strokeRect(0,0,w,h);
		}
		ctx.strokeStyle = line_color;
		if(inactive)
			ctx.globalAlpha = 0.5;
		ctx.beginPath();
		for(var i = 0; i < points.length; ++i)
		{
			var p = points[i];
			ctx.lineTo( p[0] * w, (1.0 - p[1]) * h );
		}
		ctx.stroke();
		ctx.globalAlpha = 1;
		if(!inactive)
			for(var i = 0; i < points.length; ++i)
			{
				var p = points[i];
				ctx.fillStyle = this.selected == i ? "#FFF" : (this.nearest == i ? "#DDD" : "#AAA");
				ctx.beginPath();
				ctx.arc( p[0] * w, (1.0 - p[1]) * h, 2, 0, Math.PI * 2 );
				ctx.fill();
			}
		ctx.restore();
	}

	//localpos is mouse in curve editor space
	CurveEditor.prototype.onMouseDown = function( localpos, graphcanvas )
	{
		var points = this.points;
		if(!points)
			return;
		if( localpos[1] < 0 )
			return;

		//this.captureInput(true);
		var w = this.size[0] - this.margin * 2;
		var h = this.size[1] - this.margin * 2;
		var x = localpos[0] - this.margin;
		var y = localpos[1] - this.margin;
		var pos = [x,y];
		var max_dist = 30 / graphcanvas.ds.scale;
		//search closer one
		this.selected = this.getCloserPoint(pos, max_dist);
		//create one
		if(this.selected == -1)
		{
			var point = [x / w, 1 - y / h];
			points.push(point);
			points.sort(function(a,b){ return a[0] - b[0]; });
			this.selected = points.indexOf(point);
			this.must_update = true;
		}
		if(this.selected != -1)
			return true;
	}

	CurveEditor.prototype.onMouseMove = function( localpos, graphcanvas )
	{
		var points = this.points;
		if(!points)
			return;
		var s = this.selected;
		if(s < 0)
			return;
		var x = (localpos[0] - this.margin) / (this.size[0] - this.margin * 2 );
		var y = (localpos[1] - this.margin) / (this.size[1] - this.margin * 2 );
		var curvepos = [(localpos[0] - this.margin),(localpos[1] - this.margin)];
		var max_dist = 30 / graphcanvas.ds.scale;
		this._nearest = this.getCloserPoint(curvepos, max_dist);
		var point = points[s];
		if(point)
		{
			var is_edge_point = s == 0 || s == points.length - 1;
			if( !is_edge_point && (localpos[0] < -10 || localpos[0] > this.size[0] + 10 || localpos[1] < -10 || localpos[1] > this.size[1] + 10) )
			{
				points.splice(s,1);
				this.selected = -1;
				return;
			}
			if( !is_edge_point ) //not edges
				point[0] = Math.clamp(x,0,1);
			else
				point[0] = s == 0 ? 0 : 1;
			point[1] = 1.0 - Math.clamp(y,0,1);
			points.sort(function(a,b){ return a[0] - b[0]; });
			this.selected = points.indexOf(point);
			this.must_update = true;
		}
	}

	CurveEditor.prototype.onMouseUp = function( localpos, graphcanvas )
	{
		this.selected = -1;
		return false;
	}

	CurveEditor.prototype.getCloserPoint = function(pos, max_dist)
	{
		var points = this.points;
		if(!points)
			return -1;
		max_dist = max_dist || 30;
		var w = (this.size[0] - this.margin * 2);
		var h = (this.size[1] - this.margin * 2);
		var num = points.length;
		var p2 = [0,0];
		var min_dist = 1000000;
		var closest = -1;
		var last_valid = -1;
		for(var i = 0; i < num; ++i)
		{
			var p = points[i];
			p2[0] = p[0] * w;
			p2[1] = (1.0 - p[1]) * h;
			if(p2[0] < pos[0])
				last_valid = i;
			var dist = vec2.distance(pos,p2);
			if(dist > min_dist || dist > max_dist)
				continue;
			closest = i;
			min_dist = dist;
		}
		return closest;
	}

	LiteGraph.CurveEditor = CurveEditor;

    //used to create nodes from wrapping functions
    LiteGraph.getParameterNames = function(func) {
        return (func + "")
            .replace(/[/][/].*$/gm, "") // strip single-line comments
            .replace(/\s+/g, "") // strip white space
            .replace(/[/][*][^/*]*[*][/]/g, "") // strip multi-line comments  /**/
            .split("){", 1)[0]
            .replace(/^[^(]*[(]/, "") // extract the parameters
            .replace(/=[^,]+/g, "") // strip any ES6 defaults
            .split(",")
            .filter(Boolean); // split & filter [""]
    };

    Math.clamp = function(v, a, b) {
        return a > v ? a : b < v ? b : v;
    };

    if (typeof window != "undefined" && !window["requestAnimationFrame"]) {
        window.requestAnimationFrame =
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function(callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    }
})(this);

if (typeof exports != "undefined") {
    exports.LiteGraph = this.LiteGraph;
}

//basic nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    //Constant
    function Time() {
        this.addOutput("in ms", "number");
        this.addOutput("in sec", "number");
    }

    Time.title = "Time";
    Time.desc = "Time";

    Time.prototype.onExecute = function() {
        this.setOutputData(0, this.graph.globaltime * 1000);
        this.setOutputData(1, this.graph.globaltime);
    };

    LiteGraph.registerNodeType("basic/time", Time);

    //Subgraph: a node that contains a graph
    function Subgraph() {
        var that = this;
        this.size = [140, 80];
        this.properties = { enabled: true };
        this.enabled = true;

        //create inner graph
        this.subgraph = new LiteGraph.LGraph();
        this.subgraph._subgraph_node = this;
        this.subgraph._is_subgraph = true;

        this.subgraph.onTrigger = this.onSubgraphTrigger.bind(this);

		//nodes input node added inside
        this.subgraph.onInputAdded = this.onSubgraphNewInput.bind(this);
        this.subgraph.onInputRenamed = this.onSubgraphRenamedInput.bind(this);
        this.subgraph.onInputTypeChanged = this.onSubgraphTypeChangeInput.bind(this);
        this.subgraph.onInputRemoved = this.onSubgraphRemovedInput.bind(this);

        this.subgraph.onOutputAdded = this.onSubgraphNewOutput.bind(this);
        this.subgraph.onOutputRenamed = this.onSubgraphRenamedOutput.bind(this);
        this.subgraph.onOutputTypeChanged = this.onSubgraphTypeChangeOutput.bind(this);
        this.subgraph.onOutputRemoved = this.onSubgraphRemovedOutput.bind(this);
    }

    Subgraph.title = "Subgraph";
    Subgraph.desc = "Graph inside a node";
    Subgraph.title_color = "#334";

    Subgraph.prototype.onGetInputs = function() {
        return [["enabled", "boolean"]];
    };

	/*
    Subgraph.prototype.onDrawTitle = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        ctx.fillStyle = "#555";
        var w = LiteGraph.NODE_TITLE_HEIGHT;
        var x = this.size[0] - w;
        ctx.fillRect(x, -w, w, w);
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.2, -w * 0.6);
        ctx.lineTo(x + w * 0.8, -w * 0.6);
        ctx.lineTo(x + w * 0.5, -w * 0.3);
        ctx.fill();
    };
	*/

    Subgraph.prototype.onDblClick = function(e, pos, graphcanvas) {
        var that = this;
        setTimeout(function() {
            graphcanvas.openSubgraph(that.subgraph);
        }, 10);
    };

	/*
    Subgraph.prototype.onMouseDown = function(e, pos, graphcanvas) {
        if (
            !this.flags.collapsed &&
            pos[0] > this.size[0] - LiteGraph.NODE_TITLE_HEIGHT &&
            pos[1] < 0
        ) {
            var that = this;
            setTimeout(function() {
                graphcanvas.openSubgraph(that.subgraph);
            }, 10);
        }
    };
	*/

    Subgraph.prototype.onAction = function(action, param) {
        this.subgraph.onAction(action, param);
    };

    Subgraph.prototype.onExecute = function() {
        this.enabled = this.getInputOrProperty("enabled");
        if (!this.enabled) {
            return;
        }

        //send inputs to subgraph global inputs
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var value = this.getInputData(i);
                this.subgraph.setInputData(input.name, value);
            }
        }

        //execute
        this.subgraph.runStep();

        //send subgraph global outputs to outputs
        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                var value = this.subgraph.getOutputData(output.name);
                this.setOutputData(i, value);
            }
        }
    };

    Subgraph.prototype.sendEventToAllNodes = function(eventname, param, mode) {
        if (this.enabled) {
            this.subgraph.sendEventToAllNodes(eventname, param, mode);
        }
    };

	Subgraph.prototype.onDrawBackground = function(ctx, graphcanvas, canvas, pos)
	{
		if(this.flags.collapsed)
			return;

		var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;

		//button
		var over = LiteGraph.isInsideRectangle(pos[0],pos[1],this.pos[0],this.pos[1] + y,this.size[0],LiteGraph.NODE_TITLE_HEIGHT);
		ctx.fillStyle = over ? "#555" : "#222";
		ctx.beginPath();
		if (this._shape == LiteGraph.BOX_SHAPE)
			ctx.rect(0, y, this.size[0]+1, LiteGraph.NODE_TITLE_HEIGHT);
		else
			ctx.roundRect( 0, y, this.size[0]+1, LiteGraph.NODE_TITLE_HEIGHT, 0, 8);
		ctx.fill();

		//button
		ctx.textAlign = "center";
		ctx.font = "24px Arial";
		ctx.fillStyle = over ? "#DDD" : "#999";
		ctx.fillText( "+", this.size[0] * 0.5, y + 24 );
	}

	Subgraph.prototype.onMouseDown = function(e, localpos, graphcanvas)
	{
		var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
		if(localpos[1] > y)
		{
			graphcanvas.showSubgraphPropertiesDialog(this);
		}
	}

	Subgraph.prototype.computeSize = function()
	{
		var num_inputs = this.inputs ? this.inputs.length : 0;
		var num_outputs = this.outputs ? this.outputs.length : 0;
		return [ 200, Math.max(num_inputs,num_outputs) * LiteGraph.NODE_SLOT_HEIGHT + LiteGraph.NODE_TITLE_HEIGHT ];
	}

    //**** INPUTS ***********************************
    Subgraph.prototype.onSubgraphTrigger = function(event, param) {
        var slot = this.findOutputSlot(event);
        if (slot != -1) {
            this.triggerSlot(slot);
        }
    };

    Subgraph.prototype.onSubgraphNewInput = function(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            //add input to the node
            this.addInput(name, type);
        }
    };

    Subgraph.prototype.onSubgraphRenamedInput = function(oldname, name) {
        var slot = this.findInputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.name = name;
    };

    Subgraph.prototype.onSubgraphTypeChangeInput = function(name, type) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getInputInfo(slot);
        info.type = type;
    };

    Subgraph.prototype.onSubgraphRemovedInput = function(name) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeInput(slot);
    };

    //**** OUTPUTS ***********************************
    Subgraph.prototype.onSubgraphNewOutput = function(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            this.addOutput(name, type);
        }
    };

    Subgraph.prototype.onSubgraphRenamedOutput = function(oldname, name) {
        var slot = this.findOutputSlot(oldname);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.name = name;
    };

    Subgraph.prototype.onSubgraphTypeChangeOutput = function(name, type) {
        var slot = this.findOutputSlot(name);
        if (slot == -1) {
            return;
        }
        var info = this.getOutputInfo(slot);
        info.type = type;
    };

    Subgraph.prototype.onSubgraphRemovedOutput = function(name) {
        var slot = this.findInputSlot(name);
        if (slot == -1) {
            return;
        }
        this.removeOutput(slot);
    };
    // *****************************************************

    Subgraph.prototype.getExtraMenuOptions = function(graphcanvas) {
        var that = this;
        return [
            {
                content: "Open",
                callback: function() {
                    graphcanvas.openSubgraph(that.subgraph);
                }
            }
        ];
    };

    Subgraph.prototype.onResize = function(size) {
        size[1] += 20;
    };

    Subgraph.prototype.serialize = function() {
        var data = LiteGraph.LGraphNode.prototype.serialize.call(this);
        data.subgraph = this.subgraph.serialize();
        return data;
    };
    //no need to define node.configure, the default method detects node.subgraph and passes the object to node.subgraph.configure()

    Subgraph.prototype.clone = function() {
        var node = LiteGraph.createNode(this.type);
        var data = this.serialize();
        delete data["id"];
        delete data["inputs"];
        delete data["outputs"];
        node.configure(data);
        return node;
    };

	Subgraph.prototype.buildFromNodes = function(nodes)
	{
		//clear all?
		//TODO

		//nodes that connect data between parent graph and subgraph
		var subgraph_inputs = [];
		var subgraph_outputs = [];

		//mark inner nodes
		var ids = {};
		var min_x = 0;
		var max_x = 0;
		for(var i = 0; i < nodes.length; ++i)
		{
			var node = nodes[i];
			ids[ node.id ] = node;
			min_x = Math.min( node.pos[0], min_x );
			max_x = Math.max( node.pos[0], min_x );
		}
		
		var last_input_y = 0;
		var last_output_y = 0;

		for(var i = 0; i < nodes.length; ++i)
		{
			var node = nodes[i];
			//check inputs
			if( node.inputs )
				for(var j = 0; j < node.inputs.length; ++j)
				{
					var input = node.inputs[j];
					if( !input || !input.link )
						continue;
					var link = node.graph.links[ input.link ];
					if(!link)
						continue;
					if( ids[ link.origin_id ] )
						continue;
					//this.addInput(input.name,link.type);
					this.subgraph.addInput(input.name,link.type);
					/*
					var input_node = LiteGraph.createNode("graph/input");
					this.subgraph.add( input_node );
					input_node.pos = [min_x - 200, last_input_y ];
					last_input_y += 100;
					*/
				}

			//check outputs
			if( node.outputs )
				for(var j = 0; j < node.outputs.length; ++j)
				{
					var output = node.outputs[j];
					if( !output || !output.links || !output.links.length )
						continue;
					var is_external = false;
					for(var k = 0; k < output.links.length; ++k)
					{
						var link = node.graph.links[ output.links[k] ];
						if(!link)
							continue;
						if( ids[ link.target_id ] )
							continue;
						is_external = true;
						break;
					}
					if(!is_external)
						continue;
					//this.addOutput(output.name,output.type);
					/*
					var output_node = LiteGraph.createNode("graph/output");
					this.subgraph.add( output_node );
					output_node.pos = [max_x + 50, last_output_y ];
					last_output_y += 100;
					*/
				}
		}

		//detect inputs and outputs
			//split every connection in two data_connection nodes
			//keep track of internal connections
			//connect external connections

		//clone nodes inside subgraph and try to reconnect them

		//connect edge subgraph nodes to extarnal connections nodes
	}

    LiteGraph.Subgraph = Subgraph;
    LiteGraph.registerNodeType("graph/subgraph", Subgraph);

    //Input for a subgraph
    function GraphInput() {
        this.addOutput("", "number");

        this.name_in_graph = "";
        this.properties = {
			name: "",
			type: "number",
			value: 0
		}; 

        var that = this;

        this.name_widget = this.addWidget(
            "text",
            "Name",
            this.properties.name,
            function(v) {
                if (!v) {
                    return;
                }
                that.setProperty("name",v);
            }
        );
        this.type_widget = this.addWidget(
            "text",
            "Type",
            this.properties.type,
            function(v) {
				that.setProperty("type",v);
            }
        );

        this.value_widget = this.addWidget(
            "number",
            "Value",
            this.properties.value,
            function(v) {
                that.setProperty("value",v);
            }
        );

        this.widgets_up = true;
        this.size = [180, 90];
    }

    GraphInput.title = "Input";
    GraphInput.desc = "Input of the graph";

	GraphInput.prototype.onConfigure = function()
	{
		this.updateType();
	}

	//ensures the type in the node output and the type in the associated graph input are the same
	GraphInput.prototype.updateType = function()
	{
		var type = this.properties.type;
		this.type_widget.value = type;

		//update output
		if(this.outputs[0].type != type)
		{
	        if (!LiteGraph.isValidConnection(this.outputs[0].type,type))
				this.disconnectOutput(0);
			this.outputs[0].type = type;
		}

		//update widget
		if(type == "number")
		{
			this.value_widget.type = "number";
			this.value_widget.value = 0;
		}
		else if(type == "boolean")
		{
			this.value_widget.type = "toggle";
			this.value_widget.value = true;
		}
		else if(type == "string")
		{
			this.value_widget.type = "text";
			this.value_widget.value = "";
		}
		else
		{
			this.value_widget.type = null;
			this.value_widget.value = null;
		}
		this.properties.value = this.value_widget.value;

		//update graph
		if (this.graph && this.name_in_graph) {
			this.graph.changeInputType(this.name_in_graph, type);
		}
	}

	//this is executed AFTER the property has changed
	GraphInput.prototype.onPropertyChanged = function(name,v)
	{
		if( name == "name" )
		{
			if (v == "" || v == this.name_in_graph || v == "enabled") {
				return false;
			}
			if(this.graph)
			{
				if (this.name_in_graph) {
					//already added
					this.graph.renameInput( this.name_in_graph, v );
				} else {
					this.graph.addInput( v, this.properties.type );
				}
			} //what if not?!
			this.name_widget.value = v;
			this.name_in_graph = v;
		}
		else if( name == "type" )
		{
			this.updateType();
		}
		else if( name == "value" )
		{
		}
	}

    GraphInput.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    };

    GraphInput.prototype.onAction = function(action, param) {
        if (this.properties.type == LiteGraph.EVENT) {
            this.triggerSlot(0, param);
        }
    };

    GraphInput.prototype.onExecute = function() {
        var name = this.properties.name;
        //read from global input
        var data = this.graph.inputs[name];
        if (!data) {
            this.setOutputData(0, this.properties.value );
			return;
        }

        this.setOutputData(0, data.value !== undefined ? data.value : this.properties.value );
    };

    GraphInput.prototype.onRemoved = function() {
        if (this.name_in_graph) {
            this.graph.removeInput(this.name_in_graph);
        }
    };

    LiteGraph.GraphInput = GraphInput;
    LiteGraph.registerNodeType("graph/input", GraphInput);

    //Output for a subgraph
    function GraphOutput() {
        this.addInput("", "");

        this.name_in_graph = "";
        this.properties = {};
        var that = this;

        Object.defineProperty(this.properties, "name", {
            get: function() {
                return that.name_in_graph;
            },
            set: function(v) {
                if (v == "" || v == that.name_in_graph) {
                    return;
                }
                if (that.name_in_graph) {
                    //already added
                    that.graph.renameOutput(that.name_in_graph, v);
                } else {
                    that.graph.addOutput(v, that.properties.type);
                }
                that.name_widget.value = v;
                that.name_in_graph = v;
            },
            enumerable: true
        });

        Object.defineProperty(this.properties, "type", {
            get: function() {
                return that.inputs[0].type;
            },
            set: function(v) {
                if (v == "action" || v == "event") {
                    v = LiteGraph.ACTION;
                }
		        if (!LiteGraph.isValidConnection(that.inputs[0].type,v))
					that.disconnectInput(0);
                that.inputs[0].type = v;
                if (that.name_in_graph) {
                    //already added
                    that.graph.changeOutputType(
                        that.name_in_graph,
                        that.inputs[0].type
                    );
                }
                that.type_widget.value = v || "";
            },
            enumerable: true
        });

        this.name_widget = this.addWidget("text","Name",this.properties.name,"name");
        this.type_widget = this.addWidget("text","Type",this.properties.type,"type");
        this.widgets_up = true;
        this.size = [180, 60];
    }

    GraphOutput.title = "Output";
    GraphOutput.desc = "Output of the graph";

    GraphOutput.prototype.onExecute = function() {
        this._value = this.getInputData(0);
        this.graph.setOutputData(this.properties.name, this._value);
    };

    GraphOutput.prototype.onAction = function(action, param) {
        if (this.properties.type == LiteGraph.ACTION) {
            this.graph.trigger(this.properties.name, param);
        }
    };

    GraphOutput.prototype.onRemoved = function() {
        if (this.name_in_graph) {
            this.graph.removeOutput(this.name_in_graph);
        }
    };

    GraphOutput.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.name;
        }
        return this.title;
    };

    LiteGraph.GraphOutput = GraphOutput;
    LiteGraph.registerNodeType("graph/output", GraphOutput);

    //Constant
    function ConstantNumber() {
        this.addOutput("value", "number");
        this.addProperty("value", 1.0);
        this.widget = this.addWidget("number","value",1,"value");
        this.widgets_up = true;
        this.size = [180, 30];
    }

    ConstantNumber.title = "Const Number";
    ConstantNumber.desc = "Constant number";

    ConstantNumber.prototype.onExecute = function() {
        this.setOutputData(0, parseFloat(this.properties["value"]));
    };

    ConstantNumber.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.value;
        }
        return this.title;
    };

	ConstantNumber.prototype.setValue = function(v)
	{
		this.setProperty("value",v);
	}

    ConstantNumber.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = this.properties["value"].toFixed(3);
    };

    LiteGraph.registerNodeType("basic/const", ConstantNumber);

    function ConstantBoolean() {
        this.addOutput("", "boolean");
        this.addProperty("value", true);
        this.widget = this.addWidget("toggle","value",true,"value");
        this.widgets_up = true;
        this.size = [140, 30];
    }

    ConstantBoolean.title = "Const Boolean";
    ConstantBoolean.desc = "Constant boolean";
    ConstantBoolean.prototype.getTitle = ConstantNumber.prototype.getTitle;

    ConstantBoolean.prototype.onExecute = function() {
        this.setOutputData(0, this.properties["value"]);
    };

	ConstantBoolean.prototype.setValue = ConstantNumber.prototype.setValue;

	ConstantBoolean.prototype.onGetInputs = function() {
		return [["toggle", LiteGraph.ACTION]];
	};

	ConstantBoolean.prototype.onAction = function(action)
	{
		this.setValue( !this.properties.value );
	}

    LiteGraph.registerNodeType("basic/boolean", ConstantBoolean);

    function ConstantString() {
        this.addOutput("", "string");
        this.addProperty("value", "");
        this.widget = this.addWidget("text","value","","value");  //link to property value
        this.widgets_up = true;
        this.size = [180, 30];
    }

    ConstantString.title = "Const String";
    ConstantString.desc = "Constant string";

    ConstantString.prototype.getTitle = ConstantNumber.prototype.getTitle;

    ConstantString.prototype.onExecute = function() {
        this.setOutputData(0, this.properties["value"]);
    };

	ConstantString.prototype.setValue = ConstantNumber.prototype.setValue;

	ConstantString.prototype.onDropFile = function(file)
	{
		var that = this;
		var reader = new FileReader();
		reader.onload = function(e)
		{
			that.setProperty("value",e.target.result);
		}
		reader.readAsText(file);
	}

    LiteGraph.registerNodeType("basic/string", ConstantString);

    function ConstantFile() {
        this.addInput("url", "");
        this.addOutput("", "");
        this.addProperty("url", "");
        this.addProperty("type", "text");
        this.widget = this.addWidget("text","url","","url");
        this._data = null;
    }

    ConstantFile.title = "Const File";
    ConstantFile.desc = "Fetches a file from an url";
    ConstantFile["@type"] = { type: "enum", values: ["text","arraybuffer","blob","json"] };

    ConstantFile.prototype.onPropertyChanged = function(name, value) {
        if (name == "url")
		{
			if( value == null || value == "")
				this._data = null;
			else
			{
				this.fetchFile(value);
			}
		}
	}

    ConstantFile.prototype.onExecute = function() {
		var url = this.getInputData(0) || this.properties.url;
		if(url && (url != this._url || this._type != this.properties.type))
			this.fetchFile(url);
        this.setOutputData(0, this._data );
    };

	ConstantFile.prototype.setValue = ConstantNumber.prototype.setValue;

    ConstantFile.prototype.fetchFile = function(url) {
		var that = this;
		if(!url || url.constructor !== String)
		{
			that._data = null;
            that.boxcolor = null;
			return;
		}

		this._url = url;
		this._type = this.properties.type;
        if (url.substr(0, 4) == "http" && LiteGraph.proxy) {
            url = LiteGraph.proxy + url.substr(url.indexOf(":") + 3);
        }
		fetch(url)
		.then(function(response) {
			if(!response.ok)
				 throw new Error("File not found");

			if(that.properties.type == "arraybuffer")
				return response.arrayBuffer();
			else if(that.properties.type == "text")
				return response.text();
			else if(that.properties.type == "json")
				return response.json();
			else if(that.properties.type == "blob")
				return response.blob();
		})
		.then(function(data) {
			that._data = data;
            that.boxcolor = "#AEA";
		})
		.catch(function(error) {
			that._data = null;
            that.boxcolor = "red";
			console.error("error fetching file:",url);
		});
    };

	ConstantFile.prototype.onDropFile = function(file)
	{
		var that = this;
		this._url = file.name;
		this._type = this.properties.type;
		this.properties.url = file.name;
		var reader = new FileReader();
		reader.onload = function(e)
		{
            that.boxcolor = "#AEA";
			var v = e.target.result;
			if( that.properties.type == "json" )
				v = JSON.parse(v);
			that._data = v;
		}
		if(that.properties.type == "arraybuffer")
			reader.readAsArrayBuffer(file);
		else if(that.properties.type == "text" || that.properties.type == "json")
			reader.readAsText(file);
		else if(that.properties.type == "blob")
			return reader.readAsBinaryString(file);
	}

    LiteGraph.registerNodeType("basic/file", ConstantFile);

	//to store json objects
    function ConstantData() {
        this.addOutput("", "");
        this.addProperty("value", "");
        this.widget = this.addWidget("text","json","","value");
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;
    }

    ConstantData.title = "Const Data";
    ConstantData.desc = "Constant Data";

    ConstantData.prototype.onPropertyChanged = function(name, value) {
        this.widget.value = value;
        if (value == null || value == "") {
            return;
        }

        try {
            this._value = JSON.parse(value);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
        }
    };

    ConstantData.prototype.onExecute = function() {
        this.setOutputData(0, this._value);
    };

	ConstantData.prototype.setValue = ConstantNumber.prototype.setValue;

    LiteGraph.registerNodeType("basic/data", ConstantData);

	//to store json objects
    function ConstantArray() {
        this.addInput("", "");
        this.addOutput("", "array");
        this.addOutput("length", "number");
        this.addProperty("value", "");
        this.widget = this.addWidget("text","array","","value");
        this.widgets_up = true;
        this.size = [140, 50];
        this._value = null;
    }

    ConstantArray.title = "Const Array";
    ConstantArray.desc = "Constant Array";

    ConstantArray.prototype.onPropertyChanged = function(name, value) {
        this.widget.value = value;
        if (value == null || value == "") {
            return;
        }

        try {
			if(value[0] != "[")
	            this._value = JSON.parse("[" + value + "]");
			else
	            this._value = JSON.parse(value);
            this.boxcolor = "#AEA";
        } catch (err) {
            this.boxcolor = "red";
        }
    };

    ConstantArray.prototype.onExecute = function() {
        var v = this.getInputData(0);
		if(v && v.length) //clone
		{
			if(!this._value)
				this._value = new Array();
			this._value.length = v.length;
			for(var i = 0; i < v.length; ++i)
				this._value[i] = v[i];
		}
		this.setOutputData(0, this._value);
		this.setOutputData(1, this._value ? ( this._value.length || 0) : 0 );
    };

	ConstantArray.prototype.setValue = ConstantNumber.prototype.setValue;

    LiteGraph.registerNodeType("basic/array", ConstantArray);

    function ArrayElement() {
        this.addInput("array", "array,table,string");
        this.addInput("index", "number");
        this.addOutput("value", "");
		this.addProperty("index",0);
    }

    ArrayElement.title = "Array[i]";
    ArrayElement.desc = "Returns an element from an array";

    ArrayElement.prototype.onExecute = function() {
        var array = this.getInputData(0);
        var index = this.getInputData(1);
		if(index == null)
			index = this.properties.index;
		if(array == null || index == null )
			return;
        this.setOutputData(0, array[Math.floor(Number(index))] );
    };

    LiteGraph.registerNodeType("basic/array[]", ArrayElement);



    function TableElement() {
        this.addInput("table", "table");
        this.addInput("row", "number");
        this.addInput("col", "number");
        this.addOutput("value", "");
		this.addProperty("row",0);
		this.addProperty("column",0);
    }

    TableElement.title = "Table[row][col]";
    TableElement.desc = "Returns an element from a table";

    TableElement.prototype.onExecute = function() {
        var table = this.getInputData(0);
        var row = this.getInputData(1);
        var col = this.getInputData(2);
		if(row == null)
			row = this.properties.row;
		if(col == null)
			col = this.properties.column;
		if(table == null || row == null || col == null)
			return;
		var row = table[Math.floor(Number(row))];
		if(row)
	        this.setOutputData(0, row[Math.floor(Number(col))] );
		else
	        this.setOutputData(0, null );
    };

    LiteGraph.registerNodeType("basic/table[][]", TableElement);

    function ObjectProperty() {
        this.addInput("obj", "");
        this.addOutput("", "");
        this.addProperty("value", "");
        this.widget = this.addWidget("text","prop.","",this.setValue.bind(this) );
        this.widgets_up = true;
        this.size = [140, 30];
        this._value = null;
    }

    ObjectProperty.title = "Object property";
    ObjectProperty.desc = "Outputs the property of an object";

    ObjectProperty.prototype.setValue = function(v) {
        this.properties.value = v;
        this.widget.value = v;
    };

    ObjectProperty.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return "in." + this.properties.value;
        }
        return this.title;
    };

    ObjectProperty.prototype.onPropertyChanged = function(name, value) {
        this.widget.value = value;
    };

    ObjectProperty.prototype.onExecute = function() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, data[this.properties.value]);
        }
    };

    LiteGraph.registerNodeType("basic/object_property", ObjectProperty);

    function ObjectKeys() {
        this.addInput("obj", "");
        this.addOutput("keys", "array");
        this.size = [140, 30];
    }

    ObjectKeys.title = "Object keys";
    ObjectKeys.desc = "Outputs an array with the keys of an object";

    ObjectKeys.prototype.onExecute = function() {
        var data = this.getInputData(0);
        if (data != null) {
            this.setOutputData(0, Object.keys(data) );
        }
    };

    LiteGraph.registerNodeType("basic/object_keys", ObjectKeys);

    function MergeObjects() {
        this.addInput("A", "object");
        this.addInput("B", "object");
        this.addOutput("", "object");
		this._result = {};
		var that = this;
		this.addWidget("button","clear","",function(){
			that._result = {};
		});
		this.size = this.computeSize();
    }

    MergeObjects.title = "Merge Objects";
    MergeObjects.desc = "Creates an object copying properties from others";

    MergeObjects.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
		var C = this._result;
		if(A)
			for(var i in A)
				C[i] = A[i];
		if(B)
			for(var i in B)
				C[i] = B[i];
		this.setOutputData(0,C);
    };

    LiteGraph.registerNodeType("basic/merge_objects", MergeObjects );

    //Store as variable
    function Variable() {
        this.size = [60, 30];
        this.addInput("in");
        this.addOutput("out");
		this.properties = { varname: "myname", container: Variable.LITEGRAPH };
        this.value = null;
    }

    Variable.title = "Variable";
    Variable.desc = "store/read variable value";

	Variable.LITEGRAPH = 0; //between all graphs
	Variable.GRAPH = 1;	//only inside this graph
	Variable.GLOBALSCOPE = 2;	//attached to Window

    Variable["@container"] = { type: "enum", values: {"litegraph":Variable.LITEGRAPH, "graph":Variable.GRAPH,"global": Variable.GLOBALSCOPE} };

    Variable.prototype.onExecute = function() {
		var container = this.getContainer();

		if(this.isInputConnected(0))
		{
			this.value = this.getInputData(0);
			container[ this.properties.varname ] = this.value;
			this.setOutputData(0, this.value );
			return;
		}

		this.setOutputData( 0, container[ this.properties.varname ] );
    };

	Variable.prototype.getContainer = function()
	{
		switch(this.properties.container)
		{
			case Variable.GRAPH:
				if(this.graph)
					return this.graph.vars;
				return {};
				break;
			case Variable.GLOBALSCOPE:
				return global;
				break;
			case Variable.LITEGRAPH:
			default:
				return LiteGraph.Globals;
				break;
		}
	}

    Variable.prototype.getTitle = function() {
        return this.properties.varname;
    };

    LiteGraph.registerNodeType("basic/variable", Variable);

    function length(v) {
        if(v && v.length != null)
			return Number(v.length);
		return 0;
    }

    LiteGraph.wrapFunctionAsNode(
        "basic/length",
        length,
        [""],
        "number"
    );

	function DownloadData() {
        this.size = [60, 30];
        this.addInput("data", 0 );
        this.addInput("download", LiteGraph.ACTION );
		this.properties = { filename: "data.json" };
        this.value = null;
		var that = this;
		this.addWidget("button","Download","", function(v){
			if(!that.value)
				return;
			that.downloadAsFile();
		});
    }

    DownloadData.title = "Download";
    DownloadData.desc = "Download some data";

	DownloadData.prototype.downloadAsFile = function()
	{
		if(this.value == null)
			return;

		var str = null;
		if(this.value.constructor === String)
			str = this.value;
		else
			str = JSON.stringify(this.value);

		var file = new Blob([str]);
		var url = URL.createObjectURL( file );
		var element = document.createElement("a");
		element.setAttribute('href', url);
		element.setAttribute('download', this.properties.filename );
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
		setTimeout( function(){ URL.revokeObjectURL( url ); }, 1000*60 ); //wait one minute to revoke url
	}

    DownloadData.prototype.onAction = function(action, param) {
		var that = this;
		setTimeout( function(){ that.downloadAsFile(); }, 100); //deferred to avoid blocking the renderer with the popup
	}

    DownloadData.prototype.onExecute = function() {
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    };

    DownloadData.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.filename;
        }
        return this.title;
    };

    LiteGraph.registerNodeType("basic/download", DownloadData);



    //Watch a value in the editor
    function Watch() {
        this.size = [60, 30];
        this.addInput("value", 0, { label: "" });
        this.value = 0;
    }

    Watch.title = "Watch";
    Watch.desc = "Show value of input";

    Watch.prototype.onExecute = function() {
        if (this.inputs[0]) {
            this.value = this.getInputData(0);
        }
    };

    Watch.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.inputs[0].label;
        }
        return this.title;
    };

    Watch.toString = function(o) {
        if (o == null) {
            return "null";
        } else if (o.constructor === Number) {
            return o.toFixed(3);
        } else if (o.constructor === Array) {
            var str = "[";
            for (var i = 0; i < o.length; ++i) {
                str += Watch.toString(o[i]) + (i + 1 != o.length ? "," : "");
            }
            str += "]";
            return str;
        } else {
            return String(o);
        }
    };

    Watch.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.inputs[0].label = Watch.toString(this.value);
    };

    LiteGraph.registerNodeType("basic/watch", Watch);

    //in case one type doesnt match other type but you want to connect them anyway
    function Cast() {
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.size = [40, 30];
    }

    Cast.title = "Cast";
    Cast.desc = "Allows to connect different types";

    Cast.prototype.onExecute = function() {
        this.setOutputData(0, this.getInputData(0));
    };

    LiteGraph.registerNodeType("basic/cast", Cast);

    //Show value inside the debug console
    function Console() {
        this.mode = LiteGraph.ON_EVENT;
        this.size = [80, 30];
        this.addProperty("msg", "");
        this.addInput("log", LiteGraph.EVENT);
        this.addInput("msg", 0);
    }

    Console.title = "Console";
    Console.desc = "Show value inside the console";

    Console.prototype.onAction = function(action, param) {
        if (action == "log") {
            console.log(param);
        } else if (action == "warn") {
            console.warn(param);
        } else if (action == "error") {
            console.error(param);
        }
    };

    Console.prototype.onExecute = function() {
        var msg = this.getInputData(1);
        if (msg !== null) {
            this.properties.msg = msg;
        }
        console.log(msg);
    };

    Console.prototype.onGetInputs = function() {
        return [
            ["log", LiteGraph.ACTION],
            ["warn", LiteGraph.ACTION],
            ["error", LiteGraph.ACTION]
        ];
    };

    LiteGraph.registerNodeType("basic/console", Console);

    //Show value inside the debug console
    function Alert() {
        this.mode = LiteGraph.ON_EVENT;
        this.addProperty("msg", "");
        this.addInput("", LiteGraph.EVENT);
        var that = this;
        this.widget = this.addWidget("text", "Text", "", function(v) {
            that.properties.msg = v;
        });
        this.widgets_up = true;
        this.size = [200, 30];
    }

    Alert.title = "Alert";
    Alert.desc = "Show an alert window";
    Alert.color = "#510";

    Alert.prototype.onConfigure = function(o) {
        this.widget.value = o.properties.msg;
    };

    Alert.prototype.onAction = function(action, param) {
        var msg = this.properties.msg;
        setTimeout(function() {
            alert(msg);
        }, 10);
    };

    LiteGraph.registerNodeType("basic/alert", Alert);

    //Execites simple code
    function NodeScript() {
        this.size = [60, 30];
        this.addProperty("onExecute", "return A;");
        this.addInput("A", "");
        this.addInput("B", "");
        this.addOutput("out", "");

        this._func = null;
        this.data = {};
    }

    NodeScript.prototype.onConfigure = function(o) {
        if (o.properties.onExecute && LiteGraph.allow_scripts)
            this.compileCode(o.properties.onExecute);
		else
			console.warn("Script not compiled, LiteGraph.allow_scripts is false");
    };

    NodeScript.title = "Script";
    NodeScript.desc = "executes a code (max 100 characters)";

    NodeScript.widgets_info = {
        onExecute: { type: "code" }
    };

    NodeScript.prototype.onPropertyChanged = function(name, value) {
        if (name == "onExecute" && LiteGraph.allow_scripts)
            this.compileCode(value);
		else
			console.warn("Script not compiled, LiteGraph.allow_scripts is false");
    };

    NodeScript.prototype.compileCode = function(code) {
        this._func = null;
        if (code.length > 256) {
            console.warn("Script too long, max 256 chars");
        } else {
            var code_low = code.toLowerCase();
            var forbidden_words = [
                "script",
                "body",
                "document",
                "eval",
                "nodescript",
                "function"
            ]; //bad security solution
            for (var i = 0; i < forbidden_words.length; ++i) {
                if (code_low.indexOf(forbidden_words[i]) != -1) {
                    console.warn("invalid script");
                    return;
                }
            }
            try {
                this._func = new Function("A", "B", "C", "DATA", "node", code);
            } catch (err) {
                console.error("Error parsing script");
                console.error(err);
            }
        }
    };

    NodeScript.prototype.onExecute = function() {
        if (!this._func) {
            return;
        }

        try {
            var A = this.getInputData(0);
            var B = this.getInputData(1);
            var C = this.getInputData(2);
            this.setOutputData(0, this._func(A, B, C, this.data, this));
        } catch (err) {
            console.error("Error in script");
            console.error(err);
        }
    };

    NodeScript.prototype.onGetOutputs = function() {
        return [["C", ""]];
    };

    LiteGraph.registerNodeType("basic/script", NodeScript);
})(this);

//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    //Show value inside the debug console
    function LogEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
    }

    LogEvent.title = "Log Event";
    LogEvent.desc = "Log event in console";

    LogEvent.prototype.onAction = function(action, param) {
        console.log(action, param);
    };

    LiteGraph.registerNodeType("events/log", LogEvent);

    //convert to Event if the value is true
    function TriggerEvent() {
        this.size = [60, 30];
        this.addInput("if", "");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
		this.properties = { only_on_change: true };
		this.prev = 0;
    }

    TriggerEvent.title = "TriggerEvent";
    TriggerEvent.desc = "Triggers event if input evaluates to true";

    TriggerEvent.prototype.onExecute = function(action, param) {
		var v = this.getInputData(0);
		var changed = (v != this.prev);
		if(this.prev === 0)
			changed = false;
		var must_resend = (changed && this.properties.only_on_change) || (!changed && !this.properties.only_on_change);
		if(v && must_resend )
	        this.triggerSlot(0, param);
		if(!v && must_resend)
	        this.triggerSlot(2, param);
		if(changed)
	        this.triggerSlot(1, param);
		this.prev = v;
    };

    LiteGraph.registerNodeType("events/trigger", TriggerEvent);

    //Sequencer for events
    function Sequencer() {
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addInput("", LiteGraph.ACTION);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", LiteGraph.EVENT);
        this.size = [120, 30];
        this.flags = { horizontal: true, render_box: false };
    }

    Sequencer.title = "Sequencer";
    Sequencer.desc = "Trigger events when an event arrives";

    Sequencer.prototype.getTitle = function() {
        return "";
    };

    Sequencer.prototype.onAction = function(action, param) {
        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; ++i) {
                this.triggerSlot(i, param);
            }
        }
    };

    LiteGraph.registerNodeType("events/sequencer", Sequencer);

    //Filter events
    function FilterEvent() {
        this.size = [60, 30];
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("event", LiteGraph.EVENT);
        this.properties = {
            equal_to: "",
            has_property: "",
            property_equal_to: ""
        };
    }

    FilterEvent.title = "Filter Event";
    FilterEvent.desc = "Blocks events that do not match the filter";

    FilterEvent.prototype.onAction = function(action, param) {
        if (param == null) {
            return;
        }

        if (this.properties.equal_to && this.properties.equal_to != param) {
            return;
        }

        if (this.properties.has_property) {
            var prop = param[this.properties.has_property];
            if (prop == null) {
                return;
            }

            if (
                this.properties.property_equal_to &&
                this.properties.property_equal_to != prop
            ) {
                return;
            }
        }

        this.triggerSlot(0, param);
    };

    LiteGraph.registerNodeType("events/filter", FilterEvent);


    function EventBranch() {
        this.addInput("in", LiteGraph.ACTION);
        this.addInput("cond", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.size = [120, 60];
		this._value = false;
    }

    EventBranch.title = "Branch";
    EventBranch.desc = "If condition is true, outputs triggers true, otherwise false";

    EventBranch.prototype.onExecute = function() {
		this._value = this.getInputData(1);
	}

    EventBranch.prototype.onAction = function(action, param) {
		this.triggerSlot(this._value ? 0 : 1);
	}

    LiteGraph.registerNodeType("events/branch", EventBranch);

    //Show value inside the debug console
    function EventCounter() {
        this.addInput("inc", LiteGraph.ACTION);
        this.addInput("dec", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("change", LiteGraph.EVENT);
        this.addOutput("num", "number");
        this.num = 0;
    }

    EventCounter.title = "Counter";
    EventCounter.desc = "Counts events";

    EventCounter.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return String(this.num);
        }
        return this.title;
    };

    EventCounter.prototype.onAction = function(action, param) {
        var v = this.num;
        if (action == "inc") {
            this.num += 1;
        } else if (action == "dec") {
            this.num -= 1;
        } else if (action == "reset") {
            this.num = 0;
        }
        if (this.num != v) {
            this.trigger("change", this.num);
        }
    };

    EventCounter.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AAA";
        ctx.font = "20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(this.num, this.size[0] * 0.5, this.size[1] * 0.5);
    };

    EventCounter.prototype.onExecute = function() {
        this.setOutputData(1, this.num);
    };

    LiteGraph.registerNodeType("events/counter", EventCounter);

    //Show value inside the debug console
    function DelayEvent() {
        this.size = [60, 30];
        this.addProperty("time_in_ms", 1000);
        this.addInput("event", LiteGraph.ACTION);
        this.addOutput("on_time", LiteGraph.EVENT);

        this._pending = [];
    }

    DelayEvent.title = "Delay";
    DelayEvent.desc = "Delays one event";

    DelayEvent.prototype.onAction = function(action, param) {
        var time = this.properties.time_in_ms;
        if (time <= 0) {
            this.trigger(null, param);
        } else {
            this._pending.push([time, param]);
        }
    };

    DelayEvent.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time * 1000; //in ms

        if (this.isInputConnected(1)) {
            this.properties.time_in_ms = this.getInputData(1);
        }

        for (var i = 0; i < this._pending.length; ++i) {
            var action = this._pending[i];
            action[0] -= dt;
            if (action[0] > 0) {
                continue;
            }

            //remove
            this._pending.splice(i, 1);
            --i;

            //trigger
            this.trigger(null, action[1]);
        }
    };

    DelayEvent.prototype.onGetInputs = function() {
        return [["event", LiteGraph.ACTION], ["time_in_ms", "number"]];
    };

    LiteGraph.registerNodeType("events/delay", DelayEvent);

    //Show value inside the debug console
    function TimerEvent() {
        this.addProperty("interval", 1000);
        this.addProperty("event", "tick");
        this.addOutput("on_tick", LiteGraph.EVENT);
        this.time = 0;
        this.last_interval = 1000;
        this.triggered = false;
    }

    TimerEvent.title = "Timer";
    TimerEvent.desc = "Sends an event every N milliseconds";

    TimerEvent.prototype.onStart = function() {
        this.time = 0;
    };

    TimerEvent.prototype.getTitle = function() {
        return "Timer: " + this.last_interval.toString() + "ms";
    };

    TimerEvent.on_color = "#AAA";
    TimerEvent.off_color = "#222";

    TimerEvent.prototype.onDrawBackground = function() {
        this.boxcolor = this.triggered
            ? TimerEvent.on_color
            : TimerEvent.off_color;
        this.triggered = false;
    };

    TimerEvent.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time * 1000; //in ms

        var trigger = this.time == 0;

        this.time += dt;
        this.last_interval = Math.max(
            1,
            this.getInputOrProperty("interval") | 0
        );

        if (
            !trigger &&
            (this.time < this.last_interval || isNaN(this.last_interval))
        ) {
            if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
                this.setOutputData(1, false);
            }
            return;
        }

        this.triggered = true;
        this.time = this.time % this.last_interval;
        this.trigger("on_tick", this.properties.event);
        if (this.inputs && this.inputs.length > 1 && this.inputs[1]) {
            this.setOutputData(1, true);
        }
    };

    TimerEvent.prototype.onGetInputs = function() {
        return [["interval", "number"]];
    };

    TimerEvent.prototype.onGetOutputs = function() {
        return [["tick", "boolean"]];
    };

    LiteGraph.registerNodeType("events/timer", TimerEvent);

    function DataStore() {
        this.addInput("data", "");
        this.addInput("assign", LiteGraph.ACTION);
        this.addOutput("data", "");
		this._last_value = null;
		this.properties = { data: null, serialize: true };
		var that = this;
		this.addWidget("button","store","",function(){
			that.properties.data = that._last_value;
		});
    }

    DataStore.title = "Data Store";
    DataStore.desc = "Stores data and only changes when event is received";

	DataStore.prototype.onExecute = function()
	{
		this._last_value = this.getInputData(0);
		this.setOutputData(0, this.properties.data );
	}

    DataStore.prototype.onAction = function(action, param) {
		this.properties.data = this._last_value;
    };

	DataStore.prototype.onSerialize = function(o)
	{
		if(o.data == null)
			return;
		if(this.properties.serialize == false || (o.data.constructor !== String && o.data.constructor !== Number && o.data.constructor !== Boolean && o.data.constructor !== Array && o.data.constructor !== Object ))
			o.data = null;
	}

    LiteGraph.registerNodeType("basic/data_store", DataStore);
})(this);

//widgets
(function(global) {
    var LiteGraph = global.LiteGraph;

    /* Button ****************/

    function WidgetButton() {
        this.addOutput("", LiteGraph.EVENT);
        this.addOutput("", "boolean");
        this.addProperty("text", "click me");
        this.addProperty("font_size", 30);
        this.addProperty("message", "");
        this.size = [164, 84];
        this.clicked = false;
    }

    WidgetButton.title = "Button";
    WidgetButton.desc = "Triggers an event";

    WidgetButton.font = "Arial";
    WidgetButton.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        var margin = 10;
        ctx.fillStyle = "black";
        ctx.fillRect(
            margin + 1,
            margin + 1,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );
        ctx.fillStyle = "#AAF";
        ctx.fillRect(
            margin - 1,
            margin - 1,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );
        ctx.fillStyle = this.clicked
            ? "white"
            : this.mouseOver
            ? "#668"
            : "#334";
        ctx.fillRect(
            margin,
            margin,
            this.size[0] - margin * 2,
            this.size[1] - margin * 2
        );

        if (this.properties.text || this.properties.text === 0) {
            var font_size = this.properties.font_size || 30;
            ctx.textAlign = "center";
            ctx.fillStyle = this.clicked ? "black" : "white";
            ctx.font = font_size + "px " + WidgetButton.font;
            ctx.fillText(
                this.properties.text,
                this.size[0] * 0.5,
                this.size[1] * 0.5 + font_size * 0.3
            );
            ctx.textAlign = "left";
        }
    };

    WidgetButton.prototype.onMouseDown = function(e, local_pos) {
        if (
            local_pos[0] > 1 &&
            local_pos[1] > 1 &&
            local_pos[0] < this.size[0] - 2 &&
            local_pos[1] < this.size[1] - 2
        ) {
            this.clicked = true;
            this.triggerSlot(0, this.properties.message);
            return true;
        }
    };

    WidgetButton.prototype.onExecute = function() {
        this.setOutputData(1, this.clicked);
    };

    WidgetButton.prototype.onMouseUp = function(e) {
        this.clicked = false;
    };

    LiteGraph.registerNodeType("widget/button", WidgetButton);

    function WidgetToggle() {
        this.addInput("", "boolean");
        this.addInput("e", LiteGraph.ACTION);
        this.addOutput("v", "boolean");
        this.addOutput("e", LiteGraph.EVENT);
        this.properties = { font: "", value: false };
        this.size = [160, 44];
    }

    WidgetToggle.title = "Toggle";
    WidgetToggle.desc = "Toggles between true or false";

    WidgetToggle.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        var size = this.size[1] * 0.5;
        var margin = 0.25;
        var h = this.size[1] * 0.8;
        ctx.font = this.properties.font || (size * 0.8).toFixed(0) + "px Arial";
        var w = ctx.measureText(this.title).width;
        var x = (this.size[0] - (w + size)) * 0.5;

        ctx.fillStyle = "#AAA";
        ctx.fillRect(x, h - size, size, size);

        ctx.fillStyle = this.properties.value ? "#AEF" : "#000";
        ctx.fillRect(
            x + size * margin,
            h - size + size * margin,
            size * (1 - margin * 2),
            size * (1 - margin * 2)
        );

        ctx.textAlign = "left";
        ctx.fillStyle = "#AAA";
        ctx.fillText(this.title, size * 1.2 + x, h * 0.85);
        ctx.textAlign = "left";
    };

    WidgetToggle.prototype.onAction = function(action) {
        this.properties.value = !this.properties.value;
        this.trigger("e", this.properties.value);
    };

    WidgetToggle.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != null) {
            this.properties.value = v;
        }
        this.setOutputData(0, this.properties.value);
    };

    WidgetToggle.prototype.onMouseDown = function(e, local_pos) {
        if (
            local_pos[0] > 1 &&
            local_pos[1] > 1 &&
            local_pos[0] < this.size[0] - 2 &&
            local_pos[1] < this.size[1] - 2
        ) {
            this.properties.value = !this.properties.value;
            this.graph._version++;
            this.trigger("e", this.properties.value);
            return true;
        }
    };

    LiteGraph.registerNodeType("widget/toggle", WidgetToggle);

    /* Number ****************/

    function WidgetNumber() {
        this.addOutput("", "number");
        this.size = [80, 60];
        this.properties = { min: -1000, max: 1000, value: 1, step: 1 };
        this.old_y = -1;
        this._remainder = 0;
        this._precision = 0;
        this.mouse_captured = false;
    }

    WidgetNumber.title = "Number";
    WidgetNumber.desc = "Widget to select number value";

    WidgetNumber.pixels_threshold = 10;
    WidgetNumber.markers_color = "#666";

    WidgetNumber.prototype.onDrawForeground = function(ctx) {
        var x = this.size[0] * 0.5;
        var h = this.size[1];
        if (h > 30) {
            ctx.fillStyle = WidgetNumber.markers_color;
            ctx.beginPath();
            ctx.moveTo(x, h * 0.1);
            ctx.lineTo(x + h * 0.1, h * 0.2);
            ctx.lineTo(x + h * -0.1, h * 0.2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, h * 0.9);
            ctx.lineTo(x + h * 0.1, h * 0.8);
            ctx.lineTo(x + h * -0.1, h * 0.8);
            ctx.fill();
            ctx.font = (h * 0.7).toFixed(1) + "px Arial";
        } else {
            ctx.font = (h * 0.8).toFixed(1) + "px Arial";
        }

        ctx.textAlign = "center";
        ctx.font = (h * 0.7).toFixed(1) + "px Arial";
        ctx.fillStyle = "#EEE";
        ctx.fillText(
            this.properties.value.toFixed(this._precision),
            x,
            h * 0.75
        );
    };

    WidgetNumber.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
    };

    WidgetNumber.prototype.onPropertyChanged = function(name, value) {
        var t = (this.properties.step + "").split(".");
        this._precision = t.length > 1 ? t[1].length : 0;
    };

    WidgetNumber.prototype.onMouseDown = function(e, pos) {
        if (pos[1] < 0) {
            return;
        }

        this.old_y = e.canvasY;
        this.captureInput(true);
        this.mouse_captured = true;

        return true;
    };

    WidgetNumber.prototype.onMouseMove = function(e) {
        if (!this.mouse_captured) {
            return;
        }

        var delta = this.old_y - e.canvasY;
        if (e.shiftKey) {
            delta *= 10;
        }
        if (e.metaKey || e.altKey) {
            delta *= 0.1;
        }
        this.old_y = e.canvasY;

        var steps = this._remainder + delta / WidgetNumber.pixels_threshold;
        this._remainder = steps % 1;
        steps = steps | 0;

        var v = Math.clamp(
            this.properties.value + steps * this.properties.step,
            this.properties.min,
            this.properties.max
        );
        this.properties.value = v;
        this.graph._version++;
        this.setDirtyCanvas(true);
    };

    WidgetNumber.prototype.onMouseUp = function(e, pos) {
        if (e.click_time < 200) {
            var steps = pos[1] > this.size[1] * 0.5 ? -1 : 1;
            this.properties.value = Math.clamp(
                this.properties.value + steps * this.properties.step,
                this.properties.min,
                this.properties.max
            );
            this.graph._version++;
            this.setDirtyCanvas(true);
        }

        if (this.mouse_captured) {
            this.mouse_captured = false;
            this.captureInput(false);
        }
    };

    LiteGraph.registerNodeType("widget/number", WidgetNumber);


    /* Combo ****************/

    function WidgetCombo() {
        this.addOutput("", "string");
        this.addOutput("change", LiteGraph.EVENT);
        this.size = [80, 60];
        this.properties = { value: "A", values:"A;B;C" };
        this.old_y = -1;
        this.mouse_captured = false;
		this._values = this.properties.values.split(";");
		var that = this;
        this.widgets_up = true;
		this.widget = this.addWidget("combo","", this.properties.value, function(v){
			that.properties.value = v;
            that.triggerSlot(1, v);
		}, { property: "value", values: this._values } );
    }

    WidgetCombo.title = "Combo";
    WidgetCombo.desc = "Widget to select from a list";

    WidgetCombo.prototype.onExecute = function() {
        this.setOutputData( 0, this.properties.value );
    };

    WidgetCombo.prototype.onPropertyChanged = function(name, value) {
		if(name == "values")
		{
			this._values = value.split(";");
			this.widget.options.values = this._values;
		}
		else if(name == "value")
		{
			this.widget.value = value;
		}
	};

    LiteGraph.registerNodeType("widget/combo", WidgetCombo);


    /* Knob ****************/

    function WidgetKnob() {
        this.addOutput("", "number");
        this.size = [64, 84];
        this.properties = {
            min: 0,
            max: 1,
            value: 0.5,
            color: "#7AF",
            precision: 2
        };
        this.value = -1;
    }

    WidgetKnob.title = "Knob";
    WidgetKnob.desc = "Circular controller";
    WidgetKnob.size = [80, 100];

    WidgetKnob.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        if (this.value == -1) {
            this.value =
                (this.properties.value - this.properties.min) /
                (this.properties.max - this.properties.min);
        }

        var center_x = this.size[0] * 0.5;
        var center_y = this.size[1] * 0.5;
        var radius = Math.min(this.size[0], this.size[1]) * 0.5 - 5;
        var w = Math.floor(radius * 0.05);

        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(center_x, center_y);
        ctx.rotate(Math.PI * 0.75);

        //bg
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
        ctx.fill();

        //value
        ctx.strokeStyle = "black";
        ctx.fillStyle = this.properties.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(
            0,
            0,
            radius - 4,
            0,
            Math.PI * 1.5 * Math.max(0.01, this.value)
        );
        ctx.closePath();
        ctx.fill();
        //ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
        ctx.restore();

        //inner
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(center_x, center_y, radius * 0.75, 0, Math.PI * 2, true);
        ctx.fill();

        //miniball
        ctx.fillStyle = this.mouseOver ? "white" : this.properties.color;
        ctx.beginPath();
        var angle = this.value * Math.PI * 1.5 + Math.PI * 0.75;
        ctx.arc(
            center_x + Math.cos(angle) * radius * 0.65,
            center_y + Math.sin(angle) * radius * 0.65,
            radius * 0.05,
            0,
            Math.PI * 2,
            true
        );
        ctx.fill();

        //text
        ctx.fillStyle = this.mouseOver ? "white" : "#AAA";
        ctx.font = Math.floor(radius * 0.5) + "px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
            this.properties.value.toFixed(this.properties.precision),
            center_x,
            center_y + radius * 0.15
        );
    };

    WidgetKnob.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
        this.boxcolor = LiteGraph.colorToString([
            this.value,
            this.value,
            this.value
        ]);
    };

    WidgetKnob.prototype.onMouseDown = function(e) {
        this.center = [this.size[0] * 0.5, this.size[1] * 0.5 + 20];
        this.radius = this.size[0] * 0.5;
        if (
            e.canvasY - this.pos[1] < 20 ||
            LiteGraph.distance(
                [e.canvasX, e.canvasY],
                [this.pos[0] + this.center[0], this.pos[1] + this.center[1]]
            ) > this.radius
        ) {
            return false;
        }
        this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
        this.captureInput(true);
        return true;
    };

    WidgetKnob.prototype.onMouseMove = function(e) {
        if (!this.oldmouse) {
            return;
        }

        var m = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];

        var v = this.value;
        v -= (m[1] - this.oldmouse[1]) * 0.01;
        if (v > 1.0) {
            v = 1.0;
        } else if (v < 0.0) {
            v = 0.0;
        }
        this.value = v;
        this.properties.value =
            this.properties.min +
            (this.properties.max - this.properties.min) * this.value;
        this.oldmouse = m;
        this.setDirtyCanvas(true);
    };

    WidgetKnob.prototype.onMouseUp = function(e) {
        if (this.oldmouse) {
            this.oldmouse = null;
            this.captureInput(false);
        }
    };

    WidgetKnob.prototype.onPropertyChanged = function(name, value) {
        if (name == "min" || name == "max" || name == "value") {
            this.properties[name] = parseFloat(value);
            return true; //block
        }
    };

    LiteGraph.registerNodeType("widget/knob", WidgetKnob);

    //Show value inside the debug console
    function WidgetSliderGUI() {
        this.addOutput("", "number");
        this.properties = {
            value: 0.5,
            min: 0,
            max: 1,
            text: "V"
        };
        var that = this;
        this.size = [140, 40];
        this.slider = this.addWidget(
            "slider",
            "V",
            this.properties.value,
            function(v) {
                that.properties.value = v;
            },
            this.properties
        );
        this.widgets_up = true;
    }

    WidgetSliderGUI.title = "Inner Slider";

    WidgetSliderGUI.prototype.onPropertyChanged = function(name, value) {
        if (name == "value") {
            this.slider.value = value;
        }
    };

    WidgetSliderGUI.prototype.onExecute = function() {
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("widget/internal_slider", WidgetSliderGUI);

    //Widget H SLIDER
    function WidgetHSlider() {
        this.size = [160, 26];
        this.addOutput("", "number");
        this.properties = { color: "#7AF", min: 0, max: 1, value: 0.5 };
        this.value = -1;
    }

    WidgetHSlider.title = "H.Slider";
    WidgetHSlider.desc = "Linear slider controller";

    WidgetHSlider.prototype.onDrawForeground = function(ctx) {
        if (this.value == -1) {
            this.value =
                (this.properties.value - this.properties.min) /
                (this.properties.max - this.properties.min);
        }

        //border
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.fillStyle = "#000";
        ctx.fillRect(2, 2, this.size[0] - 4, this.size[1] - 4);

        ctx.fillStyle = this.properties.color;
        ctx.beginPath();
        ctx.rect(4, 4, (this.size[0] - 8) * this.value, this.size[1] - 8);
        ctx.fill();
    };

    WidgetHSlider.prototype.onExecute = function() {
        this.properties.value =
            this.properties.min +
            (this.properties.max - this.properties.min) * this.value;
        this.setOutputData(0, this.properties.value);
        this.boxcolor = LiteGraph.colorToString([
            this.value,
            this.value,
            this.value
        ]);
    };

    WidgetHSlider.prototype.onMouseDown = function(e) {
        if (e.canvasY - this.pos[1] < 0) {
            return false;
        }

        this.oldmouse = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];
        this.captureInput(true);
        return true;
    };

    WidgetHSlider.prototype.onMouseMove = function(e) {
        if (!this.oldmouse) {
            return;
        }

        var m = [e.canvasX - this.pos[0], e.canvasY - this.pos[1]];

        var v = this.value;
        var delta = m[0] - this.oldmouse[0];
        v += delta / this.size[0];
        if (v > 1.0) {
            v = 1.0;
        } else if (v < 0.0) {
            v = 0.0;
        }

        this.value = v;

        this.oldmouse = m;
        this.setDirtyCanvas(true);
    };

    WidgetHSlider.prototype.onMouseUp = function(e) {
        this.oldmouse = null;
        this.captureInput(false);
    };

    WidgetHSlider.prototype.onMouseLeave = function(e) {
        //this.oldmouse = null;
    };

    LiteGraph.registerNodeType("widget/hslider", WidgetHSlider);

    function WidgetProgress() {
        this.size = [160, 26];
        this.addInput("", "number");
        this.properties = { min: 0, max: 1, value: 0, color: "#AAF" };
    }

    WidgetProgress.title = "Progress";
    WidgetProgress.desc = "Shows data in linear progress";

    WidgetProgress.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != undefined) {
            this.properties["value"] = v;
        }
    };

    WidgetProgress.prototype.onDrawForeground = function(ctx) {
        //border
        ctx.lineWidth = 1;
        ctx.fillStyle = this.properties.color;
        var v =
            (this.properties.value - this.properties.min) /
            (this.properties.max - this.properties.min);
        v = Math.min(1, v);
        v = Math.max(0, v);
        ctx.fillRect(2, 2, (this.size[0] - 4) * v, this.size[1] - 4);
    };

    LiteGraph.registerNodeType("widget/progress", WidgetProgress);

    function WidgetText() {
        this.addInputs("", 0);
        this.properties = {
            value: "...",
            font: "Arial",
            fontsize: 18,
            color: "#AAA",
            align: "left",
            glowSize: 0,
            decimals: 1
        };
    }

    WidgetText.title = "Text";
    WidgetText.desc = "Shows the input value";
    WidgetText.widgets = [
        { name: "resize", text: "Resize box", type: "button" },
        { name: "led_text", text: "LED", type: "minibutton" },
        { name: "normal_text", text: "Normal", type: "minibutton" }
    ];

    WidgetText.prototype.onDrawForeground = function(ctx) {
        //ctx.fillStyle="#000";
        //ctx.fillRect(0,0,100,60);
        ctx.fillStyle = this.properties["color"];
        var v = this.properties["value"];

        if (this.properties["glowSize"]) {
            ctx.shadowColor = this.properties.color;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = this.properties["glowSize"];
        } else {
            ctx.shadowColor = "transparent";
        }

        var fontsize = this.properties["fontsize"];

        ctx.textAlign = this.properties["align"];
        ctx.font = fontsize.toString() + "px " + this.properties["font"];
        this.str =
            typeof v == "number" ? v.toFixed(this.properties["decimals"]) : v;

        if (typeof this.str == "string") {
            var lines = this.str.split("\\n");
            for (var i=0; i < lines.length; i++) {
                ctx.fillText(
                    lines[i],
                    this.properties["align"] == "left" ? 15 : this.size[0] - 15,
                    fontsize * -0.15 + fontsize * (parseInt(i) + 1)
                );
            }
        }

        ctx.shadowColor = "transparent";
        this.last_ctx = ctx;
        ctx.textAlign = "left";
    };

    WidgetText.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v != null) {
            this.properties["value"] = v;
        }
        //this.setDirtyCanvas(true);
    };

    WidgetText.prototype.resize = function() {
        if (!this.last_ctx) {
            return;
        }

        var lines = this.str.split("\\n");
        this.last_ctx.font =
            this.properties["fontsize"] + "px " + this.properties["font"];
        var max = 0;
        for (var i=0; i < lines.length; i++) {
            var w = this.last_ctx.measureText(lines[i]).width;
            if (max < w) {
                max = w;
            }
        }
        this.size[0] = max + 20;
        this.size[1] = 4 + lines.length * this.properties["fontsize"];

        this.setDirtyCanvas(true);
    };

    WidgetText.prototype.onPropertyChanged = function(name, value) {
        this.properties[name] = value;
        this.str = typeof value == "number" ? value.toFixed(3) : value;
        //this.resize();
        return true;
    };

    LiteGraph.registerNodeType("widget/text", WidgetText);

    function WidgetPanel() {
        this.size = [200, 100];
        this.properties = {
            borderColor: "#ffffff",
            bgcolorTop: "#f0f0f0",
            bgcolorBottom: "#e0e0e0",
            shadowSize: 2,
            borderRadius: 3
        };
    }

    WidgetPanel.title = "Panel";
    WidgetPanel.desc = "Non interactive panel";
    WidgetPanel.widgets = [{ name: "update", text: "Update", type: "button" }];

    WidgetPanel.prototype.createGradient = function(ctx) {
        if (
            this.properties["bgcolorTop"] == "" ||
            this.properties["bgcolorBottom"] == ""
        ) {
            this.lineargradient = 0;
            return;
        }

        this.lineargradient = ctx.createLinearGradient(0, 0, 0, this.size[1]);
        this.lineargradient.addColorStop(0, this.properties["bgcolorTop"]);
        this.lineargradient.addColorStop(1, this.properties["bgcolorBottom"]);
    };

    WidgetPanel.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        if (this.lineargradient == null) {
            this.createGradient(ctx);
        }

        if (!this.lineargradient) {
            return;
        }

        ctx.lineWidth = 1;
        ctx.strokeStyle = this.properties["borderColor"];
        //ctx.fillStyle = "#ebebeb";
        ctx.fillStyle = this.lineargradient;

        if (this.properties["shadowSize"]) {
            ctx.shadowColor = "#000";
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = this.properties["shadowSize"];
        } else {
            ctx.shadowColor = "transparent";
        }

        ctx.roundRect(
            0,
            0,
            this.size[0] - 1,
            this.size[1] - 1,
            this.properties["shadowSize"]
        );
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.stroke();
    };

    LiteGraph.registerNodeType("widget/panel", WidgetPanel);
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    function GamepadInput() {
        this.addOutput("left_x_axis", "number");
        this.addOutput("left_y_axis", "number");
        this.addOutput("button_pressed", LiteGraph.EVENT);
        this.properties = { gamepad_index: 0, threshold: 0.1 };

        this._left_axis = new Float32Array(2);
        this._right_axis = new Float32Array(2);
        this._triggers = new Float32Array(2);
        this._previous_buttons = new Uint8Array(17);
        this._current_buttons = new Uint8Array(17);
    }

    GamepadInput.title = "Gamepad";
    GamepadInput.desc = "gets the input of the gamepad";

    GamepadInput.CENTER = 0;
    GamepadInput.LEFT = 1;
    GamepadInput.RIGHT = 2;
    GamepadInput.UP = 4;
    GamepadInput.DOWN = 8;

    GamepadInput.zero = new Float32Array(2);
    GamepadInput.buttons = [
        "a",
        "b",
        "x",
        "y",
        "lb",
        "rb",
        "lt",
        "rt",
        "back",
        "start",
        "ls",
        "rs",
        "home"
    ];

    GamepadInput.prototype.onExecute = function() {
        //get gamepad
        var gamepad = this.getGamepad();
        var threshold = this.properties.threshold || 0.0;

        if (gamepad) {
            this._left_axis[0] =
                Math.abs(gamepad.xbox.axes["lx"]) > threshold
                    ? gamepad.xbox.axes["lx"]
                    : 0;
            this._left_axis[1] =
                Math.abs(gamepad.xbox.axes["ly"]) > threshold
                    ? gamepad.xbox.axes["ly"]
                    : 0;
            this._right_axis[0] =
                Math.abs(gamepad.xbox.axes["rx"]) > threshold
                    ? gamepad.xbox.axes["rx"]
                    : 0;
            this._right_axis[1] =
                Math.abs(gamepad.xbox.axes["ry"]) > threshold
                    ? gamepad.xbox.axes["ry"]
                    : 0;
            this._triggers[0] =
                Math.abs(gamepad.xbox.axes["ltrigger"]) > threshold
                    ? gamepad.xbox.axes["ltrigger"]
                    : 0;
            this._triggers[1] =
                Math.abs(gamepad.xbox.axes["rtrigger"]) > threshold
                    ? gamepad.xbox.axes["rtrigger"]
                    : 0;
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                if (!output.links || !output.links.length) {
                    continue;
                }
                var v = null;

                if (gamepad) {
                    switch (output.name) {
                        case "left_axis":
                            v = this._left_axis;
                            break;
                        case "right_axis":
                            v = this._right_axis;
                            break;
                        case "left_x_axis":
                            v = this._left_axis[0];
                            break;
                        case "left_y_axis":
                            v = this._left_axis[1];
                            break;
                        case "right_x_axis":
                            v = this._right_axis[0];
                            break;
                        case "right_y_axis":
                            v = this._right_axis[1];
                            break;
                        case "trigger_left":
                            v = this._triggers[0];
                            break;
                        case "trigger_right":
                            v = this._triggers[1];
                            break;
                        case "a_button":
                            v = gamepad.xbox.buttons["a"] ? 1 : 0;
                            break;
                        case "b_button":
                            v = gamepad.xbox.buttons["b"] ? 1 : 0;
                            break;
                        case "x_button":
                            v = gamepad.xbox.buttons["x"] ? 1 : 0;
                            break;
                        case "y_button":
                            v = gamepad.xbox.buttons["y"] ? 1 : 0;
                            break;
                        case "lb_button":
                            v = gamepad.xbox.buttons["lb"] ? 1 : 0;
                            break;
                        case "rb_button":
                            v = gamepad.xbox.buttons["rb"] ? 1 : 0;
                            break;
                        case "ls_button":
                            v = gamepad.xbox.buttons["ls"] ? 1 : 0;
                            break;
                        case "rs_button":
                            v = gamepad.xbox.buttons["rs"] ? 1 : 0;
                            break;
                        case "hat_left":
                            v = gamepad.xbox.hatmap & GamepadInput.LEFT;
                            break;
                        case "hat_right":
                            v = gamepad.xbox.hatmap & GamepadInput.RIGHT;
                            break;
                        case "hat_up":
                            v = gamepad.xbox.hatmap & GamepadInput.UP;
                            break;
                        case "hat_down":
                            v = gamepad.xbox.hatmap & GamepadInput.DOWN;
                            break;
                        case "hat":
                            v = gamepad.xbox.hatmap;
                            break;
                        case "start_button":
                            v = gamepad.xbox.buttons["start"] ? 1 : 0;
                            break;
                        case "back_button":
                            v = gamepad.xbox.buttons["back"] ? 1 : 0;
                            break;
                        case "button_pressed":
                            for (
                                var j = 0;
                                j < this._current_buttons.length;
                                ++j
                            ) {
                                if (
                                    this._current_buttons[j] &&
                                    !this._previous_buttons[j]
                                ) {
                                    this.triggerSlot(
                                        i,
                                        GamepadInput.buttons[j]
                                    );
                                }
                            }
                            break;
                        default:
                            break;
                    }
                } else {
                    //if no gamepad is connected, output 0
                    switch (output.name) {
                        case "button_pressed":
                            break;
                        case "left_axis":
                        case "right_axis":
                            v = GamepadInput.zero;
                            break;
                        default:
                            v = 0;
                    }
                }
                this.setOutputData(i, v);
            }
        }
    };

	GamepadInput.mapping = {a:0,b:1,x:2,y:3,lb:4,rb:5,lt:6,rt:7,back:8,start:9,ls:10,rs:11 };
	GamepadInput.mapping_array = ["a","b","x","y","lb","rb","lt","rt","back","start","ls","rs"];

    GamepadInput.prototype.getGamepad = function() {
        var getGamepads =
            navigator.getGamepads ||
            navigator.webkitGetGamepads ||
            navigator.mozGetGamepads;
        if (!getGamepads) {
            return null;
        }
        var gamepads = getGamepads.call(navigator);
        var gamepad = null;

        this._previous_buttons.set(this._current_buttons);

        //pick the first connected
        for (var i = this.properties.gamepad_index; i < 4; i++) {
            if (!gamepads[i]) {
                continue;
            }
            gamepad = gamepads[i];

            //xbox controller mapping
            var xbox = this.xbox_mapping;
            if (!xbox) {
                xbox = this.xbox_mapping = {
                    axes: [],
                    buttons: {},
                    hat: "",
                    hatmap: GamepadInput.CENTER
                };
            }

            xbox.axes["lx"] = gamepad.axes[0];
            xbox.axes["ly"] = gamepad.axes[1];
            xbox.axes["rx"] = gamepad.axes[2];
            xbox.axes["ry"] = gamepad.axes[3];
            xbox.axes["ltrigger"] = gamepad.buttons[6].value;
            xbox.axes["rtrigger"] = gamepad.buttons[7].value;
            xbox.hat = "";
            xbox.hatmap = GamepadInput.CENTER;

            for (var j = 0; j < gamepad.buttons.length; j++) {
                this._current_buttons[j] = gamepad.buttons[j].pressed;

				if(j < 12)
				{
					xbox.buttons[ GamepadInput.mapping_array[j] ] = gamepad.buttons[j].pressed;
					if(gamepad.buttons[j].was_pressed)
						this.trigger( GamepadInput.mapping_array[j] + "_button_event" );
				}
				else //mapping of XBOX
					switch ( j ) //I use a switch to ensure that a player with another gamepad could play
					{
						case 12:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "up";
								xbox.hatmap |= GamepadInput.UP;
							}
							break;
						case 13:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "down";
								xbox.hatmap |= GamepadInput.DOWN;
							}
							break;
						case 14:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "left";
								xbox.hatmap |= GamepadInput.LEFT;
							}
							break;
						case 15:
							if (gamepad.buttons[j].pressed) {
								xbox.hat += "right";
								xbox.hatmap |= GamepadInput.RIGHT;
							}
							break;
						case 16:
							xbox.buttons["home"] = gamepad.buttons[j].pressed;
							break;
						default:
					}
            }
            gamepad.xbox = xbox;
            return gamepad;
        }
    };

    GamepadInput.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        //render gamepad state?
        var la = this._left_axis;
        var ra = this._right_axis;
        ctx.strokeStyle = "#88A";
        ctx.strokeRect(
            (la[0] + 1) * 0.5 * this.size[0] - 4,
            (la[1] + 1) * 0.5 * this.size[1] - 4,
            8,
            8
        );
        ctx.strokeStyle = "#8A8";
        ctx.strokeRect(
            (ra[0] + 1) * 0.5 * this.size[0] - 4,
            (ra[1] + 1) * 0.5 * this.size[1] - 4,
            8,
            8
        );
        var h = this.size[1] / this._current_buttons.length;
        ctx.fillStyle = "#AEB";
        for (var i = 0; i < this._current_buttons.length; ++i) {
            if (this._current_buttons[i]) {
                ctx.fillRect(0, h * i, 6, h);
            }
        }
    };

    GamepadInput.prototype.onGetOutputs = function() {
        return [
            ["left_axis", "vec2"],
            ["right_axis", "vec2"],
            ["left_x_axis", "number"],
            ["left_y_axis", "number"],
            ["right_x_axis", "number"],
            ["right_y_axis", "number"],
            ["trigger_left", "number"],
            ["trigger_right", "number"],
            ["a_button", "number"],
            ["b_button", "number"],
            ["x_button", "number"],
            ["y_button", "number"],
            ["lb_button", "number"],
            ["rb_button", "number"],
            ["ls_button", "number"],
            ["rs_button", "number"],
            ["start_button", "number"],
            ["back_button", "number"],
            ["a_button_event", LiteGraph.EVENT ],
            ["b_button_event", LiteGraph.EVENT ],
            ["x_button_event", LiteGraph.EVENT ],
            ["y_button_event", LiteGraph.EVENT ],
            ["lb_button_event", LiteGraph.EVENT ],
            ["rb_button_event", LiteGraph.EVENT ],
            ["ls_button_event", LiteGraph.EVENT ],
            ["rs_button_event", LiteGraph.EVENT ],
            ["start_button_event", LiteGraph.EVENT ],
            ["back_button_event", LiteGraph.EVENT ],
            ["hat_left", "number"],
            ["hat_right", "number"],
            ["hat_up", "number"],
            ["hat_down", "number"],
            ["hat", "number"],
            ["button_pressed", LiteGraph.EVENT]
        ];
    };

    LiteGraph.registerNodeType("input/gamepad", GamepadInput);
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    //Converter
    function Converter() {
        this.addInput("in", "*");
        this.size = [80, 30];
    }

    Converter.title = "Converter";
    Converter.desc = "type A to type B";

    Converter.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; i++) {
                var output = this.outputs[i];
                if (!output.links || !output.links.length) {
                    continue;
                }

                var result = null;
                switch (output.name) {
                    case "number":
                        result = v.length ? v[0] : parseFloat(v);
                        break;
                    case "vec2":
                    case "vec3":
                    case "vec4":
                        var result = null;
                        var count = 1;
                        switch (output.name) {
                            case "vec2":
                                count = 2;
                                break;
                            case "vec3":
                                count = 3;
                                break;
                            case "vec4":
                                count = 4;
                                break;
                        }

                        var result = new Float32Array(count);
                        if (v.length) {
                            for (
                                var j = 0;
                                j < v.length && j < result.length;
                                j++
                            ) {
                                result[j] = v[j];
                            }
                        } else {
                            result[0] = parseFloat(v);
                        }
                        break;
                }
                this.setOutputData(i, result);
            }
        }
    };

    Converter.prototype.onGetOutputs = function() {
        return [
            ["number", "number"],
            ["vec2", "vec2"],
            ["vec3", "vec3"],
            ["vec4", "vec4"]
        ];
    };

    LiteGraph.registerNodeType("math/converter", Converter);

    //Bypass
    function Bypass() {
        this.addInput("in");
        this.addOutput("out");
        this.size = [80, 30];
    }

    Bypass.title = "Bypass";
    Bypass.desc = "removes the type";

    Bypass.prototype.onExecute = function() {
        var v = this.getInputData(0);
        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/bypass", Bypass);

    function ToNumber() {
        this.addInput("in");
        this.addOutput("out");
    }

    ToNumber.title = "to Number";
    ToNumber.desc = "Cast to number";

    ToNumber.prototype.onExecute = function() {
        var v = this.getInputData(0);
        this.setOutputData(0, Number(v));
    };

    LiteGraph.registerNodeType("math/to_number", ToNumber);

    function MathRange() {
        this.addInput("in", "number", { locked: true });
        this.addOutput("out", "number", { locked: true });
        this.addOutput("clamped", "number", { locked: true });

        this.addProperty("in", 0);
        this.addProperty("in_min", 0);
        this.addProperty("in_max", 1);
        this.addProperty("out_min", 0);
        this.addProperty("out_max", 1);

        this.size = [120, 50];
    }

    MathRange.title = "Range";
    MathRange.desc = "Convert a number from one range to another";

    MathRange.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return (this._last_v || 0).toFixed(2);
        }
        return this.title;
    };

    MathRange.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                this.properties[input.name] = v;
            }
        }

        var v = this.properties["in"];
        if (v === undefined || v === null || v.constructor !== Number) {
            v = 0;
        }

        var in_min = this.properties.in_min;
        var in_max = this.properties.in_max;
        var out_min = this.properties.out_min;
        var out_max = this.properties.out_max;
		/*
		if( in_min > in_max )
		{
			in_min = in_max;
			in_max = this.properties.in_min;
		}
		if( out_min > out_max )
		{
			out_min = out_max;
			out_max = this.properties.out_min;
		}
		*/

        this._last_v = ((v - in_min) / (in_max - in_min)) * (out_max - out_min) + out_min;
        this.setOutputData(0, this._last_v);
        this.setOutputData(1, Math.clamp( this._last_v, out_min, out_max ));
    };

    MathRange.prototype.onDrawBackground = function(ctx) {
        //show the current value
        if (this._last_v) {
            this.outputs[0].label = this._last_v.toFixed(3);
        } else {
            this.outputs[0].label = "?";
        }
    };

    MathRange.prototype.onGetInputs = function() {
        return [
            ["in_min", "number"],
            ["in_max", "number"],
            ["out_min", "number"],
            ["out_max", "number"]
        ];
    };

    LiteGraph.registerNodeType("math/range", MathRange);

    function MathRand() {
        this.addOutput("value", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.size = [80, 30];
    }

    MathRand.title = "Rand";
    MathRand.desc = "Random number";

    MathRand.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; i++) {
                var input = this.inputs[i];
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                this.properties[input.name] = v;
            }
        }

        var min = this.properties.min;
        var max = this.properties.max;
        this._last_v = Math.random() * (max - min) + min;
        this.setOutputData(0, this._last_v);
    };

    MathRand.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = (this._last_v || 0).toFixed(3);
    };

    MathRand.prototype.onGetInputs = function() {
        return [["min", "number"], ["max", "number"]];
    };

    LiteGraph.registerNodeType("math/rand", MathRand);

    //basic continuous noise
    function MathNoise() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("min", 0);
        this.addProperty("max", 1);
        this.addProperty("smooth", true);
        this.addProperty("seed", 0);
        this.addProperty("octaves", 1);
        this.addProperty("persistence", 0.8);
        this.addProperty("speed", 1);
        this.size = [90, 30];
    }

    MathNoise.title = "Noise";
    MathNoise.desc = "Random number with temporal continuity";
    MathNoise.data = null;

    MathNoise.getValue = function(f, smooth) {
        if (!MathNoise.data) {
            MathNoise.data = new Float32Array(1024);
            for (var i = 0; i < MathNoise.data.length; ++i) {
                MathNoise.data[i] = Math.random();
            }
        }
        f = f % 1024;
        if (f < 0) {
            f += 1024;
        }
        var f_min = Math.floor(f);
        var f = f - f_min;
        var r1 = MathNoise.data[f_min];
        var r2 = MathNoise.data[f_min == 1023 ? 0 : f_min + 1];
        if (smooth) {
            f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        }
        return r1 * (1 - f) + r2 * f;
    };

    MathNoise.prototype.onExecute = function() {
        var f = this.getInputData(0) || 0;
		var iterations = this.properties.octaves || 1;
		var r = 0;
		var amp = 1;
		var seed = this.properties.seed || 0;
		f += seed;
		var speed = this.properties.speed || 1;
		var total_amp = 0;
		for(var i = 0; i < iterations; ++i)
		{
			r += MathNoise.getValue(f * (1+i) * speed, this.properties.smooth) * amp;
			total_amp += amp;
			amp *= this.properties.persistence;
			if(amp < 0.001)
				break;
		}
		r /= total_amp;
        var min = this.properties.min;
        var max = this.properties.max;
        this._last_v = r * (max - min) + min;
        this.setOutputData(0, this._last_v);
    };

    MathNoise.prototype.onDrawBackground = function(ctx) {
        //show the current value
        this.outputs[0].label = (this._last_v || 0).toFixed(3);
    };

    LiteGraph.registerNodeType("math/noise", MathNoise);

    //generates spikes every random time
    function MathSpikes() {
        this.addOutput("out", "number");
        this.addProperty("min_time", 1);
        this.addProperty("max_time", 2);
        this.addProperty("duration", 0.2);
        this.size = [90, 30];
        this._remaining_time = 0;
        this._blink_time = 0;
    }

    MathSpikes.title = "Spikes";
    MathSpikes.desc = "spike every random time";

    MathSpikes.prototype.onExecute = function() {
        var dt = this.graph.elapsed_time; //in secs

        this._remaining_time -= dt;
        this._blink_time -= dt;

        var v = 0;
        if (this._blink_time > 0) {
            var f = this._blink_time / this.properties.duration;
            v = 1 / (Math.pow(f * 8 - 4, 4) + 1);
        }

        if (this._remaining_time < 0) {
            this._remaining_time =
                Math.random() *
                    (this.properties.max_time - this.properties.min_time) +
                this.properties.min_time;
            this._blink_time = this.properties.duration;
            this.boxcolor = "#FFF";
        } else {
            this.boxcolor = "#000";
        }
        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/spikes", MathSpikes);

    //Math clamp
    function MathClamp() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.addProperty("min", 0);
        this.addProperty("max", 1);
    }

    MathClamp.title = "Clamp";
    MathClamp.desc = "Clamp number between min and max";
    //MathClamp.filter = "shader";

    MathClamp.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        v = Math.max(this.properties.min, v);
        v = Math.min(this.properties.max, v);
        this.setOutputData(0, v);
    };

    MathClamp.prototype.getCode = function(lang) {
        var code = "";
        if (this.isInputConnected(0)) {
            code +=
                "clamp({{0}}," +
                this.properties.min +
                "," +
                this.properties.max +
                ")";
        }
        return code;
    };

    LiteGraph.registerNodeType("math/clamp", MathClamp);

    //Math ABS
    function MathLerp() {
        this.properties = { f: 0.5 };
        this.addInput("A", "number");
        this.addInput("B", "number");

        this.addOutput("out", "number");
    }

    MathLerp.title = "Lerp";
    MathLerp.desc = "Linear Interpolation";

    MathLerp.prototype.onExecute = function() {
        var v1 = this.getInputData(0);
        if (v1 == null) {
            v1 = 0;
        }
        var v2 = this.getInputData(1);
        if (v2 == null) {
            v2 = 0;
        }

        var f = this.properties.f;

        var _f = this.getInputData(2);
        if (_f !== undefined) {
            f = _f;
        }

        this.setOutputData(0, v1 * (1 - f) + v2 * f);
    };

    MathLerp.prototype.onGetInputs = function() {
        return [["f", "number"]];
    };

    LiteGraph.registerNodeType("math/lerp", MathLerp);

    //Math ABS
    function MathAbs() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathAbs.title = "Abs";
    MathAbs.desc = "Absolute";

    MathAbs.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, Math.abs(v));
    };

    LiteGraph.registerNodeType("math/abs", MathAbs);

    //Math Floor
    function MathFloor() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathFloor.title = "Floor";
    MathFloor.desc = "Floor number to remove fractional part";

    MathFloor.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, Math.floor(v));
    };

    LiteGraph.registerNodeType("math/floor", MathFloor);

    //Math frac
    function MathFrac() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
    }

    MathFrac.title = "Frac";
    MathFrac.desc = "Returns fractional part";

    MathFrac.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }
        this.setOutputData(0, v % 1);
    };

    LiteGraph.registerNodeType("math/frac", MathFrac);

    //Math Floor
    function MathSmoothStep() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.properties = { A: 0, B: 1 };
    }

    MathSmoothStep.title = "Smoothstep";
    MathSmoothStep.desc = "Smoothstep";

    MathSmoothStep.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v === undefined) {
            return;
        }

        var edge0 = this.properties.A;
        var edge1 = this.properties.B;

        // Scale, bias and saturate x to 0..1 range
        v = Math.clamp((v - edge0) / (edge1 - edge0), 0.0, 1.0);
        // Evaluate polynomial
        v = v * v * (3 - 2 * v);

        this.setOutputData(0, v);
    };

    LiteGraph.registerNodeType("math/smoothstep", MathSmoothStep);

    //Math scale
    function MathScale() {
        this.addInput("in", "number", { label: "" });
        this.addOutput("out", "number", { label: "" });
        this.size = [80, 30];
        this.addProperty("factor", 1);
    }

    MathScale.title = "Scale";
    MathScale.desc = "v * factor";

    MathScale.prototype.onExecute = function() {
        var value = this.getInputData(0);
        if (value != null) {
            this.setOutputData(0, value * this.properties.factor);
        }
    };

    LiteGraph.registerNodeType("math/scale", MathScale);

	//Gate
	function Gate() {
		this.addInput("v","boolean");
		this.addInput("A");
		this.addInput("B");
		this.addOutput("out");
	}

	Gate.title = "Gate";
	Gate.desc = "if v is true, then outputs A, otherwise B";

	Gate.prototype.onExecute = function() {
		var v = this.getInputData(0);
		this.setOutputData(0, this.getInputData( v ? 1 : 2 ));
	};

	LiteGraph.registerNodeType("math/gate", Gate);


    //Math Average
    function MathAverageFilter() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.size = [80, 30];
        this.addProperty("samples", 10);
        this._values = new Float32Array(10);
        this._current = 0;
    }

    MathAverageFilter.title = "Average";
    MathAverageFilter.desc = "Average Filter";

    MathAverageFilter.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }

        var num_samples = this._values.length;

        this._values[this._current % num_samples] = v;
        this._current += 1;
        if (this._current > num_samples) {
            this._current = 0;
        }

        var avr = 0;
        for (var i = 0; i < num_samples; ++i) {
            avr += this._values[i];
        }

        this.setOutputData(0, avr / num_samples);
    };

    MathAverageFilter.prototype.onPropertyChanged = function(name, value) {
        if (value < 1) {
            value = 1;
        }
        this.properties.samples = Math.round(value);
        var old = this._values;

        this._values = new Float32Array(this.properties.samples);
        if (old.length <= this._values.length) {
            this._values.set(old);
        } else {
            this._values.set(old.subarray(0, this._values.length));
        }
    };

    LiteGraph.registerNodeType("math/average", MathAverageFilter);

    //Math
    function MathTendTo() {
        this.addInput("in", "number");
        this.addOutput("out", "number");
        this.addProperty("factor", 0.1);
        this.size = [80, 30];
        this._value = null;
    }

    MathTendTo.title = "TendTo";
    MathTendTo.desc = "moves the output value always closer to the input";

    MathTendTo.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }
        var f = this.properties.factor;
        if (this._value == null) {
            this._value = v;
        } else {
            this._value = this._value * (1 - f) + v * f;
        }
        this.setOutputData(0, this._value);
    };

    LiteGraph.registerNodeType("math/tendTo", MathTendTo);

    //Math operation
    function MathOperation() {
        this.addInput("A", "number,array,object");
        this.addInput("B", "number");
        this.addOutput("=", "number");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", "+", "enum", { values: MathOperation.values });
		this._func = function(A,B) { return A + B; };
		this._result = []; //only used for arrays
    }

    MathOperation.values = ["+", "-", "*", "/", "%", "^", "max", "min"];

	MathOperation.title = "Operation";
    MathOperation.desc = "Easy math operators";
    MathOperation["@OP"] = {
        type: "enum",
        title: "operation",
        values: MathOperation.values
    };
    MathOperation.size = [100, 60];

    MathOperation.prototype.getTitle = function() {
		if(this.properties.OP == "max" || this.properties.OP == "min")
			return this.properties.OP + "(A,B)";
        return "A " + this.properties.OP + " B";
    };

    MathOperation.prototype.setValue = function(v) {
        if (typeof v == "string") {
            v = parseFloat(v);
        }
        this.properties["value"] = v;
    };

    MathOperation.prototype.onPropertyChanged = function(name, value)
	{
		if (name != "OP")
			return;
        switch (this.properties.OP) {
            case "+": this._func = function(A,B) { return A + B; }; break;
            case "-": this._func = function(A,B) { return A - B; }; break;
            case "x":
            case "X":
            case "*": this._func = function(A,B) { return A * B; }; break;
            case "/": this._func = function(A,B) { return A / B; }; break;
            case "%": this._func = function(A,B) { return A % B; }; break;
            case "^": this._func = function(A,B) { return Math.pow(A, B); }; break;
            case "max": this._func = function(A,B) { return Math.max(A, B); }; break;
            case "min": this._func = function(A,B) { return Math.min(A, B); }; break;
			default: 
				console.warn("Unknown operation: " + this.properties.OP);
				this._func = function(A) { return A; };
				break;
        }
	}

    MathOperation.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        if ( A != null ) {
			if( A.constructor === Number )
	            this.properties["A"] = A;
        } else {
            A = this.properties["A"];
        }

        if (B != null) {
            this.properties["B"] = B;
        } else {
            B = this.properties["B"];
        }

		var result;
		if(A.constructor === Number)
		{
	        result = 0;
			result = this._func(A,B);
		}
		else if(A.constructor === Array)
		{
			result = this._result;
			result.length = A.length;
			for(var i = 0; i < A.length; ++i)
				result[i] = this._func(A[i],B);
		}
		else
		{
			result = {};
			for(var i in A)
				result[i] = this._func(A[i],B);
		}
	    this.setOutputData(0, result);
    };

    MathOperation.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        ctx.font = "40px Arial";
        ctx.fillStyle = "#666";
        ctx.textAlign = "center";
        ctx.fillText(
            this.properties.OP,
            this.size[0] * 0.5,
            (this.size[1] + LiteGraph.NODE_TITLE_HEIGHT) * 0.5
        );
        ctx.textAlign = "left";
    };

    LiteGraph.registerNodeType("math/operation", MathOperation);

    LiteGraph.registerSearchboxExtra("math/operation", "MAX", {
        properties: {OP:"max"},
        title: "MAX()"
    });

    LiteGraph.registerSearchboxExtra("math/operation", "MIN", {
        properties: {OP:"min"},
        title: "MIN()"
    });


    //Math compare
    function MathCompare() {
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("A==B", "boolean");
        this.addOutput("A!=B", "boolean");
        this.addProperty("A", 0);
        this.addProperty("B", 0);
    }

    MathCompare.title = "Compare";
    MathCompare.desc = "compares between two values";

    MathCompare.prototype.onExecute = function() {
        var A = this.getInputData(0);
        var B = this.getInputData(1);
        if (A !== undefined) {
            this.properties["A"] = A;
        } else {
            A = this.properties["A"];
        }

        if (B !== undefined) {
            this.properties["B"] = B;
        } else {
            B = this.properties["B"];
        }

        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            var output = this.outputs[i];
            if (!output.links || !output.links.length) {
                continue;
            }
            var value;
            switch (output.name) {
                case "A==B":
                    value = A == B;
                    break;
                case "A!=B":
                    value = A != B;
                    break;
                case "A>B":
                    value = A > B;
                    break;
                case "A<B":
                    value = A < B;
                    break;
                case "A<=B":
                    value = A <= B;
                    break;
                case "A>=B":
                    value = A >= B;
                    break;
            }
            this.setOutputData(i, value);
        }
    };

    MathCompare.prototype.onGetOutputs = function() {
        return [
            ["A==B", "boolean"],
            ["A!=B", "boolean"],
            ["A>B", "boolean"],
            ["A<B", "boolean"],
            ["A>=B", "boolean"],
            ["A<=B", "boolean"]
        ];
    };

    LiteGraph.registerNodeType("math/compare", MathCompare);

    LiteGraph.registerSearchboxExtra("math/compare", "==", {
        outputs: [["A==B", "boolean"]],
        title: "A==B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "!=", {
        outputs: [["A!=B", "boolean"]],
        title: "A!=B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", ">", {
        outputs: [["A>B", "boolean"]],
        title: "A>B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "<", {
        outputs: [["A<B", "boolean"]],
        title: "A<B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", ">=", {
        outputs: [["A>=B", "boolean"]],
        title: "A>=B"
    });
    LiteGraph.registerSearchboxExtra("math/compare", "<=", {
        outputs: [["A<=B", "boolean"]],
        title: "A<=B"
    });

    function MathCondition() {
        this.addInput("A", "number");
        this.addInput("B", "number");
        this.addOutput("true", "boolean");
        this.addOutput("false", "boolean");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", ">", "enum", { values: MathCondition.values });
		this.addWidget("combo","Cond.",this.properties.OP,{ property: "OP", values: MathCondition.values } );

        this.size = [80, 60];
    }

    MathCondition.values = [">", "<", "==", "!=", "<=", ">=", "||", "&&" ];
    MathCondition["@OP"] = {
        type: "enum",
        title: "operation",
        values: MathCondition.values
    };

    MathCondition.title = "Condition";
    MathCondition.desc = "evaluates condition between A and B";

    MathCondition.prototype.getTitle = function() {
        return "A " + this.properties.OP + " B";
    };

    MathCondition.prototype.onExecute = function() {
        var A = this.getInputData(0);
        if (A === undefined) {
            A = this.properties.A;
        } else {
            this.properties.A = A;
        }

        var B = this.getInputData(1);
        if (B === undefined) {
            B = this.properties.B;
        } else {
            this.properties.B = B;
        }

        var result = true;
        switch (this.properties.OP) {
            case ">":
                result = A > B;
                break;
            case "<":
                result = A < B;
                break;
            case "==":
                result = A == B;
                break;
            case "!=":
                result = A != B;
                break;
            case "<=":
                result = A <= B;
                break;
            case ">=":
                result = A >= B;
                break;
            case "||":
                result = A || B;
                break;
            case "&&":
                result = A && B;
                break;
        }

        this.setOutputData(0, result);
        this.setOutputData(1, !result);
    };

    LiteGraph.registerNodeType("math/condition", MathCondition);


    function MathBranch() {
        this.addInput("in", "");
        this.addInput("cond", "boolean");
        this.addOutput("true", "");
        this.addOutput("false", "");
        this.size = [80, 60];
    }

    MathBranch.title = "Branch";
    MathBranch.desc = "If condition is true, outputs IN in true, otherwise in false";

    MathBranch.prototype.onExecute = function() {
        var V = this.getInputData(0);
        var cond = this.getInputData(1);

		if(cond)
		{
			this.setOutputData(0, V);
			this.setOutputData(1, null);
		}
		else
		{
			this.setOutputData(0, null);
			this.setOutputData(1, V);
		}
	}

    LiteGraph.registerNodeType("math/branch", MathBranch);


    function MathAccumulate() {
        this.addInput("inc", "number");
        this.addOutput("total", "number");
        this.addProperty("increment", 1);
        this.addProperty("value", 0);
    }

    MathAccumulate.title = "Accumulate";
    MathAccumulate.desc = "Increments a value every time";

    MathAccumulate.prototype.onExecute = function() {
        if (this.properties.value === null) {
            this.properties.value = 0;
        }

        var inc = this.getInputData(0);
        if (inc !== null) {
            this.properties.value += inc;
        } else {
            this.properties.value += this.properties.increment;
        }
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("math/accumulate", MathAccumulate);

    //Math Trigonometry
    function MathTrigonometry() {
        this.addInput("v", "number");
        this.addOutput("sin", "number");

        this.addProperty("amplitude", 1);
        this.addProperty("offset", 0);
        this.bgImageUrl = "nodes/imgs/icon-sin.png";
    }

    MathTrigonometry.title = "Trigonometry";
    MathTrigonometry.desc = "Sin Cos Tan";
    //MathTrigonometry.filter = "shader";

    MathTrigonometry.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            v = 0;
        }
        var amplitude = this.properties["amplitude"];
        var slot = this.findInputSlot("amplitude");
        if (slot != -1) {
            amplitude = this.getInputData(slot);
        }
        var offset = this.properties["offset"];
        slot = this.findInputSlot("offset");
        if (slot != -1) {
            offset = this.getInputData(slot);
        }

        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            var output = this.outputs[i];
            var value;
            switch (output.name) {
                case "sin":
                    value = Math.sin(v);
                    break;
                case "cos":
                    value = Math.cos(v);
                    break;
                case "tan":
                    value = Math.tan(v);
                    break;
                case "asin":
                    value = Math.asin(v);
                    break;
                case "acos":
                    value = Math.acos(v);
                    break;
                case "atan":
                    value = Math.atan(v);
                    break;
            }
            this.setOutputData(i, amplitude * value + offset);
        }
    };

    MathTrigonometry.prototype.onGetInputs = function() {
        return [["v", "number"], ["amplitude", "number"], ["offset", "number"]];
    };

    MathTrigonometry.prototype.onGetOutputs = function() {
        return [
            ["sin", "number"],
            ["cos", "number"],
            ["tan", "number"],
            ["asin", "number"],
            ["acos", "number"],
            ["atan", "number"]
        ];
    };

    LiteGraph.registerNodeType("math/trigonometry", MathTrigonometry);

    LiteGraph.registerSearchboxExtra("math/trigonometry", "SIN()", {
        outputs: [["sin", "number"]],
        title: "SIN()"
    });
    LiteGraph.registerSearchboxExtra("math/trigonometry", "COS()", {
        outputs: [["cos", "number"]],
        title: "COS()"
    });
    LiteGraph.registerSearchboxExtra("math/trigonometry", "TAN()", {
        outputs: [["tan", "number"]],
        title: "TAN()"
    });

    //math library for safe math operations without eval
    function MathFormula() {
        this.addInput("x", "number");
        this.addInput("y", "number");
        this.addOutput("", "number");
        this.properties = { x: 1.0, y: 1.0, formula: "x+y" };
        this.code_widget = this.addWidget(
            "text",
            "F(x,y)",
            this.properties.formula,
            function(v, canvas, node) {
                node.properties.formula = v;
            }
        );
        this.addWidget("toggle", "allow", LiteGraph.allow_scripts, function(v) {
            LiteGraph.allow_scripts = v;
        });
        this._func = null;
    }

    MathFormula.title = "Formula";
    MathFormula.desc = "Compute formula";
    MathFormula.size = [160, 100];

    MathAverageFilter.prototype.onPropertyChanged = function(name, value) {
        if (name == "formula") {
            this.code_widget.value = value;
        }
    };

    MathFormula.prototype.onExecute = function() {
        if (!LiteGraph.allow_scripts) {
            return;
        }

        var x = this.getInputData(0);
        var y = this.getInputData(1);
        if (x != null) {
            this.properties["x"] = x;
        } else {
            x = this.properties["x"];
        }

        if (y != null) {
            this.properties["y"] = y;
        } else {
            y = this.properties["y"];
        }

        var f = this.properties["formula"];

        var value;
        try {
            if (!this._func || this._func_code != this.properties.formula) {
                this._func = new Function(
                    "x",
                    "y",
                    "TIME",
                    "return " + this.properties.formula
                );
                this._func_code = this.properties.formula;
            }
            value = this._func(x, y, this.graph.globaltime);
            this.boxcolor = null;
        } catch (err) {
            this.boxcolor = "red";
        }
        this.setOutputData(0, value);
    };

    MathFormula.prototype.getTitle = function() {
        return this._func_code || "Formula";
    };

    MathFormula.prototype.onDrawBackground = function() {
        var f = this.properties["formula"];
        if (this.outputs && this.outputs.length) {
            this.outputs[0].label = f;
        }
    };

    LiteGraph.registerNodeType("math/formula", MathFormula);

    function Math3DVec2ToXY() {
        this.addInput("vec2", "vec2");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
    }

    Math3DVec2ToXY.title = "Vec2->XY";
    Math3DVec2ToXY.desc = "vector 2 to components";

    Math3DVec2ToXY.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
    };

    LiteGraph.registerNodeType("math3d/vec2-to-xy", Math3DVec2ToXY);

    function Math3DXYToVec2() {
        this.addInputs([["x", "number"], ["y", "number"]]);
        this.addOutput("vec2", "vec2");
        this.properties = { x: 0, y: 0 };
        this._data = new Float32Array(2);
    }

    Math3DXYToVec2.title = "XY->Vec2";
    Math3DXYToVec2.desc = "components to vector2";

    Math3DXYToVec2.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xy-to-vec2", Math3DXYToVec2);

    function Math3DVec3ToXYZ() {
        this.addInput("vec3", "vec3");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
    }

    Math3DVec3ToXYZ.title = "Vec3->XYZ";
    Math3DVec3ToXYZ.desc = "vector 3 to components";

    Math3DVec3ToXYZ.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
    };

    LiteGraph.registerNodeType("math3d/vec3-to-xyz", Math3DVec3ToXYZ);

    function Math3DXYZToVec3() {
        this.addInputs([["x", "number"], ["y", "number"], ["z", "number"]]);
        this.addOutput("vec3", "vec3");
        this.properties = { x: 0, y: 0, z: 0 };
        this._data = new Float32Array(3);
    }

    Math3DXYZToVec3.title = "XYZ->Vec3";
    Math3DXYZToVec3.desc = "components to vector3";

    Math3DXYZToVec3.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }
        var z = this.getInputData(2);
        if (z == null) {
            z = this.properties.z;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;
        data[2] = z;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xyz-to-vec3", Math3DXYZToVec3);

    function Math3DVec4ToXYZW() {
        this.addInput("vec4", "vec4");
        this.addOutput("x", "number");
        this.addOutput("y", "number");
        this.addOutput("z", "number");
        this.addOutput("w", "number");
    }

    Math3DVec4ToXYZW.title = "Vec4->XYZW";
    Math3DVec4ToXYZW.desc = "vector 4 to components";

    Math3DVec4ToXYZW.prototype.onExecute = function() {
        var v = this.getInputData(0);
        if (v == null) {
            return;
        }

        this.setOutputData(0, v[0]);
        this.setOutputData(1, v[1]);
        this.setOutputData(2, v[2]);
        this.setOutputData(3, v[3]);
    };

    LiteGraph.registerNodeType("math3d/vec4-to-xyzw", Math3DVec4ToXYZW);

    function Math3DXYZWToVec4() {
        this.addInputs([
            ["x", "number"],
            ["y", "number"],
            ["z", "number"],
            ["w", "number"]
        ]);
        this.addOutput("vec4", "vec4");
        this.properties = { x: 0, y: 0, z: 0, w: 0 };
        this._data = new Float32Array(4);
    }

    Math3DXYZWToVec4.title = "XYZW->Vec4";
    Math3DXYZWToVec4.desc = "components to vector4";

    Math3DXYZWToVec4.prototype.onExecute = function() {
        var x = this.getInputData(0);
        if (x == null) {
            x = this.properties.x;
        }
        var y = this.getInputData(1);
        if (y == null) {
            y = this.properties.y;
        }
        var z = this.getInputData(2);
        if (z == null) {
            z = this.properties.z;
        }
        var w = this.getInputData(3);
        if (w == null) {
            w = this.properties.w;
        }

        var data = this._data;
        data[0] = x;
        data[1] = y;
        data[2] = z;
        data[3] = w;

        this.setOutputData(0, data);
    };

    LiteGraph.registerNodeType("math3d/xyzw-to-vec4", Math3DXYZWToVec4);

})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    function Selector() {
        this.addInput("sel", "number");
        this.addInput("A");
        this.addInput("B");
        this.addInput("C");
        this.addInput("D");
        this.addOutput("out");

        this.selected = 0;
    }

    Selector.title = "Selector";
    Selector.desc = "selects an output";

    Selector.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AFB";
        var y = (this.selected + 1) * LiteGraph.NODE_SLOT_HEIGHT + 6;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(50, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(34, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
    };

    Selector.prototype.onExecute = function() {
        var sel = this.getInputData(0);
        if (sel == null || sel.constructor !== Number)
            sel = 0;
        this.selected = sel = Math.round(sel) % (this.inputs.length - 1);
        var v = this.getInputData(sel + 1);
        if (v !== undefined) {
            this.setOutputData(0, v);
        }
    };

    Selector.prototype.onGetInputs = function() {
        return [["E", 0], ["F", 0], ["G", 0], ["H", 0]];
    };

    LiteGraph.registerNodeType("logic/selector", Selector);

    function Sequence() {
        this.properties = {
            sequence: "A,B,C"
        };
        this.addInput("index", "number");
        this.addInput("seq");
        this.addOutput("out");

        this.index = 0;
        this.values = this.properties.sequence.split(",");
    }

    Sequence.title = "Sequence";
    Sequence.desc = "select one element from a sequence from a string";

    Sequence.prototype.onPropertyChanged = function(name, value) {
        if (name == "sequence") {
            this.values = value.split(",");
        }
    };

    Sequence.prototype.onExecute = function() {
        var seq = this.getInputData(1);
        if (seq && seq != this.current_sequence) {
            this.values = seq.split(",");
            this.current_sequence = seq;
        }
        var index = this.getInputData(0);
        if (index == null) {
            index = 0;
        }
        this.index = index = Math.round(index) % this.values.length;

        this.setOutputData(0, this.values[index]);
    };

    LiteGraph.registerNodeType("logic/sequence", Sequence);
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;
	var LGraphCanvas = global.LGraphCanvas;

    //Works with Litegl.js to create WebGL nodes
    global.LGraphTexture = null;

    if (typeof GL == "undefined")
		return;

	LGraphCanvas.link_type_colors["Texture"] = "#987";

	function LGraphTexture() {
		this.addOutput("tex", "Texture");
		this.addOutput("name", "string");
		this.properties = { name: "", filter: true };
		this.size = [
			LGraphTexture.image_preview_size,
			LGraphTexture.image_preview_size
		];
	}

	global.LGraphTexture = LGraphTexture;

	LGraphTexture.title = "Texture";
	LGraphTexture.desc = "Texture";
	LGraphTexture.widgets_info = {
		name: { widget: "texture" },
		filter: { widget: "checkbox" }
	};

	//REPLACE THIS TO INTEGRATE WITH YOUR FRAMEWORK
	LGraphTexture.loadTextureCallback = null; //function in charge of loading textures when not present in the container
	LGraphTexture.image_preview_size = 256;

	//flags to choose output texture type
	LGraphTexture.UNDEFINED = 0; //not specified
	LGraphTexture.PASS_THROUGH = 1; //do not apply FX (like disable but passing the in to the out)
	LGraphTexture.COPY = 2; //create new texture with the same properties as the origin texture
	LGraphTexture.LOW = 3; //create new texture with low precision (byte)
	LGraphTexture.HIGH = 4; //create new texture with high precision (half-float)
	LGraphTexture.REUSE = 5; //reuse input texture
	LGraphTexture.DEFAULT = 2; //use the default

	LGraphTexture.MODE_VALUES = {
		"undefined": LGraphTexture.UNDEFINED,
		"pass through": LGraphTexture.PASS_THROUGH,
		copy: LGraphTexture.COPY,
		low: LGraphTexture.LOW,
		high: LGraphTexture.HIGH,
		reuse: LGraphTexture.REUSE,
		default: LGraphTexture.DEFAULT
	};

	//returns the container where all the loaded textures are stored (overwrite if you have a Resources Manager)
	LGraphTexture.getTexturesContainer = function() {
		return gl.textures;
	};

	//process the loading of a texture (overwrite it if you have a Resources Manager)
	LGraphTexture.loadTexture = function(name, options) {
		options = options || {};
		var url = name;
		if (url.substr(0, 7) == "http://") {
			if (LiteGraph.proxy) {
				//proxy external files
				url = LiteGraph.proxy + url.substr(7);
			}
		}

		var container = LGraphTexture.getTexturesContainer();
		var tex = (container[name] = GL.Texture.fromURL(url, options));
		return tex;
	};

	LGraphTexture.getTexture = function(name) {
		var container = this.getTexturesContainer();

		if (!container) {
			throw "Cannot load texture, container of textures not found";
		}

		var tex = container[name];
		if (!tex && name && name[0] != ":") {
			return this.loadTexture(name);
		}

		return tex;
	};

	//used to compute the appropiate output texture
	LGraphTexture.getTargetTexture = function(origin, target, mode) {
		if (!origin) {
			throw "LGraphTexture.getTargetTexture expects a reference texture";
		}

		var tex_type = null;

		switch (mode) {
			case LGraphTexture.LOW:
				tex_type = gl.UNSIGNED_BYTE;
				break;
			case LGraphTexture.HIGH:
				tex_type = gl.HIGH_PRECISION_FORMAT;
				break;
			case LGraphTexture.REUSE:
				return origin;
				break;
			case LGraphTexture.COPY:
			default:
				tex_type = origin ? origin.type : gl.UNSIGNED_BYTE;
				break;
		}

		if (
			!target ||
			target.width != origin.width ||
			target.height != origin.height ||
			target.type != tex_type ||
			target.format != origin.format 
		) {
			target = new GL.Texture(origin.width, origin.height, {
				type: tex_type,
				format: origin.format,
				filter: gl.LINEAR
			});
		}

		return target;
	};

	LGraphTexture.getTextureType = function(precision, ref_texture) {
		var type = ref_texture ? ref_texture.type : gl.UNSIGNED_BYTE;
		switch (precision) {
			case LGraphTexture.HIGH:
				type = gl.HIGH_PRECISION_FORMAT;
				break;
			case LGraphTexture.LOW:
				type = gl.UNSIGNED_BYTE;
				break;
			//no default
		}
		return type;
	};

	LGraphTexture.getWhiteTexture = function() {
		if (this._white_texture) {
			return this._white_texture;
		}
		var texture = (this._white_texture = GL.Texture.fromMemory(
			1,
			1,
			[255, 255, 255, 255],
			{ format: gl.RGBA, wrap: gl.REPEAT, filter: gl.NEAREST }
		));
		return texture;
	};

	LGraphTexture.getNoiseTexture = function() {
		if (this._noise_texture) {
			return this._noise_texture;
		}

		var noise = new Uint8Array(512 * 512 * 4);
		for (var i = 0; i < 512 * 512 * 4; ++i) {
			noise[i] = Math.random() * 255;
		}

		var texture = GL.Texture.fromMemory(512, 512, noise, {
			format: gl.RGBA,
			wrap: gl.REPEAT,
			filter: gl.NEAREST
		});
		this._noise_texture = texture;
		return texture;
	};

	LGraphTexture.prototype.onDropFile = function(data, filename, file) {
		if (!data) {
			this._drop_texture = null;
			this.properties.name = "";
		} else {
			var texture = null;
			if (typeof data == "string") {
				texture = GL.Texture.fromURL(data);
			} else if (filename.toLowerCase().indexOf(".dds") != -1) {
				texture = GL.Texture.fromDDSInMemory(data);
			} else {
				var blob = new Blob([file]);
				var url = URL.createObjectURL(blob);
				texture = GL.Texture.fromURL(url);
			}

			this._drop_texture = texture;
			this.properties.name = filename;
		}
	};

	LGraphTexture.prototype.getExtraMenuOptions = function(graphcanvas) {
		var that = this;
		if (!this._drop_texture) {
			return;
		}
		return [
			{
				content: "Clear",
				callback: function() {
					that._drop_texture = null;
					that.properties.name = "";
				}
			}
		];
	};

	LGraphTexture.prototype.onExecute = function() {
		var tex = null;
		if (this.isOutputConnected(1)) {
			tex = this.getInputData(0);
		}

		if (!tex && this._drop_texture) {
			tex = this._drop_texture;
		}

		if (!tex && this.properties.name) {
			tex = LGraphTexture.getTexture(this.properties.name);
		}

		if (!tex) {
			this.setOutputData( 0, null );
			this.setOutputData( 1, "" );
			return;
		}

		this._last_tex = tex;

		if (this.properties.filter === false) {
			tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		} else {
			tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		}

		this.setOutputData( 0, tex );
		this.setOutputData( 1, tex.fullpath || tex.filename );

		for (var i = 2; i < this.outputs.length; i++) {
			var output = this.outputs[i];
			if (!output) {
				continue;
			}
			var v = null;
			if (output.name == "width") {
				v = tex.width;
			} else if (output.name == "height") {
				v = tex.height;
			} else if (output.name == "aspect") {
				v = tex.width / tex.height;
			}
			this.setOutputData(i, v);
		}
	};

	LGraphTexture.prototype.onResourceRenamed = function(
		old_name,
		new_name
	) {
		if (this.properties.name == old_name) {
			this.properties.name = new_name;
		}
	};

	LGraphTexture.prototype.onDrawBackground = function(ctx) {
		if (this.flags.collapsed || this.size[1] <= 20) {
			return;
		}

		if (this._drop_texture && ctx.webgl) {
			ctx.drawImage(
				this._drop_texture,
				0,
				0,
				this.size[0],
				this.size[1]
			);
			//this._drop_texture.renderQuad(this.pos[0],this.pos[1],this.size[0],this.size[1]);
			return;
		}

		//Different texture? then get it from the GPU
		if (this._last_preview_tex != this._last_tex) {
			if (ctx.webgl) {
				this._canvas = this._last_tex;
			} else {
				var tex_canvas = LGraphTexture.generateLowResTexturePreview(
					this._last_tex
				);
				if (!tex_canvas) {
					return;
				}

				this._last_preview_tex = this._last_tex;
				this._canvas = cloneCanvas(tex_canvas);
			}
		}

		if (!this._canvas) {
			return;
		}

		//render to graph canvas
		ctx.save();
		if (!ctx.webgl) {
			//reverse image
			ctx.translate(0, this.size[1]);
			ctx.scale(1, -1);
		}
		ctx.drawImage(this._canvas, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	};

	//very slow, used at your own risk
	LGraphTexture.generateLowResTexturePreview = function(tex) {
		if (!tex) {
			return null;
		}

		var size = LGraphTexture.image_preview_size;
		var temp_tex = tex;

		if (tex.format == gl.DEPTH_COMPONENT) {
			return null;
		} //cannot generate from depth

		//Generate low-level version in the GPU to speed up
		if (tex.width > size || tex.height > size) {
			temp_tex = this._preview_temp_tex;
			if (!this._preview_temp_tex) {
				temp_tex = new GL.Texture(size, size, {
					minFilter: gl.NEAREST
				});
				this._preview_temp_tex = temp_tex;
			}

			//copy
			tex.copyTo(temp_tex);
			tex = temp_tex;
		}

		//create intermediate canvas with lowquality version
		var tex_canvas = this._preview_canvas;
		if (!tex_canvas) {
			tex_canvas = createCanvas(size, size);
			this._preview_canvas = tex_canvas;
		}

		if (temp_tex) {
			temp_tex.toCanvas(tex_canvas);
		}
		return tex_canvas;
	};

	LGraphTexture.prototype.getResources = function(res) {
		if(this.properties.name)
			res[this.properties.name] = GL.Texture;
		return res;
	};

	LGraphTexture.prototype.onGetInputs = function() {
		return [["in", "Texture"]];
	};

	LGraphTexture.prototype.onGetOutputs = function() {
		return [
			["width", "number"],
			["height", "number"],
			["aspect", "number"]
		];
	};

	//used to replace shader code
	LGraphTexture.replaceCode = function( code, context )
	{
		return code.replace(/\{\{[a-zA-Z0-9_]*\}\}/g, function(v){
			v = v.replace( /[\{\}]/g, "" );
			return context[v] || "";
		});
	}

	LiteGraph.registerNodeType("texture/texture", LGraphTexture);

	//**************************
	function LGraphTexturePreview() {
		this.addInput("Texture", "Texture");
		this.properties = { flipY: false };
		this.size = [
			LGraphTexture.image_preview_size,
			LGraphTexture.image_preview_size
		];
	}

	LGraphTexturePreview.title = "Preview";
	LGraphTexturePreview.desc = "Show a texture in the graph canvas";
	LGraphTexturePreview.allow_preview = false;

	LGraphTexturePreview.prototype.onDrawBackground = function(ctx) {
		if (this.flags.collapsed) {
			return;
		}

		if (!ctx.webgl && !LGraphTexturePreview.allow_preview) {
			return;
		} //not working well

		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		var tex_canvas = null;

		if (!tex.handle && ctx.webgl) {
			tex_canvas = tex;
		} else {
			tex_canvas = LGraphTexture.generateLowResTexturePreview(tex);
		}

		//render to graph canvas
		ctx.save();
		if (this.properties.flipY) {
			ctx.translate(0, this.size[1]);
			ctx.scale(1, -1);
		}
		ctx.drawImage(tex_canvas, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	};

	LiteGraph.registerNodeType("texture/preview", LGraphTexturePreview);

	//**************************************

	function LGraphTextureSave() {
		this.addInput("Texture", "Texture");
		this.addOutput("tex", "Texture");
		this.addOutput("name", "string");
		this.properties = { name: "", generate_mipmaps: false };
	}

	LGraphTextureSave.title = "Save";
	LGraphTextureSave.desc = "Save a texture in the repository";

	LGraphTextureSave.prototype.getPreviewTexture = function()
	{
		return this._texture;
	}

	LGraphTextureSave.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (this.properties.generate_mipmaps) {
			tex.bind(0);
			tex.setParameter( gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
			gl.generateMipmap(tex.texture_type);
			tex.unbind(0);
		}

		if (this.properties.name) {
			//for cases where we want to perform something when storing it
			if (LGraphTexture.storeTexture) {
				LGraphTexture.storeTexture(this.properties.name, tex);
			} else {
				var container = LGraphTexture.getTexturesContainer();
				container[this.properties.name] = tex;
			}
		}

		this._texture = tex;
		this.setOutputData(0, tex);
		this.setOutputData(1, this.properties.name);
	};

	LiteGraph.registerNodeType("texture/save", LGraphTextureSave);

	//****************************************************

	function LGraphTextureOperation() {
		this.addInput("Texture", "Texture");
		this.addInput("TextureB", "Texture");
		this.addInput("value", "number");
		this.addOutput("Texture", "Texture");
		this.help = "<p>pixelcode must be vec3, uvcode must be vec2, is optional</p>\
		<p><strong>uv:</strong> tex. coords</p><p><strong>color:</strong> texture <strong>colorB:</strong> textureB</p><p><strong>time:</strong> scene time <strong>value:</strong> input value</p><p>For multiline you must type: result = ...</p>";

		this.properties = {
			value: 1,
			pixelcode: "color + colorB * value",
			uvcode: "",
			precision: LGraphTexture.DEFAULT
		};

		this.has_error = false;
	}

	LGraphTextureOperation.widgets_info = {
		uvcode: { widget: "code" },
		pixelcode: { widget: "code" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureOperation.title = "Operation";
	LGraphTextureOperation.desc = "Texture shader operation";

	LGraphTextureOperation.presets = {};

	LGraphTextureOperation.prototype.getExtraMenuOptions = function(
		graphcanvas
	) {
		var that = this;
		var txt = !that.properties.show ? "Show Texture" : "Hide Texture";
		return [
			{
				content: txt,
				callback: function() {
					that.properties.show = !that.properties.show;
				}
			}
		];
	};

	LGraphTextureOperation.prototype.onPropertyChanged = function()
	{
		this.has_error = false;
	}

	LGraphTextureOperation.prototype.onDrawBackground = function(ctx) {
		if (
			this.flags.collapsed ||
			this.size[1] <= 20 ||
			!this.properties.show
		) {
			return;
		}

		if (!this._tex) {
			return;
		}

		//only works if using a webgl renderer
		if (this._tex.gl != ctx) {
			return;
		}

		//render to graph canvas
		ctx.save();
		ctx.drawImage(this._tex, 0, 0, this.size[0], this.size[1]);
		ctx.restore();
	};

	LGraphTextureOperation.prototype.onExecute = function() {
		var tex = this.getInputData(0);

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		if (!this.properties.uvcode && !this.properties.pixelcode) {
			return;
		}

		var width = 512;
		var height = 512;
		if (tex) {
			width = tex.width;
			height = tex.height;
		} else if (texB) {
			width = texB.width;
			height = texB.height;
		}

		if(!texB)
			texB = GL.Texture.getWhiteTexture();

		var type = LGraphTexture.getTextureType( this.properties.precision, tex );

		if (!tex && !this._tex) {
			this._tex = new GL.Texture(width, height, { type: type, format: gl.RGBA, filter: gl.LINEAR });
		} else {
			this._tex = LGraphTexture.getTargetTexture( tex || this._tex, this._tex, this.properties.precision );
		}

		var uvcode = "";
		if (this.properties.uvcode) {
			uvcode = "uv = " + this.properties.uvcode;
			if (this.properties.uvcode.indexOf(";") != -1) {
				//there are line breaks, means multiline code
				uvcode = this.properties.uvcode;
			}
		}

		var pixelcode = "";
		if (this.properties.pixelcode) {
			pixelcode = "result = " + this.properties.pixelcode;
			if (this.properties.pixelcode.indexOf(";") != -1) {
				//there are line breaks, means multiline code
				pixelcode = this.properties.pixelcode;
			}
		}

		var shader = this._shader;

		if ( !this.has_error && (!shader || this._shader_code != uvcode + "|" + pixelcode) ) {

			var final_pixel_code = LGraphTexture.replaceCode( LGraphTextureOperation.pixel_shader, { UV_CODE:uvcode, PIXEL_CODE:pixelcode });

			try {
				shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, final_pixel_code );
				this.boxcolor = "#00FF00";
			} catch (err) {
				//console.log("Error compiling shader: ", err, final_pixel_code );
				GL.Shader.dumpErrorToConsole(err,Shader.SCREEN_VERTEX_SHADER, final_pixel_code);
				this.boxcolor = "#FF0000";
				this.has_error = true;
				return;
			}
			this._shader = shader;
			this._shader_code = uvcode + "|" + pixelcode;
		}

		if(!this._shader)
			return;

		var value = this.getInputData(2);
		if (value != null) {
			this.properties.value = value;
		} else {
			value = parseFloat(this.properties.value);
		}

		var time = this.graph.getTime();

		this._tex.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.BLEND);
			if (tex) {
				tex.bind(0);
			}
			if (texB) {
				texB.bind(1);
			}
			var mesh = Mesh.getScreenQuad();
			shader
				.uniforms({
					u_texture: 0,
					u_textureB: 1,
					value: value,
					texSize: [width, height,1/width,1/height],
					time: time
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureOperation.pixel_shader =
		"precision highp float;\n\
		\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		varying vec2 v_coord;\n\
		uniform vec4 texSize;\n\
		uniform float time;\n\
		uniform float value;\n\
		\n\
		void main() {\n\
			vec2 uv = v_coord;\n\
			{{UV_CODE}};\n\
			vec4 color4 = texture2D(u_texture, uv);\n\
			vec3 color = color4.rgb;\n\
			vec4 color4B = texture2D(u_textureB, uv);\n\
			vec3 colorB = color4B.rgb;\n\
			vec3 result = color;\n\
			float alpha = 1.0;\n\
			{{PIXEL_CODE}};\n\
			gl_FragColor = vec4(result, alpha);\n\
		}\n\
		";

	LGraphTextureOperation.registerPreset = function ( name, code )
	{
		LGraphTextureOperation.presets[name] = code;
	}

	LGraphTextureOperation.registerPreset("","");
	LGraphTextureOperation.registerPreset("bypass","color");
	LGraphTextureOperation.registerPreset("add","color + colorB * value");
	LGraphTextureOperation.registerPreset("substract","(color - colorB) * value");
	LGraphTextureOperation.registerPreset("mate","mix( color, colorB, color4B.a * value)");
	LGraphTextureOperation.registerPreset("invert","vec3(1.0) - color");
	LGraphTextureOperation.registerPreset("multiply","color * colorB * value");
	LGraphTextureOperation.registerPreset("divide","(color / colorB) / value");
	LGraphTextureOperation.registerPreset("difference","abs(color - colorB) * value");
	LGraphTextureOperation.registerPreset("max","max(color, colorB) * value");
	LGraphTextureOperation.registerPreset("min","min(color, colorB) * value");
	LGraphTextureOperation.registerPreset("displace","texture2D(u_texture, uv + (colorB.xy - vec2(0.5)) * value).xyz");
	LGraphTextureOperation.registerPreset("grayscale","vec3(color.x + color.y + color.z) * value / 3.0");
	LGraphTextureOperation.registerPreset("saturation","mix( vec3(color.x + color.y + color.z) / 3.0, color, value )");
	LGraphTextureOperation.registerPreset("normalmap","\n\
		float z0 = texture2D(u_texture, uv + vec2(-texSize.z, -texSize.w) ).x;\n\
		float z1 = texture2D(u_texture, uv + vec2(0.0, -texSize.w) ).x;\n\
		float z2 = texture2D(u_texture, uv + vec2(texSize.z, -texSize.w) ).x;\n\
		float z3 = texture2D(u_texture, uv + vec2(-texSize.z, 0.0) ).x;\n\
		float z4 = color.x;\n\
		float z5 = texture2D(u_texture, uv + vec2(texSize.z, 0.0) ).x;\n\
		float z6 = texture2D(u_texture, uv + vec2(-texSize.z, texSize.w) ).x;\n\
		float z7 = texture2D(u_texture, uv + vec2(0.0, texSize.w) ).x;\n\
		float z8 = texture2D(u_texture, uv + vec2(texSize.z, texSize.w) ).x;\n\
		vec3 normal = vec3( z2 + 2.0*z4 + z7 - z0 - 2.0*z3 - z5, z5 + 2.0*z6 + z7 -z0 - 2.0*z1 - z2, 1.0 );\n\
		normal.xy *= value;\n\
		result.xyz = normalize(normal) * 0.5 + vec3(0.5);\n\
	");
	LGraphTextureOperation.registerPreset("threshold","vec3(color.x > colorB.x * value ? 1.0 : 0.0,color.y > colorB.y * value ? 1.0 : 0.0,color.z > colorB.z * value ? 1.0 : 0.0)");

	//webglstudio stuff...
	LGraphTextureOperation.prototype.onInspect = function(widgets)
	{
		var that = this;
		widgets.addCombo("Presets","",{ values: Object.keys(LGraphTextureOperation.presets), callback: function(v){
			var code = LGraphTextureOperation.presets[v];
			if(!code)
				return;
			that.setProperty("pixelcode",code);
			that.title = v;
			widgets.refresh();
		}});
	}

	LiteGraph.registerNodeType("texture/operation", LGraphTextureOperation);

	//****************************************************

	function LGraphTextureShader() {
		this.addOutput("out", "Texture");
		this.properties = {
			code: "",
			u_value: 1,
			u_color: [1,1,1,1],
			width: 512,
			height: 512,
			precision: LGraphTexture.DEFAULT
		};

		this.properties.code = LGraphTextureShader.pixel_shader;
		this._uniforms = { u_value: 1, u_color: vec4.create(), in_texture: 0, texSize: vec4.create(), time: 0 };
	}

	LGraphTextureShader.title = "Shader";
	LGraphTextureShader.desc = "Texture shader";
	LGraphTextureShader.widgets_info = {
		code: { type: "code", lang: "glsl" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureShader.prototype.onPropertyChanged = function(
		name,
		value
	) {
		if (name != "code") {
			return;
		}

		var shader = this.getShader();
		if (!shader) {
			return;
		}

		//update connections
		var uniforms = shader.uniformInfo;

		//remove deprecated slots
		if (this.inputs) {
			var already = {};
			for (var i = 0; i < this.inputs.length; ++i) {
				var info = this.getInputInfo(i);
				if (!info) {
					continue;
				}

				if (uniforms[info.name] && !already[info.name]) {
					already[info.name] = true;
					continue;
				}
				this.removeInput(i);
				i--;
			}
		}

		//update existing ones
		for (var i in uniforms) {
			var info = shader.uniformInfo[i];
			if (info.loc === null) {
				continue;
			} //is an attribute, not a uniform
			if (i == "time") {
				//default one
				continue;
			}

			var type = "number";
			if (this._shader.samplers[i]) {
				type = "texture";
			} else {
				switch (info.size) {
					case 1:
						type = "number";
						break;
					case 2:
						type = "vec2";
						break;
					case 3:
						type = "vec3";
						break;
					case 4:
						type = "vec4";
						break;
					case 9:
						type = "mat3";
						break;
					case 16:
						type = "mat4";
						break;
					default:
						continue;
				}
			}

			var slot = this.findInputSlot(i);
			if (slot == -1) {
				this.addInput(i, type);
				continue;
			}

			var input_info = this.getInputInfo(slot);
			if (!input_info) {
				this.addInput(i, type);
			} else {
				if (input_info.type == type) {
					continue;
				}
				this.removeInput(slot, type);
				this.addInput(i, type);
			}
		}
	};

	LGraphTextureShader.prototype.getShader = function() {
		//replug
		if (this._shader && this._shader_code == this.properties.code) {
			return this._shader;
		}

		this._shader_code = this.properties.code;
		this._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, this.properties.code );
		if (!this._shader) {
			this.boxcolor = "red";
			return null;
		} else {
			this.boxcolor = "green";
		}
		return this._shader;
	};

	LGraphTextureShader.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var shader = this.getShader();
		if (!shader) {
			return;
		}

		var tex_slot = 0;
		var in_tex = null;

		//set uniforms
		if(this.inputs)
		for (var i = 0; i < this.inputs.length; ++i) {
			var info = this.getInputInfo(i);
			var data = this.getInputData(i);
			if (data == null) {
				continue;
			}

			if (data.constructor === GL.Texture) {
				data.bind(tex_slot);
				if (!in_tex) {
					in_tex = data;
				}
				data = tex_slot;
				tex_slot++;
			}
			shader.setUniform(info.name, data); //data is tex_slot
		}

		var uniforms = this._uniforms;
		var type = LGraphTexture.getTextureType( this.properties.precision, in_tex );

		//render to texture
		var w = this.properties.width | 0;
		var h = this.properties.height | 0;
		if (w == 0) {
			w = in_tex ? in_tex.width : gl.canvas.width;
		}
		if (h == 0) {
			h = in_tex ? in_tex.height : gl.canvas.height;
		}
		uniforms.texSize[0] = w;
		uniforms.texSize[1] = h;
		uniforms.texSize[2] = 1/w;
		uniforms.texSize[3] = 1/h;
		uniforms.time = this.graph.getTime();
		uniforms.u_value = this.properties.u_value;
		uniforms.u_color.set( this.properties.u_color );

		if ( !this._tex || this._tex.type != type ||  this._tex.width != w || this._tex.height != h ) {
			this._tex = new GL.Texture(w, h, {  type: type, format: gl.RGBA, filter: gl.LINEAR });
		}
		var tex = this._tex;
		tex.drawTo(function() {
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureShader.pixel_shader =
"precision highp float;\n\
\n\
varying vec2 v_coord;\n\
uniform float time; //time in seconds\n\
uniform vec4 texSize; //tex resolution\n\
uniform float u_value;\n\
uniform vec4 u_color;\n\n\
void main() {\n\
	vec2 uv = v_coord;\n\
	vec3 color = vec3(0.0);\n\
	//your code here\n\
	color.xy=uv;\n\n\
	gl_FragColor = vec4(color, 1.0);\n\
}\n\
";

	LiteGraph.registerNodeType("texture/shader", LGraphTextureShader);

	// Texture Scale Offset

	function LGraphTextureScaleOffset() {
		this.addInput("in", "Texture");
		this.addInput("scale", "vec2");
		this.addInput("offset", "vec2");
		this.addOutput("out", "Texture");
		this.properties = {
			offset: vec2.fromValues(0, 0),
			scale: vec2.fromValues(1, 1),
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureScaleOffset.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureScaleOffset.title = "Scale/Offset";
	LGraphTextureScaleOffset.desc = "Applies an scaling and offseting";

	LGraphTextureScaleOffset.prototype.onExecute = function() {
		var tex = this.getInputData(0);

		if (!this.isOutputConnected(0) || !tex) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;
		var type =  this.precision === LGraphTexture.LOW ? gl.UNSIGNED_BYTE : gl.HIGH_PRECISION_FORMAT;
		if (this.precision === LGraphTexture.DEFAULT) {
			type = tex.type;
		}

		if (
			!this._tex ||
			this._tex.width != width ||
			this._tex.height != height ||
			this._tex.type != type
		) {
			this._tex = new GL.Texture(width, height, {
				type: type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		var shader = this._shader;

		if (!shader) {
			shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureScaleOffset.pixel_shader
			);
		}

		var scale = this.getInputData(1);
		if (scale) {
			this.properties.scale[0] = scale[0];
			this.properties.scale[1] = scale[1];
		} else {
			scale = this.properties.scale;
		}

		var offset = this.getInputData(2);
		if (offset) {
			this.properties.offset[0] = offset[0];
			this.properties.offset[1] = offset[1];
		} else {
			offset = this.properties.offset;
		}

		this._tex.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.BLEND);
			tex.bind(0);
			var mesh = Mesh.getScreenQuad();
			shader
				.uniforms({
					u_texture: 0,
					u_scale: scale,
					u_offset: offset
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureScaleOffset.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType(
		"texture/scaleOffset",
		LGraphTextureScaleOffset
	);

	// Warp (distort a texture) *************************

	function LGraphTextureWarp() {
		this.addInput("in", "Texture");
		this.addInput("warp", "Texture");
		this.addInput("factor", "number");
		this.addOutput("out", "Texture");
		this.properties = {
			factor: 0.01,
			scale: [1,1],
			offset: [0,0],
			precision: LGraphTexture.DEFAULT
		};

		this._uniforms = { 
			u_texture: 0, 
			u_textureB: 1, 
			u_factor: 1, 
			u_scale: vec2.create(),
			u_offset: vec2.create()
		};
	}

	LGraphTextureWarp.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureWarp.title = "Warp";
	LGraphTextureWarp.desc = "Texture warp operation";

	LGraphTextureWarp.prototype.onExecute = function() {
		var tex = this.getInputData(0);

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		var texB = this.getInputData(1);

		var width = 512;
		var height = 512;
		var type = gl.UNSIGNED_BYTE;
		if (tex) {
			width = tex.width;
			height = tex.height;
			type = tex.type;
		} else if (texB) {
			width = texB.width;
			height = texB.height;
			type = texB.type;
		}

		if (!tex && !this._tex) {
			this._tex = new GL.Texture(width, height, {
				type:
					this.precision === LGraphTexture.LOW
						? gl.UNSIGNED_BYTE
						: gl.HIGH_PRECISION_FORMAT,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		} else {
			this._tex = LGraphTexture.getTargetTexture(
				tex || this._tex,
				this._tex,
				this.properties.precision
			);
		}

		var shader = this._shader;

		if (!shader) {
			shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureWarp.pixel_shader
			);
		}

		var factor = this.getInputData(2);
		if (factor != null) {
			this.properties.factor = factor;
		} else {
			factor = parseFloat(this.properties.factor);
		}
		var uniforms = this._uniforms;
		uniforms.u_factor = factor;
		uniforms.u_scale.set( this.properties.scale );
		uniforms.u_offset.set( this.properties.offset );

		this._tex.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			gl.disable(gl.CULL_FACE);
			gl.disable(gl.BLEND);
			if (tex) {
				tex.bind(0);
			}
			if (texB) {
				texB.bind(1);
			}
			var mesh = Mesh.getScreenQuad();
			shader
				.uniforms( uniforms )
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureWarp.pixel_shader =
		"precision highp float;\n\
		\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		varying vec2 v_coord;\n\
		uniform float u_factor;\n\
		uniform vec2 u_scale;\n\
		uniform vec2 u_offset;\n\
		\n\
		void main() {\n\
			vec2 uv = v_coord;\n\
			uv += ( texture2D(u_textureB, uv).rg - vec2(0.5)) * u_factor * u_scale + u_offset;\n\
			gl_FragColor = texture2D(u_texture, uv);\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/warp", LGraphTextureWarp);

	//****************************************************

	// Texture to Viewport *****************************************
	function LGraphTextureToViewport() {
		this.addInput("Texture", "Texture");
		this.properties = {
			additive: false,
			antialiasing: false,
			filter: true,
			disable_alpha: false,
			gamma: 1.0,
			viewport: [0,0,1,1]
		};
		this.size[0] = 130;
	}

	LGraphTextureToViewport.title = "to Viewport";
	LGraphTextureToViewport.desc = "Texture to viewport";

	LGraphTextureToViewport._prev_viewport = new Float32Array(4);

	LGraphTextureToViewport.prototype.onDrawBackground = function( ctx )
	{
		if ( this.flags.collapsed || this.size[1] <= 40 )
			return;

		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		ctx.drawImage( ctx == gl ? tex : gl.canvas, 10,30, this.size[0] -20, this.size[1] -40);
	}

	LGraphTextureToViewport.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (this.properties.disable_alpha) {
			gl.disable(gl.BLEND);
		} else {
			gl.enable(gl.BLEND);
			if (this.properties.additive) {
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
			} else {
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			}
		}

		gl.disable(gl.DEPTH_TEST);
		var gamma = this.properties.gamma || 1.0;
		if (this.isInputConnected(1)) {
			gamma = this.getInputData(1);
		}

		tex.setParameter(
			gl.TEXTURE_MAG_FILTER,
			this.properties.filter ? gl.LINEAR : gl.NEAREST
		);

		var old_viewport = LGraphTextureToViewport._prev_viewport;
		old_viewport.set( gl.viewport_data );
		var new_view = this.properties.viewport;
		gl.viewport( old_viewport[0] + old_viewport[2] * new_view[0], old_viewport[1] + old_viewport[3] * new_view[1], old_viewport[2] * new_view[2], old_viewport[3] * new_view[3] );
		var viewport = gl.getViewport(); //gl.getParameter(gl.VIEWPORT);

		if (this.properties.antialiasing) {
			if (!LGraphTextureToViewport._shader) {
				LGraphTextureToViewport._shader = new GL.Shader(
					GL.Shader.SCREEN_VERTEX_SHADER,
					LGraphTextureToViewport.aa_pixel_shader
				);
			}

			var mesh = Mesh.getScreenQuad();
			tex.bind(0);
			LGraphTextureToViewport._shader
				.uniforms({
					u_texture: 0,
					uViewportSize: [tex.width, tex.height],
					u_igamma: 1 / gamma,
					inverseVP: [1 / tex.width, 1 / tex.height]
				})
				.draw(mesh);
		} else {
			if (gamma != 1.0) {
				if (!LGraphTextureToViewport._gamma_shader) {
					LGraphTextureToViewport._gamma_shader = new GL.Shader(
						Shader.SCREEN_VERTEX_SHADER,
						LGraphTextureToViewport.gamma_pixel_shader
					);
				}
				tex.toViewport(LGraphTextureToViewport._gamma_shader, {
					u_texture: 0,
					u_igamma: 1 / gamma
				});
			} else {
				tex.toViewport();
			}
		}

		gl.viewport( old_viewport[0], old_viewport[1], old_viewport[2], old_viewport[3] );
	};

	LGraphTextureToViewport.prototype.onGetInputs = function() {
		return [["gamma", "number"]];
	};

	LGraphTextureToViewport.aa_pixel_shader =
		"precision highp float;\n\
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

	LGraphTextureToViewport.gamma_pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType(
		"texture/toviewport",
		LGraphTextureToViewport
	);

	// Texture Copy *****************************************
	function LGraphTextureCopy() {
		this.addInput("Texture", "Texture");
		this.addOutput("", "Texture");
		this.properties = {
			size: 0,
			generate_mipmaps: false,
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureCopy.title = "Copy";
	LGraphTextureCopy.desc = "Copy Texture";
	LGraphTextureCopy.widgets_info = {
		size: {
			widget: "combo",
			values: [0, 32, 64, 128, 256, 512, 1024, 2048]
		},
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureCopy.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex && !this._temp_texture) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		//copy the texture
		if (tex) {
			var width = tex.width;
			var height = tex.height;

			if (this.properties.size != 0) {
				width = this.properties.size;
				height = this.properties.size;
			}

			var temp = this._temp_texture;

			var type = tex.type;
			if (this.properties.precision === LGraphTexture.LOW) {
				type = gl.UNSIGNED_BYTE;
			} else if (this.properties.precision === LGraphTexture.HIGH) {
				type = gl.HIGH_PRECISION_FORMAT;
			}

			if (
				!temp ||
				temp.width != width ||
				temp.height != height ||
				temp.type != type
			) {
				var minFilter = gl.LINEAR;
				if (
					this.properties.generate_mipmaps &&
					isPowerOfTwo(width) &&
					isPowerOfTwo(height)
				) {
					minFilter = gl.LINEAR_MIPMAP_LINEAR;
				}
				this._temp_texture = new GL.Texture(width, height, {
					type: type,
					format: gl.RGBA,
					minFilter: minFilter,
					magFilter: gl.LINEAR
				});
			}
			tex.copyTo(this._temp_texture);

			if (this.properties.generate_mipmaps) {
				this._temp_texture.bind(0);
				gl.generateMipmap(this._temp_texture.texture_type);
				this._temp_texture.unbind(0);
			}
		}

		this.setOutputData(0, this._temp_texture);
	};

	LiteGraph.registerNodeType("texture/copy", LGraphTextureCopy);

	// Texture Downsample *****************************************
	function LGraphTextureDownsample() {
		this.addInput("Texture", "Texture");
		this.addOutput("", "Texture");
		this.properties = {
			iterations: 1,
			generate_mipmaps: false,
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureDownsample.title = "Downsample";
	LGraphTextureDownsample.desc = "Downsample Texture";
	LGraphTextureDownsample.widgets_info = {
		iterations: { type: "number", step: 1, precision: 0, min: 0 },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureDownsample.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex && !this._temp_texture) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		//we do not allow any texture different than texture 2D
		if (!tex || tex.texture_type !== GL.TEXTURE_2D) {
			return;
		}

		if (this.properties.iterations < 1) {
			this.setOutputData(0, tex);
			return;
		}

		var shader = LGraphTextureDownsample._shader;
		if (!shader) {
			LGraphTextureDownsample._shader = shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureDownsample.pixel_shader
			);
		}

		var width = tex.width | 0;
		var height = tex.height | 0;
		var type = tex.type;
		if (this.properties.precision === LGraphTexture.LOW) {
			type = gl.UNSIGNED_BYTE;
		} else if (this.properties.precision === LGraphTexture.HIGH) {
			type = gl.HIGH_PRECISION_FORMAT;
		}
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

		if (this._texture) {
			GL.Texture.releaseTemporary(this._texture);
		}

		for (var i = 0; i < iterations; ++i) {
			offset[0] = 1 / width;
			offset[1] = 1 / height;
			width = width >> 1 || 0;
			height = height >> 1 || 0;
			target = GL.Texture.getTemporary(width, height, options);
			temp.push(target);
			origin.setParameter(GL.TEXTURE_MAG_FILTER, GL.NEAREST);
			origin.copyTo(target, shader, uniforms);
			if (width == 1 && height == 1) {
				break;
			} //nothing else to do
			origin = target;
		}

		//keep the last texture used
		this._texture = temp.pop();

		//free the rest
		for (var i = 0; i < temp.length; ++i) {
			GL.Texture.releaseTemporary(temp[i]);
		}

		if (this.properties.generate_mipmaps) {
			this._texture.bind(0);
			gl.generateMipmap(this._texture.texture_type);
			this._texture.unbind(0);
		}

		this.setOutputData(0, this._texture);
	};

	LGraphTextureDownsample.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType(
		"texture/downsample",
		LGraphTextureDownsample
	);



	function LGraphTextureResize() {
		this.addInput("Texture", "Texture");
		this.addOutput("", "Texture");
		this.properties = {
			size: [512,512],
			generate_mipmaps: false,
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureResize.title = "Resize";
	LGraphTextureResize.desc = "Resize Texture";
	LGraphTextureResize.widgets_info = {
		iterations: { type: "number", step: 1, precision: 0, min: 0 },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureResize.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex && !this._temp_texture) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		//we do not allow any texture different than texture 2D
		if (!tex || tex.texture_type !== GL.TEXTURE_2D) {
			return;
		}

		var width = this.properties.size[0] | 0;
		var height = this.properties.size[1] | 0;
		if(width == 0)
			width = tex.width;
		if(height == 0)
			height = tex.height;
		var type = tex.type;
		if (this.properties.precision === LGraphTexture.LOW) {
			type = gl.UNSIGNED_BYTE;
		} else if (this.properties.precision === LGraphTexture.HIGH) {
			type = gl.HIGH_PRECISION_FORMAT;
		}

		if( !this._texture || this._texture.width != width || this._texture.height != height || this._texture.type != type )
			this._texture = new GL.Texture( width, height, { type: type } );

		tex.copyTo( this._texture );

		if (this.properties.generate_mipmaps) {
			this._texture.bind(0);
			gl.generateMipmap(this._texture.texture_type);
			this._texture.unbind(0);
		}

		this.setOutputData(0, this._texture);
	};

	LiteGraph.registerNodeType( "texture/resize", LGraphTextureResize );

	// Texture Average  *****************************************
	function LGraphTextureAverage() {
		this.addInput("Texture", "Texture");
		this.addOutput("tex", "Texture");
		this.addOutput("avg", "vec4");
		this.addOutput("lum", "number");
		this.properties = {
			use_previous_frame: true, //to avoid stalls 
			high_quality: false //to use as much pixels as possible
		};

		this._uniforms = {
			u_texture: 0,
			u_mipmap_offset: 0
		};
		this._luminance = new Float32Array(4);
	}

	LGraphTextureAverage.title = "Average";
	LGraphTextureAverage.desc =
		"Compute a partial average (32 random samples) of a texture and stores it as a 1x1 pixel texture.\n If high_quality is true, then it generates the mipmaps first and reads from the lower one.";

	LGraphTextureAverage.prototype.onExecute = function() {
		if (!this.properties.use_previous_frame) {
			this.updateAverage();
		}

		var v = this._luminance;
		this.setOutputData(0, this._temp_texture);
		this.setOutputData(1, v);
		this.setOutputData(2, (v[0] + v[1] + v[2]) / 3);
	};

	//executed before rendering the frame
	LGraphTextureAverage.prototype.onPreRenderExecute = function() {
		this.updateAverage();
	};

	LGraphTextureAverage.prototype.updateAverage = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (
			!this.isOutputConnected(0) &&
			!this.isOutputConnected(1) &&
			!this.isOutputConnected(2)
		) {
			return;
		} //saves work

		if (!LGraphTextureAverage._shader) {
			LGraphTextureAverage._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureAverage.pixel_shader
			);
			//creates 256 random numbers and stores them in two mat4
			var samples = new Float32Array(16);
			for (var i = 0; i < samples.length; ++i) {
				samples[i] = Math.random(); //poorly distributed samples
			}
			//upload only once
			LGraphTextureAverage._shader.uniforms({
				u_samples_a: samples.subarray(0, 16),
				u_samples_b: samples.subarray(16, 32)
			});
		}

		var temp = this._temp_texture;
		var type = gl.UNSIGNED_BYTE;
		if (tex.type != type) {
			//force floats, half floats cannot be read with gl.readPixels
			type = gl.FLOAT;
		}

		if (!temp || temp.type != type) {
			this._temp_texture = new GL.Texture(1, 1, {
				type: type,
				format: gl.RGBA,
				filter: gl.NEAREST
			});
		}

		this._uniforms.u_mipmap_offset = 0;

		if(this.properties.high_quality)
		{
			if( !this._temp_pot2_texture || this._temp_pot2_texture.type != type )
				this._temp_pot2_texture = new GL.Texture(512, 512, {
					type: type,
					format: gl.RGBA,
					minFilter: gl.LINEAR_MIPMAP_LINEAR,
					magFilter: gl.LINEAR
				});

			tex.copyTo( this._temp_pot2_texture );
			tex = this._temp_pot2_texture;
			tex.bind(0);
			gl.generateMipmap(GL.TEXTURE_2D);
			this._uniforms.u_mipmap_offset = 9;
		}

		var shader = LGraphTextureAverage._shader;
		var uniforms = this._uniforms;
		uniforms.u_mipmap_offset = this.properties.mipmap_offset;
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		this._temp_texture.drawTo(function() {
			tex.toViewport(shader, uniforms);
		});

		if (this.isOutputConnected(1) || this.isOutputConnected(2)) {
			var pixel = this._temp_texture.getPixels();
			if (pixel) {
				var v = this._luminance;
				var type = this._temp_texture.type;
				v.set(pixel);
				if (type == gl.UNSIGNED_BYTE) {
					vec4.scale(v, v, 1 / 255);
				} else if (
					type == GL.HALF_FLOAT ||
					type == GL.HALF_FLOAT_OES
				) {
					//no half floats possible, hard to read back unless copyed to a FLOAT texture, so temp_texture is always forced to FLOAT
				}
			}
		}
	};

	LGraphTextureAverage.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		uniform mat4 u_samples_a;\n\
		uniform mat4 u_samples_b;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_mipmap_offset;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			vec4 color = vec4(0.0);\n\
			//random average\n\
			for(int i = 0; i < 4; ++i)\n\
				for(int j = 0; j < 4; ++j)\n\
				{\n\
					color += texture2D(u_texture, vec2( u_samples_a[i][j], u_samples_b[i][j] ), u_mipmap_offset );\n\
					color += texture2D(u_texture, vec2( 1.0 - u_samples_a[i][j], 1.0 - u_samples_b[i][j] ), u_mipmap_offset );\n\
				}\n\
		   gl_FragColor = color * 0.03125;\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/average", LGraphTextureAverage);



	// Computes operation between pixels (max, min)  *****************************************
	function LGraphTextureMinMax() {
		this.addInput("Texture", "Texture");
		this.addOutput("min_t", "Texture");
		this.addOutput("max_t", "Texture");
		this.addOutput("min", "vec4");
		this.addOutput("max", "vec4");
		this.properties = {
			mode: "max",
			use_previous_frame: true //to avoid stalls 
		};

		this._uniforms = {
			u_texture: 0
		};

		this._max = new Float32Array(4);
		this._min = new Float32Array(4);

		this._textures_chain = [];
	}

	LGraphTextureMinMax.widgets_info = {
		mode: { widget: "combo", values: ["min","max","avg"] }
	};

	LGraphTextureMinMax.title = "MinMax";
	LGraphTextureMinMax.desc = "Compute the scene min max";

	LGraphTextureMinMax.prototype.onExecute = function() {
		if (!this.properties.use_previous_frame) {
			this.update();
		}

		this.setOutputData(0, this._temp_texture);
		this.setOutputData(1, this._luminance);
	};

	//executed before rendering the frame
	LGraphTextureMinMax.prototype.onPreRenderExecute = function() {
		this.update();
	};

	LGraphTextureMinMax.prototype.update = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if ( !this.isOutputConnected(0) && !this.isOutputConnected(1) ) {
			return;
		} //saves work

		if (!LGraphTextureMinMax._shader) {
			LGraphTextureMinMax._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureMinMax.pixel_shader );
		}

		var temp = this._temp_texture;
		var type = gl.UNSIGNED_BYTE;
		if (tex.type != type) {
			//force floats, half floats cannot be read with gl.readPixels
			type = gl.FLOAT;
		}

		var size = 512;

		if( !this._textures_chain.length || this._textures_chain[0].type != type )
		{
			var index = 0;
			while(i)
			{
				this._textures_chain[i] = new GL.Texture( size, size, {
					type: type,
					format: gl.RGBA,
					filter: gl.NEAREST
				});
				size = size >> 2;
				i++;
				if(size == 1)
					break;
			}
		}

		tex.copyTo( this._textures_chain[0] );
		var prev = this._textures_chain[0];
		for(var i = 1; i <= this._textures_chain.length; ++i)
		{
			var tex = this._textures_chain[i];

			prev = tex;				
		}

		var shader = LGraphTextureMinMax._shader;
		var uniforms = this._uniforms;
		uniforms.u_mipmap_offset = this.properties.mipmap_offset;
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);
		this._temp_texture.drawTo(function() {
			tex.toViewport(shader, uniforms);
		});
	};

	LGraphTextureMinMax.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		uniform mat4 u_samples_a;\n\
		uniform mat4 u_samples_b;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_mipmap_offset;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			vec4 color = vec4(0.0);\n\
			//random average\n\
			for(int i = 0; i < 4; ++i)\n\
				for(int j = 0; j < 4; ++j)\n\
				{\n\
					color += texture2D(u_texture, vec2( u_samples_a[i][j], u_samples_b[i][j] ), u_mipmap_offset );\n\
					color += texture2D(u_texture, vec2( 1.0 - u_samples_a[i][j], 1.0 - u_samples_b[i][j] ), u_mipmap_offset );\n\
				}\n\
		   gl_FragColor = color * 0.03125;\n\
		}\n\
		";

	//LiteGraph.registerNodeType("texture/clustered_operation", LGraphTextureClusteredOperation);


	function LGraphTextureTemporalSmooth() {
		this.addInput("in", "Texture");
		this.addInput("factor", "Number");
		this.addOutput("out", "Texture");
		this.properties = { factor: 0.5 };
		this._uniforms = {
			u_texture: 0,
			u_textureB: 1,
			u_factor: this.properties.factor
		};
	}

	LGraphTextureTemporalSmooth.title = "Smooth";
	LGraphTextureTemporalSmooth.desc = "Smooth texture over time";

	LGraphTextureTemporalSmooth.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex || !this.isOutputConnected(0)) {
			return;
		}

		if (!LGraphTextureTemporalSmooth._shader) {
			LGraphTextureTemporalSmooth._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureTemporalSmooth.pixel_shader
			);
		}

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.type != tex.type ||
			temp.width != tex.width ||
			temp.height != tex.height
		) {
			var options = {
				type: tex.type,
				format: gl.RGBA,
				filter: gl.NEAREST
			};
			this._temp_texture = new GL.Texture(tex.width, tex.height, options );
			this._temp_texture2 = new GL.Texture(tex.width, tex.height, options );
			tex.copyTo(this._temp_texture2);
		}

		var tempA = this._temp_texture;
		var tempB = this._temp_texture2;

		var shader = LGraphTextureTemporalSmooth._shader;
		var uniforms = this._uniforms;
		uniforms.u_factor = 1.0 - this.getInputOrProperty("factor");

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		tempA.drawTo(function() {
			tempB.bind(1);
			tex.toViewport(shader, uniforms);
		});

		this.setOutputData(0, tempA);

		//swap
		this._temp_texture = tempB;
		this._temp_texture2 = tempA;
	};

	LGraphTextureTemporalSmooth.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		uniform float u_factor;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			gl_FragColor = mix( texture2D( u_texture, v_coord ), texture2D( u_textureB, v_coord ), u_factor );\n\
		}\n\
		";

	LiteGraph.registerNodeType( "texture/temporal_smooth", LGraphTextureTemporalSmooth );


	function LGraphTextureLinearAvgSmooth() {
		this.addInput("in", "Texture");
		this.addOutput("avg", "Texture");
		this.addOutput("array", "Texture");
		this.properties = { samples: 64, frames_interval: 1 };
		this._uniforms = {
			u_texture: 0,
			u_textureB: 1,
			u_samples: this.properties.samples,
			u_isamples: 1/this.properties.samples
		};
		this.frame = 0;
	}

	LGraphTextureLinearAvgSmooth.title = "Lineal Avg Smooth";
	LGraphTextureLinearAvgSmooth.desc = "Smooth texture linearly over time";

	LGraphTextureLinearAvgSmooth["@samples"] = { type: "number", min: 1, max: 64, step: 1, precision: 1 };

	LGraphTextureLinearAvgSmooth.prototype.getPreviewTexture = function()
	{
		return this._temp_texture2;
	}

	LGraphTextureLinearAvgSmooth.prototype.onExecute = function() {

		var tex = this.getInputData(0);
		if (!tex || !this.isOutputConnected(0)) {
			return;
		}

		if (!LGraphTextureLinearAvgSmooth._shader) {
			LGraphTextureLinearAvgSmooth._shader_copy = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureLinearAvgSmooth.pixel_shader_copy );
			LGraphTextureLinearAvgSmooth._shader_avg = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureLinearAvgSmooth.pixel_shader_avg );
		}

		var samples = Math.clamp(this.properties.samples,0,64);
		var frame = this.frame;
		var interval = this.properties.frames_interval;

		if( interval == 0 || frame % interval == 0 )
		{
			var temp = this._temp_texture;
			if ( !temp || temp.type != tex.type || temp.width != samples ) {
				var options = {
					type: tex.type,
					format: gl.RGBA,
					filter: gl.NEAREST
				};
				this._temp_texture = new GL.Texture( samples, 1, options );
				this._temp_texture2 = new GL.Texture( samples, 1, options );
				this._temp_texture_out = new GL.Texture( 1, 1, options );
			}

			var tempA = this._temp_texture;
			var tempB = this._temp_texture2;

			var shader_copy = LGraphTextureLinearAvgSmooth._shader_copy;
			var shader_avg = LGraphTextureLinearAvgSmooth._shader_avg;
			var uniforms = this._uniforms;
			uniforms.u_samples = samples;
			uniforms.u_isamples = 1.0 / samples;

			gl.disable(gl.BLEND);
			gl.disable(gl.DEPTH_TEST);
			tempA.drawTo(function() {
				tempB.bind(1);
				tex.toViewport( shader_copy, uniforms );
			});

			this._temp_texture_out.drawTo(function() {
				tempA.toViewport( shader_avg, uniforms );
			});

			this.setOutputData( 0, this._temp_texture_out );

			//swap
			this._temp_texture = tempB;
			this._temp_texture2 = tempA;
		}
		else
			this.setOutputData(0, this._temp_texture_out);
		this.setOutputData(1, this._temp_texture2);
		this.frame++;
	};

	LGraphTextureLinearAvgSmooth.pixel_shader_copy =
		"precision highp float;\n\
		precision highp float;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		uniform float u_isamples;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			if( v_coord.x <= u_isamples )\n\
				gl_FragColor = texture2D( u_texture, vec2(0.5) );\n\
			else\n\
				gl_FragColor = texture2D( u_textureB, v_coord - vec2(u_isamples,0.0) );\n\
		}\n\
		";

	LGraphTextureLinearAvgSmooth.pixel_shader_avg =
		"precision highp float;\n\
		precision highp float;\n\
		uniform sampler2D u_texture;\n\
		uniform int u_samples;\n\
		uniform float u_isamples;\n\
		varying vec2 v_coord;\n\
		\n\
		void main() {\n\
			vec4 color = vec4(0.0);\n\
			for(int i = 0; i < 64; ++i)\n\
			{\n\
				color += texture2D( u_texture, vec2( float(i)*u_isamples,0.0) );\n\
				if(i == (u_samples - 1))\n\
					break;\n\
			}\n\
			gl_FragColor = color * u_isamples;\n\
		}\n\
		";


	LiteGraph.registerNodeType( "texture/linear_avg_smooth", LGraphTextureLinearAvgSmooth );

	// Image To Texture *****************************************
	function LGraphImageToTexture() {
		this.addInput("Image", "image");
		this.addOutput("", "Texture");
		this.properties = {};
	}

	LGraphImageToTexture.title = "Image to Texture";
	LGraphImageToTexture.desc = "Uploads an image to the GPU";
	//LGraphImageToTexture.widgets_info = { size: { widget:"combo", values:[0,32,64,128,256,512,1024,2048]} };

	LGraphImageToTexture.prototype.onExecute = function() {
		var img = this.getInputData(0);
		if (!img) {
			return;
		}

		var width = img.videoWidth || img.width;
		var height = img.videoHeight || img.height;

		//this is in case we are using a webgl canvas already, no need to reupload it
		if (img.gltexture) {
			this.setOutputData(0, img.gltexture);
			return;
		}

		var temp = this._temp_texture;
		if (!temp || temp.width != width || temp.height != height) {
			this._temp_texture = new GL.Texture(width, height, {
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		try {
			this._temp_texture.uploadImage(img);
		} catch (err) {
			console.error(
				"image comes from an unsafe location, cannot be uploaded to webgl: " +
					err
			);
			return;
		}

		this.setOutputData(0, this._temp_texture);
	};

	LiteGraph.registerNodeType(
		"texture/imageToTexture",
		LGraphImageToTexture
	);

	// Texture LUT *****************************************
	function LGraphTextureLUT() {
		this.addInput("Texture", "Texture");
		this.addInput("LUT", "Texture");
		this.addInput("Intensity", "number");
		this.addOutput("", "Texture");
		this.properties = { enabled: true, intensity: 1, precision: LGraphTexture.DEFAULT, texture: null };

		if (!LGraphTextureLUT._shader) {
			LGraphTextureLUT._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureLUT.pixel_shader );
		}
	}

	LGraphTextureLUT.widgets_info = {
		texture: { widget: "texture" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLUT.title = "LUT";
	LGraphTextureLUT.desc = "Apply LUT to Texture";

	LGraphTextureLUT.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		if (this.properties.precision === LGraphTexture.PASS_THROUGH || this.properties.enabled === false) {
			this.setOutputData(0, tex);
			return;
		}

		if (!tex) {
			return;
		}

		var lut_tex = this.getInputData(1);

		if (!lut_tex) {
			lut_tex = LGraphTexture.getTexture(this.properties.texture);
		}

		if (!lut_tex) {
			this.setOutputData(0, tex);
			return;
		}

		lut_tex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_WRAP_S,
			gl.CLAMP_TO_EDGE
		);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_WRAP_T,
			gl.CLAMP_TO_EDGE
		);
		gl.bindTexture(gl.TEXTURE_2D, null);

		var intensity = this.properties.intensity;
		if (this.isInputConnected(2)) {
			this.properties.intensity = intensity = this.getInputData(2);
		}

		this._tex = LGraphTexture.getTargetTexture(
			tex,
			this._tex,
			this.properties.precision
		);

		//var mesh = Mesh.getScreenQuad();

		this._tex.drawTo(function() {
			lut_tex.bind(1);
			tex.toViewport(LGraphTextureLUT._shader, {
				u_texture: 0,
				u_textureB: 1,
				u_amount: intensity
			});
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureLUT.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType("texture/LUT", LGraphTextureLUT);


	// Texture LUT *****************************************
	function LGraphTextureEncode() {
		this.addInput("Texture", "Texture");
		this.addInput("Atlas", "Texture");
		this.addOutput("", "Texture");
		this.properties = { enabled: true, num_row_symbols: 4, symbol_size: 16, brightness: 1, colorize: false, filter: false, invert: false, precision: LGraphTexture.DEFAULT, generate_mipmaps: false, texture: null };

		if (!LGraphTextureEncode._shader) {
			LGraphTextureEncode._shader = new GL.Shader( Shader.SCREEN_VERTEX_SHADER, LGraphTextureEncode.pixel_shader );
		}

		this._uniforms = {
				u_texture: 0,
				u_textureB: 1,
				u_row_simbols: 4,
				u_simbol_size: 16,
				u_res: vec2.create()
		};
	}

	LGraphTextureEncode.widgets_info = {
		texture: { widget: "texture" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureEncode.title = "Encode";
	LGraphTextureEncode.desc = "Apply a texture atlas to encode a texture";

	LGraphTextureEncode.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		if (this.properties.precision === LGraphTexture.PASS_THROUGH || this.properties.enabled === false) {
			this.setOutputData(0, tex);
			return;
		}

		if (!tex) {
			return;
		}

		var symbols_tex = this.getInputData(1);

		if (!symbols_tex) {
			symbols_tex = LGraphTexture.getTexture(this.properties.texture);
		}

		if (!symbols_tex) {
			this.setOutputData(0, tex);
			return;
		}

		symbols_tex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.properties.filter ? gl.LINEAR : gl.NEAREST );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.properties.filter ? gl.LINEAR : gl.NEAREST );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
		gl.bindTexture(gl.TEXTURE_2D, null);

		var uniforms = this._uniforms;
		uniforms.u_row_simbols = Math.floor(this.properties.num_row_symbols);
		uniforms.u_symbol_size = this.properties.symbol_size;
		uniforms.u_brightness = this.properties.brightness;
		uniforms.u_invert = this.properties.invert ? 1 : 0;
		uniforms.u_colorize = this.properties.colorize ? 1 : 0;

		this._tex = LGraphTexture.getTargetTexture( tex, this._tex, this.properties.precision );
		uniforms.u_res[0] = this._tex.width;
		uniforms.u_res[1] = this._tex.height;
		this._tex.bind(0);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST );

		this._tex.drawTo(function() {
			symbols_tex.bind(1);
			tex.toViewport(LGraphTextureEncode._shader, uniforms);
		});

		if (this.properties.generate_mipmaps) {
			this._tex.bind(0);
			gl.generateMipmap(this._tex.texture_type);
			this._tex.unbind(0);
		}

		this.setOutputData(0, this._tex);
	};

	LGraphTextureEncode.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_textureB;\n\
		uniform float u_row_simbols;\n\
		uniform float u_symbol_size;\n\
		uniform float u_brightness;\n\
		uniform float u_invert;\n\
		uniform float u_colorize;\n\
		uniform vec2 u_res;\n\
		\n\
		void main() {\n\
			vec2 total_symbols = u_res / u_symbol_size;\n\
			vec2 uv = floor(v_coord * total_symbols) / total_symbols; //pixelate \n\
			vec2 local_uv = mod(v_coord * u_res, u_symbol_size) / u_symbol_size;\n\
			lowp vec4 textureColor = texture2D(u_texture, uv );\n\
			float lum = clamp(u_brightness * (textureColor.x + textureColor.y + textureColor.z)/3.0,0.0,1.0);\n\
			if( u_invert == 1.0 ) lum = 1.0 - lum;\n\
			float index = floor( lum * (u_row_simbols * u_row_simbols - 1.0));\n\
			float col = mod( index, u_row_simbols );\n\
			float row = u_row_simbols - floor( index / u_row_simbols ) - 1.0;\n\
			vec2 simbol_uv = ( vec2( col, row ) + local_uv ) / u_row_simbols;\n\
			vec4 color = texture2D( u_textureB, simbol_uv );\n\
			if(u_colorize == 1.0)\n\
				color *= textureColor;\n\
			gl_FragColor = color;\n\
		}\n\
		";

	LiteGraph.registerNodeType("texture/encode", LGraphTextureEncode);

	// Texture Channels *****************************************
	function LGraphTextureChannels() {
		this.addInput("Texture", "Texture");

		this.addOutput("R", "Texture");
		this.addOutput("G", "Texture");
		this.addOutput("B", "Texture");
		this.addOutput("A", "Texture");

		//this.properties = { use_single_channel: true };
		if (!LGraphTextureChannels._shader) {
			LGraphTextureChannels._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureChannels.pixel_shader
			);
		}
	}

	LGraphTextureChannels.title = "Texture to Channels";
	LGraphTextureChannels.desc = "Split texture channels";

	LGraphTextureChannels.prototype.onExecute = function() {
		var texA = this.getInputData(0);
		if (!texA) {
			return;
		}

		if (!this._channels) {
			this._channels = Array(4);
		}

		//var format = this.properties.use_single_channel ? gl.LUMINANCE : gl.RGBA; //not supported by WebGL1
		var format = gl.RGB;
		var connections = 0;
		for (var i = 0; i < 4; i++) {
			if (this.isOutputConnected(i)) {
				if (
					!this._channels[i] ||
					this._channels[i].width != texA.width ||
					this._channels[i].height != texA.height ||
					this._channels[i].type != texA.type ||
					this._channels[i].format != format
				) {
					this._channels[i] = new GL.Texture(
						texA.width,
						texA.height,
						{
							type: texA.type,
							format: format,
							filter: gl.LINEAR
						}
					);
				}
				connections++;
			} else {
				this._channels[i] = null;
			}
		}

		if (!connections) {
			return;
		}

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureChannels._shader;
		var masks = [
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		];

		for (var i = 0; i < 4; i++) {
			if (!this._channels[i]) {
				continue;
			}

			this._channels[i].drawTo(function() {
				texA.bind(0);
				shader
					.uniforms({ u_texture: 0, u_mask: masks[i] })
					.draw(mesh);
			});
			this.setOutputData(i, this._channels[i]);
		}
	};

	LGraphTextureChannels.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec4 u_mask;\n\
		\n\
		void main() {\n\
		   gl_FragColor = vec4( vec3( length( texture2D(u_texture, v_coord) * u_mask )), 1.0 );\n\
		}\n\
		";

	LiteGraph.registerNodeType(
		"texture/textureChannels",
		LGraphTextureChannels
	);

	// Texture Channels to Texture *****************************************
	function LGraphChannelsTexture() {
		this.addInput("R", "Texture");
		this.addInput("G", "Texture");
		this.addInput("B", "Texture");
		this.addInput("A", "Texture");

		this.addOutput("Texture", "Texture");

		this.properties = {
			precision: LGraphTexture.DEFAULT,
			R: 1,
			G: 1,
			B: 1,
			A: 1
		};
		this._color = vec4.create();
		this._uniforms = {
			u_textureR: 0,
			u_textureG: 1,
			u_textureB: 2,
			u_textureA: 3,
			u_color: this._color
		};
	}

	LGraphChannelsTexture.title = "Channels to Texture";
	LGraphChannelsTexture.desc = "Split texture channels";
	LGraphChannelsTexture.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphChannelsTexture.prototype.onExecute = function() {
		var white = LGraphTexture.getWhiteTexture();
		var texR = this.getInputData(0) || white;
		var texG = this.getInputData(1) || white;
		var texB = this.getInputData(2) || white;
		var texA = this.getInputData(3) || white;

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		if (!LGraphChannelsTexture._shader) {
			LGraphChannelsTexture._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphChannelsTexture.pixel_shader
			);
		}
		var shader = LGraphChannelsTexture._shader;

		var w = Math.max(texR.width, texG.width, texB.width, texA.width);
		var h = Math.max(
			texR.height,
			texG.height,
			texB.height,
			texA.height
		);
		var type =
			this.properties.precision == LGraphTexture.HIGH
				? LGraphTexture.HIGH_PRECISION_FORMAT
				: gl.UNSIGNED_BYTE;

		if (
			!this._texture ||
			this._texture.width != w ||
			this._texture.height != h ||
			this._texture.type != type
		) {
			this._texture = new GL.Texture(w, h, {
				type: type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		var color = this._color;
		color[0] = this.properties.R;
		color[1] = this.properties.G;
		color[2] = this.properties.B;
		color[3] = this.properties.A;
		var uniforms = this._uniforms;

		this._texture.drawTo(function() {
			texR.bind(0);
			texG.bind(1);
			texB.bind(2);
			texA.bind(3);
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._texture);
	};

	LGraphChannelsTexture.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_textureR;\n\
		uniform sampler2D u_textureG;\n\
		uniform sampler2D u_textureB;\n\
		uniform sampler2D u_textureA;\n\
		uniform vec4 u_color;\n\
		\n\
		void main() {\n\
		   gl_FragColor = u_color * vec4( \
					texture2D(u_textureR, v_coord).r,\
					texture2D(u_textureG, v_coord).r,\
					texture2D(u_textureB, v_coord).r,\
					texture2D(u_textureA, v_coord).r);\n\
		}\n\
		";

	LiteGraph.registerNodeType(
		"texture/channelsTexture",
		LGraphChannelsTexture
	);

	// Texture Color *****************************************
	function LGraphTextureColor() {
		this.addOutput("Texture", "Texture");

		this._tex_color = vec4.create();
		this.properties = {
			color: vec4.create(),
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureColor.title = "Color";
	LGraphTextureColor.desc =
		"Generates a 1x1 texture with a constant color";

	LGraphTextureColor.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureColor.prototype.onDrawBackground = function(ctx) {
		var c = this.properties.color;
		ctx.fillStyle =
			"rgb(" +
			Math.floor(Math.clamp(c[0], 0, 1) * 255) +
			"," +
			Math.floor(Math.clamp(c[1], 0, 1) * 255) +
			"," +
			Math.floor(Math.clamp(c[2], 0, 1) * 255) +
			")";
		if (this.flags.collapsed) {
			this.boxcolor = ctx.fillStyle;
		} else {
			ctx.fillRect(0, 0, this.size[0], this.size[1]);
		}
	};

	LGraphTextureColor.prototype.onExecute = function() {
		var type =
			this.properties.precision == LGraphTexture.HIGH
				? LGraphTexture.HIGH_PRECISION_FORMAT
				: gl.UNSIGNED_BYTE;

		if (!this._tex || this._tex.type != type) {
			this._tex = new GL.Texture(1, 1, {
				format: gl.RGBA,
				type: type,
				minFilter: gl.NEAREST
			});
		}
		var color = this.properties.color;

		if (this.inputs) {
			for (var i = 0; i < this.inputs.length; i++) {
				var input = this.inputs[i];
				var v = this.getInputData(i);
				if (v === undefined) {
					continue;
				}
				switch (input.name) {
					case "RGB":
					case "RGBA":
						color.set(v);
						break;
					case "R":
						color[0] = v;
						break;
					case "G":
						color[1] = v;
						break;
					case "B":
						color[2] = v;
						break;
					case "A":
						color[3] = v;
						break;
				}
			}
		}

		if (vec4.sqrDist(this._tex_color, color) > 0.001) {
			this._tex_color.set(color);
			this._tex.fill(color);
		}
		this.setOutputData(0, this._tex);
	};

	LGraphTextureColor.prototype.onGetInputs = function() {
		return [
			["RGB", "vec3"],
			["RGBA", "vec4"],
			["R", "number"],
			["G", "number"],
			["B", "number"],
			["A", "number"]
		];
	};

	LiteGraph.registerNodeType("texture/color", LGraphTextureColor);

	// Texture Channels to Texture *****************************************
	function LGraphTextureGradient() {
		this.addInput("A", "color");
		this.addInput("B", "color");
		this.addOutput("Texture", "Texture");

		this.properties = {
			angle: 0,
			scale: 1,
			A: [0, 0, 0],
			B: [1, 1, 1],
			texture_size: 32
		};
		if (!LGraphTextureGradient._shader) {
			LGraphTextureGradient._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureGradient.pixel_shader
			);
		}

		this._uniforms = {
			u_angle: 0,
			u_colorA: vec3.create(),
			u_colorB: vec3.create()
		};
	}

	LGraphTextureGradient.title = "Gradient";
	LGraphTextureGradient.desc = "Generates a gradient";
	LGraphTextureGradient["@A"] = { type: "color" };
	LGraphTextureGradient["@B"] = { type: "color" };
	LGraphTextureGradient["@texture_size"] = {
		type: "enum",
		values: [32, 64, 128, 256, 512]
	};

	LGraphTextureGradient.prototype.onExecute = function() {
		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = GL.Mesh.getScreenQuad();
		var shader = LGraphTextureGradient._shader;

		var A = this.getInputData(0);
		if (!A) {
			A = this.properties.A;
		}
		var B = this.getInputData(1);
		if (!B) {
			B = this.properties.B;
		}

		//angle and scale
		for (var i = 2; i < this.inputs.length; i++) {
			var input = this.inputs[i];
			var v = this.getInputData(i);
			if (v === undefined) {
				continue;
			}
			this.properties[input.name] = v;
		}

		var uniforms = this._uniforms;
		this._uniforms.u_angle = this.properties.angle * DEG2RAD;
		this._uniforms.u_scale = this.properties.scale;
		vec3.copy(uniforms.u_colorA, A);
		vec3.copy(uniforms.u_colorB, B);

		var size = parseInt(this.properties.texture_size);
		if (!this._tex || this._tex.width != size) {
			this._tex = new GL.Texture(size, size, {
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		this._tex.drawTo(function() {
			shader.uniforms(uniforms).draw(mesh);
		});
		this.setOutputData(0, this._tex);
	};

	LGraphTextureGradient.prototype.onGetInputs = function() {
		return [["angle", "number"], ["scale", "number"]];
	};

	LGraphTextureGradient.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType("texture/gradient", LGraphTextureGradient);

	// Texture Mix *****************************************
	function LGraphTextureMix() {
		this.addInput("A", "Texture");
		this.addInput("B", "Texture");
		this.addInput("Mixer", "Texture");

		this.addOutput("Texture", "Texture");
		this.properties = { factor: 0.5, size_from_biggest: true, invert: false, precision: LGraphTexture.DEFAULT };
		this._uniforms = {
			u_textureA: 0,
			u_textureB: 1,
			u_textureMix: 2,
			u_mix: vec4.create()
		};
	}

	LGraphTextureMix.title = "Mix";
	LGraphTextureMix.desc = "Generates a texture mixing two textures";

	LGraphTextureMix.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMix.prototype.onExecute = function() {
		var texA = this.getInputData(0);

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, texA);
			return;
		}

		var texB = this.getInputData(1);
		if (!texA || !texB) {
			return;
		}

		var texMix = this.getInputData(2);

		var factor = this.getInputData(3);

		this._tex = LGraphTexture.getTargetTexture(
			this.properties.size_from_biggest && texB.width > texA.width ? texB : texA,
			this._tex,
			this.properties.precision
		);

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		var shader = null;
		var uniforms = this._uniforms;
		if (texMix) {
			shader = LGraphTextureMix._shader_tex;
			if (!shader) {
				shader = LGraphTextureMix._shader_tex = new GL.Shader(
					Shader.SCREEN_VERTEX_SHADER,
					LGraphTextureMix.pixel_shader,
					{ MIX_TEX: "" }
				);
			}
		} else {
			shader = LGraphTextureMix._shader_factor;
			if (!shader) {
				shader = LGraphTextureMix._shader_factor = new GL.Shader(
					Shader.SCREEN_VERTEX_SHADER,
					LGraphTextureMix.pixel_shader
				);
			}
			var f = factor == null ? this.properties.factor : factor;
			uniforms.u_mix.set([f, f, f, f]);
		}

		var invert = this.properties.invert;

		this._tex.drawTo(function() {
			texA.bind( invert ? 1 : 0 );
			texB.bind( invert ? 0 : 1 );
			if (texMix) {
				texMix.bind(2);
			}
			shader.uniforms(uniforms).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureMix.prototype.onGetInputs = function() {
		return [["factor", "number"]];
	};

	LGraphTextureMix.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType("texture/mix", LGraphTextureMix);

	// Texture Edges detection *****************************************
	function LGraphTextureEdges() {
		this.addInput("Tex.", "Texture");

		this.addOutput("Edges", "Texture");
		this.properties = {
			invert: true,
			threshold: false,
			factor: 1,
			precision: LGraphTexture.DEFAULT
		};

		if (!LGraphTextureEdges._shader) {
			LGraphTextureEdges._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureEdges.pixel_shader
			);
		}
	}

	LGraphTextureEdges.title = "Edges";
	LGraphTextureEdges.desc = "Detects edges";

	LGraphTextureEdges.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureEdges.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		if (!tex) {
			return;
		}

		this._tex = LGraphTexture.getTargetTexture(
			tex,
			this._tex,
			this.properties.precision
		);

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureEdges._shader;
		var invert = this.properties.invert;
		var factor = this.properties.factor;
		var threshold = this.properties.threshold ? 1 : 0;

		this._tex.drawTo(function() {
			tex.bind(0);
			shader
				.uniforms({
					u_texture: 0,
					u_isize: [1 / tex.width, 1 / tex.height],
					u_factor: factor,
					u_threshold: threshold,
					u_invert: invert ? 1 : 0
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureEdges.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType("texture/edges", LGraphTextureEdges);

	// Texture Depth *****************************************
	function LGraphTextureDepthRange() {
		this.addInput("Texture", "Texture");
		this.addInput("Distance", "number");
		this.addInput("Range", "number");
		this.addOutput("Texture", "Texture");
		this.properties = {
			distance: 100,
			range: 50,
			only_depth: false,
			high_precision: false
		};
		this._uniforms = {
			u_texture: 0,
			u_distance: 100,
			u_range: 50,
			u_camera_planes: null
		};
	}

	LGraphTextureDepthRange.title = "Depth Range";
	LGraphTextureDepthRange.desc = "Generates a texture with a depth range";

	LGraphTextureDepthRange.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		var precision = gl.UNSIGNED_BYTE;
		if (this.properties.high_precision) {
			precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;
		}

		if (
			!this._temp_texture ||
			this._temp_texture.type != precision ||
			this._temp_texture.width != tex.width ||
			this._temp_texture.height != tex.height
		) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: precision,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		var uniforms = this._uniforms;

		//iterations
		var distance = this.properties.distance;
		if (this.isInputConnected(1)) {
			distance = this.getInputData(1);
			this.properties.distance = distance;
		}

		var range = this.properties.range;
		if (this.isInputConnected(2)) {
			range = this.getInputData(2);
			this.properties.range = range;
		}

		uniforms.u_distance = distance;
		uniforms.u_range = range;

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		var mesh = Mesh.getScreenQuad();
		if (!LGraphTextureDepthRange._shader) {
			LGraphTextureDepthRange._shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureDepthRange.pixel_shader
			);
			LGraphTextureDepthRange._shader_onlydepth = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureDepthRange.pixel_shader,
				{ ONLY_DEPTH: "" }
			);
		}
		var shader = this.properties.only_depth
			? LGraphTextureDepthRange._shader_onlydepth
			: LGraphTextureDepthRange._shader;

		//NEAR AND FAR PLANES
		var planes = null;
		if (tex.near_far_planes) {
			planes = tex.near_far_planes;
		} else if (window.LS && LS.Renderer._main_camera) {
			planes = LS.Renderer._main_camera._uniforms.u_camera_planes;
		} else {
			planes = [0.1, 1000];
		} //hardcoded
		uniforms.u_camera_planes = planes;

		this._temp_texture.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(mesh);
		});

		this._temp_texture.near_far_planes = planes;
		this.setOutputData(0, this._temp_texture);
	};

	LGraphTextureDepthRange.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType( "texture/depth_range", LGraphTextureDepthRange );


	// Texture Depth *****************************************
	function LGraphTextureLinearDepth() {
		this.addInput("Texture", "Texture");
		this.addOutput("Texture", "Texture");
		this.properties = {
			precision: LGraphTexture.DEFAULT,
			invert: false
		};
		this._uniforms = {
			u_texture: 0,
			u_camera_planes: null, //filled later
			u_ires: vec2.create()
		};
	}

	LGraphTextureLinearDepth.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureLinearDepth.title = "Linear Depth";
	LGraphTextureLinearDepth.desc = "Creates a color texture with linear depth";

	LGraphTextureLinearDepth.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);
		if (!tex || (tex.format != gl.DEPTH_COMPONENT && tex.format != gl.DEPTH_STENCIL) ) {
			return;
		}

		var precision = this.properties.precision == LGraphTexture.HIGH ? gl.HIGH_PRECISION_FORMAT : gl.UNSIGNED_BYTE;

		if ( !this._temp_texture || this._temp_texture.type != precision || this._temp_texture.width != tex.width || this._temp_texture.height != tex.height ) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: precision,
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		var uniforms = this._uniforms;
		uniforms.u_invert = this.properties.invert ? 1 : 0;

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		var mesh = Mesh.getScreenQuad();
		if(!LGraphTextureLinearDepth._shader)
			LGraphTextureLinearDepth._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureLinearDepth.pixel_shader);
		var shader = LGraphTextureLinearDepth._shader;

		//NEAR AND FAR PLANES
		var planes = null;
		if (tex.near_far_planes) {
			planes = tex.near_far_planes;
		} else if (window.LS && LS.Renderer._main_camera) {
			planes = LS.Renderer._main_camera._uniforms.u_camera_planes;
		} else {
			planes = [0.1, 1000];
		} //hardcoded
		uniforms.u_camera_planes = planes;
		//uniforms.u_ires.set([1/tex.width, 1/tex.height]);
		uniforms.u_ires.set([0,0]);

		this._temp_texture.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(mesh);
		});

		this._temp_texture.near_far_planes = planes;
		this.setOutputData(0, this._temp_texture);
	};

	LGraphTextureLinearDepth.pixel_shader =
		"precision highp float;\n\
		precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform vec2 u_camera_planes;\n\
		uniform int u_invert;\n\
		uniform vec2 u_ires;\n\
		\n\
		void main() {\n\
			float zNear = u_camera_planes.x;\n\
			float zFar = u_camera_planes.y;\n\
			float depth = texture2D(u_texture, v_coord + u_ires*0.5).x * 2.0 - 1.0;\n\
			float f = zNear * (depth + 1.0) / (zFar + zNear - depth * (zFar - zNear));\n\
			if( u_invert == 1 )\n\
				f = 1.0 - f;\n\
			gl_FragColor = vec4(vec3(f),1.0);\n\
		}\n\
		";

	LiteGraph.registerNodeType( "texture/linear_depth", LGraphTextureLinearDepth );

	// Texture Blur *****************************************
	function LGraphTextureBlur() {
		this.addInput("Texture", "Texture");
		this.addInput("Iterations", "number");
		this.addInput("Intensity", "number");
		this.addOutput("Blurred", "Texture");
		this.properties = {
			intensity: 1,
			iterations: 1,
			preserve_aspect: false,
			scale: [1, 1],
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureBlur.title = "Blur";
	LGraphTextureBlur.desc = "Blur a texture";

	LGraphTextureBlur.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureBlur.max_iterations = 20;

	LGraphTextureBlur.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._final_texture;

		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			//we need two textures to do the blurring
			//this._temp_texture = new GL.Texture( tex.width, tex.height, { type: tex.type, format: gl.RGBA, filter: gl.LINEAR });
			temp = this._final_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		//iterations
		var iterations = this.properties.iterations;
		if (this.isInputConnected(1)) {
			iterations = this.getInputData(1);
			this.properties.iterations = iterations;
		}
		iterations = Math.min(
			Math.floor(iterations),
			LGraphTextureBlur.max_iterations
		);
		if (iterations == 0) {
			//skip blurring
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;
		if (this.isInputConnected(2)) {
			intensity = this.getInputData(2);
			this.properties.intensity = intensity;
		}

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if (!aspect && window.gl !== undefined) {
			aspect = gl.canvas.height / gl.canvas.width;
		}
		if (!aspect) {
			aspect = 1;
		}
		aspect = this.properties.preserve_aspect ? aspect : 1;

		var scale = this.properties.scale || [1, 1];
		tex.applyBlur(aspect * scale[0], scale[1], intensity, temp);
		for (var i = 1; i < iterations; ++i) {
			temp.applyBlur(
				aspect * scale[0] * (i + 1),
				scale[1] * (i + 1),
				intensity
			);
		}

		this.setOutputData(0, temp);
	};

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

	LiteGraph.registerNodeType("texture/blur", LGraphTextureBlur);

	//Independent glow FX
	//based on https://catlikecoding.com/unity/tutorials/advanced-rendering/bloom/
	function FXGlow()
	{
		this.intensity = 0.5;
		this.persistence = 0.6;
		this.iterations = 8;
		this.threshold = 0.8;
		this.scale = 1;

		this.dirt_texture = null;
		this.dirt_factor = 0.5;

		this._textures = [];
		this._uniforms = {
			u_intensity: 1,
			u_texture: 0,
			u_glow_texture: 1,
			u_threshold: 0,
			u_texel_size: vec2.create()
		};
	}

	FXGlow.prototype.applyFX = function( tex, output_texture, glow_texture, average_texture ) {

		var width = tex.width;
		var height = tex.height;

		var texture_info = {
			format: tex.format,
			type: tex.type,
			minFilter: GL.LINEAR,
			magFilter: GL.LINEAR,
			wrap: gl.CLAMP_TO_EDGE
		};

		var uniforms = this._uniforms;
		var textures = this._textures;

		//cut
		var shader = FXGlow._cut_shader;
		if (!shader) {
			shader = FXGlow._cut_shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				FXGlow.cut_pixel_shader
			);
		}

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.BLEND);

		uniforms.u_threshold = this.threshold;
		var currentDestination = (textures[0] = GL.Texture.getTemporary(
			width,
			height,
			texture_info
		));
		tex.blit( currentDestination, shader.uniforms(uniforms) );
		var currentSource = currentDestination;

		var iterations = this.iterations;
		iterations = Math.clamp(iterations, 1, 16) | 0;
		var texel_size = uniforms.u_texel_size;
		var intensity = this.intensity;

		uniforms.u_intensity = 1;
		uniforms.u_delta = this.scale; //1

		//downscale/upscale shader
		var shader = FXGlow._shader;
		if (!shader) {
			shader = FXGlow._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				FXGlow.scale_pixel_shader
			);
		}

		var i = 1;
		//downscale
		for (; i < iterations; i++) {
			width = width >> 1;
			if ((height | 0) > 1) {
				height = height >> 1;
			}
			if (width < 2) {
				break;
			}
			currentDestination = textures[i] = GL.Texture.getTemporary(
				width,
				height,
				texture_info
			);
			texel_size[0] = 1 / currentSource.width;
			texel_size[1] = 1 / currentSource.height;
			currentSource.blit(
				currentDestination,
				shader.uniforms(uniforms)
			);
			currentSource = currentDestination;
		}

		//average
		if (average_texture) {
			texel_size[0] = 1 / currentSource.width;
			texel_size[1] = 1 / currentSource.height;
			uniforms.u_intensity = intensity;
			uniforms.u_delta = 1;
			currentSource.blit(average_texture, shader.uniforms(uniforms));
		}

		//upscale and blend
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		uniforms.u_intensity = this.persistence;
		uniforms.u_delta = 0.5;

		// i-=2 => -1 to point to last element in array, -1 to go to texture above
		for ( i -= 2; i >= 0; i-- ) 
		{
			currentDestination = textures[i];
			textures[i] = null;
			texel_size[0] = 1 / currentSource.width;
			texel_size[1] = 1 / currentSource.height;
			currentSource.blit(
				currentDestination,
				shader.uniforms(uniforms)
			);
			GL.Texture.releaseTemporary(currentSource);
			currentSource = currentDestination;
		}
		gl.disable(gl.BLEND);

		//glow
		if (glow_texture) {
			currentSource.blit(glow_texture);
		}

		//final composition
		if ( output_texture ) {
			var final_texture = output_texture;
			var dirt_texture = this.dirt_texture;
			var dirt_factor = this.dirt_factor;
			uniforms.u_intensity = intensity;

			shader = dirt_texture
				? FXGlow._dirt_final_shader
				: FXGlow._final_shader;
			if (!shader) {
				if (dirt_texture) {
					shader = FXGlow._dirt_final_shader = new GL.Shader(
						GL.Shader.SCREEN_VERTEX_SHADER,
						FXGlow.final_pixel_shader,
						{ USE_DIRT: "" }
					);
				} else {
					shader = FXGlow._final_shader = new GL.Shader(
						GL.Shader.SCREEN_VERTEX_SHADER,
						FXGlow.final_pixel_shader
					);
				}
			}

			final_texture.drawTo(function() {
				tex.bind(0);
				currentSource.bind(1);
				if (dirt_texture) {
					shader.setUniform("u_dirt_factor", dirt_factor);
					shader.setUniform(
						"u_dirt_texture",
						dirt_texture.bind(2)
					);
				}
				shader.toViewport(uniforms);
			});
		}

		GL.Texture.releaseTemporary(currentSource);
	};

	FXGlow.cut_pixel_shader =
		"precision highp float;\n\
	varying vec2 v_coord;\n\
	uniform sampler2D u_texture;\n\
	uniform float u_threshold;\n\
	void main() {\n\
		gl_FragColor = max( texture2D( u_texture, v_coord ) - vec4( u_threshold ), vec4(0.0) );\n\
	}";

	FXGlow.scale_pixel_shader =
		"precision highp float;\n\
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
	}";

	FXGlow.final_pixel_shader =
		"precision highp float;\n\
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
	}";


	// Texture Glow *****************************************
	function LGraphTextureGlow() {
		this.addInput("in", "Texture");
		this.addInput("dirt", "Texture");
		this.addOutput("out", "Texture");
		this.addOutput("glow", "Texture");
		this.properties = {
			enabled: true,
			intensity: 1,
			persistence: 0.99,
			iterations: 16,
			threshold: 0,
			scale: 1,
			dirt_factor: 0.5,
			precision: LGraphTexture.DEFAULT
		};

		this.fx = new FXGlow();
	}

	LGraphTextureGlow.title = "Glow";
	LGraphTextureGlow.desc = "Filters a texture giving it a glow effect";

	LGraphTextureGlow.widgets_info = {
		iterations: {
			type: "number",
			min: 0,
			max: 16,
			step: 1,
			precision: 0
		},
		threshold: {
			type: "number",
			min: 0,
			max: 10,
			step: 0.01,
			precision: 2
		},
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureGlow.prototype.onGetInputs = function() {
		return [
			["enabled", "boolean"],
			["threshold", "number"],
			["intensity", "number"],
			["persistence", "number"],
			["iterations", "number"],
			["dirt_factor", "number"]
		];
	};

	LGraphTextureGlow.prototype.onGetOutputs = function() {
		return [["average", "Texture"]];
	};

	LGraphTextureGlow.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isAnyOutputConnected()) {
			return;
		} //saves work

		if (
			this.properties.precision === LGraphTexture.PASS_THROUGH ||
			this.getInputOrProperty("enabled") === false
		) {
			this.setOutputData(0, tex);
			return;
		}

		var width = tex.width;
		var height = tex.height;

		var fx = this.fx;
		fx.threshold = this.getInputOrProperty("threshold");
		fx.iterations = this.getInputOrProperty("iterations");
		fx.intensity = this.getInputOrProperty("intensity");
		fx.persistence = this.getInputOrProperty("persistence");
		fx.dirt_texture = this.getInputData(1);
		fx.dirt_factor = this.getInputOrProperty("dirt_factor");
		fx.scale = this.properties.scale;

		var type = LGraphTexture.getTextureType( this.properties.precision, tex );

		var average_texture = null;
		if (this.isOutputConnected(2)) {
			average_texture = this._average_texture;
			if (
				!average_texture ||
				average_texture.type != tex.type ||
				average_texture.format != tex.format
			) {
				average_texture = this._average_texture = new GL.Texture(
					1,
					1,
					{
						type: tex.type,
						format: tex.format,
						filter: gl.LINEAR
					}
				);
			}
		}

		var glow_texture = null;
		if (this.isOutputConnected(1)) {
			glow_texture = this._glow_texture;
			if (
				!glow_texture ||
				glow_texture.width != tex.width ||
				glow_texture.height != tex.height ||
				glow_texture.type != type ||
				glow_texture.format != tex.format
			) {
				glow_texture = this._glow_texture = new GL.Texture(
					tex.width,
					tex.height,
					{ type: type, format: tex.format, filter: gl.LINEAR }
				);
			}
		}

		var final_texture = null;
		if (this.isOutputConnected(0)) {
			final_texture = this._final_texture;
			if (
				!final_texture ||
				final_texture.width != tex.width ||
				final_texture.height != tex.height ||
				final_texture.type != type ||
				final_texture.format != tex.format
			) {
				final_texture = this._final_texture = new GL.Texture(
					tex.width,
					tex.height,
					{ type: type, format: tex.format, filter: gl.LINEAR }
				);
			}

		}

		//apply FX
		fx.applyFX(tex, final_texture, glow_texture, average_texture );

		if (this.isOutputConnected(0))
			this.setOutputData(0, final_texture);

		if (this.isOutputConnected(1))
			this.setOutputData(1, average_texture);

		if (this.isOutputConnected(2))
			this.setOutputData(2, glow_texture);
	};

	LiteGraph.registerNodeType("texture/glow", LGraphTextureGlow);

	// Texture Filter *****************************************
	function LGraphTextureKuwaharaFilter() {
		this.addInput("Texture", "Texture");
		this.addOutput("Filtered", "Texture");
		this.properties = { intensity: 1, radius: 5 };
	}

	LGraphTextureKuwaharaFilter.title = "Kuwahara Filter";
	LGraphTextureKuwaharaFilter.desc =
		"Filters a texture giving an artistic oil canvas painting";

	LGraphTextureKuwaharaFilter.max_radius = 10;
	LGraphTextureKuwaharaFilter._shaders = [];

	LGraphTextureKuwaharaFilter.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._temp_texture;

		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: tex.type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		//iterations
		var radius = this.properties.radius;
		radius = Math.min(
			Math.floor(radius),
			LGraphTextureKuwaharaFilter.max_radius
		);
		if (radius == 0) {
			//skip blurring
			this.setOutputData(0, tex);
			return;
		}

		var intensity = this.properties.intensity;

		//blur sometimes needs an aspect correction
		var aspect = LiteGraph.camera_aspect;
		if (!aspect && window.gl !== undefined) {
			aspect = gl.canvas.height / gl.canvas.width;
		}
		if (!aspect) {
			aspect = 1;
		}
		aspect = this.properties.preserve_aspect ? aspect : 1;

		if (!LGraphTextureKuwaharaFilter._shaders[radius]) {
			LGraphTextureKuwaharaFilter._shaders[radius] = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureKuwaharaFilter.pixel_shader,
				{ RADIUS: radius.toFixed(0) }
			);
		}

		var shader = LGraphTextureKuwaharaFilter._shaders[radius];
		var mesh = GL.Mesh.getScreenQuad();
		tex.bind(0);

		this._temp_texture.drawTo(function() {
			shader
				.uniforms({
					u_texture: 0,
					u_intensity: intensity,
					u_resolution: [tex.width, tex.height],
					u_iResolution: [1 / tex.width, 1 / tex.height]
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._temp_texture);
	};

	//from https://www.shadertoy.com/view/MsXSz4
	LGraphTextureKuwaharaFilter.pixel_shader =
		"\n\
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

	LiteGraph.registerNodeType(
		"texture/kuwahara",
		LGraphTextureKuwaharaFilter
	);

	// Texture  *****************************************
	function LGraphTextureXDoGFilter() {
		this.addInput("Texture", "Texture");
		this.addOutput("Filtered", "Texture");
		this.properties = {
			sigma: 1.4,
			k: 1.6,
			p: 21.7,
			epsilon: 79,
			phi: 0.017
		};
	}

	LGraphTextureXDoGFilter.title = "XDoG Filter";
	LGraphTextureXDoGFilter.desc =
		"Filters a texture giving an artistic ink style";

	LGraphTextureXDoGFilter.max_radius = 10;
	LGraphTextureXDoGFilter._shaders = [];

	LGraphTextureXDoGFilter.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			this._temp_texture = new GL.Texture(tex.width, tex.height, {
				type: tex.type,
				format: gl.RGBA,
				filter: gl.LINEAR
			});
		}

		if (!LGraphTextureXDoGFilter._xdog_shader) {
			LGraphTextureXDoGFilter._xdog_shader = new GL.Shader(
				Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureXDoGFilter.xdog_pixel_shader
			);
		}
		var shader = LGraphTextureXDoGFilter._xdog_shader;
		var mesh = GL.Mesh.getScreenQuad();

		var sigma = this.properties.sigma;
		var k = this.properties.k;
		var p = this.properties.p;
		var epsilon = this.properties.epsilon;
		var phi = this.properties.phi;
		tex.bind(0);
		this._temp_texture.drawTo(function() {
			shader
				.uniforms({
					src: 0,
					sigma: sigma,
					k: k,
					p: p,
					epsilon: epsilon,
					phi: phi,
					cvsWidth: tex.width,
					cvsHeight: tex.height
				})
				.draw(mesh);
		});

		this.setOutputData(0, this._temp_texture);
	};

	//from https://github.com/RaymondMcGuire/GPU-Based-Image-Processing-Tools/blob/master/lib_webgl/scripts/main.js
	LGraphTextureXDoGFilter.xdog_pixel_shader =
		"\n\
precision highp float;\n\
uniform sampler2D src;\n\n\
uniform float cvsHeight;\n\
uniform float cvsWidth;\n\n\
uniform float sigma;\n\
uniform float k;\n\
uniform float p;\n\
uniform float epsilon;\n\
uniform float phi;\n\
varying vec2 v_coord;\n\n\
float cosh(float val)\n\
{\n\
	float tmp = exp(val);\n\
	float cosH = (tmp + 1.0 / tmp) / 2.0;\n\
	return cosH;\n\
}\n\n\
float tanh(float val)\n\
{\n\
	float tmp = exp(val);\n\
	float tanH = (tmp - 1.0 / tmp) / (tmp + 1.0 / tmp);\n\
	return tanH;\n\
}\n\n\
float sinh(float val)\n\
{\n\
	float tmp = exp(val);\n\
	float sinH = (tmp - 1.0 / tmp) / 2.0;\n\
	return sinH;\n\
}\n\n\
void main(void){\n\
	vec3 destColor = vec3(0.0);\n\
	float tFrag = 1.0 / cvsHeight;\n\
	float sFrag = 1.0 / cvsWidth;\n\
	vec2 Frag = vec2(sFrag,tFrag);\n\
	vec2 uv = gl_FragCoord.st;\n\
	float twoSigmaESquared = 2.0 * sigma * sigma;\n\
	float twoSigmaRSquared = twoSigmaESquared * k * k;\n\
	int halfWidth = int(ceil( 1.0 * sigma * k ));\n\n\
	const int MAX_NUM_ITERATION = 99999;\n\
	vec2 sum = vec2(0.0);\n\
	vec2 norm = vec2(0.0);\n\n\
	for(int cnt=0;cnt<MAX_NUM_ITERATION;cnt++){\n\
		if(cnt > (2*halfWidth+1)*(2*halfWidth+1)){break;}\n\
		int i = int(cnt / (2*halfWidth+1)) - halfWidth;\n\
		int j = cnt - halfWidth - int(cnt / (2*halfWidth+1)) * (2*halfWidth+1);\n\n\
		float d = length(vec2(i,j));\n\
		vec2 kernel = vec2( exp( -d * d / twoSigmaESquared ), \n\
							exp( -d * d / twoSigmaRSquared ));\n\n\
		vec2 L = texture2D(src, (uv + vec2(i,j)) * Frag).xx;\n\n\
		norm += kernel;\n\
		sum += kernel * L;\n\
	}\n\n\
	sum /= norm;\n\n\
	float H = 100.0 * ((1.0 + p) * sum.x - p * sum.y);\n\
	float edge = ( H > epsilon )? 1.0 : 1.0 + tanh( phi * (H - epsilon));\n\
	destColor = vec3(edge);\n\
	gl_FragColor = vec4(destColor, 1.0);\n\
}";

	LiteGraph.registerNodeType("texture/xDoG", LGraphTextureXDoGFilter);

	// Texture Webcam *****************************************
	function LGraphTextureWebcam() {
		this.addOutput("Webcam", "Texture");
		this.properties = { texture_name: "", facingMode: "user" };
		this.boxcolor = "black";
		this.version = 0;
	}

	LGraphTextureWebcam.title = "Webcam";
	LGraphTextureWebcam.desc = "Webcam texture";

	LGraphTextureWebcam.is_webcam_open = false;

	LGraphTextureWebcam.prototype.openStream = function() {
		if (!navigator.getUserMedia) {
			//console.log('getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags');
			return;
		}

		this._waiting_confirmation = true;

		// Not showing vendor prefixes.
		var constraints = {
			audio: false,
			video: { facingMode: this.properties.facingMode }
		};
		navigator.mediaDevices
			.getUserMedia(constraints)
			.then(this.streamReady.bind(this))
			.catch(onFailSoHard);

		var that = this;
		function onFailSoHard(e) {
			LGraphTextureWebcam.is_webcam_open = false;
			console.log("Webcam rejected", e);
			that._webcam_stream = false;
			that.boxcolor = "red";
			that.trigger("stream_error");
		}
	};

	LGraphTextureWebcam.prototype.closeStream = function() {
		if (this._webcam_stream) {
			var tracks = this._webcam_stream.getTracks();
			if (tracks.length) {
				for (var i = 0; i < tracks.length; ++i) {
					tracks[i].stop();
				}
			}
			LGraphTextureWebcam.is_webcam_open = false;
			this._webcam_stream = null;
			this._video = null;
			this.boxcolor = "black";
			this.trigger("stream_closed");
		}
	};

	LGraphTextureWebcam.prototype.streamReady = function(localMediaStream) {
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
				LGraphTextureWebcam.is_webcam_open = true;
				console.log(e);
			};
		}
		this.trigger("stream_ready", video);
	};

	LGraphTextureWebcam.prototype.onPropertyChanged = function(
		name,
		value
	) {
		if (name == "facingMode") {
			this.properties.facingMode = value;
			this.closeStream();
			this.openStream();
		}
	};

	LGraphTextureWebcam.prototype.onRemoved = function() {
		if (!this._webcam_stream) {
			return;
		}

		var tracks = this._webcam_stream.getTracks();
		if (tracks.length) {
			for (var i = 0; i < tracks.length; ++i) {
				tracks[i].stop();
			}
		}

		this._webcam_stream = null;
		this._video = null;
	};

	LGraphTextureWebcam.prototype.onDrawBackground = function(ctx) {
		if (this.flags.collapsed || this.size[1] <= 20) {
			return;
		}

		if (!this._video) {
			return;
		}

		//render to graph canvas
		ctx.save();
		if (!ctx.webgl) {
			//reverse image
			ctx.drawImage(this._video, 0, 0, this.size[0], this.size[1]);
		} else {
			if (this._video_texture) {
				ctx.drawImage(
					this._video_texture,
					0,
					0,
					this.size[0],
					this.size[1]
				);
			}
		}
		ctx.restore();
	};

	LGraphTextureWebcam.prototype.onExecute = function() {
		if (this._webcam_stream == null && !this._waiting_confirmation) {
			this.openStream();
		}

		if (!this._video || !this._video.videoWidth) {
			return;
		}

		var width = this._video.videoWidth;
		var height = this._video.videoHeight;

		var temp = this._video_texture;
		if (!temp || temp.width != width || temp.height != height) {
			this._video_texture = new GL.Texture(width, height, {
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		this._video_texture.uploadImage(this._video);
		this._video_texture.version = ++this.version;

		if (this.properties.texture_name) {
			var container = LGraphTexture.getTexturesContainer();
			container[this.properties.texture_name] = this._video_texture;
		}

		this.setOutputData(0, this._video_texture);
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

	LGraphTextureWebcam.prototype.onGetOutputs = function() {
		return [
			["width", "number"],
			["height", "number"],
			["stream_ready", LiteGraph.EVENT],
			["stream_closed", LiteGraph.EVENT],
			["stream_error", LiteGraph.EVENT]
		];
	};

	LiteGraph.registerNodeType("texture/webcam", LGraphTextureWebcam);

	//from https://github.com/spite/Wagner
	function LGraphLensFX() {
		this.addInput("in", "Texture");
		this.addInput("f", "number");
		this.addOutput("out", "Texture");
		this.properties = {
			enabled: true,
			factor: 1,
			precision: LGraphTexture.LOW
		};

		this._uniforms = { u_texture: 0, u_factor: 1 };
	}

	LGraphLensFX.title = "Lens FX";
	LGraphLensFX.desc = "distortion and chromatic aberration";

	LGraphLensFX.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphLensFX.prototype.onGetInputs = function() {
		return [["enabled", "boolean"]];
	};

	LGraphLensFX.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (
			this.properties.precision === LGraphTexture.PASS_THROUGH ||
			this.getInputOrProperty("enabled") === false
		) {
			this.setOutputData(0, tex);
			return;
		}

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			temp = this._temp_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		var shader = LGraphLensFX._shader;
		if (!shader) {
			shader = LGraphLensFX._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphLensFX.pixel_shader
			);
		}

		var factor = this.getInputData(1);
		if (factor == null) {
			factor = this.properties.factor;
		}

		var uniforms = this._uniforms;
		uniforms.u_factor = factor;

		//apply shader
		gl.disable(gl.DEPTH_TEST);
		temp.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	};

	LGraphLensFX.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType("texture/lensfx", LGraphLensFX);


	function LGraphTextureFromData() {
		this.addInput("in", "");
		this.properties = { precision: LGraphTexture.LOW, width: 0, height: 0, channels: 1 };
		this.addOutput("out", "Texture");
	}

	LGraphTextureFromData.title = "Data->Tex";
	LGraphTextureFromData.desc = "Generates or applies a curve to a texture";
	LGraphTextureFromData.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureFromData.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var data = this.getInputData(0);
		if(!data)
			return;

		var channels = this.properties.channels;
		var w = this.properties.width;
		var h = this.properties.height;
		if(!w || !h)
		{
			w = Math.floor(data.length / channels);
			h = 1;
		}
		var format = gl.RGBA;
		if( channels == 3 )
			format = gl.RGB;
		else if( channels == 1 )
			format = gl.LUMINANCE;

		var temp = this._temp_texture;
		var type = LGraphTexture.getTextureType( this.properties.precision );
		if ( !temp || temp.width != w || temp.height != h || temp.type != type ) {
			temp = this._temp_texture = new GL.Texture( w, h, { type: type, format: format, filter: gl.LINEAR } );
		}

		temp.uploadData( data );
		this.setOutputData(0, temp);
	}

	LiteGraph.registerNodeType("texture/fromdata", LGraphTextureFromData);

	//applies a curve (or generates one)
	function LGraphTextureCurve() {
		this.addInput("in", "Texture");
		this.addOutput("out", "Texture");
		this.properties = { precision: LGraphTexture.LOW, split_channels: false };
		this._values = new Uint8Array(256*4);
		this._values.fill(255);
		this._curve_texture = null;
		this._uniforms = { u_texture: 0, u_curve: 1, u_range: 1.0 };
		this._must_update = true;
		this._points = {
			RGB: [[0,0],[1,1]],
			R: [[0,0],[1,1]],
			G: [[0,0],[1,1]],
			B: [[0,0],[1,1]]
		};
		this.curve_editor = null;
		this.addWidget("toggle","Split Channels",false,"split_channels");
		this.addWidget("combo","Channel","RGB",{ values:["RGB","R","G","B"]});
		this.curve_offset = 68;
		this.size = [ 240, 160 ];
	}

	LGraphTextureCurve.title = "Curve";
	LGraphTextureCurve.desc = "Generates or applies a curve to a texture";
	LGraphTextureCurve.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureCurve.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		var temp = this._temp_texture;
		if(!tex) //generate one texture, nothing else
		{
			if(this._must_update || !this._curve_texture )
				this.updateCurve();
			this.setOutputData(0, this._curve_texture);
			return;
		}

		var type = LGraphTexture.getTextureType( this.properties.precision, tex );
		
		//apply curve to input texture
		if ( !temp || temp.type != type || temp.width != tex.width || temp.height != tex.height || temp.format != tex.format)
			temp = this._temp_texture = new GL.Texture( tex.width, tex.height, { type: type, format: tex.format, filter: gl.LINEAR } );

		var shader = LGraphTextureCurve._shader;
		if (!shader) {
			shader = LGraphTextureCurve._shader = new GL.Shader( GL.Shader.SCREEN_VERTEX_SHADER, LGraphTextureCurve.pixel_shader );
		}

		if(this._must_update || !this._curve_texture )
			this.updateCurve();

		var uniforms = this._uniforms;
		var curve_texture = this._curve_texture;

		//apply shader
		temp.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			tex.bind(0);
			curve_texture.bind(1);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	}

	LGraphTextureCurve.prototype.sampleCurve = function(f,points)
	{
		var points = points || this._points.RGB;
		if(!points)
			return;
		for(var i = 0; i < points.length - 1; ++i)
		{
			var p = points[i];
			var pn = points[i+1];
			if(pn[0] < f)
				continue;
			var r = (pn[0] - p[0]);
			if( Math.abs(r) < 0.00001 )
				return p[1];
			var local_f = (f - p[0]) / r;
			return p[1] * (1.0 - local_f) + pn[1] * local_f;
		}
		return 0;
	}

	LGraphTextureCurve.prototype.updateCurve = function()
	{
		var values = this._values;
		var num = values.length / 4;
		var split = this.properties.split_channels;
		for(var i = 0; i < num; ++i)
		{
			if(split)
			{
				values[i*4] = Math.clamp( this.sampleCurve(i/num,this._points.R)*255,0,255);
				values[i*4+1] = Math.clamp( this.sampleCurve(i/num,this._points.G)*255,0,255);
				values[i*4+2] = Math.clamp( this.sampleCurve(i/num,this._points.B)*255,0,255);
			}
			else
			{
				var v = this.sampleCurve(i/num);//sample curve
				values[i*4] = values[i*4+1] = values[i*4+2] = Math.clamp(v*255,0,255);
			}
			values[i*4+3] = 255; //alpha fixed
		}
		if(!this._curve_texture)
			this._curve_texture = new GL.Texture(256,1,{ format: gl.RGBA, magFilter: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE });
		this._curve_texture.uploadData(values,null,true);
	}

	LGraphTextureCurve.prototype.onSerialize = function(o)
	{
		var curves = {};
		for(var i in this._points)
			curves[i] = this._points[i].concat();
		o.curves = curves;
	}

	LGraphTextureCurve.prototype.onConfigure = function(o)
	{
		this._points = o.curves;
		if(this.curve_editor)
			curve_editor.points = this._points;
		this._must_update = true;
	}

	LGraphTextureCurve.prototype.onMouseDown = function(e, localpos, graphcanvas)
	{
		if(this.curve_editor)
		{
			var r = this.curve_editor.onMouseDown([localpos[0],localpos[1]-this.curve_offset], graphcanvas);
			if(r)
				this.captureInput(true);
			return r;
		}
	}

	LGraphTextureCurve.prototype.onMouseMove = function(e, localpos, graphcanvas)
	{
		if(this.curve_editor)
			return this.curve_editor.onMouseMove([localpos[0],localpos[1]-this.curve_offset], graphcanvas);
	}

	LGraphTextureCurve.prototype.onMouseUp = function(e, localpos, graphcanvas)
	{
		if(this.curve_editor)
			return this.curve_editor.onMouseUp([localpos[0],localpos[1]-this.curve_offset], graphcanvas);
		this.captureInput(false);
	}

	LGraphTextureCurve.channel_line_colors = { "RGB":"#666","R":"#F33","G":"#3F3","B":"#33F" };

	LGraphTextureCurve.prototype.onDrawBackground = function(ctx, graphcanvas)
	{
		if(this.flags.collapsed)
			return;

		if(!this.curve_editor)
			this.curve_editor = new LiteGraph.CurveEditor(this._points.R);
		ctx.save();
		ctx.translate(0,this.curve_offset);
		var channel = this.widgets[1].value;

		if(this.properties.split_channels)
		{
			if(channel == "RGB")
			{
				this.widgets[1].value = channel = "R";
				this.widgets[1].disabled = false;
			}
			this.curve_editor.points = this._points.R;
			this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, "#111", LGraphTextureCurve.channel_line_colors.R, true );
			ctx.globalCompositeOperation = "lighten";
			this.curve_editor.points = this._points.G;
			this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, null, LGraphTextureCurve.channel_line_colors.G, true );
			this.curve_editor.points = this._points.B;
			this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, null, LGraphTextureCurve.channel_line_colors.B, true );
			ctx.globalCompositeOperation = "source-over";
		}
		else
		{
			this.widgets[1].value = channel = "RGB";
			this.widgets[1].disabled = true;
		}

		this.curve_editor.points = this._points[channel];
		this.curve_editor.draw( ctx, [this.size[0],this.size[1] - this.curve_offset], graphcanvas, this.properties.split_channels ? null : "#111", LGraphTextureCurve.channel_line_colors[channel]  );
		ctx.restore();
	}

	LGraphTextureCurve.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform sampler2D u_curve;\n\
		uniform float u_range;\n\
		\n\
		void main() {\n\
			vec4 color = texture2D( u_texture, v_coord ) * u_range;\n\
			color.x = texture2D( u_curve, vec2( color.x, 0.5 ) ).x;\n\
			color.y = texture2D( u_curve, vec2( color.y, 0.5 ) ).y;\n\
			color.z = texture2D( u_curve, vec2( color.z, 0.5 ) ).z;\n\
			//color.w = texture2D( u_curve, vec2( color.w, 0.5 ) ).w;\n\
			gl_FragColor = color;\n\
		}";

	LiteGraph.registerNodeType("texture/curve", LGraphTextureCurve);

	//simple exposition, but plan to expand it to support different gamma curves
	function LGraphExposition() {
		this.addInput("in", "Texture");
		this.addInput("exp", "number");
		this.addOutput("out", "Texture");
		this.properties = { exposition: 1, precision: LGraphTexture.LOW };
		this._uniforms = { u_texture: 0, u_exposition: 1 };
	}

	LGraphExposition.title = "Exposition";
	LGraphExposition.desc = "Controls texture exposition";

	LGraphExposition.widgets_info = {
		exposition: { widget: "slider", min: 0, max: 3 },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphExposition.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var temp = this._temp_texture;
		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			temp = this._temp_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		var shader = LGraphExposition._shader;
		if (!shader) {
			shader = LGraphExposition._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphExposition.pixel_shader
			);
		}

		var exp = this.properties.exposition;
		var exp_input = this.getInputData(1);
		if (exp_input != null) {
			exp = this.properties.exposition = exp_input;
		}
		var uniforms = this._uniforms;

		//apply shader
		temp.drawTo(function() {
			gl.disable(gl.DEPTH_TEST);
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	};

	LGraphExposition.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_exposition;\n\
		\n\
		void main() {\n\
			vec4 color = texture2D( u_texture, v_coord );\n\
			gl_FragColor = vec4( color.xyz * u_exposition, color.a );\n\
		}";

	LiteGraph.registerNodeType("texture/exposition", LGraphExposition);

	function LGraphToneMapping() {
		this.addInput("in", "Texture");
		this.addInput("avg", "number,Texture");
		this.addOutput("out", "Texture");
		this.properties = {
			enabled: true,
			scale: 1,
			gamma: 1,
			average_lum: 1,
			lum_white: 1,
			precision: LGraphTexture.LOW
		};

		this._uniforms = {
			u_texture: 0,
			u_lumwhite2: 1,
			u_igamma: 1,
			u_scale: 1,
			u_average_lum: 1
		};
	}

	LGraphToneMapping.title = "Tone Mapping";
	LGraphToneMapping.desc =
		"Applies Tone Mapping to convert from high to low";

	LGraphToneMapping.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphToneMapping.prototype.onGetInputs = function() {
		return [["enabled", "boolean"]];
	};

	LGraphToneMapping.prototype.onExecute = function() {
		var tex = this.getInputData(0);
		if (!tex) {
			return;
		}

		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		if (
			this.properties.precision === LGraphTexture.PASS_THROUGH ||
			this.getInputOrProperty("enabled") === false
		) {
			this.setOutputData(0, tex);
			return;
		}

		var temp = this._temp_texture;

		if (
			!temp ||
			temp.width != tex.width ||
			temp.height != tex.height ||
			temp.type != tex.type
		) {
			temp = this._temp_texture = new GL.Texture(
				tex.width,
				tex.height,
				{ type: tex.type, format: gl.RGBA, filter: gl.LINEAR }
			);
		}

		var avg = this.getInputData(1);
		if (avg == null) {
			avg = this.properties.average_lum;
		}

		var uniforms = this._uniforms;
		var shader = null;

		if (avg.constructor === Number) {
			this.properties.average_lum = avg;
			uniforms.u_average_lum = this.properties.average_lum;
			shader = LGraphToneMapping._shader;
			if (!shader) {
				shader = LGraphToneMapping._shader = new GL.Shader(
					GL.Shader.SCREEN_VERTEX_SHADER,
					LGraphToneMapping.pixel_shader
				);
			}
		} else if (avg.constructor === GL.Texture) {
			uniforms.u_average_texture = avg.bind(1);
			shader = LGraphToneMapping._shader_texture;
			if (!shader) {
				shader = LGraphToneMapping._shader_texture = new GL.Shader(
					GL.Shader.SCREEN_VERTEX_SHADER,
					LGraphToneMapping.pixel_shader,
					{ AVG_TEXTURE: "" }
				);
			}
		}

		uniforms.u_lumwhite2 =
			this.properties.lum_white * this.properties.lum_white;
		uniforms.u_scale = this.properties.scale;
		uniforms.u_igamma = 1 / this.properties.gamma;

		//apply shader
		gl.disable(gl.DEPTH_TEST);
		temp.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, this._temp_texture);
	};

	LGraphToneMapping.pixel_shader =
		"precision highp float;\n\
		varying vec2 v_coord;\n\
		uniform sampler2D u_texture;\n\
		uniform float u_scale;\n\
		#ifdef AVG_TEXTURE\n\
			uniform sampler2D u_average_texture;\n\
		#else\n\
			uniform float u_average_lum;\n\
		#endif\n\
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
			float average_lum = 0.0;\n\
			#ifdef AVG_TEXTURE\n\
				vec3 pixel = texture2D(u_average_texture,vec2(0.5)).xyz;\n\
				average_lum = (pixel.x + pixel.y + pixel.z) / 3.0;\n\
			#else\n\
				average_lum = u_average_lum;\n\
			#endif\n\
			//Ld - this part of the code is the same for both versions\n\
			float lum = dot(rgb, vec3(0.2126, 0.7152, 0.0722));\n\
			float L = (u_scale / average_lum) * lum;\n\
			float Ld = (L * (1.0 + L / u_lumwhite2)) / (1.0 + L);\n\
			//first\n\
			//vec3 xyY = RGB2xyY(rgb);\n\
			//xyY.z *= Ld;\n\
			//rgb = xyYtoRGB(xyY);\n\
			//second\n\
			rgb = (rgb / lum) * Ld;\n\
			rgb = max(rgb,vec3(0.001));\n\
			rgb = pow( rgb, vec3( u_igamma ) );\n\
			gl_FragColor = vec4( rgb, color.a );\n\
		}";

	LiteGraph.registerNodeType("texture/tonemapping", LGraphToneMapping);

	function LGraphTexturePerlin() {
		this.addOutput("out", "Texture");
		this.properties = {
			width: 512,
			height: 512,
			seed: 0,
			persistence: 0.1,
			octaves: 8,
			scale: 1,
			offset: [0, 0],
			amplitude: 1,
			precision: LGraphTexture.DEFAULT
		};
		this._key = 0;
		this._texture = null;
		this._uniforms = {
			u_persistence: 0.1,
			u_seed: 0,
			u_offset: vec2.create(),
			u_scale: 1,
			u_viewport: vec2.create()
		};
	}

	LGraphTexturePerlin.title = "Perlin";
	LGraphTexturePerlin.desc = "Generates a perlin noise texture";

	LGraphTexturePerlin.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES },
		width: { type: "number", precision: 0, step: 1 },
		height: { type: "number", precision: 0, step: 1 },
		octaves: { type: "number", precision: 0, step: 1, min: 1, max: 50 }
	};

	LGraphTexturePerlin.prototype.onGetInputs = function() {
		return [
			["seed", "number"],
			["persistence", "number"],
			["octaves", "number"],
			["scale", "number"],
			["amplitude", "number"],
			["offset", "vec2"]
		];
	};

	LGraphTexturePerlin.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var w = this.properties.width | 0;
		var h = this.properties.height | 0;
		if (w == 0) {
			w = gl.viewport_data[2];
		} //0 means default
		if (h == 0) {
			h = gl.viewport_data[3];
		} //0 means default
		var type = LGraphTexture.getTextureType(this.properties.precision);

		var temp = this._texture;
		if (
			!temp ||
			temp.width != w ||
			temp.height != h ||
			temp.type != type
		) {
			temp = this._texture = new GL.Texture(w, h, {
				type: type,
				format: gl.RGB,
				filter: gl.LINEAR
			});
		}

		var persistence = this.getInputOrProperty("persistence");
		var octaves = this.getInputOrProperty("octaves");
		var offset = this.getInputOrProperty("offset");
		var scale = this.getInputOrProperty("scale");
		var amplitude = this.getInputOrProperty("amplitude");
		var seed = this.getInputOrProperty("seed");

		//reusing old texture
		var key =
			"" +
			w +
			h +
			type +
			persistence +
			octaves +
			scale +
			seed +
			offset[0] +
			offset[1] +
			amplitude;
		if (key == this._key) {
			this.setOutputData(0, temp);
			return;
		}
		this._key = key;

		//gather uniforms
		var uniforms = this._uniforms;
		uniforms.u_persistence = persistence;
		uniforms.u_octaves = octaves;
		uniforms.u_offset.set(offset);
		uniforms.u_scale = scale;
		uniforms.u_amplitude = amplitude;
		uniforms.u_seed = seed * 128;
		uniforms.u_viewport[0] = w;
		uniforms.u_viewport[1] = h;

		//render
		var shader = LGraphTexturePerlin._shader;
		if (!shader) {
			shader = LGraphTexturePerlin._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTexturePerlin.pixel_shader
			);
		}

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		temp.drawTo(function() {
			shader.uniforms(uniforms).draw(GL.Mesh.getScreenQuad());
		});

		this.setOutputData(0, temp);
	};

	LGraphTexturePerlin.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType("texture/perlin", LGraphTexturePerlin);

	function LGraphTextureCanvas2D() {
		this.addInput("v");
		this.addOutput("out", "Texture");
		this.properties = {
			code: LGraphTextureCanvas2D.default_code,
			width: 512,
			height: 512,
			clear: true,
			precision: LGraphTexture.DEFAULT,
			use_html_canvas: false
		};
		this._func = null;
		this._temp_texture = null;
		this.compileCode();
	}

	LGraphTextureCanvas2D.title = "Canvas2D";
	LGraphTextureCanvas2D.desc = "Executes Canvas2D code inside a texture or the viewport.";
	LGraphTextureCanvas2D.help = "Set width and height to 0 to match viewport size.";

	LGraphTextureCanvas2D.default_code = "//vars: canvas,ctx,time\nctx.fillStyle='red';\nctx.fillRect(0,0,50,50);\n";

	LGraphTextureCanvas2D.widgets_info = {
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES },
		code: { type: "code" },
		width: { type: "number", precision: 0, step: 1 },
		height: { type: "number", precision: 0, step: 1 }
	};

	LGraphTextureCanvas2D.prototype.onPropertyChanged = function( name, value ) {
		if (name == "code" )
			this.compileCode( value );
	}
	
	LGraphTextureCanvas2D.prototype.compileCode = function( code ) {
		this._func = null;
		if( !LiteGraph.allow_scripts )
			return;

		try {
			this._func = new Function( "canvas", "ctx", "time", "script","v", code );
			this.boxcolor = "#00FF00";
		} catch (err) {
			this.boxcolor = "#FF0000";
			console.error("Error parsing script");
			console.error(err);
		}
	};

	LGraphTextureCanvas2D.prototype.onExecute = function() {
		var func = this._func;
		if (!func || !this.isOutputConnected(0)) {
			return;
		}
		this.executeDraw( func );
	}

	LGraphTextureCanvas2D.prototype.executeDraw = function( func_context ) {

		var width = this.properties.width || gl.canvas.width;
		var height = this.properties.height || gl.canvas.height;
		var temp = this._temp_texture;
		var type = LGraphTexture.getTextureType( this.properties.precision );
		if (!temp || temp.width != width || temp.height != height || temp.type != type ) {
			temp = this._temp_texture = new GL.Texture(width, height, {
				format: gl.RGBA,
				filter: gl.LINEAR,
				type: type
			});
		}

		var v = this.getInputData(0);

		var properties = this.properties;
		var that = this;
		var time = this.graph.getTime();
		var ctx = gl;
		var canvas = gl.canvas;
		if( this.properties.use_html_canvas || !global.enableWebGLCanvas )
		{
			if(!this._canvas)
			{
				canvas = this._canvas = createCanvas(width.height);
				ctx = this._ctx = canvas.getContext("2d");
			}
			else
			{
				canvas = this._canvas;
				ctx = this._ctx;
			}
			canvas.width = width;
			canvas.height = height;
		}

		if(ctx == gl) //using Canvas2DtoWebGL
			temp.drawTo(function() {
				gl.start2D();
				if(properties.clear)
				{
					gl.clearColor(0,0,0,0);
					gl.clear( gl.COLOR_BUFFER_BIT );
				}

				try {
					if (func_context.draw) {
						func_context.draw.call(that, canvas, ctx, time, func_context, v);
					} else {
						func_context.call(that, canvas, ctx, time, func_context,v);
					}
					that.boxcolor = "#00FF00";
				} catch (err) {
					that.boxcolor = "#FF0000";
					console.error("Error executing script");
					console.error(err);
				}
				gl.finish2D();
			});
		else //rendering to offscren canvas and uploading to texture
		{
			if(properties.clear)
				ctx.clearRect(0,0,canvas.width,canvas.height);

			try {
				if (func_context.draw) {
					func_context.draw.call(this, canvas, ctx, time, func_context, v);
				} else {
					func_context.call(this, canvas, ctx, time, func_context,v);
				}
				this.boxcolor = "#00FF00";
			} catch (err) {
				this.boxcolor = "#FF0000";
				console.error("Error executing script");
				console.error(err);
			}
			temp.uploadImage( canvas );
		}

		this.setOutputData(0, temp);
	};

	LiteGraph.registerNodeType("texture/canvas2D", LGraphTextureCanvas2D);

	// To do chroma keying *****************

	function LGraphTextureMatte() {
		this.addInput("in", "Texture");

		this.addOutput("out", "Texture");
		this.properties = {
			key_color: vec3.fromValues(0, 1, 0),
			threshold: 0.8,
			slope: 0.2,
			precision: LGraphTexture.DEFAULT
		};
	}

	LGraphTextureMatte.title = "Matte";
	LGraphTextureMatte.desc = "Extracts background";

	LGraphTextureMatte.widgets_info = {
		key_color: { widget: "color" },
		precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
	};

	LGraphTextureMatte.prototype.onExecute = function() {
		if (!this.isOutputConnected(0)) {
			return;
		} //saves work

		var tex = this.getInputData(0);

		if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
			this.setOutputData(0, tex);
			return;
		}

		if (!tex) {
			return;
		}

		this._tex = LGraphTexture.getTargetTexture(
			tex,
			this._tex,
			this.properties.precision
		);

		gl.disable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);

		if (!this._uniforms) {
			this._uniforms = {
				u_texture: 0,
				u_key_color: this.properties.key_color,
				u_threshold: 1,
				u_slope: 1
			};
		}
		var uniforms = this._uniforms;

		var mesh = Mesh.getScreenQuad();
		var shader = LGraphTextureMatte._shader;
		if (!shader) {
			shader = LGraphTextureMatte._shader = new GL.Shader(
				GL.Shader.SCREEN_VERTEX_SHADER,
				LGraphTextureMatte.pixel_shader
			);
		}

		uniforms.u_key_color = this.properties.key_color;
		uniforms.u_threshold = this.properties.threshold;
		uniforms.u_slope = this.properties.slope;

		this._tex.drawTo(function() {
			tex.bind(0);
			shader.uniforms(uniforms).draw(mesh);
		});

		this.setOutputData(0, this._tex);
	};

	LGraphTextureMatte.pixel_shader =
		"precision highp float;\n\
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

	LiteGraph.registerNodeType("texture/matte", LGraphTextureMatte);

	//***********************************
	function LGraphCubemapToTexture2D() {
		this.addInput("in", "texture");
		this.addInput("yaw", "number");
		this.addOutput("out", "texture");
		this.properties = { yaw: 0 };
	}

	LGraphCubemapToTexture2D.title = "CubemapToTexture2D";
	LGraphCubemapToTexture2D.desc = "Transforms a CUBEMAP texture into a TEXTURE2D in Polar Representation";

	LGraphCubemapToTexture2D.prototype.onExecute = function() {
		if (!this.isOutputConnected(0))
			return;

		var tex = this.getInputData(0);
		if ( !tex || tex.texture_type != GL.TEXTURE_CUBE_MAP )
			return;
		if( this._last_tex && ( this._last_tex.height != tex.height || this._last_tex.type != tex.type ))
			this._last_tex = null;
		var yaw = this.getInputOrProperty("yaw");
		this._last_tex = GL.Texture.cubemapToTexture2D( tex, tex.height, this._last_tex, true, yaw );
		this.setOutputData( 0, this._last_tex );
	};

	LiteGraph.registerNodeType( "texture/cubemapToTexture2D", LGraphCubemapToTexture2D );
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;
    var LGraphTexture = global.LGraphTexture;

    //Works with Litegl.js to create WebGL nodes
    if (typeof GL != "undefined") {
        // Texture Lens *****************************************
        function LGraphFXLens() {
            this.addInput("Texture", "Texture");
            this.addInput("Aberration", "number");
            this.addInput("Distortion", "number");
            this.addInput("Blur", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                aberration: 1.0,
                distortion: 1.0,
                blur: 1.0,
                precision: LGraphTexture.DEFAULT
            };

            if (!LGraphFXLens._shader) {
                LGraphFXLens._shader = new GL.Shader(
                    GL.Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXLens.pixel_shader
                );
                LGraphFXLens._texture = new GL.Texture(3, 1, {
                    format: gl.RGB,
                    wrap: gl.CLAMP_TO_EDGE,
                    magFilter: gl.LINEAR,
                    minFilter: gl.LINEAR,
                    pixel_data: [255, 0, 0, 0, 255, 0, 0, 0, 255]
                });
            }
        }

        LGraphFXLens.title = "Lens";
        LGraphFXLens.desc = "Camera Lens distortion";
        LGraphFXLens.widgets_info = {
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };

        LGraphFXLens.prototype.onExecute = function() {
            var tex = this.getInputData(0);
            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            var aberration = this.properties.aberration;
            if (this.isInputConnected(1)) {
                aberration = this.getInputData(1);
                this.properties.aberration = aberration;
            }

            var distortion = this.properties.distortion;
            if (this.isInputConnected(2)) {
                distortion = this.getInputData(2);
                this.properties.distortion = distortion;
            }

            var blur = this.properties.blur;
            if (this.isInputConnected(3)) {
                blur = this.getInputData(3);
                this.properties.blur = blur;
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            var mesh = Mesh.getScreenQuad();
            var shader = LGraphFXLens._shader;
            //var camera = LS.Renderer._current_camera;

            this._tex.drawTo(function() {
                tex.bind(0);
                shader
                    .uniforms({
                        u_texture: 0,
                        u_aberration: aberration,
                        u_distortion: distortion,
                        u_blur: blur
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXLens.pixel_shader =
            "precision highp float;\n\
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

        LiteGraph.registerNodeType("fx/lens", LGraphFXLens);
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

        function LGraphFXBokeh() {
            this.addInput("Texture", "Texture");
            this.addInput("Blurred", "Texture");
            this.addInput("Mask", "Texture");
            this.addInput("Threshold", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                shape: "",
                size: 10,
                alpha: 1.0,
                threshold: 1.0,
                high_precision: false
            };
        }

        LGraphFXBokeh.title = "Bokeh";
        LGraphFXBokeh.desc = "applies an Bokeh effect";

        LGraphFXBokeh.widgets_info = { shape: { widget: "texture" } };

        LGraphFXBokeh.prototype.onExecute = function() {
            var tex = this.getInputData(0);
            var blurred_tex = this.getInputData(1);
            var mask_tex = this.getInputData(2);
            if (!tex || !mask_tex || !this.properties.shape) {
                this.setOutputData(0, tex);
                return;
            }

            if (!blurred_tex) {
                blurred_tex = tex;
            }

            var shape_tex = LGraphTexture.getTexture(this.properties.shape);
            if (!shape_tex) {
                return;
            }

            var threshold = this.properties.threshold;
            if (this.isInputConnected(3)) {
                threshold = this.getInputData(3);
                this.properties.threshold = threshold;
            }

            var precision = gl.UNSIGNED_BYTE;
            if (this.properties.high_precision) {
                precision = gl.half_float_ext ? gl.HALF_FLOAT_OES : gl.FLOAT;
            }
            if (
                !this._temp_texture ||
                this._temp_texture.type != precision ||
                this._temp_texture.width != tex.width ||
                this._temp_texture.height != tex.height
            ) {
                this._temp_texture = new GL.Texture(tex.width, tex.height, {
                    type: precision,
                    format: gl.RGBA,
                    filter: gl.LINEAR
                });
            }

            //iterations
            var size = this.properties.size;

            var first_shader = LGraphFXBokeh._first_shader;
            if (!first_shader) {
                first_shader = LGraphFXBokeh._first_shader = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXBokeh._first_pixel_shader
                );
            }

            var second_shader = LGraphFXBokeh._second_shader;
            if (!second_shader) {
                second_shader = LGraphFXBokeh._second_shader = new GL.Shader(
                    LGraphFXBokeh._second_vertex_shader,
                    LGraphFXBokeh._second_pixel_shader
                );
            }

            var points_mesh = this._points_mesh;
            if (
                !points_mesh ||
                points_mesh._width != tex.width ||
                points_mesh._height != tex.height ||
                points_mesh._spacing != 2
            ) {
                points_mesh = this.createPointsMesh(tex.width, tex.height, 2);
            }

            var screen_mesh = Mesh.getScreenQuad();

            var point_size = this.properties.size;
            var min_light = this.properties.min_light;
            var alpha = this.properties.alpha;

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);

            this._temp_texture.drawTo(function() {
                tex.bind(0);
                blurred_tex.bind(1);
                mask_tex.bind(2);
                first_shader
                    .uniforms({
                        u_texture: 0,
                        u_texture_blur: 1,
                        u_mask: 2,
                        u_texsize: [tex.width, tex.height]
                    })
                    .draw(screen_mesh);
            });

            this._temp_texture.drawTo(function() {
                //clear because we use blending
                //gl.clearColor(0.0,0.0,0.0,1.0);
                //gl.clear( gl.COLOR_BUFFER_BIT );
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);

                tex.bind(0);
                shape_tex.bind(3);
                second_shader
                    .uniforms({
                        u_texture: 0,
                        u_mask: 2,
                        u_shape: 3,
                        u_alpha: alpha,
                        u_threshold: threshold,
                        u_pointSize: point_size,
                        u_itexsize: [1.0 / tex.width, 1.0 / tex.height]
                    })
                    .draw(points_mesh, gl.POINTS);
            });

            this.setOutputData(0, this._temp_texture);
        };

        LGraphFXBokeh.prototype.createPointsMesh = function(
            width,
            height,
            spacing
        ) {
            var nwidth = Math.round(width / spacing);
            var nheight = Math.round(height / spacing);

            var vertices = new Float32Array(nwidth * nheight * 2);

            var ny = -1;
            var dx = (2 / width) * spacing;
            var dy = (2 / height) * spacing;
            for (var y = 0; y < nheight; ++y) {
                var nx = -1;
                for (var x = 0; x < nwidth; ++x) {
                    var pos = y * nwidth * 2 + x * 2;
                    vertices[pos] = nx;
                    vertices[pos + 1] = ny;
                    nx += dx;
                }
                ny += dy;
            }

            this._points_mesh = GL.Mesh.load({ vertices2D: vertices });
            this._points_mesh._width = width;
            this._points_mesh._height = height;
            this._points_mesh._spacing = spacing;

            return this._points_mesh;
        };

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

        LGraphFXBokeh._first_pixel_shader =
            "precision highp float;\n\
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

        LGraphFXBokeh._second_vertex_shader =
            "precision highp float;\n\
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

        LGraphFXBokeh._second_pixel_shader =
            "precision highp float;\n\
			varying vec4 v_color;\n\
			uniform sampler2D u_shape;\n\
			uniform float u_alpha;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D( u_shape, gl_PointCoord );\n\
				color *= v_color * u_alpha;\n\
				gl_FragColor = color;\n\
			}\n";

        LiteGraph.registerNodeType("fx/bokeh", LGraphFXBokeh);
        global.LGraphFXBokeh = LGraphFXBokeh;

        //************************************************

        function LGraphFXGeneric() {
            this.addInput("Texture", "Texture");
            this.addInput("value1", "number");
            this.addInput("value2", "number");
            this.addOutput("Texture", "Texture");
            this.properties = {
                fx: "halftone",
                value1: 1,
                value2: 1,
                precision: LGraphTexture.DEFAULT
            };
        }

        LGraphFXGeneric.title = "FX";
        LGraphFXGeneric.desc = "applies an FX from a list";

        LGraphFXGeneric.widgets_info = {
            fx: {
                widget: "combo",
                values: ["halftone", "pixelate", "lowpalette", "noise", "gamma"]
            },
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };
        LGraphFXGeneric.shaders = {};

        LGraphFXGeneric.prototype.onExecute = function() {
            if (!this.isOutputConnected(0)) {
                return;
            } //saves work

            var tex = this.getInputData(0);
            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            //iterations
            var value1 = this.properties.value1;
            if (this.isInputConnected(1)) {
                value1 = this.getInputData(1);
                this.properties.value1 = value1;
            }

            var value2 = this.properties.value2;
            if (this.isInputConnected(2)) {
                value2 = this.getInputData(2);
                this.properties.value2 = value2;
            }

            var fx = this.properties.fx;
            var shader = LGraphFXGeneric.shaders[fx];
            if (!shader) {
                var pixel_shader_code = LGraphFXGeneric["pixel_shader_" + fx];
                if (!pixel_shader_code) {
                    return;
                }

                shader = LGraphFXGeneric.shaders[fx] = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    pixel_shader_code
                );
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);
            var mesh = Mesh.getScreenQuad();
            var camera = global.LS ? LS.Renderer._current_camera : null;
            var camera_planes;
            if (camera) {
                camera_planes = [
                    LS.Renderer._current_camera.near,
                    LS.Renderer._current_camera.far
                ];
            } else {
                camera_planes = [1, 100];
            }

            var noise = null;
            if (fx == "noise") {
                noise = LGraphTexture.getNoiseTexture();
            }

            this._tex.drawTo(function() {
                tex.bind(0);
                if (fx == "noise") {
                    noise.bind(1);
                }

                shader
                    .uniforms({
                        u_texture: 0,
                        u_noise: 1,
                        u_size: [tex.width, tex.height],
                        u_rand: [Math.random(), Math.random()],
                        u_value1: value1,
                        u_value2: value2,
                        u_camera_planes: camera_planes
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXGeneric.pixel_shader_halftone =
            "precision highp float;\n\
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

        LGraphFXGeneric.pixel_shader_pixelate =
            "precision highp float;\n\
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

        LGraphFXGeneric.pixel_shader_lowpalette =
            "precision highp float;\n\
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

        LGraphFXGeneric.pixel_shader_noise =
            "precision highp float;\n\
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

        LGraphFXGeneric.pixel_shader_gamma =
            "precision highp float;\n\
			varying vec2 v_coord;\n\
			uniform sampler2D u_texture;\n\
			uniform float u_value1;\n\
			\n\
			void main() {\n\
				vec4 color = texture2D(u_texture, v_coord);\n\
				float gamma = 1.0 / u_value1;\n\
				gl_FragColor = vec4( pow( color.xyz, vec3(gamma) ), color.a );\n\
			}\n";

        LiteGraph.registerNodeType("fx/generic", LGraphFXGeneric);
        global.LGraphFXGeneric = LGraphFXGeneric;

        // Vigneting ************************************

        function LGraphFXVigneting() {
            this.addInput("Tex.", "Texture");
            this.addInput("intensity", "number");

            this.addOutput("Texture", "Texture");
            this.properties = {
                intensity: 1,
                invert: false,
                precision: LGraphTexture.DEFAULT
            };

            if (!LGraphFXVigneting._shader) {
                LGraphFXVigneting._shader = new GL.Shader(
                    Shader.SCREEN_VERTEX_SHADER,
                    LGraphFXVigneting.pixel_shader
                );
            }
        }

        LGraphFXVigneting.title = "Vigneting";
        LGraphFXVigneting.desc = "Vigneting";

        LGraphFXVigneting.widgets_info = {
            precision: { widget: "combo", values: LGraphTexture.MODE_VALUES }
        };

        LGraphFXVigneting.prototype.onExecute = function() {
            var tex = this.getInputData(0);

            if (this.properties.precision === LGraphTexture.PASS_THROUGH) {
                this.setOutputData(0, tex);
                return;
            }

            if (!tex) {
                return;
            }

            this._tex = LGraphTexture.getTargetTexture(
                tex,
                this._tex,
                this.properties.precision
            );

            var intensity = this.properties.intensity;
            if (this.isInputConnected(1)) {
                intensity = this.getInputData(1);
                this.properties.intensity = intensity;
            }

            gl.disable(gl.BLEND);
            gl.disable(gl.DEPTH_TEST);

            var mesh = Mesh.getScreenQuad();
            var shader = LGraphFXVigneting._shader;
            var invert = this.properties.invert;

            this._tex.drawTo(function() {
                tex.bind(0);
                shader
                    .uniforms({
                        u_texture: 0,
                        u_intensity: intensity,
                        u_isize: [1 / tex.width, 1 / tex.height],
                        u_invert: invert ? 1 : 0
                    })
                    .draw(mesh);
            });

            this.setOutputData(0, this._tex);
        };

        LGraphFXVigneting.pixel_shader =
            "precision highp float;\n\
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

        LiteGraph.registerNodeType("fx/vigneting", LGraphFXVigneting);
        global.LGraphFXVigneting = LGraphFXVigneting;
    }
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;
    var MIDI_COLOR = "#243";

    function MIDIEvent(data) {
        this.channel = 0;
        this.cmd = 0;
        this.data = new Uint32Array(3);

        if (data) {
            this.setup(data);
        }
    }

    LiteGraph.MIDIEvent = MIDIEvent;

    MIDIEvent.prototype.fromJSON = function(o) {
        this.setup(o.data);
    };

    MIDIEvent.prototype.setup = function(data) {
        var raw_data = data;
        if (data.constructor === Object) {
            raw_data = data.data;
        }

        this.data.set(raw_data);

        var midiStatus = raw_data[0];
        this.status = midiStatus;

        var midiCommand = midiStatus & 0xf0;

        if (midiStatus >= 0xf0) {
            this.cmd = midiStatus;
        } else {
            this.cmd = midiCommand;
        }

        if (this.cmd == MIDIEvent.NOTEON && this.velocity == 0) {
            this.cmd = MIDIEvent.NOTEOFF;
        }

        this.cmd_str = MIDIEvent.commands[this.cmd] || "";

        if (
            midiCommand >= MIDIEvent.NOTEON ||
            midiCommand <= MIDIEvent.NOTEOFF
        ) {
            this.channel = midiStatus & 0x0f;
        }
    };

    Object.defineProperty(MIDIEvent.prototype, "velocity", {
        get: function() {
            if (this.cmd == MIDIEvent.NOTEON) {
                return this.data[2];
            }
            return -1;
        },
        set: function(v) {
            this.data[2] = v; //  v / 127;
        },
        enumerable: true
    });

    MIDIEvent.notes = [
        "A",
        "A#",
        "B",
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#"
    ];
    MIDIEvent.note_to_index = {
        A: 0,
        "A#": 1,
        B: 2,
        C: 3,
        "C#": 4,
        D: 5,
        "D#": 6,
        E: 7,
        F: 8,
        "F#": 9,
        G: 10,
        "G#": 11
    };

    Object.defineProperty(MIDIEvent.prototype, "note", {
        get: function() {
            if (this.cmd != MIDIEvent.NOTEON) {
                return -1;
            }
            return MIDIEvent.toNoteString(this.data[1], true);
        },
        set: function(v) {
            throw "notes cannot be assigned this way, must modify the data[1]";
        },
        enumerable: true
    });

    Object.defineProperty(MIDIEvent.prototype, "octave", {
        get: function() {
            if (this.cmd != MIDIEvent.NOTEON) {
                return -1;
            }
            var octave = this.data[1] - 24;
            return Math.floor(octave / 12 + 1);
        },
        set: function(v) {
            throw "octave cannot be assigned this way, must modify the data[1]";
        },
        enumerable: true
    });

    //returns HZs
    MIDIEvent.prototype.getPitch = function() {
        return Math.pow(2, (this.data[1] - 69) / 12) * 440;
    };

    MIDIEvent.computePitch = function(note) {
        return Math.pow(2, (note - 69) / 12) * 440;
    };

    MIDIEvent.prototype.getCC = function() {
        return this.data[1];
    };

    MIDIEvent.prototype.getCCValue = function() {
        return this.data[2];
    };

    //not tested, there is a formula missing here
    MIDIEvent.prototype.getPitchBend = function() {
        return this.data[1] + (this.data[2] << 7) - 8192;
    };

    MIDIEvent.computePitchBend = function(v1, v2) {
        return v1 + (v2 << 7) - 8192;
    };

    MIDIEvent.prototype.setCommandFromString = function(str) {
        this.cmd = MIDIEvent.computeCommandFromString(str);
    };

    MIDIEvent.computeCommandFromString = function(str) {
        if (!str) {
            return 0;
        }

        if (str && str.constructor === Number) {
            return str;
        }

        str = str.toUpperCase();
        switch (str) {
            case "NOTE ON":
            case "NOTEON":
                return MIDIEvent.NOTEON;
                break;
            case "NOTE OFF":
            case "NOTEOFF":
                return MIDIEvent.NOTEON;
                break;
            case "KEY PRESSURE":
            case "KEYPRESSURE":
                return MIDIEvent.KEYPRESSURE;
                break;
            case "CONTROLLER CHANGE":
            case "CONTROLLERCHANGE":
            case "CC":
                return MIDIEvent.CONTROLLERCHANGE;
                break;
            case "PROGRAM CHANGE":
            case "PROGRAMCHANGE":
            case "PC":
                return MIDIEvent.PROGRAMCHANGE;
                break;
            case "CHANNEL PRESSURE":
            case "CHANNELPRESSURE":
                return MIDIEvent.CHANNELPRESSURE;
                break;
            case "PITCH BEND":
            case "PITCHBEND":
                return MIDIEvent.PITCHBEND;
                break;
            case "TIME TICK":
            case "TIMETICK":
                return MIDIEvent.TIMETICK;
                break;
            default:
                return Number(str); //asume its a hex code
        }
    };

    //transform from a pitch number to string like "C4"
    MIDIEvent.toNoteString = function(d, skip_octave) {
        d = Math.round(d); //in case it has decimals
        var note = d - 21;
        var octave = Math.floor((d - 24) / 12 + 1);
        note = note % 12;
        if (note < 0) {
            note = 12 + note;
        }
        return MIDIEvent.notes[note] + (skip_octave ? "" : octave);
    };

    MIDIEvent.NoteStringToPitch = function(str) {
        str = str.toUpperCase();
        var note = str[0];
        var octave = 4;

        if (str[1] == "#") {
            note += "#";
            if (str.length > 2) {
                octave = Number(str[2]);
            }
        } else {
            if (str.length > 1) {
                octave = Number(str[1]);
            }
        }
        var pitch = MIDIEvent.note_to_index[note];
        if (pitch == null) {
            return null;
        }
        return (octave - 1) * 12 + pitch + 21;
    };

    MIDIEvent.prototype.toString = function() {
        var str = "" + this.channel + ". ";
        switch (this.cmd) {
            case MIDIEvent.NOTEON:
                str += "NOTEON " + MIDIEvent.toNoteString(this.data[1]);
                break;
            case MIDIEvent.NOTEOFF:
                str += "NOTEOFF " + MIDIEvent.toNoteString(this.data[1]);
                break;
            case MIDIEvent.CONTROLLERCHANGE:
                str += "CC " + this.data[1] + " " + this.data[2];
                break;
            case MIDIEvent.PROGRAMCHANGE:
                str += "PC " + this.data[1];
                break;
            case MIDIEvent.PITCHBEND:
                str += "PITCHBEND " + this.getPitchBend();
                break;
            case MIDIEvent.KEYPRESSURE:
                str += "KEYPRESS " + this.data[1];
                break;
        }

        return str;
    };

    MIDIEvent.prototype.toHexString = function() {
        var str = "";
        for (var i = 0; i < this.data.length; i++) {
            str += this.data[i].toString(16) + " ";
        }
    };

    MIDIEvent.prototype.toJSON = function() {
        return {
            data: [this.data[0], this.data[1], this.data[2]],
            object_class: "MIDIEvent"
        };
    };

    MIDIEvent.NOTEOFF = 0x80;
    MIDIEvent.NOTEON = 0x90;
    MIDIEvent.KEYPRESSURE = 0xa0;
    MIDIEvent.CONTROLLERCHANGE = 0xb0;
    MIDIEvent.PROGRAMCHANGE = 0xc0;
    MIDIEvent.CHANNELPRESSURE = 0xd0;
    MIDIEvent.PITCHBEND = 0xe0;
    MIDIEvent.TIMETICK = 0xf8;

    MIDIEvent.commands = {
        0x80: "note off",
        0x90: "note on",
        0xa0: "key pressure",
        0xb0: "controller change",
        0xc0: "program change",
        0xd0: "channel pressure",
        0xe0: "pitch bend",
        0xf0: "system",
        0xf2: "Song pos",
        0xf3: "Song select",
        0xf6: "Tune request",
        0xf8: "time tick",
        0xfa: "Start Song",
        0xfb: "Continue Song",
        0xfc: "Stop Song",
        0xfe: "Sensing",
        0xff: "Reset"
    };

    MIDIEvent.commands_short = {
        0x80: "NOTEOFF",
        0x90: "NOTEOFF",
        0xa0: "KEYP",
        0xb0: "CC",
        0xc0: "PC",
        0xd0: "CP",
        0xe0: "PB",
        0xf0: "SYS",
        0xf2: "POS",
        0xf3: "SELECT",
        0xf6: "TUNEREQ",
        0xf8: "TT",
        0xfa: "START",
        0xfb: "CONTINUE",
        0xfc: "STOP",
        0xfe: "SENS",
        0xff: "RESET"
    };

    MIDIEvent.commands_reversed = {};
    for (var i in MIDIEvent.commands) {
        MIDIEvent.commands_reversed[MIDIEvent.commands[i]] = i;
    }

    //MIDI wrapper, instantiate by MIDIIn and MIDIOut
    function MIDIInterface(on_ready, on_error) {
        if (!navigator.requestMIDIAccess) {
            this.error = "not suppoorted";
            if (on_error) {
                on_error("Not supported");
            } else {
                console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
            }
            return;
        }

        this.on_ready = on_ready;

        this.state = {
            note: [],
            cc: []
        };

		this.input_ports = null;
		this.input_ports_info = [];
		this.output_ports = null;
		this.output_ports_info = [];

        navigator.requestMIDIAccess().then(this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(this));
    }

    MIDIInterface.input = null;

    MIDIInterface.MIDIEvent = MIDIEvent;

    MIDIInterface.prototype.onMIDISuccess = function(midiAccess) {
        console.log("MIDI ready!");
        console.log(midiAccess);
        this.midi = midiAccess; // store in the global (in real usage, would probably keep in an object instance)
        this.updatePorts();

        if (this.on_ready) {
            this.on_ready(this);
        }
    };

    MIDIInterface.prototype.updatePorts = function() {
        var midi = this.midi;
        this.input_ports = midi.inputs;
		this.input_ports_info = [];
        this.output_ports = midi.outputs;
		this.output_ports_info = [];

        var num = 0;

        var it = this.input_ports.values();
        var it_value = it.next();
        while (it_value && it_value.done === false) {
            var port_info = it_value.value;
			this.input_ports_info.push(port_info);
            console.log( "Input port [type:'" + port_info.type + "'] id:'" + port_info.id + "' manufacturer:'" + port_info.manufacturer + "' name:'" + port_info.name + "' version:'" + port_info.version + "'" );
            num++;
            it_value = it.next();
        }
        this.num_input_ports = num;

        num = 0;
        var it = this.output_ports.values();
        var it_value = it.next();
        while (it_value && it_value.done === false) {
            var port_info = it_value.value;
			this.output_ports_info.push(port_info);
            console.log( "Output port [type:'" + port_info.type + "'] id:'" + port_info.id + "' manufacturer:'" + port_info.manufacturer + "' name:'" + port_info.name + "' version:'" + port_info.version + "'" );
            num++;
            it_value = it.next();
        }
        this.num_output_ports = num;
    };

    MIDIInterface.prototype.onMIDIFailure = function(msg) {
        console.error("Failed to get MIDI access - " + msg);
    };

    MIDIInterface.prototype.openInputPort = function(port, callback) {
        var input_port = this.input_ports.get("input-" + port);
        if (!input_port) {
            return false;
        }
        MIDIInterface.input = this;
        var that = this;

        input_port.onmidimessage = function(a) {
            var midi_event = new MIDIEvent(a.data);
            that.updateState(midi_event);
            if (callback) {
                callback(a.data, midi_event);
            }
            if (MIDIInterface.on_message) {
                MIDIInterface.on_message(a.data, midi_event);
            }
        };
        console.log("port open: ", input_port);
        return true;
    };

    MIDIInterface.parseMsg = function(data) {};

    MIDIInterface.prototype.updateState = function(midi_event) {
        switch (midi_event.cmd) {
            case MIDIEvent.NOTEON:
                this.state.note[midi_event.value1 | 0] = midi_event.value2;
                break;
            case MIDIEvent.NOTEOFF:
                this.state.note[midi_event.value1 | 0] = 0;
                break;
            case MIDIEvent.CONTROLLERCHANGE:
                this.state.cc[midi_event.getCC()] = midi_event.getCCValue();
                break;
        }
    };

    MIDIInterface.prototype.sendMIDI = function(port, midi_data) {
        if (!midi_data) {
            return;
        }

        var output_port = this.output_ports_info[port];//this.output_ports.get("output-" + port);
        if (!output_port) {
            return;
        }

        MIDIInterface.output = this;

        if (midi_data.constructor === MIDIEvent) {
            output_port.send(midi_data.data);
        } else {
            output_port.send(midi_data);
        }
    };

    function LGMIDIIn() {
        this.addOutput("on_midi", LiteGraph.EVENT);
        this.addOutput("out", "midi");
        this.properties = { port: 0 };
        this._last_midi_event = null;
        this._current_midi_event = null;
        this.boxcolor = "#AAA";
        this._last_time = 0;

        var that = this;
        new MIDIInterface(function(midi) {
            //open
            that._midi = midi;
            if (that._waiting) {
                that.onStart();
            }
            that._waiting = false;
        });
    }

    LGMIDIIn.MIDIInterface = MIDIInterface;

    LGMIDIIn.title = "MIDI Input";
    LGMIDIIn.desc = "Reads MIDI from a input port";
    LGMIDIIn.color = MIDI_COLOR;

    LGMIDIIn.prototype.getPropertyInfo = function(name) {
        if (!this._midi) {
            return;
        }

        if (name == "port") {
            var values = {};
            for (var i = 0; i < this._midi.input_ports_info.length; ++i) {
                var input = this._midi.input_ports_info[i];
                values[i] = i + ".- " + input.name + " version:" + input.version;
            }
            return { type: "enum", values: values };
        }
    };

    LGMIDIIn.prototype.onStart = function() {
        if (this._midi) {
            this._midi.openInputPort(
                this.properties.port,
                this.onMIDIEvent.bind(this)
            );
        } else {
            this._waiting = true;
        }
    };

    LGMIDIIn.prototype.onMIDIEvent = function(data, midi_event) {
        this._last_midi_event = midi_event;
        this.boxcolor = "#AFA";
        this._last_time = LiteGraph.getTime();
        this.trigger("on_midi", midi_event);
        if (midi_event.cmd == MIDIEvent.NOTEON) {
            this.trigger("on_noteon", midi_event);
        } else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
            this.trigger("on_noteoff", midi_event);
        } else if (midi_event.cmd == MIDIEvent.CONTROLLERCHANGE) {
            this.trigger("on_cc", midi_event);
        } else if (midi_event.cmd == MIDIEvent.PROGRAMCHANGE) {
            this.trigger("on_pc", midi_event);
        } else if (midi_event.cmd == MIDIEvent.PITCHBEND) {
            this.trigger("on_pitchbend", midi_event);
        }
    };

    LGMIDIIn.prototype.onDrawBackground = function(ctx) {
        this.boxcolor = "#AAA";
        if (!this.flags.collapsed && this._last_midi_event) {
            ctx.fillStyle = "white";
            var now = LiteGraph.getTime();
            var f = 1.0 - Math.max(0, (now - this._last_time) * 0.001);
            if (f > 0) {
                var t = ctx.globalAlpha;
                ctx.globalAlpha *= f;
                ctx.font = "12px Tahoma";
                ctx.fillText(
                    this._last_midi_event.toString(),
                    2,
                    this.size[1] * 0.5 + 3
                );
                //ctx.fillRect(0,0,this.size[0],this.size[1]);
                ctx.globalAlpha = t;
            }
        }
    };

    LGMIDIIn.prototype.onExecute = function() {
        if (this.outputs) {
            var last = this._last_midi_event;
            for (var i = 0; i < this.outputs.length; ++i) {
                var output = this.outputs[i];
                var v = null;
                switch (output.name) {
                    case "midi":
                        v = this._midi;
                        break;
                    case "last_midi":
                        v = last;
                        break;
                    default:
                        continue;
                }
                this.setOutputData(i, v);
            }
        }
    };

    LGMIDIIn.prototype.onGetOutputs = function() {
        return [
            ["last_midi", "midi"],
            ["on_midi", LiteGraph.EVENT],
            ["on_noteon", LiteGraph.EVENT],
            ["on_noteoff", LiteGraph.EVENT],
            ["on_cc", LiteGraph.EVENT],
            ["on_pc", LiteGraph.EVENT],
            ["on_pitchbend", LiteGraph.EVENT]
        ];
    };

    LiteGraph.registerNodeType("midi/input", LGMIDIIn);

    function LGMIDIOut() {
        this.addInput("send", LiteGraph.EVENT);
        this.properties = { port: 0 };

        var that = this;
        new MIDIInterface(function(midi) {
            that._midi = midi;
			that.widget.options.values = that.getMIDIOutputs();
        });
		this.widget = this.addWidget("combo","Device",this.properties.port,{ property: "port", values: this.getMIDIOutputs.bind(this) });
		this.size = [340,60];
    }

    LGMIDIOut.MIDIInterface = MIDIInterface;

    LGMIDIOut.title = "MIDI Output";
    LGMIDIOut.desc = "Sends MIDI to output channel";
    LGMIDIOut.color = MIDI_COLOR;

    LGMIDIOut.prototype.onGetPropertyInfo = function(name) {
        if (!this._midi) {
            return;
        }

        if (name == "port") {
			var values = this.getMIDIOutputs();
            return { type: "enum", values: values };
        }
    };
	LGMIDIOut.default_ports = {0:"unknown"};

	LGMIDIOut.prototype.getMIDIOutputs = function()
	{
		var values = {};
		if(!this._midi)
			return LGMIDIOut.default_ports;
		if(this._midi.output_ports_info)
		for (var i = 0; i < this._midi.output_ports_info.length; ++i) {
			var output = this._midi.output_ports_info[i];
			if(!output)
				continue;
			var name = i + ".- " + output.name + " version:" + output.version;
			values[i] = name;
		}
		return values;
	}

    LGMIDIOut.prototype.onAction = function(event, midi_event) {
        //console.log(midi_event);
        if (!this._midi) {
            return;
        }
        if (event == "send") {
            this._midi.sendMIDI(this.properties.port, midi_event);
        }
        this.trigger("midi", midi_event);
    };

    LGMIDIOut.prototype.onGetInputs = function() {
        return [["send", LiteGraph.ACTION]];
    };

    LGMIDIOut.prototype.onGetOutputs = function() {
        return [["on_midi", LiteGraph.EVENT]];
    };

    LiteGraph.registerNodeType("midi/output", LGMIDIOut);


    function LGMIDIShow() {
        this.addInput("on_midi", LiteGraph.EVENT);
        this._str = "";
        this.size = [200, 40];
    }

    LGMIDIShow.title = "MIDI Show";
    LGMIDIShow.desc = "Shows MIDI in the graph";
    LGMIDIShow.color = MIDI_COLOR;

    LGMIDIShow.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this._str;
        }
        return this.title;
    };

    LGMIDIShow.prototype.onAction = function(event, midi_event) {
        if (!midi_event) {
            return;
        }
        if (midi_event.constructor === MIDIEvent) {
            this._str = midi_event.toString();
        } else {
            this._str = "???";
        }
    };

    LGMIDIShow.prototype.onDrawForeground = function(ctx) {
        if (!this._str || this.flags.collapsed) {
            return;
        }

        ctx.font = "30px Arial";
        ctx.fillText(this._str, 10, this.size[1] * 0.8);
    };

    LGMIDIShow.prototype.onGetInputs = function() {
        return [["in", LiteGraph.ACTION]];
    };

    LGMIDIShow.prototype.onGetOutputs = function() {
        return [["on_midi", LiteGraph.EVENT]];
    };

    LiteGraph.registerNodeType("midi/show", LGMIDIShow);

    function LGMIDIFilter() {
        this.properties = {
            channel: -1,
            cmd: -1,
            min_value: -1,
            max_value: -1
        };

        var that = this;
        this._learning = false;
        this.addWidget("button", "Learn", "", function() {
            that._learning = true;
            that.boxcolor = "#FA3";
        });

        this.addInput("in", LiteGraph.EVENT);
        this.addOutput("on_midi", LiteGraph.EVENT);
        this.boxcolor = "#AAA";
    }

    LGMIDIFilter.title = "MIDI Filter";
    LGMIDIFilter.desc = "Filters MIDI messages";
    LGMIDIFilter.color = MIDI_COLOR;

    LGMIDIFilter["@cmd"] = {
        type: "enum",
        title: "Command",
        values: MIDIEvent.commands_reversed
    };

    LGMIDIFilter.prototype.getTitle = function() {
        var str = null;
        if (this.properties.cmd == -1) {
            str = "Nothing";
        } else {
            str = MIDIEvent.commands_short[this.properties.cmd] || "Unknown";
        }

        if (
            this.properties.min_value != -1 &&
            this.properties.max_value != -1
        ) {
            str +=
                " " +
                (this.properties.min_value == this.properties.max_value
                    ? this.properties.max_value
                    : this.properties.min_value +
                      ".." +
                      this.properties.max_value);
        }

        return "Filter: " + str;
    };

    LGMIDIFilter.prototype.onPropertyChanged = function(name, value) {
        if (name == "cmd") {
            var num = Number(value);
            if (isNaN(num)) {
                num = MIDIEvent.commands[value] || 0;
            }
            this.properties.cmd = num;
        }
    };

    LGMIDIFilter.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (this._learning) {
            this._learning = false;
            this.boxcolor = "#AAA";
            this.properties.channel = midi_event.channel;
            this.properties.cmd = midi_event.cmd;
            this.properties.min_value = this.properties.max_value =
                midi_event.data[1];
        } else {
            if (
                this.properties.channel != -1 &&
                midi_event.channel != this.properties.channel
            ) {
                return;
            }
            if (
                this.properties.cmd != -1 &&
                midi_event.cmd != this.properties.cmd
            ) {
                return;
            }
            if (
                this.properties.min_value != -1 &&
                midi_event.data[1] < this.properties.min_value
            ) {
                return;
            }
            if (
                this.properties.max_value != -1 &&
                midi_event.data[1] > this.properties.max_value
            ) {
                return;
            }
        }

        this.trigger("on_midi", midi_event);
    };

    LiteGraph.registerNodeType("midi/filter", LGMIDIFilter);

    function LGMIDIEvent() {
        this.properties = {
            channel: 0,
            cmd: 144, //0x90
            value1: 1,
            value2: 1
        };

        this.addInput("send", LiteGraph.EVENT);
        this.addInput("assign", LiteGraph.EVENT);
        this.addOutput("on_midi", LiteGraph.EVENT);

        this.midi_event = new MIDIEvent();
        this.gate = false;
    }

    LGMIDIEvent.title = "MIDIEvent";
    LGMIDIEvent.desc = "Create a MIDI Event";
    LGMIDIEvent.color = MIDI_COLOR;

    LGMIDIEvent.prototype.onAction = function(event, midi_event) {
        if (event == "assign") {
            this.properties.channel = midi_event.channel;
            this.properties.cmd = midi_event.cmd;
            this.properties.value1 = midi_event.data[1];
            this.properties.value2 = midi_event.data[2];
            if (midi_event.cmd == MIDIEvent.NOTEON) {
                this.gate = true;
            } else if (midi_event.cmd == MIDIEvent.NOTEOFF) {
                this.gate = false;
            }
            return;
        }

        //send
        var midi_event = this.midi_event;
        midi_event.channel = this.properties.channel;
        if (this.properties.cmd && this.properties.cmd.constructor === String) {
            midi_event.setCommandFromString(this.properties.cmd);
        } else {
            midi_event.cmd = this.properties.cmd;
        }
        midi_event.data[0] = midi_event.cmd | midi_event.channel;
        midi_event.data[1] = Number(this.properties.value1);
        midi_event.data[2] = Number(this.properties.value2);

        this.trigger("on_midi", midi_event);
    };

    LGMIDIEvent.prototype.onExecute = function() {
        var props = this.properties;

        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; ++i) {
                var input = this.inputs[i];
                if (input.link == -1) {
                    continue;
                }
                switch (input.name) {
                    case "note":
                        var v = this.getInputData(i);
                        if (v != null) {
                            if (v.constructor === String) {
                                v = MIDIEvent.NoteStringToPitch(v);
                            }
                            this.properties.value1 = (v | 0) % 255;
                        }
                        break;
                    case "cmd":
                        var v = this.getInputData(i);
                        if (v != null) {
                            this.properties.cmd = v;
                        }
                        break;
                    case "value1":
                        var v = this.getInputData(i);
                        if (v != null) {
                            this.properties.value1 = Math.clamp(v|0,0,127);
                        }
                        break;
                    case "value2":
                        var v = this.getInputData(i);
                        if (v != null) {
                            this.properties.value2 = Math.clamp(v|0,0,127);
                        }
                        break;
                }
            }
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; ++i) {
                var output = this.outputs[i];
                var v = null;
                switch (output.name) {
                    case "midi":
                        v = new MIDIEvent();
                        v.setup([props.cmd, props.value1, props.value2]);
                        v.channel = props.channel;
                        break;
                    case "command":
                        v = props.cmd;
                        break;
                    case "cc":
                        v = props.value1;
                        break;
                    case "cc_value":
                        v = props.value2;
                        break;
                    case "note":
                        v =
                            props.cmd == MIDIEvent.NOTEON ||
                            props.cmd == MIDIEvent.NOTEOFF
                                ? props.value1
                                : null;
                        break;
                    case "velocity":
                        v = props.cmd == MIDIEvent.NOTEON ? props.value2 : null;
                        break;
                    case "pitch":
                        v =
                            props.cmd == MIDIEvent.NOTEON
                                ? MIDIEvent.computePitch(props.value1)
                                : null;
                        break;
                    case "pitchbend":
                        v =
                            props.cmd == MIDIEvent.PITCHBEND
                                ? MIDIEvent.computePitchBend(
                                      props.value1,
                                      props.value2
                                  )
                                : null;
                        break;
                    case "gate":
                        v = this.gate;
                        break;
                    default:
                        continue;
                }
                if (v !== null) {
                    this.setOutputData(i, v);
                }
            }
        }
    };

    LGMIDIEvent.prototype.onPropertyChanged = function(name, value) {
        if (name == "cmd") {
            this.properties.cmd = MIDIEvent.computeCommandFromString(value);
        }
    };

    LGMIDIEvent.prototype.onGetInputs = function() {
        return [["cmd", "number"],["note", "number"],["value1", "number"],["value2", "number"]];
    };

    LGMIDIEvent.prototype.onGetOutputs = function() {
        return [
            ["midi", "midi"],
            ["on_midi", LiteGraph.EVENT],
            ["command", "number"],
            ["note", "number"],
            ["velocity", "number"],
            ["cc", "number"],
            ["cc_value", "number"],
            ["pitch", "number"],
            ["gate", "bool"],
            ["pitchbend", "number"]
        ];
    };

    LiteGraph.registerNodeType("midi/event", LGMIDIEvent);

    function LGMIDICC() {
        this.properties = {
            //		channel: 0,
            cc: 1,
            value: 0
        };

        this.addOutput("value", "number");
    }

    LGMIDICC.title = "MIDICC";
    LGMIDICC.desc = "gets a Controller Change";
    LGMIDICC.color = MIDI_COLOR;

    LGMIDICC.prototype.onExecute = function() {
        var props = this.properties;
        if (MIDIInterface.input) {
            this.properties.value =
                MIDIInterface.input.state.cc[this.properties.cc];
        }
        this.setOutputData(0, this.properties.value);
    };

    LiteGraph.registerNodeType("midi/cc", LGMIDICC);

    function LGMIDIGenerator() {
        this.addInput("generate", LiteGraph.ACTION);
        this.addInput("scale", "string");
        this.addInput("octave", "number");
        this.addOutput("note", LiteGraph.EVENT);
        this.properties = {
            notes: "A,A#,B,C,C#,D,D#,E,F,F#,G,G#",
            octave: 2,
            duration: 0.5,
            mode: "sequence"
        };

        this.notes_pitches = LGMIDIGenerator.processScale(
            this.properties.notes
        );
        this.sequence_index = 0;
    }

    LGMIDIGenerator.title = "MIDI Generator";
    LGMIDIGenerator.desc = "Generates a random MIDI note";
    LGMIDIGenerator.color = MIDI_COLOR;

    LGMIDIGenerator.processScale = function(scale) {
        var notes = scale.split(",");
        for (var i = 0; i < notes.length; ++i) {
            var n = notes[i];
            if ((n.length == 2 && n[1] != "#") || n.length > 2) {
                notes[i] = -LiteGraph.MIDIEvent.NoteStringToPitch(n);
            } else {
                notes[i] = MIDIEvent.note_to_index[n] || 0;
            }
        }
        return notes;
    };

    LGMIDIGenerator.prototype.onPropertyChanged = function(name, value) {
        if (name == "notes") {
            this.notes_pitches = LGMIDIGenerator.processScale(value);
        }
    };

    LGMIDIGenerator.prototype.onExecute = function() {
        var octave = this.getInputData(2);
        if (octave != null) {
            this.properties.octave = octave;
        }

        var scale = this.getInputData(1);
        if (scale) {
            this.notes_pitches = LGMIDIGenerator.processScale(scale);
        }
    };

    LGMIDIGenerator.prototype.onAction = function(event, midi_event) {
        //var range = this.properties.max - this.properties.min;
        //var pitch = this.properties.min + ((Math.random() * range)|0);
        var pitch = 0;
        var range = this.notes_pitches.length;
        var index = 0;

        if (this.properties.mode == "sequence") {
            index = this.sequence_index = (this.sequence_index + 1) % range;
        } else if (this.properties.mode == "random") {
            index = Math.floor(Math.random() * range);
        }

        var note = this.notes_pitches[index];
        if (note >= 0) {
            pitch = note + (this.properties.octave - 1) * 12 + 33;
        } else {
            pitch = -note;
        }

        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEON, pitch, 10]);
        var duration = this.properties.duration || 1;
        this.trigger("note", midi_event);

        //noteoff
        setTimeout(
            function() {
                var midi_event = new MIDIEvent();
                midi_event.setup([MIDIEvent.NOTEOFF, pitch, 0]);
                this.trigger("note", midi_event);
            }.bind(this),
            duration * 1000
        );
    };

    LiteGraph.registerNodeType("midi/generator", LGMIDIGenerator);

    function LGMIDITranspose() {
        this.properties = {
            amount: 0
        };
        this.addInput("in", LiteGraph.ACTION);
        this.addInput("amount", "number");
        this.addOutput("out", LiteGraph.EVENT);

        this.midi_event = new MIDIEvent();
    }

    LGMIDITranspose.title = "MIDI Transpose";
    LGMIDITranspose.desc = "Transpose a MIDI note";
    LGMIDITranspose.color = MIDI_COLOR;

    LGMIDITranspose.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (
            midi_event.data[0] == MIDIEvent.NOTEON ||
            midi_event.data[0] == MIDIEvent.NOTEOFF
        ) {
            this.midi_event = new MIDIEvent();
            this.midi_event.setup(midi_event.data);
            this.midi_event.data[1] = Math.round(
                this.midi_event.data[1] + this.properties.amount
            );
            this.trigger("out", this.midi_event);
        } else {
            this.trigger("out", midi_event);
        }
    };

    LGMIDITranspose.prototype.onExecute = function() {
        var amount = this.getInputData(1);
        if (amount != null) {
            this.properties.amount = amount;
        }
    };

    LiteGraph.registerNodeType("midi/transpose", LGMIDITranspose);

    function LGMIDIQuantize() {
        this.properties = {
            scale: "A,A#,B,C,C#,D,D#,E,F,F#,G,G#"
        };
        this.addInput("note", LiteGraph.ACTION);
        this.addInput("scale", "string");
        this.addOutput("out", LiteGraph.EVENT);

        this.valid_notes = new Array(12);
        this.offset_notes = new Array(12);
        this.processScale(this.properties.scale);
    }

    LGMIDIQuantize.title = "MIDI Quantize Pitch";
    LGMIDIQuantize.desc = "Transpose a MIDI note tp fit an scale";
    LGMIDIQuantize.color = MIDI_COLOR;

    LGMIDIQuantize.prototype.onPropertyChanged = function(name, value) {
        if (name == "scale") {
            this.processScale(value);
        }
    };

    LGMIDIQuantize.prototype.processScale = function(scale) {
        this._current_scale = scale;
        this.notes_pitches = LGMIDIGenerator.processScale(scale);
        for (var i = 0; i < 12; ++i) {
            this.valid_notes[i] = this.notes_pitches.indexOf(i) != -1;
        }
        for (var i = 0; i < 12; ++i) {
            if (this.valid_notes[i]) {
                this.offset_notes[i] = 0;
                continue;
            }
            for (var j = 1; j < 12; ++j) {
                if (this.valid_notes[(i - j) % 12]) {
                    this.offset_notes[i] = -j;
                    break;
                }
                if (this.valid_notes[(i + j) % 12]) {
                    this.offset_notes[i] = j;
                    break;
                }
            }
        }
    };

    LGMIDIQuantize.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (
            midi_event.data[0] == MIDIEvent.NOTEON ||
            midi_event.data[0] == MIDIEvent.NOTEOFF
        ) {
            this.midi_event = new MIDIEvent();
            this.midi_event.setup(midi_event.data);
            var note = midi_event.note;
            var index = MIDIEvent.note_to_index[note];
            var offset = this.offset_notes[index];
            this.midi_event.data[1] += offset;
            this.trigger("out", this.midi_event);
        } else {
            this.trigger("out", midi_event);
        }
    };

    LGMIDIQuantize.prototype.onExecute = function() {
        var scale = this.getInputData(1);
        if (scale != null && scale != this._current_scale) {
            this.processScale(scale);
        }
    };

    LiteGraph.registerNodeType("midi/quantize", LGMIDIQuantize);

	function LGMIDIFromFile() {
        this.properties = {
            url: "",
			autoplay: true
        };

        this.addInput("play", LiteGraph.ACTION);
        this.addInput("pause", LiteGraph.ACTION);
        this.addOutput("note", LiteGraph.EVENT);
		this._midi = null;
		this._current_time = 0;
		this._playing = false;

        if (typeof MidiParser == "undefined") {
            console.error(
                "midi-parser.js not included, LGMidiPlay requires that library: https://raw.githubusercontent.com/colxi/midi-parser-js/master/src/main.js"
            );
            this.boxcolor = "red";
		}

	}

    LGMIDIFromFile.title = "MIDI fromFile";
    LGMIDIFromFile.desc = "Plays a MIDI file";
    LGMIDIFromFile.color = MIDI_COLOR;

	LGMIDIFromFile.prototype.onAction = function( name )
	{
		if(name == "play")
			this.play();
		else if(name == "pause")
			this._playing = !this._playing;
	}

	LGMIDIFromFile.prototype.onPropertyChanged = function(name,value)
	{
		if(name == "url")
			this.loadMIDIFile(value);
	}

    LGMIDIFromFile.prototype.onExecute = function() {
		if(!this._midi)
			return;

		if(!this._playing)
			return;

		this._current_time += this.graph.elapsed_time;
		var current_time = this._current_time * 100;

		for(var i = 0; i < this._midi.tracks; ++i)
		{
			var track = this._midi.track[i];
			if(!track._last_pos)
			{
				track._last_pos = 0;
				track._time = 0;
			}

			var elem = track.event[ track._last_pos ];
			if(elem && (track._time + elem.deltaTime) <= current_time )
			{
				track._last_pos++;
				track._time += elem.deltaTime;

				if(elem.data)
				{
					var midi_cmd = elem.type << 4 + elem.channel;
					var midi_event = new MIDIEvent();
					midi_event.setup([midi_cmd, elem.data[0], elem.data[1]]);
					this.trigger("note", midi_event);
				}
			}
			
		}
    };

	LGMIDIFromFile.prototype.play = function()
	{
		this._playing = true;
		this._current_time = 0;
		if(!this._midi)
			return;

		for(var i = 0; i < this._midi.tracks; ++i)
		{
			var track = this._midi.track[i];
			track._last_pos = 0;
			track._time = 0;
		}		
	}

	LGMIDIFromFile.prototype.loadMIDIFile = function(url)
	{
		var that = this;
		LiteGraph.fetchFile( url, "arraybuffer", function(data)
		{
			that.boxcolor = "#AFA";
			that._midi = MidiParser.parse( new Uint8Array(data) );
			if(that.properties.autoplay)
				that.play();
		}, function(err){
			that.boxcolor = "#FAA";
			that._midi = null;
		});
	}

	LGMIDIFromFile.prototype.onDropFile = function(file)
	{
		this.properties.url = "";
		this.loadMIDIFile( file );
	}

    LiteGraph.registerNodeType("midi/fromFile", LGMIDIFromFile);


    function LGMIDIPlay() {
        this.properties = {
            volume: 0.5,
            duration: 1
        };
        this.addInput("note", LiteGraph.ACTION);
        this.addInput("volume", "number");
        this.addInput("duration", "number");
        this.addOutput("note", LiteGraph.EVENT);

        if (typeof AudioSynth == "undefined") {
            console.error(
                "Audiosynth.js not included, LGMidiPlay requires that library"
            );
            this.boxcolor = "red";
        } else {
            var Synth = (this.synth = new AudioSynth());
            this.instrument = Synth.createInstrument("piano");
        }
    }

    LGMIDIPlay.title = "MIDI Play";
    LGMIDIPlay.desc = "Plays a MIDI note";
    LGMIDIPlay.color = MIDI_COLOR;

    LGMIDIPlay.prototype.onAction = function(event, midi_event) {
        if (!midi_event || midi_event.constructor !== MIDIEvent) {
            return;
        }

        if (this.instrument && midi_event.data[0] == MIDIEvent.NOTEON) {
            var note = midi_event.note; //C#
            if (!note || note == "undefined" || note.constructor !== String) {
                return;
            }
            this.instrument.play(
                note,
                midi_event.octave,
                this.properties.duration,
                this.properties.volume
            );
        }
        this.trigger("note", midi_event);
    };

    LGMIDIPlay.prototype.onExecute = function() {
        var volume = this.getInputData(1);
        if (volume != null) {
            this.properties.volume = volume;
        }

        var duration = this.getInputData(2);
        if (duration != null) {
            this.properties.duration = duration;
        }
    };

    LiteGraph.registerNodeType("midi/play", LGMIDIPlay);

    function LGMIDIKeys() {
        this.properties = {
            num_octaves: 2,
            start_octave: 2
        };
        this.addInput("note", LiteGraph.ACTION);
        this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("note", LiteGraph.EVENT);
        this.size = [400, 100];
        this.keys = [];
        this._last_key = -1;
    }

    LGMIDIKeys.title = "MIDI Keys";
    LGMIDIKeys.desc = "Keyboard to play notes";
    LGMIDIKeys.color = MIDI_COLOR;

    LGMIDIKeys.keys = [
        { x: 0, w: 1, h: 1, t: 0 },
        { x: 0.75, w: 0.5, h: 0.6, t: 1 },
        { x: 1, w: 1, h: 1, t: 0 },
        { x: 1.75, w: 0.5, h: 0.6, t: 1 },
        { x: 2, w: 1, h: 1, t: 0 },
        { x: 2.75, w: 0.5, h: 0.6, t: 1 },
        { x: 3, w: 1, h: 1, t: 0 },
        { x: 4, w: 1, h: 1, t: 0 },
        { x: 4.75, w: 0.5, h: 0.6, t: 1 },
        { x: 5, w: 1, h: 1, t: 0 },
        { x: 5.75, w: 0.5, h: 0.6, t: 1 },
        { x: 6, w: 1, h: 1, t: 0 }
    ];

    LGMIDIKeys.prototype.onDrawForeground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }

        var num_keys = this.properties.num_octaves * 12;
        this.keys.length = num_keys;
        var key_width = this.size[0] / (this.properties.num_octaves * 7);
        var key_height = this.size[1];

        ctx.globalAlpha = 1;

        for (
            var k = 0;
            k < 2;
            k++ //draw first whites (0) then blacks (1)
        ) {
            for (var i = 0; i < num_keys; ++i) {
                var key_info = LGMIDIKeys.keys[i % 12];
                if (key_info.t != k) {
                    continue;
                }
                var octave = Math.floor(i / 12);
                var x = octave * 7 * key_width + key_info.x * key_width;
                if (k == 0) {
                    ctx.fillStyle = this.keys[i] ? "#CCC" : "white";
                } else {
                    ctx.fillStyle = this.keys[i] ? "#333" : "black";
                }
                ctx.fillRect(
                    x + 1,
                    0,
                    key_width * key_info.w - 2,
                    key_height * key_info.h
                );
            }
        }
    };

    LGMIDIKeys.prototype.getKeyIndex = function(pos) {
        var num_keys = this.properties.num_octaves * 12;
        var key_width = this.size[0] / (this.properties.num_octaves * 7);
        var key_height = this.size[1];

        for (
            var k = 1;
            k >= 0;
            k-- //test blacks first (1) then whites (0)
        ) {
            for (var i = 0; i < this.keys.length; ++i) {
                var key_info = LGMIDIKeys.keys[i % 12];
                if (key_info.t != k) {
                    continue;
                }
                var octave = Math.floor(i / 12);
                var x = octave * 7 * key_width + key_info.x * key_width;
                var w = key_width * key_info.w;
                var h = key_height * key_info.h;
                if (pos[0] < x || pos[0] > x + w || pos[1] > h) {
                    continue;
                }
                return i;
            }
        }
        return -1;
    };

    LGMIDIKeys.prototype.onAction = function(event, params) {
        if (event == "reset") {
            for (var i = 0; i < this.keys.length; ++i) {
                this.keys[i] = false;
            }
            return;
        }

        if (!params || params.constructor !== MIDIEvent) {
            return;
        }
        var midi_event = params;
        var start_note = (this.properties.start_octave - 1) * 12 + 29;
        var index = midi_event.data[1] - start_note;
        if (index >= 0 && index < this.keys.length) {
            if (midi_event.data[0] == MIDIEvent.NOTEON) {
                this.keys[index] = true;
            } else if (midi_event.data[0] == MIDIEvent.NOTEOFF) {
                this.keys[index] = false;
            }
        }

        this.trigger("note", midi_event);
    };

    LGMIDIKeys.prototype.onMouseDown = function(e, pos) {
        if (pos[1] < 0) {
            return;
        }
        var index = this.getKeyIndex(pos);
        this.keys[index] = true;
        this._last_key = index;
        var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEON, pitch, 100]);
        this.trigger("note", midi_event);
        return true;
    };

    LGMIDIKeys.prototype.onMouseMove = function(e, pos) {
        if (pos[1] < 0 || this._last_key == -1) {
            return;
        }
        this.setDirtyCanvas(true);
        var index = this.getKeyIndex(pos);
        if (this._last_key == index) {
            return true;
        }
        this.keys[this._last_key] = false;
        var pitch =
            (this.properties.start_octave - 1) * 12 + 29 + this._last_key;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEOFF, pitch, 100]);
        this.trigger("note", midi_event);

        this.keys[index] = true;
        var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEON, pitch, 100]);
        this.trigger("note", midi_event);

        this._last_key = index;
        return true;
    };

    LGMIDIKeys.prototype.onMouseUp = function(e, pos) {
        if (pos[1] < 0) {
            return;
        }
        var index = this.getKeyIndex(pos);
        this.keys[index] = false;
        this._last_key = -1;
        var pitch = (this.properties.start_octave - 1) * 12 + 29 + index;
        var midi_event = new MIDIEvent();
        midi_event.setup([MIDIEvent.NOTEOFF, pitch, 100]);
        this.trigger("note", midi_event);
        return true;
    };

    LiteGraph.registerNodeType("midi/keys", LGMIDIKeys);

    function now() {
        return window.performance.now();
    }
})(this);

(function(global) {
    var LiteGraph = global.LiteGraph;

    var LGAudio = {};
    global.LGAudio = LGAudio;

    LGAudio.getAudioContext = function() {
        if (!this._audio_context) {
            window.AudioContext =
                window.AudioContext || window.webkitAudioContext;
            if (!window.AudioContext) {
                console.error("AudioContext not supported by browser");
                return null;
            }
            this._audio_context = new AudioContext();
            this._audio_context.onmessage = function(msg) {
                console.log("msg", msg);
            };
            this._audio_context.onended = function(msg) {
                console.log("ended", msg);
            };
            this._audio_context.oncomplete = function(msg) {
                console.log("complete", msg);
            };
        }

        //in case it crashes
        //if(this._audio_context.state == "suspended")
        //	this._audio_context.resume();
        return this._audio_context;
    };

    LGAudio.connect = function(audionodeA, audionodeB) {
        try {
            audionodeA.connect(audionodeB);
        } catch (err) {
            console.warn("LGraphAudio:", err);
        }
    };

    LGAudio.disconnect = function(audionodeA, audionodeB) {
        try {
            audionodeA.disconnect(audionodeB);
        } catch (err) {
            console.warn("LGraphAudio:", err);
        }
    };

    LGAudio.changeAllAudiosConnections = function(node, connect) {
        if (node.inputs) {
            for (var i = 0; i < node.inputs.length; ++i) {
                var input = node.inputs[i];
                var link_info = node.graph.links[input.link];
                if (!link_info) {
                    continue;
                }

                var origin_node = node.graph.getNodeById(link_info.origin_id);
                var origin_audionode = null;
                if (origin_node.getAudioNodeInOutputSlot) {
                    origin_audionode = origin_node.getAudioNodeInOutputSlot(
                        link_info.origin_slot
                    );
                } else {
                    origin_audionode = origin_node.audionode;
                }

                var target_audionode = null;
                if (node.getAudioNodeInInputSlot) {
                    target_audionode = node.getAudioNodeInInputSlot(i);
                } else {
                    target_audionode = node.audionode;
                }

                if (connect) {
                    LGAudio.connect(origin_audionode, target_audionode);
                } else {
                    LGAudio.disconnect(origin_audionode, target_audionode);
                }
            }
        }

        if (node.outputs) {
            for (var i = 0; i < node.outputs.length; ++i) {
                var output = node.outputs[i];
                for (var j = 0; j < output.links.length; ++j) {
                    var link_info = node.graph.links[output.links[j]];
                    if (!link_info) {
                        continue;
                    }

                    var origin_audionode = null;
                    if (node.getAudioNodeInOutputSlot) {
                        origin_audionode = node.getAudioNodeInOutputSlot(i);
                    } else {
                        origin_audionode = node.audionode;
                    }

                    var target_node = node.graph.getNodeById(
                        link_info.target_id
                    );
                    var target_audionode = null;
                    if (target_node.getAudioNodeInInputSlot) {
                        target_audionode = target_node.getAudioNodeInInputSlot(
                            link_info.target_slot
                        );
                    } else {
                        target_audionode = target_node.audionode;
                    }

                    if (connect) {
                        LGAudio.connect(origin_audionode, target_audionode);
                    } else {
                        LGAudio.disconnect(origin_audionode, target_audionode);
                    }
                }
            }
        }
    };

    //used by many nodes
    LGAudio.onConnectionsChange = function(
        connection,
        slot,
        connected,
        link_info
    ) {
        //only process the outputs events
        if (connection != LiteGraph.OUTPUT) {
            return;
        }

        var target_node = null;
        if (link_info) {
            target_node = this.graph.getNodeById(link_info.target_id);
        }

        if (!target_node) {
            return;
        }

        //get origin audionode
        var local_audionode = null;
        if (this.getAudioNodeInOutputSlot) {
            local_audionode = this.getAudioNodeInOutputSlot(slot);
        } else {
            local_audionode = this.audionode;
        }

        //get target audionode
        var target_audionode = null;
        if (target_node.getAudioNodeInInputSlot) {
            target_audionode = target_node.getAudioNodeInInputSlot(
                link_info.target_slot
            );
        } else {
            target_audionode = target_node.audionode;
        }

        //do the connection/disconnection
        if (connected) {
            LGAudio.connect(local_audionode, target_audionode);
        } else {
            LGAudio.disconnect(local_audionode, target_audionode);
        }
    };

    //this function helps creating wrappers to existing classes
    LGAudio.createAudioNodeWrapper = function(class_object) {
        var old_func = class_object.prototype.onPropertyChanged;

        class_object.prototype.onPropertyChanged = function(name, value) {
            if (old_func) {
                old_func.call(this, name, value);
            }

            if (!this.audionode) {
                return;
            }

            if (this.audionode[name] === undefined) {
                return;
            }

            if (this.audionode[name].value !== undefined) {
                this.audionode[name].value = value;
            } else {
                this.audionode[name] = value;
            }
        };

        class_object.prototype.onConnectionsChange =
            LGAudio.onConnectionsChange;
    };

    //contains the samples decoded of the loaded audios in AudioBuffer format
    LGAudio.cached_audios = {};

    LGAudio.loadSound = function(url, on_complete, on_error) {
        if (LGAudio.cached_audios[url] && url.indexOf("blob:") == -1) {
            if (on_complete) {
                on_complete(LGAudio.cached_audios[url]);
            }
            return;
        }

        if (LGAudio.onProcessAudioURL) {
            url = LGAudio.onProcessAudioURL(url);
        }

        //load new sample
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        var context = LGAudio.getAudioContext();

        // Decode asynchronously
        request.onload = function() {
            console.log("AudioSource loaded");
            context.decodeAudioData(
                request.response,
                function(buffer) {
                    console.log("AudioSource decoded");
                    LGAudio.cached_audios[url] = buffer;
                    if (on_complete) {
                        on_complete(buffer);
                    }
                },
                onError
            );
        };
        request.send();

        function onError(err) {
            console.log("Audio loading sample error:", err);
            if (on_error) {
                on_error(err);
            }
        }

        return request;
    };

    //****************************************************

    function LGAudioSource() {
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

        this.addOutput("out", "audio");
        this.addInput("gain", "number");

        //init context
        var context = LGAudio.getAudioContext();

        //create gain node to control volume
        this.audionode = context.createGain();
        this.audionode.graphnode = this;
        this.audionode.gain.value = this.properties.gain;

        //debug
        if (this.properties.src) {
            this.loadSound(this.properties.src);
        }
    }

	LGAudioSource.desc = "Plays an audio file";
    LGAudioSource["@src"] = { widget: "resource" };
    LGAudioSource.supported_extensions = ["wav", "ogg", "mp3"];

    LGAudioSource.prototype.onAdded = function(graph) {
        if (graph.status === LGraph.STATUS_RUNNING) {
            this.onStart();
        }
    };

    LGAudioSource.prototype.onStart = function() {
        if (!this._audiobuffer) {
            return;
        }

        if (this.properties.autoplay) {
			this.playBuffer(this._audiobuffer);
        }
    };

    LGAudioSource.prototype.onStop = function() {
        this.stopAllSounds();
    };

    LGAudioSource.prototype.onPause = function() {
        this.pauseAllSounds();
    };

    LGAudioSource.prototype.onUnpause = function() {
        this.unpauseAllSounds();
        //this.onStart();
    };

    LGAudioSource.prototype.onRemoved = function() {
        this.stopAllSounds();
        if (this._dropped_url) {
            URL.revokeObjectURL(this._url);
        }
    };

    LGAudioSource.prototype.stopAllSounds = function() {
        //iterate and stop
        for (var i = 0; i < this._audionodes.length; ++i) {
            if (this._audionodes[i].started) {
                this._audionodes[i].started = false;
                this._audionodes[i].stop();
            }
            //this._audionodes[i].disconnect( this.audionode );
        }
        this._audionodes.length = 0;
    };

    LGAudioSource.prototype.pauseAllSounds = function() {
        LGAudio.getAudioContext().suspend();
    };

    LGAudioSource.prototype.unpauseAllSounds = function() {
        LGAudio.getAudioContext().resume();
    };

    LGAudioSource.prototype.onExecute = function() {
        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; ++i) {
                var input = this.inputs[i];
                if (input.link == null) {
                    continue;
                }
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                if (input.name == "gain")
                    this.audionode.gain.value = v;
                else if (input.name == "src") {
                    this.setProperty("src",v);
                } else if (input.name == "playbackRate") {
                    this.properties.playbackRate = v;
                    for (var j = 0; j < this._audionodes.length; ++j) {
                        this._audionodes[j].playbackRate.value = v;
                    }
                }
            }
        }

        if (this.outputs) {
            for (var i = 0; i < this.outputs.length; ++i) {
                var output = this.outputs[i];
                if (output.name == "buffer" && this._audiobuffer) {
                    this.setOutputData(i, this._audiobuffer);
                }
            }
        }
    };

    LGAudioSource.prototype.onAction = function(event) {
        if (this._audiobuffer) {
            if (event == "Play") {
                this.playBuffer(this._audiobuffer);
            } else if (event == "Stop") {
                this.stopAllSounds();
            }
        }
    };

    LGAudioSource.prototype.onPropertyChanged = function(name, value) {
        if (name == "src") {
            this.loadSound(value);
        } else if (name == "gain") {
            this.audionode.gain.value = value;
        } else if (name == "playbackRate") {
            for (var j = 0; j < this._audionodes.length; ++j) {
                this._audionodes[j].playbackRate.value = value;
            }
        }
    };

    LGAudioSource.prototype.playBuffer = function(buffer) {
        var that = this;
        var context = LGAudio.getAudioContext();

        //create a new audionode (this is mandatory, AudioAPI doesnt like to reuse old ones)
        var audionode = context.createBufferSource(); //create a AudioBufferSourceNode
        this._last_sourcenode = audionode;
        audionode.graphnode = this;
        audionode.buffer = buffer;
        audionode.loop = this.properties.loop;
        audionode.playbackRate.value = this.properties.playbackRate;
        this._audionodes.push(audionode);
        audionode.connect(this.audionode); //connect to gain

		this._audionodes.push(audionode);

		this.trigger("start");

        audionode.onended = function() {
            //console.log("ended!");
            that.trigger("ended");
            //remove
            var index = that._audionodes.indexOf(audionode);
            if (index != -1) {
                that._audionodes.splice(index, 1);
            }
        };

        if (!audionode.started) {
            audionode.started = true;
            audionode.start();
        }
        return audionode;
    };

    LGAudioSource.prototype.loadSound = function(url) {
        var that = this;

        //kill previous load
        if (this._request) {
            this._request.abort();
            this._request = null;
        }

        this._audiobuffer = null; //points to the audiobuffer once the audio is loaded
        this._loading_audio = false;

        if (!url) {
            return;
        }

        this._request = LGAudio.loadSound(url, inner);

        this._loading_audio = true;
        this.boxcolor = "#AA4";

        function inner(buffer) {
            this.boxcolor = LiteGraph.NODE_DEFAULT_BOXCOLOR;
            that._audiobuffer = buffer;
            that._loading_audio = false;
            //if is playing, then play it
            if (that.graph && that.graph.status === LGraph.STATUS_RUNNING) {
                that.onStart();
            } //this controls the autoplay already
        }
    };

    //Helps connect/disconnect AudioNodes when new connections are made in the node
    LGAudioSource.prototype.onConnectionsChange = LGAudio.onConnectionsChange;

    LGAudioSource.prototype.onGetInputs = function() {
        return [
            ["playbackRate", "number"],
			["src","string"],
            ["Play", LiteGraph.ACTION],
            ["Stop", LiteGraph.ACTION]
        ];
    };

    LGAudioSource.prototype.onGetOutputs = function() {
        return [["buffer", "audiobuffer"], ["start", LiteGraph.EVENT], ["ended", LiteGraph.EVENT]];
    };

    LGAudioSource.prototype.onDropFile = function(file) {
        if (this._dropped_url) {
            URL.revokeObjectURL(this._dropped_url);
        }
        var url = URL.createObjectURL(file);
        this.properties.src = url;
        this.loadSound(url);
        this._dropped_url = url;
    };

    LGAudioSource.title = "Source";
    LGAudioSource.desc = "Plays audio";
    LiteGraph.registerNodeType("audio/source", LGAudioSource);

    //****************************************************

    function LGAudioMediaSource() {
        this.properties = {
            gain: 0.5
        };

        this._audionodes = [];
        this._media_stream = null;

        this.addOutput("out", "audio");
        this.addInput("gain", "number");

        //create gain node to control volume
        var context = LGAudio.getAudioContext();
        this.audionode = context.createGain();
        this.audionode.graphnode = this;
        this.audionode.gain.value = this.properties.gain;
    }

    LGAudioMediaSource.prototype.onAdded = function(graph) {
        if (graph.status === LGraph.STATUS_RUNNING) {
            this.onStart();
        }
    };

    LGAudioMediaSource.prototype.onStart = function() {
        if (this._media_stream == null && !this._waiting_confirmation) {
            this.openStream();
        }
    };

    LGAudioMediaSource.prototype.onStop = function() {
        this.audionode.gain.value = 0;
    };

    LGAudioMediaSource.prototype.onPause = function() {
        this.audionode.gain.value = 0;
    };

    LGAudioMediaSource.prototype.onUnpause = function() {
        this.audionode.gain.value = this.properties.gain;
    };

    LGAudioMediaSource.prototype.onRemoved = function() {
        this.audionode.gain.value = 0;
        if (this.audiosource_node) {
            this.audiosource_node.disconnect(this.audionode);
            this.audiosource_node = null;
        }
        if (this._media_stream) {
            var tracks = this._media_stream.getTracks();
            if (tracks.length) {
                tracks[0].stop();
            }
        }
    };

    LGAudioMediaSource.prototype.openStream = function() {
        if (!navigator.mediaDevices) {
            console.log(
                "getUserMedia() is not supported in your browser, use chrome and enable WebRTC from about://flags"
            );
            return;
        }

        this._waiting_confirmation = true;

        // Not showing vendor prefixes.
        navigator.mediaDevices
            .getUserMedia({ audio: true, video: false })
            .then(this.streamReady.bind(this))
            .catch(onFailSoHard);

        var that = this;
        function onFailSoHard(err) {
            console.log("Media rejected", err);
            that._media_stream = false;
            that.boxcolor = "red";
        }
    };

    LGAudioMediaSource.prototype.streamReady = function(localMediaStream) {
        this._media_stream = localMediaStream;
        //this._waiting_confirmation = false;

        //init context
        if (this.audiosource_node) {
            this.audiosource_node.disconnect(this.audionode);
        }
        var context = LGAudio.getAudioContext();
        this.audiosource_node = context.createMediaStreamSource(
            localMediaStream
        );
        this.audiosource_node.graphnode = this;
        this.audiosource_node.connect(this.audionode);
        this.boxcolor = "white";
    };

    LGAudioMediaSource.prototype.onExecute = function() {
        if (this._media_stream == null && !this._waiting_confirmation) {
            this.openStream();
        }

        if (this.inputs) {
            for (var i = 0; i < this.inputs.length; ++i) {
                var input = this.inputs[i];
                if (input.link == null) {
                    continue;
                }
                var v = this.getInputData(i);
                if (v === undefined) {
                    continue;
                }
                if (input.name == "gain") {
                    this.audionode.gain.value = this.properties.gain = v;
                }
            }
        }
    };

    LGAudioMediaSource.prototype.onAction = function(event) {
        if (event == "Play") {
            this.audionode.gain.value = this.properties.gain;
        } else if (event == "Stop") {
            this.audionode.gain.value = 0;
        }
    };

    LGAudioMediaSource.prototype.onPropertyChanged = function(name, value) {
        if (name == "gain") {
            this.audionode.gain.value = value;
        }
    };

    //Helps connect/disconnect AudioNodes when new connections are made in the node
    LGAudioMediaSource.prototype.onConnectionsChange =
        LGAudio.onConnectionsChange;

    LGAudioMediaSource.prototype.onGetInputs = function() {
        return [
            ["playbackRate", "number"],
            ["Play", LiteGraph.ACTION],
            ["Stop", LiteGraph.ACTION]
        ];
    };

    LGAudioMediaSource.title = "MediaSource";
    LGAudioMediaSource.desc = "Plays microphone";
    LiteGraph.registerNodeType("audio/media_source", LGAudioMediaSource);

    //*****************************************************

    function LGAudioAnalyser() {
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

        this.addInput("in", "audio");
        this.addOutput("freqs", "array");
        this.addOutput("samples", "array");

        this._freq_bin = null;
        this._time_bin = null;
    }

    LGAudioAnalyser.prototype.onPropertyChanged = function(name, value) {
        this.audionode[name] = value;
    };

    LGAudioAnalyser.prototype.onExecute = function() {
        if (this.isOutputConnected(0)) {
            //send FFT
            var bufferLength = this.audionode.frequencyBinCount;
            if (!this._freq_bin || this._freq_bin.length != bufferLength) {
                this._freq_bin = new Uint8Array(bufferLength);
            }
            this.audionode.getByteFrequencyData(this._freq_bin);
            this.setOutputData(0, this._freq_bin);
        }

        //send analyzer
        if (this.isOutputConnected(1)) {
            //send Samples
            var bufferLength = this.audionode.frequencyBinCount;
            if (!this._time_bin || this._time_bin.length != bufferLength) {
                this._time_bin = new Uint8Array(bufferLength);
            }
            this.audionode.getByteTimeDomainData(this._time_bin);
            this.setOutputData(1, this._time_bin);
        }

        //properties
        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }

        //time domain
        //this.audionode.getFloatTimeDomainData( dataArray );
    };

    LGAudioAnalyser.prototype.onGetInputs = function() {
        return [
            ["minDecibels", "number"],
            ["maxDecibels", "number"],
            ["smoothingTimeConstant", "number"]
        ];
    };

    LGAudioAnalyser.prototype.onGetOutputs = function() {
        return [["freqs", "array"], ["samples", "array"]];
    };

    LGAudioAnalyser.title = "Analyser";
    LGAudioAnalyser.desc = "Audio Analyser";
    LiteGraph.registerNodeType("audio/analyser", LGAudioAnalyser);

    //*****************************************************

    function LGAudioGain() {
        //default
        this.properties = {
            gain: 1
        };

        this.audionode = LGAudio.getAudioContext().createGain();
        this.addInput("in", "audio");
        this.addInput("gain", "number");
        this.addOutput("out", "audio");
    }

    LGAudioGain.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudio.createAudioNodeWrapper(LGAudioGain);

    LGAudioGain.title = "Gain";
    LGAudioGain.desc = "Audio gain";
    LiteGraph.registerNodeType("audio/gain", LGAudioGain);

    function LGAudioConvolver() {
        //default
        this.properties = {
            impulse_src: "",
            normalize: true
        };

        this.audionode = LGAudio.getAudioContext().createConvolver();
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudio.createAudioNodeWrapper(LGAudioConvolver);

    LGAudioConvolver.prototype.onRemove = function() {
        if (this._dropped_url) {
            URL.revokeObjectURL(this._dropped_url);
        }
    };

    LGAudioConvolver.prototype.onPropertyChanged = function(name, value) {
        if (name == "impulse_src") {
            this.loadImpulse(value);
        } else if (name == "normalize") {
            this.audionode.normalize = value;
        }
    };

    LGAudioConvolver.prototype.onDropFile = function(file) {
        if (this._dropped_url) {
            URL.revokeObjectURL(this._dropped_url);
        }
        this._dropped_url = URL.createObjectURL(file);
        this.properties.impulse_src = this._dropped_url;
        this.loadImpulse(this._dropped_url);
    };

    LGAudioConvolver.prototype.loadImpulse = function(url) {
        var that = this;

        //kill previous load
        if (this._request) {
            this._request.abort();
            this._request = null;
        }

        this._impulse_buffer = null;
        this._loading_impulse = false;

        if (!url) {
            return;
        }

        //load new sample
        this._request = LGAudio.loadSound(url, inner);
        this._loading_impulse = true;

        // Decode asynchronously
        function inner(buffer) {
            that._impulse_buffer = buffer;
            that.audionode.buffer = buffer;
            console.log("Impulse signal set");
            that._loading_impulse = false;
        }
    };

    LGAudioConvolver.title = "Convolver";
    LGAudioConvolver.desc = "Convolves the signal (used for reverb)";
    LiteGraph.registerNodeType("audio/convolver", LGAudioConvolver);

    function LGAudioDynamicsCompressor() {
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
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudio.createAudioNodeWrapper(LGAudioDynamicsCompressor);

    LGAudioDynamicsCompressor.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }
        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudioDynamicsCompressor.prototype.onGetInputs = function() {
        return [
            ["threshold", "number"],
            ["knee", "number"],
            ["ratio", "number"],
            ["reduction", "number"],
            ["attack", "number"],
            ["release", "number"]
        ];
    };

    LGAudioDynamicsCompressor.title = "DynamicsCompressor";
    LGAudioDynamicsCompressor.desc = "Dynamics Compressor";
    LiteGraph.registerNodeType(
        "audio/dynamicsCompressor",
        LGAudioDynamicsCompressor
    );

    function LGAudioWaveShaper() {
        //default
        this.properties = {};

        this.audionode = LGAudio.getAudioContext().createWaveShaper();
        this.addInput("in", "audio");
        this.addInput("shape", "waveshape");
        this.addOutput("out", "audio");
    }

    LGAudioWaveShaper.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }
        var v = this.getInputData(1);
        if (v === undefined) {
            return;
        }
        this.audionode.curve = v;
    };

    LGAudioWaveShaper.prototype.setWaveShape = function(shape) {
        this.audionode.curve = shape;
    };

    LGAudio.createAudioNodeWrapper(LGAudioWaveShaper);

    /* disabled till I dont find a way to do a wave shape
LGAudioWaveShaper.title = "WaveShaper";
LGAudioWaveShaper.desc = "Distortion using wave shape";
LiteGraph.registerNodeType("audio/waveShaper", LGAudioWaveShaper);
*/

    function LGAudioMixer() {
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

        this.audionode1.connect(this.audionode);
        this.audionode2.connect(this.audionode);

        this.addInput("in1", "audio");
        this.addInput("in1 gain", "number");
        this.addInput("in2", "audio");
        this.addInput("in2 gain", "number");

        this.addOutput("out", "audio");
    }

    LGAudioMixer.prototype.getAudioNodeInInputSlot = function(slot) {
        if (slot == 0) {
            return this.audionode1;
        } else if (slot == 2) {
            return this.audionode2;
        }
    };

    LGAudioMixer.prototype.onPropertyChanged = function(name, value) {
        if (name == "gain1") {
            this.audionode1.gain.value = value;
        } else if (name == "gain2") {
            this.audionode2.gain.value = value;
        }
    };

    LGAudioMixer.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];

            if (input.link == null || input.type == "audio") {
                continue;
            }

            var v = this.getInputData(i);
            if (v === undefined) {
                continue;
            }

            if (i == 1) {
                this.audionode1.gain.value = v;
            } else if (i == 3) {
                this.audionode2.gain.value = v;
            }
        }
    };

    LGAudio.createAudioNodeWrapper(LGAudioMixer);

    LGAudioMixer.title = "Mixer";
    LGAudioMixer.desc = "Audio mixer";
    LiteGraph.registerNodeType("audio/mixer", LGAudioMixer);

    function LGAudioADSR() {
        //default
        this.properties = {
            A: 0.1,
            D: 0.1,
            S: 0.1,
            R: 0.1
        };

        this.audionode = LGAudio.getAudioContext().createGain();
        this.audionode.gain.value = 0;
        this.addInput("in", "audio");
        this.addInput("gate", "bool");
        this.addOutput("out", "audio");
        this.gate = false;
    }

    LGAudioADSR.prototype.onExecute = function() {
        var audioContext = LGAudio.getAudioContext();
        var now = audioContext.currentTime;
        var node = this.audionode;
        var gain = node.gain;
        var current_gate = this.getInputData(1);

        var A = this.getInputOrProperty("A");
        var D = this.getInputOrProperty("D");
        var S = this.getInputOrProperty("S");
        var R = this.getInputOrProperty("R");

        if (!this.gate && current_gate) {
            gain.cancelScheduledValues(0);
            gain.setValueAtTime(0, now);
            gain.linearRampToValueAtTime(1, now + A);
            gain.linearRampToValueAtTime(S, now + A + D);
        } else if (this.gate && !current_gate) {
            gain.cancelScheduledValues(0);
            gain.setValueAtTime(gain.value, now);
            gain.linearRampToValueAtTime(0, now + R);
        }

        this.gate = current_gate;
    };

    LGAudioADSR.prototype.onGetInputs = function() {
        return [
            ["A", "number"],
            ["D", "number"],
            ["S", "number"],
            ["R", "number"]
        ];
    };

    LGAudio.createAudioNodeWrapper(LGAudioADSR);

    LGAudioADSR.title = "ADSR";
    LGAudioADSR.desc = "Audio envelope";
    LiteGraph.registerNodeType("audio/adsr", LGAudioADSR);

    function LGAudioDelay() {
        //default
        this.properties = {
            delayTime: 0.5
        };

        this.audionode = LGAudio.getAudioContext().createDelay(10);
        this.audionode.delayTime.value = this.properties.delayTime;
        this.addInput("in", "audio");
        this.addInput("time", "number");
        this.addOutput("out", "audio");
    }

    LGAudio.createAudioNodeWrapper(LGAudioDelay);

    LGAudioDelay.prototype.onExecute = function() {
        var v = this.getInputData(1);
        if (v !== undefined) {
            this.audionode.delayTime.value = v;
        }
    };

    LGAudioDelay.title = "Delay";
    LGAudioDelay.desc = "Audio delay";
    LiteGraph.registerNodeType("audio/delay", LGAudioDelay);

    function LGAudioBiquadFilter() {
        //default
        this.properties = {
            frequency: 350,
            detune: 0,
            Q: 1
        };
        this.addProperty("type", "lowpass", "enum", {
            values: [
                "lowpass",
                "highpass",
                "bandpass",
                "lowshelf",
                "highshelf",
                "peaking",
                "notch",
                "allpass"
            ]
        });

        //create node
        this.audionode = LGAudio.getAudioContext().createBiquadFilter();

        //slots
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudioBiquadFilter.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 1; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudioBiquadFilter.prototype.onGetInputs = function() {
        return [["frequency", "number"], ["detune", "number"], ["Q", "number"]];
    };

    LGAudio.createAudioNodeWrapper(LGAudioBiquadFilter);

    LGAudioBiquadFilter.title = "BiquadFilter";
    LGAudioBiquadFilter.desc = "Audio filter";
    LiteGraph.registerNodeType("audio/biquadfilter", LGAudioBiquadFilter);

    function LGAudioOscillatorNode() {
        //default
        this.properties = {
            frequency: 440,
            detune: 0,
            type: "sine"
        };
        this.addProperty("type", "sine", "enum", {
            values: ["sine", "square", "sawtooth", "triangle", "custom"]
        });

        //create node
        this.audionode = LGAudio.getAudioContext().createOscillator();

        //slots
        this.addOutput("out", "audio");
    }

    LGAudioOscillatorNode.prototype.onStart = function() {
        if (!this.audionode.started) {
            this.audionode.started = true;
            try {
                this.audionode.start();
            } catch (err) {}
        }
    };

    LGAudioOscillatorNode.prototype.onStop = function() {
        if (this.audionode.started) {
            this.audionode.started = false;
            this.audionode.stop();
        }
    };

    LGAudioOscillatorNode.prototype.onPause = function() {
        this.onStop();
    };

    LGAudioOscillatorNode.prototype.onUnpause = function() {
        this.onStart();
    };

    LGAudioOscillatorNode.prototype.onExecute = function() {
        if (!this.inputs || !this.inputs.length) {
            return;
        }

        for (var i = 0; i < this.inputs.length; ++i) {
            var input = this.inputs[i];
            if (input.link == null) {
                continue;
            }
            var v = this.getInputData(i);
            if (v !== undefined) {
                this.audionode[input.name].value = v;
            }
        }
    };

    LGAudioOscillatorNode.prototype.onGetInputs = function() {
        return [
            ["frequency", "number"],
            ["detune", "number"],
            ["type", "string"]
        ];
    };

    LGAudio.createAudioNodeWrapper(LGAudioOscillatorNode);

    LGAudioOscillatorNode.title = "Oscillator";
    LGAudioOscillatorNode.desc = "Oscillator";
    LiteGraph.registerNodeType("audio/oscillator", LGAudioOscillatorNode);

    //*****************************************************

    //EXTRA

    function LGAudioVisualization() {
        this.properties = {
            continuous: true,
            mark: -1
        };

        this.addInput("data", "array");
        this.addInput("mark", "number");
        this.size = [300, 200];
        this._last_buffer = null;
    }

    LGAudioVisualization.prototype.onExecute = function() {
        this._last_buffer = this.getInputData(0);
        var v = this.getInputData(1);
        if (v !== undefined) {
            this.properties.mark = v;
        }
        this.setDirtyCanvas(true, false);
    };

    LGAudioVisualization.prototype.onDrawForeground = function(ctx) {
        if (!this._last_buffer) {
            return;
        }

        var buffer = this._last_buffer;

        //delta represents how many samples we advance per pixel
        var delta = buffer.length / this.size[0];
        var h = this.size[1];

        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, this.size[0], this.size[1]);
        ctx.strokeStyle = "white";
        ctx.beginPath();
        var x = 0;

        if (this.properties.continuous) {
            ctx.moveTo(x, h);
            for (var i = 0; i < buffer.length; i += delta) {
                ctx.lineTo(x, h - (buffer[i | 0] / 255) * h);
                x++;
            }
        } else {
            for (var i = 0; i < buffer.length; i += delta) {
                ctx.moveTo(x + 0.5, h);
                ctx.lineTo(x + 0.5, h - (buffer[i | 0] / 255) * h);
                x++;
            }
        }
        ctx.stroke();

        if (this.properties.mark >= 0) {
            var samplerate = LGAudio.getAudioContext().sampleRate;
            var binfreq = samplerate / buffer.length;
            var x = (2 * (this.properties.mark / binfreq)) / delta;
            if (x >= this.size[0]) {
                x = this.size[0] - 1;
            }
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.moveTo(x, h);
            ctx.lineTo(x, 0);
            ctx.stroke();
        }
    };

    LGAudioVisualization.title = "Visualization";
    LGAudioVisualization.desc = "Audio Visualization";
    LiteGraph.registerNodeType("audio/visualization", LGAudioVisualization);

    function LGAudioBandSignal() {
        //default
        this.properties = {
            band: 440,
            amplitude: 1
        };

        this.addInput("freqs", "array");
        this.addOutput("signal", "number");
    }

    LGAudioBandSignal.prototype.onExecute = function() {
        this._freqs = this.getInputData(0);
        if (!this._freqs) {
            return;
        }

        var band = this.properties.band;
        var v = this.getInputData(1);
        if (v !== undefined) {
            band = v;
        }

        var samplerate = LGAudio.getAudioContext().sampleRate;
        var binfreq = samplerate / this._freqs.length;
        var index = 2 * (band / binfreq);
        var v = 0;
        if (index < 0) {
            v = this._freqs[0];
        }
        if (index >= this._freqs.length) {
            v = this._freqs[this._freqs.length - 1];
        } else {
            var pos = index | 0;
            var v0 = this._freqs[pos];
            var v1 = this._freqs[pos + 1];
            var f = index - pos;
            v = v0 * (1 - f) + v1 * f;
        }

        this.setOutputData(0, (v / 255) * this.properties.amplitude);
    };

    LGAudioBandSignal.prototype.onGetInputs = function() {
        return [["band", "number"]];
    };

    LGAudioBandSignal.title = "Signal";
    LGAudioBandSignal.desc = "extract the signal of some frequency";
    LiteGraph.registerNodeType("audio/signal", LGAudioBandSignal);

    function LGAudioScript() {
        if (!LGAudioScript.default_code) {
            var code = LGAudioScript.default_function.toString();
            var index = code.indexOf("{") + 1;
            var index2 = code.lastIndexOf("}");
            LGAudioScript.default_code = code.substr(index, index2 - index);
        }

        //default
        this.properties = {
            code: LGAudioScript.default_code
        };

        //create node
        var ctx = LGAudio.getAudioContext();
        if (ctx.createScriptProcessor) {
            this.audionode = ctx.createScriptProcessor(4096, 1, 1);
        }
        //buffer size, input channels, output channels
        else {
            console.warn("ScriptProcessorNode deprecated");
            this.audionode = ctx.createGain(); //bypass audio
        }

        this.processCode();
        if (!LGAudioScript._bypass_function) {
            LGAudioScript._bypass_function = this.audionode.onaudioprocess;
        }

        //slots
        this.addInput("in", "audio");
        this.addOutput("out", "audio");
    }

    LGAudioScript.prototype.onAdded = function(graph) {
        if (graph.status == LGraph.STATUS_RUNNING) {
            this.audionode.onaudioprocess = this._callback;
        }
    };

    LGAudioScript["@code"] = { widget: "code", type: "code" };

    LGAudioScript.prototype.onStart = function() {
        this.audionode.onaudioprocess = this._callback;
    };

    LGAudioScript.prototype.onStop = function() {
        this.audionode.onaudioprocess = LGAudioScript._bypass_function;
    };

    LGAudioScript.prototype.onPause = function() {
        this.audionode.onaudioprocess = LGAudioScript._bypass_function;
    };

    LGAudioScript.prototype.onUnpause = function() {
        this.audionode.onaudioprocess = this._callback;
    };

    LGAudioScript.prototype.onExecute = function() {
        //nothing! because we need an onExecute to receive onStart... fix that
    };

    LGAudioScript.prototype.onRemoved = function() {
        this.audionode.onaudioprocess = LGAudioScript._bypass_function;
    };

    LGAudioScript.prototype.processCode = function() {
        try {
            var func = new Function("properties", this.properties.code);
            this._script = new func(this.properties);
            this._old_code = this.properties.code;
            this._callback = this._script.onaudioprocess;
        } catch (err) {
            console.error("Error in onaudioprocess code", err);
            this._callback = LGAudioScript._bypass_function;
            this.audionode.onaudioprocess = this._callback;
        }
    };

    LGAudioScript.prototype.onPropertyChanged = function(name, value) {
        if (name == "code") {
            this.properties.code = value;
            this.processCode();
            if (this.graph && this.graph.status == LGraph.STATUS_RUNNING) {
                this.audionode.onaudioprocess = this._callback;
            }
        }
    };

    LGAudioScript.default_function = function() {
        this.onaudioprocess = function(audioProcessingEvent) {
            // The input buffer is the song we loaded earlier
            var inputBuffer = audioProcessingEvent.inputBuffer;

            // The output buffer contains the samples that will be modified and played
            var outputBuffer = audioProcessingEvent.outputBuffer;

            // Loop through the output channels (in this case there is only one)
            for (
                var channel = 0;
                channel < outputBuffer.numberOfChannels;
                channel++
            ) {
                var inputData = inputBuffer.getChannelData(channel);
                var outputData = outputBuffer.getChannelData(channel);

                // Loop through the 4096 samples
                for (var sample = 0; sample < inputBuffer.length; sample++) {
                    // make output equal to the same as the input
                    outputData[sample] = inputData[sample];
                }
            }
        };
    };

    LGAudio.createAudioNodeWrapper(LGAudioScript);

    LGAudioScript.title = "Script";
    LGAudioScript.desc = "apply script to signal";
    LiteGraph.registerNodeType("audio/script", LGAudioScript);

    function LGAudioDestination() {
        this.audionode = LGAudio.getAudioContext().destination;
        this.addInput("in", "audio");
    }

    LGAudioDestination.title = "Destination";
    LGAudioDestination.desc = "Audio output";
    LiteGraph.registerNodeType("audio/destination", LGAudioDestination);
})(this);

//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    function LGWebSocket() {
        this.size = [60, 20];
        this.addInput("send", LiteGraph.ACTION);
        this.addOutput("received", LiteGraph.EVENT);
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.properties = {
            url: "",
            room: "lgraph", //allows to filter messages,
            only_send_changes: true
        };
        this._ws = null;
        this._last_sent_data = [];
        this._last_received_data = [];
    }

    LGWebSocket.title = "WebSocket";
    LGWebSocket.desc = "Send data through a websocket";

    LGWebSocket.prototype.onPropertyChanged = function(name, value) {
        if (name == "url") {
            this.connectSocket();
        }
    };

    LGWebSocket.prototype.onExecute = function() {
        if (!this._ws && this.properties.url) {
            this.connectSocket();
        }

        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }

        var room = this.properties.room;
        var only_changes = this.properties.only_send_changes;

        for (var i = 1; i < this.inputs.length; ++i) {
            var data = this.getInputData(i);
            if (data == null) {
                continue;
            }
            var json;
            try {
                json = JSON.stringify({
                    type: 0,
                    room: room,
                    channel: i,
                    data: data
                });
            } catch (err) {
                continue;
            }
            if (only_changes && this._last_sent_data[i] == json) {
                continue;
            }

            this._last_sent_data[i] = json;
            this._ws.send(json);
        }

        for (var i = 1; i < this.outputs.length; ++i) {
            this.setOutputData(i, this._last_received_data[i]);
        }

        if (this.boxcolor == "#AFA") {
            this.boxcolor = "#6C6";
        }
    };

    LGWebSocket.prototype.connectSocket = function() {
        var that = this;
        var url = this.properties.url;
        if (url.substr(0, 2) != "ws") {
            url = "ws://" + url;
        }
        this._ws = new WebSocket(url);
        this._ws.onopen = function() {
            console.log("ready");
            that.boxcolor = "#6C6";
        };
        this._ws.onmessage = function(e) {
            that.boxcolor = "#AFA";
            var data = JSON.parse(e.data);
            if (data.room && data.room != that.properties.room) {
                return;
            }
            if (data.type == 1) {
                if (
                    data.data.object_class &&
                    LiteGraph[data.data.object_class]
                ) {
                    var obj = null;
                    try {
                        obj = new LiteGraph[data.data.object_class](data.data);
                        that.triggerSlot(0, obj);
                    } catch (err) {
                        return;
                    }
                } else {
                    that.triggerSlot(0, data.data);
                }
            } else {
                that._last_received_data[data.channel || 0] = data.data;
            }
        };
        this._ws.onerror = function(e) {
            console.log("couldnt connect to websocket");
            that.boxcolor = "#E88";
        };
        this._ws.onclose = function(e) {
            console.log("connection closed");
            that.boxcolor = "#000";
        };
    };

    LGWebSocket.prototype.send = function(data) {
        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }
        this._ws.send(JSON.stringify({ type: 1, msg: data }));
    };

    LGWebSocket.prototype.onAction = function(action, param) {
        if (!this._ws || this._ws.readyState != WebSocket.OPEN) {
            return;
        }
        this._ws.send({
            type: 1,
            room: this.properties.room,
            action: action,
            data: param
        });
    };

    LGWebSocket.prototype.onGetInputs = function() {
        return [["in", 0]];
    };

    LGWebSocket.prototype.onGetOutputs = function() {
        return [["out", 0]];
    };

    LiteGraph.registerNodeType("network/websocket", LGWebSocket);

    //It is like a websocket but using the SillyServer.js server that bounces packets back to all clients connected:
    //For more information: https://github.com/jagenjo/SillyServer.js

    function LGSillyClient() {
        //this.size = [60,20];
        this.room_widget = this.addWidget(
            "text",
            "Room",
            "lgraph",
            this.setRoom.bind(this)
        );
        this.addWidget(
            "button",
            "Reconnect",
            null,
            this.connectSocket.bind(this)
        );

        this.addInput("send", LiteGraph.ACTION);
        this.addOutput("received", LiteGraph.EVENT);
        this.addInput("in", 0);
        this.addOutput("out", 0);
        this.properties = {
            url: "tamats.com:55000",
            room: "lgraph",
            only_send_changes: true
        };

        this._server = null;
        this.connectSocket();
        this._last_sent_data = [];
        this._last_received_data = [];

		if(typeof(SillyClient) == "undefined")
			console.warn("remember to add SillyClient.js to your project: https://tamats.com/projects/sillyserver/src/sillyclient.js");
    }

    LGSillyClient.title = "SillyClient";
    LGSillyClient.desc = "Connects to SillyServer to broadcast messages";

    LGSillyClient.prototype.onPropertyChanged = function(name, value) {
        if (name == "room") {
            this.room_widget.value = value;
        }
        this.connectSocket();
    };

    LGSillyClient.prototype.setRoom = function(room_name) {
        this.properties.room = room_name;
        this.room_widget.value = room_name;
        this.connectSocket();
    };

    //force label names
    LGSillyClient.prototype.onDrawForeground = function() {
        for (var i = 1; i < this.inputs.length; ++i) {
            var slot = this.inputs[i];
            slot.label = "in_" + i;
        }
        for (var i = 1; i < this.outputs.length; ++i) {
            var slot = this.outputs[i];
            slot.label = "out_" + i;
        }
    };

    LGSillyClient.prototype.onExecute = function() {
        if (!this._server || !this._server.is_connected) {
            return;
        }

        var only_send_changes = this.properties.only_send_changes;

        for (var i = 1; i < this.inputs.length; ++i) {
            var data = this.getInputData(i);
			var prev_data = this._last_sent_data[i];
            if (data != null) {
                if (only_send_changes)
				{	
					var is_equal = true;
					if( data && data.length && prev_data && prev_data.length == data.length && data.constructor !== String)
					{
						for(var j = 0; j < data.length; ++j)
							if( prev_data[j] != data[j] )
							{
								is_equal = false;
								break;
							}
					}
					else if(this._last_sent_data[i] != data)
						is_equal = false;
					if(is_equal)
							continue;
                }
                this._server.sendMessage({ type: 0, channel: i, data: data });
				if( data.length && data.constructor !== String )
				{
					if( this._last_sent_data[i] )
					{
						this._last_sent_data[i].length = data.length;
						for(var j = 0; j < data.length; ++j)
							this._last_sent_data[i][j] = data[j];
					}
					else //create
					{
						if(data.constructor === Array)
							this._last_sent_data[i] = data.concat();
						else
							this._last_sent_data[i] = new data.constructor( data );
					}
				}
				else
	                this._last_sent_data[i] = data; //should be cloned
            }
        }

        for (var i = 1; i < this.outputs.length; ++i) {
            this.setOutputData(i, this._last_received_data[i]);
        }

        if (this.boxcolor == "#AFA") {
            this.boxcolor = "#6C6";
        }
    };

    LGSillyClient.prototype.connectSocket = function() {
        var that = this;
        if (typeof SillyClient == "undefined") {
            if (!this._error) {
                console.error(
                    "SillyClient node cannot be used, you must include SillyServer.js"
                );
            }
            this._error = true;
            return;
        }

        this._server = new SillyClient();
        this._server.on_ready = function() {
            console.log("ready");
            that.boxcolor = "#6C6";
        };
        this._server.on_message = function(id, msg) {
            var data = null;
            try {
                data = JSON.parse(msg);
            } catch (err) {
                return;
            }

            if (data.type == 1) {
                //EVENT slot
                if (
                    data.data.object_class &&
                    LiteGraph[data.data.object_class]
                ) {
                    var obj = null;
                    try {
                        obj = new LiteGraph[data.data.object_class](data.data);
                        that.triggerSlot(0, obj);
                    } catch (err) {
                        return;
                    }
                } else {
                    that.triggerSlot(0, data.data);
                }
            } //for FLOW slots
            else {
                that._last_received_data[data.channel || 0] = data.data;
            }
            that.boxcolor = "#AFA";
        };
        this._server.on_error = function(e) {
            console.log("couldnt connect to websocket");
            that.boxcolor = "#E88";
        };
        this._server.on_close = function(e) {
            console.log("connection closed");
            that.boxcolor = "#000";
        };

        if (this.properties.url && this.properties.room) {
            try {
                this._server.connect(this.properties.url, this.properties.room);
            } catch (err) {
                console.error("SillyServer error: " + err);
                this._server = null;
                return;
            }
            this._final_url = this.properties.url + "/" + this.properties.room;
        }
    };

    LGSillyClient.prototype.send = function(data) {
        if (!this._server || !this._server.is_connected) {
            return;
        }
        this._server.sendMessage({ type: 1, data: data });
    };

    LGSillyClient.prototype.onAction = function(action, param) {
        if (!this._server || !this._server.is_connected) {
            return;
        }
        this._server.sendMessage({ type: 1, action: action, data: param });
    };

    LGSillyClient.prototype.onGetInputs = function() {
        return [["in", 0]];
    };

    LGSillyClient.prototype.onGetOutputs = function() {
        return [["out", 0]];
    };

    LiteGraph.registerNodeType("network/sillyclient", LGSillyClient);
})(this);
