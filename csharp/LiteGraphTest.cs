using System.Collections;
using System.Collections.Generic;
using UnityEngine;

using LiteGraph;


public class LiteGraphTest : MonoBehaviour
{

    public TextAsset graph_file = null;

    private LGraph graph = null;
    public bool graph_has_errors = false;

    public float output_value = 0;

    // Start is called before the first frame update
    void Start()
    {
        System.Diagnostics.Debug.WriteLine("Test!");
        LiteGraph.Main.Init();

        graph = new LGraph();


        if (!graph_file)
        {
            Debug.Log("Testing Base Graph...");
            LGraphNode node1 = LiteGraph.Globals.createNodeType("math/rand");
            graph.add(node1);
            LGraphNode node2 = LiteGraph.Globals.createNodeType("basic/watch");
            graph.add(node2);
            node1.connect(0, node2, 0);
        }
        else {
            Debug.Log("Testing File Graph...");
            string text = graph_file.text;
            graph.fromJSONText(text);
        }

        graph_has_errors = graph.has_errors;

    }

    // Update is called once per frame
    void Update()
    {
        if(graph != null)
            graph.runStep( Time.deltaTime );
        output_value = graph.getOutput("output",0);
    }
}
