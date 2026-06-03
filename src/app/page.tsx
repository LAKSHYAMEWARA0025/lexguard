"use client";

import { useDashboardState } from "@/hooks/useDashboardState";
import Sidebar from "@/components/Sidebar";
import Hero from "@/components/Hero";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Home (page.tsx)
 *
 * Single Responsibility: Renders the top-level layout shell — the sidebar,
 * the floating toggle button, and the main Hero workspace. All state logic
 * is delegated to useDashboardState.
 */
export default function Home() {
  const {
    state,
    actions,
    isSidebarOpen,
    setIsSidebarOpen,
    activeReportId,
    handleSelectReport,
    resetWorkspace,
  } = useDashboardState();

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#080808]">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectReport={handleSelectReport}
        activeReportId={activeReportId}
        resetWorkspace={resetWorkspace}
      />

      {/* Sleek desktop-only floating toggle trigger sitting on the right edge of the sidebar */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 items-center justify-center w-5 h-10 rounded-r-lg border border-l-0 border-white/[0.06] hover:border-[#e8530e]/30 bg-[#0a0a0a] text-neutral-500 hover:text-[#e8530e] cursor-pointer shadow-[2px_0_8px_rgba(0,0,0,0.5)] transition-all duration-300 ease-in-out"
        style={{ left: isSidebarOpen ? "259px" : "0px" }}
        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
      >
        {isSidebarOpen
          ? <ChevronLeft size={12} strokeWidth={2.5} />
          : <ChevronRight size={12} strokeWidth={2.5} />
        }
      </button>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Hero
          state={state}
          actions={actions}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
}
