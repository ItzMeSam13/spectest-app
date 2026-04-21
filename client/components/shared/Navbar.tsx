"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
	ChevronDown,
	Menu,
	X,
	Zap,
	Settings,
	History,
	LogOut,
	User,
	BarChart3,
	LayoutDashboard,
	type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { logOut } from "@/lib/auth";

// Added a Fallback icon for the 'Docs' link to prevent map errors
type NavLinkItem = {
	label: string;
	href: string;
	icon: LucideIcon;
};

const navLinks: NavLinkItem[] = [
	{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ label: "Analytics", href: "/analytics", icon: BarChart3 },
	{ label: "History", href: "/history", icon: History },
	{ label: "Docs", href: "/docs", icon: Settings },
];

export function Navbar() {
	const pathname = usePathname();
	const router = useRouter();
	const { user } = useAuth();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);

	const displayName = user?.displayName || "User";
	const displayEmail = user?.email || "No email";
	const avatarInitials = (user?.displayName || user?.email || "U")
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	const handleSignOut = async () => {
		await logOut();
		router.push("/auth");
	};

	return (
		<nav
			className='fixed top-0 left-0 right-0 z-50 h-14 border-b transition-all duration-300'
			style={{
				background: "rgba(10, 14, 26, 0.92)",
				borderColor: "#1E2D4A",
				backdropFilter: "blur(12px)",
			}}>
			<div className='max-w-[1400px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between'>
				{/* Logo */}
				<Link href='/' className='flex items-center gap-2 shrink-0 group'>
					<div
						className='w-7 h-7 rounded-md flex items-center justify-center transition-transform group-hover:scale-110'
						style={{ background: "linear-gradient(135deg, #00D4FF, #7B61FF)" }}>
						<Zap size={14} className='text-white' />
					</div>
					<span className='font-bold text-base tracking-tight text-[#E8EEFF]'>
						SpecTest
					</span>
				</Link>

				{/* Center Nav Links - Cleaned up Hover Logic */}
				<div className='hidden md:flex items-center gap-1'>
					{navLinks.map((link) => {
						const active = pathname === link.href;
						return (
							<Link
								key={link.href}
								href={link.href}
								className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative group`}
								style={{ color: active ? "#00D4FF" : "#7B8DB0" }}>
								<span className='group-hover:text-[#E8EEFF] transition-colors'>
									{link.label}
								</span>
								{active && (
									<span
										className='absolute bottom-[-10px] left-3 right-3 h-0.5 rounded-full'
										style={{ background: "#00D4FF" }}
									/>
								)}
							</Link>
						);
					})}
				</div>

				{/* Right side Actions */}
				<div className='flex items-center gap-2'>
					{/* User Profile */}
					<div className='relative'>
						<button
							onClick={() => setProfileOpen(!profileOpen)}
							className='flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[#0F1629]'>
							<div
								className='w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-[#1E2D4A]'
								style={{
									background: "linear-gradient(135deg, #00D4FF22, #7B61FF44)",
									color: "#00D4FF",
								}}>
								{avatarInitials}
							</div>
							<span className='hidden md:block text-sm font-medium text-[#E8EEFF]'>
								{displayName}
							</span>
							<ChevronDown size={14} className='text-[#4A5A78]' />
						</button>

						{profileOpen && (
							<div className='absolute right-0 top-11 w-52 rounded-xl overflow-hidden shadow-2xl z-50 border border-[#1E2D4A] bg-[#141D35]'>
								<div className='px-4 py-3 border-b border-[#1E2D4A]'>
									<p className='text-sm font-medium text-[#E8EEFF]'>
										{displayName}
									</p>
									<p className='text-[10px] text-[#4A5A78] truncate'>
										{displayEmail}
									</p>
								</div>
								<div className='p-1'>
									{[
										{ icon: User, label: "Profile", href: "/settings" },
										{ icon: Settings, label: "Settings", href: "/settings" },
										{ icon: History, label: "History", href: "/history" },
									].map((item) => {
										const ItemIcon = item.icon;
										return (
											<Link
												key={item.label}
												href={item.href}
												className='flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#7B8DB0] hover:bg-[#0F1629] hover:text-[#E8EEFF] transition-all'
												onClick={() => setProfileOpen(false)}>
												<ItemIcon size={15} />
												{item.label}
											</Link>
										);
									})}
									<div className='mt-1 pt-1 border-t border-[#1E2D4A]'>
										<button
											type='button'
											onClick={handleSignOut}
											className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#FF4560] hover:bg-red-500/10 transition-colors'>
											<LogOut size={15} />
											Sign out
										</button>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Mobile hamburger */}
					<button
						className='md:hidden w-8 h-8 flex items-center justify-center text-[#7B8DB0]'
						onClick={() => setMobileOpen(!mobileOpen)}>
						{mobileOpen ? <X size={18} /> : <Menu size={18} />}
					</button>
				</div>
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<div className='md:hidden absolute top-14 left-0 right-0 py-4 px-4 bg-[#0F1629] border-b border-[#1E2D4A] shadow-2xl animate-in slide-in-from-top duration-200'>
					<div className='flex flex-col gap-2'>
						{navLinks.map((link) => {
							const Icon = link.icon;
							return (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setMobileOpen(false)}
									className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
										pathname === link.href
											? "bg-[#00D4FF10] text-[#00D4FF]"
											: "text-[#7B8DB0] hover:bg-[#141D35]"
									}`}>
									<Icon size={18} />
									{link.label}
								</Link>
							);
						})}
					</div>
				</div>
			)}
		</nav>
	);
}
