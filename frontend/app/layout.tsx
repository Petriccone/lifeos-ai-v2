import type { Metadata } from "next";
import { LayoutDashboard, BarChart3, CheckSquare, Settings } from "lucide-react";
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
        {/* Sidebar for Desktop */}
        <nav className="hidden md:flex w-64 glass-panel border-r border-white/5 flex-col p-6 h-screen sticky top-0 z-40">
          <div className="mb-12 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30">
               <span className="text-xl">☀️</span>
             </div>
             <h1 className="text-xl font-bold gradient-text-premium tracking-tight">LifeOS</h1>
          </div>
          
          <div className="space-y-3 flex-1 px-1">
             <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 text-white font-medium transition-all shadow-sm">
                <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                Dashboard
             </a>
             <a href="/workouts" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <BarChart3 className="w-5 h-5" />
                Workouts
             </a>
             <a href="/chat" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                <CheckSquare className="w-5 h-5" />
                AI Assistant
             </a>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
             <div className="flex items-center gap-3 px-2 py-2">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-white/10">R</div>
                 <div>
                    <h3 className="text-sm font-semibold text-white">Rafael P.</h3>
                    <p className="text-xs text-gray-500">Premium</p>
                 </div>
                 <button className="ml-auto text-gray-400 hover:text-white">
                   <Settings className="w-4 h-4"/>
                 </button>
             </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-full overflow-x-hidden relative">
          {/* Mobile Header & Bottom Nav (Simplified for demo) */}
          <header className="md:hidden flex items-center justify-between p-4 glass-panel border-b border-white/5 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="text-xl">☀️</span>
              <h1 className="text-lg font-bold gradient-text-premium leading-none">LifeOS</h1>
            </div>
            <button className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">R</button>
          </header>

          <main className="mx-auto w-full min-h-screen">
            {children}
          </main>

          {/* Mobile bottom nav */}
          <nav className="md:hidden fixed bottom-0 w-full p-4 z-40">
             <div className="glass-panel w-full rounded-2xl flex justify-around items-center p-3 border border-white/10 shadow-2xl">
                <a href="#" className="flex flex-col items-center text-indigo-400 gap-1"><LayoutDashboard className="w-5 h-5" /><span className="text-[10px]">Home</span></a>
                <a href="#" className="flex flex-col items-center text-gray-400 gap-1"><BarChart3 className="w-5 h-5" /><span className="text-[10px]">Stats</span></a>
                <a href="#" className="flex flex-col items-center text-gray-400 gap-1"><CheckSquare className="w-5 h-5" /><span className="text-[10px]">Tasks</span></a>
             </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
