import { db } from "./firebase"
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  doc, 
  getDoc,
  setDoc,
  serverTimestamp 
} from "firebase/firestore"

const BASE = "http://127.0.0.1:8000"

type StreamScoreBreakdown = {
  coverage?: { detail?: string }
  functional?: { detail?: string }
}

type StreamScoreData = {
  spec_score?: number
  breakdown?: StreamScoreBreakdown
}

export type StreamEvent = {
  done?: boolean
  completed?: boolean
  status?: string
  msg?: string
  log?: string
  message?: string
  text?: string
  level?: string
  data?: StreamScoreData
}

type ResultPayload = {
  spec_score: number
  requirements_found: number
  tests_passed: number
  tests_failed: number
  gaps_found: number
  vulnerabilities_found: number
  results: Array<{ passed?: boolean; self_healed?: boolean; method: string; endpoint: string; status_code: number }>
  gaps: Array<{ requirement_id: string; requirement_text: string }>
  security: Array<{ vulnerable: boolean; attack_type: string; severity: string; endpoint: string; description?: string }>
  recommendations: string[]
}

/**
 * Uploads the documents directly to our ingestion endpoints.
 */
export async function startRun(
  reqFile: File,
  swaggerFile: File,
  baseUrl: string
): Promise<string> {
  const formData = new FormData()
  formData.append("brd", reqFile)
  formData.append("swagger", swaggerFile)
  formData.append("base_url", baseUrl)

  const res = await fetch(`${BASE}/api/v1/upload`, { 
    method: "POST", 
    body: formData 
  })
  
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()

  // Save base URL for the run page stream logs (if needed by context)
  localStorage.setItem("spectest_base_url", baseUrl)
  return data.run_id
}

/**
 * Streams logs using EventSource (SSE).
 */
export function streamLogs(
  runId: string,
  onEvent: (event: StreamEvent) => void,
  onDone: () => void
): () => void {
  const eventSource = new EventSource(`${BASE}/api/v1/stream/${runId}`)

  eventSource.onmessage = (event) => {
    if (event.data === "[DONE]") {
      eventSource.close()
      onDone()
      return
    }

    try {
      const data = JSON.parse(event.data) as StreamEvent
      onEvent(data)
      
      if (data.done || data.completed) {
        eventSource.close()
        onDone()
      }
    } catch (e) {
      console.error("SSE Parse Error:", e)
    }
  }

  eventSource.onerror = (err) => {
    console.error("SSE Error:", err)
    eventSource.close()
    onDone()
  }

  return () => eventSource.close()
}

export async function getResult(runId: string): Promise<ResultPayload> {
    let attempts = 0;
    while (attempts < 3) {
        try {
          const docRef = doc(db, "test_runs", runId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const fireData = docSnap.data();
            return {
                spec_score: fireData.spec_score || 0,
                requirements_found: fireData.total_tests || 0,
                tests_passed: fireData.passed || 0,
                tests_failed: fireData.failed || 0,
                gaps_found: fireData.gaps || 0,
                vulnerabilities_found: 0,
                results: (fireData.results || []).map((r: any) => ({
                    passed: r.status === "PASS" || r.status === "HEALED",
                    self_healed: r.status === "HEALED",
                    method: r.method,
                    endpoint: r.endpoint,
                    status_code: r.status_code,
                    ai_explanation: r.details
                })),
                gaps: (fireData.gap_details || []).map((g: any) => ({
                    requirement_id: g.requirement_id,
                    requirement_text: g.requirement_text
                })),
                security: (fireData.security_results || []).map((s: any) => ({
                    vulnerable: s.vulnerable,
                    attack_type: s.attack_type,
                    severity: s.severity,
                    endpoint: s.endpoint,
                    description: s.description
                })),
                recommendations: fireData.recommendations || [
                    `Audit completed on ${new Date(fireData.timestamp?.seconds * 1000).toLocaleString()}`,
                    "Ready for deployment."
                ]
            };
          }
        } catch (e) {
          console.error("Firestore Fetch Error (Attempt " + (attempts + 1) + "):", e);
        }
        
        attempts++;
        if (attempts < 3) await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s between retries
    }

    throw new Error("Result document not found. The mission report might still be processing. Please wait a moment and refresh.");
}

export async function getAllRuns(): Promise<unknown[]> {
  try {
    const res = await fetch(`${BASE}/api/v1/runs`)
    if (!res.ok) return []
    return res.json()
  } catch { return [] }
}

export async function exportPDF(runId: string): Promise<void> {
  const url = `${BASE}/api/v1/report/${runId}`
  const a = document.createElement('a')
  a.href = url
  a.download = `SpecTest_Audit_${runId}.pdf`
  a.click()
}

export async function saveResultToFirestore(runId: string, data: any): Promise<void> {
    try {
        const docRef = doc(db, "test_runs", runId);
        await setDoc(docRef, {
            ...data,
            timestamp: data.timestamp ? data.timestamp : serverTimestamp()
        });
        console.log(`✓ Run ${runId} persisted from client.`);
    } catch (e) {
        console.error("Error persisting from client:", e);
        throw e;
    }
}
