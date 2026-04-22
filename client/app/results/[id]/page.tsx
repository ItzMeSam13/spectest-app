"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getResult } from "@/lib/api"
import { Navbar } from "@/components/shared/Navbar"
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, Shield, FileBarChart, BookOpen, Zap } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrichedResult = {
  method?: string
  endpoint?: string
  status?: string         // PASS | FAIL | HEALED
  status_code?: number
  details?: string
  technical_summary?: string
  failure_dynamics?: string
  parameter_audit?: Record<string, any>
  security_implications?: string
  requirement_match?: string
  // legacy compat
  passed?: boolean
  self_healed?: boolean
  ai_explanation?: string
}

type GapEntry = {
  requirement_id?: string
  requirement_text?: string
  remediation?: string
}

type SecurityFinding = {
  endpoint?: string
  method?: string
  status_code?: number
  security_implication?: string
  // legacy
  vulnerable?: boolean
  attack_type?: string
  severity?: string
  description?: string
}

type TabData = {
  results?: { entries?: EnrichedResult[]; summary?: Record<string, number> }
  gaps?: { entries?: GapEntry[]; total_gaps?: number }
  security?: { overall_risk?: string; findings?: SecurityFinding[] }
  recommendations?: { spec_score?: number; items?: string[] }
}

type RunResult = {
  spec_score?: number
  total_tests?: number
  passed?: number
  failed?: number
  healed?: number
  gaps?: number | GapEntry[]
  results?: EnrichedResult[]
  test_results?: EnrichedResult[]
  recommendations?: string[]
  tabs?: TabData
}

// ─── Reusable: Analysis Card ─────────────────────────────────────────────────

function AnalysisCard({ r, idx }: { r: EnrichedResult; idx: number }) {
  const [open, setOpen] = useState(false)

  const status = r.status || (r.self_healed ? "HEALED" : r.passed ? "PASS" : "FAIL")
  const isFail = status === "FAIL"
  const isHealed = status === "HEALED"
  const isPass = status === "PASS"

  const statusBorderColor = isFail ? "#FF4560" : isHealed ? "#FFB547" : "#00E396"
  const statusColor = isFail ? "#FF4560" : isHealed ? "#FFB547" : "#00E396"
  const StatusIcon = isFail ? XCircle : isHealed ? AlertTriangle : CheckCircle

  const METHOD_COLORS: Record<string, string> = {
    GET: "#00B7A8", POST: "#7B61FF", PUT: "#FFB547", PATCH: "#FFB547", DELETE: "#FF4560",
  }
  const methodColor = METHOD_COLORS[r.method || ""] || "#7B8DB0"
  const pa = r.parameter_audit || {}

  return (
    <div className="print-avoid-break" style={{
      background: "#0D1424",
      border: `1px solid ${isFail ? "#FF456030" : isHealed ? "#FFB54730" : "#1E2D4A"}`,
      borderLeft: `4px solid ${statusBorderColor}`,
      borderRadius: 12,
      marginBottom: "1rem",
      overflow: "hidden",
    }}>
      {/* Card Header — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "1rem 1.25rem", cursor: "pointer",
          background: "#0A1020",
        }}
      >
        <StatusIcon size={16} color={statusColor} style={{ flexShrink: 0 }} />

        <span style={{
          padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700,
          fontFamily: "JetBrains Mono, monospace",
          background: `${methodColor}20`, color: methodColor, border: `1px solid ${methodColor}40`,
          flexShrink: 0,
        }}>{r.method}</span>

        <code style={{ fontSize: 13, color: "#E8EEFF", fontFamily: "JetBrains Mono, monospace", flex: 1 }}>
          {r.endpoint}
        </code>

        <span style={{ fontSize: 11, color: "#7B8DB0", fontFamily: "JetBrains Mono, monospace", background: "#1E2D4A", padding: "2px 8px", borderRadius: 4 }}>
          {r.status_code}
        </span>

        <span style={{ fontSize: 12, color: statusColor, fontWeight: 600, minWidth: 64, textAlign: "right" }}>
          {isPass ? "PASSED" : isHealed ? "HEALED" : "FAILED"}
        </span>

        {open ? <ChevronUp size={14} color="#4A5A78" /> : <ChevronDown size={14} color="#4A5A78" />}
      </div>

      {/* Expandable body */}
      <div className={open ? "block" : "hidden print-tab-content-show"} style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #1E2D4A", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Requirement Match */}
          {r.requirement_match && (
            <div>
              <p style={sectionLabel("#7B61FF")}>📋 Requirement Mapping</p>
              <p style={bodyText}>{r.requirement_match}</p>
            </div>
          )}

          {/* Technical Summary */}
          {r.technical_summary && (
            <div>
              <p style={sectionLabel("#00D4FF")}>⚙️ Technical Summary</p>
              <p className="print-enlarge-text" style={bodyText}>{r.technical_summary}</p>
            </div>
          )}

          {/* Factor Analysis (failures only) */}
          {(isFail || isHealed) && r.failure_dynamics && (
            <div className="print-avoid-break" style={{ background: `${statusBorderColor}0A`, border: `1px solid ${statusBorderColor}30`, borderRadius: 8, padding: "0.9rem 1rem" }}>
              <p style={sectionLabel(statusColor)}>🔍 Factor Analysis</p>
              <p className="print-enlarge-text" style={bodyText}>{r.failure_dynamics}</p>
            </div>
          )}

          {/* Parameter Audit */}
          {Object.keys(pa).length > 0 && (
            <div>
              <p style={sectionLabel("#FFB547")}>🔬 Parameter Audit</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1.5rem" }}>
                {Object.entries(pa).map(([key, val]) => (
                  <div key={key} className="print-avoid-break" style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#4A5A78", minWidth: 140 }}>{key}</span>
                    <span style={{ fontSize: 12, color: "#B0BFDB", fontFamily: "JetBrains Mono, monospace" }}>
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {r.security_implications && (
            <div className="print-avoid-break">
              <p style={sectionLabel(r.security_implications.startsWith("HIGH") ? "#FF4560" : r.security_implications.startsWith("MEDIUM") ? "#FFB547" : "#00E396")}>
                🛡️ Security Signal
              </p>
              <p style={bodyText}>{r.security_implications}</p>
            </div>
          )}

        </div>
    </div>
  )
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
const sectionLabel = (color: string): React.CSSProperties => ({
  fontSize: 11, color, textTransform: "uppercase", letterSpacing: "0.09em",
  fontWeight: 700, marginBottom: "0.4rem",
})
const bodyText: React.CSSProperties = {
  fontSize: 13, color: "#B0BFDB", lineHeight: 1.75, margin: 0,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const params = useParams()
  const runId = params.id as string
  const [data, setData] = useState<RunResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    getResult(runId)
      .then(setData)
      .finally(() => setLoading(false))
  }, [runId])

  if (loading) return (
    <div style={{ background: "#0A0E1A", minHeight: "100vh", color: "#E8EEFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Zap size={24} color="#00D4FF" style={{ marginRight: 12 }} />
      Loading results...
    </div>
  )

  if (!data) return (
    <div style={{ background: "#0A0E1A", minHeight: "100vh", color: "#FF4560", display: "flex", alignItems: "center", justifyContent: "center" }}>
      Results not found
    </div>
  )

  const score = data.spec_score || 0

  // Resolve enriched results from flat array or tabs
  const enrichedResults: EnrichedResult[] = (
    data.tabs?.results?.entries ||
    data.results ||
    data.test_results ||
    []
  )

  // Live computed stats — source of truth for all charts
  const totalCount = enrichedResults.length || data.total_tests || 1
  const passedCount = enrichedResults.filter(r => (r.status || (r.passed ? "PASS" : "FAIL")) === "PASS").length || data.passed || 0
  const failedCount = enrichedResults.filter(r => (r.status || (r.passed ? "PASS" : "FAIL")) === "FAIL").length || data.failed || 0
  const healedCount = enrichedResults.filter(r => r.status === "HEALED" || r.self_healed).length || data.healed || 0
  const passPercent = Math.min(Math.round(((passedCount + healedCount) / totalCount) * 100), 100)

  const scoreColor = passPercent >= 80 ? "#00E396" : passPercent >= 50 ? "#FFB547" : "#FF4560"
  const scoreLabel = passPercent >= 80 ? "EXCELLENT" : passPercent >= 50 ? "GOOD" : "NEEDS WORK"

  const gapEntries: GapEntry[] = (
    data.tabs?.gaps?.entries || []
  )

  // Security findings from tabs.security or legacy
  const securityFindings: SecurityFinding[] = (
    data.tabs?.security?.findings || []
  )
  const overallRisk = data.tabs?.security?.overall_risk || "UNKNOWN"

  const recommendations: string[] = (
    data.tabs?.recommendations?.items || data.recommendations || []
  )

  const TABS = [
    { label: "Test Results", icon: FileBarChart },
    { label: "Gap Report", icon: XCircle },
    { label: "Security", icon: Shield },
    { label: "Recommendations", icon: BookOpen },
  ]

  return (
    <div className="min-h-screen" style={{ background: "#0A0E1A", fontFamily: "var(--font-dm-sans), sans-serif" }}>
      <div className="print-hide">
        <Navbar />
      </div>
      <div className="print-w-full" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ color: "#E8EEFF", margin: 0 }}>Audit Log</h1>
          <button
            onClick={() => window.print()}
            className="print-hide"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#141D35", color: "#E8EEFF",
              border: "1px solid #1E2D4A", padding: "10px 18px",
              borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}
          >
            🖨 Print Report
          </button>
        </div>

        {/* Advanced Mission Analytics — Glassmorphism Container */}
        <div className="print-col print-avoid-break" style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "2rem",
          marginBottom: "2.5rem",
          padding: "2.5rem",
          background: "rgba(20, 29, 53, 0.4)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0, 212, 255, 0.1)",
          borderRadius: 24,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 212, 255, 0.05)",
        }}>
          
          {/* Left: Result Distribution (Pie Chart) */}
          <div style={{ position: "relative" }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#4A5A78", letterSpacing: "0.15em", marginBottom: "1.5rem", textTransform: "uppercase" }}>
              Mission Distribution
            </h3>
            <div className="print-pie-chart" style={{ height: 260, width: "100%", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: `Passed (${passedCount + healedCount})`, value: (passedCount + healedCount) || (passedCount + failedCount + healedCount === 0 ? 1 : 0) },
                      { name: `Failed (${failedCount})`, value: failedCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    <Cell fill="#00E396" stroke="none" />
                    <Cell fill="#FF4560" stroke="none" />
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ background: "#0A1020", border: "1px solid #1E2D4A", borderRadius: 12, fontSize: 12 }}
                    itemStyle={{ color: "#E8EEFF" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Central Pass Rate */}
              <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                textAlign: "center", pointerEvents: "none"
              }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{passPercent}%</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#4A5A78", letterSpacing: 2, marginTop: 4 }}>PASS RATE</div>
              </div>
            </div>
            
            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
              {[
                { label: "Passed", color: "#00E396", count: passedCount + healedCount },
                { label: "Failed", color: "#FF4560", count: failedCount },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: 11, color: "#7B8DB0", fontWeight: 700 }}>{item.label} ({item.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Middle: AI Recovery Factor */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: "2rem" }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#4A5A78", letterSpacing: "0.15em", marginBottom: "1.5rem", textTransform: "uppercase" }}>
              AI Recovery Factor
            </h3>
            <div className="print-pie-chart" style={{ height: 260, width: "100%", position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: `Healed (${healedCount})`, value: healedCount },
                      { name: `Failed (${failedCount})`, value: failedCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={1500}
                  >
                    <Cell fill="#FFB547" stroke="none" />
                    <Cell fill="#FF4560" stroke="none" />
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ background: "#0A1020", border: "1px solid #1E2D4A", borderRadius: 12, fontSize: 12 }}
                    itemStyle={{ color: "#E8EEFF" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                textAlign: "center", pointerEvents: "none"
              }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: "#FFB547", lineHeight: 1 }}>
                  {healedCount + failedCount > 0 ? Math.round((healedCount / (healedCount + failedCount)) * 100) : 0}%
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#4A5A78", letterSpacing: 2, marginTop: 4 }}>RECOVERED</div>
              </div>
            </div>
            
            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem" }}>
              {[
                { label: "Healed", color: "#FFB547", count: healedCount },
                { label: "Failed", color: "#FF4560", count: failedCount },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: 11, color: "#7B8DB0", fontWeight: 700 }}>{item.label} ({item.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Security & Compliance Gauge */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: "2rem" }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#4A5A78", letterSpacing: "0.15em", marginBottom: "1.5rem", textTransform: "uppercase" }}>
              Risk Assessment
            </h3>
            
            {/* Gauge Component (Half-Pie) — tracks pass rate */}
            <div className="print-pie-chart" style={{ height: 180, width: "100%", position: "relative" }}>
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: passPercent },
                      { value: 100 - passPercent },
                    ]}
                    cx="50%"
                    cy="80%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={75}
                    outerRadius={105}
                    paddingAngle={0}
                    dataKey="value"
                    animationDuration={2000}
                  >
                    <Cell fill={scoreColor} stroke="none" />
                    <Cell fill="rgba(30, 45, 74, 0.6)" stroke="none" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)",
                textAlign: "center"
              }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor }}>{scoreLabel}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#4A5A78", marginTop: 2 }}>RISK SIGNAL</div>
              </div>
            </div>

            {/* Compliance Vitals */}
            <div className="print-vitals-grid" style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ padding: "12px", background: "rgba(0, 212, 255, 0.05)", borderRadius: 12, border: "1px solid rgba(0, 212, 255, 0.1)" }}>
                <div style={{ fontSize: 10, color: "#4A5A78", fontWeight: 800, marginBottom: 4 }}>RELIABILITY</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#E8EEFF" }}>{Math.min(Math.round(((passedCount + healedCount) / totalCount) * 100), 100)}%</div>
              </div>
               <div style={{ padding: "12px", background: "rgba(123, 97, 255, 0.05)", borderRadius: 12, border: "1px solid rgba(123, 97, 255, 0.1)" }}>
                <div style={{ fontSize: 10, color: "#4A5A78", fontWeight: 800, marginBottom: 4 }}>ENDPOINTS</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#E8EEFF" }}>{totalCount} tested</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="print-tabs-hide" style={{ display: "flex", gap: 0, marginBottom: "1.5rem", borderBottom: "1px solid #1E2D4A" }}>
          {TABS.map(({ label, icon: Icon }, i) => (
            <button key={label}
              onClick={() => setActiveTab(i)}
              style={{
                background: "transparent", border: "none",
                borderBottom: activeTab === i ? "2px solid #00D4FF" : "2px solid transparent",
                color: activeTab === i ? "#00D4FF" : "#7B8DB0",
                padding: "12px 22px", cursor: "pointer", fontSize: 13,
                fontWeight: activeTab === i ? 700 : 400,
                display: "flex", alignItems: "center", gap: 6,
              }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ─── Tab 0: Test Results ─────────────────────────────────────────── */}
        <div className={activeTab === 0 ? "block" : "hidden print-tab-content-show"}>
          <h2 className="hidden print-section-header">Test Results</h2>
          <div>
            {enrichedResults.length === 0 ? (
              <div style={{ color: "#4A5A78", textAlign: "center", padding: "3rem" }}>No results found.</div>
            ) : (
              enrichedResults.map((r, i) => <AnalysisCard key={i} r={r} idx={i} />)
            )}
          </div>
        </div>

        {/* ─── Tab 1: Gap Report ───────────────────────────────────────────── */}
        <div className={activeTab === 1 ? "block" : "hidden print-tab-content-show"}>
          <h2 className="hidden print-section-header">Gap Report</h2>
          <div>
            {gapEntries.length === 0 ? (
              <div className="print-avoid-break" style={{ color: "#00E396", textAlign: "center", padding: "3rem", fontSize: 18 }}>
                ✅ No gaps found! All requirements are covered.
              </div>
            ) : gapEntries.map((g, i) => (
              <div key={i} className="print-avoid-break" style={{
                background: "#0D1424", borderLeft: "4px solid #FF4560",
                border: "1px solid #FF456030", borderRadius: 12,
                padding: "1.25rem 1.5rem", marginBottom: "0.75rem",
              }}>
                <p style={{ color: "#FF4560", fontWeight: 700, marginBottom: 6, fontSize: 13 }}>
                  ❌ GAP — {g.requirement_id || `#${i + 1}`}
                </p>
                <p style={{ color: "#E8EEFF", marginBottom: 8, fontSize: 14 }}>{g.requirement_text}</p>
                <div style={{ background: "#0A0E1A", borderRadius: 6, padding: "10px 12px", color: "#7B8DB0", fontSize: 12 }}>
                  {g.remediation || "Define and deploy a corresponding API endpoint in the target environment."}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Tab 2: Security ─────────────────────────────────────────────── */}
        <div className={activeTab === 2 ? "block" : "hidden print-tab-content-show"}>
          <h2 className="hidden print-section-header">Security Assessments</h2>
          <div>
            {/* Risk banner */}
            <div className="print-avoid-break" style={{
              background: overallRisk === "HIGH" ? "#FF456010" : overallRisk === "MEDIUM" ? "#FFB54710" : "#00E39610",
              border: `1px solid ${overallRisk === "HIGH" ? "#FF456040" : overallRisk === "MEDIUM" ? "#FFB54740" : "#00E39640"}`,
              borderRadius: 10, padding: "0.75rem 1.25rem", marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <Shield size={16} color={overallRisk === "HIGH" ? "#FF4560" : overallRisk === "MEDIUM" ? "#FFB547" : "#00E396"} />
              <span style={{ fontSize: 13, fontWeight: 700, color: overallRisk === "HIGH" ? "#FF4560" : overallRisk === "MEDIUM" ? "#FFB547" : "#00E396" }}>
                Overall Security Risk: {overallRisk}
              </span>
            </div>

            {securityFindings.length === 0 ? (
              <div className="print-avoid-break" style={{ color: "#00E396", textAlign: "center", padding: "3rem", fontSize: 18 }}>
                ✅ No security issues detected.
              </div>
            ) : securityFindings.map((s, i) => {
              const risk = (s.security_implication || "").startsWith("HIGH") ? "HIGH"
                : (s.security_implication || "").startsWith("MEDIUM") ? "MEDIUM"
                : "LOW"
              const rColor = risk === "HIGH" ? "#FF4560" : risk === "MEDIUM" ? "#FFB547" : "#00E396"
              return (
                <div key={i} className="print-avoid-break" style={{
                  background: "#0D1424", border: `1px solid ${rColor}30`,
                  borderLeft: `4px solid ${rColor}`, borderRadius: 12,
                  padding: "1.25rem 1.5rem", marginBottom: "0.75rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: `${rColor}20`, color: rColor, fontWeight: 700 }}>
                        {risk}
                      </span>
                      <code style={{ fontSize: 13, color: "#E8EEFF", fontFamily: "JetBrains Mono, monospace" }}>
                        {s.method} {s.endpoint}
                      </code>
                    </div>
                    <span style={{ fontSize: 11, color: "#7B8DB0", fontFamily: "JetBrains Mono, monospace", background: "#1E2D4A", padding: "2px 8px", borderRadius: 4 }}>
                      {s.status_code}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: "#B0BFDB", margin: 0, lineHeight: 1.7 }}>
                    {s.security_implication || s.description || "No detail available."}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── Tab 3: Recommendations ──────────────────────────────────────── */}
        <div className={activeTab === 3 ? "block" : "hidden print-tab-content-show"}>
          <h2 className="hidden print-section-header">Recommendations</h2>
          <div>
            {recommendations.length === 0 ? (
              <div style={{ color: "#00E396", textAlign: "center", padding: "3rem" }}>
                ✅ No recommendations — API health is optimal.
              </div>
            ) : recommendations.map((rec, i) => {
              const priorities = [
                { label: "P0 CRITICAL", color: "#FF4560" },
                { label: "P1 HIGH",     color: "#FFB547" },
                { label: "P1 HIGH",     color: "#FFB547" },
                { label: "P2 MEDIUM",   color: "#00D4FF" },
              ]
              const p = priorities[i] || priorities[3]
              return (
                <div key={i} className="print-avoid-break" style={{
                  background: "#0D1424", border: "1px solid #1E2D4A",
                  borderLeft: `4px solid ${p.color}`, borderRadius: 12,
                  padding: "1.25rem 1.5rem", marginBottom: "0.75rem",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{
                    background: `${p.color}20`, color: p.color,
                    padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.label}
                  </span>
                  <p style={{ color: "#E8EEFF", fontSize: 14, margin: 0, lineHeight: 1.7 }}>{rec}</p>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  )
}
