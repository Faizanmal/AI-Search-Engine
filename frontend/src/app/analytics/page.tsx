/**
 * Analytics Dashboard — visualizes search usage statistics.
 *
 * Features
 * --------
 * - Summary stat cards (total queries, bookmarks, avg trust, avg response time)
 * - Daily volume area chart (recharts)
 * - Search mode distribution pie chart
 * - Top domains bar chart
 * - Top queries table
 * - Fact-check stats
 * - Activity breakdown (today / this week)
 * - Responsive grid layout
 * - Skeleton loaders while data loads
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Bookmark,
  Shield,
  Clock,
  TrendingUp,
  Calendar,
  CalendarDays,
  BarChart3,
  Loader2,
  AlertCircle,
  Globe,
  CheckCircle,
  FileSearch,
  Layers,
} from 'lucide-react';
import { useAnalyticsSummary } from '@/hooks/use-search';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// Pie colours
const MODE_COLORS = ['#176b86', '#0e4f66', '#1f8a5c', '#f05a2b', '#243447'];

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  delay: number;
}

function StatCard({ title, value, subtitle, icon: Icon, gradient, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] hover:shadow-[var(--shadow-md)] transition-all rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div
              className={`p-3 rounded-lg bg-linear-to-br ${gradient} shadow-[var(--shadow-sm)] flex-shrink-0`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const { data: analytics, isLoading, isError, error } = useAnalyticsSummary();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-atmosphere">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--ocean)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 app-atmosphere">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Failed to load analytics</h1>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
        </p>
      </div>
    );
  }

  if (!analytics) return null;

  // Prepare mode data for pie chart
  const modeData = analytics.search_mode_distribution
    ? Object.entries(analytics.search_mode_distribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <div className="min-h-screen app-atmosphere">
      <div className="page-shell-inner">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="page-title flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-[var(--ocean)]" />
            Analytics
          </h1>
          <p className="page-subtitle">
            Insights into your search activity and usage patterns.
          </p>
        </motion.div>

        {/* Stat cards — row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <StatCard
            title="Total Searches"
            value={analytics.total_queries}
            icon={Search}
            gradient="from-[var(--ocean)] to-[var(--ocean-deep)]"
            delay={0.1}
          />
          <StatCard
            title="Bookmarks"
            value={analytics.total_bookmarks}
            icon={Bookmark}
            gradient="from-amber-500 to-[var(--signal)]"
            delay={0.2}
          />
          <StatCard
            title="Avg Trust Score"
            value={`${analytics.avg_trust_score.toFixed(1)}%`}
            subtitle={
              analytics.avg_trust_score >= 80
                ? 'High confidence'
                : analytics.avg_trust_score >= 60
                  ? 'Moderate confidence'
                  : 'Low confidence'
            }
            icon={Shield}
            gradient="from-emerald-600 to-emerald-500"
            delay={0.3}
          />
          <StatCard
            title="Avg Response Time"
            value={
              analytics.avg_response_time_ms >= 1000
                ? `${(analytics.avg_response_time_ms / 1000).toFixed(1)}s`
                : `${Math.round(analytics.avg_response_time_ms)}ms`
            }
            icon={Clock}
            gradient="from-[var(--ocean)] to-[var(--ocean-deep)]"
            delay={0.4}
          />
        </div>

        {/* Stat cards — row 2 (new metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
          <StatCard
            title="Avg Sources / Query"
            value={analytics.avg_sources_per_query?.toFixed(1) ?? '—'}
            icon={FileSearch}
            gradient="from-[var(--ocean)] to-[var(--sea-light)]"
            delay={0.45}
          />
          <StatCard
            title="Fact Checks"
            value={analytics.fact_check_count ?? 0}
            icon={CheckCircle}
            gradient="from-emerald-600 to-emerald-500"
            delay={0.5}
          />
          <StatCard
            title="Queries Today"
            value={analytics.queries_today}
            icon={Calendar}
            gradient="from-[var(--signal)] to-[var(--signal-deep)]"
            delay={0.55}
          />
        </div>

        {/* Charts row — daily volume + mode distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Daily Volume Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="lg:col-span-2"
          >
            <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--ocean)]" />
                  Search Volume (14 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.daily_volume && analytics.daily_volume.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={analytics.daily_volume}>
                      <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#176b86" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#176b86" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RTooltip />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#176b86"
                        fillOpacity={1}
                        fill="url(#colorVol)"
                        name="Queries"
                      />
                      <Area
                        type="monotone"
                        dataKey="avg_trust"
                        stroke="#1f8a5c"
                        fillOpacity={0}
                        name="Avg Trust"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No volume data yet
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Search Mode Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)] h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[var(--ocean)]" />
                  Search Modes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {modeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={modeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {modeData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={MODE_COLORS[i % MODE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No mode data yet
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Top Domains + Activity + Top Queries */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Top Domains */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)] h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[var(--ocean)]" />
                  Top Domains
                </CardTitle>
                <CardDescription>Most cited source domains</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.top_domains && analytics.top_domains.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={analytics.top_domains.slice(0, 6)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        dataKey="domain"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={100}
                      />
                      <RTooltip />
                      <Bar dataKey="count" fill="#176b86" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    No domain data yet
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)] h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--ocean)]" />
                  Activity
                </CardTitle>
                <CardDescription>Your recent search activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Today</span>
                    </div>
                    <Badge variant="secondary" className="text-sm font-mono">
                      {analytics.queries_today}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">This Week</span>
                    </div>
                    <Badge variant="secondary" className="text-sm font-mono">
                      {analytics.queries_this_week}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">All Time</span>
                    </div>
                    <Badge variant="secondary" className="text-sm font-mono">
                      {analytics.total_queries}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Queries */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)] h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[var(--ocean)]" />
                  Top Queries
                </CardTitle>
                <CardDescription>Most frequently searched topics</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.top_queries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No search data yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analytics.top_queries.map((entry, idx) => {
                      const maxCount = analytics.top_queries[0]?.count ?? 1;
                      const widthPct = Math.max(10, (entry.count / maxCount) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium line-clamp-1 flex-1 mr-2">
                              {entry.query}
                            </span>
                            <Badge variant="outline" className="text-xs font-mono flex-shrink-0">
                              {entry.count}×
                            </Badge>
                          </div>
                          <div className="h-2 bg-muted rounded-lg overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPct}%` }}
                              transition={{ delay: 0.9 + idx * 0.05, duration: 0.5 }}
                              className="h-full bg-[var(--ocean)] rounded-lg"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
