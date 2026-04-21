"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Link2,
  Zap,
  GitBranch,
  RefreshCw,
  Shield,
  Terminal,
  Star,
  ArrowRight,
  Play,
  ChevronRight,
} from "lucide-react";
import { SpecScoreRing } from "@/components/shared/SpecScoreRing";

const HERO_LOGS = [
  { type: "READER", text: "Parsing requirements document... (api-requirements.pdf)" },
  { type: "READER", text: "Extracted 12 requirements across 4 modules" },
  { type: "PLANNER", text: "Mapping REQ-01 → POST /auth/login [HIGH confidence]" },
  { type: "PLANNER", text: "Mapping REQ-02 → GET /users/me [HIGH confidence]" },
  { type: "PLANNER", text: "Mapping REQ-05 → ??? [GAP DETECTED — no endpoint found]" },
  { type: "EXECUTOR", text: "✓ Test passed — POST /auth/login → 200 OK (94ms)" },
  { type: "EXECUTOR", text: "✓ Test passed — GET /users/me → 200 OK (56ms)" },
  { type: "EXECUTOR", text: "✗ Test failed — DELETE /users/{id} → 404 Not Found" },
  { type: "REVIEWER", text: "⚠ Self-healing: scanning alternate endpoints..." },
  { type: "REVIEWER", text: "✓ Self-healed — adapted assertion for field 'access_token'" },
  { type: "SECURITY", text: "🔴 Vulnerability detected! Rate limit bypass on /auth/login" },
  { type: "REPORTER", text: "SpecScore: 87/100 — 3 gaps, 1 vulnerability found" },
];

const LOG_COLORS: Record<string, string> = {
  READER: "#00D4FF",
  PLANNER: "#7B61FF",
  EXECUTOR: "#E8EEFF",
  REVIEWER: "#FFB547",
  SECURITY: "#FF4560",
  REPORTER: "#00E396",
};

const FEATURES = [
  { icon: GitBranch, title: "Intelligent Gap Detection", desc: "AI maps every requirement to an endpoint and surfaces missing coverage before you ship.", color: "#00D4FF" },
  { icon: Link2, title: "Dependency Chain Resolution", desc: "Automatically sequences tests in the correct order — auth first, then protected routes.", color: "#7B61FF" },
  { icon: RefreshCw, title: "Self-Healing Execution", desc: "When tests fail due to field mismatches, the agent adapts and retries automatically.", color: "#00E396" },
  { icon: Shield, title: "Security Fuzzing Mode", desc: "Probes every endpoint for SQL injection, XSS, auth bypass, and rate limiting gaps.", color: "#FF4560" },
  { icon: Terminal, title: "Live Agent Thought Stream", desc: "Watch the AI reason in real-time — every decision, mapping, and finding is visible.", color: "#FFB547" },
  { icon: Star, title: "SpecScore™ Rating", desc: "One number summarizing your API quality across coverage, security, and documentation.", color: "#00D4FF" },
];

const STEPS = [
  { icon: Upload, step: "01", title: "Upload", desc: "Drop your requirements doc and Swagger file. PDF, DOCX, YAML — all accepted.", color: "#00D4FF" },
  { icon: Link2, step: "02", title: "Map", desc: "AI maps every requirement to an endpoint, flags gaps, and plans the test suite.", color: "#7B61FF" },
  { icon: Zap, step: "03", title: "Run", desc: "Tests execute, gaps surface, the report generates. Done in minutes, not days.", color: "#00E396" },
];

function HeroTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let count = 0;
    const tick = () => {
      if (count < HERO_LOGS.length) {
        count++;
        setVisibleCount(count);
        setTimeout(tick, 400 + Math.random() * 250);
      } else {
        setTimeout(() => {
          count = 0;
          setVisibleCount(0);
          setTimeout(tick, 500);
        }, 2500);
      }
    };
    const t = setTimeout(tick, 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleCount]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#050A14", border: "1px solid #1E2D4A", boxShadow: "0 0 60px rgba(0,212,255,0.08), 0 32px 64px rgba(0,0,0,0.5)" }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: "#0A0E1A", borderBottom: "1px solid #1E2D4A" }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#FF4560" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#FFB547" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#00E396" }} />
        </div>
        <div className="flex-1 text-center text-xs font-medium tracking-widest uppercase" style={{ color: "#00D4FF", fontFamily: "JetBrains Mono, monospace" }}>
          SPECTEST AGENT // LIVE OUTPUT
        </div>
      </div>
      <div ref={containerRef} className="p-5 h-64 overflow-hidden" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}>
        {HERO_LOGS.slice(0, visibleCount).map((log, i) => {
          const color = LOG_COLORS[log.type] || "#E8EEFF";
          const mins = String(12 + Math.floor(i * 0.3)).padStart(2, "0");
          const secs = String((i * 7) % 60).padStart(2, "0");
          return (
            <div key={`${i}-${visibleCount}`} className="log-line mb-1.5 flex gap-3 items-start">
              <span className="shrink-0" style={{ color: "#4A5A78" }}>11:{mins}:{secs}</span>
              <span className="px-1.5 rounded text-[10px] font-semibold shrink-0 leading-[1.6]" style={{ background: `${color}18`, color }}>
                {log.type}
              </span>
              <span style={{ color }}>{log.text}</span>
            </div>
          );
        })}
        <div className="flex gap-3 items-center mt-1">
          <span style={{ color: "#4A5A78", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}>──:──:──</span>
          <span style={{ color: "#00D4FF", fontSize: "14px" }} className="animate-pulse">▋</span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: "#0A0E1A", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14" style={{ background: "rgba(10,14,26,0.92)", borderBottom: "1px solid #1E2D4A", backdropFilter: "blur(12px)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00D4FF, #7B61FF)" }}>
              <Zap size={14} color="white" />
            </div>
            <span className="font-bold text-base" style={{ color: "#E8EEFF" }}>SpecTest</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {["Features", "Docs", "Pricing"].map((item) => (
              <a key={item} href="#" className="text-sm transition-colors" style={{ color: "#7B8DB0" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#E8EEFF")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#7B8DB0")}>
                {item}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth" className="text-sm px-4 py-1.5 rounded-lg transition-colors" style={{ color: "#7B8DB0" }}>Sign in</Link>
            <Link href="/auth" className="btn-cyan px-4 py-1.5 text-sm">Continue</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative grid-bg pt-28 pb-20 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #00D4FF 0%, transparent 70%)", filter: "blur(80px)", opacity: 0.07 }} />
        <div className="absolute top-32 right-1/4 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, #7B61FF 0%, transparent 70%)", filter: "blur(80px)", opacity: 0.06 }} />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)", color: "#00D4FF" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: "#00D4FF" }} />
              Now in public beta — free for teams under 10
              <ChevronRight size={12} />
            </div>
          </div>
          <h1 className="text-center font-bold leading-tight mb-6" style={{ fontSize: "clamp(36px,6vw,72px)", color: "#E8EEFF", letterSpacing: "-0.02em" }}>
            Stop Writing Tests.
            <br />
            <span style={{ background: "linear-gradient(135deg, #00D4FF, #7B61FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Start Shipping Faster.
            </span>
          </h1>
          <p className="text-center max-w-2xl mx-auto mb-10 text-lg leading-relaxed" style={{ color: "#7B8DB0" }}>
            SpecTest reads your requirements and your API spec, maps them together, and runs your entire test suite autonomously. Find gaps before your users do.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/auth" className="btn-cyan px-8 py-3.5 text-base font-semibold flex items-center gap-2">
              Start Testing Free <ArrowRight size={18} />
            </Link>
            <Link href="/run/run-247" className="btn-ghost-cyan px-8 py-3.5 text-base font-medium flex items-center gap-2">
              <Play size={16} style={{ color: "#00D4FF" }} /> See it in action
            </Link>
          </div>
          <div className="max-w-3xl mx-auto">
            <HeroTerminal />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24" style={{ background: "#0F1629" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00D4FF" }}>How it works</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#E8EEFF", letterSpacing: "-0.02em" }}>From spec to report in 3 steps</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: "#7B8DB0" }}>No scripting. No configuration. Just upload your docs and watch the agent work.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={i} className="card-hover p-8 rounded-2xl text-center" style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}>
                  <step.icon size={24} style={{ color: step.color }} />
                </div>
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: step.color }}>STEP {step.step}</div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#E8EEFF" }}>{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#7B8DB0" }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24" style={{ background: "#0A0E1A" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#7B61FF" }}>Features</p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#E8EEFF", letterSpacing: "-0.02em" }}>Everything QA needs. Nothing it doesn&apos;t.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="card-hover p-6 rounded-2xl" style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${f.color}15` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="font-semibold mb-2" style={{ color: "#E8EEFF" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#7B8DB0" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SpecScore */}
      <section className="py-24" style={{ background: "#0F1629" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#00D4FF" }}>SpecScore™</p>
              <h2 className="text-4xl font-bold mb-6" style={{ color: "#E8EEFF", letterSpacing: "-0.02em" }}>One number. Complete picture.</h2>
              <p className="text-lg mb-8" style={{ color: "#7B8DB0" }}>SpecScore™ aggregates requirements coverage, security posture, documentation health, and auth robustness into a single actionable metric.</p>
              <div className="space-y-4">
                {[
                  { label: "Requirements Coverage", val: 85, color: "#00D4FF" },
                  { label: "Security Posture", val: 95, color: "#00E396" },
                  { label: "Doc Consistency", val: 72, color: "#FFB547" },
                  { label: "Auth Robustness", val: 100, color: "#7B61FF" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span style={{ color: "#7B8DB0" }}>{item.label}</span>
                      <span className="font-semibold" style={{ color: item.color }}>{item.val}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1E2D4A" }}>
                      <div className="h-full rounded-full" style={{ width: `${item.val}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}99)` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <SpecScoreRing score={87} size={220} strokeWidth={14} fontSize={64} />
              <p className="mt-6 text-sm text-center" style={{ color: "#4A5A78" }}>Live score from a real e-commerce API test run</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: "#0A0E1A" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(0,212,255,0.06) 0%, transparent 65%)" }} />
        <div className="max-w-[700px] mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold mb-6" style={{ color: "#E8EEFF", letterSpacing: "-0.02em" }}>Ready to find your gaps?</h2>
          <p className="text-lg mb-10" style={{ color: "#7B8DB0" }}>Join QA engineers who&apos;ve stopped writing tests manually and started shipping with confidence.</p>
          <Link href="/auth" className="btn-cyan inline-flex items-center gap-2 px-10 py-4 text-base font-semibold">
            Start Testing Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{ background: "#0A0E1A", borderTop: "1px solid #1E2D4A" }}>
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00D4FF, #7B61FF)" }}>
                <Zap size={12} color="white" />
              </div>
              <span className="font-bold text-sm" style={{ color: "#E8EEFF" }}>SpecTest</span>
            </div>
            <p className="text-xs" style={{ color: "#4A5A78" }}>Built for QA engineers who are done with manual testing</p>
          </div>
          <div className="flex items-center gap-6">
            {["Docs", "GitHub", "Privacy", "Terms"].map((link) => (
              <a key={link} href="#" className="text-xs flex items-center gap-1 transition-colors" style={{ color: "#4A5A78" }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#7B8DB0")}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#4A5A78")}>
                {link === "GitHub" && <Link2 size={12} />}{link}
              </a>
            ))}
          </div>
          <p className="text-xs" style={{ color: "#4A5A78" }}>© 2026 SpecTest</p>
        </div>
      </footer>
    </div>
  );
}
