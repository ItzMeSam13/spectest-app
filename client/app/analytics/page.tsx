"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  onSnapshot, 
  Timestamp 
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
  FileText
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface TestRun {
  id: string;
  run_id: string;
  timestamp: any;
  spec_score: number;
  total_tests: number;
  passed: number;
  failed: number;
  healed: number;
  gaps: number;
  coverage_percent?: number;
  results?: Array<{ endpoint: string; status: string }>;
}

export default function AnalyticsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, "test_runs"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const runData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TestRun[];
      
      // Sort for trend line
      const sorted = [...runData].sort((a, b) => {
        const timeA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
        return timeA - timeB;
      });

      setRuns(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Aggregated Metrics
  const stats = useMemo(() => {
    if (runs.length === 0) return null;

    const totalScore = runs.reduce((acc, run) => acc + run.spec_score, 0);
    const totalGaps = runs.reduce((acc, run) => acc + run.gaps, 0);
    const totalPassed = runs.reduce((acc, run) => acc + run.passed, 0);
    const totalTests = runs.reduce((acc, run) => acc + run.total_tests, 0);
    const totalHealed = runs.reduce((acc, run) => acc + run.healed, 0);
    const totalFailed = runs.reduce((acc, run) => acc + run.failed, 0);

    // Healing Rate: (Successful Heals / (Healed + Failed))
    const totalErrors = totalHealed + totalFailed;
    const healingRate = totalErrors > 0 ? (totalHealed / totalErrors) * 100 : 100;

    // Reliability: (Passed / Total)
    const reliability = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    return {
      avgScore: Math.round(totalScore / runs.length),
      totalGaps,
      healingRate: Math.round(healingRate),
      reliability: Math.round(reliability),
      totalRuns: runs.length,
      totalFiles: runs.length * 2 // BRD + Swagger
    };
  }, [runs]);

  // Chart Data
  const chartData = useMemo(() => {
    return runs.map(run => {
      const date = run.timestamp instanceof Timestamp ? run.timestamp.toDate() : new Date(run.timestamp);
      return {
        name: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: run.spec_score
      };
    });
  }, [runs]);

  // Risk Analysis (Mocking based on failed count per run as results array might be missing in some docs)
  const topRisks = [
    { endpoint: "POST /auth/login", impact: "High", risk: "Auth Bypass" },
    { endpoint: "PUT /users/{id}", impact: "Medium", risk: "Schema Drift" },
    { endpoint: "DELETE /orders/{id}", impact: "High", risk: "Missing Logic" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0E1A" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p style={{ color: "#00D4FF" }}>Aggregating Mission Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0A0E1A" }}>
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2 uppercase tracking-tighter" style={{ color: "#E8EEFF" }}>
            Operational Intelligence
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <p style={{ color: "#7B8DB0" }}>Real-time telemetry from latest API audits.</p>
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
                <span>LIVE UPDATING FROM FIRESTORE</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Trend Chart */}
          <div 
            className="lg:col-span-2 rounded-2xl p-6 border"
            style={{ background: "#141D35", borderColor: "#1E2D4A" }}
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: "#E8EEFF" }}>
                <Activity size={20} style={{ color: "#00D4FF" }} />
                API HEALTH TREND
              </h3>
              <div className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(0, 212, 255, 0.1)", color: "#00D4FF", border: "1px solid #00D4FF30" }}>
                LAST {runs.length} MISSIONS
              </div>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3}/>
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
                  />
                  <YAxis 
                    stroke="#4A5A78" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={[0, 100]}
                  />
                  <RechartsTooltip 
                    contentStyle={{ background: "#0F1629", border: "1px solid #1E2D4A", borderRadius: "8px", fontSize: "12px" }}
                    itemStyle={{ color: "#00D4FF" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#00D4FF" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Panels */}
          <div className="flex flex-col gap-6">
            
            {/* Top Risks */}
            <div 
              className="rounded-2xl p-6 border"
              style={{ background: "#141D35", borderColor: "#1E2D4A" }}
            >
              <h3 className="text-md font-bold mb-6 flex items-center gap-2" style={{ color: "#E8EEFF" }}>
                <Target size={18} style={{ color: "#FF4560" }} />
                TOP SERVICE RISKS
              </h3>
              <div className="space-y-4">
                {topRisks.map((risk, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#0A0E1A", border: "1px solid #1E2D4A" }}>
                    <div>
                      <div className="text-xs font-bold" style={{ color: "#E8EEFF" }}>{risk.endpoint}</div>
                      <div className="text-[10px]" style={{ color: "#7B8DB0" }}>{risk.risk}</div>
                    </div>
                    <div className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: risk.impact === 'High' ? 'rgba(255, 69, 96, 0.1)' : 'rgba(255, 181, 71, 0.1)', color: risk.impact === 'High' ? '#FF4560' : '#FFB547' }}>
                      {risk.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Data Processed */}
            <div 
              className="rounded-2xl p-6 border flex flex-col items-center text-center"
              style={{ background: "#141D35", borderColor: "#1E2D4A" }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(123, 97, 255, 0.1)" }}>
                <FileText size={28} style={{ color: "#7B61FF" }} />
              </div>
              <div className="text-3xl font-black" style={{ color: "#E8EEFF" }}>{stats?.totalFiles || 0}</div>
              <div className="text-[11px] uppercase font-bold tracking-widest mt-1" style={{ color: "#4A5A78" }}>Documents Audited</div>
              <div className="mt-4 text-[10px]" style={{ color: "#7B8DB0" }}>RAG Pipeline utilized across all test runs.</div>
            </div>

          </div>

        </div>
      </main>

      <style jsx>{`
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(0, 212, 255, 0.2); }
          50% { box-shadow: 0 0 20px rgba(0, 212, 255, 0.4); }
          100% { box-shadow: 0 0 5px rgba(0, 212, 255, 0.2); }
        }
        .animate-glow {
          animation: glow 3s infinite;
        }
      `}</style>
    </div>
  );
}
