import "./App.css";
import { useState, useEffect } from "react";
import ChartRendererNew from "./components/ChartRendererNew";
import { Activity, Zap, Moon, Sun, Github, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const App = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Default to dark mode
    document.documentElement.classList.add("dark");

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div
      className={`min-h-screen font-sans selection:bg-primary selection:text-primary-foreground ${
        darkMode ? "dark" : ""
      }`}>
      <div className="relative min-h-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse delay-1000" />
        </div>

        {/* Header */}
        <header
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled
              ? "bg-background/80 backdrop-blur-md border-b shadow-sm py-3"
              : "bg-transparent py-5"
          }`}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg transition-transform group-hover:scale-105 group-hover:rotate-3">
                  <Activity className="h-6 w-6" />
                  <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                    Rustify
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-primary/10 transition-colors"
                  onClick={() => window.open("https://github.com", "_blank")}>
                  <Github className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleDarkMode}
                  className="rounded-full border-primary/20 hover:bg-primary/10 hover:border-primary/50 transition-all">
                  {darkMode ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="relative z-10 pt-32 pb-12 sm:pt-40 sm:pb-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Live System Status
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
                  Real-Time Analytics <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
                    Powered by Rust
                  </span>
                </h1>

                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Experience high-performance streaming data visualization
                  leveraging WebAssembly and Rust for ultra-low latency
                  processing.
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Button
                    size="lg"
                    className="rounded-full px-8 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-8 border-primary/20 hover:bg-primary/5">
                    View Documentation
                  </Button>
                </div>
              </div>

              <div className="flex-1 w-full lg:w-auto animate-in fade-in slide-in-from-right-4 duration-1000 delay-200">
                <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-2xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-500">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Performance Metrics</div>
                      <div className="text-xs text-muted-foreground">
                        Real-time WASM Bridge
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold font-mono">60 FPS</div>
                      <div className="text-xs text-green-500">Stable</div>
                    </div>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[85%] animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="p-1">
              <ChartRendererNew />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-border/40 bg-background/50 backdrop-blur-lg mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <span className="font-bold text-lg">Rustify</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Next-generation visualization platform built for speed and
                  reliability using modern web technologies.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Tech Stack</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />{" "}
                    Rust (WebAssembly)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />{" "}
                    React + TypeScript
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />{" "}
                    Tailwind CSS
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Features</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="hover:text-foreground transition-colors cursor-pointer">
                    Real-time Streaming
                  </li>
                  <li className="hover:text-foreground transition-colors cursor-pointer">
                    LTTB Downsampling
                  </li>
                  <li className="hover:text-foreground transition-colors cursor-pointer">
                    Hardware Acceleration
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
              <div>© 2025 Rustify. All rights reserved.</div>
              <div className="flex items-center gap-6">
                <span className="hover:text-foreground cursor-pointer transition-colors">
                  Privacy Policy
                </span>
                <span className="hover:text-foreground cursor-pointer transition-colors">
                  Terms of Service
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
