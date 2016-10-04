//not tested nor finished

(function( global )
{

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
	if(this._audio_context.state == "suspended")
		this._audio_context.resume();
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


//****************************************************

function LGAudioSource()
{
	this.properties = {
		src: "demodata/audio.wav",
		gain: 0.5,
		loop: true,
		autoplay: true,
		playbackRate: 1
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

LGAudioSource.supported_extensions = ["wav","ogg","mp3"];


LGAudioSource.prototype.onAdded = function(graph)
{
	if(graph.status === LGraph.STATUS_RUNNING)
		this.onStart();
}

LGAudioSource.prototype.onStart = function()
{
	if(!this._audio_buffer)
		return;

	if(this.properties.autoplay)
		this.playBuffer( this._audio_buffer );
}

LGAudioSource.prototype.onStop = function()
{
	this.stopAllSounds();
}

LGAudioSource.prototype.onRemoved = function()
{
	this.stopAllSounds();
}

LGAudioSource.prototype.stopAllSounds = function()
{
	//iterate and stop
	for(var i = 0; i < this._audionodes.length; ++i )
	{
		this._audionodes[i].stop();
		//this._audionodes[i].disconnect( this.audionode );
	}
	this._audionodes.length = 0;
}

LGAudioSource.prototype.onExecute = function()
{
	if(!this.inputs)
		return;

	for(var i = 0; i < this.inputs.length; ++i)
	{
		var input = this.inputs[i];
		if(!input.link)
			continue;

		var v = this.getInputData(i);
		if( v === undefined )
			continue;
		if( input.name == "gain" )
			this.audionode.gain.value = v;
		else if( input.name == "playbackRate" )
			this.properties.playbackRate = v;
	}
}

LGAudioSource.prototype.onAction = function(event)
{
	if(this._audio_buffer)
	{
		if(event == "Play")
			this.playBuffer(this._audio_buffer);
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
}

LGAudioSource.prototype.playBuffer = function( buffer )
{
	var that = this;
	var context = LGAudio.getAudioContext();

	//create a new audionode (this is mandatory, AudioAPI doesnt like to reuse old ones)
	var audionode = context.createBufferSource(); //create a AudioBufferSourceNode
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

	audionode.start();
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
			if(that._url)
			{
				URL.revokeObjectURL( that._url );
				that._url = null;
			}

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

//Helps connect/disconnect AudioNodes when new connections are made in the node
LGAudioSource.prototype.onConnectionsChange = LGAudio.onConnectionsChange;

LGAudioSource.prototype.onGetInputs = function()
{
	return [["playbackRate","number"],["Play",LiteGraph.ACTION],["Stop",LiteGraph.ACTION]];
}

LGAudioSource.prototype.onGetOutputs = function()
{
	return [["ended",LiteGraph.EVENT]];
}

LGAudioSource.prototype.onDropFile = function(file)
{
	if(this._url)
		URL.revokeObjectURL( this._url );
	this._url = URL.createObjectURL( file );
	this.properties.src = this._url;
	this.loadSound( this._url );
}


LGAudioSource.title = "Source";
LGAudioSource.desc = "Plays audio";
LiteGraph.registerNodeType("audio/source", LGAudioSource);


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

	class_object.prototype.onConnectionsChange = LGAudio.onConnectionsChange;
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

createAudioNodeWrapper( LGAudioWaveShaper );

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
		delayTime: 0.5
	};

	this.audionode = LGAudio.getAudioContext().createDelay( 10 );
	this.audionode.delayTime.value = this.properties.delayTime;
	this.addInput("in","audio");
	this.addInput("time","number");
	this.addOutput("out","audio");
}

createAudioNodeWrapper( LGAudioDelay );

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

//EXTRA 


function LGAudioVisualization()
{
	this.properties = {
		continuous: true
	};

	this.addInput("freqs","array");
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
			ctx.moveTo(x,h);
			ctx.lineTo(x,h - (buffer[i|0]/255) * h);
			x++;
		}
	}
	ctx.stroke();
}

LGAudioVisualization.title = "Visualization";
LGAudioVisualization.desc = "Audio Visualization";
LiteGraph.registerNodeType("audio/visualization", LGAudioVisualization);



function LGAudioDestination()
{
	this.audionode = LGAudio.getAudioContext().destination;
	this.addInput("in","audio");
}


LGAudioDestination.title = "Destination";
LGAudioDestination.desc = "Audio output";
LiteGraph.registerNodeType("audio/destination", LGAudioDestination);




})( window );