"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/shared/Navbar";
import { 
  Clock, 
  Zap, 
  ChevronRight, 
  Database,
  Search,
  LayoutGrid,
  List as ListIcon
} from "lucide-react";

interface TestRun {
  id: string;
  run_id: string;
  timestamp: Timestamp | Date;
  spec_score: number;
  total_tests: number;
  passed: number;
  failed: number;
  healed: number;
  gaps: number;
  coverage_percent?: number;
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(
      collection(db, "test_runs"), 
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const runData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestRun[];
      
      setRuns(runData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (ts: any) => {
    const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getScoreColor = (passRate: number) => {
    if (passRate >= 80) return { main: "#00E396", bg: "rgba(0, 227, 150, 0.1)" };
    if (passRate >= 50) return { main: "#FFB547", bg: "rgba(255, 181, 71, 0.1)" };
    return { main: "#FF4560", bg: "rgba(255, 69, 96, 0.1)" };
  };

  return (
    <div className="min-h-screen" style={{ background: "#0A0E1A" }}>
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: "#E8EEFF" }}>
              Mission Archive
            </h1>
            <p style={{ color: "#7B8DB0" }}>
              Review historical API audits and SpecScore trends.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div 
              className="relative flex items-center rounded-xl px-4 py-2"
              style={{ background: "#141D35", border: "1px solid #1E2D4A" }}
            >
              <Search size={16} className="mr-2" style={{ color: "#4A5A78" }} />
              <input 
                placeholder="Search run ID..." 
                className="bg-transparent border-none outline-none text-sm w-40"
                style={{ color: "#E8EEFF" }}
              />
            </div>
            <button 
              onClick={() => router.push("/dashboard")}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              Launch New Audit
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="h-48 rounded-2xl animate-pulse"
                style={{ background: "#141D35", border: "1px solid #1E2D4A" }}
              />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center py-24 rounded-3xl"
            style={{ background: "#0F1629", border: "1px dashed #1E2D4A" }}
          >
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ background: "rgba(0, 212, 255, 0.1)" }}
            >
              <Database size={32} style={{ color: "#00D4FF" }} />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: "#E8EEFF" }}>No Data Found</h3>
            <p className="mb-8 max-w-sm text-center" style={{ color: "#7B8DB0" }}>
              The archive is empty. Start your first autonomous API audit to populate this mission log.
            </p>
            <button 
              onClick={() => router.push("/dashboard")}
              className="py-3 px-8 rounded-xl font-bold transition-all"
              style={{ 
                background: "rgba(0, 212, 255, 0.1)", 
                border: "1px solid #00D4FF",
                color: "#00D4FF"
              }}
            >
              Launch First Audit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {runs.map((run) => {
              const passRate = Math.min(Math.round((((run.passed || 0) + (run.healed || 0)) / (run.total_tests || 1)) * 100), 100);
              const colors = getScoreColor(passRate);
              return (
                <div 
                  key={run.id}
                  className="group relative rounded-2xl p-6 transition-all hover:translate-y-[-4px]"
                  style={{ 
                    background: "#141D35", 
                    border: "1px solid #1E2D4A",
                    boxShadow: "0 10px 30px -15px rgba(0,0,0,0.5)"
                  }}
                >
                  {/* Decorative glow */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
                    style={{ 
                      boxShadow: `0 0 20px -5px ${colors.main}`,
                      borderRadius: "16px"
                    }}
                  />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#4A5A78" }}>
                          #{run.run_id}
                        </span>
                        <div className="w-1 h-1 rounded-full" style={{ background: "#4A5A78" }} />
                        <span className="text-xs" style={{ color: "#4A5A78" }}>
                          Scan Meta
                        </span>
                      </div>
                      <h3 className="text-lg font-bold" style={{ color: "#E8EEFF" }}>
                        Audit Run {run.run_id.slice(0, 4)}
                      </h3>
                    </div>
                    
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                      style={{ 
                        color: colors.main, 
                        background: colors.bg,
                        border: `1px solid ${colors.main}30`
                      }}
                    >
                      {passRate}%
                    </div>
                  </div>

                  <div className="space-y-4 mb-5">
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#7B8DB0" }}>
                      <Clock size={13} />
                      {formatDate(run.timestamp)}
                    </div>

                    {/* Pass Rate Progress Bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span style={{ color: "#4A5A78", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>PASS RATE</span>
                        <span style={{ color: colors.main, fontSize: 12, fontWeight: 800 }}>{passRate}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#0A0E1A" }}>
                        <div 
                          className="h-full transition-all duration-1000"
                          style={{ width: `${passRate}%`, background: colors.main, boxShadow: `0 0 8px ${colors.main}` }}
                        />
                      </div>
                    </div>

                    {/* Stat Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                      {[
                        { label: "Passed", value: run.passed ?? 0, color: "#00E396" },
                        { label: "Failed", value: run.failed ?? 0, color: "#FF4560" },
                        { label: "Healed", value: run.healed ?? 0, color: "#FFB547" },
                      ].map(s => (
                        <div key={s.label} style={{ background: "#0A0E1A", borderRadius: 8, padding: "8px", textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#4A5A78", letterSpacing: "0.1em" }}>{s.label.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>

                    {/* Healing Rate & Security Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: "#7B8DB0" }}>
                        Healing Rate: <span style={{ color: "#FFB547", fontWeight: 700 }}>
                          {run.healed > 0 ? `${Math.round((run.healed / ((run.failed ?? 0) + run.healed)) * 100)}%` : "0%"}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 800, padding: "3px 8px", borderRadius: 20,
                        background: passRate >= 80 ? "rgba(0,227,150,0.1)" : passRate >= 50 ? "rgba(255,181,71,0.1)" : "rgba(255,69,96,0.1)",
                        color: colors.main, border: `1px solid ${colors.main}40`, letterSpacing: "0.1em"
                      }}>
                        {passRate >= 80 ? "LOW RISK" : passRate >= 50 ? "MEDIUM RISK" : "HIGH RISK"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={() => router.push(`/results/${run.run_id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{ 
                        background: "#1E2D4A", 
                        color: "#E8EEFF",
                        border: "1px solid #2D3D5A"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#2D3D5A";
                        e.currentTarget.style.color = "#00D4FF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#1E2D4A";
                        e.currentTarget.style.color = "#E8EEFF";
                      }}
                    >
                      Logs <ChevronRight size={14} />
                    </button>
                    <button 
                      onClick={() => router.push(`/docs?run_id=${run.run_id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
                      style={{ 
                        background: "rgba(0,212,255,0.08)", 
                        color: "#00D4FF",
                        border: "1px solid #00D4FF30"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0,212,255,0.16)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0,212,255,0.08)";
                      }}
                    >
                      Docs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <style jsx>{`
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
