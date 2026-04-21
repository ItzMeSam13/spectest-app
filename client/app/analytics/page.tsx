"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { useAuth } from "@/context/AuthContext";
import { Activity, AlertCircle, BarChart3, ShieldCheck } from "lucide-react";

const ANALYTICS_STATS = [
	{ label: "Total Test Runs", value: "128", sub: "Last 30 days", icon: Activity },
	{ label: "Avg SpecScore", value: "87", sub: "Across all services", icon: BarChart3 },
	{ label: "Open Gaps", value: "14", sub: "Needs attention", icon: AlertCircle },
	{ label: "Security Alerts", value: "3", sub: "Critical + high", icon: ShieldCheck },
];

const RECENT_RUNS = [
	{ name: "Auth Service API", score: "91", status: "Completed", time: "2h ago" },
	{ name: "Orders API", score: "84", status: "Completed", time: "5h ago" },
	{ name: "Users API", score: "79", status: "Needs review", time: "Yesterday" },
];

export default function AnalyticsPage() {
	const router = useRouter();
	const { user, loading } = useAuth();

	useEffect(() => {
		if (!loading && !user) {
			router.replace("/auth");
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
				<div className='max-w-[1300px] mx-auto px-4 sm:px-6 py-8 space-y-6'>
					<div>
						<h1 className='text-2xl font-bold mb-1' style={{ color: "#E8EEFF" }}>
							Analytics Overview
						</h1>
						<p className='text-sm' style={{ color: "#7B8DB0" }}>
							Performance and quality metrics in one place
						</p>
					</div>

					<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
						{ANALYTICS_STATS.map((stat) => (
							<div
								key={stat.label}
								className='rounded-2xl p-5 card-hover'
								style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
								<div className='flex items-center justify-between mb-4'>
									<p className='text-xs font-medium' style={{ color: "#7B8DB0" }}>
										{stat.label}
									</p>
									<stat.icon size={14} style={{ color: "#4A5A78" }} />
								</div>
								<p className='text-3xl font-bold mb-1' style={{ color: "#E8EEFF" }}>
									{stat.value}
								</p>
								<p className='text-xs' style={{ color: "#4A5A78" }}>
									{stat.sub}
								</p>
							</div>
						))}
					</div>

					<div className='grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6'>
						<div
							className='rounded-2xl overflow-hidden'
							style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
							<div
								className='px-6 py-4 flex items-center justify-between'
								style={{ borderBottom: "1px solid #1E2D4A" }}>
								<h3 className='font-semibold' style={{ color: "#E8EEFF" }}>
									Recent Runs
								</h3>
								<span className='text-xs' style={{ color: "#4A5A78" }}>
									Last 24 hours
								</span>
							</div>
							<div className='divide-y' style={{ borderColor: "#1E2D4A" }}>
								{RECENT_RUNS.map((run) => (
									<div
										key={run.name}
										className='px-6 py-4 flex items-center justify-between gap-3'>
										<div>
											<p className='text-sm font-medium' style={{ color: "#E8EEFF" }}>
												{run.name}
											</p>
											<p className='text-xs mt-1' style={{ color: "#4A5A78" }}>
												{run.time}
											</p>
										</div>
										<div className='text-right'>
											<p className='text-sm font-semibold' style={{ color: "#00D4FF" }}>
												{run.score}
											</p>
											<p className='text-xs' style={{ color: "#7B8DB0" }}>
												{run.status}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>

						<div
							className='rounded-2xl p-6'
							style={{ background: "#141D35", border: "1px solid #1E2D4A" }}>
							<h3 className='font-semibold mb-4' style={{ color: "#E8EEFF" }}>
								SpecScore Trend
							</h3>
							<div
								className='h-[220px] rounded-xl p-4 flex flex-col justify-between'
								style={{ background: "#0F1629", border: "1px solid #1E2D4A" }}>
								<div className='space-y-3'>
									{[
										{ label: "Week 1", val: 72 },
										{ label: "Week 2", val: 78 },
										{ label: "Week 3", val: 84 },
										{ label: "Week 4", val: 87 },
									].map((point) => (
										<div key={point.label}>
											<div className='flex items-center justify-between text-xs mb-1'>
												<span style={{ color: "#7B8DB0" }}>{point.label}</span>
												<span style={{ color: "#E8EEFF" }}>{point.val}</span>
											</div>
											<div className='h-1.5 rounded-full' style={{ background: "#1E2D4A" }}>
												<div
													className='h-full rounded-full'
													style={{
														width: `${point.val}%`,
														background: "linear-gradient(90deg, #00D4FF, #36CFFB)",
													}}
												/>
											</div>
										</div>
									))}
								</div>
								<p className='text-xs' style={{ color: "#4A5A78" }}>
									Consistent upward trend after introducing self-healing
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
