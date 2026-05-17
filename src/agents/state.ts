import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  documentId: Annotation<string>(),
  queries: Annotation<string[]>({
    reducer: (curr, next) => next, // Overwrite with new queries
    default: () => [],
  }),
  retrievedChunks: Annotation<any[]>({
    reducer: (curr, next) => next, // Overwrite with new chunks
    default: () => [],
  }),
  risks: Annotation<any[]>({
    reducer: (curr, next) => next,
    default: () => [],
  }),
  finalReport: Annotation<any>({
    reducer: (curr, next) => next,
    default: () => null,
  })
});
