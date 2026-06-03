import { useState, useEffect } from "react";
import { useContractAnalysis } from "./useContractAnalysis";

/**
 * useDashboardState
 *
 * Single Responsibility: Owns all dashboard-level UI state — sidebar open/close,
 * active report selection, and the bridge between the history sidebar and the
 * contract analysis workspace. Keeps page.tsx a pure layout renderer.
 */
export function useDashboardState() {
  const { state, actions } = useContractAnalysis();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // Collapse sidebar by default on mobile viewports (runs once on mount)
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  /** Load a historical report into the workspace without triggering a new analysis. */
  const handleSelectReport = (
    threatMatrix: any,
    filename: string,
    reportId: string
  ) => {
    actions.setReport(threatMatrix);
    actions.setStatus("complete");
    actions.setFile(new File([], filename));
    actions.setErrorMessage("");
    actions.setApiCallCount(0);
    actions.setPipelineStatus("");
    setActiveReportId(reportId);

    // Close the drawer on mobile after selection
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  /** Reset analysis workspace and deselect any active historical report. */
  const handleReset = () => {
    actions.reset();
    setActiveReportId(null);
  };

  return {
    // Analysis state (passed through from useContractAnalysis)
    state,
    // Analysis actions with reset overridden to also clear activeReportId
    actions: { ...actions, reset: handleReset },
    // Dashboard-level UI state
    isSidebarOpen,
    setIsSidebarOpen,
    activeReportId,
    handleSelectReport,
  };
}
