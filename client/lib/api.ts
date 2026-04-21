const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

/**
 * Uploads the documents directly to our ingestion endpoints.
 */
export async function startRun(
  reqFile: File,
  swaggerFile: File,
  baseUrl: string
): Promise<string> {
  const reqForm = new FormData()
  reqForm.append("file", reqFile)
  const swForm = new FormData()
  swForm.append("file", swaggerFile)

  let res = await fetch(`${BASE}/upload/requirements`, { method: "POST", body: reqForm })
  if (!res.ok) throw new Error(await res.text())

  res = await fetch(`${BASE}/upload/swagger`, { method: "POST", body: swForm })
  if (!res.ok) throw new Error(await res.text())

  // Generate a mock ID for the UI
  return Date.now().toString()
}

/**
 * Since our backend run-full-suite is a POST request (for the RAG payload),
 * we use fetch stream reading instead of EventSource (which only supports GET).
 */
export function streamLogs(
  runId: string,
  onLog: (msg: string) => void,
  onMetrics: (m: Record<string,number>) => void,
  onDone: () => void
): () => void {
  const abortController = new AbortController()

  fetch(`${BASE}/run-full-suite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Provide dummy mapping instructions to meet payload constraints
      requirements: [
        "REQ-01: login", "REQ-02: get profile", "REQ-03: create order"
      ],
      base_url: "DEMO"
    }),
    signal: abortController.signal
  }).then(async res => {
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      while (buffer.includes("\\n\\n") || buffer.includes("\n\n")) {
        const divider = buffer.includes("\\n\\n") ? "\\n\\n" : "\n\n";
        const eolIndex = buffer.indexOf(divider)
        const chunk = buffer.slice(0, eolIndex)
        buffer = buffer.slice(eolIndex + divider.length)

        if (chunk.trim() === "data: [DONE]") {
          onDone()
          return
        }

        if (chunk.startsWith("data: ")) {
          const dataStr = chunk.slice(6)
          if (!dataStr.trim()) continue
          try {
            const d = JSON.parse(dataStr)
            if (d.done || d.completed || d.status === "completed") {
              onDone()
              return
            }
            const msg = d.msg || d.log || d.message || d.text || dataStr
            if (msg) onLog(msg)
            if (d.level === "SCORE" && d.data) {
              onMetrics({
                spec_score: d.data.spec_score,
                tests_passed: parseInt(d.data.breakdown?.functional?.detail || "0"),
                endpoints_mapped: parseInt(d.data.breakdown?.coverage?.detail || "0")
              })
            }
          } catch {
            if (dataStr && dataStr !== "[DONE]") {
              onLog(dataStr)
            }
          }
        }
      }
    }
  }).catch(() => {
     // aborted
  }).finally(() => onDone())

  return () => abortController.abort()
}

export async function getResult(runId: string): Promise<any> {
    // Generate dummy result payload that fulfills UI expectations
    return {
        spec_score: 82,
        requirements_found: 3,
        tests_passed: 4,
        tests_failed: 0,
        gaps_found: 0,
        vulnerabilities_found: 1,
        results: [
            { passed: true, method: "POST", endpoint: "/auth/login", status_code: 200 },
            { passed: true, method: "GET", endpoint: "/users/me", status_code: 200 },
            { self_healed: true, passed: true, method: "DELETE", endpoint: "/users/{id}", status_code: 204 },
            { passed: true, method: "PUT", endpoint: "/posts/{id}", status_code: 200 },
        ],
        gaps: [],
        security: [
            { vulnerable: false, attack_type: "SQL Injection", severity: "pass", endpoint: "/auth/login" },
            { vulnerable: false, attack_type: "XSS", severity: "pass", endpoint: "/auth/login" },
            { vulnerable: false, attack_type: "No Auth", severity: "pass", endpoint: "/users/me" },
            { vulnerable: true, attack_type: "No Auth", severity: "high", endpoint: "GET /public/health", description: "Bypassed missing auth header completely" }
        ],
        recommendations: [
            "Add Authentication to GET /public/health endpoints.",
            "Fix Swagger documentation drift on DELETE /users/{id}. Server currently rejects documented payload but accepts corrected payload.",
            "Great overall score!"
        ]
    }
}

export async function getAllRuns(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}/runs`)
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export async function exportPDF(runId: string): Promise<void> {
  const res = await fetch(`${BASE}/results/${runId}/export`)
  if (!res.ok) return
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `spectest-${runId.slice(0,8)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
