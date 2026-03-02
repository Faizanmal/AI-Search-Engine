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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
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
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950">
      <div className="content-max-width container-padding section-spacing-sm md:section-spacing">
        {/* Header */}
        <FadeIn delay={0.1}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-12 gap-4 md:gap-6">
            <div className="flex-1">
              <h1 className="heading-secondary bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                My Forms
              </h1>
              <p className="text-muted-foreground mt-2 md:mt-3 text-base md:text-lg">
                Create and manage your intelligent forms
              </p>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full lg:w-auto"
            >
              <Button 
                onClick={handleCreateForm} 
                size="lg"
                className="w-full lg:w-auto btn-gradient-primary text-base px-6 md:px-8 py-4 md:py-6 rounded-xl"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Form
              </Button>
            </motion.div>
          </div>
        </FadeIn>

        {/* Stats Cards */}
        {forms.length > 0 && (
          <FadeIn delay={0.2}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
              {[
                { icon: FileText, label: "Total Forms", value: forms.length, gradient: "from-purple-500 to-pink-500" },
                { icon: Eye, label: "Total Views", value: totalViews, gradient: "from-blue-500 to-cyan-500" },
                { icon: Users, label: "Submissions", value: totalSubmissions, gradient: "from-green-500 to-emerald-500" },
                { icon: TrendingUp, label: "Avg Conversion", value: `${avgConversion.toFixed(1)}%`, gradient: "from-orange-500 to-red-500", isPercentage: true },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                >
                  <Card className="glass border-white/30 card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{stat.label}</p>
                          <p className="text-4xl font-bold">
                            {stat.isPercentage ? (
                              stat.value
                            ) : (
                              <AnimatedCounter value={typeof stat.value === 'number' ? stat.value : 0} />
                            )}
                          </p>
                        </div>
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                          <stat.icon className="w-7 h-7 text-white" />
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
              <Card className="text-center py-20 glass border-white/30 shadow-xl">
                <CardContent>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  >
                    <FileText className="mx-auto h-24 w-24 text-purple-400 mb-8" />
                  </motion.div>
                  <h3 className="text-3xl font-bold mb-4">No forms yet</h3>
                  <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
                    Get started by creating your first form. Just describe what you need and AI will generate it for you.
                  </p>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={handleCreateForm}
                      size="lg"
                      className="btn-gradient-primary text-base px-8 py-6 rounded-xl"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Create Your First Form
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </ScaleInView>
          ) : (
            <StaggerContainer key="forms-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {forms.map((form, index) => (
                <StaggerItem key={form.id}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -8 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Card className="h-full glass border-white/30 card-hover overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <CardHeader className="relative">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="line-clamp-1 group-hover:text-purple-600 transition-colors">
                              {form.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-2 mt-2">
                              {form.description || "No description"}
                            </CardDescription>
                          </div>
                          <motion.div
                            initial={{ scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                          >
                            <Badge 
                              variant={form.published_at ? "default" : "secondary"}
                              className={form.published_at ? "bg-linear-to-r from-green-500 to-emerald-500" : ""}
                            >
                              {form.published_at ? "Published" : "Draft"}
                            </Badge>
                          </motion.div>
                        </div>
                      </CardHeader>

                      <CardContent className="relative space-y-4">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 text-center p-5 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-100 dark:border-purple-900/30">
                          <div>
                            <motion.div 
                              className="text-2xl font-bold text-purple-600"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.1 + index * 0.05, type: "spring" }}
                            >
                              <AnimatedCounter value={form.views_count} duration={1} />
                            </motion.div>
                            <div className="text-xs text-muted-foreground mt-1">Views</div>
                          </div>
                          <div>
                            <motion.div 
                              className="text-2xl font-bold text-blue-600"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.15 + index * 0.05, type: "spring" }}
                            >
                              <AnimatedCounter value={form.submissions_count} duration={1} />
                            </motion.div>
                            <div className="text-xs text-muted-foreground mt-1">Submissions</div>
                          </div>
                          <div>
                            <motion.div 
                              className="text-2xl font-bold text-green-600"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2 + index * 0.05, type: "spring" }}
                            >
                              {form.conversion_rate}%
                            </motion.div>
                            <div className="text-xs text-muted-foreground mt-1">Rate</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditForm(form.id)}
                              className="hover-lift border-2 font-medium"
                            >
                              <Settings className="mr-1.5 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAnalytics(form.id)}
                              className="hover-lift border-2 font-medium"
                            >
                              <BarChart3 className="mr-1.5 h-4 w-4" />
                              Analytics
                            </Button>
                          </div>
                          
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full btn-gradient-primary font-semibold"
                            onClick={() => handleViewForm(form.slug)}
                          >
                            <ExternalLink className="mr-1.5 h-4 w-4" />
                            View Form
                          </Button>
                        </div>

                        {/* Metadata */}
                        <div className="text-xs text-muted-foreground pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <span>Created {new Date(form.created_at).toLocaleDateString()}</span>
                            <code className="bg-muted px-2 py-1 rounded text-xs">{form.slug}</code>
                          </div>
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