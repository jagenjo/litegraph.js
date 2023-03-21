const lg = require("./litegraph");

test("Register a node type", () => {
    function calc_sum(a, b) {
        return a + b;
    }
    lg.LiteGraph.registerNodeType("math/sum", calc_sum);

    let node = lg.LiteGraph.registered_node_types["math/sum"];
    expect(node).toBeTruthy();
    expect(node.type).toBe("math/sum");
    expect(node.title).toBe("calc_sum")
    expect(node.category).toBe("math");
    expect(node.prototype.configure).toBe(lg.LGraphNode.prototype.configure);
});
