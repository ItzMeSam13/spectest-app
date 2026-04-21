"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Menu,
  X,
  Zap,
  Settings,
  History,
  LogOut,
  User,
  Plus,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

// Added a Fallback icon for the 'Docs' link to prevent map errors
type NavLinkItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navLinks: NavLinkItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "New Test", href: "/new-test", icon: Plus },
  { label: "History", href: "/history", icon: History },
  { label: "Docs", href: "/docs", icon: Settings }, // Changed null to an icon for safety
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 border-b transition-all duration-300"
      style={{
        background: "rgba(10, 14, 26, 0.92)",
        borderColor: "#1E2D4A",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: "linear-gradient(135deg, #00D4FF, #7B61FF)" }}
          >
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-[#E8EEFF]">
            SpecTest
          </span>
        </Link>

        {/* Center Nav Links - Cleaned up Hover Logic */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors relative group`}
                style={{ color: active ? "#00D4FF" : "#7B8DB0" }}
              >
                <span className="group-hover:text-[#E8EEFF] transition-colors">
                  {link.label}
                </span>
                {active && (
                  <span
                    className="absolute bottom-[-10px] left-3 right-3 h-0.5 rounded-full"
                    style={{ background: "#00D4FF" }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side Actions */}
        <div className="flex items-center gap-2">
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-colors text-[#7B8DB0] hover:text-[#E8EEFF] hover:bg-[#0F1629]"
            >
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full border-2 border-[#0A0E1A]" style={{ background: "#00D4FF" }} />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-10 w-80 rounded-xl overflow-hidden shadow-2xl z-50 border border-[#1E2D4A] bg-[#141D35]">
                <div className="px-4 py-3 text-sm font-semibold border-b border-[#1E2D4A] text-[#E8EEFF]">
                  Notifications
                </div>
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  {[
                    { text: "Run #247 completed: SpecScore 87", time: "2m ago", dot: "#00E396" },
                    { text: "Vulnerability found in Auth Service", time: "1h ago", dot: "#FF4560" },
                    { text: "System Update: New Fuzzing Engine", time: "2d ago", dot: "#00D4FF" },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[#0F1629] transition-colors">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.dot }} />
                      <div>
                        <p className="text-xs text-[#E8EEFF]">{n.text}</p>
                        <p className="text-[10px] mt-0.5 text-[#4A5A78] uppercase font-bold">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[#0F1629]"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border border-[#1E2D4A]"
                style={{ background: "linear-gradient(135deg, #00D4FF22, #7B61FF44)", color: "#00D4FF" }}
              >
                PR
              </div>
              <span className="hidden md:block text-sm font-medium text-[#E8EEFF]">Pratham</span>
              <ChevronDown size={14} className="text-[#4A5A78]" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-xl overflow-hidden shadow-2xl z-50 border border-[#1E2D4A] bg-[#141D35]">
                <div className="px-4 py-3 border-b border-[#1E2D4A]">
                  <p className="text-sm font-medium text-[#E8EEFF]">Pratham</p>
                  <p className="text-[10px] text-[#4A5A78] truncate">pratham@university.edu</p>
                </div>
                <div className="p-1">
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
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#7B8DB0] hover:bg-[#0F1629] hover:text-[#E8EEFF] transition-all"
                        onClick={() => setProfileOpen(false)}
                      >
                        <ItemIcon size={15} />
                        {item.label}
                      </Link>
                    );
                  })}
                  <div className="mt-1 pt-1 border-t border-[#1E2D4A]">
                    <Link
                      href="/login"
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#FF4560] hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center text-[#7B8DB0]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 py-4 px-4 bg-[#0F1629] border-b border-[#1E2D4A] shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    pathname === link.href ? "bg-[#00D4FF10] text-[#00D4FF]" : "text-[#7B8DB0] hover:bg-[#141D35]"
                  }`}
                >
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