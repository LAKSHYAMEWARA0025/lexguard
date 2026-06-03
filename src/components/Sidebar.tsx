"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { FileText, LogOut, X, History, Key, RefreshCw, ChevronRight, Upload, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  filename: string;
  threat_matrix: any;
  created_at: string;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  onClose: () => void;
  onSelectReport: (threatMatrix: any, filename: string, reportId: string) => void;
  activeReportId?: string | null;
  resetWorkspace: () => void;
}

export default function Sidebar({
  isSidebarOpen,
  onClose,
  onSelectReport,
  activeReportId,
  resetWorkspace,
}: SidebarProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  // Keep track of authenticated user state
  useEffect(() => {
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch reports function
  const fetchReports = async () => {
    if (!user) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id, filename, threat_matrix, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[Sidebar] Error fetching reports:", error);
      } else {
        setReports(data || []);
      }
    } catch (err) {
      console.error("[Sidebar] Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reports when user logs in/changes
  useEffect(() => {
    fetchReports();

    if (!user) return;

    // Realtime subscription to instantly update sidebar when backend finishes saving new reports
    const channel = supabase
      .channel("reports-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reports",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("[Sidebar] Realtime update received:", payload);
          setReports((prev) => [payload.new as Report, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Unknown Date";
    }
  };

  return (
    <>
      {/* ── Mobile Drawer Backdrop Overlay ── */}
      {isSidebarOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs md:hidden transition-opacity duration-300"
        />
      )}

      {/* ── Sidebar Navigation Panel ── */}
      <aside
        className={`fixed md:relative top-0 bottom-0 left-0 z-50 flex flex-col h-screen bg-[#0a0a0a] text-neutral-200 transition-all duration-300 ease-in-out shrink-0 overflow-hidden
          ${isSidebarOpen ? "w-[260px] border-r border-white/[0.06] translate-x-0" : "w-0 border-r-0 -translate-x-full md:translate-x-0"}
        `}
      >
        {/* Fixed-width wrapper to prevent text/layout squashing during toggle transitions */}
        <div className="w-[260px] h-full flex flex-col flex-shrink-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[#e8530e] font-black text-lg tracking-tighter">VAN</span>
              <span className="text-neutral-500 font-light text-lg tracking-tighter">GUARD</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Small upload button to navigate to the upload page */}
              <button
                onClick={() => router.push("/")}
                className="hidden md:inline-flex items-center justify-center p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
                title="Upload New File"
              >
                <Upload size={16} />
              </button>
              {/* Close button for mobile drawer */}
            <button
              onClick={onClose}
              className="md:hidden flex items-center justify-center p-1 rounded-md text-neutral-500 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
            </div>
          </div>

          {/* New Analysis Button */}
          <div className="px-4 mt-4">
            <button
              onClick={() => {
                resetWorkspace && resetWorkspace();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#e8530e] text-black font-semibold rounded-lg hover:bg-[#ff6a22] transition-colors shadow-[0_6px_18px_rgba(232,83,14,0.16)]"
            >
              <Plus size={14} />
              <span className="text-sm">New Analysis</span>
            </button>
          </div>

          {/* History Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 flex flex-col min-h-0 [&::-webkit-scrollbar]:w-[4px]">
            <div className="flex items-center justify-between text-neutral-500 px-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold">
                <History size={12} className="text-[#e8530e]/70" />
                <span>Analysis History</span>
              </div>
              {user && (
                <button
                  onClick={fetchReports}
                  className="text-neutral-600 hover:text-[#e8530e] transition-colors p-1"
                  title="Refresh history"
                >
                  <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                </button>
              )}
            </div>

            {/* List items */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1 min-h-0">
              {!user ? (
                // Locked/Logged Out State
                <div className="flex flex-col items-center justify-center text-center py-10 px-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl h-60">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-4 text-[#e8530e]/80">
                    <Key size={16} />
                  </div>
                  <p className="text-xs font-semibold text-neutral-400 mb-1">History Locked</p>
                  <p className="text-[10px] text-neutral-600 leading-normal mb-5 max-w-[160px]">
                    Sign in to view your past contract analyses.
                  </p>
                  <button
                    onClick={() => router.push("/login")}
                    className="w-full py-2 bg-[#e8530e] hover:bg-[#ff6a20] text-black text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(232,83,14,0.15)]"
                  >
                    Sign In
                  </button>
                </div>
              ) : loading && reports.length === 0 ? (
                // Loading Spinner
                <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
                  <RefreshCw size={20} className="animate-spin text-[#e8530e]/50 mb-2" />
                  <span className="text-[10px] tracking-wider uppercase font-semibold">Loading...</span>
                </div>
              ) : reports.length === 0 ? (
                // Empty State
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 text-neutral-600">
                  <FileText size={24} strokeWidth={1.5} className="mb-2 opacity-30" />
                  <p className="text-xs font-medium">No past reports</p>
                  <p className="text-[10px] mt-1 opacity-70">Analyze a contract to save details.</p>
                </div>
              ) : (
                // Reports List
                reports.map((report) => {
                  const isActive = activeReportId === report.id;
                  return (
                    <button
                      key={report.id}
                      onClick={() => onSelectReport(report.threat_matrix, report.filename, report.id)}
                      className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 group flex items-start gap-3 relative overflow-hidden
                        ${
                          isActive
                            ? "bg-[#e8530e]/10 border-[#e8530e]/30 text-white shadow-[0_0_15px_rgba(232,83,14,0.05)]"
                            : "bg-white/[0.01] border-white/[0.04] text-neutral-400 hover:text-neutral-200 hover:border-white/[0.1] hover:bg-white/[0.03]"
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-3 bottom-3 w-[2.5px] rounded-full bg-[#e8530e]" />
                      )}
                      <FileText
                        size={16}
                        className={`shrink-0 mt-0.5 transition-colors
                          ${isActive ? "text-[#e8530e]" : "text-neutral-500 group-hover:text-neutral-400"}
                        `}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate pr-2 group-hover:text-white transition-colors">
                          {report.filename}
                        </p>
                        <p className="text-[9px] text-neutral-600 mt-1 uppercase tracking-wider font-mono">
                          {formatDate(report.created_at)}
                        </p>
                      </div>
                      <ChevronRight
                        size={12}
                        className={`shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity duration-200
                          ${isActive ? "text-[#e8530e] opacity-75" : "text-neutral-600"}
                        `}
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer auth panel */}
          {user && (
            <div className="p-4 border-t border-white/[0.06] flex-shrink-0">
              <div className="mb-3 px-2 flex flex-col">
                <span className="text-[9px] text-neutral-600 uppercase tracking-widest font-mono">
                  Active Session
                </span>
                <span className="text-xs text-neutral-400 truncate mt-0.5" title={user.email}>
                  {user.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold bg-[#e8530e] hover:bg-[#ff6a20] text-black transition-colors shadow-[0_0_15px_rgba(232,83,14,0.2)] hover:shadow-[0_0_20px_rgba(232,83,14,0.35)]"
              >
                <LogOut size={13} strokeWidth={2.5} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
