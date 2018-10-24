# LiteGraph

Here is a list of useful info when working with LiteGraph

## LGraphNode

LGraphNode is the base class used for all the nodes classes.
To extend the other classes all the methods contained in LGraphNode.prototype are copyed to the classes when registered.

When you create a new node type you do not have to inherit from that class, when the node is registered all the methods are copied to your node prototype.

## Node settings

There are several settings that could be defined per node:
* **size**: ```[width,height]``` 
* **properties**: object containing the properties that could be configured by the user
* **shape**: the shape of the object (could be LiteGraph.BOX,LiteGraph.ROUND,LiteGraph.CARD)
* **flags**: several flags
⋅⋅* **resizable**: if it can be resized dragging the corner
⋅⋅* **horizontal**: if the slots should be placed horizontally on the top and bottom of the node
⋅⋅* **clip_area**: clips the content when rendering the node

There are several callbacks that could be defined:
* **onAdded**: when added to graph
* **onRemoved**: when removed from graph
* **onStart**:	when the graph starts playing
* **onStop**:	when the graph stops playing
* **onDrawForeground**: render the inside widgets inside the node
* **onDrawBackground**: render the background area inside the node (only in edit mode)
* **onMouseDown,onMouseMove,onMouseUp,onMouseEnter,onMouseLeave**
* **onDblClick**: double clicked in the editor
* **onExecute**: execute the node
* **onPropertyChanged**: when a property is changed in the panel (return true to skip default behaviour)
* **onGetInputs**: returns an array of possible inputs
* **onGetOutputs**: returns an array of possible outputs
* **onSerialize**: before serializing
* **onSelected**: selected in the editor
* **onDeselected**: deselected from the editor
* **onDropItem**: DOM item dropped over the node
* **onDropFile**: file dropped over the node
* **onConnectInput**: if returns false the incoming connection will be canceled
* **onConnectionsChange**: a connection changed (new one or removed) (LiteGraph.INPUT or LiteGraph.OUTPUT, slot, true if connected, link_info, input_info )


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
 * **dir**: optional, could be LiteGraph.UP, LiteGraph.RIGHT, LiteGraph.DOWN, LiteGraph.LEFT
 * **color_on**: color to render when it is connected
 * **color_off**: color to render when it is not connected
  
 To retrieve the data traveling through a link you can call ```node.getInputData``` or ```node.getOutputData```

### Define your Graph Node

When creating a class for a graph node here are some useful points:

- The constructor should create the default inputs and outputs (use ```addInput```  and ```addOutput```)
- Properties that can be edited are stored in ```this.properties = {};```
- the ```onExecute``` is the method that will be called when the graph is executed
- you can catch if a property was changed defining a ```onPropertyChanged```
- you must register your node using ```LiteGraph.registerNodeType("type/name", MyGraphNodeClass );```
- you can alter the default priority of execution by defining the ```MyGraphNodeClass.priority``` (default is 0)
- you can overwrite how the node is rendered using the ```onDrawBackground``` and ```onDrawForeground```


## Integration

To integrate in you HTML application:

```js
var graph = new LiteGraph.LGraph();
var graph_canvas = new LiteGraph.LGraphCanvas( canvas, graph );
```

If you want to start the graph then:
```js
graph.start();
```
