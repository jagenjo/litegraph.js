# LiteGraph

Here is a list of useful info when working with LiteGraph

## LGraphNode

LGraphNode is the base class used for all the nodes classes.
To extend the other classes all the methods contained in LGraphNode.prototype are copyed to the classes when registered.

### Node slots

Every node could have several slots, stored in node.inputs and node.outputs.

You can add new slots by calling node.addInput or node.addOutput

The main difference between inputs and outputs is that an input can only have one connection link while outputs could have several.

To get information about an slot you can access node.inputs[ slot_index ]  or node.outputs[ slot_index ]

Slots have the next information:

 * **name**: string with the name of the slot (used also to show in the canvas)
 * **type**: string specifying the data type traveling through this link
 * **link or links**: depending if the slot is input or ouput contains the id of the link or an array of ids
 * **label**: optional, string used to rename the name as shown in the canvas.
 
 To retrieve the data traveling through a link you can call node.getInputData or node.getOutputData
