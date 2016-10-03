//not tested nor finished

(function( global )
{

function LGAudio()
{
	this.properties = {
		src: "demodata/audio.wav",
		gain: 0.5,
		loop: true
	};

	this._loading_audio = false;
	this._audio_buffer = null;
	this._audionodes = [];

	this.addOutput( "out", "audio" );
	this.addInput( "gain", "number" );

	//init context
	var context = LGAudio.getAudioContext();

	//create gain node
	this.audionode = context.createGain();
	this.audionode.graphnode = this;
	this.audionode.gain.value = this.properties.gain;

	//debug
	if(this.properties.src)
		this.loadSound( this.properties.src );
}

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
	if(this._audio_context.state == "suspended")
		this._audio_context.resume();
	return this._audio_context;
}

LGAudio.connect = function( audionodeA, audionodeB )
{
	audionodeA.connect( audionodeB );

	/*
	if(!nodeA.outputs)
		nodeA.outputs = [];
	nodeA.outputs.push( nodeB );
	if(!nodeB.inputs)
		nodeB.inputs = [];
	nodeB.inputs.push( nodeA );
	*/
}

LGAudio.disconnect = function( audionodeA, audionodeB )
{
	audionodeA.disconnect( audionodeB );

	/*
	if(nodeA.outputs)
	{
		var index = nodeA.outputs.indexOf( nodeB );
		if(index != -1)
			nodeA.outputs.splice(index,1);
	}
	if(nodeB.inputs)
	{
		var index = nodeB.inputs.indexOf( nodeA );
		if(index != -1)
			nodeB.inputs.splice(index,1);
	}
	*/
}

LGAudio.prototype.onAdded = function(graph)
{
	if(graph.status === LGraph.STATUS_RUNNING)
		this.onStart();
}

LGAudio.prototype.onStart = function()
{
	if(!this._audio_buffer)
		return;

	this.playBuffer( this._audio_buffer );
}

LGAudio.prototype.onStop = function()
{
	this.stopAllSounds();
}

LGAudio.prototype.onRemoved = function()
{
	this.stopAllSounds();
}

LGAudio.prototype.stopAllSounds = function()
{
	//iterate and stop
	for(var i = 0; i < this._audionodes.length; ++i )
	{
		this._audionodes[i].stop();
		//this._audionodes[i].disconnect( this.audionode );
	}
	this._audionodes.length = 0;
}

LGAudio.prototype.onExecute = function()
{
	var v = this.getInputData(0);
	if( v !== undefined )
		this.audionode.gain.value = v;
}

LGAudio.prototype.onAction = function(event)
{
	if(this._audio_buffer)
	{
		if(event == "Play")
			this.playBuffer(this._audio_buffer);
		else if(event == "Stop")
			this.stopAllSounds();
	}
}

LGAudio.prototype.onPropertyChanged = function( name, value )
{
	if( name == "src" ) 
		this.loadSound( value );
	else if(name == "gain")
		this.audionode.gain.value = value;
}

LGAudio.prototype.playBuffer = function( buffer )
{
	var that = this;
	var context = LGAudio.getAudioContext();

	//create a new audionode (this is mandatory, AudioAPI doesnt like to reuse old ones)
	var audionode = context.createBufferSource(); //create a AudioBufferSourceNode
	audionode.graphnode = this;
	audionode.buffer = buffer;
	audionode.loop = this.properties.loop;
	this._audionodes.push( audionode );
	audionode.connect( this.audionode ); //connect to gain
	this._audionodes.push( audionode );

	audionode.onended = function()
	{
		console.log("ended!");
		that.trigger("ended");
		//remove
		var index = that._audionodes.indexOf( audionode );
		if(index != -1)
			that._audionodes.splice(index,1);
	}

	audionode.start();
	return audionode;
}

LGAudio.prototype.onConnectionsChange = function( connection, slot, connected, link_info )
{
	//only process the outputs events
	if(connection != LiteGraph.OUTPUT)
		return;

	var target_node = null;
	if( link_info )
		target_node = this.graph.getNodeById( link_info.target_id );

	if( !target_node )
		return;

	if( connected )	
	{
		if(target_node.connectAudioToSlot)
			target_node.connectAudioToSlot( this.audionode, link_info.target_slot );
		else
			LGAudio.connect( this.audionode, target_node.audionode );
	}
	else
	{
		if(target_node.disconnectAudioFromSlot)
			target_node.disconnectAudioFromSlot( this.audionode, link_info.target_slot );
		else
			LGAudio.disconnect( this.audionode, target_node.audionode );
	}
}

LGAudio.prototype.loadSound = function( url )
{
	var that = this;

	//kill previous load
	if(this._request)
	{
		this._request.abort();
		this._request = null;
	}

	this._audio_buffer = null;
	this._loading_audio = false;

	if(!url)
		return;

	//load new sample
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';
	this._loading_audio = true;
	this._request = request;

	var context = LGAudio.getAudioContext();

	// Decode asynchronously
	request.onload = function() {
		context.decodeAudioData( request.response, function(buffer) {
			that._audio_buffer = buffer;
			that._loading_audio = false;
			//if is playing, then play it
			if(that.graph && that.graph.status === LGraph.STATUS_RUNNING)
				that.onStart();
		}, onError);
	}
	request.send();

	function onError(err)
	{
		console.log("Audio loading sample error:",err);
	}
}

LGAudio.prototype.onGetInputs = function()
{
	return [["Play",LiteGraph.ACTION],["Stop",LiteGraph.ACTION]];
}

LGAudio.prototype.onGetOutputs = function()
{
	return [["ended",LiteGraph.EVENT]];
}


LGAudio.title = "Source";
LGAudio.desc = "Plays audio";
LiteGraph.registerNodeType("audio/source", LGAudio);
global.LGAudio = LGAudio;

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
	this.addOutput("freqs","FFT");
	//this.addOutput("time","freq");

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

	//properties
	for(var i = 1; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
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


LGAudioAnalyser.title = "Analyser";
LGAudioAnalyser.desc = "Audio Analyser";
LiteGraph.registerNodeType( "audio/analyser", LGAudioAnalyser );



//*****************************************************

//this function helps creating wrappers to existing classes
function createAudioNodeWrapper( class_object )
{
	class_object.prototype.onPropertyChanged = function(name, value)
	{
		if( this.audionode[ name ] === undefined )
			return;

		if( this.audionode[ name ].value !== undefined )
			this.audionode[ name ].value = value;
		else
			this.audionode[ name ] = value;
	}

	class_object.prototype.onConnectionsChange = function( connection, slot, connected, link_info )
	{
		//only process the outputs events
		if(connection != LiteGraph.OUTPUT)
			return;

		var target_node = null;
		if( link_info )
			target_node = this.graph.getNodeById( link_info.target_id );
		if( !target_node )
			return;

		if( connected )	
		{
			if(target_node.connectAudioToSlot)
				target_node.connectAudioToSlot( this.audionode, link_info.target_slot );
			else
				LGAudio.connect( this.audionode, target_node.audionode );
		}
		else
		{
			if(target_node.disconnectAudioFromSlot)
				target_node.disconnectAudioFromSlot( this.audionode, link_info.target_slot );
			else
				LGAudio.disconnect( this.audionode, target_node.audionode );
		}
	}
}


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

createAudioNodeWrapper( LGAudioGain );

LGAudioGain.title = "Gain";
LGAudioGain.desc = "Audio gain";
LiteGraph.registerNodeType("audio/gain", LGAudioGain);


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

LGAudioMixer.prototype.connectAudioToSlot = function( audionode, slot )
{
	if(slot == 0)
		LGAudio.connect( audionode, this.audionode1 );
	else if(slot == 2)
		LGAudio.connect( audionode, this.audionode2 );
}

LGAudioMixer.prototype.disconnectAudioFromSlot = function( audionode, slot )
{
	if(slot == 0)
		LGAudio.disconnect( audionode, this.audionode1 );
	else if(slot == 2)
		LGAudio.disconnect( audionode, this.audionode2 );
}

LGAudioMixer.prototype.onExecute = function()
{
	if(!this.inputs || !this.inputs.length)
		return;

	for(var i = 1; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
		if(input.type == "audio")
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

createAudioNodeWrapper( LGAudioMixer );

LGAudioMixer.title = "Mixer";
LGAudioMixer.desc = "Audio mixer";
LiteGraph.registerNodeType("audio/mixer", LGAudioMixer);


function LGAudioDelay()
{
	//default 
	this.properties = {
		time: 5
	};

	this.audionode = LGAudio.getAudioContext().createDelay( this.properties.time );
	this.addInput("in","audio");
	this.addOutput("out","audio");
}

createAudioNodeWrapper( LGAudioDelay );

LGAudioDelay.prototype.onPropertyChanged = function( name, value )
{
	if(name == "time")
	{
		if(value > 500)
			value = 500;
		if(value < 0)
			value = 0;

		var input_node = this.getInputNode(0);
		var output_nodes = this.getOutputNodes(0);

		if(input_node)
			input_node.audionode.disconnect( this.audionode );
		if(output_nodes)
		{
			for(var i = 0; i < output_nodes.length; ++i)
				this.audionode.disconnect( output_nodes[i].audionode );
		}

		this.audionode = LGAudio.getAudioContext().createDelay( value );

		if(input_node)
			input_node.audionode.connect( this.audionode );
		if(output_nodes)
		{
			for(var i = 0; i < output_nodes.length; ++i)
				this.audionode.connect( output_nodes[i].audionode );
		}
	}
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
		var v = this.getInputData(i);
		if(v !== undefined)
			this.audionode[ input.name ].value = v;
	}
}

LGAudioBiquadFilter.prototype.onGetInputs = function()
{
	return [["frequency","number"],["detune","number"],["Q","number"]];
}

createAudioNodeWrapper( LGAudioBiquadFilter );

LGAudioBiquadFilter.title = "BiquadFilter";
LGAudioBiquadFilter.desc = "Audio filter";
LiteGraph.registerNodeType("audio/biquadfilter", LGAudioBiquadFilter);


//*****************************************************

function LGAudioDestination()
{
	this.audionode = LGAudio.getAudioContext().destination;
	this.addInput("in","audio");
}


LGAudioDestination.title = "Destination";
LGAudioDestination.desc = "Audio output";
LiteGraph.registerNodeType("audio/destination", LGAudioDestination);



//EXTRA 


function LGAudioVisualization()
{
	this.addInput("freqs","FFT");
	this.size = [300,200];
	this._last_buffer = null;
}

LGAudioVisualization.prototype.onExecute = function()
{
	this._last_buffer = this.getInputData(0);
}

LGAudioVisualization.prototype.onDrawForeground = function(ctx)
{
	if(!this._last_buffer)
		return;

	var buffer = this._last_buffer;

	var delta = buffer.length / this.size[0];
	var h = this.size[1];

	ctx.fillStyle = "black";
	ctx.fillRect(0,0,this.size[0],this.size[1]);
	ctx.strokeStyle = "white";
	ctx.beginPath();
	var x = 0;
	for(var i = 0; i < buffer.length; i+= delta)
	{
		ctx.moveTo(x,h);
		ctx.lineTo(x,h - (buffer[i|0]/255) * h);
		x++;
	}
	ctx.stroke();
}

LGAudioVisualization.title = "Visualization";
LGAudioVisualization.desc = "Audio Visualization";
LiteGraph.registerNodeType("audio/visualization", LGAudioVisualization);



})( window );