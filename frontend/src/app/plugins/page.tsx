'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Puzzle,
  Download,
  Trash2,
  CheckCircle2,
  Search,
  FileOutput,
  Wrench,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  usePlugins,
  useInstalledPlugins,
  useInstallPlugin,
  useUninstallPlugin,
} from '@/hooks/use-search';

const categoryIcons: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  transform: <Layers className="w-4 h-4" />,
  export: <FileOutput className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
};

export default function PluginsPage() {
  const { data: plugins, isLoading } = usePlugins();
  const { data: installed } = useInstalledPlugins();
  const installPlugin = useInstallPlugin();
  const uninstallPlugin = useUninstallPlugin();

  const installedIds = new Set(installed?.map((up) => up.plugin.id) ?? []);
  const installedByPluginId = new Map((installed ?? []).map((up) => [up.plugin.id, up.id]));

  return (
    <div className="min-h-screen app-atmosphere">
      <div className="page-shell-inner max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="page-title flex items-center gap-3">
            <Puzzle className="w-7 h-7 text-[var(--ocean)]" />
            Plugin Marketplace
          </h1>
          <p className="page-subtitle">
            Extend your search engine with powerful add-ons
          </p>
        </motion.div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Plugins</TabsTrigger>
            <TabsTrigger value="installed">
              Installed ({installed?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* All Plugins */}
          <TabsContent value="all">
            {isLoading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse h-48 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]" />
                ))}
              </div>
            )}

            {!isLoading && (!plugins || plugins.length === 0) && (
              <Card className="text-center py-16 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
                <CardContent>
                  <Puzzle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No plugins available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check back later for new plugins
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plugins?.map((plugin) => (
                <motion.div
                  key={plugin.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="h-full flex flex-col bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{plugin.icon || '🔌'}</span>
                          <div>
                            <CardTitle className="text-base">{plugin.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              by {plugin.author} &middot; v{plugin.version}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {categoryIcons[plugin.category]}
                          <span className="ml-1 capitalize">{plugin.category}</span>
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {plugin.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Download className="w-3 h-3 inline mr-1" />
                          {plugin.install_count} installs
                        </span>
                        {installedIds.has(plugin.id) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const userPluginId = installedByPluginId.get(plugin.id);
                              if (userPluginId) uninstallPlugin.mutate(userPluginId);
                            }}
                            disabled={uninstallPlugin.isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Uninstall
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => installPlugin.mutate({ pluginId: plugin.id })}
                            disabled={installPlugin.isPending}
                            className="bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> Install
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Installed Plugins */}
          <TabsContent value="installed">
            {(!installed || installed.length === 0) && (
              <Card className="text-center py-16 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
                <CardContent>
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No plugins installed</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browse the marketplace to add plugins
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {installed?.map((up) => (
                <motion.div
                  key={up.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{up.plugin.icon || '🔌'}</span>
                          <CardTitle className="text-base">{up.plugin.name}</CardTitle>
                        </div>
                        <Badge
                          variant={up.is_enabled ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {up.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">
                        {up.plugin.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Installed{' '}
                          {new Date(up.installed_at).toLocaleDateString()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => uninstallPlugin.mutate(up.id)}
                          disabled={uninstallPlugin.isPending}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
