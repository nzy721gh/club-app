import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";
import NavBar from "@/components/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "社团会员积分系统",
  description: "扫码积分、成就解锁、礼品兑换",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "社团积分",
  },
};

export const viewport: Viewport = {
  themeColor: "#d97757",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RegisterServiceWorker />
        <NavBar />
        <main className="flex-1 w-full max-w-md mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
