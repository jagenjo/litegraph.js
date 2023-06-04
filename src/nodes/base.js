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

    Subgraph.prototype.onDrawBackground = function (ctx, graphcanvas, canvas, pos) {
        if (this.flags.collapsed)
            return;
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        // button
        var over = LiteGraph.isInsideRectangle(pos[0], pos[1], this.pos[0], this.pos[1] + y, this.size[0], LiteGraph.NODE_TITLE_HEIGHT);
        let overleft = LiteGraph.isInsideRectangle(pos[0], pos[1], this.pos[0], this.pos[1] + y, this.size[0] / 2, LiteGraph.NODE_TITLE_HEIGHT)
        ctx.fillStyle = over ? "#555" : "#222";
        ctx.beginPath();
        if (this._shape == LiteGraph.BOX_SHAPE) {
            if (overleft) {
                ctx.rect(0, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT);
            } else {
                ctx.rect(this.size[0] / 2, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT);
            }
        }
        else {
            if (overleft) {
                ctx.roundRect(0, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT, [0,0, 8,8]);
            } else {
                ctx.roundRect(this.size[0] / 2, y, this.size[0] / 2 + 1, LiteGraph.NODE_TITLE_HEIGHT, [0,0, 8,8]);
            }
        }
        if (over) {
            ctx.fill();
        } else {
            ctx.fillRect(0, y, this.size[0] + 1, LiteGraph.NODE_TITLE_HEIGHT);
        }
        // button
        ctx.textAlign = "center";
        ctx.font = "24px Arial";
        ctx.fillStyle = over ? "#DDD" : "#999";
        ctx.fillText("+", this.size[0] * 0.25, y + 24);
        ctx.fillText("+", this.size[0] * 0.75, y + 24);
    }

    // Subgraph.prototype.onMouseDown = function(e, localpos, graphcanvas)
    // {
    // 	var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
    // 	if(localpos[1] > y)
    // 	{
    // 		graphcanvas.showSubgraphPropertiesDialog(this);
    // 	}
    // }
    Subgraph.prototype.onMouseDown = function (e, localpos, graphcanvas) {
        var y = this.size[1] - LiteGraph.NODE_TITLE_HEIGHT + 0.5;
        console.log(0)
        if (localpos[1] > y) {
            if (localpos[0] < this.size[0] / 2) {
                console.log(1)
                graphcanvas.showSubgraphPropertiesDialog(this);
            } else {
                console.log(2)
                graphcanvas.showSubgraphPropertiesDialogRight(this);
            }
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
        var slot = this.findOutputSlot(name);
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

    Subgraph.prototype.reassignSubgraphUUIDs = function(graph) {
        const idMap = { nodeIDs: {}, linkIDs: {} }

        for (const node of graph.nodes) {
            const oldID = node.id
            const newID = LiteGraph.uuidv4()
            node.id = newID

            if (idMap.nodeIDs[oldID] || idMap.nodeIDs[newID]) {
                throw new Error(`New/old node UUID wasn't unique in changed map! ${oldID} ${newID}`)
            }

            idMap.nodeIDs[oldID] = newID
            idMap.nodeIDs[newID] = oldID
        }

        for (const link of graph.links) {
            const oldID = link[0]
            const newID = LiteGraph.uuidv4();
            link[0] = newID

            if (idMap.linkIDs[oldID] || idMap.linkIDs[newID]) {
                throw new Error(`New/old link UUID wasn't unique in changed map! ${oldID} ${newID}`)
            }

            idMap.linkIDs[oldID] = newID
            idMap.linkIDs[newID] = oldID

            const nodeFrom = link[1]
            const nodeTo = link[3]

            if (!idMap.nodeIDs[nodeFrom]) {
                throw new Error(`Old node UUID not found in mapping! ${nodeFrom}`)
            }

            link[1] = idMap.nodeIDs[nodeFrom]

            if (!idMap.nodeIDs[nodeTo]) {
                throw new Error(`Old node UUID not found in mapping! ${nodeTo}`)
            }

            link[3] = idMap.nodeIDs[nodeTo]
        }

        // Reconnect links
        for (const node of graph.nodes) {
            if (node.inputs) {
                for (const input of node.inputs) {
                    if (input.link) {
                        input.link = idMap.linkIDs[input.link]
                    }
                }
            }
            if (node.outputs) {
                for (const output of node.outputs) {
                    if (output.links) {
                        output.links = output.links.map(l => idMap.linkIDs[l]);
                    }
                }
            }
        }

        // Recurse!
        for (const node of graph.nodes) {
            if (node.type === "graph/subgraph") {
                const merge = reassignGraphUUIDs(node.subgraph);
                idMap.nodeIDs.assign(merge.nodeIDs)
                idMap.linkIDs.assign(merge.linkIDs)
            }
        }
    };

    Subgraph.prototype.clone = function() {
        var node = LiteGraph.createNode(this.type);
        var data = this.serialize();

        if (LiteGraph.use_uuids) {
            // LGraph.serialize() seems to reuse objects in the original graph. But we
            // need to change node IDs here, so clone it first.
            const subgraph = LiteGraph.cloneObject(data.subgraph)

            this.reassignSubgraphUUIDs(subgraph);

            data.subgraph = subgraph;
        }

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
        this.properties = { name: "", type: "" };
        var that = this;

        // Object.defineProperty(this.properties, "name", {
        //     get: function() {
        //         return that.name_in_graph;
        //     },
        //     set: function(v) {
        //         if (v == "" || v == that.name_in_graph) {
        //             return;
        //         }
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.renameOutput(that.name_in_graph, v);
        //         } else {
        //             that.graph.addOutput(v, that.properties.type);
        //         }
        //         that.name_widget.value = v;
        //         that.name_in_graph = v;
        //     },
        //     enumerable: true
        // });

        // Object.defineProperty(this.properties, "type", {
        //     get: function() {
        //         return that.inputs[0].type;
        //     },
        //     set: function(v) {
        //         if (v == "action" || v == "event") {
        //             v = LiteGraph.ACTION;
        //         }
		//         if (!LiteGraph.isValidConnection(that.inputs[0].type,v))
		// 			that.disconnectInput(0);
        //         that.inputs[0].type = v;
        //         if (that.name_in_graph) {
        //             //already added
        //             that.graph.changeOutputType(
        //                 that.name_in_graph,
        //                 that.inputs[0].type
        //             );
        //         }
        //         that.type_widget.value = v || "";
        //     },
        //     enumerable: true
        // });

        this.name_widget = this.addWidget("text","Name",this.properties.name,"name");
        this.type_widget = this.addWidget("text","Type",this.properties.type,"type");
        this.widgets_up = true;
        this.size = [180, 60];
    }

    GraphOutput.title = "Output";
    GraphOutput.desc = "Output of the graph";

    GraphOutput.prototype.onPropertyChanged = function (name, v) {
        if (name == "name") {
            if (v == "" || v == this.name_in_graph || v == "enabled") {
                return false;
            }
            if (this.graph) {
                if (this.name_in_graph) {
                    //already added
                    this.graph.renameOutput(this.name_in_graph, v);
                } else {
                    this.graph.addOutput(v, this.properties.type);
                }
            } //what if not?!
            this.name_widget.value = v;
            this.name_in_graph = v;
        }
        else if (name == "type") {
            this.updateType();
        }
        else if (name == "value") {
        }
    }
     
    GraphOutput.prototype.updateType = function () {
        var type = this.properties.type;
        if (this.type_widget)
            this.type_widget.value = type;

        //update output
        if (this.inputs[0].type != type) {

			if ( type == "action" || type == "event")
	            type = LiteGraph.EVENT;
			if (!LiteGraph.isValidConnection(this.inputs[0].type, type))
				this.disconnectInput(0);
			this.inputs[0].type = type;
        }

        //update graph
        if (this.graph && this.name_in_graph) {
            this.graph.changeOutputType(this.name_in_graph, type);
        }
    }



    GraphOutput.prototype.onExecute = function() {
        this._value = this.getInputData(0);
        this.graph.setOutputData(this.properties.name, this._value);
    };

    GraphOutput.prototype.onAction = function(action, param) {
        if (this.properties.type == LiteGraph.ACTION) {
            this.graph.trigger( this.properties.name, param );
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
        this.addOutput("bool", "boolean");
        this.addProperty("value", true);
        this.widget = this.addWidget("toggle","value",true,"value");
        this.serialize_widgets = true;
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
        this.addOutput("string", "string");
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

    function ConstantObject() {
        this.addOutput("obj", "object");
        this.size = [120, 30];
		this._object = {};
    }

    ConstantObject.title = "Const Object";
    ConstantObject.desc = "Constant Object";

    ConstantObject.prototype.onExecute = function() {
        this.setOutputData(0, this._object);
    };

    LiteGraph.registerNodeType( "basic/object", ConstantObject );

    function ConstantFile() {
        this.addInput("url", "string");
        this.addOutput("file", "string");
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
        this.addOutput("data", "object");
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
		this._value = [];
        this.addInput("json", "");
        this.addOutput("arrayOut", "array");
		this.addOutput("length", "number");
        this.addProperty("value", "[]");
        this.widget = this.addWidget("text","array",this.properties.value,"value");
        this.widgets_up = true;
        this.size = [140, 50];
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

	function SetArray()
	{
        this.addInput("arr", "array");
        this.addInput("value", "");
        this.addOutput("arr", "array");
		this.properties = { index: 0 };
        this.widget = this.addWidget("number","i",this.properties.index,"index",{precision: 0, step: 10, min: 0});
	}

    SetArray.title = "Set Array";
    SetArray.desc = "Sets index of array";

    SetArray.prototype.onExecute = function() {
        var arr = this.getInputData(0);
		if(!arr)
			return;
        var v = this.getInputData(1);
		if(v === undefined )
			return;
		if(this.properties.index)
			arr[ Math.floor(this.properties.index) ] = v;
		this.setOutputData(0,arr);
    };

    LiteGraph.registerNodeType("basic/set_array", SetArray );

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
        this.addInput("obj", "object");
        this.addOutput("property", 0);
        this.addProperty("value", 0);
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


	function SetObject()
	{
        this.addInput("obj", "");
        this.addInput("value", "");
        this.addOutput("obj", "");
		this.properties = { property: "" };
        this.name_widget = this.addWidget("text","prop.",this.properties.property,"property");
	}

    SetObject.title = "Set Object";
    SetObject.desc = "Adds propertiesrty to object";

    SetObject.prototype.onExecute = function() {
        var obj = this.getInputData(0);
		if(!obj)
			return;
        var v = this.getInputData(1);
		if(v === undefined )
			return;
		if(this.properties.property)
			obj[ this.properties.property ] = v;
		this.setOutputData(0,obj);
    };

    LiteGraph.registerNodeType("basic/set_object", SetObject );


    function MergeObjects() {
        this.addInput("A", "object");
        this.addInput("B", "object");
        this.addOutput("out", "object");
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

    function length(v) {
        if(v && v.length != null)
			return Number(v.length);
		return 0;
    }

    LiteGraph.wrapFunctionAsNode(
        "basic/not",
        function(a){ return !a; },
        [""],
        "boolean"
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
        // param is the action
        var msg = this.getInputData(1); //getInputDataByName("msg");
        //if (msg == null || typeof msg == "undefined") return;
        if (!msg) msg = this.properties.msg;
        if (!msg) msg = "Event: "+param; // msg is undefined if the slot is lost?
        if (action == "log") {
            console.log(msg);
        } else if (action == "warn") {
            console.warn(msg);
        } else if (action == "error") {
            console.error(msg);
        }
    };

    Console.prototype.onExecute = function() {
        var msg = this.getInputData(1); //getInputDataByName("msg");
        if (!msg) msg = this.properties.msg;
        if (msg != null && typeof msg != "undefined") {
            this.properties.msg = msg;
            console.log(msg);
        }
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
        this.widget = this.addWidget("text", "Text", "", "msg");
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
        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("out", 0);

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
    NodeScript.desc = "executes a code (max 256 characters)";

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
    
    
    function GenericCompare() {
        this.addInput("A", 0);
        this.addInput("B", 0);
        this.addOutput("true", "boolean");
        this.addOutput("false", "boolean");
        this.addProperty("A", 1);
        this.addProperty("B", 1);
        this.addProperty("OP", "==", "enum", { values: GenericCompare.values });
		this.addWidget("combo","Op.",this.properties.OP,{ property: "OP", values: GenericCompare.values } );

        this.size = [80, 60];
    }

    GenericCompare.values = ["==", "!="]; //[">", "<", "==", "!=", "<=", ">=", "||", "&&" ];
    GenericCompare["@OP"] = {
        type: "enum",
        title: "operation",
        values: GenericCompare.values
    };

    GenericCompare.title = "Compare *";
    GenericCompare.desc = "evaluates condition between A and B";

    GenericCompare.prototype.getTitle = function() {
        return "*A " + this.properties.OP + " *B";
    };

    GenericCompare.prototype.onExecute = function() {
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

        var result = false;
        if (typeof A == typeof B){
            switch (this.properties.OP) {
                case "==":
                case "!=":
                    // traverse both objects.. consider that this is not a true deep check! consider underscore or other library for thath :: _isEqual()
                    result = true;
                    switch(typeof A){
                        case "object":
                            var aProps = Object.getOwnPropertyNames(A);
                            var bProps = Object.getOwnPropertyNames(B);
                            if (aProps.length != bProps.length){
                                result = false;
                                break;
                            }
                            for (var i = 0; i < aProps.length; i++) {
                                var propName = aProps[i];
                                if (A[propName] !== B[propName]) {
                                    result = false;
                                    break;
                                }
                            }
                        break;
                        default:
                            result = A == B;
                    }
                    if (this.properties.OP == "!=") result = !result;
                    break;
                /*case ">":
                    result = A > B;
                    break;
                case "<":
                    result = A < B;
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
                    break;*/
            }
        }
        this.setOutputData(0, result);
        this.setOutputData(1, !result);
    };

    LiteGraph.registerNodeType("basic/CompareValues", GenericCompare);
    
})(this);
