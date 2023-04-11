using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

using SimpleJSON;

namespace LiteGraph
{
    public class ConstNumberNode : LGraphNode
    {
        public static string type = "basic/const";

        public float value = 0;

        public ConstNumberNode()
        {
            this.addOutput("out", DataType.NUMBER );
        }

        override public void onExecute()
        {
            this.setOutputData(0, value );
        }

        override public void onConfigure( JSONNode o)
        {
            JSONNode json_properties = o["properties"];
            value = json_properties["value"].AsFloat;
        }
    }

    public class RandomNumberNode : LGraphNode
    {
        public static string type = "math/rand";

        float min_value = 0;
        float max_value = 1;
        System.Random random = new System.Random();

        public RandomNumberNode()
        {
            this.addOutput("out", DataType.NUMBER );
        }

        override public void onExecute()
        {
            this.setOutputData(0, (float)(min_value + random.NextDouble() * (max_value - min_value)) );
        }

        override public void onConfigure(JSONNode o)
        {
            JSONNode json_properties = o["properties"];
            min_value = json_properties["min"].AsFloat;
            max_value = json_properties["max"].AsFloat;
        }
    }

    public class GraphOutputNode : LGraphNode
    {
        public static string type = "graph/output";

        string name = "";
        DataType datatype = DataType.NUMBER;

        public GraphOutputNode()
        {
            this.addInput("out", datatype);
        }

        override public void onExecute()
        {
            switch (datatype)
            {
                case DataType.NUMBER:
                    float v = this.getInputData(0, 0);
                    graph.outputs[name] = v;
                    break;
            }
        }

        override public void onConfigure(JSONNode o)
        {
            JSONNode json_properties = o["properties"];
            name = json_properties["name"];
            if (json_properties.HasKey("type"))
            {
                string str_type = json_properties["type"];
                if (Globals.stringToDataType.ContainsKey(str_type))
                {
                    datatype = Globals.stringToDataType[str_type];
                    this.inputs[0].type = datatype;
                }
            }
        }
    }

    public class ConditionNode : LGraphNode
    {
        public static string type = "math/condition";

        public enum OPERATION { NONE,GREATER,LOWER,EQUAL,NEQUAL,GEQUAL,LEQUAL,OR,AND };
        static public Dictionary<string, OPERATION> strToOperation = new Dictionary<string, OPERATION> { { "NONE", OPERATION.NONE }, { ">", OPERATION.GREATER }, { "<", OPERATION.LOWER }, { "==", OPERATION.EQUAL }, { "!=", OPERATION.NEQUAL }, { "<=", OPERATION.LEQUAL }, { ">=", OPERATION.GEQUAL }, { "&&", OPERATION.AND }, { "||", OPERATION.OR } };

        public float A = 0;
        public float B = 0;
        public OPERATION OP = OPERATION.EQUAL;

        public ConditionNode()
        {
            this.addOutput("A", DataType.NUMBER );
            this.addOutput("B", DataType.NUMBER );
            this.addOutput("out", DataType.BOOL );
        }

        override public void onExecute()
        {
            float A = this.getInputData(0,this.A);
            float B = this.getInputData(1,this.B);

            bool v = false;
            switch(OP)
            {
                case OPERATION.NONE: v = false; break;
                case OPERATION.GREATER: v = A > B; break;
                case OPERATION.LOWER: v = A < B; break;
                case OPERATION.EQUAL: v = A == B; break;
                case OPERATION.NEQUAL: v = A != B; break;
                case OPERATION.GEQUAL: v = A >= B; break;
                case OPERATION.LEQUAL: v = A <= B; break;
                case OPERATION.OR: v = (A != 0) || (B != 0); break;
                case OPERATION.AND: v = (A != 0) && (B != 0); break;
            }
            this.setOutputData(0, v);
        }

        override public void onConfigure(JSONNode o)
        {
            JSONNode json_properties = o["properties"];

            A = json_properties["A"].AsFloat;
            B = json_properties["B"].AsFloat;
            string op = json_properties["OP"];
            if (strToOperation.ContainsKey(op))
                OP = strToOperation[op];
            else
                Debug.Log("Wrong operation type: " + op);
        }
    }

    public class GateNode : LGraphNode
    {
        public static string type = "math/gate";

        public GateNode()
        {
            this.addInput("v", DataType.BOOL);
            this.addInput("A");
            this.addInput("B");
            this.addOutput("out");
        }

        override public void onExecute()
        {
            bool v = this.getInputData(0, true);
            this.transferData(v ? 1 : 2, 0);
        }
    }

    public class TimeNode : LGraphNode
    {
        public static string type = "basic/time";

        public TimeNode()
        {
            this.addOutput("in ms", DataType.NUMBER );
            this.addOutput("in sec", DataType.NUMBER);
        }

        override public void onExecute()
        {
            this.setOutputData(0, (float)(graph.time * 1000));
            this.setOutputData(1, (float)graph.time);
        }
    }


    public class WatchNode : LGraphNode
    {
        public static string type = "basic/watch";

        public WatchNode()
        {
            this.addInput("in", DataType.NUMBER);
        }

        override public void onExecute()
        {
            float v = this.getInputData(0, 0);
            //Debug.Log("Watch: " + v.ToString());
        }
    }
}
