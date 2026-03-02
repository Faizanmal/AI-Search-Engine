/**
 * TypeScript types for the AI Search Engine.
 *
 * Covers: search, history, bookmarks, export, analytics, preferences,
 * collections, alerts, fact-checks, plugins, API keys, and trends.
 */

// ---------------------------------------------------------------------------
// Sources & Search
// ---------------------------------------------------------------------------

export type SearchMode = 'text' | 'image' | 'academic' | 'news' | 'code';

export interface Source {
  url: string;
  title?: string;
  snippet?: string;
  position?: number;
  domain?: string;
  favicon?: string;
  score?: number;
  cited?: boolean;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  trust_score: number;
  followups: string[];
  query_id?: string;
  response_time_ms?: number;
  search_mode?: SearchMode;
  fact_check_result?: FactCheckResult;
  tags?: string[];
}

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  trust_score?: number;
  followups?: string[];
  timestamp: Date;
  query_id?: string;
  response_time_ms?: number;
  isBookmarked?: boolean;
  isRegenerating?: boolean;
  search_mode?: SearchMode;
  tags?: string[];
}

export interface SimilarQuery {
  query: string;
  answer: string;
  relevance: string;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface SearchHistoryEntry {
  id: string;
  query: string;
  answer: string;
  trust_score: number;
  sources: Source[];
  followups: string[];
  model_used: string;
  response_time_ms: number;
  search_mode: SearchMode;
  fact_checked: boolean;
  tags: string[];
  created_at: string;
}

export interface SearchHistoryListEntry {
  id: string;
  query: string;
  trust_score: number;
  response_time_ms: number;
  search_mode: SearchMode;
  tags: string[];
  created_at: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

export interface BookmarkEntry {
  id: string;
  search_query: SearchHistoryEntry;
  note: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export type ExportFormat = 'json' | 'markdown' | 'pdf';

export interface ExportRequest {
  query_ids?: string[];
  format: ExportFormat;
  include_sources?: boolean;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  total_queries: number;
  total_bookmarks: number;
  avg_trust_score: number;
  avg_response_time_ms: number;
  queries_today: number;
  queries_this_week: number;
  top_queries: Array<{ query: string; count: number }>;
  search_mode_distribution?: Record<string, number>;
  daily_volume?: Array<{ date: string; count: number; avg_trust: number }>;
  top_domains?: Array<{ domain: string; count: number }>;
  avg_sources_per_query?: number;
  fact_check_count?: number;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export interface UserPreferences {
  default_max_sources: number;
  min_trust_score: number;
  preferred_source_types: string[];
  enable_voice_search: boolean;
  enable_auto_followups: boolean;
  enable_fact_checking: boolean;
  default_search_mode: SearchMode;
  enable_topic_alerts: boolean;
  interests: string[];
}

// ---------------------------------------------------------------------------
// Collections (Collaboration)
// ---------------------------------------------------------------------------

export interface CollectionComment {
  id: string;
  collection: string;
  search_query?: string;
  username: string;
  content: string;
  created_at: string;
}

export interface SearchCollection {
  id: string;
  name: string;
  description: string;
  owner_username: string;
  collaborator_usernames: string[];
  is_public: boolean;
  share_token: string;
  query_count: number;
  comments: CollectionComment[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Topic Alerts
// ---------------------------------------------------------------------------

export interface AlertNotification {
  id: string;
  title: string;
  summary: string;
  sources: Source[];
  is_read: boolean;
  created_at: string;
}

export interface TopicAlert {
  id: string;
  topic: string;
  keywords: string[];
  frequency: 'realtime' | 'daily' | 'weekly';
  is_active: boolean;
  last_checked: string | null;
  notification_count: number;
  recent_notifications: AlertNotification[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Fact Checking
// ---------------------------------------------------------------------------

export interface FactCheckClaim {
  claim: string;
  verdict: 'true' | 'mostly_true' | 'mixed' | 'mostly_false' | 'false' | 'unverifiable';
  confidence: number;
  explanation: string;
  evidence_sources: Source[];
}

export interface FactCheckResult {
  overall_verdict: string;
  claims: FactCheckClaim[];
}

export interface FactCheckEntry {
  id: string;
  search_query: string;
  claim: string;
  verdict: string;
  confidence: number;
  explanation: string;
  evidence_sources: Source[];
  created_at: string;
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

export interface Plugin {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'search' | 'transform' | 'export' | 'tool';
  icon: string;
  author: string;
  version: string;
  config_schema: Record<string, unknown>;
  is_active: boolean;
  is_builtin: boolean;
  install_count: number;
  is_installed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPlugin {
  id: string;
  plugin: Plugin;
  config: Record<string, unknown>;
  is_enabled: boolean;
  installed_at: string;
}

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

export interface APIKeyEntry {
  id: string;
  name: string;
  key: string;
  tier: 'free' | 'pro' | 'enterprise';
  requests_today: number;
  requests_total: number;
  daily_limit: number;
  is_active: boolean;
  last_used: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export interface TrendSnapshot {
  id: string;
  date: string;
  trending_topics: Array<{ topic: string; count: number }>;
  query_volume: number;
  avg_trust_score: number;
  avg_response_time_ms: number;
  top_domains: Array<{ domain: string; count: number }>;
  search_mode_distribution: Record<string, number>;
  user_count: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------------

export interface APIError {
  error: string;
  details?: string | Record<string, string[]>;
  retry_after?: number;
}
