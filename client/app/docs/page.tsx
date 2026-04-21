"use client"
import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { Navbar } from "@/components/shared/Navbar"
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Zap, 
  BookOpen, 
  ChevronRight, 
  Clock, 
  Download, 
  Printer, 
  ShieldCheck, 
  Workflow, 
  Globe, 
  Lightbulb 
} from "lucide-react"

const BASE = "http://127.0.0.1:8000"

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedResult = {
  endpoint: string
  method: string
  status: string         // PASS | FAIL | HEALED
  status_code: number
  details?: string
  technical_summary?: string
  failure_dynamics?: string
  parameter_audit?: Record<string, any>
  security_implications?: string
  requirement_match?: string
}

type Run = {
  run_id: string
  spec_score: number
  total_tests: number
  passed: number
  failed: number
  healed: number
  timestamp?: { seconds: number }
  results: EnrichedResult[]
  recommendations: string[]
}

const METHOD_COLORS: Record<string, string> = {
  GET:    "#00B7A8",
  POST:   "#7B61FF",
  PUT:    "#FFB547",
  PATCH:  "#FFB547",
  DELETE: "#FF4560",
}

const STATUS_THEMES: Record<string, { color: string; bg: string; icon: any }> = {
  PASS:   { color: "#00E396", bg: "rgba(0,227,150,0.1)", icon: CheckCircle },
  HEALED: { color: "#FFB547", bg: "rgba(255,181,71,0.1)", icon: AlertTriangle },
  FAIL:   { color: "#FF4560", bg: "rgba(255,69,96,0.1)", icon: XCircle },
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const searchParams = useSearchParams()
  const paramRunId = searchParams.get("run_id")

  const [run, setRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchRun = useCallback(async (specificRunId?: string | null) => {
    setLoading(true)
    setError("")
    try {
      if (specificRunId) {
        const docRef = doc(db, "test_runs", specificRunId)
        const snap = await getDoc(docRef)
        if (!snap.exists()) throw new Error(`Run "${specificRunId}" not found.`)
        setRun(snap.data() as Run)
      } else {
        const q = query(collection(db, "test_runs"), orderBy("timestamp", "desc"), limit(1))
        const snap = await getDocs(q)
        if (snap.empty) throw new Error("No audit runs found.")
        setRun(snap.docs[0].data() as Run)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRun(paramRunId)
  }, [paramRunId, fetchRun])

  const ts = run?.timestamp?.seconds
  const runDate = ts ? new Date(ts * 1000).toLocaleString() : "—"
  const total = run ? (run.passed + (run.failed || 0) + (run.healed || 0)) : 0
  const passRate = run ? Math.round(((run.passed + (run.healed || 0)) / Math.max(total, 1)) * 100) : 0

  return (
    <div style={{ background: "#0A0E1A", minHeight: "100vh", color: "#E8EEFF", fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <Navbar />

      <div className="print-container" style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 2rem" }}>
        
        {/* TOP BAR / ACTIONS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{ padding: 8, background: "rgba(0,212,255,0.1)", borderRadius: 10 }}>
                <BookOpen size={20} color="#00D4FF" />
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>Technical Audit Report</h1>
            </div>
            <p style={{ color: "#7B8DB0", fontSize: 13 }}>
              Comprehensive security and compatibility analysis for <span style={{ color: "#E8EEFF" }}>Run #{run?.run_id?.slice(0, 8)}</span>
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }} className="no-print">
            <button
              onClick={() => window.print()}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 18px",
                borderRadius: 8, background: "linear-gradient(135deg, #00D4FF, #7B61FF)",
                border: "none", color: "#0A0E1A", fontSize: 13, fontWeight: 800,
                cursor: "pointer", boxShadow: "0 0 20px rgba(0,212,255,0.2)"
              }}
            >
              <Printer size={16} /> Print Report
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "6rem 0" }}>
            <Zap size={40} color="#00D4FF" style={{ margin: "0 auto 1.5rem", animation: "pulse 1.5s infinite" }} />
            <p style={{ color: "#7B8DB0" }}>Generating technical documentation from Firestore data...</p>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(255,69,96,0.05)", border: "1px solid rgba(255,69,96,0.2)", borderRadius: 16, padding: "3rem", textAlign: "center" }}>
            <XCircle size={40} color="#FF4560" style={{ margin: "0 auto 1.5rem" }} />
            <h3 style={{ fontSize: 18, color: "#E8EEFF", marginBottom: 8 }}>Unable to retrieve report</h3>
            <p style={{ color: "#7B8DB0" }}>{error}</p>
          </div>
        )}

        {run && (
          <>
            {/* EXECUTIVE SUMMARY / VITALS */}
            <div style={{ 
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "1.25rem", marginBottom: "3rem", padding: "1.5rem",
              background: "#141D35", border: "1px solid #1E2D4A", borderRadius: 16
            }}>
              {[
                { label: "SpecScore", value: `${run.spec_score}/100`, sub: "Overall compliance rating", color: run.spec_score >= 80 ? "#00E396" : "#FFB547" },
                { label: "Pass Rate", value: `${passRate}%`, sub: "Functional success rate", color: "#00D4FF" },
                { label: "Test Density", value: total, sub: "Total endpoints audited", color: "#7B61FF" },
                { label: "Audit Date", value: new Date(ts! * 1000).toLocaleDateString(), sub: new Date(ts! * 1000).toLocaleTimeString(), color: "#E8EEFF" },
              ].map((item, i) => (
                <div key={i} style={{ borderRight: i < 3 ? "1px solid rgba(123,141,176,0.1)" : "none", paddingRight: "1rem" }}>
                  <p style={{ fontSize: 11, color: "#7B8DB0", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>{item.label}</p>
                  <p style={{ fontSize: 30, fontWeight: 900, color: item.color, lineHeight: 1, marginBottom: 4 }}>{item.value}</p>
                  <p style={{ fontSize: 11, color: "#4A5A78", fontWeight: 600 }}>{item.sub}</p>
                </div>
              ))}
            </div>

            {/* WHITEPAPER SECTIONS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
              
              <section>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem", borderBottom: "1px solid #1E2D4A", paddingBottom: "0.75rem" }}>
                  <ShieldCheck size={22} color="#00E396" />
                  <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.01em" }}>I. Specification Coverage Analysis</h2>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {run.results.map((res, i) => {
                    const theme = STATUS_THEMES[res.status] || STATUS_THEMES.FAIL;
                    const StatusIcon = theme.icon;
                    const mColor = METHOD_COLORS[res.method] || "#7B8DB0";

                    return (
                      <div key={i} className="audit-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", breakInside: "avoid" }}>
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ 
                            width: 32, height: 32, borderRadius: 8, 
                            background: theme.bg, display: "flex", 
                            alignItems: "center", justifyContent: "center" 
                          }}>
                            <StatusIcon size={16} color={theme.color} />
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ 
                              fontSize: 12, fontWeight: 900, fontFamily: "JetBrains Mono, monospace",
                              color: mColor
                            }}>{res.method}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "#E8EEFF" }}>{res.endpoint}</span>
                          </div>
                          <div style={{ 
                            marginLeft: "auto", fontSize: 11, padding: "2px 8px", 
                            borderRadius: 4, background: "#1E2D4A", color: "#7B8DB0",
                            fontFamily: "JetBrains Mono, monospace", fontWeight: 700
                          }}>
                            HTTP {res.status_code}
                          </div>
                        </div>

                        {/* Whitepaper content body */}
                        <div style={{ 
                          paddingLeft: "2.75rem", display: "grid", 
                          gridTemplateColumns: "1fr 1fr", gap: "2rem" 
                        }}>
                          {/* Column 1: Execution Logic */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <Workflow size={14} color="#00D4FF" />
                                <h4 style={{ fontSize: 13, fontWeight: 900, color: "#00D4FF", textTransform: "uppercase", letterSpacing: "0.05em" }}>Execution Logic</h4>
                              </div>
                              <p style={{ fontSize: 16, color: "#B0BFDB", lineHeight: 1.6, margin: 0, fontWeight: 450 }}>
                                {res.technical_summary || `The internal SpecTest agent initiated a ${res.method} request to validate runtime adherence to the uploaded documentation.`}
                              </p>
                            </div>

                            {res.requirement_match && (
                              <div style={{ marginTop: "0.25rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                  <ChevronRight size={12} color="#7B61FF" />
                                  <h5 style={{ fontSize: 11, fontWeight: 800, color: "#7B61FF", textTransform: "uppercase" }}>Requirement Reference</h5>
                                </div>
                                <p style={{ fontSize: 12, color: "#4A5A78", margin: 0, fontWeight: 600 }}>{res.requirement_match}</p>
                              </div>
                            )}
                          </div>

                          {/* Column 2: Factors & Resolution */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {/* Environmental Factors */}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                <Globe size={14} color={res.status === "PASS" ? "#00E396" : "#FFB547"} />
                                <h4 style={{ fontSize: 13, fontWeight: 900, color: res.status === "PASS" ? "#00E396" : "#FFB547", textTransform: "uppercase", letterSpacing: "0.05em" }}>Environmental Factors</h4>
                              </div>
                              <p style={{ fontSize: 16, color: "#B0BFDB", lineHeight: 1.6, margin: 0, fontWeight: 450 }}>
                                {res.failure_dynamics || (res.status === "PASS" ? "Runtime validation succeeded without interference. Schema conformity is verified." : "Observation indicates a discrepancy between defined spec and target host.")}
                              </p>
                            </div>

                            {/* Resolution Path */}
                            {(res.status !== "PASS" || res.details) && (
                              <div style={{ background: res.status === "FAIL" ? "rgba(255,69,96,0.03)" : "rgba(255,181,71,0.03)", padding: "0.75rem", borderRadius: 10, border: `1px solid ${res.status === "FAIL" ? "rgba(255,69,96,0.1)" : "rgba(255,181,71,0.1)"}` }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                  <Lightbulb size={14} color={res.status === "FAIL" ? "#FF4560" : "#FFB547"} />
                                  <h4 style={{ fontSize: 13, fontWeight: 900, color: res.status === "FAIL" ? "#FF4560" : "#FFB547", textTransform: "uppercase", letterSpacing: "0.05em" }}>Resolution Path</h4>
                                </div>
                                <p style={{ fontSize: 16, color: "#E8EEFF", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                                  {res.status === "HEALED" ? `Agent applied dynamic self-healing: ${res.details}` : (res.details || "Review server-side logs and verify endpoint deployment.")}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {i < run.results.length - 1 && <div style={{ borderBottom: "1px dashed rgba(30,45,74,0.25)", marginTop: "1rem" }} />}
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* STRATEGIC RECOMMENDATIONS */}
              {run.recommendations && run.recommendations.length > 0 && (
                <section style={{ marginBottom: "3rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem", borderBottom: "1px solid #1E2D4A", paddingBottom: "0.75rem" }}>
                    <Lightbulb size={22} color="#7B61FF" />
                    <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.01em" }}>II. Strategic Remediation Roadmap</h2>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "0.75rem" }}>
                    {run.recommendations.map((rec, i) => (
                      <div key={i} style={{ 
                        background: "#0D1424", border: "1px solid #1E2D4A", 
                        borderRadius: 14, padding: "1.25rem", display: "flex", 
                        flexDirection: "column", breakInside: "avoid"
                      }}>
                        <div style={{ 
                          fontSize: 9, fontWeight: 900, color: "#7B61FF", 
                          marginBottom: 10, border: "1px solid rgba(123,97,255,0.2)", 
                          background: "rgba(123,97,255,0.05)", padding: "2px 6px", 
                          borderRadius: 4, alignSelf: "flex-start", letterSpacing: "0.05em"
                        }}>
                          ITEM 0{i+1}
                        </div>
                        <p style={{ fontSize: 16, color: "#E8EEFF", lineHeight: 1.5, margin: 0, fontWeight: 500 }}>{rec}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        
        @media print {
          .no-print { display: none !important; }
          body { 
            background: #0A0E1A !important; 
            color: #E8EEFF !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
          .print-container { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
          div, section, p, span, h1, h2, h3, h4, h5 { border-color: #1E2D4A !important; }
          .audit-card { break-inside: avoid !important; page-break-inside: avoid !important; }
          
          /* Ensuring backgrounds and colors stay dark */
          div[style*="background: #141D35"] { background: #141D35 !important; }
          div[style*="background: #0D1424"] { background: #0D1424 !important; }
          div[style*="background: rgba"] { background: inherit !important; }
          p, span, h1, h2, h3, h4, h5 { color: inherit !important; }
        }
      ` }} />
    </div>
  )
}
