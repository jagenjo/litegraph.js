describe("register node types", () => {
    let lg;
    let Sum;

    beforeEach(() => {
        jest.resetModules();
        lg = require("./litegraph");
        Sum = function Sum() {
            this.addInput("a", "number");
            this.addInput("b", "number");
            this.addOutput("sum", "number");
        };
        Sum.prototype.onExecute = function (a, b) {
            this.setOutputData(0, a + b);
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("normal case", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);

        let node = lg.LiteGraph.registered_node_types["math/sum"];
        expect(node).toBeTruthy();
        expect(node.type).toBe("math/sum");
        expect(node.title).toBe("Sum");
        expect(node.category).toBe("math");
        expect(node.prototype.configure).toBe(
            lg.LGraphNode.prototype.configure
        );
    });

    test("callback triggers", () => {
        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});

        lg.LiteGraph.onNodeTypeRegistered = jest.fn();
        lg.LiteGraph.onNodeTypeReplaced = jest.fn();
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.onNodeTypeRegistered).toHaveBeenCalled();
        expect(lg.LiteGraph.onNodeTypeReplaced).not.toHaveBeenCalled();
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.onNodeTypeReplaced).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching("replacing node type")
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching("math/sum")
        );
    });

    test("node with title", () => {
        Sum.title = "The sum title";
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        let node = lg.LiteGraph.registered_node_types["math/sum"];
        expect(node.title).toBe("The sum title");
        expect(node.title).not.toBe(node.name);
    });

    test("handle error simple object", () => {
        expect(() =>
            lg.LiteGraph.registerNodeType("math/sum", { simple: "type" })
        ).toThrow("Cannot register a simple object");
    });

    test("check shape mapping", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);

        const node_type = lg.LiteGraph.registered_node_types["math/sum"];
        expect(new node_type().shape).toBe(undefined);
        node_type.prototype.shape = "default";
        expect(new node_type().shape).toBe(undefined);
        node_type.prototype.shape = "box";
        expect(new node_type().shape).toBe(lg.LiteGraph.BOX_SHAPE);
        node_type.prototype.shape = "round";
        expect(new node_type().shape).toBe(lg.LiteGraph.ROUND_SHAPE);
        node_type.prototype.shape = "circle";
        expect(new node_type().shape).toBe(lg.LiteGraph.CIRCLE_SHAPE);
        node_type.prototype.shape = "card";
        expect(new node_type().shape).toBe(lg.LiteGraph.CARD_SHAPE);
        node_type.prototype.shape = "custom_shape";
        expect(new node_type().shape).toBe("custom_shape");

        // Check that also works for replaced node types
        jest.spyOn(console, "log").mockImplementation(() => {});
        function NewCalcSum(a, b) {
            return a + b;
        }
        lg.LiteGraph.registerNodeType("math/sum", NewCalcSum);
        const new_node_type = lg.LiteGraph.registered_node_types["math/sum"];
        new_node_type.prototype.shape = "box";
        expect(new new_node_type().shape).toBe(lg.LiteGraph.BOX_SHAPE);
    });

    test("onPropertyChanged warning", () => {
        const consoleSpy = jest
            .spyOn(console, "warn")
            .mockImplementation(() => {});

        Sum.prototype.onPropertyChange = true;
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(consoleSpy).toBeCalledTimes(1);
        expect(consoleSpy).toBeCalledWith(
            expect.stringContaining("has onPropertyChange method")
        );
        expect(consoleSpy).toBeCalledWith(expect.stringContaining("math/sum"));
    });

    test("registering supported file extensions", () => {
        expect(lg.LiteGraph.node_types_by_file_extension).toEqual({});

        // Create two node types with calc_times overriding .pdf
        Sum.supported_extensions = ["PDF", "exe", null];
        function Times() {
            this.addInput("a", "number");
            this.addInput("b", "number");
            this.addOutput("times", "number");
        }
        Times.prototype.onExecute = function (a, b) {
            this.setOutputData(0, a * b);
        };
        Times.supported_extensions = ["pdf", "jpg"];
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        lg.LiteGraph.registerNodeType("math/times", Times);

        expect(
            Object.keys(lg.LiteGraph.node_types_by_file_extension).length
        ).toBe(3);
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("pdf");
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("exe");
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("jpg");

        expect(lg.LiteGraph.node_types_by_file_extension.exe).toBe(Sum);
        expect(lg.LiteGraph.node_types_by_file_extension.pdf).toBe(Times);
        expect(lg.LiteGraph.node_types_by_file_extension.jpg).toBe(Times);
    });

    test("register in/out slot types", () => {
        expect(lg.LiteGraph.registered_slot_in_types).toEqual({});
        expect(lg.LiteGraph.registered_slot_out_types).toEqual({});

        // Test slot type registration with first type
        lg.LiteGraph.auto_load_slot_types = true;
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.registered_slot_in_types).toEqual({
            number: { nodes: ["math/sum"] },
        });
        expect(lg.LiteGraph.registered_slot_out_types).toEqual({
            number: { nodes: ["math/sum"] },
        });

        // Test slot type registration with second type
        function ToInt() {
            this.addInput("string", "string");
            this.addOutput("number", "number");
        };
        ToInt.prototype.onExecute = function (str) {
            this.setOutputData(0, Number(str));
        };
        lg.LiteGraph.registerNodeType("basic/to_int", ToInt);
        expect(lg.LiteGraph.registered_slot_in_types).toEqual({
            number: { nodes: ["math/sum"] },
            string: { nodes: ["basic/to_int"] },
        });
        expect(lg.LiteGraph.registered_slot_out_types).toEqual({
            number: { nodes: ["math/sum", "basic/to_int"] },
        });
    });
});

describe("unregister node types", () => {
    let lg;
    let Sum;

    beforeEach(() => {
        jest.resetModules();
        lg = require("./litegraph");
        Sum = function Sum() {
            this.addInput("a", "number");
            this.addInput("b", "number");
            this.addOutput("sum", "number");
        };
        Sum.prototype.onExecute = function (a, b) {
            this.setOutputData(0, a + b);
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("remove by name", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeTruthy();

        lg.LiteGraph.unregisterNodeType("math/sum");
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeFalsy();
    });

    test("remove by object", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeTruthy();

        lg.LiteGraph.unregisterNodeType(Sum);
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeFalsy();
    });

    test("try removing with wrong name", () => {
        expect(() => lg.LiteGraph.unregisterNodeType("missing/type")).toThrow(
            "node type not found: missing/type"
        );
    });

    test("no constructor name", () => {
        function BlankNode() {}
        BlankNode.constructor = {}
        lg.LiteGraph.registerNodeType("blank/node", BlankNode);
        expect(lg.LiteGraph.registered_node_types["blank/node"]).toBeTruthy()

        lg.LiteGraph.unregisterNodeType("blank/node");
        expect(lg.LiteGraph.registered_node_types["blank/node"]).toBeFalsy();
    })
});
