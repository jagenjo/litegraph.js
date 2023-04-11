/*
    Project Name : midi-parser-js
    Project Url  : https://github.com/colxi/midi-parser-js/
    Author       : colxi
    Author URL   : http://www.colxi.info/
    Description  : MidiParser library reads .MID binary files, Base64 encoded MIDI Data,
    or UInt8 Arrays, and outputs as a readable and structured JS object.
*/

(function(){
    'use strict';

    /**
     * CROSSBROWSER & NODEjs POLYFILL for ATOB() -
     * By: https://github.com/MaxArt2501 (modified)
     * @param  {string} string [description]
     * @return {[type]}        [description]
     */
    const _atob = function(string) {
        // base64 character set, plus padding character (=)
        let b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        // Regular expression to check formal correctness of base64 encoded strings
        let b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
        // remove data type signatures at the begining of the string
        // eg :  "data:audio/mid;base64,"
        string = string.replace( /^.*?base64,/ , '');
        // atob can work with strings with whitespaces, even inside the encoded part,
        // but only \t, \n, \f, \r and ' ', which can be stripped.
        string = String(string).replace(/[\t\n\f\r ]+/g, '');
        if (!b64re.test(string))
            throw new TypeError('Failed to execute _atob() : The string to be decoded is not correctly encoded.');

        // Adding the padding if missing, for semplicity
        string += '=='.slice(2 - (string.length & 3));
        let bitmap, result = '';
        let r1, r2, i = 0;
        for (; i < string.length;) {
            bitmap = b64.indexOf(string.charAt(i++)) << 18 | b64.indexOf(string.charAt(i++)) << 12
                    | (r1 = b64.indexOf(string.charAt(i++))) << 6 | (r2 = b64.indexOf(string.charAt(i++)));

            result += r1 === 64 ? String.fromCharCode(bitmap >> 16 & 255)
                    : r2 === 64 ? String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255)
                    : String.fromCharCode(bitmap >> 16 & 255, bitmap >> 8 & 255, bitmap & 255);
        }
        return result;
    };


    /**
     * [MidiParser description]
     * @type {Object}
     */
    const MidiParser  = {
        // debug (bool), when enabled will log in console unimplemented events
        // warnings and internal handled errors.
        debug: false,

        /**
         * [parse description]
         * @param  {[type]} input     [description]
         * @param  {[type]} _callback [description]
         * @return {[type]}           [description]
         */
        parse: function(input, _callback){
            if(input instanceof Uint8Array) return MidiParser.Uint8(input);
            else if(typeof input === 'string') return MidiParser.Base64(input);
            else if(input instanceof HTMLElement && input.type === 'file') return MidiParser.addListener(input , _callback);
            else throw new Error('MidiParser.parse() : Invalid input provided');
        },

        /**
         * addListener() should be called in order attach a listener to the INPUT HTML element
         * that will provide the binary data automating the conversion, and returning
         * the structured data to the provided callback function.
         */
        addListener: function(_fileElement, _callback){
            if(!File || !FileReader) throw new Error('The File|FileReader APIs are not supported in this browser. Use instead MidiParser.Base64() or MidiParser.Uint8()');

            // validate provided element
            if( _fileElement === undefined ||
                !(_fileElement instanceof HTMLElement) ||
                _fileElement.tagName !== 'INPUT' ||
                _fileElement.type.toLowerCase() !== 'file' 
            ){
                console.warn('MidiParser.addListener() : Provided element is not a valid FILE INPUT element');
                return false;
            }
            _callback = _callback || function(){};

            _fileElement.addEventListener('change', function(InputEvt){             // set the 'file selected' event handler
                if (!InputEvt.target.files.length) return false;                    // return false if no elements where selected
                console.log('MidiParser.addListener() : File detected in INPUT ELEMENT processing data..');
                let reader = new FileReader();                                      // prepare the file Reader
                reader.readAsArrayBuffer(InputEvt.target.files[0]);                 // read the binary data
                reader.onload =  function(e){
                    _callback( MidiParser.Uint8(new Uint8Array(e.target.result)));  // encode data with Uint8Array and call the parser
                };
            });
        },

        /**
         * Base64() : convert baset4 string into uint8 array buffer, before performing the
         * parsing subroutine.
         */
        Base64 : function(b64String){
            b64String = String(b64String);

            let raw = _atob(b64String);
            let rawLength = raw.length;
            let t_array = new Uint8Array(new ArrayBuffer(rawLength));

            for(let i=0; i<rawLength; i++) t_array[i] = raw.charCodeAt(i);
            return  MidiParser.Uint8(t_array) ;
        },

        /**
         * parse() : function reads the binary data, interpreting and spliting each chuck
         * and parsing it to a structured Object. When job is finised returns the object
         * or 'false' if any error was generated.
         */
        Uint8: function(FileAsUint8Array){
            let file = {
                data: null,
                pointer: 0,
                movePointer: function(_bytes){                                      // move the pointer negative and positive direction
                    this.pointer += _bytes;
                    return this.pointer;
                },
                readInt: function(_bytes){                                          // get integer from next _bytes group (big-endian)
                    _bytes = Math.min(_bytes, this.data.byteLength-this.pointer);
                    if (_bytes < 1) return -1;                                                                      // EOF
                    let value = 0;
                    if(_bytes > 1){
                        for(let i=1; i<= (_bytes-1); i++){
                            value += this.data.getUint8(this.pointer) * Math.pow(256, (_bytes - i));
                            this.pointer++;
                        }
                    }
                    value += this.data.getUint8(this.pointer);
                    this.pointer++;
                    return value;
                },
                readStr: function(_bytes){                                          // read as ASCII chars, the followoing _bytes
                    let text = '';
                    for(let char=1; char <= _bytes; char++) text +=  String.fromCharCode(this.readInt(1));
                    return text;
                },
                readIntVLV: function(){                                             // read a variable length value
                    let value = 0;
                    if ( this.pointer >= this.data.byteLength ){
                        return -1;                                                  // EOF
                    }else if(this.data.getUint8(this.pointer) < 128){               // ...value in a single byte
                        value = this.readInt(1);
                    }else{                                                          // ...value in multiple bytes
                        let FirstBytes = [];
                        while(this.data.getUint8(this.pointer) >= 128){
                            FirstBytes.push(this.readInt(1) - 128);
                        }
                        let lastByte  = this.readInt(1);
                        for(let dt = 1; dt <= FirstBytes.length; dt++){
                            value += FirstBytes[FirstBytes.length - dt] * Math.pow(128, dt);
                        }
                        value += lastByte;
                    }
                    return value;
                }
            };

            file.data = new DataView(FileAsUint8Array.buffer, FileAsUint8Array.byteOffset, FileAsUint8Array.byteLength);                                            // 8 bits bytes file data array
            //  ** read FILE HEADER
            if(file.readInt(4) !== 0x4D546864){
                console.warn('Header validation failed (not MIDI standard or file corrupt.)');
                return false;                                                       // Header validation failed (not MIDI standard or file corrupt.)
            }
            let headerSize          = file.readInt(4);                              // header size (unused var), getted just for read pointer movement
            let MIDI                = {};                                           // create new midi object
            MIDI.formatType         = file.readInt(2);                              // get MIDI Format Type
            MIDI.tracks             = file.readInt(2);                              // get ammount of track chunks
            MIDI.track              = [];                                           // create array key for track data storing
            let timeDivisionByte1   = file.readInt(1);                              // get Time Division first byte
            let timeDivisionByte2   = file.readInt(1);                              // get Time Division second byte
            if(timeDivisionByte1 >= 128){                                           // discover Time Division mode (fps or tpf)
                MIDI.timeDivision    = [];
                MIDI.timeDivision[0] = timeDivisionByte1 - 128;                     // frames per second MODE  (1st byte)
                MIDI.timeDivision[1] = timeDivisionByte2;                           // ticks in each frame     (2nd byte)
            }else MIDI.timeDivision  = (timeDivisionByte1 * 256) + timeDivisionByte2;// else... ticks per beat MODE  (2 bytes value)

            //  ** read TRACK CHUNK
            for(let t=1; t <= MIDI.tracks; t++){
                MIDI.track[t-1]     = {event: []};                                  // create new Track entry in Array
                let headerValidation = file.readInt(4);
                if ( headerValidation === -1 ) break;                               // EOF
                if(headerValidation !== 0x4D54726B) return false;                   // Track chunk header validation failed.
                file.readInt(4);                                                    // move pointer. get chunk size (bytes length)
                let e               = 0;                                            // init event counter
                let endOfTrack      = false;                                        // FLAG for track reading secuence breaking
                // ** read EVENT CHUNK
                let statusByte;
                let laststatusByte;
                while(!endOfTrack){
                    e++;                                                            // increase by 1 event counter
                    MIDI.track[t-1].event[e-1] = {};                                // create new event object, in events array
                    MIDI.track[t-1].event[e-1].deltaTime  = file.readIntVLV();      // get DELTA TIME OF MIDI event (Variable Length Value)
                    statusByte = file.readInt(1);                                   // read EVENT TYPE (STATUS BYTE)
                    if(statusByte === -1) break;                                    // EOF
                    else if(statusByte >= 128) laststatusByte = statusByte;         // NEW STATUS BYTE DETECTED
                    else{                                                           // 'RUNNING STATUS' situation detected
                        statusByte = laststatusByte;                                // apply last loop, Status Byte
                        file.movePointer(-1);                                       // move back the pointer (cause readed byte is not status byte)
                    }


                    //
                    // ** IS META EVENT
                    //
                    if(statusByte === 0xFF){                                        // Meta Event type
                        MIDI.track[t-1].event[e-1].type = 0xFF;                     // assign metaEvent code to array
                        MIDI.track[t-1].event[e-1].metaType =  file.readInt(1);     // assign metaEvent subtype
                        let metaEventLength = file.readIntVLV();                    // get the metaEvent length
                        switch(MIDI.track[t-1].event[e-1].metaType){
                            case 0x2F:                                              // end of track, has no data byte
                            case -1:                                                // EOF
                                endOfTrack = true;                                  // change FLAG to force track reading loop breaking
                                break;
                            case 0x01:                                              // Text Event
                            case 0x02:                                              // Copyright Notice
                            case 0x03:
                            case 0x04:                                              // Instrument Name
                            case 0x05:                                              // Lyrics)
                            case 0x07:                                              // Cue point                                         // Sequence/Track Name (documentation: http://www.ta7.de/txt/musik/musi0006.htm)
                            case 0x06:                                              // Marker
                                MIDI.track[t-1].event[e-1].data = file.readStr(metaEventLength);
                                break;
                            case 0x21:                                              // MIDI PORT
                            case 0x59:                                              // Key Signature
                            case 0x51:                                              // Set Tempo
                                MIDI.track[t-1].event[e-1].data = file.readInt(metaEventLength);
                                break;
                            case 0x54:                                              // SMPTE Offset
                                MIDI.track[t-1].event[e-1].data    = [];
                                MIDI.track[t-1].event[e-1].data[0] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[1] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[2] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[3] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[4] = file.readInt(1);
                                break;
                            case 0x58:                                              // Time Signature
                                MIDI.track[t-1].event[e-1].data    = [];
                                MIDI.track[t-1].event[e-1].data[0] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[1] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[2] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[3] = file.readInt(1);
                                break;
                            default :
                                // if user provided a custom interpreter, call it
                                // and assign to event the returned data
                                if( this.customInterpreter !== null){
                                    MIDI.track[t-1].event[e-1].data = this.customInterpreter( MIDI.track[t-1].event[e-1].metaType, file, metaEventLength);
                                }
                                // if no customInterpretr is provided, or returned
                                // false (=apply default), perform default action
                                if(this.customInterpreter === null || MIDI.track[t-1].event[e-1].data === false){
                                    file.readInt(metaEventLength);
                                    MIDI.track[t-1].event[e-1].data = file.readInt(metaEventLength);
                                    if (this.debug) console.info('Unimplemented 0xFF meta event! data block readed as Integer');
                                }
                        }
                    }

                    //
                    // IS REGULAR EVENT
                    //
                    else{                                                           // MIDI Control Events OR System Exclusive Events
                        statusByte = statusByte.toString(16).split('');             // split the status byte HEX representation, to obtain 4 bits values
                        if(!statusByte[1]) statusByte.unshift('0');                 // force 2 digits
                        MIDI.track[t-1].event[e-1].type = parseInt(statusByte[0], 16);// first byte is EVENT TYPE ID
                        MIDI.track[t-1].event[e-1].channel = parseInt(statusByte[1], 16);// second byte is channel
                        switch(MIDI.track[t-1].event[e-1].type){
                            case 0xF:{                                              // System Exclusive Events

                                // if user provided a custom interpreter, call it
                                // and assign to event the returned data
                                if( this.customInterpreter !== null){
                                    MIDI.track[t-1].event[e-1].data = this.customInterpreter( MIDI.track[t-1].event[e-1].type, file , false);
                                }

                                // if no customInterpretr is provided, or returned
                                // false (=apply default), perform default action
                                if(this.customInterpreter === null || MIDI.track[t-1].event[e-1].data === false){
                                    let event_length = file.readIntVLV();
                                    MIDI.track[t-1].event[e-1].data = file.readInt(event_length);
                                    if (this.debug) console.info('Unimplemented 0xF exclusive events! data block readed as Integer');
                                }
                                break;
                            }
                            case 0xA:                                               // Note Aftertouch
                            case 0xB:                                               // Controller
                            case 0xE:                                               // Pitch Bend Event
                            case 0x8:                                               // Note off
                            case 0x9:                                               // Note On
                                MIDI.track[t-1].event[e-1].data = [];
                                MIDI.track[t-1].event[e-1].data[0] = file.readInt(1);
                                MIDI.track[t-1].event[e-1].data[1] = file.readInt(1);
                                break;
                            case 0xC:                                               // Program Change
                            case 0xD:                                               // Channel Aftertouch
                                MIDI.track[t-1].event[e-1].data = file.readInt(1);
                                break;
                            case -1:                                                // EOF
                                endOfTrack = true;                                  // change FLAG to force track reading loop breaking
                                break;
                            default:
                                // if user provided a custom interpreter, call it
                                // and assign to event the returned data
                                if( this.customInterpreter !== null){
                                    MIDI.track[t-1].event[e-1].data = this.customInterpreter( MIDI.track[t-1].event[e-1].metaType, file , false);
                                }

                                // if no customInterpretr is provided, or returned
                                // false (=apply default), perform default action
                                if(this.customInterpreter === null || MIDI.track[t-1].event[e-1].data === false){
                                    console.log('Unknown EVENT detected... reading cancelled!');
                                    return false;
                                }
                        }
                    }
                }
            }
            return MIDI;
        },

        /**
         * custom function to handle unimplemented, or custom midi messages.
         * If message is a meta-event, the value of metaEventLength will be >0.
         * Function must return the value to store, and pointer of dataView needs
         * to be manually increased
         * If you want default action to be performed, return false
         */
        customInterpreter : null // function( e_type , arrayByffer, metaEventLength){ return e_data_int }
    };


    // if running in NODE export module
    if(typeof module !== 'undefined') module.exports = MidiParser;
    else{
        // if running in Browser, set a global variable.
        let _global = typeof window === 'object' && window.self === window && window ||
                    typeof self === 'object' && self.self === self && self ||
                    typeof global === 'object' && global.global === global && global;

        _global.MidiParser = MidiParser;
    }


    
})();