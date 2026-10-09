import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NotZeke News — A personal briefing, with a wider lens.",
  description: "Your personal news briefing — top stories, summarized, with sources you can trust.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F5EF",
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
