//basic nodes
(function(global) {
    var LiteGraph = global.LiteGraph;

    function toString(a) {
        return String(a);
    }

    LiteGraph.wrapFunctionAsNode("string/toString", compare, ["*"], "String");

    function compare(a, b) {
        return a == b;
    }

    LiteGraph.wrapFunctionAsNode(
        "string/compare",
        compare,
        ["String", "String"],
        "Boolean"
    );

    function concatenate(a, b) {
        if (a === undefined) {
            return b;
        }
        if (b === undefined) {
            return a;
        }
        return a + b;
    }

    LiteGraph.wrapFunctionAsNode(
        "string/concatenate",
        concatenate,
        ["String", "String"],
        "String"
    );

    function contains(a, b) {
        if (a === undefined || b === undefined) {
            return false;
        }
        return a.indexOf(b) != -1;
    }

    LiteGraph.wrapFunctionAsNode(
        "string/contains",
        contains,
        ["String", "String"],
        "Boolean"
    );

    function toUpperCase(a) {
        if (a != null && a.constructor === String) {
            return a.toUpperCase();
        }
        return a;
    }

    LiteGraph.wrapFunctionAsNode(
        "string/toUpperCase",
        toUpperCase,
        ["String"],
        "String"
    );

    function split(a, b) {
        if (a != null && a.constructor === String) {
            return a.split(b || " ");
        }
        return [a];
    }

    LiteGraph.wrapFunctionAsNode(
        "string/split",
        toUpperCase,
        ["String", "String"],
        "Array"
    );

    function toFixed(a) {
        if (a != null && a.constructor === Number) {
            return a.toFixed(this.properties.precision);
        }
        return a;
    }

    LiteGraph.wrapFunctionAsNode(
        "string/toFixed",
        toFixed,
        ["Number"],
        "String",
        { precision: 0 }
    );
})(this);
