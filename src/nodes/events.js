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

/*
//Filter events
function SetModeNode()
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

SetModeNode.title = "Set Node Mode";
SetModeNode.desc = "Changes a node mode";

SetModeNode.prototype.onAction = function( action, param )
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

LiteGraph.registerNodeType("events/set_mode", SetModeNode );
*/

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


})(this);