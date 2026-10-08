import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NotZeke News — A personal briefing, with a wider lens.",
  description: "A personal news briefing platform tailored for Zeke, inspired by Techmeme and Hacker News.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F5EF] text-[#182B33]">
        {children}
      </body>
    </html>
  );
}
