"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn, ScaleInView, StaggerContainer, StaggerItem } from "@/components/animations";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Zap,
  BarChart3,
  Search,
  Brain,
  ArrowRight,
  Quote,
} from "lucide-react";

export default function Home() {
  const capabilities = [
    {
      icon: Search,
      title: "Cited answers",
      description: "Every response pulls from live sources and shows where claims come from.",
    },
    {
      icon: Shield,
      title: "Trust scoring",
      description: "Confidence meters and fact-check modes keep shaky claims visible.",
    },
    {
      icon: Brain,
      title: "Mode-aware search",
      description: "Switch between text, academic, news, code, and image research.",
    },
    {
      icon: Zap,
      title: "Fast synthesis",
      description: "Ask once — get a clear answer, follow-ups, and exportable history.",
    },
    {
      icon: BarChart3,
      title: "FormForge",
      description: "Generate, publish, and measure intelligent forms from the same workspace.",
    },
    {
      icon: Quote,
      title: "Collections & alerts",
      description: "Save threads, share collections, and watch topics as they shift.",
    },
  ];

  return (
    <div className="min-h-screen app-atmosphere overflow-hidden">
      {/* Hero — one composition: brand, headline, support, CTAs, visual */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col">
        <div className="absolute inset-0 bg-atlas-mesh pointer-events-none" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-[90vw] max-w-5xl h-[42vh] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(23,107,134,0.16),transparent_70%)]"
            animate={{ opacity: [0.55, 0.85, 0.55], scale: [1, 1.04, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative flex-1 content-max-width container-padding flex flex-col justify-center py-12 md:py-16 lg:py-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-6 space-y-7 md:space-y-8">
              <FadeIn delay={0.05}>
                <p className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--ink)]">
                  Atlas<span className="text-[var(--ocean)]"> Search</span>
                </p>
              </FadeIn>

              <FadeIn delay={0.15}>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight text-[var(--ink)] max-w-xl">
                  Answers you can trace back to the source.
                </h1>
              </FadeIn>

              <FadeIn delay={0.25}>
                <p className="text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
                  Research the open web with citations, trust scores, and modes built for serious questions.
                </p>
              </FadeIn>

              <FadeIn delay={0.35}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <Link href="/search">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-12 px-7 rounded-lg font-semibold bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white shadow-md group"
                    >
                      Start searching
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-12 px-7 rounded-lg font-medium border-[var(--ink)]/15 bg-white/50 hover:bg-white/80"
                    >
                      Open FormForge
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Dominant visual — product search plane */}
            <div className="lg:col-span-6 relative">
              <FadeIn delay={0.2}>
                <motion.div
                  className="relative w-full aspect-[4/3] md:aspect-[5/4] rounded-2xl overflow-hidden border border-[var(--surface-border)] shadow-[var(--shadow-lg)] bg-[var(--ink)]"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(42,155,176,0.35),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(240,90,43,0.22),transparent_45%)]" />
                  <div
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                      backgroundSize: "36px 36px",
                    }}
                  />

                  <div className="absolute inset-0 flex flex-col p-5 sm:p-7 md:p-8">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-2 h-2 rounded-full bg-[var(--signal)]" />
                      <span className="text-[11px] uppercase tracking-[0.18em] text-white/55 font-medium">
                        Live research
                      </span>
                    </div>

                    <motion.div
                      className="rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm p-4 sm:p-5 mb-4"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <p className="text-xs text-white/45 mb-2 font-medium">Query</p>
                      <p className="font-display text-base sm:text-lg text-white leading-snug">
                        What drives trustworthy AI search results?
                      </p>
                    </motion.div>

                    <motion.div
                      className="flex-1 rounded-xl bg-white/[0.07] border border-white/10 p-4 sm:p-5 space-y-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.6 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-white/45 font-medium">Synthesized answer</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/20">
                          Trust 92
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 rounded bg-white/20 w-[92%] animate-sweep" />
                        <div className="h-2 rounded bg-white/15 w-[78%] animate-sweep [animation-delay:120ms]" />
                        <div className="h-2 rounded bg-white/10 w-[64%] animate-sweep [animation-delay:240ms]" />
                      </div>
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {["Nature", "arXiv", "IEEE"].map((src, i) => (
                          <motion.span
                            key={src}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + i * 0.12 }}
                            className="text-[10px] sm:text-xs px-2.5 py-1 rounded-md bg-white/10 text-white/70 border border-white/10"
                          >
                            {src}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities — one job */}
      <section className="relative border-t border-[var(--surface-border)] bg-[var(--paper)]/60">
        <div className="content-max-width container-padding section-spacing">
          <div className="max-w-2xl mb-10 md:mb-14">
            <FadeIn>
              <h2 className="heading-secondary text-[var(--ink)] mb-3">
                Built for research, not scrollbait.
              </h2>
              <p className="text-display">
                One workspace for searching, verifying, saving, and turning insights into forms.
              </p>
            </FadeIn>
          </div>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {capabilities.map((item) => (
              <StaggerItem key={item.title}>
                <div className="group space-y-3">
                  <div className="inline-flex w-10 h-10 items-center justify-center rounded-lg bg-[var(--sea-light)] text-[var(--ocean-deep)] transition-colors group-hover:bg-[var(--ocean)] group-hover:text-white">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-[var(--ink)]">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative border-t border-[var(--surface-border)]">
        <div className="content-max-width container-padding section-spacing">
          <ScaleInView>
            <div className="relative overflow-hidden rounded-2xl bg-[var(--ink)] px-6 py-12 md:px-12 md:py-16">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(42,155,176,0.28),transparent_50%),radial-gradient(ellipse_at_100%_100%,rgba(240,90,43,0.2),transparent_45%)]" />
              <div className="relative max-w-xl">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
                  Start with a question.
                </h2>
                <p className="text-white/65 text-base md:text-lg mb-8 leading-relaxed">
                  No setup theater — open search and get a cited answer in seconds.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-12 px-7 rounded-lg font-semibold bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white"
                    >
                      Create free account
                    </Button>
                  </Link>
                  <Link href="/search">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto h-12 px-7 rounded-lg font-medium border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                      Try search first
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </ScaleInView>
        </div>
      </section>
    </div>
  );
}
