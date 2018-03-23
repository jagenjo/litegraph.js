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