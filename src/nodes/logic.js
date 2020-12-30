(function(global) {
    var LiteGraph = global.LiteGraph;

    function Selector() {
        this.addInput("sel", "number");
        this.addInput("A");
        this.addInput("B");
        this.addInput("C");
        this.addInput("D");
        this.addOutput("out");

        this.selected = 0;
    }

    Selector.title = "Selector";
    Selector.desc = "selects an output";

    Selector.prototype.onDrawBackground = function(ctx) {
        if (this.flags.collapsed) {
            return;
        }
        ctx.fillStyle = "#AFB";
        var y = (this.selected + 1) * LiteGraph.NODE_SLOT_HEIGHT + 6;
        ctx.beginPath();
        ctx.moveTo(50, y);
        ctx.lineTo(50, y + LiteGraph.NODE_SLOT_HEIGHT);
        ctx.lineTo(34, y + LiteGraph.NODE_SLOT_HEIGHT * 0.5);
        ctx.fill();
    };

    Selector.prototype.onExecute = function() {
        var sel = this.getInputData(0);
        if (sel == null || sel.constructor !== Number)
            sel = 0;
        this.selected = sel = Math.round(sel) % (this.inputs.length - 1);
        var v = this.getInputData(sel + 1);
        if (v !== undefined) {
            this.setOutputData(0, v);
        }
    };

    Selector.prototype.onGetInputs = function() {
        return [["E", 0], ["F", 0], ["G", 0], ["H", 0]];
    };

    LiteGraph.registerNodeType("logic/selector", Selector);

    function Sequence() {
        this.properties = {
            sequence: "A,B,C"
        };
        this.addInput("index", "number");
        this.addInput("seq");
        this.addOutput("out");

        this.index = 0;
        this.values = this.properties.sequence.split(",");
    }

    Sequence.title = "Sequence";
    Sequence.desc = "select one element from a sequence from a string";

    Sequence.prototype.onPropertyChanged = function(name, value) {
        if (name == "sequence") {
            this.values = value.split(",");
        }
    };

    Sequence.prototype.onExecute = function() {
        var seq = this.getInputData(1);
        if (seq && seq != this.current_sequence) {
            this.values = seq.split(",");
            this.current_sequence = seq;
        }
        var index = this.getInputData(0);
        if (index == null) {
            index = 0;
        }
        this.index = index = Math.round(index) % this.values.length;

        this.setOutputData(0, this.values[index]);
    };

    LiteGraph.registerNodeType("logic/sequence", Sequence);
    
    
    function logicAnd(){
        this.properties = { };
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }
    logicAnd.title = "AND";
    logicAnd.desc = "Return true if both inputs are true";
    logicAnd.prototype.onExecute = function() {
        ret = true;
        for (inX in this.inputs){
            if (!this.getInputData(inX)){
                ret = false;
                break;
            }
        }
        this.setOutputData(0, ret);
    };
    logicAnd.prototype.onGetInputs = function() {
        return [
            ["and", "boolean"]
        ];
    };
    LiteGraph.registerNodeType("logic/AND", logicAnd);
    
    
    function logicOr(){
        this.properties = { };
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }
    logicOr.title = "OR";
    logicOr.desc = "Return true if at least one input is true";
    logicOr.prototype.onExecute = function() {
        ret = false;
        for (inX in this.inputs){
            if (this.getInputData(inX)){
                ret = true;
                break;
            }
        }
        this.setOutputData(0, ret);
    };
    logicOr.prototype.onGetInputs = function() {
        return [
            ["or", "boolean"]
        ];
    };
    LiteGraph.registerNodeType("logic/OR", logicOr);
    
    
    function logicNot(){
        this.properties = { };
        this.addInput("in", "boolean");
        this.addOutput("out", "boolean");
    }
    logicNot.title = "NOT";
    logicNot.desc = "Return the logical negation";
    logicNot.prototype.onExecute = function() {
        var ret = !this.getInputData(0);
        this.setOutputData(0, ret);
    };
    LiteGraph.registerNodeType("logic/NOT", logicNot);
    
    
    function logicCompare(){
        this.properties = { };
        this.addInput("a", "boolean");
        this.addInput("b", "boolean");
        this.addOutput("out", "boolean");
    }
    logicCompare.title = "bool == bool";
    logicCompare.desc = "Compare for logical equality";
    logicCompare.prototype.onExecute = function() {
        last = null;
        ret = true;
        for (inX in this.inputs){
            if (last === null) last = this.getInputData(inX);
            else
                if (last != this.getInputData(inX)){
                    ret = false;
                    break;
                }
        }
        this.setOutputData(0, ret);
    };
    logicCompare.prototype.onGetInputs = function() {
        return [
            ["bool", "boolean"]
        ];
    };
    LiteGraph.registerNodeType("logic/CompareBool", logicCompare);
    
    
    function logicFor(){
        this.properties = { };
        this.addInput("start", "number");
        this.addInput("nElements", "number");
        this.addInput("do", LiteGraph.ACTION);
        this.addInput("break", LiteGraph.ACTION);
        //this.addInput("reset", LiteGraph.ACTION);
        this.addOutput("do", LiteGraph.EVENT);
        this.addOutput("index", "number");
        this.started = false;
        this.stopped = false;
    }
    logicFor.title = "FOR";
    logicFor.desc = "Cycle FOR";
    logicFor.prototype.onExecute = function(param) {
        if (!this.started) return;
        var iI = this.getInputData(0);
        var num = this.getInputData(1);
        for (k=iI;k<iI+num;k++){            
            console.debug("for cycle "+k);
            this.triggerSlot(0, param);
            if (this.stopped){
                console.debug("for cycle stopped on index "+k);
                break;
            }
            this.setOutputData(1, k);
        }
        this.started = false;
        this.stopped = true;
    };
    logicFor.prototype.onAction = function(action, param){
        /*console.debug(action);
        console.debug(param);
        console.debug(this);*/
        switch(action){
            case "break":
                this.stopped = true;
            break;
            /*case "reset":
                this.stopped = false;
            break;*/
            case "do":
                this.started = true;
                this.stopped = false;
                this.execute();
            break;
        }
    }
    LiteGraph.registerNodeType("logic/CycleFOR", logicFor);
    
    
    function logicWhile(){
        this.properties = { cycleLimit: 999, checkOnStart: true };
        this.addInput("do", LiteGraph.ACTION);
        this.addInput("condition", "boolean");
        this.addInput("break", LiteGraph.ACTION);
        this.addOutput("do", LiteGraph.EVENT);
        this.addOutput("index", "number");
        this.started = false;
        this.stopped = false;
        this.addWidget("toggle","checkOnStart",this.properties.checkOnStart,"checkOnStart");
    }
    logicWhile.title = "WHILE";
    logicWhile.desc = "Cycle WHILE";
    logicWhile.prototype.onExecute = function(param) {
        if (!this.started) return;
        var checkOnStart = this.getInputOrProperty("enabled");
        var cond = !checkOnStart || this.getInputData(1);
        var k = 0;
        cycleLimit = this.properties.cycleLimit || 999;
        while (cond && k<cycleLimit){
            console.debug("while cycle "+k);
            this.setOutputData(1, k);
            this.triggerSlot(0, param);
            // done
            if (this.stopped){
                console.debug("while cycle stopped on index "+k);
                break;
            }
            k++;
            cond = this.getInputData(1);
        }
        this.started = false;
        this.stopped = true;
    };
    logicWhile.prototype.onAction = function(action, param){
        switch(action){
            case "break":
                this.stopped = true;
            break;
            case "do":
                this.started = true;
                this.stopped = false;
                this.execute();
            break;
        }
    }
    LiteGraph.registerNodeType("logic/CycleWHILE", logicWhile);
    
})(this);
