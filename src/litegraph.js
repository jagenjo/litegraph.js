
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
        GRID_SHAPE: 6, // intended for slot arrays

        //enums
        INPUT: 1,
        OUTPUT: 2,

        EVENT: -1, //for outputs
        ACTION: -1, //for inputs

        NODE_MODES: ["Always", "On Event", "Never", "On Trigger"], // helper, will add "On Request" and more in the future
        NODE_MODES_COLORS:["#666","#422","#333","#224","#626"], // use with node_box_coloured_by_mode
        ALWAYS: 0,
        ON_EVENT: 1,
        NEVER: 2,
        ON_TRIGGER: 3,

        UP: 1,
        DOWN: 2,
        LEFT: 3,
        RIGHT: 4,
        CENTER: 5,

        LINK_RENDER_MODES: ["Straight", "Linear", "Spline"], // helper
        STRAIGHT_LINK: 0,
        LINEAR_LINK: 1,
        SPLINE_LINK: 2,

        NORMAL_TITLE: 0,
        NO_TITLE: 1,
        TRANSPARENT_TITLE: 2,
        AUTOHIDE_TITLE: 3,
        VERTICAL_LAYOUT: "vertical", // arrange nodes vertically

        proxy: null, //used to redirect calls
        node_images_path: "",

        debug: false,
        catch_exceptions: true,
        throw_errors: true,
        allow_scripts: false, //if set to true some nodes like Formula would be allowed to evaluate code that comes from unsafe sources (like node configuration), which could lead to exploits
        use_deferred_actions: true, //executes actions during the graph execution flow
        registered_node_types: {}, //nodetypes by string
        node_types_by_file_extension: {}, //used for dropping files in the canvas
        Nodes: {}, //node types by classname
		Globals: {}, //used to store vars between graphs

        searchbox_extras: {}, //used to add extra features to the search box
        auto_sort_node_types: false, // [true!] If set to true, will automatically sort node types / categories in the context menus
		
		node_box_coloured_when_on: false, // [true!] this make the nodes box (top left circle) coloured when triggered (execute/action), visual feedback
        node_box_coloured_by_mode: false, // [true!] nodebox based on node mode, visual feedback
        
        dialog_close_on_mouse_leave: true, // [false on mobile] better true if not touch device, TODO add an helper/listener to close if false
        dialog_close_on_mouse_leave_delay: 500,
        
        shift_click_do_break_link_from: false, // [false!] prefer false if results too easy to break links - implement with ALT or TODO custom keys
        click_do_break_link_to: false, // [false!]prefer false, way too easy to break links
        
        search_hide_on_mouse_leave: true, // [false on mobile] better true if not touch device, TODO add an helper/listener to close if false
        search_filter_enabled: false, // [true!] enable filtering slots type in the search widget, !requires auto_load_slot_types or manual set registered_slot_[in/out]_types and slot_types_[in/out]
        search_show_all_on_open: true, // [true!] opens the results list when opening the search widget
        
        auto_load_slot_types: false, // [if want false, use true, run, get vars values to be statically set, than disable] nodes types and nodeclass association with node types need to be calculated, if dont want this, calculate once and set registered_slot_[in/out]_types and slot_types_[in/out]
        
		// set these values if not using auto_load_slot_types
        registered_slot_in_types: {}, // slot types for nodeclass
        registered_slot_out_types: {}, // slot types for nodeclass
        slot_types_in: [], // slot types IN
        slot_types_out: [], // slot types OUT
        slot_types_default_in: [], // specify for each IN slot type a(/many) default node(s), use single string, array, or object (with node, title, parameters, ..) like for search
		slot_types_default_out: [], // specify for each OUT slot type a(/many) default node(s), use single string, array, or object (with node, title, parameters, ..) like for search
		
		alt_drag_do_clone_nodes: false, // [true!] very handy, ALT click to clone and drag the new node

		do_add_triggers_slots: false, // [true!] will create and connect event slots when using action/events connections, !WILL CHANGE node mode when using onTrigger (enable mode colors), onExecuted does not need this
		
		allow_multi_output_for_events: true, // [false!] being events, it is strongly reccomended to use them sequentially, one by one

		middle_click_slot_add_default_node: false, //[true!] allows to create and connect a ndoe clicking with the third button (wheel)
		
		release_link_on_empty_shows_menu: false, //[true!] dragging a link to empty space will open a menu, add from list, search or defaults
		
        pointerevents_method: "mouse", // "mouse"|"pointer" use mouse for retrocompatibility issues? (none found @ now)
        // TODO implement pointercancel, gotpointercapture, lostpointercapture, (pointerover, pointerout if necessary)

        ctrl_shift_v_paste_connect_unselected_outputs: false, //[true!] allows ctrl + shift + v to paste nodes with the outputs of the unselected nodes connected with the inputs of the newly pasted nodes

        // if true, all newly created nodes/links will use string UUIDs for their id fields instead of integers.
        // use this if you must have node IDs that are unique across all graphs and subgraphs.
        use_uuids: false,

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

            const classname = base_class.name;

            const pos = type.lastIndexOf("/");
            base_class.category = type.substring(0, pos);

            if (!base_class.title) {
                base_class.title = classname;
            }

            //extend class
            for (var i in LGraphNode.prototype) {
                if (!base_class.prototype[i]) {
                    base_class.prototype[i] = LGraphNode.prototype[i];
                }
            }

            const prev = this.registered_node_types[type];
            if(prev) {
                console.log("replacing node type: " + type);
            }
            if( !Object.prototype.hasOwnProperty.call( base_class.prototype, "shape") ) {
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
                    get: function() {
                        return this._shape;
                    },
                    enumerable: true,
                    configurable: true
                });
                

                //used to know which nodes to create when dragging files to the canvas
                if (base_class.supported_extensions) {
                    for (let i in base_class.supported_extensions) {
                        const ext = base_class.supported_extensions[i];
                        if(ext && ext.constructor === String) {
                            this.node_types_by_file_extension[ ext.toLowerCase() ] = base_class;
                        }
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
            
            // TODO one would want to know input and ouput :: this would allow through registerNodeAndSlotType to get all the slots types
            if (this.auto_load_slot_types) {
                new base_class(base_class.title || "tmpnode");
            }
        },

        /**
         * removes a node type from the system
         * @method unregisterNodeType
         * @param {String|Object} type name of the node or the node constructor itself
         */
        unregisterNodeType: function(type) {
            const base_class =
                type.constructor === String
                    ? this.registered_node_types[type]
                    : type;
            if (!base_class) {
                throw "node type not found: " + type;
            }
            delete this.registered_node_types[base_class.type];
            if (base_class.constructor.name) {
                delete this.Nodes[base_class.constructor.name];
            }
        },

        /**
        * Save a slot type and his node
        * @method registerSlotType
        * @param {String|Object} type name of the node or the node constructor itself
        * @param {String} slot_type name of the slot type (variable type), eg. string, number, array, boolean, ..
        */
        registerNodeAndSlotType: function(type, slot_type, out){
            out = out || false;
            const base_class =
                type.constructor === String &&
                this.registered_node_types[type] !== "anonymous"
                    ? this.registered_node_types[type]
                    : type;

            const class_type = base_class.constructor.type;

            let allTypes = [];
            if (typeof slot_type === "string") {
                allTypes = slot_type.split(",");
            } else if (slot_type == this.EVENT || slot_type == this.ACTION) {
                allTypes = ["_event_"];
            } else {
                allTypes = ["*"];
            }

            for (let i = 0; i < allTypes.length; ++i) {
                let slotType = allTypes[i];
                if (slotType === "") {
                    slotType = "*";
                }
                const registerTo = out
                    ? "registered_slot_out_types"
                    : "registered_slot_in_types";
                if (this[registerTo][slotType] === undefined) {
                    this[registerTo][slotType] = { nodes: [] };
                }
                if (!this[registerTo][slotType].nodes.includes(class_type)) {
                    this[registerTo][slotType].nodes.push(class_type);
                }

                // check if is a new type
                if (!out) {
                    if (!this.slot_types_in.includes(slotType.toLowerCase())) {
                        this.slot_types_in.push(slotType.toLowerCase());
                        this.slot_types_in.sort();
                    }
                } else {
                    if (!this.slot_types_out.includes(slotType.toLowerCase())) {
                        this.slot_types_out.push(slotType.toLowerCase());
                        this.slot_types_out.sort();
                    }
                }
            }
        },
        
        /**
         * Create a new nodetype by passing an object with some properties
         * like onCreate, inputs:Array, outputs:Array, properties, onExecute
         * @method buildNodeClassFromObject
         * @param {String} name node name with namespace (p.e.: 'math/sum')
         * @param {Object} object methods expected onCreate, inputs, outputs, properties, onExecute
         */
         buildNodeClassFromObject: function(
            name,
            object
        ) {
            var ctor_code = "";
            if(object.inputs)
            for(var i=0; i < object.inputs.length; ++i)
            {
                var _name = object.inputs[i][0];
                var _type = object.inputs[i][1];
                if(_type && _type.constructor === String)
                    _type = '"'+_type+'"';
                ctor_code += "this.addInput('"+_name+"',"+_type+");\n";
            }
            if(object.outputs)
            for(var i=0; i < object.outputs.length; ++i)
            {
                var _name = object.outputs[i][0];
                var _type = object.outputs[i][1];
                if(_type && _type.constructor === String)
                    _type = '"'+_type+'"';
                ctor_code += "this.addOutput('"+_name+"',"+_type+");\n";
            }
            if(object.properties)
            for(var i in object.properties)
            {
                var prop = object.properties[i];
                if(prop && prop.constructor === String)
                    prop = '"'+prop+'"';
                ctor_code += "this.addProperty('"+i+"',"+prop+");\n";
            }
            ctor_code += "if(this.onCreate)this.onCreate()";
            var classobj = Function(ctor_code);
            for(var i in object)
                if(i!="inputs" && i!="outputs" && i!="properties")
                    classobj.prototype[i] = object[i];
            classobj.title = object.title || name.split("/").pop();
            classobj.desc = object.desc || "Generated from object";
            this.registerNodeType(name, classobj);
            return classobj;
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
            if(param_types !== null) //null means no inputs
            {
                var names = LiteGraph.getParameterNames(func);
                for (var i = 0; i < names.length; ++i) {
                    var type = 0;
                    if(param_types)
                    {
                        //type = param_types[i] != null ? "'" + param_types[i] + "'" : "0";
                        if( param_types[i] != null && param_types[i].constructor === String )
                            type = "'" + param_types[i] + "'" ;
                        else if( param_types[i] != null )
                            type = param_types[i];
                    } 
                    code +=
                        "this.addInput('" +
                        names[i] +
                        "'," +
                        type +
                        ");\n";
                }
            }
            if(return_type !== null) //null means no output
            code +=
                "this.addOutput('out'," +
                (return_type != null ? (return_type.constructor === String ? "'" + return_type + "'" : return_type) : 0) +
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
            return classobj;
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

			// callback
            if ( node.onNodeCreated ) {
                node.onNodeCreated();
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

            if (this.auto_sort_node_types) {
                r.sort(function(a,b){return a.title.localeCompare(b.title)});
            }

            return r;
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

        /*
         * https://gist.github.com/jed/982883?permalink_comment_id=852670#gistcomment-852670
         */
        uuidv4: function() {
            return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,a=>(a^Math.random()*16>>a/4).toString(16));
        },

        /**
         * Returns if the types of two slots are compatible (taking into account wildcards, etc)
         * @method isValidConnection
         * @param {String} type_a
         * @param {String} type_b
         * @return {Boolean} true if they can be connected
         */
        isValidConnection: function(type_a, type_b) {
			if (type_a=="" || type_a==="*") type_a = 0;
			if (type_b=="" || type_b==="*") type_b = 0;
            if (
                !type_a //generic output
                || !type_b // generic input
                || type_a == type_b //same type (is valid for triggers)
                || (type_a == LiteGraph.EVENT && type_b == LiteGraph.ACTION)
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
                    if(this.isValidConnection(supported_types_a[i],supported_types_b[j])){
					//if (supported_types_a[i] == supported_types_b[j]) {
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

        this.nodes_executing = [];
        this.nodes_actioning = [];
        this.nodes_executedAction = [];
        
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

        //not optimal: executes possible pending actions in node, problem is it is not optimized
        //it is done here as if it was done in the later loop it wont be called in the node missed the onExecute
        
        //from now on it will iterate only on executable nodes which is faster
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
                    if(LiteGraph.use_deferred_actions && node._waiting_actions && node._waiting_actions.length)
                        node.executePendingActions();
                    if (node.mode == LiteGraph.ALWAYS && node.onExecute) {
                        //wrap node.onExecute();
						node.doExecute();
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
        } else { //catch errors
            try {
                //iterations
                for (var i = 0; i < num; i++) {
                    for (var j = 0; j < limit; ++j) {
                        var node = nodes[j];
                        if(LiteGraph.use_deferred_actions && node._waiting_actions && node._waiting_actions.length)
                            node.executePendingActions();
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
        this.nodes_executing = [];
        this.nodes_actioning = [];
        this.nodes_executedAction = [];
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
    LGraph.prototype.arrange = function (margin, layout) {
        margin = margin || 100;

        const nodes = this.computeExecutionOrder(false, true);
        const columns = [];
        for (let i = 0; i < nodes.length; ++i) {
            const node = nodes[i];
            const col = node._level || 1;
            if (!columns[col]) {
                columns[col] = [];
            }
            columns[col].push(node);
        }

        let x = margin;

        for (let i = 0; i < columns.length; ++i) {
            const column = columns[i];
            if (!column) {
                continue;
            }
            let max_size = 100;
            let y = margin + LiteGraph.NODE_TITLE_HEIGHT;
            for (let j = 0; j < column.length; ++j) {
                const node = column[j];
                node.pos[0] = (layout == LiteGraph.VERTICAL_LAYOUT) ? y : x;
                node.pos[1] = (layout == LiteGraph.VERTICAL_LAYOUT) ? x : y;
                const max_size_index = (layout == LiteGraph.VERTICAL_LAYOUT) ? 1 : 0;
                if (node.size[max_size_index] > max_size) {
                    max_size = node.size[max_size_index];
                }
                const node_size_index = (layout == LiteGraph.VERTICAL_LAYOUT) ? 0 : 1;
                y += node.size[node_size_index] + margin + LiteGraph.NODE_TITLE_HEIGHT;
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
            if (LiteGraph.use_uuids) {
                node.id = LiteGraph.uuidv4();
            }
            else {
                node.id = ++this.last_node_id;
            }
        }

        if (this._nodes.length >= LiteGraph.MAX_NUMBER_OF_NODES) {
            throw "LiteGraph: max number of nodes in a graph reached";
        }

        //give him an id
        if (LiteGraph.use_uuids) {
            if (node.id == null || node.id == -1)
                node.id = LiteGraph.uuidv4();
        }
        else {
            if (node.id == null || node.id == -1) {
                node.id = ++this.last_node_id;
            } else if (this.last_node_id < node.id) {
                this.last_node_id = node.id;
            }
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

		this.beforeChange(); //sure? - almost sure is wrong

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
		this.afterChange(); //sure? - almost sure is wrong
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
		var nRet = null;
        for (var i = nodes_list.length - 1; i >= 0; i--) {
            var n = nodes_list[i];
            if (n.isPointInside(x, y, margin)) {
                // check for lesser interest nodes (TODO check for overlapping, use the top)
				/*if (typeof n == "LGraphGroup"){
					nRet = n;
				}else{*/
					return n;
				/*}*/
            }
        }
        return nRet;
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

    LGraph.prototype.onAction = function(action, param, options) {
        this._input_nodes = this.findNodesByClass(
            LiteGraph.GraphInput,
            this._input_nodes
        );
        for (var i = 0; i < this._input_nodes.length; ++i) {
            var node = this._input_nodes[i];
            if (node.properties.name != action) {
                continue;
            }
            //wrap node.onAction(action, param);
            node.actionDo(action, param, options);
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

        if (LiteGraph.use_uuids) {
            this.id = LiteGraph.uuidv4();
        }
        else {
            this.id = -1; //not know till not added
        }
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

		if (this.inputs) {
			for (var i = 0; i < this.inputs.length; ++i) {
				var input = this.inputs[i];
				var link_info = this.graph ? this.graph.links[input.link] : null;
				if (this.onConnectionsChange)
					this.onConnectionsChange( LiteGraph.INPUT, i, true, link_info, input ); //link_info has been created now, so its updated

				if( this.onInputAdded )
					this.onInputAdded(input);

			}
		}

		if (this.outputs) {
			for (var i = 0; i < this.outputs.length; ++i) {
				var output = this.outputs[i];
				if (!output.links) {
					continue;
				}
				for (var j = 0; j < output.links.length; ++j) {
					var link_info = this.graph 	? this.graph.links[output.links[j]] : null;
					if (this.onConnectionsChange)
						this.onConnectionsChange( LiteGraph.OUTPUT, i, true, link_info, output ); //link_info has been created now, so its updated
				}

				if( this.onOutputAdded )
					this.onOutputAdded(output);
			}
        }

		if( this.widgets )
		{
			for (var i = 0; i < this.widgets.length; ++i)
			{
				var w = this.widgets[i];
				if(!w)
					continue;
				if(w.options && w.options.property && (this.properties[ w.options.property ] != undefined))
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

        if (LiteGraph.use_uuids) {
            data["id"] = LiteGraph.uuidv4()
        }

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

    LGraphNode.prototype.addOnTriggerInput = function(){
        var trigS = this.findInputSlot("onTrigger");
        if (trigS == -1){ //!trigS || 
            var input = this.addInput("onTrigger", LiteGraph.EVENT, {optional: true, nameLocked: true});
            return this.findInputSlot("onTrigger");
        }
        return trigS;
    }
    
    LGraphNode.prototype.addOnExecutedOutput = function(){
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS == -1){ //!trigS || 
            var output = this.addOutput("onExecuted", LiteGraph.ACTION, {optional: true, nameLocked: true});
            return this.findOutputSlot("onExecuted");
        }
        return trigS;
    }
    
    LGraphNode.prototype.onAfterExecuteNode = function(param, options){
        var trigS = this.findOutputSlot("onExecuted");
        if (trigS != -1){
            
            //console.debug(this.id+":"+this.order+" triggering slot onAfterExecute");
            //console.debug(param);
            //console.debug(options);
            this.triggerSlot(trigS, param, null, options);
            
        }
    }    
    
    LGraphNode.prototype.changeMode = function(modeTo){
        switch(modeTo){
            case LiteGraph.ON_EVENT:
                // this.addOnExecutedOutput();
                break;
                
            case LiteGraph.ON_TRIGGER:
                this.addOnTriggerInput();
                this.addOnExecutedOutput();
                break;
                
            case LiteGraph.NEVER:
                break;
                
            case LiteGraph.ALWAYS:
                break;
                
            case LiteGraph.ON_REQUEST:
                break;
            
            default:
                return false;
                break;
        }
        this.mode = modeTo;
        return true;
    };

    /**
     * Triggers the execution of actions that were deferred when the action was triggered
     * @method executePendingActions
     */    
    LGraphNode.prototype.executePendingActions = function() {
        if(!this._waiting_actions || !this._waiting_actions.length)
            return;
        for(var i = 0; i < this._waiting_actions.length;++i)
        {
            var p = this._waiting_actions[i];
            this.onAction(p[0],p[1],p[2],p[3],p[4]);
        }        
        this._waiting_actions.length = 0;
    }

    
    /**
     * Triggers the node code execution, place a boolean/counter to mark the node as being executed
     * @method doExecute
     * @param {*} param
     * @param {*} options
     */
    LGraphNode.prototype.doExecute = function(param, options) {
        options = options || {};
        if (this.onExecute){
            
            // enable this to give the event an ID
			if (!options.action_call) options.action_call = this.id+"_exec_"+Math.floor(Math.random()*9999);
            
            this.graph.nodes_executing[this.id] = true; //.push(this.id);

            this.onExecute(param, options);
            
            this.graph.nodes_executing[this.id] = false; //.pop();
            
            // save execution/action ref
            this.exec_version = this.graph.iteration;
            if(options && options.action_call){
                this.action_call = options.action_call; // if (param)
                this.graph.nodes_executedAction[this.id] = options.action_call;
            }
        }
        else {
        }
        this.execute_triggered = 2; // the nFrames it will be used (-- each step), means "how old" is the event
        if(this.onAfterExecuteNode) this.onAfterExecuteNode(param, options); // callback
    };
    
    /**
     * Triggers an action, wrapped by logics to control execution flow
     * @method actionDo
     * @param {String} action name
     * @param {*} param
     */
    LGraphNode.prototype.actionDo = function(action, param, options, action_slot ) {
        options = options || {};
        if (this.onAction){
            
			// enable this to give the event an ID
            if (!options.action_call) options.action_call = this.id+"_"+(action?action:"action")+"_"+Math.floor(Math.random()*9999);
            
            this.graph.nodes_actioning[this.id] = (action?action:"actioning"); //.push(this.id);
            
            this.onAction(action, param, options, action_slot);
            
            this.graph.nodes_actioning[this.id] = false; //.pop();
            
            // save execution/action ref
            if(options && options.action_call){
                this.action_call = options.action_call; // if (param)
                this.graph.nodes_executedAction[this.id] = options.action_call;
            }
        }
        this.action_triggered = 2; // the nFrames it will be used (-- each step), means "how old" is the event
        if(this.onAfterExecuteNode) this.onAfterExecuteNode(param, options);
    };
    
    /**
     * Triggers an event in this node, this will trigger any output with the same name
     * @method trigger
     * @param {String} event name ( "on_play", ... ) if action is equivalent to false then the event is send to all
     * @param {*} param
     */
    LGraphNode.prototype.trigger = function(action, param, options) {
        if (!this.outputs || !this.outputs.length) {
            return;
        }

        if (this.graph)
            this.graph._last_trigger_time = LiteGraph.getTime();

        for (var i = 0; i < this.outputs.length; ++i) {
            var output = this.outputs[i];
            if ( !output || output.type !== LiteGraph.EVENT || (action && output.name != action) )
                continue;
            this.triggerSlot(i, param, null, options);
        }
    };

    /**
     * Triggers a slot event in this node: cycle output slots and launch execute/action on connected nodes
     * @method triggerSlot
     * @param {Number} slot the index of the output slot
     * @param {*} param
     * @param {Number} link_id [optional] in case you want to trigger and specific output link in a slot
     */
    LGraphNode.prototype.triggerSlot = function(slot, param, link_id, options) {
        options = options || {};
        if (!this.outputs) {
            return;
        }

		if(slot == null)
		{
			console.error("slot must be a number");
			return;
		}

		if(slot.constructor !== Number)
			console.warn("slot must be a number, use node.trigger('name') if you want to use a string");

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
				// generate unique trigger ID if not present
				if (!options.action_call) options.action_call = this.id+"_trigg_"+Math.floor(Math.random()*9999);
                if (node.onExecute) {
                    // -- wrapping node.onExecute(param); --
                    node.doExecute(param, options);
                }
			}
			else if (node.onAction) {
                // generate unique action ID if not present
				if (!options.action_call) options.action_call = this.id+"_act_"+Math.floor(Math.random()*9999);
                //pass the action name
                var target_connection = node.inputs[link_info.target_slot];

                //instead of executing them now, it will be executed in the next graph loop, to ensure data flow
                if(LiteGraph.use_deferred_actions && node.onExecute)
                {
                    if(!node._waiting_actions)
                        node._waiting_actions = [];
                    node._waiting_actions.push([target_connection.name, param, options, link_info.target_slot]);
                }
                else
                {
                    // wrap node.onAction(target_connection.name, param);
                    node.actionDo( target_connection.name, param, options, link_info.target_slot );
                }
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
        var output = { name: name, type: type, links: null };
        if (extra_info) {
            for (var i in extra_info) {
                output[i] = extra_info[i];
            }
        }

        if (!this.outputs) {
            this.outputs = [];
        }
        this.outputs.push(output);
        if (this.onOutputAdded) {
            this.onOutputAdded(output);
        }
        
        if (LiteGraph.auto_load_slot_types) LiteGraph.registerNodeAndSlotType(this,type,true);
        
        this.setSize( this.computeSize() );
        this.setDirtyCanvas(true, true);
        return output;
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
            
            if (LiteGraph.auto_load_slot_types) LiteGraph.registerNodeAndSlotType(this,info[1],true);
            
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
        var input = { name: name, type: type, link: null };
        if (extra_info) {
            for (var i in extra_info) {
                input[i] = extra_info[i];
            }
        }

        if (!this.inputs) {
            this.inputs = [];
        }

        this.inputs.push(input);
        this.setSize( this.computeSize() );

        if (this.onInputAdded) {
            this.onInputAdded(input);
		}
        
        LiteGraph.registerNodeAndSlotType(this,type);

        this.setDirtyCanvas(true, true);
        return input;
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
            
            LiteGraph.registerNodeAndSlotType(this,info[1]);
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
     * @param {vec2} minHeight
     * @return {vec2} the total size
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
     * @method getBounding
     * @param out {Float32Array[4]?} [optional] a place to store the output, to free garbage
     * @param compute_outer {boolean?} [optional] set to true to include the shadow and connection points in the bounding calculation
     * @return {Float32Array[4]} the bounding box in format of [topleft_cornerx, topleft_cornery, width, height]
     */
    LGraphNode.prototype.getBounding = function(out, compute_outer) {
        out = out || new Float32Array(4);
        const nodePos = this.pos;
        const isCollapsed = this.flags.collapsed;
        const nodeSize = this.size;
        
        let left_offset = 0;
        // 1 offset due to how nodes are rendered
        let right_offset =  1 ;
        let top_offset = 0;
        let bottom_offset = 0;
        
        if (compute_outer) {
            // 4 offset for collapsed node connection points
            left_offset = 4;
            // 6 offset for right shadow and collapsed node connection points
            right_offset = 6 + left_offset;
            // 4 offset for collapsed nodes top connection points
            top_offset = 4;
            // 5 offset for bottom shadow and collapsed node connection points
            bottom_offset = 5 + top_offset;
        }
        
        out[0] = nodePos[0] - left_offset;
        out[1] = nodePos[1] - LiteGraph.NODE_TITLE_HEIGHT - top_offset;
        out[2] = isCollapsed ?
            (this._collapsed_width || LiteGraph.NODE_COLLAPSED_WIDTH) + right_offset :
            nodeSize[0] + right_offset;
        out[3] = isCollapsed ?
            LiteGraph.NODE_TITLE_HEIGHT + bottom_offset :
            nodeSize[1] + LiteGraph.NODE_TITLE_HEIGHT + bottom_offset;

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
            //if ( LiteGraph.distance([x,y], [this.pos[0] + this.size[0]*0.5, this.pos[1] + this.size[1]*0.5]) < LiteGraph.NODE_COLLAPSED_RADIUS)
            if (
                LiteGraph.isInsideRectangle(
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
                    LiteGraph.isInsideRectangle(
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
                    LiteGraph.isInsideRectangle(
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
     * @param {boolean} returnObj if the obj itself wanted
     * @return {number_or_object} the slot (-1 if not found)
     */
    LGraphNode.prototype.findInputSlot = function(name,  returnObj) {
        if (!this.inputs) {
            return -1;
        }
        for (var i = 0, l = this.inputs.length; i < l; ++i) {
            if (name == this.inputs[i].name) {
                return !returnObj ? i : this.inputs[i];
            }
        }
        return -1;
    };

    /**
     * returns the output slot with a given name (used for dynamic slots), -1 if not found
     * @method findOutputSlot
     * @param {string} name the name of the slot
     * @param {boolean} returnObj if the obj itself wanted
     * @return {number_or_object} the slot (-1 if not found)
     */
    LGraphNode.prototype.findOutputSlot = function(name, returnObj) {
        returnObj = returnObj || false;
        if (!this.outputs) {
            return -1;
        }
        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            if (name == this.outputs[i].name) {
                return !returnObj ? i : this.outputs[i];
            }
        }
        return -1;
    };
    
    // TODO refactor: USE SINGLE findInput/findOutput functions! :: merge options
    
    /**
     * returns the first free input slot
     * @method findInputSlotFree
     * @param {object} options
     * @return {number_or_object} the slot (-1 if not found)
     */
    LGraphNode.prototype.findInputSlotFree = function(optsIn) {
        var optsIn = optsIn || {};
        var optsDef = {returnObj: false
                        ,typesNotAccepted: []
                      };
        var opts = Object.assign(optsDef,optsIn);
        if (!this.inputs) {
            return -1;
        }
        for (var i = 0, l = this.inputs.length; i < l; ++i) {
            if (this.inputs[i].link && this.inputs[i].link != null) {
                continue;
            }
            if (opts.typesNotAccepted && opts.typesNotAccepted.includes && opts.typesNotAccepted.includes(this.inputs[i].type)){
                continue;
            }
            return !opts.returnObj ? i : this.inputs[i];
        }
        return -1;
    };

    /**
     * returns the first output slot free
     * @method findOutputSlotFree
     * @param {object} options
     * @return {number_or_object} the slot (-1 if not found)
     */
    LGraphNode.prototype.findOutputSlotFree = function(optsIn) {
        var optsIn = optsIn || {};
        var optsDef = { returnObj: false
                        ,typesNotAccepted: []
                      };
        var opts = Object.assign(optsDef,optsIn);
        if (!this.outputs) {
            return -1;
        }
        for (var i = 0, l = this.outputs.length; i < l; ++i) {
            if (this.outputs[i].links && this.outputs[i].links != null) {
                continue;
            }
            if (opts.typesNotAccepted && opts.typesNotAccepted.includes && opts.typesNotAccepted.includes(this.outputs[i].type)){
                continue;
            }
            return !opts.returnObj ? i : this.outputs[i];
        }
        return -1;
    };
    
    /**
     * findSlotByType for INPUTS
     */
    LGraphNode.prototype.findInputSlotByType = function(type, returnObj, preferFreeSlot, doNotUseOccupied) {
        return this.findSlotByType(true, type, returnObj, preferFreeSlot, doNotUseOccupied);
    };

    /**
     * findSlotByType for OUTPUTS
     */
    LGraphNode.prototype.findOutputSlotByType = function(type, returnObj, preferFreeSlot, doNotUseOccupied) {
        return this.findSlotByType(false, type, returnObj, preferFreeSlot, doNotUseOccupied);
    };
    
    /**
     * returns the output (or input) slot with a given type, -1 if not found
     * @method findSlotByType
     * @param {boolean} input uise inputs instead of outputs
     * @param {string} type the type of the slot
     * @param {boolean} returnObj if the obj itself wanted
     * @param {boolean} preferFreeSlot if we want a free slot (if not found, will return the first of the type anyway)
     * @return {number_or_object} the slot (-1 if not found)
     */
    LGraphNode.prototype.findSlotByType = function(input, type, returnObj, preferFreeSlot, doNotUseOccupied) {
        input = input || false;
        returnObj = returnObj || false;
        preferFreeSlot = preferFreeSlot || false;
        doNotUseOccupied = doNotUseOccupied || false;
        var aSlots = input ? this.inputs : this.outputs;
        if (!aSlots) {
            return -1;
        }
		// !! empty string type is considered 0, * !!
		if (type == "" || type == "*") type = 0; 
        for (var i = 0, l = aSlots.length; i < l; ++i) {
            var tFound = false;
            var aSource = (type+"").toLowerCase().split(",");
            var aDest = aSlots[i].type=="0"||aSlots[i].type=="*"?"0":aSlots[i].type;
			aDest = (aDest+"").toLowerCase().split(",");
            for(var sI=0;sI<aSource.length;sI++){
                for(var dI=0;dI<aDest.length;dI++){
					if (aSource[sI]=="_event_") aSource[sI] = LiteGraph.EVENT;
					if (aDest[sI]=="_event_") aDest[sI] = LiteGraph.EVENT;
					if (aSource[sI]=="*") aSource[sI] = 0;
					if (aDest[sI]=="*") aDest[sI] = 0;
					if (aSource[sI] == aDest[dI]) {
                        if (preferFreeSlot && aSlots[i].links && aSlots[i].links !== null) continue;
                        return !returnObj ? i : aSlots[i];
                    }
                }
            }
        }
        // if didnt find some, stop checking for free slots
        if (preferFreeSlot && !doNotUseOccupied){
            for (var i = 0, l = aSlots.length; i < l; ++i) {
                var tFound = false;
                var aSource = (type+"").toLowerCase().split(",");
                var aDest = aSlots[i].type=="0"||aSlots[i].type=="*"?"0":aSlots[i].type;
				aDest = (aDest+"").toLowerCase().split(",");
                for(var sI=0;sI<aSource.length;sI++){
                    for(var dI=0;dI<aDest.length;dI++){
						if (aSource[sI]=="*") aSource[sI] = 0;
						if (aDest[sI]=="*") aDest[sI] = 0;
                        if (aSource[sI] == aDest[dI]) {
                            return !returnObj ? i : aSlots[i];
                        }
                    }
                }
            }
        }
        return -1;
    };

    /**
     * connect this node output to the input of another node BY TYPE
     * @method connectByType
     * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} node the target node
     * @param {string} target_type the input slot type of the target node
     * @return {Object} the link_info is created, otherwise null
     */
    LGraphNode.prototype.connectByType = function(slot, target_node, target_slotType, optsIn) {
        var optsIn = optsIn || {};
        var optsDef = { createEventInCase: true
					   	,firstFreeIfOutputGeneralInCase: true
                        ,generalTypeInCase: true
                      };
        var opts = Object.assign(optsDef,optsIn);
        if (target_node && target_node.constructor === Number) {
            target_node = this.graph.getNodeById(target_node);
        }
        var target_slot = target_node.findInputSlotByType(target_slotType, false, true);
        if (target_slot >= 0 && target_slot !== null){
            //console.debug("CONNbyTYPE type "+target_slotType+" for "+target_slot)
            return this.connect(slot, target_node, target_slot);
        }else{
            //console.log("type "+target_slotType+" not found or not free?")
            if (opts.createEventInCase && target_slotType == LiteGraph.EVENT){
                // WILL CREATE THE onTrigger IN SLOT
				//console.debug("connect WILL CREATE THE onTrigger "+target_slotType+" to "+target_node);
                return this.connect(slot, target_node, -1);
            }
			// connect to the first general output slot if not found a specific type and 
            if (opts.generalTypeInCase){
                var target_slot = target_node.findInputSlotByType(0, false, true, true);
				//console.debug("connect TO a general type (*, 0), if not found the specific type ",target_slotType," to ",target_node,"RES_SLOT:",target_slot);
                if (target_slot >= 0){
                    return this.connect(slot, target_node, target_slot);
                }
            }
            // connect to the first free input slot if not found a specific type and this output is general
            if (opts.firstFreeIfOutputGeneralInCase && (target_slotType == 0 || target_slotType == "*" || target_slotType == "")){
                var target_slot = target_node.findInputSlotFree({typesNotAccepted: [LiteGraph.EVENT] });
				//console.debug("connect TO TheFirstFREE ",target_slotType," to ",target_node,"RES_SLOT:",target_slot);
                if (target_slot >= 0){
					return this.connect(slot, target_node, target_slot);
                }
            }
			
			console.debug("no way to connect type: ",target_slotType," to targetNODE ",target_node);
			//TODO filter
			
            return null;
        }
    }
    
    /**
     * connect this node input to the output of another node BY TYPE
     * @method connectByType
     * @param {number_or_string} slot (could be the number of the slot or the string with the name of the slot)
     * @param {LGraphNode} node the target node
     * @param {string} target_type the output slot type of the target node
     * @return {Object} the link_info is created, otherwise null
     */
    LGraphNode.prototype.connectByTypeOutput = function(slot, source_node, source_slotType, optsIn) {
        var optsIn = optsIn || {};
        var optsDef = { createEventInCase: true
                        ,firstFreeIfInputGeneralInCase: true
                        ,generalTypeInCase: true
                      };
        var opts = Object.assign(optsDef,optsIn);
        if (source_node && source_node.constructor === Number) {
            source_node = this.graph.getNodeById(source_node);
        }
        var source_slot = source_node.findOutputSlotByType(source_slotType, false, true);
        if (source_slot >= 0 && source_slot !== null){
            //console.debug("CONNbyTYPE OUT! type "+source_slotType+" for "+source_slot)
            return source_node.connect(source_slot, this, slot);
        }else{
            
            // connect to the first general output slot if not found a specific type and 
            if (opts.generalTypeInCase){
                var source_slot = source_node.findOutputSlotByType(0, false, true, true);
                if (source_slot >= 0){
                    return source_node.connect(source_slot, this, slot);
                }
            }
            
            if (opts.createEventInCase && source_slotType == LiteGraph.EVENT){
                // WILL CREATE THE onExecuted OUT SLOT
				if (LiteGraph.do_add_triggers_slots){
					var source_slot = source_node.addOnExecutedOutput();
					return source_node.connect(source_slot, this, slot);
				}
            }
            // connect to the first free output slot if not found a specific type and this input is general
            if (opts.firstFreeIfInputGeneralInCase && (source_slotType == 0 || source_slotType == "*" || source_slotType == "")){
                var source_slot = source_node.findOutputSlotFree({typesNotAccepted: [LiteGraph.EVENT] });
                if (source_slot >= 0){
                    return source_node.connect(source_slot, this, slot);
                }
            }
            
			console.debug("no way to connect byOUT type: ",source_slotType," to sourceNODE ",source_node);
			//TODO filter
			
            //console.log("type OUT! "+source_slotType+" not found or not free?")
            return null;
        }
    }
    
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
            
            if (LiteGraph.do_add_triggers_slots){
	            //search for first slot with event? :: NO this is done outside
				//console.log("Connect: Creating triggerEvent");
	            // force mode
	            target_node.changeMode(LiteGraph.ON_TRIGGER);
	            target_slot = target_node.findInputSlot("onTrigger");
        	}else{
            	return null; // -- break --
			}
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

        var input = target_node.inputs[target_slot];
        var link_info = null;
        var output = this.outputs[slot];
        
        if (!this.outputs[slot]){
            /*console.debug("Invalid slot passed: "+slot);
            console.debug(this.outputs);*/
            return null;
        }

        // allow target node to change slot
        if (target_node.onBeforeConnectInput) {
            // This way node can choose another slot (or make a new one?)
            target_slot = target_node.onBeforeConnectInput(target_slot); //callback
        }

		//check target_slot and check connection types
        if (target_slot===false || target_slot===null || !LiteGraph.isValidConnection(output.type, input.type))
		{
	        this.setDirtyCanvas(false, true);
			if(changed)
		        this.graph.connectionChange(this, link_info);
			return null;
		}else{
			//console.debug("valid connection",output.type, input.type);
		}

        //allows nodes to block connection, callback
        if (target_node.onConnectInput) {
            if ( target_node.onConnectInput(target_slot, output.type, output, this, slot) === false ) {
                return null;
            }
        }
        if (this.onConnectOutput) { // callback
            if ( this.onConnectOutput(slot, input.type, input, target_node, target_slot) === false ) {
                return null;
            }
        }

        //if there is something already plugged there, disconnect
        if (target_node.inputs[target_slot] && target_node.inputs[target_slot].link != null) {
			this.graph.beforeChange();
            target_node.disconnectInput(target_slot, {doProcessChange: false});
			changed = true;
        }
        if (output.links !== null && output.links.length){
            switch(output.type){
                case LiteGraph.EVENT:
                    if (!LiteGraph.allow_multi_output_for_events){
                        this.graph.beforeChange();
                        this.disconnectOutput(slot, false, {doProcessChange: false}); // Input(target_slot, {doProcessChange: false});
                        changed = true;
                    }
                break;
                default:
                break;
            }
        }

        var nextId
        if (LiteGraph.use_uuids)
            nextId = LiteGraph.uuidv4();
        else
            nextId = ++this.graph.last_link_id;
        
		//create link class
		link_info = new LLink(
			nextId,
			input.type || output.type,
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

    //****************************************

    //API *************************************************
    LiteGraph.compareObjects = function(a, b) {
        for (var i in a) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    };

    LiteGraph.distance = function(a, b) {
        return Math.sqrt(
            (b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])
        );
    };

    LiteGraph.colorToString = function(c) {
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
    };

    LiteGraph.isInsideRectangle = function(x, y, left, top, width, height) {
        if (left < x && left + width > x && top < y && top + height > y) {
            return true;
        }
        return false;
    };

    //[minx,miny,maxx,maxy]
    LiteGraph.growBounding = function(bounding, x, y) {
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
    };

    //point inside bounding box
    LiteGraph.isInsideBounding = function(p, bb) {
        if (
            p[0] < bb[0][0] ||
            p[1] < bb[0][1] ||
            p[0] > bb[1][0] ||
            p[1] > bb[1][1]
        ) {
            return false;
        }
        return true;
    };

    //bounding overlap, format: [ startx, starty, width, height ]
    LiteGraph.overlapBounding = function(a, b) {
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
    };

    //Convert a hex value to its decimal value - the inputted hex must be in the
    //	format of a hex triplet - the kind we use for HTML colours. The function
    //	will return an array with three values.
    LiteGraph.hex2num = function(hex) {
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
    };

    //Give a array with three values as the argument and the function will return
    //	the corresponding hex triplet.
    

    LiteGraph.num2hex = function(triplet) {
        var hex_alphabets = "0123456789ABCDEF";
        var hex = "#";
        var int1, int2;
        for (var i = 0; i < 3; i++) {
            int1 = triplet[i] / 16;
            int2 = triplet[i] % 16;

            hex += hex_alphabets.charAt(int1) + hex_alphabets.charAt(int2);
        }
        return hex;
    };

    /* LiteGraph GUI elements used for canvas editing *************************************/

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

	/* helper for interaction: pointer, touch, mouse Listeners
	used by LGraphCanvas DragAndScale ContextMenu*/
	LiteGraph.pointerListenerAdd = function(oDOM, sEvIn, fCall, capture=false) {
		if (!oDOM || !oDOM.addEventListener || !sEvIn || typeof fCall!=="function"){
			//console.log("cant pointerListenerAdd "+oDOM+", "+sEvent+", "+fCall);
			return; // -- break --
		}
		
		var sMethod = LiteGraph.pointerevents_method;
		var sEvent = sEvIn;
		
		// UNDER CONSTRUCTION
		// convert pointerevents to touch event when not available
		if (sMethod=="pointer" && !window.PointerEvent){ 
			console.warn("sMethod=='pointer' && !window.PointerEvent");
			console.log("Converting pointer["+sEvent+"] : down move up cancel enter TO touchstart touchmove touchend, etc ..");
			switch(sEvent){
				case "down":{
					sMethod = "touch";
					sEvent = "start";
					break;
				}
				case "move":{
					sMethod = "touch";
					//sEvent = "move";
					break;
				}
				case "up":{
					sMethod = "touch";
					sEvent = "end";
					break;
				}
				case "cancel":{
					sMethod = "touch";
					//sEvent = "cancel";
					break;
				}
				case "enter":{
					console.log("debug: Should I send a move event?"); // ???
					break;
				}
				// case "over": case "out": not used at now
				default:{
					console.warn("PointerEvent not available in this browser ? The event "+sEvent+" would not be called");
				}
			}
		}

		switch(sEvent){
			//both pointer and move events
			case "down": case "up": case "move": case "over": case "out": case "enter":
			{
				oDOM.addEventListener(sMethod+sEvent, fCall, capture);
			}
			// only pointerevents
			case "leave": case "cancel": case "gotpointercapture": case "lostpointercapture":
			{
				if (sMethod!="mouse"){
					return oDOM.addEventListener(sMethod+sEvent, fCall, capture);
				}
			}
			// not "pointer" || "mouse"
			default:
				return oDOM.addEventListener(sEvent, fCall, capture);
		}
	}
	LiteGraph.pointerListenerRemove = function(oDOM, sEvent, fCall, capture=false) {
		if (!oDOM || !oDOM.removeEventListener || !sEvent || typeof fCall!=="function"){
			//console.log("cant pointerListenerRemove "+oDOM+", "+sEvent+", "+fCall);
			return; // -- break --
		}
		switch(sEvent){
			//both pointer and move events
			case "down": case "up": case "move": case "over": case "out": case "enter":
			{
				if (LiteGraph.pointerevents_method=="pointer" || LiteGraph.pointerevents_method=="mouse"){
					oDOM.removeEventListener(LiteGraph.pointerevents_method+sEvent, fCall, capture);
				}
			}
			// only pointerevents
			case "leave": case "cancel": case "gotpointercapture": case "lostpointercapture":
			{
				if (LiteGraph.pointerevents_method=="pointer"){
					return oDOM.removeEventListener(LiteGraph.pointerevents_method+sEvent, fCall, capture);
				}
			}
			// not "pointer" || "mouse"
			default:
				return oDOM.removeEventListener(sEvent, fCall, capture);
		}
	}

    function clamp(v, a, b) {
        return a > v ? a : b < v ? b : v;
    };
    global.clamp = clamp;

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
    exports.LGraph = this.LGraph;
    exports.LLink = this.LLink;
    exports.LGraphNode = this.LGraphNode;
    exports.LGraphGroup = this.LGraphGroup;
    exports.DragAndScale = this.DragAndScale;
    exports.LGraphCanvas = this.LGraphCanvas;
    exports.ContextMenu = this.ContextMenu;
}

