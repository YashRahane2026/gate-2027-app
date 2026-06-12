import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "GATE 2027 Prep — Study Tracker",
  description:
    "Track your GATE 2027 preparation with focus timer, syllabus tracker, stats, and study group leaderboard.",
  keywords: ["GATE 2027", "GATE preparation", "study tracker", "GATE CS"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-gray-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
