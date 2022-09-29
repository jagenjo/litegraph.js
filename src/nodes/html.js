(function(global) {
    var LiteGraph = global.LiteGraph;

    function DOMSelector() {
        this.addInput("selector", "string");
        this.addOutput("result", "htmlelement");
        this.properties = { };
    }
    DOMSelector.title = "DOMSelector";
    DOMSelector.desc = "Execute a selection query on the document returning the corresponging DOM element";
    DOMSelector.prototype.onExecute = function(param){
        var sSel = this.getInputData(0);
        var res = null;
        if (sSel){
            res = document.querySelector(sSel);
        }
        this.setOutputData(0,res);
    }
    LiteGraph.registerNodeType("html/dom_selector", DOMSelector);
    
    function DOMSelectorAll() {
        this.addInput("selector", "string");
        this.addOutput("result", "array");
        this.properties = { };
    }
    DOMSelectorAll.title = "DOMSelectorAll";
    DOMSelectorAll.desc = "Execute a selection query (for MULTI) on the document returning the corresponging DOM elements";
    DOMSelectorAll.prototype.onExecute = function(param){
        var sSel = this.getInputData(0);
        var res = null;
        if (sSel){
            res = document.querySelectorAll(sSel);
        }
        this.setOutputData(0,res);
    }
    LiteGraph.registerNodeType("html/dom_selector_all", DOMSelectorAll);
    
    function HtmlEventListener() {
        this.addInput("element", "htmlelement");
        this.addInput("add_listener", LiteGraph.ACTION);
        this.addOutput("listener", "htmlelement_listener");
        this.addOutput("on_event", LiteGraph.EVENT);
        this.addOutput("last_event", "");
        this.addOutput("current_event", "");
        this.addProperty("eventType", "");
        this.addWidget("combo","eventType",this.properties["eventType"],"eventType",{values:["click","dblclick", "mouseover","mousedown","mouseup","mousemove","mouseout","keydown","keyup","keypress","load","unload","mousewheel","contextmenu", "focus","change","blur","pointerdown","pointerup","pointermove","pointerover","pointerout","pointerenter","pointerleave","pointercancel","gotpointercapture","lostpointercapture", "touchstart","touchmove","touchend","touchcancel","submit","scroll","resize","hashchange"]});
        //this.properties = {eventType: "" };
        this.mode = LiteGraph.ON_ACTION;
    }
    HtmlEventListener.title = "HTML Listener";
    HtmlEventListener.desc = "Add an event listener on an html element";
    HtmlEventListener.prototype.onExecute = function(param, options){
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER){
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+Math.floor(Math.random()*9999);
            this.onAction(action, param, options);
        }
        else this.setOutputData(3,null);
    }
    HtmlEventListener.prototype.onAction = function(action, param, options){
        var sSel = this.getInputData(0);
        var eventType = this.getInputOrProperty("eventType");
        var res = null;
        if (sSel && eventType && sSel.addEventListener){
            switch(action){
                case "add_listener":
                default:
                    if ( ! sSel.attributes["data-listener-"+eventType] ){
                        var that = this;
                        var fEv = function(e){
                            that.setOutputData(2,e);
                            that.setOutputData(3,e);
                            that.triggerSlot(1);
                        }
                        sSel.addEventListener(eventType, fEv);
                        sSel.attributes["data-listener-"+eventType] = fEv;
                    }else{
                        var fEv = sSel.attributes["data-listener-"+eventType];
                    }
                    res = {element: sSel, function: fEv, event: eventType};
                break;
            }
        }else{
            console.log("no el to add event");
            //this.setOutputData(2,null); // clean ?
        }
        this.setOutputData(0,res);
    }
    LiteGraph.registerNodeType("html/event_listener", HtmlEventListener);
    
    
    function HtmlEventListenerRemove() {
        this.addInput("listener", "htmlelement_listener");
        this.addInput("remove_listener", LiteGraph.ACTION);
        this.addOutput("result","boolean");
        this.mode = LiteGraph.ON_ACTION;
    }
    HtmlEventListenerRemove.title = "HTML Remove Listener";
    HtmlEventListenerRemove.desc = "Remove an event listener by passing his reference";
    HtmlEventListenerRemove.prototype.onExecute = function(param, options){
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER){
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+Math.floor(Math.random()*9999);
            this.onAction(action, param, options);
        }
    }
    HtmlEventListenerRemove.prototype.onAction = function(action, param, options){
        var oLis = this.getInputData(0);
        var res = false;
        if (oLis && oLis.element && oLis.function && oLis.event && oLis.element.removeEventListener){
            oLis.element.attributes["data-listener-"+oLis.event] = false;
            oLis.element.removeEventListener(oLis.event, oLis.function);
            res = true;
        }else{
            console.log("bad element to remove listener");
        }
        this.setOutputData(0,res);
    }
    LiteGraph.registerNodeType("html/event_listener_remove", HtmlEventListenerRemove);
    
    
    function HtmlValue() {
        this.addInput("element", "htmlelement");
        //this.addInput("get", LiteGraph.ACTION);
        this.addOutput("result","string");
        //this.mode = LiteGraph.ON_ACTION;
    }
    HtmlValue.title = "HTML GET Value";
    HtmlValue.desc = "Get the value (or the text content) of an HTML element";
    HtmlValue.prototype.onExecute = function(param, options){
        var el = this.getInputData(0);
        var res = false;
        if (el){
            if(typeof el == "object"){
                if (typeof el.value != "undefined"){
                    res = el.value;
                }else if(typeof el.checked != "undefined"){ // el.constructor.name == "HTMLInputElement" && ..
                    res = el.checked?true:false;
                }else if(typeof el.textContent != "undefined"){
                    res = el.textContent;
                }else{
                    res = "";
                }
                /*switch(el.constructor.name){      
                }*/
            }
        }else{
            //console.log("no element to get value");
        }
        this.setOutputData(0,res);
    }
    //HtmlEventListenerRemove.prototype.onAction = function(action, param, options){}
    LiteGraph.registerNodeType("html/element_value", HtmlValue);
    
    
    function HtmlValueSet() {
        this.addInput("element", "htmlelement");
        //this.addInput("set", LiteGraph.ACTION);
        this.addInput("value", "string");
        this.addOutput("result","boolean");
        this.addProperty("value","");
        //this.mode = LiteGraph.ON_ACTION;
    }
    HtmlValueSet.title = "HTML SET Value";
    HtmlValueSet.desc = "Set the value (or the text content) of an HTML element";
    HtmlValueSet.prototype.onExecute = function(param, options){
        //if (this.mode == LiteGraph.ON_TRIGGER) this.onAction(action, param, options);
        var el = this.getInputData(0);
        var sVal = this.getInputOrProperty("value"); //getInputData(1);
        var res = false;
        if (el){
            if(typeof el == "object"){
                if (typeof el.value != "undefined"){
                    el.value = sVal+"";
                    res = true;
                }else if(typeof el.checked != "undefined"){
                    el.checked = sVal?true:false;
                    res = true;
                }else if(typeof el.textContent != "undefined"){
                    el.textContent = sVal+"";
                    res = true;
                }else{
                    console.log("unkonwn element to set value");
                }
                /*switch(el.constructor.name){      
                }*/
            }
        }else{
            //console.log("no element to set value");
        }
        this.setOutputData(0,res);
    }
    /*HtmlValueSet.prototype.onAction = function(action, param, options){
        
    }*/
    LiteGraph.registerNodeType("html/element_value_set", HtmlValueSet);
    
    
    function HtmlCreateElement() {
        this.addInput("create", LiteGraph.ACTION);
        this.addInput("type", "string");
        this.addInput("id", "string");
        this.addInput("class", "string");
        this.addOutput("element","htmlelement");
        this.addProperty("type", "");
        this.addProperty("id", "");
        this.addProperty("class", "");
        this.addWidget("combo","type",this.properties["type"],"type",{values:["div","a","span","input","form","br","hr","table","th","tr","td","h1","h2","h3","h4","h5","h6"]});
        this.mode = LiteGraph.ON_ACTION;
    }
    HtmlCreateElement.title = "HTML Create El";
    HtmlCreateElement.desc = "Create an HTML element";
    HtmlCreateElement.prototype.onExecute = function(param, options){
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER){
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+Math.floor(Math.random()*9999);
            this.onAction(action, param, options);
        }
    }
    HtmlCreateElement.prototype.onAction = function(action, param, options){
        var sType = this.getInputOrProperty("type"); //this.getInputData(1);
        var sId = this.getInputOrProperty("id"); //getInputData(2);
        var sClass = this.getInputOrProperty("class"); //getInputData(3);
        var res = null;
        if (sType){
            var el = document.createElement(sType);
            if (el){
                if (sId) el.id = sId+"";
                if (sClass) el.className = sClass+"";
                res = el;
            }
        }else{
            //console.log("no type to create");
        }
        this.setOutputData(0,res);
    }
    LiteGraph.registerNodeType("html/create_element", HtmlCreateElement);
    
    
    function HtmlAppendChild() {
        this.addInput("parent", "htmlelement");
        this.addInput("child", "htmlelement");
        this.addInput("add", LiteGraph.ACTION);
        this.addOutput("result","");
        this.mode = LiteGraph.ON_ACTION;
    }
    HtmlAppendChild.title = "HTML Append Child";
    HtmlAppendChild.desc = "Append an HTML element to another";
    HtmlAppendChild.prototype.onExecute = function(param, options){
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER){
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+Math.floor(Math.random()*9999);
            this.onAction(action, param, options);
        }
    }
    HtmlAppendChild.prototype.onAction = function(action, param, options){
        var parent = this.getInputData(0);
        var child = this.getInputData(1);
        var res = null;
        if (parent && child && parent.appendChild){
            res = parent.appendChild(child)?true:false;
        }else{
            //console.log("no type to create");
        }
        this.setOutputData(0,res);
    }
    LiteGraph.registerNodeType("html/append_child", HtmlAppendChild);
    
    
    function HtmlRemoveElement() {
        this.addInput("element", "htmlelement");
        this.addInput("remove", LiteGraph.ACTION);
        this.addOutput("result","");
        this.mode = LiteGraph.ON_ACTION;
    }
    HtmlRemoveElement.title = "HTML Remove element";
    HtmlRemoveElement.desc = "Remove an HTML element";
    HtmlRemoveElement.prototype.onExecute = function(param, options){
        // no code?
        if (this.mode == LiteGraph.ON_TRIGGER){
            action = this.id+"_"+(action?action:"action")+"_exectoact_"+Math.floor(Math.random()*9999);
            this.onAction(action, param, options);
        }
    }
    HtmlRemoveElement.prototype.onAction = function(action, param, options){
        var element = this.getInputData(0);
        var res = null;
        if (element && element.remove){
            res = element.remove()?true:false;
        }else{
            //console.log("no type to create");
        }
        this.setOutputData(0,res);
    }
    LiteGraph.registerNodeType("html/remove_element", HtmlRemoveElement);
    
    
})(this);