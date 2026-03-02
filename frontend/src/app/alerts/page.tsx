'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  Zap,
  Calendar,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAlerts,
  useCreateAlert,
  useDeleteAlert,
  useUpdateAlert,
  useCheckAlert,
  useNotifications,
  useMarkNotificationRead,
} from '@/hooks/use-search';

const freqIcons: Record<string, React.ReactNode> = {
  realtime: <Zap className="w-3.5 h-3.5" />,
  daily: <Clock className="w-3.5 h-3.5" />,
  weekly: <Calendar className="w-3.5 h-3.5" />,
};

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts();
  const { data: notifications } = useNotifications();
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();
  const updateAlert = useUpdateAlert();
  const checkAlert = useCheckAlert();
  const markRead = useMarkNotificationRead();

  const [createOpen, setCreateOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [frequency, setFrequency] = useState<'realtime' | 'daily' | 'weekly'>('daily');

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  const handleCreate = () => {
    if (!topic.trim()) return;
    createAlert.mutate(
      {
        topic: topic.trim(),
        keywords: keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        frequency,
      },
      {
        onSuccess: () => {
          setTopic('');
          setKeywords('');
          setFrequency('daily');
          setCreateOpen(false);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
              <Bell className="w-8 h-8 text-purple-600" />
              Topic Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Stay informed on topics that matter to you
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Topic Alert</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input
                  placeholder="Topic (e.g. AI safety)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <Input
                  placeholder="Keywords (comma-separated)"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <div>
                  <Label className="mb-1 block text-sm">Frequency</Label>
                  <Select
                    value={frequency}
                    onValueChange={(v) => setFrequency(v as typeof frequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!topic.trim() || createAlert.isPending}
                  className="w-full"
                >
                  {createAlert.isPending ? 'Creating…' : 'Create Alert'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        <Tabs defaultValue="alerts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="alerts">
              Alerts ({alerts?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            {isLoading && (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse h-36" />
                ))}
              </div>
            )}

            {!isLoading && (!alerts || alerts.length === 0) && (
              <Card className="text-center py-16">
                <CardContent>
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No alerts yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create an alert to get notified about new research
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {alerts?.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{alert.topic}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {freqIcons[alert.frequency]}
                              <span className="ml-1 capitalize">{alert.frequency}</span>
                            </Badge>
                            <Switch
                              checked={alert.is_active}
                              onCheckedChange={(checked) =>
                                updateAlert.mutate({
                                  id: alert.id,
                                  updates: { is_active: checked },
                                })
                              }
                            />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {alert.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {alert.keywords.map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span>
                            {alert.notification_count} notification
                            {alert.notification_count !== 1 && 's'}
                          </span>
                          {alert.last_checked && (
                            <span>
                              Last checked{' '}
                              {new Date(alert.last_checked).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => checkAlert.mutate(alert.id)}
                            disabled={checkAlert.isPending}
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Check Now
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 ml-auto"
                            onClick={() => deleteAlert.mutate(alert.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            {(!notifications || notifications.length === 0) && (
              <Card className="text-center py-16">
                <CardContent>
                  <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No notifications yet
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {notifications?.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card
                    className={`transition-colors ${
                      notif.is_read
                        ? 'opacity-60'
                        : 'border-l-4 border-l-purple-500'
                    }`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{notif.title}</p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notif.summary}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                        </div>
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markRead.mutate(notif.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> Read
                          </Button>
                        )}
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
