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

//HTTP Request
function HTTPRequestNode() {
	var that = this;
	this.addInput("request", LiteGraph.ACTION);
	this.addInput("url", "string");
	this.addProperty("url", "");
	this.addOutput("ready", LiteGraph.EVENT);
    this.addOutput("data", "string");
	this.addWidget("button", "Fetch", null, this.fetch.bind(this));
	this._data = null;
	this._fetching = null;
}

HTTPRequestNode.title = "HTTP Request";
HTTPRequestNode.desc = "Fetch data through HTTP";

HTTPRequestNode.prototype.fetch = function()
{
	var url = this.properties.url;
	if(!url)
		return;

	this.boxcolor = "#FF0";
	var that = this;
	this._fetching = fetch(url)
	.then(resp=>{
		if(!resp.ok)
		{
			this.boxcolor = "#F00";
			that.trigger("error");
		}
		else
		{
			this.boxcolor = "#0F0";
			return resp.text();
		}
	})
	.then(data=>{
		that._data = data;
		that._fetching = null;
		that.trigger("ready");
	});
}

HTTPRequestNode.prototype.onAction = function(evt)
{
	if(evt == "request")
		this.fetch();
}

HTTPRequestNode.prototype.onExecute = function() {
	this.setOutputData(1, this._data);
};

HTTPRequestNode.prototype.onGetOutputs = function() {
	return [["error",LiteGraph.EVENT]];
}

LiteGraph.registerNodeType("network/httprequest", HTTPRequestNode);


	
})(this);
