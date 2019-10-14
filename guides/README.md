# LiteGraph

Here is a list of useful info when working with LiteGraph

## LGraphNode

LGraphNode is the base class used for all the nodes classes.
To extend the other classes all the methods contained in LGraphNode.prototype are copyed to the classes when registered.

When you create a new node type you do not have to inherit from that class, when the node is registered all the methods are copied to your node prototype.

Here is an example of how to create your own node:

```javascript
//node constructor class
function MyAddNode()
{
  this.addInput("A","number");
  this.addInput("B","number");
  this.addOutput("A+B","number");
  this.properties = { precision: 1 };
}

//name to show
MyAddNode.title = "Sum";

//function to call when the node is executed
MyAddNode.prototype.onExecute = function()
{
  var A = this.getInputData(0);
  if( A === undefined )
    A = 0;
  var B = this.getInputData(1);
  if( B === undefined )
    B = 0;
  this.setOutputData( 0, A + B );
}

//register in the system
LiteGraph.registerNodeType("basic/sum", MyAddNode );

```


## Node settings

There are several settings that could be defined per node:
* **size**: ```[width,height]``` 
* **properties**: object containing the properties that could be configured by the user
* **shape**: the shape of the object (could be LiteGraph.BOX,LiteGraph.ROUND,LiteGraph.CARD)
* **flags**: several flags
  * **resizable**: if it can be resized dragging the corner
  * **horizontal**: if the slots should be placed horizontally on the top and bottom of the node
  * **clip_area**: clips the content when rendering the node

There are several callbacks that could be defined:
* **onAdded**: when added to graph
* **onRemoved**: when removed from graph
* **onStart**:	when the graph starts playing
* **onStop**:	when the graph stops playing
* **onDrawBackground**: render something inside the node (not visible in Live mode)
* **onDrawForeground**: render something inside the node
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

### Custom Node Appearance

You can configure the node shape or the title color if you want it to be different from the body color:
```js
MyNodeClass.title_color = "#345";
MyNodeClass.shape = LiteGraph.ROUND_SHAPE;
```

You can draw something inside a node using the callbacks ```onDrawForeground``` and ```onDrawBackground```. The only difference is that onDrawForeground gets called in Live Mode and onDrawBackground not.

You do not have to worry about the coordinates system, [0,0] is the top-left corner of the node content area (not the title).

```js
node.onDrawForeground = function(canvas, ctx)
{
  if(this.flags.collapsed)
    return;
  ctx.save();
  ctx.fillColor = "black";
  ctx.fillRect(0,0,10,this.size[1]);
  ctx.restore();
}
```

### Custom Node Behaviour 

You can also grab events from the mouse in case your node has some sort of special interactivity.

The second parameter is the position in node coordinates, where 0,0 represents the top-left corner of the node content (below the title).

```js
node.onMouseDown = function( event, pos, graphcanvas )
{
    return true; //return true is the event was used by your node, to block other behaviours
}
```

Other methods are:
- onMouseMove
- onMouseUp
- onMouseEnter
- onMouseLeave
- onKey

### Node Widgets

You can add widgets inside the node to edit text, values, etc.

To do so you must create them in the constructor by calling ```node.addWidget```, the returned value is the object containing all the info about the widget, it is handy to store it in case you want to change the value later from code.

The sintax is:

```js
function MyNodeType()
{
  this.slider_widget = this.addWidget("slider","Slider", 0.5, function(value, widget, node){ /* do something with the value */ }, { min: 0, max: 1} );
}
```

This is the list of supported widgets:
* **"number"** to change a value of a number, the syntax is ```this.addWidget("number","Number", current_value, callback, { min: 0, max: 100, step: 1} );```
* **"slider"** to change a number by draging the mouse, the syntax is the same as number.
* **"combo"** to select between multiple choices, the syntax is: ```this.addWidget("combo","Combo", "red", callback, { values:["red","green","blue"]} );```
* **"text"** to edit a short string
* **"toggle"** like a checkbox
* **"button"**

The fourth optional parameter could be options for the widget, the parameters accepted are:
* **property**: specifies the name of a property to modify when the widget changes
* **min**: min value
* **max**: max value
* **callback**: function to call when the value changes.

Widget's value is not serialized by default when storing the node state, but if you want to store the value of widgets just set serialize_widgets to true:

```js
function MyNode()
{
  this.addWidget("text","name","");
  this.serialize_widgets = true;
}
```

Or if you want to associate a widget with a property of the node, then specify it in the options:

```js
function MyNode()
{
  this.properties = { surname: "smith" };
  this.addWidget("text","Surname","", { property: "surname"}); //this will modify the node.properties 
}
```


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
