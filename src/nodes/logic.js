function Selector()
{
	this.addInput("sel","boolean");
	this.addOutput("value","number");
	this.properties = { A:0, B:1 };
	this.size = [60,20];
}

Selector.title = "Selector";
Selector.desc = "outputs A if selector is true, B if selector is false";

Selector.prototype.onExecute = function()
{
	var cond = this.getInputData(0);
	if(cond === undefined)
		return;

	for(var i = 1; i < this.inputs.length; i++)
	{
		var input = this.inputs[i];
		var v = this.getInputData(i);
		if(v === undefined)
			continue;
		this.properties[input.name] = v;
	}

	var A = this.properties.A;
	var B = this.properties.B;
	this.setOutputData(0, cond ? A : B );
}

Selector.prototype.onGetInputs = function() {
	return [["A",0],["B",0]];
}

LiteGraph.registerNodeType("logic/selector", Selector);

