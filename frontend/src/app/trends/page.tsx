/**
 * Trends page — displays search trend snapshots over the last N days.
 *
 * Features
 * --------
 * - Query volume area chart
 * - Average trust score line chart
 * - Trending topics tag cloud
 * - Top domains bar chart
 * - Search mode distribution pie chart
 * - Day selector (7 / 14 / 30)
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  BarChart3,
  Globe,
  Search,
  Users,
  Clock,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrends } from '@/hooks/use-search';
import type { TrendSnapshot } from '@/types/search';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [7, 14, 30] as const;

const PIE_COLORS = [
  '#176b86',
  '#0e4f66',
  '#1f8a5c',
  '#f05a2b',
  '#243447',
  '#1a8a9e',
  '#d4471c',
  '#5a7a8a',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function aggregateTopics(snapshots: TrendSnapshot[]) {
  const map = new Map<string, number>();
  for (const snap of snapshots) {
    for (const t of snap.trending_topics) {
      map.set(t.topic, (map.get(t.topic) ?? 0) + t.count);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([topic, count]) => ({ topic, count }));
}

function aggregateDomains(snapshots: TrendSnapshot[]) {
  const map = new Map<string, number>();
  for (const snap of snapshots) {
    for (const d of snap.top_domains) {
      map.set(d.domain, (map.get(d.domain) ?? 0) + d.count);
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([domain, count]) => ({ domain, count }));
}

function aggregateModes(snapshots: TrendSnapshot[]) {
  const map = new Map<string, number>();
  for (const snap of snapshots) {
    for (const [mode, count] of Object.entries(snap.search_mode_distribution)) {
      map.set(mode, (map.get(mode) ?? 0) + count);
    }
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrendsPage() {
  const [days, setDays] = useState<number>(7);
  const { data: snapshots, isLoading, error } = useTrends(days);

  // Derived data
  const volumeData = (snapshots ?? []).map((s) => ({
    date: fmtDate(s.date),
    volume: s.query_volume,
    trust: Math.round(s.avg_trust_score),
    users: s.user_count,
    responseTime: s.avg_response_time_ms,
  }));

  const totalVolume = volumeData.reduce((s, d) => s + d.volume, 0);
  const avgTrust =
    volumeData.length > 0
      ? Math.round(volumeData.reduce((s, d) => s + d.trust, 0) / volumeData.length)
      : 0;
  const totalUsers = volumeData.reduce((s, d) => s + d.users, 0);
  const avgResponseTime =
    volumeData.length > 0
      ? Math.round(
          volumeData.reduce((s, d) => s + d.responseTime, 0) / volumeData.length,
        )
      : 0;

  const topics = aggregateTopics(snapshots ?? []);
  const domains = aggregateDomains(snapshots ?? []);
  const modes = aggregateModes(snapshots ?? []);

  return (
    <div className="min-h-screen app-atmosphere">
      <div className="page-shell-inner max-w-7xl space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="page-title flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-[var(--ocean)]" />
              Search Trends
            </h1>
            <p className="page-subtitle">
              Discover what&apos;s trending across the platform
            </p>
          </div>

          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <Button
                key={p}
                variant={days === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(p)}
                className={
                  days === p
                    ? 'bg-[var(--ocean-deep)] hover:bg-[var(--ocean)] text-white rounded-lg'
                    : 'rounded-lg'
                }
              >
                {p}d
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--ocean)]" />
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-24 gap-2 text-red-500">
            <AlertCircle className="w-5 h-5" />
            Failed to load trends
          </div>
        )}

        {!isLoading && !error && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Total Queries',
                  value: totalVolume.toLocaleString(),
                  icon: Search,
                  color: 'text-[var(--ocean)]',
                },
                {
                  label: 'Avg Trust Score',
                  value: `${avgTrust}%`,
                  icon: ShieldCheck,
                  color: 'text-emerald-600',
                },
                {
                  label: 'Active Users',
                  value: totalUsers.toLocaleString(),
                  icon: Users,
                  color: 'text-[var(--ocean-deep)]',
                },
                {
                  label: 'Avg Response',
                  value: `${avgResponseTime}ms`,
                  icon: Clock,
                  color: 'text-amber-600',
                },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
                    <CardContent className="pt-6 flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center bg-opacity-10 ${stat.color} bg-current/10`}
                      >
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <p className="font-display text-2xl font-bold">{stat.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Query volume */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="w-5 h-5 text-[var(--ocean)]" />
                      Daily Query Volume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={volumeData}>
                          <defs>
                            <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#176b86" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#176b86" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="volume"
                            stroke="#176b86"
                            fill="url(#volGrad)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Search mode distribution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="w-5 h-5 text-[var(--ocean)]" />
                      Search Mode Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center">
                      {modes.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={modes}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              nameKey="name"
                              label={({ name, percent }) =>
                                `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                              }
                            >
                              {modes.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={PIE_COLORS[i % PIE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-muted-foreground text-sm">No data yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Trending topics + top domains */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Trending topics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Trending Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {topics.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {topics.map((t, i) => (
                          <Badge
                            key={t.topic}
                            variant={i < 5 ? 'default' : 'outline'}
                            className={
                              i < 5
                                ? 'bg-[var(--ocean-deep)] text-white rounded-lg'
                                : 'rounded-lg'
                            }
                          >
                            {t.topic}{' '}
                            <span className="ml-1 opacity-70">({t.count})</span>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-8 text-center">
                        No trending topics yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Top domains */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="w-5 h-5 text-amber-600" />
                      Top Domains
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      {domains.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={domains} layout="vertical">
                            <CartesianGrid
                              strokeDasharray="3 3"
                              className="opacity-30"
                            />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis
                              type="category"
                              dataKey="domain"
                              width={120}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              fill="#176b86"
                              radius={[0, 6, 6, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                          No domain data yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
