"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
	ScoreBadge,
	MiniSpecScoreRing,
} from "@/components/shared/SpecScoreRing";
import { mockRuns, specScoreTrend } from "@/lib/mock-data";
import {
	TrendingUp,
	Plus,
	Eye,
	ArrowUpRight,
	AlertTriangle,
	CheckCircle2,
	Zap,
	RefreshCw,
	Shield,
	BookOpen,
	ChevronRight,
} from "lucide-react";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
} from "recharts";

const STATUS_CONFIG = {
	completed: {
		label: "Completed",
		color: "#00E396",
		bg: "rgba(0,227,150,0.12)",
		border: "rgba(0,227,150,0.25)",
	},
	running: {
		label: "Running",
		color: "#00D4FF",
		bg: "rgba(0,212,255,0.12)",
		border: "rgba(0,212,255,0.25)",
	},
	failed: {
		label: "Failed",
		color: "#FF4560",
		bg: "rgba(255,69,96,0.12)",
		border: "rgba(255,69,96,0.25)",
	},
};

function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: Array<{ value: number }>;
	label?: string;
}) {
	if (active && payload && payload.length) {
		return (
			<div
				className='px-3 py-2 rounded-lg text-sm'
				style={{
					background: "#141D35",
					border: "1px solid #1E2D4A",
					color: "#E8EEFF",
				}}>
				<p style={{ color: "#7B8DB0", fontSize: 11 }}>{label}</p>
				<p className='font-semibold' style={{ color: "#00D4FF" }}>
					Score: {payload[0].value}
				</p>
			</div>
		);
	}
	return null;
}

export default function Dashboard() {
	const [hoveredRow, setHoveredRow] = useState<string | null>(null);
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/");
		}
	}, [loading, user, router]);

	if (loading || !user) {
		return (
			<div
				className='min-h-screen flex items-center justify-center'
				style={{ background: "#0A0E1A", color: "#E8EEFF" }}>
				Loading...
			</div>
		);
	}

	return (
		<div style={{ background: "#0A0E1A", minHeight: "100vh" }}>
			<Navbar />
			<div className='pt-14'>
				<div className='max-w-[1400px] mx-auto px-4 sm:px-6 py-8'>
					{/* Header */}
					<div className='flex items-center justify-between mb-8'>
						<div>
							<h1
								className='text-2xl font-bold mb-1'
								style={{ color: "#E8EEFF", letterSpacing: "-0.01em" }}>
								Dashboard
							</h1>
							<p className='text-sm' style={{ color: "#7B8DB0" }}>
								Monday, April 21, 2026
							</p>
						</div>
						<Link
							href='/new-test'
							className='btn-cyan px-5 py-2.5 text-sm font-semibold flex items-center gap-2'>
							<Plus size={16} /> New Test
						</Link>
					</div>

					{/* Stats row */}
					<div className='grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
						{[
							{
								label: "Total Tests Run",
								value: "247",
								icon: Zap,
								color: "#00D4FF",
								sub: "+12 this week",
							},
							{
								label: "Avg SpecScore™",
								value: "73",
								icon: null,
								color: "#FFB547",
								sub: "-2 from last week",
								ring: true,
							},
							{
								label: "Gaps Detected",
								value: "18",
								icon: AlertTriangle,
								color: "#FF4560",
								sub: "Across all runs",
							},
							{
								label: "Tests This Week",
								value: "12",
								icon: TrendingUp,
								color: "#00E396",
								sub: "+4 vs last week",
								trend: true,
							},
						].map((stat, i) => (
							<div
								key={i}
								className='card-hover p-5 rounded-2xl'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<div className='flex items-start justify-between mb-3'>
									<p
										className='text-xs font-medium'
										style={{ color: "#7B8DB0" }}>
										{stat.label}
									</p>
									{stat.ring ? (
										<MiniSpecScoreRing score={73} />
									) : stat.icon ? (
										<div
											className='w-8 h-8 rounded-lg flex items-center justify-center'
											style={{ background: `${stat.color}15` }}>
											<stat.icon size={16} style={{ color: stat.color }} />
										</div>
									) : null}
								</div>
								<p
									className='text-3xl font-bold mb-1'
									style={{
										color: stat.ring
											? "#FFB547"
											: stat.color === "#FF4560"
												? "#FF4560"
												: "#E8EEFF",
									}}>
									{stat.value}
								</p>
								<p
									className='text-xs flex items-center gap-1'
									style={{ color: stat.trend ? "#00E396" : "#4A5A78" }}>
									{stat.trend && <ArrowUpRight size={11} />}
									{stat.sub}
								</p>
							</div>
						))}
					</div>

					<div className='grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6'>
						{/* Left column */}
						<div className='space-y-6'>
							{/* Recent Runs Table */}
							<div
								className='rounded-2xl overflow-hidden'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<div
									className='px-6 py-4 flex items-center justify-between'
									style={{ borderBottom: "1px solid #1E2D4A" }}>
									<h2 className='font-semibold' style={{ color: "#E8EEFF" }}>
										Recent Runs
									</h2>
									<Link
										href='/history'
										className='text-xs flex items-center gap-1 transition-colors'
										style={{ color: "#7B8DB0" }}
										onMouseEnter={(e) =>
											((e.target as HTMLElement).style.color = "#00D4FF")
										}
										onMouseLeave={(e) =>
											((e.target as HTMLElement).style.color = "#7B8DB0")
										}>
										View all <ChevronRight size={12} />
									</Link>
								</div>
								<div className='overflow-x-auto'>
									<table className='w-full text-sm'>
										<thead>
											<tr style={{ borderBottom: "1px solid #1E2D4A" }}>
												{[
													"Project",
													"SpecScore",
													"Tests",
													"Passed",
													"Gaps",
													"Security",
													"Date",
													"Status",
													"",
												].map((h) => (
													<th
														key={h}
														className='px-4 py-3 text-left text-xs font-medium'
														style={{ color: "#4A5A78", whiteSpace: "nowrap" }}>
														{h}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{mockRuns.map((run) => {
												const sc = STATUS_CONFIG[run.status];
												return (
													<tr
														key={run.id}
														className='cursor-pointer transition-colors'
														style={{
															borderBottom: "1px solid #1E2D4A",
															background:
																hoveredRow === run.id
																	? "#0F1629"
																	: "transparent",
														}}
														onMouseEnter={() => setHoveredRow(run.id)}
														onMouseLeave={() => setHoveredRow(null)}>
														<td className='px-4 py-3.5'>
															<p
																className='font-medium text-sm'
																style={{ color: "#E8EEFF" }}>
																{run.project}
															</p>
															<p
																className='text-xs'
																style={{ color: "#4A5A78" }}>
																#{run.id.replace("run-", "")}
															</p>
														</td>
														<td className='px-4 py-3.5'>
															<ScoreBadge score={run.specScore} />
														</td>
														<td
															className='px-4 py-3.5 tabular-nums'
															style={{ color: "#7B8DB0" }}>
															{run.tests}
														</td>
														<td
															className='px-4 py-3.5 tabular-nums'
															style={{ color: "#00E396" }}>
															{run.passed}
														</td>
														<td
															className='px-4 py-3.5 tabular-nums'
															style={{
																color: run.gaps > 0 ? "#FFB547" : "#7B8DB0",
															}}>
															{run.gaps}
														</td>
														<td
															className='px-4 py-3.5 tabular-nums'
															style={{
																color:
																	run.securityIssues > 0
																		? "#FF4560"
																		: "#7B8DB0",
															}}>
															{run.securityIssues}
														</td>
														<td
															className='px-4 py-3.5 text-xs'
															style={{
																color: "#4A5A78",
																whiteSpace: "nowrap",
															}}>
															{new Date(run.date).toLocaleDateString("en-US", {
																month: "short",
																day: "numeric",
															})}
														</td>
														<td className='px-4 py-3.5'>
															<span
																className='px-2 py-0.5 rounded-md text-xs font-medium'
																style={{
																	background: sc.bg,
																	color: sc.color,
																	border: `1px solid ${sc.border}`,
																}}>
																{run.status === "running" && (
																	<span
																		className='inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse'
																		style={{ background: sc.color }}
																	/>
																)}
																{sc.label}
															</span>
														</td>
														<td className='px-4 py-3.5'>
															<Link
																href={`/results/${run.id}`}
																className='flex items-center gap-1 text-xs font-medium transition-colors px-2.5 py-1 rounded-lg'
																style={{
																	color: "#00D4FF",
																	background: "rgba(0,212,255,0.08)",
																}}
																onMouseEnter={(e) =>
																	((
																		e.currentTarget as HTMLElement
																	).style.background = "rgba(0,212,255,0.15)")
																}
																onMouseLeave={(e) =>
																	((
																		e.currentTarget as HTMLElement
																	).style.background = "rgba(0,212,255,0.08)")
																}>
																<Eye size={12} /> View
															</Link>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>

							{/* Chart */}
							<div
								className='rounded-2xl p-6'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<div className='flex items-center justify-between mb-6'>
									<div>
										<h2
											className='font-semibold mb-1'
											style={{ color: "#E8EEFF" }}>
											SpecScore™ Trend
										</h2>
										<p className='text-xs' style={{ color: "#4A5A78" }}>
											Last 7 runs
										</p>
									</div>
									<div className='flex items-center gap-2'>
										<div
											className='w-3 h-0.5 rounded'
											style={{ background: "#00D4FF" }}
										/>
										<span className='text-xs' style={{ color: "#4A5A78" }}>
											SpecScore
										</span>
									</div>
								</div>
								<ResponsiveContainer width='100%' height={200}>
									<LineChart data={specScoreTrend}>
										<CartesianGrid
											strokeDasharray='3 3'
											stroke='#1E2D4A'
											vertical={false}
										/>
										<XAxis
											dataKey='run'
											tick={{ fill: "#4A5A78", fontSize: 11 }}
											axisLine={false}
											tickLine={false}
										/>
										<YAxis
											domain={[40, 100]}
											tick={{ fill: "#4A5A78", fontSize: 11 }}
											axisLine={false}
											tickLine={false}
											width={30}
										/>
										<Tooltip content={<CustomTooltip />} />
										<Line
											type='monotone'
											dataKey='score'
											stroke='#00D4FF'
											strokeWidth={2.5}
											dot={{ fill: "#00D4FF", r: 4, strokeWidth: 0 }}
											activeDot={{ r: 6, fill: "#00D4FF", strokeWidth: 0 }}
										/>
									</LineChart>
								</ResponsiveContainer>
							</div>
						</div>

						{/* Right sidebar */}
						<div className='space-y-4'>
							{/* Quick Start */}
							<div
								className='rounded-2xl p-6'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<h2 className='font-semibold mb-4' style={{ color: "#E8EEFF" }}>
									Quick Start
								</h2>
								<Link
									href='/new-test'
									className='w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold mb-5 transition-all btn-cyan'>
									<Plus size={18} /> Run a New Test
								</Link>
								<div className='space-y-2'>
									<p
										className='text-xs font-medium mb-3'
										style={{ color: "#4A5A78" }}>
										RECENT ACTIVITY
									</p>
									{[
										{
											icon: CheckCircle2,
											text: "Run #247 completed",
											time: "2m ago",
											color: "#00E396",
										},
										{
											icon: AlertTriangle,
											text: "2 gaps found in Auth",
											time: "1h ago",
											color: "#FFB547",
										},
										{
											icon: Shield,
											text: "SQL injection detected",
											time: "1d ago",
											color: "#FF4560",
										},
										{
											icon: RefreshCw,
											text: "Self-heal on /auth/login",
											time: "1d ago",
											color: "#7B61FF",
										},
									].map((item, i) => (
										<div key={i} className='flex items-center gap-3 py-2'>
											<item.icon
												size={14}
												style={{ color: item.color, flexShrink: 0 }}
											/>
											<div className='flex-1 min-w-0'>
												<p
													className='text-xs truncate'
													style={{ color: "#7B8DB0" }}>
													{item.text}
												</p>
											</div>
											<span
												className='text-xs shrink-0'
												style={{ color: "#4A5A78" }}>
												{item.time}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Tip of the day */}
							<div
								className='rounded-2xl p-5'
								style={{
									background: "rgba(0,212,255,0.05)",
									border: "1px solid rgba(0,212,255,0.15)",
								}}>
								<div className='flex items-center gap-2 mb-3'>
									<BookOpen size={14} style={{ color: "#00D4FF" }} />
									<p
										className='text-xs font-semibold uppercase tracking-wider'
										style={{ color: "#00D4FF" }}>
										Tip of the day
									</p>
								</div>
								<p
									className='text-sm leading-relaxed'
									style={{ color: "#7B8DB0" }}>
									Use the{" "}
									<span style={{ color: "#E8EEFF" }}>Security Fuzzing</span>{" "}
									mode to probe every endpoint for SQL injection and XSS. Enable
									it in Advanced Settings on your next test run.
								</p>
								<Link
									href='/new-test'
									className='inline-flex items-center gap-1 text-xs mt-3 font-medium'
									style={{ color: "#00D4FF" }}>
									Try it now <ChevronRight size={11} />
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
