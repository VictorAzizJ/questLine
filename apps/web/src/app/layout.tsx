import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/components/providers/convex-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "questLine - TTRPG-powered Focus & Play",
  description:
    "A web-based TTRPG platform combining AI Dungeon Masters, social deduction games, and productivity mechanics.",
  keywords: ["TTRPG", "Werewolf", "Pomodoro", "Focus", "Games", "AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
