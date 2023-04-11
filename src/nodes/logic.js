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
    logicAnd.desc = "Return true if all inputs are true";
    logicAnd.prototype.onExecute = function() {
        var ret = true;
        for (var inX in this.inputs){
            if (!this.getInputData(inX)){
                var ret = false;
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
        var ret = false;
        for (var inX in this.inputs){
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
        var last = null;
        var ret = true;
        for (var inX in this.inputs){
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
    
    
    function logicBranch(){
        this.properties = { };
        this.addInput("onTrigger", LiteGraph.ACTION);
        this.addInput("condition", "boolean");
        this.addOutput("true", LiteGraph.EVENT);
        this.addOutput("false", LiteGraph.EVENT);
        this.mode = LiteGraph.ON_TRIGGER;
    }
    logicBranch.title = "Branch";
    logicBranch.desc = "Branch execution on condition";
    logicBranch.prototype.onExecute = function(param, options) {
        var condtition = this.getInputData(1);
        if (condtition){
            this.triggerSlot(0);
        }else{
            this.triggerSlot(1);
        }
    };
    LiteGraph.registerNodeType("logic/IF", logicBranch);
})(this);
