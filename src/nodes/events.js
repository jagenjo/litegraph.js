//event related nodes
(function(){

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


})();