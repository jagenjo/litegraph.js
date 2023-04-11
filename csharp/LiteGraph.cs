using System;
using System.Collections;
using System.Collections.Generic;
//using System.Diagnostics;
using UnityEngine; //for debug messages
using SimpleJSON; //to parse the JSON


namespace LiteGraph
{
    public enum DataType { NONE, ENUM, NUMBER, STRING, BOOL, VEC2, VEC3 };

    public struct vec2 {
        float x;
        float y;
    };

    public struct vec3
    {
        float x;
        float y;
        float z;
    };

    //not used yet...
    public class MutableType {
        public DataType type;
        public bool data_bool;
        public float data_number;
        public string data_string;
        public vec2 data_vec2;
        public vec3 data_vec3;
        public bool AsBool { get { return data_bool; } }
        public int AsEnum { get { return (int)data_number; } }
        public float AsFloat { get { return data_number; } }
        public string AsString { get { return data_string; } }
        public vec2 AsVec2 { get { return data_vec2; } }
        public vec3 AsVec3 { get { return data_vec3; } }
        public void Set(bool v) { type = DataType.BOOL; data_bool = v; }
        public void Set(int v) { type = DataType.ENUM; data_number = v; }
        public void Set(float v) { type = DataType.NUMBER; data_number = v; }
        public void Set(string v) { type = DataType.STRING; data_string = v; }
        public void Set(vec2 v) { type = DataType.VEC2; data_vec2 = v; }
        public void Set(vec3 v) { type = DataType.VEC3; data_vec3 = v; }
        public override string ToString() {
            switch (type)
            {
                case DataType.NONE: return "";
                case DataType.ENUM: return data_number.ToString();
                case DataType.BOOL: return data_bool.ToString();
                case DataType.NUMBER: return data_number.ToString();
                case DataType.STRING: return data_string; 
                case DataType.VEC2: return data_vec2.ToString();
                case DataType.VEC3: return data_vec3.ToString();
            }
            return "";
        }
    };

    //to store connection info
    public class LLink {
        public int id;
        public int origin_id;
        public int origin_slot;
        public int target_id;
        public int target_slot;

        public DataType data_type;

        public bool data_bool;
        public float data_float;
        public string data_string;
        public vec2 data_vec2;
        public vec3 data_vec3;

        public LLink(int id, DataType type, int origin_id, int origin_slot, int target_id, int target_slot)
        {
            this.id = id;
            this.data_type = type;
            this.origin_id = origin_id;
            this.origin_slot = origin_slot;
            this.target_id = target_id;
            this.target_slot = target_slot;
        }

        public void setData(bool data)
        {
            data_type = DataType.BOOL;
            data_bool = data;
        }

        public void setData(float data)
        {
            data_type = DataType.NUMBER;
            data_float = data;
        }

        public void setData(string data)
        {
            data_type = DataType.STRING;
            data_string = data;
        }

        public void setData(vec2 data)
        {
            data_type = DataType.VEC2;
            data_vec2 = data;
        }

        public void setData(vec3 data)
        {
            data_type = DataType.VEC3;
            data_vec3 = data;
        }

    }

    //to store slot info
    public class LSlot
    {
        public int num;
        public string name;
        public DataType type;
        public LLink link = null; //for input slots
        public List<LLink> links = new List<LLink>(); //for output slots

        public LSlot(string name, DataType type)
        {
            this.name = name;
            this.type = type;
        }
    }

    //the node base class
    public class LGraphNode {
        public int id = -1;

        public LGraph graph = null;
        public int order = -1;

        public List<LSlot> inputs = new List<LSlot>();
        public List<LSlot> outputs = new List<LSlot>();

        public LGraphNode()
        {
        }

        public virtual LSlot addInput(string name, DataType type = DataType.NONE)
        {
            LSlot slot = new LSlot(name, type);
            slot.num = inputs.Count;
            inputs.Add(slot);
            return slot;
        }

        public virtual LSlot addOutput(string name, DataType type = DataType.NONE)
        {
            LSlot slot = new LSlot(name, type);
            slot.num = outputs.Count;
            outputs.Add(slot);
            return slot;
        }

        public virtual bool getInputData(int slot_num, bool default_value)
        {
            LLink link = inputs[slot_num].link;
            if (link != null)
                return link.data_bool;
            return default_value;
        }

        public virtual float getInputData(int slot_num, float default_value )
        {
            LLink link = inputs[slot_num].link;
            if (link != null)
                return link.data_float;
            return default_value;
        }

        public virtual string getInputData(int slot_num, string default_value)
        {
            LLink link = inputs[slot_num].link;
            if (link != null)
                return link.data_string;
            return default_value;
        }

        public virtual vec2 getInputData(int slot_num, vec2 default_value)
        {
            LLink link = inputs[slot_num].link;
            if (link != null)
                return link.data_vec2;
            return default_value;
        }

        public virtual vec3 getInputData(int slot_num, vec3 default_value)
        {
            LLink link = inputs[slot_num].link;
            if (link != null)
                return link.data_vec3;
            return default_value;
        }

        public virtual void setOutputData(int slot_num, bool v)
        {
            if (inputs.Count <= slot_num)
                return;
            LSlot slot = outputs[slot_num];
            if (slot == null)
                return;
            for (int i = 0; i < slot.links.Count; ++i)
            {
                LLink link = slot.links[i];
                if (link == null)
                    return;
                link.setData(v);
            }
        }

        public virtual void setOutputData(int slot_num, float v)
        {
            if (outputs.Count <= slot_num)
                return;
            LSlot slot = outputs[slot_num];
            if (slot == null)
                return;
            for (int i = 0; i < slot.links.Count; ++i)
            {
                LLink link = slot.links[i];
                if (link == null)
                    return;
                link.setData(v);
            }
        }

        public virtual void setOutputData(int slot_num, string v)
        {
            if (outputs.Count <= slot_num)
                return;
            LSlot slot = outputs[slot_num];
            if (slot == null)
                return;
            for (int i = 0; i < slot.links.Count; ++i)
            {
                LLink link = slot.links[i];
                if (link == null)
                    return;
                link.setData(v);
            }
        }

        public virtual void setOutputData(int slot_num, vec2 v)
        {
            if (outputs.Count <= slot_num)
                return;
            LSlot slot = outputs[slot_num];
            if (slot == null)
                return;
            for (int i = 0; i < slot.links.Count; ++i)
            {
                LLink link = slot.links[i];
                if (link == null)
                    return;
                link.setData(v);
            }
        }

        public virtual void setOutputData(int slot_num, vec3 v)
        {
            if (outputs.Count <= slot_num)
                return;
            LSlot slot = outputs[slot_num];
            if (slot == null)
                return;
            for (int i = 0; i < slot.links.Count; ++i)
            {
                LLink link = slot.links[i];
                if (link == null)
                    return;
                link.setData(v);
            }
        }

        public virtual void transferData(int input_slot_num, int output_slot_num)
        {
            LLink input_link = inputs[input_slot_num].link;
            if (input_link == null)
                return;

            if (outputs.Count <= output_slot_num)
                return;
            LSlot slot = outputs[output_slot_num];
            if (slot == null)
                return;
            for (int i = 0; i < slot.links.Count; ++i)
            {
                LLink link = slot.links[i];
                if (link == null)
                    return;
                switch(input_link.data_type)
                {
                    case DataType.BOOL: link.setData(input_link.data_bool); break;
                    case DataType.NUMBER: link.setData(input_link.data_float); break;
                    case DataType.STRING: link.setData(input_link.data_string); break;
                    case DataType.VEC2: link.setData(input_link.data_vec2); break;
                    case DataType.VEC3: link.setData(input_link.data_vec3); break;
                }
            }
        }

        public virtual bool connect(int origin_slot, LGraphNode target, int target_slot)
        {
            if(graph == null)
                throw (new Exception("node does not belong to a graph"));
            if (graph != target.graph)
                throw (new Exception("nodes do not belong to same graph") );

            LSlot origin_slot_info = this.outputs[origin_slot];
            LSlot target_slot_info = target.inputs[target_slot];
            if (origin_slot_info == null || target_slot_info == null)
                return false;

            if(origin_slot_info.type != target_slot_info.type && (origin_slot_info.type != DataType.NONE && target_slot_info.type != DataType.NONE) )
                throw (new Exception("connecting incompatible types"));

            int id = graph.last_link_id++;
            LLink link = new LLink(id, origin_slot_info.type, this.id, origin_slot, target.id, target_slot);

            graph.links.Add(link);
            origin_slot_info.links.Add(link);
            target_slot_info.link = link;

            graph.sortByExecutionOrder();
            return true;
        }

        public virtual void onExecute()
        {
        }

        public virtual void configure(JSONNode json_node)
        {
            this.id = json_node["id"].AsInt;
            this.order = json_node["order"].AsInt;

            //inputs
            var json_inputs = json_node["inputs"];
            if (json_inputs != null)
            {
                JSONNode.Enumerator it = json_inputs.GetEnumerator();
                int i = 0;
                while(it.MoveNext())
                {
                    JSONNode json_slot = it.Current;
                    string str_type = json_slot["type"];
                    DataType type = DataType.NONE;
                    if (str_type != null && Globals.stringToDataType.ContainsKey(str_type))
                        type = Globals.stringToDataType[str_type];
                    LSlot slot = null;
                    if (inputs.Count > i)
                        slot = inputs[i];
                    if(slot == null)
                        slot = this.addInput( json_slot["name"], type );
                    JSONNode json_link = json_slot["link"];
                    if (json_link != null)
                        slot.link = graph.links_by_id[json_link.AsInt];
                    ++i;
                }
            }

            //outputs
            var json_outputs = json_node["outputs"];
            if (json_outputs != null)
            {
                JSONNode.Enumerator it = json_outputs.GetEnumerator();
                int i = 0;
                while (it.MoveNext())
                {
                    JSONNode json_slot = it.Current;
                    string str_type = json_slot["type"];
                    DataType type = DataType.NONE;
                    if (str_type != null && Globals.stringToDataType.ContainsKey(str_type))
                        type = Globals.stringToDataType[str_type];
                    LSlot slot = null;
                    if (outputs.Count > i)
                        slot = outputs[i];
                    if (slot == null)
                        slot = this.addOutput(json_slot["name"], type);

                    JSONNode json_links = json_slot["links"];
                    if(json_links != null)
                    {
                        JSONNode.Enumerator it2 = json_links.GetEnumerator();
                        while (it2.MoveNext())
                        {
                            JSONNode json_link_id = it2.Current;
                            LLink link = graph.links_by_id[json_link_id.AsInt];
                            if (link != null)
                                slot.links.Add(link);
                            else
                                Debug.LogError("Link ID not found!: " + json_link_id);
                        }
                    }
                    ++i;
                }
            }

            //custom data (properties)
            this.onConfigure(json_node);
        }

        public virtual void onConfigure(JSONNode json_node)
        {
            //overwrite this one
        }
    }

    //namespace to store global litegraph data
    public class Globals
    {
        static public Dictionary<string, DataType> stringToDataType = new Dictionary<string, DataType> { { "NONE", DataType.NONE }, { "", DataType.NONE }, { "ENUM", DataType.ENUM }, {"NUMBER",DataType.NUMBER }, { "number", DataType.NUMBER }, { "BOOLEAN", DataType.BOOL }, { "boolean", DataType.BOOL }, { "STRING", DataType.STRING }, { "string", DataType.STRING }, { "VEC2", DataType.VEC2 } };

        static public Dictionary<string, Func<LGraphNode>> node_types = new Dictionary<string, Func<LGraphNode>>();
        static public void registerType(string name, Func<LGraphNode> ctor )
        {
            node_types.Add(name, ctor);
        }
        static public LGraphNode createNodeType(string name)
        {
            if (!node_types.ContainsKey(name))
            {
                Debug.Log("Node type not found: " + name);
                return null;
            }
            Func<LGraphNode> ctor = node_types[name];
            return ctor();
        }

    };

    //one graph
    public class LGraph
    {
        public List<LGraphNode> nodes = new List<LGraphNode>();
        public Dictionary<int, LGraphNode> nodes_by_id = new Dictionary<int, LGraphNode>();
        public List<LGraphNode> nodes_in_execution_order = new List<LGraphNode>();
        public List<LLink> links = new List<LLink>();
        public Dictionary<int,LLink> links_by_id = new Dictionary<int, LLink>();

        public bool has_errors = false;
        public int last_node_id = 0;
        public int last_link_id = 0;
        public double time = 0; //time in seconds

        public Dictionary<string, float> outputs = new Dictionary<string, float>(); 

        // Start is called before the first frame update
        public LGraph()
        {
        }

        public void add(LGraphNode node)
        {
            if (node.graph != null)
                throw ( new Exception("already has graph") );

            node.graph = this;
            node.id = last_node_id++;
            node.order = node.id;
            nodes.Add(node);
            nodes_by_id.Add(node.id, node);
        }

        public void clear()
        {
            has_errors = false;
            nodes.Clear();
            nodes_by_id.Clear();
            links.Clear();
            links_by_id.Clear();
            nodes_in_execution_order.Clear();
            last_link_id = 0;
            last_node_id = 0;
            outputs.Clear();
        }

        // Update is called once per frame
        public void runStep(float dt = 0)
        {
            for (int i = 0; i < nodes_in_execution_order.Count; ++i)
            {
                LGraphNode node = nodes_in_execution_order[i];
                node.onExecute();
            }
            time += dt;
        }

        public void configure(string data)
        {
            sortByExecutionOrder();
        }

        public void sortByExecutionOrder()
        {
            nodes_in_execution_order = nodes.GetRange(0, nodes.Count);

            nodes_in_execution_order.Sort(delegate (LGraphNode a, LGraphNode b)
            {
                return a.order - b.order;
            });
        }

        public void fromJSONText(string text)
        {
            clear();

            var root = JSON.Parse(text);
            last_node_id = root["last_node_id"].AsInt;
            last_link_id = root["last_link_id"].AsInt;

            var json_links = root["links"];
            for (int i = 0; i < json_links.Count; ++i)
            {
                var json_node = json_links[i];
                int id = json_node[0].AsInt;
                int origin_id = json_node[1].AsInt;
                int origin_slot = json_node[2].AsInt;
                int target_id = json_node[3].AsInt;
                int target_slot = json_node[4].AsInt;
                JSONNode json_type = json_node[5];
                DataType type = DataType.NONE;

                if(json_type != null && json_type.Value != "0" && Globals.stringToDataType.ContainsKey(json_type) )
                    type = Globals.stringToDataType[ json_type ];

                LLink link = new LLink(id, type, origin_id, origin_slot, target_id, target_slot);
                links.Add(link);
                links_by_id[link.id] = link;
            }

            var json_nodes = root["nodes"];
            for (int i = 0; i < json_nodes.Count; ++i)
            {
                var json_node = json_nodes[i];
                string node_type = json_node["type"];
                Debug.Log(node_type);
                LGraphNode node = LiteGraph.Globals.createNodeType(node_type);
                if (node == null)
                {
                    Debug.Log("Error: node type not found: " + node_type);
                    has_errors = true;
                    continue;
                }
                node.graph = this;
                nodes.Add(node);
                node.configure(json_node);
            }

            sortByExecutionOrder();
        }

        public float getOutput(string name, float def_value)
        {
            if (!outputs.ContainsKey(name))
                return def_value;
            return outputs[name];
        }

    }

    public class Main
    {
        public static void Init()
        {
            Main.loadNodes();
        }

        public static void loadNodes()
        {
            Globals.registerType(WatchNode.type, () => new WatchNode() );
            Globals.registerType(RandomNumberNode.type, () => new RandomNumberNode());
            Globals.registerType(ConstNumberNode.type, () => new ConstNumberNode());
            Globals.registerType(TimeNode.type, () => new TimeNode());
            Globals.registerType(ConditionNode.type, () => new ConditionNode());
            Globals.registerType(GraphOutputNode.type, () => new GraphOutputNode());
            Globals.registerType(GateNode.type, () => new GateNode());

        }

        public static void test()
        {
            Debug.Log("Testing Graph...");
            LGraph graph = new LGraph();
            LGraphNode node1 = LiteGraph.Globals.createNodeType("math/rand");
            graph.add(node1);
            LGraphNode node2 = LiteGraph.Globals.createNodeType("basic/watch");
            graph.add(node2);
            node1.connect(0,node2,0);

            for(int i = 0; i < 100; ++i)
                graph.runStep();
        }
    }
}