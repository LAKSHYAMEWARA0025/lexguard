import { StateGraph } from "@langchain/langgraph";
import { GraphState } from "./state";
import { queryExpander } from "./nodes/queryExpander";

// Define the workflow
const workflow = new StateGraph(GraphState)
  .addNode("queryExpander", queryExpander)
  .addEdge("__start__", "queryExpander")
  .addEdge("queryExpander", "__end__"); // We will change this to point to the Retriever later

// Compile the graph
export const analyzeGraph = workflow.compile();
