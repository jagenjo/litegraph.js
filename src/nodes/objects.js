//event related nodes
(function(global) {
    var LiteGraph = global.LiteGraph;


    function mMETHOD(){
        this.properties = { };
        // this.addInput("onTrigger", LiteGraph.ACTION);
        // this.addInput("condition", "boolean");
        // this.addOutput("true", LiteGraph.EVENT);
        // this.addOutput("false", LiteGraph.EVENT);
        this.mode = LiteGraph.ON_TRIGGER;
    }
    mMETHOD.title = "Branch";
    mMETHOD.desc = "Branch execution on condition";
    mMETHOD.prototype.onExecute = function(param, options) {
        // this.triggerSlot(0);
    };
    mMETHOD.prototype.onAction = function(action, param, options){
    };
    mMETHOD.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    mMETHOD.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    LiteGraph.registerNodeType("basic/egnode", mMETHOD);

    // --------------------------

    function objProperties(){

        this.addInput("obj", "object");
        // this.addInput("condition", "boolean");

        this.addOutput("properties", "array");
        // this.addOutput("false", LiteGraph.EVENT);

        // this.mode = LiteGraph.ON_TRIGGER;
        //this.widget = this.addWidget("text","prop.","",this.setValue.bind(this) );
        //this.widgets_up = true;
        //this.size = [140, 30];
        this._value = null;
        this._properties = [];
    }
    objProperties.title = "OBJ props";
    objProperties.desc = "Properties for objects";
    objProperties.prototype.onExecute = function(param, options) {
        var data = this.getInputData(0);
        if (data != null) {
            this._value = data;
            try{
                this._properties = Object.keys(this._value);
            }catch(e){
            }
            this.setOutputData(0, this._properties);
        }
    };
    objProperties.prototype.onAction = function(action, param, options){
        // should probably execute on action
    };
    objProperties.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    objProperties.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    objProperties.prototype.getTitle = function() {
        if (this.flags.collapsed) {
        }
        return this.title;
    };
    objProperties.prototype.onPropertyChanged = function(name, value) {
        //this.widget.value = value;
    };
    LiteGraph.registerNodeType("objects/properties", objProperties);

    // --------------------------

    // node events
    /*
    onWidgetChanged
    */


    // widgets
    /*

    this.widg_prop = this.addWidget("property","prop.","",this.setValue.bind(this) );
    this.widg_prop = this.addWidget("combo","prop.",this.properties.prop,{ property: "prop", values: [] }); //,this.setValue.bind(this) );
    
    // to put it before inputs
    this.widgets_up = true;
    
    // remove or update does not exists :: should save index to do it :: this.removeWidget();
    // to clear
    this.widgets = [];
    // readd if needed
    this.widg_prop = this.addWidget();

    // can specify draw function
    obWidget.draw = function(ctx, node, widget_width, y, H){

    }
    // can override Y placement
    obWidget.computeSize = function(width){
        return Y;
    }

    obWidget.mouse = function(){
        return b_isDirtyCanvas; // can specify if canvas should get dirty
    }

    obWidget.callback = function(value, canvas, node, pos, event){

    }

    */

    // --------------------------


    function objPropertyWidget(){

        this.addInput("obj", "object");
        // this.addInput("condition", "boolean");

        this.addOutput("value", "*");
        // this.addOutput("false", LiteGraph.EVENT);

        this.addProperty("prop", 0);

        this.mode = LiteGraph.ON_REQUEST; // to be optimized, could run always
        //this.widg_prop = this.addWidget("property","prop.","",this.setValue.bind(this) );
        this.widg_prop = this.addWidget("combo","prop.",this.properties.prop,{ property: "prop", values: [] }); //,this.setValue.bind(this) );
        //this.widgets_up = true;
        //this.size = [140, 30];

        this._obin = null;
        this._value = null;
        this._properties = [];
    }
    objPropertyWidget.title = "Obj Prop widget";
    objPropertyWidget.desc = "Choose a property for an object";
    objPropertyWidget.prototype.setValue = function(v) {
        this.properties.prop = v;
        this.widg_prop.value = v;
    };
    objPropertyWidget.prototype.updateFromInput = function(v) {
        var data = this.getInputData(0);
        if (data != null) {
            this._obin = data;
            if(this._obin){ //} && typeof this._obin == "Object"){
                try{
                    this._properties = Object.keys(this._obin);
                    if(this._properties && this._properties.sort) this._properties = this._properties.sort();
                }catch(e){
                }
                if(this._properties){
                    //this.removeWidget();
                    this.widgets = [];
                    this.widg_prop = this.addWidget("combo","prop.",this.properties.prop,{ property: "prop", values: this._properties });
                }
                if(typeof this._obin[this.properties.prop] !== "undefined"){
                    this._value = this._obin[this.properties.prop];
                }else{
                    this._value = null;    
                }
            }else{
                this._value = null;
                this._properties = [];
            }
        }
        if(!this.widg_prop.options) this.widg_prop.options = {};
        this.widg_prop.options.values = this._properties;
        this.setOutputData(0, this._value);
    };
    objPropertyWidget.prototype.onExecute = function(param, options) {
        // var data = this.getInputData(0);
        // if (data != null) {
        //     this._obin = data;
        //     if(this._obin){ //} && typeof this._obin == "Object"){
        //         try{
        //             this._properties = Object.keys(this._obin);
        //         }catch(e){
        //         }
        //         if(typeof this._obin[this.properties.prop] !== "undefined"){
        //             this._value = this._obin[this.properties.prop];
        //         }else{
        //             this._value = null;    
        //         }
        //     }else{
        //         this._value = null;
        //         this._properties = [];
        //     }
        // }
        // if(!this.widg_prop.options) this.widg_prop.options = {};
        // this.widg_prop.options.values = this._properties;
        // this.setOutputData(0, this._value);
        this.updateFromInput();
    };
    objPropertyWidget.prototype.onAction = function(action, param, options){
        // should probably execute on action
        this.updateFromInput();
    };
    objPropertyWidget.prototype.onGetInputs = function() {
        //return [["in", 0]];
    };
    objPropertyWidget.prototype.onGetOutputs = function() {
        //return [["out", 0]];
    };
    objPropertyWidget.prototype.getTitle = function() {
        if (this.flags.collapsed) {
            return this.properties.prop;
        }
        return this.title;
    };
    objPropertyWidget.prototype.onPropertyChanged = function(name, value) {
        if(name == "value"){
            this.widg_prop.value = value;
        }
    };
    objPropertyWidget.prototype.getExtraMenuOptions = function(canvas, options){
        return [{
            content: "Console DBG", //has_submenu: false,
            callback: function(menuitO,obX,ev,htmO,nodeX){
                console.debug(nodeX.widg_prop);
                console.debug(nodeX);
            }
        }];
    }
    LiteGraph.registerNodeType("objects/property_widget", objPropertyWidget);

})(this);