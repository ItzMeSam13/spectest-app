"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getResult, exportPDF } from "@/lib/api"
import { Navbar } from "@/components/shared/Navbar"

type TestResult = {
  passed?: boolean
  self_healed?: boolean
  method?: string
  endpoint?: string
  status_code?: number
  response_time_ms?: number
  ai_explanation?: string
}

type GapResult = {
  requirement_id?: string
  requirement_text?: string
}

type SecurityResult = {
  vulnerable?: boolean
  attack_type?: string
  severity?: string
  endpoint?: string
  description?: string
}

type RunResult = {
  spec_score?: number
  requirements_found?: number
  tests_passed?: number
  tests_failed?: number
  gaps_found?: number
  vulnerabilities_found?: number
  test_results?: TestResult[]
  results?: TestResult[]
  gaps?: GapResult[]
  security_results?: SecurityResult[]
  security?: SecurityResult[]
  recommendations?: string[]
}

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
    <div style={{background:"#0A0E1A",
      minHeight:"100vh", color:"#E8EEFF",
      display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:"18px"}}>
      Loading results...
    </div>
  )

  if (!data) return (
    <div style={{background:"#0A0E1A",
      minHeight:"100vh", color:"#FF4560",
      display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:"18px"}}>
      Results not found
    </div>
  )

  const score = data.spec_score || 0
  const scoreColor = score >= 80 ? "#00E396" :
    score >= 60 ? "#FFB547" : "#FF4560"
  const scoreLabel = score >= 80 ? "EXCELLENT" :
    score >= 60 ? "GOOD" : "NEEDS WORK"

  const tabs = ["Test Results", "Gap Report",
    "Security", "Recommendations"]

  return (
    <div style={{background:"#0A0E1A",
      minHeight:"100vh",
      fontFamily:"var(--font-dm-sans), sans-serif"}}>
      <Navbar />
      <div style={{padding:"2rem",
        maxWidth:"1200px", margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          marginBottom:"2rem"}}>
          <h1 style={{color:"#E8EEFF", margin:0}}>
            Run Results
          </h1>
          <button
            onClick={() => exportPDF(runId)}
            style={{background:"transparent",
              color:"#00D4FF",
              border:"1px solid #00D4FF",
              padding:"10px 20px",
              borderRadius:"8px",
              cursor:"pointer",
              fontSize:"14px"}}>
            Export PDF ↓
          </button>
        </div>

        {/* SpecScore Hero */}
        <div style={{background:"#141D35",
          border:"1px solid #1E2D4A",
          borderRadius:"16px",
          padding:"3rem",
          textAlign:"center",
          marginBottom:"2rem"}}>
          <div style={{fontSize:"96px",
            fontWeight:"bold",
            color: scoreColor,
            lineHeight:1}}>
            {score}
          </div>
          <div style={{fontSize:"18px",
            color: scoreColor,
            marginBottom:"1rem"}}>
            {scoreLabel}
          </div>
          <div style={{color:"#7B8DB0",
            fontSize:"14px"}}>
            SpecScore™ — API Health Rating
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{display:"grid",
          gridTemplateColumns:"repeat(4,1fr)",
          gap:"1rem", marginBottom:"2rem"}}>
          {[
            ["Requirements", 
              data.requirements_found || 0,
              "#00D4FF"],
            ["Tests Passed",
              `${data.tests_passed || 0}/${
              (data.tests_passed || 0) + 
              (data.tests_failed || 0)}`,
              "#00E396"],
            ["Gaps Found",
              data.gaps_found || 0, "#FF4560"],
            ["Vulnerabilities",
              data.vulnerabilities_found || 0,
              "#FF4560"]
          ].map(([label, val, color]) => (
            <div key={label as string} style={{
              background:"#141D35",
              border:"1px solid #1E2D4A",
              borderRadius:"12px",
              padding:"1.5rem",
              textAlign:"center"}}>
              <div style={{fontSize:"36px",
                fontWeight:"bold",
                color: color as string}}>
                {val as number | string}
              </div>
              <div style={{color:"#7B8DB0",
                fontSize:"13px", marginTop:"4px"}}>
                {label as string}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex", gap:"0",
          marginBottom:"1.5rem",
          borderBottom:"1px solid #1E2D4A"}}>
          {tabs.map((tab, i) => (
            <button key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                background:"transparent",
                border:"none",
                borderBottom: activeTab === i ?
                  "2px solid #00D4FF" : 
                  "2px solid transparent",
                color: activeTab === i ?
                  "#00D4FF" : "#7B8DB0",
                padding:"12px 24px",
                cursor:"pointer",
                fontSize:"14px",
                fontWeight: activeTab === i ?
                  "bold" : "normal"}}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 && (
          <div>
            {(data.test_results || 
              data.results || [])
              .map((r: TestResult, i: number) => (
              <div key={i} style={{
                background:"#141D35",
                border:`1px solid ${
                  r.passed ? "#1E2D4A" : "#FF4560"}`,
                borderLeft:`4px solid ${
                  r.self_healed ? "#FFB547" :
                  r.passed ? "#00E396" : "#FF4560"}`,
                borderRadius:"8px",
                padding:"1rem 1.5rem",
                marginBottom:"0.75rem"}}>
                <div style={{display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center"}}>
                  <div>
                    <span style={{
                      color: r.self_healed ? 
                        "#FFB547" :
                        r.passed ? "#00E396" : 
                        "#FF4560",
                      fontWeight:"bold",
                      marginRight:"12px"}}>
                      {r.self_healed ? "↻ HEALED" :
                        r.passed ? "✅ PASS" : 
                        "❌ FAIL"}
                    </span>
                    <span style={{
                      color:"#E8EEFF",
                      fontFamily:"JetBrains Mono, monospace",
                      fontSize:"13px"}}>
                      {r.method} {r.endpoint}
                    </span>
                  </div>
                  <div style={{
                    color:"#7B8DB0",
                    fontSize:"13px"}}>
                    {r.status_code && 
                      `${r.status_code} · `}
                    {r.response_time_ms && 
                      `${r.response_time_ms}ms`}
                  </div>
                </div>
                {r.ai_explanation && (
                  <div style={{
                    color:"#7B8DB0",
                    fontSize:"13px",
                    marginTop:"8px",
                    paddingTop:"8px",
                    borderTop:"1px solid #1E2D4A"}}>
                    {r.ai_explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 1 && (
          <div>
            {(data.gaps || []).length === 0 ? (
              <div style={{color:"#00E396",
                textAlign:"center", padding:"3rem",
                fontSize:"18px"}}>
                ✅ No gaps found! 
                All requirements are covered.
              </div>
            ) : (data.gaps || []).map(
              (g: GapResult, i: number) => (
              <div key={i} style={{
                background:"#141D35",
                borderLeft:"4px solid #FF4560",
                borderRadius:"8px",
                padding:"1.5rem",
                marginBottom:"1rem"}}>
                <div style={{
                  color:"#FF4560",
                  fontWeight:"bold",
                  marginBottom:"8px"}}>
                  ❌ GAP — {g.requirement_id}
                </div>
                <div style={{color:"#E8EEFF",
                  marginBottom:"8px"}}>
                  {g.requirement_text}
                </div>
                <div style={{
                  background:"#0A0E1A",
                  borderRadius:"6px",
                  padding:"12px",
                  color:"#7B8DB0",
                  fontSize:"13px"}}>
                  No matching endpoint found 
                  in Swagger specification.
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 2 && (
          <div>
            {(data.security_results || 
              data.security || [])
              .map((s: SecurityResult, i: number) => (
              <div key={i} style={{
                background:"#141D35",
                borderLeft:`4px solid ${
                  s.vulnerable ? "#FF4560" : 
                  "#00E396"}`,
                borderRadius:"8px",
                padding:"1.5rem",
                marginBottom:"0.75rem"}}>
                <div style={{display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  marginBottom:"8px"}}>
                  <span style={{
                    color: s.vulnerable ? 
                      "#FF4560" : "#00E396",
                    fontWeight:"bold"}}>
                    {s.vulnerable ? 
                      "🔴 VULNERABLE" : "✅ SAFE"} 
                    {" — "}{s.attack_type}
                  </span>
                  <span style={{
                    background: s.vulnerable ?
                      "#FF456020" : "#00E39620",
                    color: s.vulnerable ?
                      "#FF4560" : "#00E396",
                    padding:"4px 10px",
                    borderRadius:"20px",
                    fontSize:"12px"}}>
                    {s.severity?.toUpperCase() || 
                      (s.vulnerable ? 
                        "HIGH" : "PASS")}
                  </span>
                </div>
                <div style={{
                  color:"#7B8DB0",
                  fontSize:"13px"}}>
                  Endpoint: {s.endpoint}
                </div>
                {s.description && (
                  <div style={{
                    color:"#7B8DB0",
                    fontSize:"13px",
                    marginTop:"4px"}}>
                    {s.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 3 && (
          <div>
            {(data.recommendations || [])
              .map((rec: string, i: number) => {
              const priorities = [
                {label:"P0", color:"#FF4560"},
                {label:"P1", color:"#FFB547"},
                {label:"P1", color:"#FFB547"},
                {label:"P2", color:"#00D4FF"}
              ]
              const p = priorities[i] || 
                priorities[3]
              return (
                <div key={i} style={{
                  background:"#141D35",
                  borderLeft:`4px solid ${p.color}`,
                  borderRadius:"8px",
                  padding:"1.5rem",
                  marginBottom:"1rem"}}>
                  <span style={{
                    background: p.color + "20",
                    color: p.color,
                    padding:"4px 10px",
                    borderRadius:"20px",
                    fontSize:"12px",
                    fontWeight:"bold",
                    marginRight:"12px"}}>
                    {p.label}
                  </span>
                  <span style={{color:"#E8EEFF"}}>
                    {rec}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
