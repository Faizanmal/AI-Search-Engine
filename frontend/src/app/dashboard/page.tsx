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

function AnimatedCounter({ value, duration = 2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration * 60);

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

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated || !accessToken) {
        router.push("/login");
        return;
      }
      setAuthChecked(true);
      loadForms();
    };

    checkAuth();
    const timeout = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, accessToken, router]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen app-atmosphere">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-[var(--ocean)] mx-auto animate-spin" />
          <p className="text-base font-medium text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const handleCreateForm = () => router.push("/forms/new");
  const handleViewForm = (slug: string) => window.open(`/form/${slug}`, "_blank");
  const handleEditForm = (id: string) => router.push(`/forms/${id}/edit`);
  const handleViewAnalytics = (id: string) => router.push(`/forms/${id}/analytics`);

  const totalViews = forms.reduce((sum, form) => sum + form.views_count, 0);
  const totalSubmissions = forms.reduce((sum, form) => sum + form.submissions_count, 0);
  const avgConversion =
    forms.length > 0
      ? forms.reduce((sum, form) => sum + form.conversion_rate, 0) / forms.length
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen app-atmosphere">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-[var(--ocean)] mx-auto animate-spin" />
          <p className="text-base font-medium text-muted-foreground">Loading your forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-atmosphere relative overflow-hidden">
      <div className="absolute inset-0 bg-atlas-mesh pointer-events-none" />

      <div className="content-max-width container-padding section-spacing-sm md:section-spacing relative z-0">
        <FadeIn delay={0.05}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-10 gap-6 p-6 rounded-2xl border border-[var(--surface-border)] bg-[var(--paper)]/80 shadow-[var(--shadow-sm)]">
            <div className="flex-1 space-y-1">
              <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[var(--ink)]">
                FormForge
              </h1>
              <p className="text-muted-foreground text-base max-w-2xl">
                Create, manage, and analyze intelligent forms.
              </p>
            </div>
            <Button
              onClick={handleCreateForm}
              size="lg"
              className="w-full lg:w-auto bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white shadow-[var(--shadow-md)] text-base px-6 h-12 rounded-lg font-semibold"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              Create form
            </Button>
          </div>
        </FadeIn>

        {forms.length > 0 && (
          <FadeIn delay={0.1}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 md:mb-10">
              {[
                { icon: FileText, label: "Total Forms", value: forms.length, accent: "bg-[var(--ocean-deep)]" },
                { icon: Eye, label: "Total Views", value: totalViews, accent: "bg-[var(--ocean)]" },
                { icon: Users, label: "Submissions", value: totalSubmissions, accent: "bg-emerald-700" },
                {
                  icon: TrendingUp,
                  label: "Avg Conversion",
                  value: `${avgConversion.toFixed(1)}%`,
                  isPercentage: true,
                  accent: "bg-[var(--signal)]",
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.05 }}
                >
                  <Card className="h-full border border-[var(--surface-border)] bg-[var(--paper)]/90 shadow-[var(--shadow-sm)] rounded-xl">
                    <CardContent className="p-5 flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          {stat.label}
                        </p>
                        <p className="font-display text-3xl font-bold tracking-tight text-[var(--ink)]">
                          {stat.isPercentage ? (
                            stat.value
                          ) : (
                            <AnimatedCounter value={typeof stat.value === "number" ? stat.value : 0} />
                          )}
                        </p>
                      </div>
                      <div className={`p-2.5 rounded-lg ${stat.accent} text-white shrink-0`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </FadeIn>
        )}

        <AnimatePresence mode="wait">
          {forms.length === 0 ? (
            <ScaleInView key="empty-state">
              <Card className="text-center py-16 border border-[var(--surface-border)] bg-[var(--paper)]/90 shadow-[var(--shadow-md)] rounded-2xl">
                <CardContent className="flex flex-col items-center">
                  <div className="p-4 rounded-xl bg-[var(--sea-light)] mb-6">
                    <FileText className="h-10 w-10 text-[var(--ocean-deep)]" />
                  </div>
                  <h3 className="font-display text-2xl font-bold tracking-tight mb-2 text-[var(--ink)]">
                    No forms yet
                  </h3>
                  <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                    Describe what you need and generate your first intelligent form.
                  </p>
                  <Button
                    onClick={handleCreateForm}
                    size="lg"
                    className="bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white shadow-[var(--shadow-md)] px-8 h-12 rounded-lg font-semibold"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create your first form
                  </Button>
                </CardContent>
              </Card>
            </ScaleInView>
          ) : (
            <StaggerContainer
              key="forms-grid"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6"
            >
              {forms.map((form) => (
                <StaggerItem key={form.id} className="h-full flex flex-col">
                  <Card className="flex-1 border border-[var(--surface-border)] bg-[var(--paper)]/90 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-300 rounded-xl overflow-hidden group flex flex-col">
                    <CardHeader className="p-5 pb-3">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="font-display text-lg font-bold leading-tight group-hover:text-[var(--ocean)] transition-colors line-clamp-1">
                            {form.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                            {form.description || "No description provided."}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            form.published_at
                              ? "bg-emerald-100 text-emerald-700 border-0"
                              : "bg-muted text-muted-foreground border-0"
                          }
                        >
                          {form.published_at ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col pt-0 p-5">
                      <div className="grid grid-cols-3 gap-2 mb-5 p-3 rounded-lg bg-muted/40 border border-[var(--surface-border)]">
                        <div className="text-center">
                          <div className="text-lg font-bold text-[var(--ocean)]">
                            <AnimatedCounter value={form.views_count} duration={1} />
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                            Views
                          </div>
                        </div>
                        <div className="text-center border-x border-[var(--surface-border)]">
                          <div className="text-lg font-bold text-[var(--ink)]">
                            <AnimatedCounter value={form.submissions_count} duration={1} />
                          </div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                            Subs
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-600">{form.conversion_rate}%</div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                            Rate
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto space-y-2.5">
                        <div className="grid grid-cols-2 gap-2.5">
                          <Button
                            variant="outline"
                            onClick={() => handleEditForm(form.id)}
                            className="w-full rounded-lg border-[var(--surface-border)] hover:bg-[var(--sea-light)]/50 hover:text-[var(--ocean-deep)] font-medium"
                          >
                            <Settings className="mr-2 h-4 w-4" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleViewAnalytics(form.id)}
                            className="w-full rounded-lg border-[var(--surface-border)] hover:bg-[var(--sea-light)]/50 hover:text-[var(--ocean-deep)] font-medium"
                          >
                            <BarChart3 className="mr-2 h-4 w-4" /> Analytics
                          </Button>
                        </div>

                        <Button
                          className="w-full rounded-lg bg-[var(--ink)] text-white hover:bg-[var(--ink-soft)] font-semibold"
                          onClick={() => handleViewForm(form.slug)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" /> Open Form
                        </Button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--surface-border)] flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>{new Date(form.created_at).toLocaleDateString()}</span>
                        <code className="bg-muted/50 px-2 py-0.5 rounded text-[11px] font-mono">
                          {form.slug}
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
