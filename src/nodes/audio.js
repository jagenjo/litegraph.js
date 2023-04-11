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
        this.addInput("gate", "boolean");
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
