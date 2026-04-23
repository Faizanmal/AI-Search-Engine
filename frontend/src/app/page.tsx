"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn, ScaleInView, StaggerContainer, StaggerItem, FloatingElement, GradientText } from "@/components/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Zap, 
  Shield, 
  BarChart3, 
  Rocket, 
  Search,
  Brain,
  TrendingUp,
  Star,
  ArrowRight,
  Check
} from "lucide-react";

export default function Home() {
  const features = [
    {
      icon: Search,
      title: "AI-Powered Search",
      description: "Get accurate answers from multiple sources with intelligent web search",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Brain,
      title: "Smart Analysis",
      description: "Advanced AI analyzes and synthesizes information from trusted sources",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Shield,
      title: "Trust Scores",
      description: "Every answer comes with a trust score and verified citations",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get comprehensive answers in seconds with our optimized pipeline",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      icon: BarChart3,
      title: "Smart Forms",
      description: "Create intelligent forms with AI-generated fields and validation",
      gradient: "from-red-500 to-pink-500"
    },
    {
      icon: TrendingUp,
      title: "Analytics",
      description: "Track form performance with detailed analytics and insights",
      gradient: "from-indigo-500 to-purple-500"
    }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "50K+", label: "Searches" },
    { value: "10K+", label: "Users" },
    { value: "4.9/5", label: "Rating" }
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-cyan-50 to-emerald-50 dark:from-slate-950 dark:via-cyan-950/40 dark:to-emerald-950/40 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-4 md:left-10 w-48 h-48 md:w-72 md:h-72 bg-purple-300 dark:bg-purple-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-4 md:right-10 w-48 h-48 md:w-72 md:h-72 bg-blue-300 dark:bg-blue-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-48 h-48 md:w-72 md:h-72 bg-pink-300 dark:bg-pink-700 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Section */}
      <section className="relative section-spacing pt-20 md:pt-32">
        <div className="content-max-width container-padding">
          <div className="text-center space-y-6 md:space-y-8 max-w-5xl mx-auto">
          <FadeIn delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-full glass border border-white/20 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium">Introducing Advanced Search Engine</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 className="heading-primary">
              Search Smarter with{" "}
              <GradientText className="heading-primary">
                AI-Powered
              </GradientText>
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>Intelligence
            </h1>
          </FadeIn>

          <FadeIn delay={0.3}>
            <p className="text-display max-w-3xl mx-auto">
              Get accurate, well-researched answers with citations from trusted sources.
              Build intelligent forms in seconds with AI assistance.
            </p>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 md:mt-12">
              <Link href="/search">
                <Button size="xl" variant="gradient" className="w-full sm:w-auto group rounded-xl">
                  Start Searching
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="xl" variant="outline" className="w-full sm:w-auto rounded-xl hover-lift glass border-2">
                  Create Forms
                  <Rocket className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={0.5}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mt-12 md:mt-20 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                  className="text-center p-4 md:p-6 rounded-xl glass border border-white/20 hover-lift"
                >
                  <div className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold gradient-text mb-2">{stat.value}</div>
                  <div className="text-xs md:text-sm lg:text-base text-muted-foreground font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative section-spacing bg-white/30 dark:bg-black/30">
        <div className="content-max-width container-padding">
          <div className="text-center mb-12 md:mb-16">
            <FadeIn delay={0.1}>
              <h2 className="heading-secondary mb-4 md:mb-6">
                Powerful <GradientText className="heading-secondary">Features</GradientText>
              </h2>
              <p className="text-display max-w-2xl mx-auto">
                Everything you need to search, analyze, and create intelligent forms
              </p>
            </FadeIn>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <StaggerItem key={index}>
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Card className="h-full card-hover glass border-white/30 overflow-hidden group">
                  <CardContent className="p-6 md:p-8 space-y-4 md:space-y-5">
                    <div className={`inline-flex p-3 md:p-4 rounded-2xl bg-linear-to-br ${feature.gradient} shadow-xl`}>
                      <feature.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed text-sm md:text-base">{feature.description}</p>
                    <div className="pt-2 flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-2 transition-transform">
                      Learn more <ArrowRight className="ml-1 w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative section-spacing">
        <div className="content-max-width container-padding">
          <ScaleInView>
            <Card className="glass border-white/30 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-linear-to-r from-teal-600/10 via-cyan-600/10 to-emerald-600/10"></div>
              <CardContent className="relative p-8 md:p-12 lg:p-16 text-center space-y-6 md:space-y-8">
              <FloatingElement>
                <div className="inline-flex p-4 md:p-5 rounded-full bg-linear-to-r from-teal-600 to-cyan-700 shadow-2xl mb-4 md:mb-6">
                  <Star className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
              </FloatingElement>
              <h2 className="heading-secondary">
                Ready to Get Started?
              </h2>
              <p className="text-display max-w-2xl mx-auto">
                Join thousands of users who are already using our AI-powered platform
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 md:pt-6">
                <Link href="/register">
                  <Button size="xl" variant="gradient" className="w-full sm:w-auto rounded-xl">
                    Sign Up Free
                    <Check className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="xl" variant="outline" className="w-full sm:w-auto rounded-xl hover-lift glass border-2">
                    Sign In
                  </Button>
                </Link>
              </div>
              </CardContent>
            </Card>
          </ScaleInView>
        </div>
      </section>
    </div>
  );
}
