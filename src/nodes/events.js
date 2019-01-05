//event related nodes
(function(global){
var LiteGraph = global.LiteGraph;

//Show value inside the debug console
function LogEvent()
{
	this.size = [60,20];
	this.addInput("event", LiteGraph.ACTION);
}

LogEvent.title = "Log Event";
LogEvent.desc = "Log event in console";

LogEvent.prototype.onAction = function( action, param )
{
	console.log( action, param );
}

LiteGraph.registerNodeType("events/log", LogEvent );


//Sequencer for events
function Sequencer()
{
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
	this.size = [120,30];
	this.flags = { horizontal: true, render_box: false };
}

Sequencer.title = "Sequencer";
Sequencer.desc = "Trigger events when an event arrives";

Sequencer.prototype.getTitle = function() { return ""; }

Sequencer.prototype.onAction = function( action, param )
{
	if(this.outputs)
		for(var i = 0; i < this.outputs.length; ++i)
			this.triggerSlot( i, param );
}

LiteGraph.registerNodeType("events/sequencer", Sequencer );

//Filter events
function FilterEvent()
{
	this.size = [60,20];
	this.addInput("event", LiteGraph.ACTION);
	this.addOutput("event", LiteGraph.EVENT);
	this.properties = {
		equal_to: "",
		has_property:"",
		property_equal_to: ""
	};
}

FilterEvent.title = "Filter Event";
FilterEvent.desc = "Blocks events that do not match the filter";

FilterEvent.prototype.onAction = function( action, param )
{
	if( param == null )
		return;

	if( this.properties.equal_to && this.properties.equal_to != param )
		return;

	if( this.properties.has_property )
	{
		var prop = param[ this.properties.has_property ];
		if( prop == null )
			return;

		if( this.properties.property_equal_to && this.properties.property_equal_to != prop )
			return;
	}

	this.triggerSlot(0,param);
}

LiteGraph.registerNodeType("events/filter", FilterEvent );


//Show value inside the debug console
function EventCounter()
{
	this.addInput("inc", LiteGraph.ACTION);
	this.addInput("dec", LiteGraph.ACTION);
	this.addInput("reset", LiteGraph.ACTION);
	this.addOutput("change", LiteGraph.EVENT);
	this.addOutput("num", "number");
	this.num = 0;
}

EventCounter.title = "Counter";
EventCounter.desc = "Counts events";

EventCounter.prototype.onAction = function(action, param)
{
	var v = this.num;
	if(action == "inc")
		this.num += 1;
	else if(action == "dec")
		this.num -= 1;
	else if(action == "reset")
		this.num = 0;
	if(this.num != v)
		this.trigger("change",this.num);
}

EventCounter.prototype.onDrawBackground = function(ctx)
{
	if(this.flags.collapsed)
		return;
	ctx.fillStyle = "#AAA";
	ctx.font = "20px Arial";
	ctx.textAlign = "center";
	ctx.fillText( this.num, this.size[0] * 0.5, this.size[1] * 0.5 );
}


EventCounter.prototype.onExecute = function()
{
	this.setOutputData(1,this.num);
}

LiteGraph.registerNodeType("events/counter", EventCounter );

//Show value inside the debug console
function DelayEvent()
{
	this.size = [60,20];
	this.addProperty( "time", 1000 );
	this.addInput("event", LiteGraph.ACTION);
	this.addOutput("on_time", LiteGraph.EVENT);

	this._pending = [];
}

DelayEvent.title = "Delay";
DelayEvent.desc = "Delays one event";

DelayEvent.prototype.onAction = function(action, param)
{
	this._pending.push([ this.properties.time, param ]);
}

DelayEvent.prototype.onExecute = function()
{
	var dt = this.graph.elapsed_time * 1000; //in ms

	for(var i = 0; i < this._pending.length; ++i)
	{
		var action = this._pending[i];
		action[0] -= dt;
		if( action[0] > 0 )
			continue;
		
		//remove
		this._pending.splice(i,1); 
		--i;

		//trigger
		this.trigger(null, action[1]);
	}
}

DelayEvent.prototype.onGetInputs = function()
{
	return [["event",LiteGraph.ACTION]];
}

LiteGraph.registerNodeType("events/delay", DelayEvent );


//Show value inside the debug console
function TimerEvent()
{
	this.addProperty("interval", 1000);
	this.addProperty("event", "tick");
	this.addOutput("on_tick", LiteGraph.EVENT);
	this.time = 0;
	this.last_interval = 1000;
	this.triggered = false;
}

TimerEvent.title = "Timer";
TimerEvent.desc = "Sends an event every N milliseconds";

TimerEvent.prototype.onStart = function()
{
	this.time = 0;
}

TimerEvent.prototype.getTitle = function()
{
	return "Timer: " + this.last_interval.toString() + "ms";
}

TimerEvent.on_color = "#AAA";
TimerEvent.off_color = "#222";

TimerEvent.prototype.onDrawBackground = function()
{
	this.boxcolor = this.triggered ? TimerEvent.on_color : TimerEvent.off_color;
	this.triggered = false;
}

TimerEvent.prototype.onExecute = function()
{
	var dt = this.graph.elapsed_time * 1000; //in ms

	var trigger = this.time == 0;

	this.time += dt;
	this.last_interval = Math.max(1, this.getInputOrProperty("interval") | 0);

	if( !trigger && ( this.time < this.last_interval || isNaN(this.last_interval)) )
	{
		if( this.inputs && this.inputs.length > 1 && this.inputs[1] )
			this.setOutputData(1,false);
		return;
	}

	this.triggered = true;
	this.time = this.time % this.last_interval;
	this.trigger( "on_tick", this.properties.event );
	if( this.inputs && this.inputs.length > 1 && this.inputs[1] )
		this.setOutputData( 1, true );
}

TimerEvent.prototype.onGetInputs = function()
{
	return [["interval","number"]];
}

TimerEvent.prototype.onGetOutputs = function()
{
	return [["tick","boolean"]];
}

LiteGraph.registerNodeType("events/timer", TimerEvent );


})(this);