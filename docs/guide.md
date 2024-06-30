# LiteGraph

Here is a list of useful info when working with LiteGraph.
The library is divided in four levels:
* **LGraphNode**: the base class of a node (this library uses is own system of inheritance)
* **LGraph**: the container of a whole graph made of nodes
* **LGraphCanvas**: the class in charge of rendering/interaction with the nodes inside the browser.

And in ```the src/``` folder there is also another class included:
* **LiteGraph.Editor**: A wrapper around LGraphCanvas that adds buttons around it.

## LGraphNode

LGraphNode is the base class used for all the nodes classes.
To extend the other classes all the methods contained in LGraphNode.prototype are copied to the classes when registered.

When you create a new node type you do not have to inherit from that class, when the node is registered all the methods are copied to your node prototype.  This is done inside the functions ```LiteGraph.registerNodeType(...)```.

Here is an example of how to create your own node:

```javascript
//your node constructor class
function MyAddNode()
{
  //add some input slots
  this.addInput("A","number");
  this.addInput("B","number");
  //add some output slots
  this.addOutput("A+B","number");
  //add some properties
  this.properties = { precision: 1 };
}

//name to show on the canvas
MyAddNode.title = "Sum";

//function to call when the node is executed
MyAddNode.prototype.onExecute = function()
{
  //retrieve data from inputs
  var A = this.getInputData(0);
  if( A === undefined )
    A = 0;
  var B = this.getInputData(1);
  if( B === undefined )
    B = 0;
  //assing data to outputs
  this.setOutputData( 0, A + B );
}

//register in the system
LiteGraph.registerNodeType("basic/sum", MyAddNode );

```


## Node settings

There are several settings that could be defined or modified per node:
* **size**: ```[width,height]``` the size of the area inside the node (excluding title). Every row is LiteGraph.NODE_SLOT_HEIGHT pixels height.
* **properties**: object containing the properties that could be configured by the user, and serialized when saving the graph
* **shape**: the shape of the object (could be LiteGraph.BOX_SHAPE,LiteGraph.ROUND_SHAPE,LiteGraph.CARD_SHAPE)
* **flags**: flags that can be changed by the user and will be stored when serialized
  * **collapsed**: if it is shown collapsed (small)
* **redraw_on_mouse**: forces a redraw if the mouse passes over the widget
* **widgets_up**: widgets do not start after the slots
* **widgets_start_y**: widgets should start being drawn from this Y
* **clip_area**: clips the content when rendering the node
* **resizable**: if it can be resized dragging the corner
* **horizontal**: if the slots should be placed horizontally on the top and bottom of the node

There are several callbacks that could be defined by the user:
* **onAdded**: called when added to graph
* **onRemoved**: called when removed from graph
* **onStart**:	called when the graph starts playing
* **onStop**:	called when the graph stops playing
* **onDrawBackground**: render custom node content on canvas (not visible in Live mode)
* **onDrawForeground**: render custom node content on canvas (on top of slots)
* **onMouseDown,onMouseMove,onMouseUp,onMouseEnter,onMouseLeave** to catch mouse events
* **onDblClick**: double clicked in the editor
* **onExecute**: called when it is time to execute the node
* **onPropertyChanged**: when a property is changed in the panel (return true to skip default behaviour)
* **onGetInputs**: returns an array of possible inputs in the form of [ ["name","type"], [...], [...] ]
* **onGetOutputs**: returns an array of possible outputs
* **onSerialize**: before serializing, receives an object where to store data
* **onSelected**: selected in the editor, receives an object where to read data
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
 * **link or links**: depending if the slot is input or output contains the id of the link or an array of ids
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

Both functions receive the [Canvas2D rendering context](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D) and the LGraphCanvas instance where the node is being rendered.

You do not have to worry about the coordinates system, (0,0) is the top-left corner of the node content area (not the title).

```js
node.onDrawForeground = function(ctx, graphcanvas)
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

The syntax is:

```js
function MyNodeType()
{
  this.slider_widget = this.addWidget("slider","Slider", 0.5, function(value, widget, node){ /* do something with the value */ }, { min: 0, max: 1} );
}
```

This is the list of supported widgets:
* **"number"** to change a value of a number, the syntax is ```this.addWidget("number","Number", current_value, callback, { min: 0, max: 100, step: 1, precision: 3 } );```
* **"slider"** to change a number by dragging the mouse, the syntax is the same as number.
* **"combo"** to select between multiple choices, the syntax is:

  ```this.addWidget("combo","Combo", "red", callback, { values:["red","green","blue"]} );```

  or if you want to use objects:

  ```this.addWidget("combo","Combo", value1, callback, { values: { "title1":value1, "title2":value2 } } );```

* **"text"** to edit a short string
* **"toggle"** like a checkbox
* **"button"**

The fourth optional parameter could be options for the widget, the parameters accepted are:
* **property**: specifies the name of a property to modify when the widget changes
* **min**: min value
* **max**: max value
* **precision**: set the number of digits after decimal point
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
## LGraphCanvas
LGraphCanvas is the class in charge of rendering/interaction with the nodes inside the browser.

## LGraphCanvas settings
There are graph canvas settings that could be defined or modified to change behaviour:

* **allow_interaction**: when set to `false` disable interaction with the canvas (`flags.allow_interaction` on node can be used to override graph canvas setting)

### Canvas Shortcuts
* Space - Holding space key while moving the cursor moves the canvas around. It works when holding the mouse button down so it is easier to connect different nodes when the canvas gets too large.
* Ctrl/Shift + Click - Add clicked node to selection.
* Ctrl + A - Select all nodes
* Ctrl + C/Ctrl + V - Copy and paste selected nodes, without maintaining the connection to the outputs of unselected nodes.
* Ctrl + C/Ctrl + Shift + V - Copy and paste selected nodes, and maintaining the connection from the outputs of unselected nodes to the inputs of the newly pasted nodes.
* Holding Shift and drag selected nodes - Move multiple selected nodes at the same time.

# Execution Flow
To execute a graph you must call ```graph.runStep()```.

This function will call the method ```node.onExecute()``` for every node in the graph.

The order of execution is determined by the system according to the morphology of the graph (nodes without inputs are considered level 0, then nodes connected to nodes of level 0 are level 1, and so on). This order is computed only when the graph morphology changes (new nodes are created, connections change).

It is up to the developer to decide how to handle inputs and outputs from inside the node.

The data send through outputs using ```this.setOutputData(0,data)``` is stored in the link, so if the node connected through that link does ```this.getInputData(0)``` it will receive the same data sent.

For rendering, the nodes are executed according to their order in the ```graph._nodes``` array, which changes when the user interact with the GraphCanvas (clicked nodes are moved to the back of the array so they are rendered the last).


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

## Events

When we run a step in a graph (using ```graph.runStep()```) every node onExecute method will be called.
But sometimes you want that actions are only performed when some trigger is activated, for this situations you can use Events.

Events allow to trigger executions in nodes only when an event is dispatched from one node.

To define slots for nodes you must use the type LiteGraph.ACTION for inputs, and LIteGraph.EVENT for outputs:

```js
function MyNode()
{
  this.addInput("play", LiteGraph.ACTION );
  this.addInput("onFinish", LiteGraph.EVENT );
}
```

Now to execute some code when an event is received from an input, you must define the method onAction:

```js
MyNode.prototype.onAction = function(action, data)
{
   if(action == "play")
   {
     //do your action...
   }

}
```

And the last thing is to trigger events when something in your node happens. You could trigger them from inside the onExecute or from any other interaction:

```js
MyNode.prototype.onAction = function(action, data)
{
   if( this.button_was_clicked )
    this.triggerSlot(0); //triggers event in slot 0
}
```

There are some nodes already available to handle events, like delaying, counting, etc.


### Customising Link Tooltips

When hovering over a link that connects two nodes together, a tooltip will be shown allowing the user to see the data that is being output from one node to the other.

Sometimes, you may have a node that outputs an object, rather than a primitive value that can be easily represented (like a string). In these instances, the tooltip will default to showing `[Object]`.

If you need a more descriptive tooltip, you can achieve this by adding a `toToolTip` function to your object which returns the text you wish to display in the tooltip.

For example, to ensure the link from output slot 0 shows `A useful description`, the output object would look like this:

```javascript
this.setOutputData(0, {
  complexObject: {
    yes: true,
  },
  toToolTip: () => 'A useful description',
});
```










