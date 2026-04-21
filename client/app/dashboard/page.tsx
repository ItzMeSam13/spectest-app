"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { useToast } from "@/components/shared/Toast";
import { startRun } from "@/lib/api";
import {
	Upload,
	File,
	X,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Zap,
	Eye,
	Link2,
	Play,
	Settings,
	AlertCircle,
	Code2,
	Clock3,
} from "lucide-react";

type AuthType = "none" | "bearer" | "basic" | "apikey";
type Step = 1 | 2 | 3;

function UploadZone({
	label,
	accepts,
	acceptText,
	file,
	onFile,
	onRemove,
}: {
	label: string;
	accepts: string;
	acceptText: string;
	file: File | null;
	onFile: (f: File) => void;
	onRemove: () => void;
}) {
	const [dragging, setDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile)
			onFile({
				name: droppedFile.name,
				size: droppedFile.size,
				type: droppedFile.type,
			});
	};

	const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) onFile({ name: f.name, size: f.size, type: f.type });
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024) return `${bytes}B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
	};

	return (
		<div
			className={`drop-zone p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[160px] ${dragging ? "drag-over" : ""}`}
			onClick={() => !file && inputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={handleDrop}>
			<input
				ref={inputRef}
				type='file'
				accept={accepts}
				className='hidden'
				onChange={handleInput}
			/>
			{file ? (
				<div className='flex flex-col items-center gap-2 w-full'>
					<div
						className='w-10 h-10 rounded-xl flex items-center justify-center'
						style={{ background: "rgba(0,227,150,0.15)" }}>
						<CheckCircle size={20} style={{ color: "#00E396" }} />
					</div>
					<p
						className='text-sm font-medium max-w-full truncate px-2'
						style={{ color: "#E8EEFF" }}>
						{file.name}
					</p>
					<p className='text-xs' style={{ color: "#4A5A78" }}>
						{formatSize(file.size)}
					</p>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onRemove();
						}}
						className='flex items-center gap-1 text-xs px-3 py-1 rounded-lg transition-colors mt-1'
						style={{ color: "#FF4560", background: "rgba(255,69,96,0.1)" }}
						onMouseEnter={(e) =>
							((e.currentTarget as HTMLElement).style.background =
								"rgba(255,69,96,0.2)")
						}
						onMouseLeave={(e) =>
							((e.currentTarget as HTMLElement).style.background =
								"rgba(255,69,96,0.1)")
						}>
						<X size={12} /> Remove
					</button>
				</div>
			) : (
				<>
					<div
						className='w-10 h-10 rounded-xl flex items-center justify-center mb-3'
						style={{ background: "rgba(0,212,255,0.1)" }}>
						<Upload size={20} style={{ color: "#00D4FF" }} />
					</div>
					<p className='text-sm font-medium mb-1' style={{ color: "#E8EEFF" }}>
						{label}
					</p>
					<p className='text-xs mb-2' style={{ color: "#4A5A78" }}>
						Drag & drop or click to browse
					</p>
					<p className='text-xs' style={{ color: "#4A5A78" }}>
						Accepts: {acceptText}
					</p>
				</>
			)}
		</div>
	);
}

export default function NewTestPage() {
	const [step, setStep] = useState<Step>(1);
	const [reqFile, setReqFile] = useState<File | null>(null);
	const [specFile, setSpecFile] = useState<File | null>(null);
	const [baseUrl, setBaseUrl] = useState("");
	const [authType, setAuthType] = useState<AuthType>("none");
	const [bearerToken, setBearerToken] = useState("");
	const [basicUser, setBasicUser] = useState("");
	const [basicPass, setBasicPass] = useState("");
	const [apiKeyName, setApiKeyName] = useState("");
	const [apiKeyValue, setApiKeyValue] = useState("");
	const [testEmail, setTestEmail] = useState("");
	const [testPassword, setTestPassword] = useState("");
	const [timeout, setTimeoutVal] = useState("10");
	const [maxRetries, setMaxRetries] = useState("2");
	const [securityFuzzing, setSecurityFuzzing] = useState(true);
	const [selfHealing, setSelfHealing] = useState(true);
	const [advancedOpen, setAdvancedOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const { toast } = useToast();
	const router = useRouter();

	const canProceedStep1 = reqFile && specFile;
	const canProceedStep2 = baseUrl.trim() !== "";

	const handleRun = async () => {
		if (!reqFile || !specFile) {
			setError("Please upload both files");
			return;
		}
		setLoading(true);
		setError("");
		try {
			const runId = await startRun(reqFile, specFile, baseUrl || "DEMO");
			toast("success", "Test run started! Redirecting to live view...");
			router.push(`/run/${runId}`);
		} catch (e: unknown) {
			const message =
				typeof e === "object" && e && "message" in e
					? String((e as { message?: unknown }).message ?? "")
					: "";
			setError(message || "Failed to start run");
			setLoading(false);
			toast("error", "Failed to start run");
		}
	};

	const AGENT_STEPS = [
		{
			icon: File,
			label: "Reader",
			desc: "Parses your requirements doc and extracts structured requirements",
		},
		{
			icon: Link2,
			label: "Planner",
			desc: "Maps requirements to endpoints and plans the test sequence",
		},
		{
			icon: Play,
			label: "Executor",
			desc: "Runs HTTP tests against your API with generated payloads",
		},
		{
			icon: Eye,
			label: "Reviewer",
			desc: "Analyzes failures, attempts self-healing, flags gaps",
		},
		{
			icon: Settings,
			label: "Reporter",
			desc: "Generates SpecScore and the final gap + security report",
		},
	];

	return (
		<div style={{ background: "#0A0E1A", minHeight: "100vh" }}>
			<Navbar />
			<div className='pt-14'>
				<div className='max-w-[1300px] mx-auto px-4 sm:px-6 py-8'>
					<div className='mb-8'>
						<h1
							className='text-2xl font-bold mb-1'
							style={{ color: "#E8EEFF" }}>
							New Test Run
						</h1>
						<p className='text-sm' style={{ color: "#7B8DB0" }}>
							Upload your documents, configure settings, and launch the AI agent
						</p>
					</div>

					<div className='grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6'>
						{/* LEFT COLUMN */}
						<div className='space-y-6'>
							{/* Step indicator */}
							<div className='flex items-center gap-0'>
								{[
									{ num: 1, label: "Upload" },
									{ num: 2, label: "Configure" },
									{ num: 3, label: "Launch" },
								].map((s, i) => {
									const active = step === s.num;
									const done = step > s.num;
									return (
										<div key={s.num} className='flex items-center'>
											<button
												onClick={() => {
													if (done || active) setStep(s.num as Step);
												}}
												className='flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all'
												style={{
													background: active
														? "rgba(0,212,255,0.1)"
														: "transparent",
													color: active
														? "#00D4FF"
														: done
															? "#00E396"
															: "#4A5A78",
													border: active
														? "1px solid rgba(0,212,255,0.2)"
														: "1px solid transparent",
												}}>
												<div
													className='w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold'
													style={{
														background: active
															? "#00D4FF"
															: done
																? "#00E396"
																: "#1E2D4A",
														color: active || done ? "#0A0E1A" : "#4A5A78",
													}}>
													{done ? "✓" : s.num}
												</div>
												{s.label}
											</button>
											{i < 2 && (
												<div
													className='w-8 h-px mx-1'
													style={{
														background: step > s.num ? "#00E39666" : "#1E2D4A",
													}}
												/>
											)}
										</div>
									);
								})}
							</div>

							{/* STEP 1 */}
							{step === 1 && (
								<div
									className='rounded-2xl p-6'
									style={{
										background: "#141D35",
										border: "1px solid #1E2D4A",
									}}>
									<h2
										className='font-semibold mb-1'
										style={{ color: "#E8EEFF" }}>
										Upload Documents
									</h2>
									<p className='text-sm mb-6' style={{ color: "#7B8DB0" }}>
										Provide your requirements document and API specification
									</p>
									<div className='grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6'>
										<UploadZone
											label='Requirements Document'
											accepts='.pdf,.docx,.txt'
											acceptText='.pdf, .docx, .txt'
											file={reqFile}
											onFile={setReqFile}
											onRemove={() => setReqFile(null)}
										/>
										<UploadZone
											label='API Specification'
											accepts='.json,.yaml,.yml'
											acceptText='.json, .yaml, .yml'
											file={specFile}
											onFile={setSpecFile}
											onRemove={() => setSpecFile(null)}
										/>
									</div>
									{!canProceedStep1 && (
										<div
											className='flex items-center gap-2 text-sm mb-4'
											style={{ color: "#4A5A78" }}>
											<AlertCircle size={14} />
											Both files are required to proceed
										</div>
									)}
									<button
										onClick={() => canProceedStep1 && setStep(2)}
										disabled={!canProceedStep1}
										className='btn-cyan px-6 py-2.5 text-sm font-semibold'
										style={{ opacity: canProceedStep1 ? 1 : 0.4 }}>
										Continue to Configuration →
									</button>
								</div>
							)}

							{/* STEP 2 */}
							{step === 2 && (
								<div
									className='rounded-2xl p-6 space-y-6'
									style={{
										background: "#141D35",
										border: "1px solid #1E2D4A",
									}}>
									<div>
										<h2
											className='font-semibold mb-1'
											style={{ color: "#E8EEFF" }}>
											Configuration
										</h2>
										<p className='text-sm' style={{ color: "#7B8DB0" }}>
											Configure your API target and authentication
										</p>
									</div>

									<div>
										<label
											className='block text-sm font-medium mb-1.5'
											style={{ color: "#7B8DB0" }}>
											API Base URL *
										</label>
										<input
											className='input-dark'
											placeholder='https://api.yourapp.com'
											value={baseUrl}
											onChange={(e) => setBaseUrl(e.target.value)}
										/>
									</div>

									<div>
										<label
											className='block text-sm font-medium mb-3'
											style={{ color: "#7B8DB0" }}>
											Authentication
										</label>
										<div className='grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4'>
											{(
												["none", "bearer", "basic", "apikey"] as AuthType[]
											).map((type) => (
												<button
													key={type}
													onClick={() => setAuthType(type)}
													className='py-2 px-3 rounded-xl text-xs font-medium capitalize transition-all'
													style={{
														background:
															authType === type
																? "rgba(0,212,255,0.12)"
																: "#0A0E1A",
														border: `1px solid ${authType === type ? "rgba(0,212,255,0.3)" : "#1E2D4A"}`,
														color: authType === type ? "#00D4FF" : "#7B8DB0",
													}}>
													{type === "none"
														? "No Auth"
														: type === "bearer"
															? "Bearer Token"
															: type === "basic"
																? "Basic Auth"
																: "API Key"}
												</button>
											))}
										</div>
										{authType === "bearer" && (
											<div>
												<label
													className='block text-xs font-medium mb-1.5'
													style={{ color: "#7B8DB0" }}>
													Bearer Token
												</label>
												<input
													className='input-dark'
													placeholder='eyJhbGci...'
													value={bearerToken}
													onChange={(e) => setBearerToken(e.target.value)}
												/>
											</div>
										)}
										{authType === "basic" && (
											<div className='grid grid-cols-2 gap-3'>
												<div>
													<label
														className='block text-xs font-medium mb-1.5'
														style={{ color: "#7B8DB0" }}>
														Username
													</label>
													<input
														className='input-dark'
														placeholder='admin'
														value={basicUser}
														onChange={(e) => setBasicUser(e.target.value)}
													/>
												</div>
												<div>
													<label
														className='block text-xs font-medium mb-1.5'
														style={{ color: "#7B8DB0" }}>
														Password
													</label>
													<input
														type='password'
														className='input-dark'
														placeholder='••••••••'
														value={basicPass}
														onChange={(e) => setBasicPass(e.target.value)}
													/>
												</div>
											</div>
										)}
										{authType === "apikey" && (
											<div className='grid grid-cols-2 gap-3'>
												<div>
													<label
														className='block text-xs font-medium mb-1.5'
														style={{ color: "#7B8DB0" }}>
														Key Name
													</label>
													<input
														className='input-dark'
														placeholder='X-API-Key'
														value={apiKeyName}
														onChange={(e) => setApiKeyName(e.target.value)}
													/>
												</div>
												<div>
													<label
														className='block text-xs font-medium mb-1.5'
														style={{ color: "#7B8DB0" }}>
														Key Value
													</label>
													<input
														className='input-dark'
														placeholder='sk-...'
														value={apiKeyValue}
														onChange={(e) => setApiKeyValue(e.target.value)}
													/>
												</div>
											</div>
										)}
									</div>

									<div className='grid grid-cols-2 gap-3'>
										<div>
											<label
												className='block text-sm font-medium mb-1.5'
												style={{ color: "#7B8DB0" }}>
												Test Email
											</label>
											<input
												type='email'
												className='input-dark'
												placeholder='test@example.com'
												value={testEmail}
												onChange={(e) => setTestEmail(e.target.value)}
											/>
										</div>
										<div>
											<label
												className='block text-sm font-medium mb-1.5'
												style={{ color: "#7B8DB0" }}>
												Test Password
											</label>
											<input
												type='password'
												className='input-dark'
												placeholder='Test credentials'
												value={testPassword}
												onChange={(e) => setTestPassword(e.target.value)}
											/>
										</div>
									</div>

									{/* Advanced */}
									<div
										className='rounded-xl overflow-hidden'
										style={{ border: "1px solid #1E2D4A" }}>
										<button
											onClick={() => setAdvancedOpen(!advancedOpen)}
											className='w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors'
											style={{ background: "#0F1629", color: "#7B8DB0" }}
											onMouseEnter={(e) =>
												((e.currentTarget as HTMLElement).style.color =
													"#E8EEFF")
											}
											onMouseLeave={(e) =>
												((e.currentTarget as HTMLElement).style.color =
													"#7B8DB0")
											}>
											<div className='flex items-center gap-2'>
												<Settings size={14} /> Advanced Settings
											</div>
											{advancedOpen ? (
												<ChevronUp size={14} />
											) : (
												<ChevronDown size={14} />
											)}
										</button>
										{advancedOpen && (
											<div
												className='p-4 grid grid-cols-2 gap-4'
												style={{
													background: "#0A0E1A",
													borderTop: "1px solid #1E2D4A",
												}}>
												<div>
													<label
														className='block text-xs font-medium mb-1.5'
														style={{ color: "#7B8DB0" }}>
														Request Timeout (s)
													</label>
													<input
														type='number'
														className='input-dark'
														value={timeout}
														onChange={(e) => setTimeoutVal(e.target.value)}
														min='1'
														max='60'
													/>
												</div>
												<div>
													<label
														className='block text-xs font-medium mb-1.5'
														style={{ color: "#7B8DB0" }}>
														Max Retries
													</label>
													<input
														type='number'
														className='input-dark'
														value={maxRetries}
														onChange={(e) => setMaxRetries(e.target.value)}
														min='0'
														max='5'
													/>
												</div>
												{[
													{
														label: "Enable Security Fuzzing",
														val: securityFuzzing,
														set: setSecurityFuzzing,
														desc: "Probe endpoints for injections, XSS, and auth bypass",
													},
													{
														label: "Enable Self-Healing",
														val: selfHealing,
														set: setSelfHealing,
														desc: "Auto-adapt test assertions on field mismatch",
													},
												].map((toggle) => (
													<div
														key={toggle.label}
														className='col-span-2 flex items-center justify-between py-2'>
														<div>
															<p
																className='text-sm font-medium'
																style={{ color: "#E8EEFF" }}>
																{toggle.label}
															</p>
															<p
																className='text-xs'
																style={{ color: "#4A5A78" }}>
																{toggle.desc}
															</p>
														</div>
														<button
															onClick={() => toggle.set(!toggle.val)}
															className='w-11 h-6 rounded-full transition-all relative'
															style={{
																background: toggle.val ? "#00D4FF" : "#1E2D4A",
															}}>
															<div
																className='absolute top-0.5 w-5 h-5 rounded-full transition-all'
																style={{
																	background: "white",
																	left: toggle.val
																		? "calc(100% - 22px)"
																		: "2px",
																}}
															/>
														</button>
													</div>
												))}
											</div>
										)}
									</div>

									<div className='flex gap-3'>
										<button
											onClick={() => setStep(1)}
											className='px-4 py-2.5 rounded-xl text-sm font-medium transition-colors'
											style={{
												background: "#0F1629",
												color: "#7B8DB0",
												border: "1px solid #1E2D4A",
											}}>
											← Back
										</button>
										<button
											onClick={() => canProceedStep2 && setStep(3)}
											disabled={!canProceedStep2}
											className='btn-cyan px-6 py-2.5 text-sm font-semibold'
											style={{ opacity: canProceedStep2 ? 1 : 0.4 }}>
											Continue to Launch →
										</button>
									</div>
								</div>
							)}

							{/* STEP 3 */}
							{step === 3 && (
								<div
									className='rounded-2xl p-6 space-y-6'
									style={{
										background: "#141D35",
										border: "1px solid #1E2D4A",
									}}>
									<div>
										<h2
											className='font-semibold mb-1'
											style={{ color: "#E8EEFF" }}>
											Ready to Launch
										</h2>
										<p className='text-sm' style={{ color: "#7B8DB0" }}>
											Review your configuration and run the test
										</p>
									</div>

									{/* Summary */}
									<div
										className='rounded-xl p-4 space-y-3'
										style={{
											background: "#0F1629",
											border: "1px solid #1E2D4A",
										}}>
										{[
											{
												label: "Requirements Doc",
												value: reqFile?.name || "—",
												icon: File,
												color: "#00E396",
											},
											{
												label: "API Spec",
												value: specFile?.name || "—",
												icon: Code2,
												color: "#00E396",
											},
											{
												label: "Base URL",
												value: baseUrl || "—",
												icon: Link2,
												color: "#00D4FF",
											},
											{
												label: "Auth Type",
												value:
													authType === "none"
														? "No Auth"
														: authType === "bearer"
															? "Bearer Token"
															: authType === "basic"
																? "Basic Auth"
																: "API Key",
												icon: Settings,
												color: "#7B61FF",
											},
											{
												label: "Security Fuzzing",
												value: securityFuzzing ? "Enabled" : "Disabled",
												icon: Zap,
												color: securityFuzzing ? "#00E396" : "#4A5A78",
											},
											{
												label: "Self-Healing",
												value: selfHealing ? "Enabled" : "Disabled",
												icon: Settings,
												color: selfHealing ? "#00E396" : "#4A5A78",
											},
										].map((item) => (
											<div
												key={item.label}
												className='flex items-center justify-between'>
												<div className='flex items-center gap-2'>
													<item.icon size={13} style={{ color: item.color }} />
													<span
														className='text-sm'
														style={{ color: "#7B8DB0" }}>
														{item.label}
													</span>
												</div>
												<span
													className='text-sm font-medium truncate max-w-[200px]'
													style={{ color: "#E8EEFF" }}>
													{item.value}
												</span>
											</div>
										))}
									</div>

									{error && (
										<div className='text-red-500 font-medium text-sm text-center'>
											{error}
										</div>
									)}
									<button
										onClick={handleRun}
										disabled={loading}
										className='btn-cyan w-full py-4 text-base font-bold flex items-center justify-center gap-3'
										style={{
											background: loading
												? "#00D4FF99"
												: "linear-gradient(135deg, #00D4FF, #0099BB)",
											boxShadow: loading
												? "none"
												: "0 0 30px rgba(0,212,255,0.25)",
										}}>
										{loading ? (
											<>
												<div className='w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin' />{" "}
												Starting test run...
											</>
										) : (
											<>
												<Zap size={20} /> Run SpecTest
											</>
										)}
									</button>
									<p
										className='text-center text-xs'
										style={{ color: "#4A5A78" }}>
										Estimated time: 2–5 minutes depending on number of endpoints
									</p>

									<button
										onClick={() => setStep(2)}
										className='w-full py-2 text-sm transition-colors'
										style={{ color: "#4A5A78" }}>
										← Edit configuration
									</button>
								</div>
							)}
						</div>

						{/* RIGHT COLUMN */}
						<div className='space-y-4'>
							{/* Agent pipeline */}
							<div
								className='rounded-2xl p-6'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<h3 className='font-semibold mb-4' style={{ color: "#E8EEFF" }}>
									What happens next
								</h3>
								<div className='space-y-0'>
									{AGENT_STEPS.map((s, i) => (
										<div key={i} className='relative flex gap-4'>
											{i < AGENT_STEPS.length - 1 && (
												<div
													className='absolute left-4 top-10 bottom-0 w-px'
													style={{ background: "#1E2D4A" }}
												/>
											)}
											<div
												className='w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10'
												style={{
													background: "#0F1629",
													border: "1px solid #1E2D4A",
												}}>
												<s.icon size={14} style={{ color: "#00D4FF" }} />
											</div>
											<div className='pb-5'>
												<p
													className='text-sm font-semibold mb-0.5'
													style={{ color: "#E8EEFF" }}>
													{s.label}
												</p>
												<p
													className='text-xs leading-relaxed'
													style={{ color: "#7B8DB0" }}>
													{s.desc}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>

							{/* Tips */}
							<div
								className='rounded-2xl p-5'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<h3
									className='text-sm font-semibold mb-3'
									style={{ color: "#E8EEFF" }}>
									Tips for best results
								</h3>
								<ul className='space-y-2'>
									{[
										"Use numbered requirements (REQ-01, REQ-02...)",
										"Include expected HTTP status codes in requirements",
										"Ensure Swagger spec has request/response schemas",
										"Add test credentials for auth-protected endpoints",
									].map((tip, i) => (
										<li
											key={i}
											className='flex items-start gap-2 text-xs'
											style={{ color: "#7B8DB0" }}>
											<span style={{ color: "#00D4FF" }}>→</span> {tip}
										</li>
									))}
								</ul>
							</div>

							<div
								className='rounded-2xl p-5'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<div className='flex items-center gap-2 mb-3'>
									<Clock3 size={14} style={{ color: "#00D4FF" }} />
									<h3
										className='text-sm font-semibold'
										style={{ color: "#E8EEFF" }}>
										Run cadence
									</h3>
								</div>
								<p className='text-sm leading-relaxed' style={{ color: "#7B8DB0" }}>
									Most teams run regression checks at least once daily and after
									every API schema change for reliable coverage.
								</p>
							</div>
						</div>
					</div>

				</div>
			</div>
		</div>
	);
}
