import type { Metadata } from "next";
import AppShell from "../components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeOS AI - Your Personal Life",
  description: "Advanced AI-powered personal management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col md:flex-row bg-[#050505]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
