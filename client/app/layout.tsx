import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/Toast";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "SpecTest — AI-Powered API Testing",
  description:
    "SpecTest reads your requirements and API spec, maps them together, and runs your entire test suite autonomously.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: "#0A0E1A", color: "#E8EEFF", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
