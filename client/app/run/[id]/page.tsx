"use client"
import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { streamLogs } from "@/lib/api"
import { Navbar } from "@/components/shared/Navbar"

export default function RunPage() {
  const params = useParams()
  const router = useRouter()
  const runId = params.id as string
  const [logs, setLogs] = useState<string[]>([])
  const [metrics, setMetrics] = useState<Record<string,number>>({})
  const [done, setDone] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    
    const cleanup = streamLogs(
      runId,
      (log) => setLogs(p => [...p, log]),
      (m) => setMetrics(m),
      () => {
        setDone(true)
        if (timerRef.current) clearInterval(timerRef.current)
      }
    )
    
    return () => {
      cleanup()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [runId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      { behavior: "smooth" })
  }, [logs])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2,'0')}:${
      sec.toString().padStart(2,'0')}`
  }

  const getLogColor = (log: string) => {
    if (log.includes("[READER]")) return "#00D4FF"
    if (log.includes("[PLANNER]")) return "#7B61FF"
    if (log.includes("[SECURITY]")) return "#FF4560"
    if (log.includes("[REVIEWER]")) return "#FFB547"
    if (log.includes("✅") || 
        log.includes("PASSED")) return "#00E396"
    if (log.includes("❌") || 
        log.includes("FAILED")) return "#FF4560"
    if (log.includes("⚠") || 
        log.includes("HEALED")) return "#FFB547"
    return "#E8EEFF"
  }

  return (
    <div style={{background:"#0A0E1A",
      minHeight:"100vh"}}>
      <Navbar />
      <div style={{padding:"2rem",
        maxWidth:"1200px", margin:"0 auto"}}>
        
        {/* Header */}
        <div style={{display:"flex",
          justifyContent:"space-between",
          alignItems:"center",
          marginBottom:"1.5rem"}}>
          <h1 style={{color:"#E8EEFF",
            margin:0, fontSize:"24px"}}>
            Run #{runId.slice(0,8)}
          </h1>
          <div style={{display:"flex",
            gap:"1rem", alignItems:"center"}}>
            <span style={{
              color: done ? "#00E396" : "#00D4FF",
              fontSize:"14px", fontWeight:"bold"}}>
              {done ? "✅ COMPLETE" : 
                `● RUNNING ${formatTime(elapsed)}`}
            </span>
          </div>
        </div>

        <div style={{display:"grid",
          gridTemplateColumns:"60% 40%",
          gap:"1.5rem"}}>

          {/* Terminal */}
          <div style={{background:"#050A14",
            borderRadius:"12px",
            overflow:"hidden",
            border:"1px solid #1E2D4A"}}>
            <div style={{
              background:"#00D4FF",
              padding:"10px 16px",
              display:"flex",
              justifyContent:"space-between",
              alignItems:"center"}}>
              <span style={{
                fontFamily:"JetBrains Mono, monospace",
                fontSize:"12px",
                fontWeight:"bold",
                color:"#0A0E1A"}}>
                SPECTEST AGENT // LIVE OUTPUT
              </span>
              <div style={{display:"flex",gap:"6px"}}>
                {["#FF4560","#FFB547","#00E396"]
                  .map((c,i) => (
                  <div key={i} style={{
                    width:"10px", height:"10px",
                    borderRadius:"50%",
                    background:c}}/>
                ))}
              </div>
            </div>
            <div style={{
              padding:"1rem",
              height:"55vh",
              overflowY:"auto",
              fontFamily:"JetBrains Mono, monospace",
              fontSize:"12px",
              lineHeight:"1.8"}}>
              {logs.map((log, i) => (
                <div key={i} style={{
                  color: getLogColor(log),
                  marginBottom:"2px"}}>
                  {log}
                </div>
              ))}
              {!done && logs.length > 0 && (
                <span style={{
                  color:"#00D4FF",
                  animation:"blink 1s infinite"}}>
                  █
                </span>
              )}
              <div ref={bottomRef}/>
            </div>
          </div>

          {/* Metrics */}
          <div style={{display:"flex",
            flexDirection:"column", gap:"1rem"}}>
            {[
              ["Requirements",
                metrics.requirements_found || 0,
                "#00D4FF"],
              ["Mapped",
                metrics.endpoints_mapped || 0,
                "#7B61FF"],
              ["Tests Passed",
                metrics.tests_passed || 0,
                "#00E396"],
              ["Vulnerabilities",
                metrics.vulnerabilities_found || 0,
                "#FF4560"]
            ].map(([label, val, color]) => (
              <div key={label} style={{
                background:"#141D35",
                border:"1px solid #1E2D4A",
                borderRadius:"12px",
                padding:"1.5rem",
                textAlign:"center"}}>
                <div style={{
                  fontSize:"36px",
                  fontWeight:"bold",
                  color: color as string}}>
                  {val as number}
                </div>
                <div style={{
                  color:"#7B8DB0",
                  fontSize:"13px",
                  marginTop:"4px"}}>
                  {label as string}
                </div>
              </div>
            ))}
            
            {done && (
              <button
                onClick={() => router.push(
                  `/results/${runId}`)}
                style={{
                  background:"#00D4FF",
                  color:"#0A0E1A",
                  border:"none",
                  padding:"16px",
                  borderRadius:"8px",
                  fontSize:"16px",
                  fontWeight:"bold",
                  cursor:"pointer",
                  marginTop:"1rem"}}>
                View Full Results →
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes blink {
          0%,100%{opacity:1}
          50%{opacity:0}
        }
      `}</style>
    </div>
  )
}
