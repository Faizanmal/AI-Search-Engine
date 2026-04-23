"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { formsApi } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import type { Form } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn, ScaleInView, StaggerContainer, StaggerItem } from "@/components/animations";
import { PlusCircle, FileText, BarChart3, Settings, ExternalLink, TrendingUp, Users, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Animated counter component
function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration * 60); // 60 fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, accessToken } = useAuthStore();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Small delay to ensure store is hydrated
    const checkAuth = () => {
      if (!isAuthenticated || !accessToken) {
        router.push('/login');
        return;
      }
      setAuthChecked(true);
      loadForms();
    };

    // Check immediately and also after a short delay
    checkAuth();
    const timeout = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timeout);
  }, [isAuthenticated, accessToken, router]);

  const loadForms = async () => {
    try {
      const data = await formsApi.list();
      setForms(data);
    } catch (error) {
      toast.error("Failed to load forms");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-16 w-16 text-purple-600 mx-auto" />
          </motion.div>
          <p className="text-xl font-medium text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleCreateForm = () => {
    router.push("/forms/new");
  };

  const handleViewForm = (slug: string) => {
    window.open(`/form/${slug}`, '_blank');
  };

  const handleEditForm = (id: string) => {
    router.push(`/forms/${id}/edit`);
  };

  const handleViewAnalytics = (id: string) => {
    router.push(`/forms/${id}/analytics`);
  };

  // Calculate total stats
  const totalViews = forms.reduce((sum, form) => sum + form.views_count, 0);
  const totalSubmissions = forms.reduce((sum, form) => sum + form.submissions_count, 0);
  const avgConversion = forms.length > 0 
    ? forms.reduce((sum, form) => sum + form.conversion_rate, 0) / forms.length 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
        <div className="text-center space-y-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-16 w-16 text-purple-600 mx-auto" />
          </motion.div>
          <p className="text-xl font-medium text-muted-foreground">Loading your forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative premium background elements */}
      <div className="absolute top-0 inset-x-0 h-125 bg-linear-to-br from-purple-500/10 via-blue-500/10 to-transparent blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-125 h-125 bg-linear-to-tl from-pink-500/5 via-purple-500/5 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />
      
      <div className="content-max-width container-padding section-spacing-sm md:section-spacing relative z-0">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-12 gap-6 bg-background/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
            <div className="flex-1 space-y-1">
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight bg-linear-to-r from-purple-600 via-pink-500 to-blue-600 bg-clip-text text-transparent">
                My Forms
              </h1>
              <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl">
                Create, manage, and analyze your intelligent forms with AI perfection.
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="w-full lg:w-auto"
            >
              <Button 
                onClick={handleCreateForm} 
                size="lg"
                className="w-full lg:w-auto relative group overflow-hidden bg-linear-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white shadow-xl shadow-purple-500/20 text-base px-8 py-7 rounded-2xl border-0 font-bold"
              >
                <span className="absolute inset-0 w-full h-full bg-linear-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <PlusCircle className="mr-2 h-5 w-5" />
                Create New Form
              </Button>
            </motion.div>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        {forms.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10 md:mb-14">
              {[
                { icon: FileText, label: "Total Forms", value: forms.length, gradient: "from-purple-500 to-pink-500", shadow: "shadow-purple-500/20" },
                { icon: Eye, label: "Total Views", value: totalViews, gradient: "from-blue-500 to-cyan-500", shadow: "shadow-blue-500/20" },
                { icon: Users, label: "Submissions", value: totalSubmissions, gradient: "from-emerald-400 to-teal-500", shadow: "shadow-emerald-500/20" },
                { icon: TrendingUp, label: "Avg Conversion", value: `${avgConversion.toFixed(1)}%`, gradient: "from-orange-400 to-red-500", isPercentage: true, shadow: "shadow-orange-500/20" },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 300, damping: 24 }}
                  whileHover={{ y: -5 }}
                >
                  <Card className="h-full border border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-2xl shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-linear-to-br from-white/40 to-white/0 dark:from-white/10 dark:to-transparent pointer-events-none" />
                    <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">{stat.label}</p>
                          <p className={`text-4xl font-extrabold tracking-tight bg-linear-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                            {stat.isPercentage ? (
                              stat.value
                            ) : (
                              <AnimatedCounter value={typeof stat.value === 'number' ? stat.value : 0} />
                            )}
                          </p>
                        </div>
                        <div className={`p-3.5 rounded-2xl bg-linear-to-br ${stat.gradient} ${stat.shadow} shadow-lg text-white transform group-hover:scale-110 transition-transform duration-300 ease-out`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        )}

        {/* Forms Grid */}
        <AnimatePresence mode="wait">
          {forms.length === 0 ? (
            <ScaleInView key="empty-state">
              <Card className="text-center py-24 border border-white/20 bg-background/50 backdrop-blur-3xl shadow-2xl rounded-[3rem] overflow-hidden relative">
                <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 via-blue-500/5 to-transparent pointer-events-none" />
                <CardContent className="relative z-10 flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
                    className="p-6 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-8 shadow-inner"
                  >
                    <FileText className="h-16 w-16 text-purple-600 dark:text-purple-400" />
                  </motion.div>
                  <h3 className="text-4xl font-bold tracking-tight mb-4 text-foreground">No forms yet</h3>
                  <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
                    Get started by creating your first form. Describe what you need and watch AI generate magic for you.
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={handleCreateForm}
                      size="lg"
                      className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-xl shadow-purple-500/25 text-lg px-10 py-8 rounded-2xl font-bold"
                    >
                      <PlusCircle className="mr-2 h-6 w-6" />
                      Create Your First Form
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </ScaleInView>
          ) : (
            <StaggerContainer key="forms-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {forms.map((form) => (
                <StaggerItem key={form.id} className="h-full flex flex-col">
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex-1 flex flex-col"
                  >
                    <Card className="flex-1 border border-white/20 dark:border-white/10 bg-background/60 backdrop-blur-2xl shadow-xl hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)] transition-all duration-300 rounded-3xl overflow-hidden group flex flex-col relative">
                      <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      
                      <CardHeader className="relative p-7 pb-4">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-1.5">
                            <CardTitle className="text-xl font-bold leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                              {form.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                              {form.description || "No description provided."}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant="secondary"
                            className={form.published_at 
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0" 
                              : "bg-muted text-muted-foreground border-0"}
                          >
                            {form.published_at ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="relative flex-1 flex flex-col pt-0 p-7">
                        {/* Stats Metrics */}
                        <div className="grid grid-cols-3 gap-3 mb-6 p-4 rounded-2xl bg-muted/30 border border-border/50">
                          <div className="text-center">
                            <div className="text-xl font-black text-purple-600 dark:text-purple-400">
                              <AnimatedCounter value={form.views_count} duration={1} />
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Views</div>
                          </div>
                          <div className="text-center border-x border-border/50">
                            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                              <AnimatedCounter value={form.submissions_count} duration={1} />
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Subs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                              {form.conversion_rate}%
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Rate</div>
                          </div>
                        </div>

                        <div className="mt-auto space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              onClick={() => handleEditForm(form.id)}
                              className="w-full rounded-xl border-border/60 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 font-semibold"
                            >
                              <Settings className="mr-2 h-4 w-4" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleViewAnalytics(form.id)}
                              className="w-full rounded-xl border-border/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 font-semibold"
                            >
                              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                            </Button>
                          </div>
                          
                          <Button
                            className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold shadow-md group-hover:shadow-lg transition-all"
                            onClick={() => handleViewForm(form.slug)}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" /> Open Form
                          </Button>
                        </div>

                        <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span>{new Date(form.created_at).toLocaleDateString()}</span>
                          <code className="bg-muted/50 px-2.5 py-1 rounded-md text-[11px] font-mono tracking-tight">{form.slug}</code>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}