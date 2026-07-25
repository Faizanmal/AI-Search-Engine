/**
 * React Query hooks for the AI Search Engine.
 *
 * Provides caching, deduplication, background refetching, and
 * optimistic UI updates for: history, bookmarks, analytics,
 * preferences, search queries, collections, alerts, fact-checks,
 * plugins, API keys, and trends.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { searchAPI, RateLimitError } from '@/lib/search-api';
import type {
  AnalyticsSummary,
  AlertNotification,
  APIKeyEntry,
  BookmarkEntry,
  CollectionComment,
  ExportRequest,
  FactCheckEntry,
  FactCheckResult,
  PaginatedResponse,
  Plugin,
  QueryResponse,
  SearchCollection,
  SearchHistoryEntry,
  SearchHistoryListEntry,
  SearchMode,
  TopicAlert,
  TrendSnapshot,
  UserPlugin,
  UserPreferences,
} from '@/types/search';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Query Keys (centralised for cache invalidation)
// ---------------------------------------------------------------------------

export const queryKeys = {
  history: (page?: number, search?: string) =>
    ['history', { page, search }] as const,
  historyEntry: (id: string) => ['history', id] as const,
  bookmarks: ['bookmarks'] as const,
  analytics: ['analytics'] as const,
  preferences: ['preferences'] as const,
  health: ['health'] as const,
  collections: ['collections'] as const,
  collection: (id: string) => ['collections', id] as const,
  collectionComments: (id: string) => ['collections', id, 'comments'] as const,
  alerts: ['alerts'] as const,
  alert: (id: string) => ['alerts', id] as const,
  notifications: ['notifications'] as const,
  factChecks: (queryId: string) => ['fact-checks', queryId] as const,
  plugins: ['plugins'] as const,
  installedPlugins: ['plugins', 'installed'] as const,
  apiKeys: ['api-keys'] as const,
  trends: (days: number) => ['trends', days] as const,
} as const;

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

function handleError(err: unknown, fallback = 'Something went wrong') {
  if (err instanceof RateLimitError) {
    toast.error(`Rate limited — retry in ${err.retryAfter}s`);
    return;
  }
  const msg = err instanceof Error ? err.message : fallback;
  toast.error(msg);
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function useSearchQuery() {
  const queryClient = useQueryClient();

  return useMutation<
    QueryResponse,
    Error,
    { query: string; searchMode?: SearchMode; enableFactCheck?: boolean }
  >({
    mutationFn: ({ query, searchMode, enableFactCheck }) =>
      searchAPI.query(query, searchMode, enableFactCheck),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: (err) => handleError(err, 'Search failed'),
  });
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export function useSearchHistory(page = 1, search = '') {
  return useQuery<PaginatedResponse<SearchHistoryListEntry>>({
    queryKey: queryKeys.history(page, search),
    queryFn: () => searchAPI.getHistory(page, search),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useSearchHistoryEntry(id: string) {
  return useQuery<SearchHistoryEntry>({
    queryKey: queryKeys.historyEntry(id),
    queryFn: () => searchAPI.getHistoryEntry(id),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => searchAPI.deleteHistoryEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('History entry deleted');
    },
    onError: (err) => handleError(err),
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation<{ deleted: number }, Error, void>({
    mutationFn: () => searchAPI.clearHistory(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(`Cleared ${data.deleted} entries`);
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export function useBookmarks() {
  return useQuery<BookmarkEntry[]>({
    queryKey: queryKeys.bookmarks,
    queryFn: () => searchAPI.getBookmarks(),
    staleTime: 30_000,
  });
}

export function useCreateBookmark() {
  const queryClient = useQueryClient();
  return useMutation<
    BookmarkEntry,
    Error,
    { searchQueryId: string; note?: string }
  >({
    mutationFn: ({ searchQueryId, note }) =>
      searchAPI.createBookmark(searchQueryId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Bookmarked!');
    },
    onError: (err) => handleError(err),
  });
}

export function useDeleteBookmark() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => searchAPI.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Bookmark removed');
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function useExportData() {
  return useMutation<Blob, Error, ExportRequest>({
    mutationFn: (req) => searchAPI.exportData(req),
    onSuccess: (blob, variables) => {
      const ext =
        variables.format === 'markdown'
          ? 'md'
          : variables.format === 'pdf'
            ? 'pdf'
            : 'json';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search_export.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${variables.format.toUpperCase()}`);
    },
    onError: (err) => handleError(err, 'Export failed'),
  });
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: queryKeys.analytics,
    queryFn: () => searchAPI.getAnalyticsSummary(),
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export function usePreferences() {
  return useQuery<UserPreferences>({
    queryKey: queryKeys.preferences,
    queryFn: () => searchAPI.getPreferences(),
    staleTime: 300_000,
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation<UserPreferences, Error, Partial<UserPreferences>>({
    mutationFn: (prefs) => searchAPI.updatePreferences(prefs),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.preferences, data);
      toast.success('Preferences saved');
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => searchAPI.healthCheck(),
    staleTime: 120_000,
    retry: 1,
  });
}

// ---------------------------------------------------------------------------
// Collections (Collaboration)
// ---------------------------------------------------------------------------

export function useCollections() {
  return useQuery<SearchCollection[]>({
    queryKey: queryKeys.collections,
    queryFn: () => searchAPI.getCollections(),
    staleTime: 30_000,
  });
}

export function useCollection(id: string) {
  return useQuery<SearchCollection>({
    queryKey: queryKeys.collection(id),
    queryFn: () => searchAPI.getCollection(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation<
    SearchCollection,
    Error,
    { name: string; description?: string; isPublic?: boolean }
  >({
    mutationFn: ({ name, description, isPublic }) =>
      searchAPI.createCollection(name, description, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      toast.success('Collection created');
    },
    onError: (err) => handleError(err),
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation<
    SearchCollection,
    Error,
    { id: string; updates: Partial<{ name: string; description: string; is_public: boolean }> }
  >({
    mutationFn: ({ id, updates }) => searchAPI.updateCollection(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.setQueryData(queryKeys.collection(data.id), data);
      toast.success('Collection updated');
    },
    onError: (err) => handleError(err),
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => searchAPI.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      toast.success('Collection deleted');
    },
    onError: (err) => handleError(err),
  });
}

export function useAddQueryToCollection() {
  const queryClient = useQueryClient();
  return useMutation<{ status: string }, Error, { collectionId: string; queryId: string }>({
    mutationFn: ({ collectionId, queryId }) =>
      searchAPI.addQueryToCollection(collectionId, queryId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({ queryKey: queryKeys.collection(vars.collectionId) });
      toast.success('Query added to collection');
    },
    onError: (err) => handleError(err),
  });
}

export function useAddCollaborator() {
  const queryClient = useQueryClient();
  return useMutation<{ status: string }, Error, { collectionId: string; username: string }>({
    mutationFn: ({ collectionId, username }) =>
      searchAPI.addCollaborator(collectionId, username),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
      queryClient.invalidateQueries({ queryKey: queryKeys.collection(vars.collectionId) });
      toast.success('Collaborator added');
    },
    onError: (err) => handleError(err),
  });
}

export function useCollectionComments(collectionId: string) {
  return useQuery<CollectionComment[]>({
    queryKey: queryKeys.collectionComments(collectionId),
    queryFn: () => searchAPI.getCollectionComments(collectionId),
    enabled: !!collectionId,
    staleTime: 15_000,
  });
}

export function useAddCollectionComment() {
  const queryClient = useQueryClient();
  return useMutation<
    CollectionComment,
    Error,
    { collectionId: string; content: string; queryId?: string }
  >({
    mutationFn: ({ collectionId, content, queryId }) =>
      searchAPI.addCollectionComment(collectionId, content, queryId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.collectionComments(vars.collectionId),
      });
      toast.success('Comment added');
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// Topic Alerts
// ---------------------------------------------------------------------------

export function useAlerts() {
  return useQuery<TopicAlert[]>({
    queryKey: queryKeys.alerts,
    queryFn: () => searchAPI.getAlerts(),
    staleTime: 30_000,
  });
}

export function useAlert(id: string) {
  return useQuery<TopicAlert>({
    queryKey: queryKeys.alert(id),
    queryFn: () => searchAPI.getAlert(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation<
    TopicAlert,
    Error,
    { topic: string; keywords?: string[]; frequency?: 'realtime' | 'daily' | 'weekly' }
  >({
    mutationFn: ({ topic, keywords, frequency }) =>
      searchAPI.createAlert(topic, keywords, frequency),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      toast.success('Alert created');
    },
    onError: (err) => handleError(err),
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();
  return useMutation<
    TopicAlert,
    Error,
    { id: string; updates: Partial<{ topic: string; keywords: string[]; frequency: string; is_active: boolean }> }
  >({
    mutationFn: ({ id, updates }) => searchAPI.updateAlert(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      queryClient.setQueryData(queryKeys.alert(data.id), data);
      toast.success('Alert updated');
    },
    onError: (err) => handleError(err),
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => searchAPI.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      toast.success('Alert deleted');
    },
    onError: (err) => handleError(err),
  });
}

export function useCheckAlert() {
  const queryClient = useQueryClient();
  return useMutation<AlertNotification, Error, string>({
    mutationFn: (id) => searchAPI.checkAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      toast.success('Alert checked — see notifications');
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotifications() {
  return useQuery<AlertNotification[]>({
    queryKey: queryKeys.notifications,
    queryFn: () => searchAPI.getNotifications(),
    staleTime: 15_000,
    refetchInterval: 60_000, // poll every minute
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<{ status: string }, Error, string>({
    mutationFn: (id) => searchAPI.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// Fact Checking
// ---------------------------------------------------------------------------

export function useFactCheck() {
  return useMutation<FactCheckResult, Error, string>({
    mutationFn: (queryId) => searchAPI.factCheck(queryId),
    onSuccess: () => toast.success('Fact-check complete'),
    onError: (err) => handleError(err, 'Fact-check failed'),
  });
}

export function useFactCheckResults(queryId: string) {
  return useQuery<FactCheckEntry[]>({
    queryKey: queryKeys.factChecks(queryId),
    queryFn: () => searchAPI.getFactChecks(queryId),
    enabled: !!queryId,
    staleTime: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

export function usePlugins() {
  return useQuery<Plugin[]>({
    queryKey: queryKeys.plugins,
    queryFn: () => searchAPI.getPlugins(),
    staleTime: 60_000,
  });
}

export function useInstalledPlugins() {
  return useQuery<UserPlugin[]>({
    queryKey: queryKeys.installedPlugins,
    queryFn: () => searchAPI.getInstalledPlugins(),
    staleTime: 30_000,
  });
}

export function useInstallPlugin() {
  const queryClient = useQueryClient();
  return useMutation<
    UserPlugin,
    Error,
    { pluginId: string; config?: Record<string, unknown> }
  >({
    mutationFn: ({ pluginId, config }) => searchAPI.installPlugin(pluginId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins });
      queryClient.invalidateQueries({ queryKey: queryKeys.installedPlugins });
      toast.success('Plugin installed');
    },
    onError: (err) => handleError(err),
  });
}

export function useUninstallPlugin() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (pluginId) => searchAPI.uninstallPlugin(pluginId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plugins });
      queryClient.invalidateQueries({ queryKey: queryKeys.installedPlugins });
      toast.success('Plugin uninstalled');
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export function useAPIKeys() {
  return useQuery<APIKeyEntry[]>({
    queryKey: queryKeys.apiKeys,
    queryFn: () => searchAPI.getAPIKeys(),
    staleTime: 30_000,
  });
}

export function useCreateAPIKey() {
  const queryClient = useQueryClient();
  return useMutation<
    APIKeyEntry,
    Error,
    { name: string; tier?: 'free' | 'pro' | 'enterprise' }
  >({
    mutationFn: ({ name, tier }) => searchAPI.createAPIKey(name, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
      toast.success('API key created');
    },
    onError: (err) => handleError(err),
  });
}

export function useDeleteAPIKey() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => searchAPI.deleteAPIKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys });
      toast.success('API key deleted');
    },
    onError: (err) => handleError(err),
  });
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export function useTrends(days = 7) {
  return useQuery<TrendSnapshot[]>({
    queryKey: queryKeys.trends(days),
    queryFn: () => searchAPI.getTrends(days),
    staleTime: 300_000,
  });
}
