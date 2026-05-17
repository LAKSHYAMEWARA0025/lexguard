import { StateGraph } from "@langchain/langgraph";
import { GraphState } from "./state";
import { classifierNode } from "./nodes/classifier";
import { queryExpander } from "./nodes/queryExpander";
import { retrieverNode } from "./nodes/retriever";
import { redTeam } from "./nodes/redTeam";
import { verifierNode } from "./nodes/verifier";
import { advisorNode } from "./nodes/advisor";

let analyzeGraph: any = null;

export const getAnalyzeGraph = () => {
  if (!analyzeGraph) {
    const workflow = new StateGraph(GraphState)
      .addNode("classifierNode", classifierNode)
      .addNode("queryExpander", queryExpander)
      .addNode("retrieverNode", retrieverNode)
      .addNode("redTeam", redTeam)
      .addNode("verifierNode", verifierNode)
      .addNode("advisorNode", advisorNode)
      .addEdge("__start__", "classifierNode")
      .addEdge("classifierNode", "queryExpander")
      .addEdge("queryExpander", "retrieverNode")
      .addEdge("retrieverNode", "redTeam")
      .addEdge("redTeam", "verifierNode")
      .addEdge("verifierNode", "advisorNode")
      .addEdge("advisorNode", "__end__");
      
    analyzeGraph = workflow.compile();
  }
  return analyzeGraph;
};
