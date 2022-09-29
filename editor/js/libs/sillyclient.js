//SillyClient.js allows to connect to SillyServer.js, more info in https://github.com/jagenjo/SillyServer.js/
//Javi Agenjo 2015

function SillyClient()
{
	this.url = "";
	this.socket = null;
	this.is_connected = false;
	this.room = { name: "", clients:[], updated: false };
	this.clients = {};
	this.num_clients = 0;
	this.info_transmitted = 0;
	this.info_received = 0;

	this.feedback = false; //if you want message to bounce back to you

	this.user_id = 0;
	this.user_name = "anonymous";

	this.on_connect = null; //when connected
	this.on_ready = null; //when we have an ID from the server
	this.on_message = null; //when somebody sends a message
	this.on_close = null; //when the server closes
	this.on_user_connected = null; //new user connected
	this.on_user_disconnected = null; //user leaves
	this.on_error = null; //when cannot connect
}

SillyClient.verbose = false;

//Connects to server, you must specify server host (p.e: "tamats.com:55000") and room name
SillyClient.prototype.connect = function( url, room_name, on_connect, on_message, on_close )
{
	room_name = room_name || "";
	var that = this;
	this.url = url;
	if(!url)
		throw("You must specify the server URL of the SillyServer");

	if(this.socket)
	{
		this.socket.onmessage = null;
		this.socket.onclose = null;
		this.socket.close();
	}
	this.clients = {};

	if(typeof(WebSocket) == "undefined")
		WebSocket = window.MozWebSocket;
	if(typeof(WebSocket) == "undefined")
	{
		alert("Websockets not supported by your browser, consider switching to the latest version of Firefox, Chrome or Safari.");
		return;
	}

	var params = "";
	if(this.feedback)
		params = "?feedback=1";

	var protocol = "";
	if( url.substr(0,3) != "ws:" && url.substr(0,4) != "wss:" )
	{
		protocol = location.protocol == "http:" ? "ws://" : "wss://"; //default protocol
	}

	var final_url = this._final_url = protocol + url + "/" + room_name + params;

	//connect
	this.socket = new WebSocket( final_url );
	this.socket.binaryType = "arraybuffer";
	this.socket.onopen = function(){  
		that.is_connected = true;
		that.room = { 
			name: room_name,
			clients: []
		};
		if(SillyClient.verbose)
			console.log("SillyClient socket opened");  
		if(on_connect && typeof(on_connect) == "function" )
			on_connect();
		if(that.on_connect)
			that.on_connect(that);
	}

	this.socket.onclose = function(e) {
		if(SillyClient.verbose)
			console.log("SillyClient socket has been closed: ", e); 
		if(that.socket != this)
			return;
		if(on_close)
			on_close();
		if(that.on_close)
			that.on_close( e );
		that.socket = null;
		that.room = null;
		that.is_connected = false;
	};

	this.socket.onmessage = function(msg){  
		if(that.socket != this)
			return;

		that.info_received += 1;

		if( msg.data.constructor === ArrayBuffer )
		{
			var buffer = msg.data;
			processArrayBuffer( buffer );
		}
		else if( msg.data.constructor === String )
		{
			var tokens = msg.data.split("|"); //author id | cmd | data
			if(tokens.length < 3)
			{
				if(SillyClient.verbose)
					console.log("Received: " + msg.data); //Awesome!  
			}
			else
				that.onServerEvent( tokens[0], tokens[1], msg.data.substr( tokens[0].length + tokens[1].length + 2, msg.data.length), on_message );
		}
		else
			console.warn("Unknown message type");
	}

	function processArrayBuffer( buffer )
	{
		var buffer_array = new Uint8Array( buffer );
		var header = buffer_array.subarray(0,32);
		var data = buffer.slice(32);
		var header_str = SillyClient.arrayToString( new Uint8Array(header) );
		var tokens = header_str.split("|"); //author id | cmd | data
		//author_id, cmd, data, on_message
		that.onServerEvent( tokens[0], tokens[1], data, on_message );
	}

	this.socket.onerror = function(err){  
		console.log("error: ", err );
		if(that.on_error)
			that.on_error(err);
	}

	return true;
}

SillyClient.arrayToString = function(array)
{
	var str = "";
	for(var i = 0; i < array.length; i++)
		str += String.fromCharCode(array[i]);
	return str;
}

//Close the connection with the server
SillyClient.prototype.close = function()
{
	if(!this.socket)
		return;

	this.socket.close();
	this.socket = null;
	this.clients = {};
	this.is_connected = false;
}

//Process events 
SillyClient.prototype.onServerEvent = function( author_id, cmd, data, on_message )
{
	if (cmd == "MSG" || cmd == "DATA") //user message received
	{
		if(on_message)
			on_message( author_id, data );
		if(this.on_message)
			this.on_message( author_id, data );
	}
	else if (cmd == "LOGIN") //new user entering
	{
		if(SillyClient.verbose)
			console.log("User connected: " + data);
		var name = "user_" + author_id.toString(); 
		if(!this.clients[ author_id ])
		{
			this.clients[ author_id ] = { id: author_id, name: name };
			this.num_clients += 1;
		}
		if(author_id != this.user_id)
		{
			if(this.on_user_connected) //somebody else is connected
				this.on_user_connected( author_id, data );
		}
	}
	else if (cmd == "LOGOUT") //user leaving
	{
		if(this.clients[author_id])
		{
			if(SillyClient.verbose)
				console.log("User disconnected: " + this.clients[ author_id ].name );
			delete this.clients[ author_id ];
			this.num_clients -= 1;
		}

		if(this.on_user_disconnected) //somebody else is connected
			this.on_user_disconnected( author_id );
		var pos = this.room.clients.indexOf( author_id );
		if(pos != -1)
			this.room.clients.splice( pos, 1 );
	}
	else if (cmd == "ID") //retrieve your user id
	{
		this.user_id = author_id;
		this.user_name = "user_" + author_id.toString(); 
		this.clients[ author_id ] = { id: author_id, name: this.user_name };
		if(this.on_ready)
			this.on_ready( author_id );
	}
	else if (cmd == "INFO") //retrieve room info
	{
		var room_info = JSON.parse( data );
		this.room = room_info;
		this.num_clients = room_info.clients.length;
		for(var i = 0; i < room_info.clients.length; ++i)
		{
			var client_id = room_info.clients[i];
			this.clients[ client_id ] = { id: client_id, name: "user_" + client_id };
		}

		if(this.on_room_info)
			this.on_room_info( room_info );
	}
}

//target_ids is optional, if not specified the message is send to all
SillyClient.prototype.sendMessage = function( msg, target_ids )
{
	if(msg === null)
		return;

	if(msg.constructor === Object)
		msg = JSON.stringify(msg);

	if(!this.socket || this.socket.readyState !== WebSocket.OPEN)
	{
		console.error("Not connected, cannot send info");
		return;
	}

	//pack target info
	if( target_ids )
	{
		var target_str = "@" + (target_ids.constructor === Array ? target_ids.join(",") : target_ids) + "|";
		if(msg.constructor === String)
			msg = target_str + msg;
		else
			throw("targeted not supported in binary messages");
	}

	this.socket.send(msg);
	this.info_transmitted += 1;
}

SillyClient.prototype.getBaseURL = function()
{
	var url = this.url;
	var protocol = location.protocol + "//";
	if( url.indexOf("wss://") != -1)
	{
		protocol = "https://";
		url = url.substr(6);
	}
	var index = url.indexOf("/");
	var host = url.substr(0,index);
	return protocol + host;
}

//To store temporal information in the server
SillyClient.prototype.storeData = function(key, value, on_complete)
{
	if(!this.url)
		throw("Cannot storeData if not connected to the server");
	var req = new XMLHttpRequest();
	var base_url = this.getBaseURL();
	req.open('GET', base_url + "/data?action=set&key="+key + ((value !== undefined && value !== null) ? "&value="+value : ""), true);
	req.onreadystatechange = function (aEvt) {
	  if (req.readyState == 4) {
		 if(req.status != 200)
			return console.error("Error setting data: ", req.responseText );
		 if(on_complete)
			 on_complete( JSON.parse(req.responseText) );
	  }
	};
	req.send(null);
}

//To retrieve the temporal information from the server
SillyClient.prototype.loadData = function(key, on_complete)
{
	if(!this.url)
		throw("Cannot loadData if not connected to the server");
	var req = new XMLHttpRequest();
	var base_url = this.getBaseURL();
	req.open('GET', base_url + "/data?action=get&key="+key, true);
	req.onreadystatechange = function (aEvt) {
	  if (req.readyState == 4) {
		 if(req.status != 200)
			return console.error("Error setting data: ", req.responseText );
		 var resp = JSON.parse(req.responseText);
		 if(on_complete)
			 on_complete( resp.data );
	  }
	};
	req.send(null);
}

//Returns a report with information about clients connected and rooms open
SillyClient.prototype.getReport = function( on_complete )
{
	var req = new XMLHttpRequest();
	var base_url = this.getBaseURL();
	req.open('GET', base_url + "/info", true);
	req.onreadystatechange = function (aEvt) {
	  if (req.readyState == 4) {
		 if(req.status != 200)
			return console.error("Error getting report: ", req.responseText );
		 var resp = JSON.parse(req.responseText);
		 if(on_complete)
			 on_complete( resp );
	  }
	};
	req.send(null);
}

//Returns a report with information about clients connected and rooms open
SillyClient.getReport = function( url, on_complete )
{
	var req = new XMLHttpRequest();
	var protocol = location.protocol + "//";
	if( url.indexOf("wss://") != -1)
	{
		protocol = "https://";
		url = url.substr(6);
	}
	var index = url.indexOf("/");
	var host = url.substr(0,index);
	req.open('GET', protocol + host + "/info", true);
	req.onreadystatechange = function (aEvt) {
	  if (req.readyState == 4) {
		 if(req.status != 200)
			return console.error("Error getting report: ", req.responseText );
		 var resp = JSON.parse(req.responseText);
		 if(on_complete)
			 on_complete( resp );
	  }
	};
	req.send(null);
}


//Returns info about a room (which clients are connected now)
SillyClient.prototype.getRoomInfo = function( name, on_complete )
{
	var req = new XMLHttpRequest();
	var base_url = this.getBaseURL();
	req.open('GET', base_url + "/room/" + name, true);
	req.onreadystatechange = function (aEvt) {
	  if (req.readyState == 4) {
		 if(req.status != 200)
			return console.error("Error getting room info: ", req.responseText );
		 var resp = JSON.parse(req.responseText);
		 if(on_complete)
			 on_complete( resp.data );
	  }
	};
	req.send(null);
}

//Returns a list with all the open rooms that start with txt (txt must be at least 6 characters long)
SillyClient.prototype.findRooms = function( name_str, on_complete )
{
	name_str = name_str || "";
	var req = new XMLHttpRequest();
	var base_url = this.getBaseURL();
	req.open('GET', base_url + "/find?name=" + name_str, true);
	req.onreadystatechange = function (aEvt) {
	  if (req.readyState == 4) {
		 if(req.status != 200)
			return console.error("Error getting room info: ", req.responseText );
		 var resp = JSON.parse(req.responseText);
		 if(on_complete)
			 on_complete( resp.data );
	  }
	};
	req.send(null);
}