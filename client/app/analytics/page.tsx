"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  onSnapshot, 
  Timestamp,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/shared/Navbar";
import { 
  Activity, 
  AlertCircle, 
  BarChart3, 
  ShieldCheck,
  TrendingUp,
  Zap,
  Target,
  FileText,
  ChevronRight
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface TestResult {
  endpoint: string;
  method: string;
  status: string;         // PASS | FAIL | HEALED
  status_code: number;
  details?: string;
  technical_summary?: string;
  failure_dynamics?: string;
}

interface TestRun {
  id: string;
  run_id: string;
  timestamp: any;
  spec_score: number;
  total_tests?: number;
  passed?: number;
  failed?: number;
  healed?: number;
  gaps?: number;
  results?: TestResult[];
  test_results?: TestResult[];
  tabs?: {
    results?: { entries?: TestResult[] };
    gaps?: { entries?: any[]; total_gaps?: number };
    security?: { overall_risk?: string; findings?: any[] };
    recommendations?: { items?: string[] };
  };
}

interface RiskItem {
  endpoint: string;
  count: number;
  risk: string;
  impact: 'High' | 'Medium' | 'Low';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Fetch all runs for global aggregation
    const q = query(collection(db, "test_runs"), orderBy("timestamp", "desc"));

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

  // ─── Aggregation: Global Vitals ───────────────────────────────────────────
  const stats = useMemo(() => {
    if (runs.length === 0) return null;

    let totalGaps = 0;
    let totalPassed = 0;
    let totalTests = 0;
    let totalHealed = 0;
    let totalFailed = 0;
    let passRateSum = 0;

    runs.forEach(run => {
      const enrichedResults = run.tabs?.results?.entries || run.results || run.test_results || [];
      const pass = enrichedResults.filter((r: any) => (r.status || (r.passed ? "PASS" : "FAIL")) === "PASS").length || run.passed || 0;
      const fail = enrichedResults.filter((r: any) => (r.status || (r.passed ? "PASS" : "FAIL")) === "FAIL").length || run.failed || 0;
      const healed = enrichedResults.filter((r: any) => r.status === "HEALED" || r.self_healed).length || run.healed || 0;
      const total = enrichedResults.length || run.total_tests || (pass + fail + healed) || 1;
      
      totalGaps += (run.tabs?.gaps?.total_gaps || run.gaps || 0);
      totalPassed += pass;
      totalFailed += fail;
      totalHealed += healed;
      totalTests += total;

      const pRate = Math.min(Math.round(((pass + healed) / total) * 100), 100);
      passRateSum += pRate;
    });

    const avgPassRate = passRateSum / runs.length;
    const totalErrors = totalHealed + totalFailed;
    const healingRate = totalErrors > 0 ? (totalHealed / totalErrors) * 100 : 100;
    const reliability = totalTests > 0 ? ((totalPassed + totalHealed) / totalTests) * 100 : 0;

    return {
      avgScore: Math.round(avgPassRate),
      totalGaps,
      healingRate: Math.round(healingRate),
      reliability: Math.round(reliability),
      totalRuns: runs.length,
      totalFiles: runs.length * 2
    };
  }, [runs]);

  const chartData = useMemo(() => {
    return [...runs]
      .slice(0, 10)
      .reverse() // Chronological order
      .map((run, index) => {
        let dateLabel = "Unknown";
        try {
          if (run.timestamp instanceof Timestamp) {
            dateLabel = run.timestamp.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          } else if (run.timestamp?.seconds) {
            dateLabel = new Date(run.timestamp.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          } else if (run.timestamp) {
            const d = new Date(run.timestamp);
            if (!isNaN(d.getTime())) dateLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
          }
        } catch (e) {
          dateLabel = run.run_id?.slice(0, 4) || "Run";
        }

        const enrichedResults = run.tabs?.results?.entries || run.results || run.test_results || [];
        const pass = enrichedResults.filter((r: any) => (r.status || (r.passed ? "PASS" : "FAIL")) === "PASS").length || run.passed || 0;
        const fail = enrichedResults.filter((r: any) => (r.status || (r.passed ? "PASS" : "FAIL")) === "FAIL").length || run.failed || 0;
        const healed = enrichedResults.filter((r: any) => r.status === "HEALED" || r.self_healed).length || run.healed || 0;
        const total = enrichedResults.length || run.total_tests || (pass + fail + healed) || 1;

        const derivedRate = Math.min(Math.round(((pass + healed) / total) * 100), 100);
        let score = (run.spec_score != null && run.spec_score > 0)
          ? Math.min(Math.round(run.spec_score), 100)
          : derivedRate;

        return {
          // Recharts bugs out on hover if XAxis names are duplicated (e.g. multiple runs on same day). Add unique suffix.
          name: `${dateLabel} | ${index}`,
          displayLabel: dateLabel, 
          score,
          pass,
          fail,
          healed,
          total,
          details: `Run #${run.run_id?.slice(0, 8)}`
        };
      });
  }, [runs]);

  // ─── Aggregation: Top Service Risks ──────────────────────────────────────
  const topRisks = useMemo(() => {
    const failureMap: Record<string, { count: number; detail: string; method: string }> = {};

    runs.forEach(run => {
      const results = run.tabs?.results?.entries || run.results || run.test_results || [];
      results.forEach(res => {
        if (res.status === "FAIL" || (res.status_code && res.status_code >= 400)) {
          const key = `${res.method} ${res.endpoint}`;
          if (!failureMap[key]) {
            failureMap[key] = { count: 0, detail: res.details || "Unknown Error", method: res.method };
          }
          failureMap[key].count += 1;
          // Keep most recent or most detailed error
          if (res.details && res.details.length > failureMap[key].detail.length) {
            failureMap[key].detail = res.details;
          }
        }
      });
    });

    return Object.entries(failureMap)
      .map(([endpoint, data]) => {
        let impact: 'High' | 'Medium' | 'Low' = 'Low';
        if (data.count >= 5) impact = 'High';
        else if (data.count >= 3) impact = 'Medium';

        return {
          endpoint,
          count: data.count,
          risk: data.detail.slice(0, 40) + (data.detail.length > 40 ? "..." : ""),
          impact
        } as RiskItem;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [runs]);

  // ─── Render Helpers ────────────────────────────────────────────────────────

  const SkeletonCard = () => (
    <div className="flex items-center justify-between p-3 rounded-xl animate-pulse" style={{ background: "#0A0E1A", border: "1px solid #1E2D4A" }}>
      <div className="space-y-2 flex-1">
        <div className="h-3 w-1/2 bg-[#1E2D4A] rounded" />
        <div className="h-2 w-1/3 bg-[#141D35] rounded" />
      </div>
      <div className="h-4 w-12 bg-[#1E2D4A] rounded ml-4" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: "#0A0E1A", fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold mb-2 uppercase tracking-tighter" style={{ color: "#E8EEFF" }}>
            Operational Intelligence
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <p style={{ color: "#7B8DB0", fontSize: "14px" }}>Dynamic telemetry aggregated from {runs.length} test missions.</p>
          </div>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Avg SpecScore™", value: `${stats?.avgScore || 0}%`, icon: BarChart3, color: "#00D4FF", pulse: true },
            { label: "System Reliability", value: `${stats?.reliability || 0}%`, icon: ShieldCheck, color: "#00E396" },
            { label: "AI Healing Rate", value: `${stats?.healingRate || 0}%`, icon: Zap, color: "#FFB547" },
            { label: "Total Gaps", value: stats?.totalGaps || 0, icon: AlertCircle, color: "#FF4560" }
          ].map((s) => (
            <div 
              key={s.label}
              className={`relative rounded-2xl p-6 transition-all border ${s.pulse ? 'animate-glow' : ''}`}
              style={{ background: "#141D35", borderColor: "#1E2D4A" }}
            >
              <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#4A5A78" }}>{s.label}</p>
                <s.icon size={18} style={{ color: s.color }} />
              </div>
              <div className="text-4xl font-black mb-1" style={{ color: "#E8EEFF" }}>{s.value}</div>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: "#7B8DB0" }}>
                <TrendingUp size={10} /> 
                <span className="uppercase font-bold">Live Context</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6 pb-20">
          
          {/* Top Layer - Chart */}
          <div 
            className="w-full rounded-2xl p-7 border"
            style={{ background: "#141D35", borderColor: "#1E2D4A" }}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#E8EEFF" }}>
                <Activity size={20} style={{ color: "#00D4FF" }} />
                API HEALTH TREND
              </h3>
              <div className="text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full" style={{ background: "rgba(0, 212, 255, 0.1)", color: "#00D4FF", border: "1px solid #00D4FF30" }}>
                PASS RATE %
              </div>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#4A5A78" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: '#4A5A78' }}
                    tickFormatter={(val) => String(val).split(' | ')[0]}
                  />
                  <YAxis 
                    stroke="#4A5A78" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={[0, 100]}
                    tick={{ fill: '#4A5A78' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload;
                      const scoreVal = typeof p.score === 'number' ? p.score : Number(payload[0].value);
                      const col = scoreVal >= 80 ? "#00E396" : scoreVal >= 50 ? "#FFB547" : "#FF4560";
                      return (
                        <div style={{ background: "#0A1020", border: "1px solid #1E2D4A", borderRadius: 12, padding: "12px 16px", minWidth: 190, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                          <div style={{ color: "#7B8DB0", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
                            {p.displayLabel || String(label || "").split(' | ')[0]}
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                            <span style={{ fontSize: 28, fontWeight: 900, color: col }}>{scoreVal}%</span>
                            <span style={{ fontSize: 11, color: "#7B8DB0" }}>Pass Rate</span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", fontSize: 10, marginBottom: 6 }}>
                            <span style={{ color: "#00E396" }}>✓ Passed</span><span style={{ color: "#00E396", fontWeight: 700 }}>{p.pass ?? "—"}</span>
                            <span style={{ color: "#FF4560" }}>✗ Failed</span><span style={{ color: "#FF4560", fontWeight: 700 }}>{p.fail ?? "—"}</span>
                            <span style={{ color: "#FFB547" }}>⚡ Healed</span><span style={{ color: "#FFB547", fontWeight: 700 }}>{p.healed ?? "—"}</span>
                            <span style={{ color: "#7B8DB0" }}>Total</span><span style={{ color: "#7B8DB0", fontWeight: 700 }}>{p.total ?? "—"}</span>
                          </div>
                          <div style={{ fontSize: 10, color: "#4A5A78", fontFamily: "JetBrains Mono, monospace", borderTop: "1px solid #1E2D4A", paddingTop: 6 }}>
                            {p.details}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#00D4FF" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    animationDuration={2500}
                    activeDot={{ r: 7, stroke: '#00D4FF', strokeWidth: 2, fill: '#0A0E1A' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Layer - 3 Symmetric Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Top Risks (Panel 1) */}
            <div 
              className="rounded-2xl p-7 border"
              style={{ background: "#141D35", borderColor: "#1E2D4A" }}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-md font-bold flex items-center gap-2" style={{ color: "#E8EEFF" }}>
                  <Target size={18} style={{ color: "#FF4560" }} />
                  TOP SERVICE RISKS
                </h3>
                {topRisks.length > 0 && (
                  <span className="text-[10px] text-[#7B8DB0] font-bold uppercase">{topRisks.length} Identifiers</span>
                )}
              </div>
              
              <div className="space-y-4">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : topRisks.length === 0 ? (
                  <div className="text-center py-8">
                    <p style={{ color: "#4A5A78", fontSize: "12px" }}>No significant service risks detected across missions.</p>
                  </div>
                ) : (
                  topRisks.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-3.5 rounded-xl transition-all hover:scale-[1.02]" style={{ background: "#0D1425", border: "1px solid #1E2D4A" }}>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate mb-1" style={{ color: "#00D4FF" }}>{risk.endpoint}</div>
                        <div className="text-[10px] truncate" style={{ color: "#7B8DB0" }}>{risk.risk}</div>
                      </div>
                      <div className="ml-3 flex flex-col items-end">
                        <div 
                          className="text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter" 
                          style={{ 
                            background: risk.impact === 'High' ? 'rgba(255, 69, 96, 0.15)' : risk.impact === 'Medium' ? 'rgba(255, 181, 71, 0.15)' : 'rgba(0, 212, 255, 0.15)', 
                            color: risk.impact === 'High' ? '#FF4560' : risk.impact === 'Medium' ? '#FFB547' : '#00D4FF',
                            border: `1px solid ${risk.impact === 'High' ? '#FF456040' : risk.impact === 'Medium' ? '#FFB54740' : '#00D4FF40'}`
                          }}
                        >
                          {risk.impact}
                        </div>
                        <span className="text-[9px] mt-1 font-bold" style={{ color: "#4A5A78" }}>{risk.count} Failures</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Healing Efficiency */}
            <div 
              className="rounded-2xl p-7 border"
              style={{ background: "#141D35", borderColor: "#1E2D4A" }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold flex items-center gap-2" style={{ color: "#E8EEFF" }}>
                  <Zap size={18} style={{ color: "#FFB547" }} />
                  HEALING EFFICIENCY
                </h3>
              </div>
              <div className="flex flex-col items-center">
                <div style={{ height: 160, width: "100%", position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Healed', value: stats?.healingRate || 0 },
                          { name: 'Failed', value: 100 - (stats?.healingRate || 0) },
                        ]}
                        cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value"
                      >
                        <Cell fill="#FFB547" stroke="none" />
                        <Cell fill="#FF4560" stroke="none" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "#FFB547" }}>{stats?.healingRate || 0}%</div>
                  </div>
                </div>
                <p className="text-[10px] text-center mt-2 leading-relaxed" style={{ color: "#7B8DB0" }}>
                  Percentage of identified failures successfully recovered by Llama 3.2 logic overrides.
                </p>
              </div>
            </div>

            {/* Total Data Processed */}
            <div 
              className="rounded-2xl p-7 border flex flex-col items-center text-center relative overflow-hidden group"
              style={{ background: "#141D35", borderColor: "#1E2D4A" }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText size={80} color="#7B61FF" />
              </div>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 rotate-3 group-hover:rotate-0 transition-transform" style={{ background: "rgba(123, 97, 255, 0.15)", border: "1px solid rgba(123, 97, 255, 0.3)" }}>
                <FileText size={32} style={{ color: "#7B61FF" }} />
              </div>
              <div className="text-4xl font-black" style={{ color: "#E8EEFF" }}>{stats?.totalFiles || 0}</div>
              <div className="text-[11px] uppercase font-bold tracking-[0.2em] mt-2 mb-4" style={{ color: "#4A5A78" }}>Documents Audited</div>
              <p className="text-[10px] leading-relaxed" style={{ color: "#7B8DB0" }}>Spec-First validation engine successfully processed business requirements and API schemas.</p>
            </div>

          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(0, 212, 255, 0.1); }
          50% { box-shadow: 0 0 25px rgba(0, 212, 255, 0.25); }
          100% { box-shadow: 0 0 5px rgba(0, 212, 255, 0.1); }
        }
        .animate-glow {
          animation: glow 4s infinite;
        }
      `}</style>
    </div>
  );
}
