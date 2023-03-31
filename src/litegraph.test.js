describe("register node types", () => {
    let lg;
    let calc_sum;

    beforeEach(() => {
        jest.resetModules();
        lg = require("./litegraph");
        calc_sum = function calc_sum(a, b) {
            return a + b;
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("normal case", () => {
        lg.LiteGraph.registerNodeType("math/sum", calc_sum);

        let node = lg.LiteGraph.registered_node_types["math/sum"];
        expect(node).toBeTruthy();
        expect(node.type).toBe("math/sum");
        expect(node.title).toBe("calc_sum");
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
        lg.LiteGraph.registerNodeType("math/sum", calc_sum);
        expect(lg.LiteGraph.onNodeTypeRegistered).toHaveBeenCalled();
        expect(lg.LiteGraph.onNodeTypeReplaced).not.toHaveBeenCalled();
        lg.LiteGraph.registerNodeType("math/sum", calc_sum);
        expect(lg.LiteGraph.onNodeTypeReplaced).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching("replacing node type")
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching("math/sum")
        );
    });

    test("node with title", () => {
        calc_sum.title = "The sum title";
        lg.LiteGraph.registerNodeType("math/sum", calc_sum);
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
        lg.LiteGraph.registerNodeType("math/sum", calc_sum);

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
        function new_calc_sum(a, b) {
            return a + b;
        }
        lg.LiteGraph.registerNodeType("math/sum", new_calc_sum);
        const new_node_type = lg.LiteGraph.registered_node_types["math/sum"];
        new_node_type.prototype.shape = "box";
        expect(new new_node_type().shape).toBe(lg.LiteGraph.BOX_SHAPE);
    });

    test("onPropertyChanged warning", () => {
        const consoleSpy = jest
            .spyOn(console, "warn")
            .mockImplementation(() => {});

        calc_sum.prototype.onPropertyChange = true;
        lg.LiteGraph.registerNodeType("math/sum", calc_sum);
        expect(consoleSpy).toBeCalledTimes(1);
        expect(consoleSpy).toBeCalledWith(
            expect.stringContaining("has onPropertyChange method")
        );
        expect(consoleSpy).toBeCalledWith(expect.stringContaining("math/sum"));
    });

    test("registering supported file extensions", () => {
        expect(lg.LiteGraph.node_types_by_file_extension).toEqual({});

        // Create two node types with calc_times overriding .pdf
        calc_sum.supported_extensions = ["PDF", "exe", null];
        function calc_times(a, b) {
            return a * b;
        }
        calc_times.supported_extensions = ["pdf", "jpg"];
        lg.LiteGraph.registerNodeType("math/sum", calc_sum);
        lg.LiteGraph.registerNodeType("math/times", calc_times);

        expect(
            Object.keys(lg.LiteGraph.node_types_by_file_extension).length
        ).toBe(3);
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("pdf");
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("exe");
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("jpg");

        expect(lg.LiteGraph.node_types_by_file_extension.exe).toBe(calc_sum);
        expect(lg.LiteGraph.node_types_by_file_extension.pdf).toBe(calc_times);
        expect(lg.LiteGraph.node_types_by_file_extension.jpg).toBe(calc_times);
    });
});
