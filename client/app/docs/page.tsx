"use client"
import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from "firebase/firestore"
import { Navbar } from "@/components/shared/Navbar"
import { CheckCircle, XCircle, AlertTriangle, Zap, BookOpen, ChevronRight, Clock, Download, Printer } from "lucide-react"

const BASE = "http://127.0.0.1:8000"

type TestResult = {
  endpoint: string
  method: string
  status: string
  status_code: number
  details?: string
}

type Run = {
  run_id: string
  spec_score: number
  total_tests: number
  passed: number
  failed: number
  healed: number
  timestamp?: { seconds: number }
  results: TestResult[]
  recommendations: string[]
}

const METHOD_COLORS: Record<string, string> = {
  GET:    "#00B7A8",
  POST:   "#7B61FF",
  PUT:    "#FFB547",
  PATCH:  "#FFB547",
  DELETE: "#FF4560",
}

const STATUS_ICONS: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  PASS:   { icon: CheckCircle,   color: "#00E396", label: "Passed" },
  HEALED: { icon: AlertTriangle, color: "#FFB547", label: "Self-Healed" },
  FAIL:   { icon: XCircle,       color: "#FF4560", label: "Failed" },
}

function getDescription(method: string, endpoint: string): string {
  if (method === "GET" && /\/\d+$/.test(endpoint)) return `Fetches a single resource by its unique identifier. The agent verifies the server returns 200 OK and that the response body contains expected fields.`
  if (method === "GET")   return `Retrieves a list of resources from the collection. The agent validates pagination, response structure, and HTTP status codes.`
  if (method === "POST")  return `Creates a new resource on the server. The agent constructs a valid payload from the Swagger schema and verifies the server responds with 201 Created.`
  if (method === "PUT" || method === "PATCH") return `Updates an existing resource. The agent injects a captured resource ID and sends a corrected payload, asserting a 200 OK response.`
  if (method === "DELETE") return `Deletes the resource at this endpoint. The agent verifies the server acknowledges deletion with 200 or 204.`
  return `The agent executes this endpoint and validates the response against the Swagger specification.`
}

function getSuccessSummary(method: string): string {
  if (method === "GET")    return `A PASS confirms the target environment correctly serves this resource. The business requirement it maps to is considered covered and compliant.`
  if (method === "POST")   return `A PASS confirms the server correctly accepts and persists new resources. Creation contracts defined in the BRD are satisfied.`
  if (method === "PUT" || method === "PATCH") return `A PASS confirms the server correctly mutates existing resources. Update workflows defined in the BRD are satisfied.`
  if (method === "DELETE") return `A PASS confirms the server correctly removes resources. Deletion contracts are satisfied.`
  return `A PASS confirms this endpoint behaves in alignment with the specification.`
}

function getPossibleFix(details?: string, statusCode?: number): string {
  if (statusCode === 404) return `The endpoint path was not found on the live server. Verify the Base URL is correct and the server has this route deployed. Cross-reference the exact path in your Swagger .json.`
  if (statusCode === 401 || statusCode === 403) return `Authentication failure. Ensure the request includes a valid Bearer token. Check the "security" definition in the Swagger spec.`
  if (statusCode === 422 || statusCode === 400) return `The request payload was rejected. The Swagger schema may require additional fields or different data types. Review the "requestBody" definition.`
  if (statusCode && statusCode >= 500)          return `The server returned a 5xx error — an internal implementation issue. The spec defines this endpoint but the live server is broken.`
  return details || `Review the endpoint implementation and verify it matches the Swagger specification.`
}

export default function DocsPage() {
  const searchParams = useSearchParams()
  // Support ?run_id=... for direct linking from History page
  const paramRunId = searchParams.get("run_id")

  const [run, setRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [downloading, setDownloading] = useState(false)

  const fetchRun = useCallback(async (specificRunId?: string | null) => {
    setLoading(true)
    setError("")
    try {
      if (specificRunId) {
        // Fetch specific run by ID
        const docRef = doc(db, "test_runs", specificRunId)
        const snap = await getDoc(docRef)
        if (!snap.exists()) throw new Error(`Run "${specificRunId}" not found in Firestore.`)
        setRun(snap.data() as Run)
      } else {
        // Fetch the most recent run
        const q = query(collection(db, "test_runs"), orderBy("timestamp", "desc"), limit(1))
        const snap = await getDocs(q)
        if (snap.empty) throw new Error("No audit runs found. Run a test mission first.")
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

  const handleDownload = async () => {
    if (!run?.run_id) return
    setDownloading(true)
    try {
      const res = await fetch(`${BASE}/api/v1/report/${run.run_id}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `SpecTest_Audit_${run.run_id}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Fallback: browser print-to-PDF
        window.print()
      }
    } catch {
      // Network error fallback
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  const ts = run?.timestamp?.seconds
  const runDate = ts ? new Date(ts * 1000).toLocaleString() : "—"
  const passRate = run ? Math.round(((run.passed + (run.healed || 0)) / Math.max(run.total_tests, 1)) * 100) : 0

  return (
    <div style={{ background: "#0A0E1A", minHeight: "100vh", color: "#E8EEFF" }}>
      <Navbar />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1E2D4A",
        padding: "2.5rem 2rem 1.75rem",
        background: "linear-gradient(180deg, #0D1424 0%, #0A0E1A 100%)"
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "linear-gradient(135deg, #00D4FF, #7B61FF)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <BookOpen size={18} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#4A5A78", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                  SpecTest Audit
                </p>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: "#E8EEFF", margin: 0 }}>
                  Technical Documentation
                  {paramRunId && <span style={{ fontSize: 13, color: "#4A5A78", fontWeight: 400, marginLeft: 12 }}>Run #{paramRunId.slice(0,8)}</span>}
                </h1>
              </div>
            </div>

            {/* Download Button — TOP RIGHT */}
            {run && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => window.print()}
                  title="Print to PDF"
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 8,
                    background: "transparent", border: "1px solid #1E2D4A",
                    color: "#7B8DB0", fontSize: 13, cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#00D4FF")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "#1E2D4A")}
                >
                  <Printer size={14} />
                  Print
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 18px", borderRadius: 8,
                    background: "linear-gradient(135deg, #00D4FF, #7B61FF)",
                    border: "none", color: "#0A0E1A",
                    fontSize: 13, fontWeight: 700, cursor: downloading ? "wait" : "pointer",
                    opacity: downloading ? 0.7 : 1,
                    boxShadow: "0 0 16px #00D4FF40",
                    transition: "all 0.2s"
                  }}
                >
                  <Download size={14} />
                  {downloading ? "Generating..." : "Download Audit Report"}
                </button>
              </div>
            )}
          </div>

          {/* Stats row */}
          {run && (
            <div style={{ display: "flex", gap: "2rem", marginTop: "1.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              {[
                { label: "SpecScore",    value: `${run.spec_score}/100`, color: run.spec_score >= 80 ? "#00E396" : run.spec_score >= 50 ? "#FFB547" : "#FF4560" },
                { label: "Pass Rate",    value: `${passRate}%`,          color: "#00D4FF" },
                { label: "Endpoints",    value: run.total_tests,         color: "#7B61FF" },
                { label: "Self-Healed",  value: run.healed || 0,         color: "#FFB547" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 11, color: "#4A5A78", marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end", gap: 6 }}>
                <Clock size={13} color="#4A5A78" />
                <p style={{ fontSize: 12, color: "#4A5A78" }}>{runDate}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "4rem", color: "#4A5A78" }}>
            <Zap size={32} style={{ animation: "pulse 1.5s infinite", margin: "0 auto 1rem" }} />
            <p>Fetching audit from Firestore...</p>
          </div>
        )}

        {error && (
          <div style={{ background: "#1A0E14", border: "1px solid #FF4560", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
            <XCircle size={32} color="#FF4560" style={{ margin: "0 auto 1rem" }} />
            <p style={{ color: "#FF4560" }}>{error}</p>
          </div>
        )}

        {run && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {(run.results || []).map((result, idx) => {
                const statusMeta = STATUS_ICONS[result.status] || STATUS_ICONS["FAIL"]
                const StatusIcon = statusMeta.icon
                const methodColor = METHOD_COLORS[result.method] || "#7B8DB0"
                const isFail = result.status === "FAIL"
                const isHealed = result.status === "HEALED"

                return (
                  <div key={idx} style={{
                    background: "#0D1424",
                    border: `1px solid ${isFail ? "#FF456030" : isHealed ? "#FFB54730" : "#1E2D4A"}`,
                    borderRadius: 16, overflow: "hidden",
                  }}>
                    {/* Card Header */}
                    <div style={{
                      padding: "1.25rem 1.5rem", borderBottom: "1px solid #1E2D4A",
                      display: "flex", alignItems: "center", gap: "1rem",
                      background: "#0A1020",
                    }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                        fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em",
                        background: `${methodColor}20`, color: methodColor,
                        border: `1px solid ${methodColor}40`, flexShrink: 0,
                      }}>
                        {result.method}
                      </span>
                      <code style={{ fontSize: 15, color: "#E8EEFF", fontFamily: "JetBrains Mono, monospace" }}>
                        {result.endpoint}
                      </code>
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                        <StatusIcon size={16} color={statusMeta.color} />
                        <span style={{ fontSize: 12, color: statusMeta.color, fontWeight: 600 }}>{statusMeta.label}</span>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 4,
                          background: "#1E2D4A", color: "#7B8DB0",
                          fontFamily: "JetBrains Mono, monospace"
                        }}>
                          {result.status_code}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      {/* How It Works */}
                      <div>
                        <p style={{ fontSize: 11, color: "#00D4FF", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem", fontWeight: 600 }}>
                          How It Works
                        </p>
                        <p style={{ fontSize: 14, color: "#B0BFDB", lineHeight: 1.7 }}>
                          {getDescription(result.method, result.endpoint)}
                        </p>
                      </div>
                      {/* Outcome Block */}
                      <div>
                        {isFail || isHealed ? (
                          <div>
                            <p style={{ fontSize: 11, color: isFail ? "#FF4560" : "#FFB547", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem", fontWeight: 600 }}>
                              {isHealed ? "⚡ Auto-Healed" : "🔧 Possible Fix"}
                            </p>
                            <div style={{
                              background: isFail ? "#FF456010" : "#FFB54710",
                              border: `1px solid ${isFail ? "#FF456030" : "#FFB54730"}`,
                              borderRadius: 8, padding: "0.75rem 1rem",
                            }}>
                              <p style={{ fontSize: 13, color: "#B0BFDB", lineHeight: 1.7 }}>
                                {isHealed
                                  ? `The agent detected a mismatch and automatically corrected the payload. Details: ${result.details || "Corrected."}`
                                  : getPossibleFix(result.details, result.status_code)
                                }
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p style={{ fontSize: 11, color: "#00E396", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5rem", fontWeight: 600 }}>
                              ✓ Success Summary
                            </p>
                            <p style={{ fontSize: 14, color: "#B0BFDB", lineHeight: 1.7 }}>
                              {getSuccessSummary(result.method)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Recommendations */}
            {run.recommendations && run.recommendations.length > 0 && (
              <div style={{ marginTop: "2.5rem", paddingBottom: "3rem" }}>
                <h2 style={{
                  fontSize: 16, fontWeight: 700, color: "#E8EEFF",
                  marginBottom: "1rem", paddingBottom: "0.75rem",
                  borderBottom: "1px solid #1E2D4A"
                }}>
                  AI Recommendations
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {run.recommendations.map((rec, i) => (
                    <div key={i} style={{
                      display: "flex", gap: "0.75rem", alignItems: "flex-start",
                      background: "#0D1424", border: "1px solid #1E2D4A",
                      borderRadius: 10, padding: "1rem 1.25rem"
                    }}>
                      <ChevronRight size={14} color="#7B61FF" style={{ marginTop: 2, flexShrink: 0 }} />
                      <p style={{ fontSize: 14, color: "#B0BFDB", lineHeight: 1.6 }}>{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media print {
          nav, button { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </div>
  )
}
