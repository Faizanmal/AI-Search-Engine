/**
 * ChatBox — the main conversational search interface.
 *
 * Features
 * --------
 * - Full conversation thread with user / assistant bubbles
 * - Voice search via Web Speech API (VoiceSearchButton)
 * - Regenerate last response from keyboard or button
 * - Inline edit of previous user messages (re-submits)
 * - Keyboard shortcuts (Enter → send, Shift+Enter → newline in textarea)
 * - Bookmarking assistant messages (persisted via API)
 * - Copy-to-clipboard for assistant answers
 * - Skeleton loader while waiting for response
 * - Accessible ARIA live region for screen readers
 * - Rate-limit awareness (shows retry countdown)
 */

'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  memo,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, Source, SearchMode } from '@/types/search';
import { MessageBubble } from './MessageBubble';
import { VoiceSearchButton } from './VoiceSearchButton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  RotateCcw,
  Trash2,
  Keyboard,
  FileText,
  Image as ImageIcon,
  GraduationCap,
  Newspaper,
  Code2,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { searchAPI, RateLimitError } from '@/lib/search-api';
import { usePreferences } from '@/hooks/use-search';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FadeIn } from '@/components/animations';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatBoxProps {
  /** If supplied, prepopulate from a history entry */
  onSelectHistoryEntry?: (entry: {
    query: string;
    answer: string;
    sources: Source[];
    trust_score: number;
    followups: string[];
  }) => void;
}

// ---------------------------------------------------------------------------
// Suggested Queries
// ---------------------------------------------------------------------------
const SUGGESTED_QUERIES = [
  { text: 'What is quantum computing?', icon: Sparkles, accent: 'bg-[var(--ocean)]' },
  { text: 'Explain climate change causes', icon: Zap, accent: 'bg-[var(--ocean-deep)]' },
  { text: 'How does machine learning work?', icon: Sparkles, accent: 'bg-[var(--signal)]' },
  { text: 'Latest developments in AI', icon: Zap, accent: 'bg-[var(--ink)]' },
] as const;

const DEGRADED_LABELS: Record<string, string> = {
  missing_tavily_key: 'Web search is offline (missing Tavily key).',
  tavily_error: 'Web search failed — results may be incomplete.',
  no_results: 'No web sources found for this query.',
  missing_llm: 'Answer model is offline (missing API key).',
  llm_error: 'Answer generation hit an error.',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ChatBoxInner({}: ChatBoxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: preferences } = usePreferences();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [enableFactCheck, setEnableFactCheck] = useState(false);
  const [prefsApplied, setPrefsApplied] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyLoadedRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);

  // Apply saved preferences once
  useEffect(() => {
    if (!preferences || prefsApplied) return;
    setSearchMode(preferences.default_search_mode || 'text');
    setEnableFactCheck(Boolean(preferences.enable_fact_checking));
    setVoiceEnabled(preferences.enable_voice_search !== false);
    setPrefsApplied(true);
  }, [preferences, prefsApplied]);

  // Restore a history entry from ?history=<id>
  useEffect(() => {
    const historyId = searchParams.get('history');
    if (!historyId || historyLoadedRef.current === historyId) return;

    let cancelled = false;
    (async () => {
      try {
        const entry = await searchAPI.getHistoryEntry(historyId);
        if (cancelled) return;
        historyLoadedRef.current = historyId;
        const userMessage: Message = {
          id: crypto.randomUUID(),
          type: 'user',
          content: entry.query,
          timestamp: new Date(entry.created_at),
        };
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          type: 'assistant',
          content: entry.answer,
          sources: entry.sources,
          trust_score: entry.trust_score,
          followups: entry.followups,
          timestamp: new Date(entry.created_at),
          query_id: entry.id,
          response_time_ms: entry.response_time_ms,
          search_mode: entry.search_mode,
          tags: entry.tags,
          fact_check_result: entry.fact_check_result,
        };
        setMessages([userMessage, assistantMessage]);
        if (entry.search_mode) setSearchMode(entry.search_mode);
        toast.success('Loaded from history');
      } catch {
        toast.error('Could not load that search from history');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // ---- Auto-scroll ----------------------------------------------------------
  useEffect(() => {
    if (scrollAreaRef.current) {
      const el = scrollAreaRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  // ---- Retry countdown ------------------------------------------------------
  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      retryTimerRef.current = setInterval(() => {
        setRetryAfter((prev) => {
          if (prev === null || prev <= 1) {
            if (retryTimerRef.current) clearInterval(retryTimerRef.current);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, [retryAfter]);

  // ---- Submit query ---------------------------------------------------------
  const handleSubmit = useCallback(
    async (queryText: string) => {
      const trimmed = queryText.trim();
      if (!trimmed || isLoading) return;

      const conversationHistory = messages
        .filter((m) => m.content?.trim())
        .slice(-6)
        .map((m) => ({
          role: (m.type === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content.slice(0, 2000),
        }));

      const userMessage: Message = {
        id: crypto.randomUUID(),
        type: 'user',
        content: trimmed,
        timestamp: new Date(),
      };
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantId,
          type: 'assistant',
          content: '',
          sources: [],
          followups: [],
          timestamp: new Date(),
          isRegenerating: true,
        },
      ]);
      setInputValue('');
      setIsLoading(true);
      setError(null);
      setRetryAfter(null);
      setLastFailedQuery(null);
      setStreamStatus('Searching the web…');

      if (searchParams.get('history')) {
        router.replace('/search', { scroll: false });
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const autoFollowups = preferences?.enable_auto_followups !== false;
      let usedStreaming = false;
      let finalized = false;

      const finalizeAssistant = (patch: Partial<Message>) => {
        finalized = true;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, ...patch, isRegenerating: false }
              : m,
          ),
        );
      };

      try {
        // Prefer streaming; fall back to blocking query (e.g. fact-check path)
        if (enableFactCheck) {
          const response = await searchAPI.query(trimmed, searchMode, true, {
            maxSources: preferences?.default_max_sources,
            sourceTypes: preferences?.preferred_source_types,
            conversationHistory,
          });
          let followups = response.followups;
          if (autoFollowups && (!followups || followups.length === 0)) {
            try {
              const similar = await searchAPI.getSimilarQueries(trimmed, 3);
              followups = similar.map((item) => item.query).filter(Boolean);
            } catch {
              /* noop */
            }
          }
          if (!autoFollowups) followups = [];
          if (response.cached) {
            toast.message('Answer served from cache');
          }
          if (response.degraded) {
            toast.warning(
              DEGRADED_LABELS[response.degraded_reason || ''] ||
                'Search ran in degraded mode.',
            );
          }
          finalizeAssistant({
            content: response.answer,
            sources: response.sources,
            trust_score: response.trust_score,
            followups,
            query_id: response.query_id,
            response_time_ms: response.response_time_ms,
            search_mode: response.search_mode,
            tags: response.tags,
            fact_check_result: response.fact_check_result,
            degraded: response.degraded,
            degraded_reason: response.degraded_reason,
          });
        } else {
          usedStreaming = true;
          let latestSources: Message['sources'] = [];
          await searchAPI.streamQuery(
            trimmed,
            {
              onStatus: (status) => {
                if (status === 'searching') setStreamStatus('Searching the web…');
                else if (status === 'generating') setStreamStatus('Writing answer…');
                else setStreamStatus(status);
              },
              onSources: (sources) => {
                latestSources = sources;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, sources } : m,
                  ),
                );
                setStreamStatus('Writing answer…');
              },
              onChunk: (chunk) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: (m.content || '') + chunk }
                      : m,
                  ),
                );
              },
              onDone: async (meta) => {
                if (finalized) {
                  // Second pass (done event) — attach query_id / timing only
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            query_id: meta.query_id || m.query_id,
                            response_time_ms:
                              meta.response_time_ms ?? m.response_time_ms,
                            tags: meta.tags || m.tags,
                          }
                        : m,
                    ),
                  );
                  return;
                }
                let followups = meta.followups || [];
                if (autoFollowups && followups.length === 0) {
                  try {
                    const similar = await searchAPI.getSimilarQueries(trimmed, 3);
                    followups = similar.map((item) => item.query).filter(Boolean);
                  } catch {
                    /* noop */
                  }
                }
                if (!autoFollowups) followups = [];
                if (meta.degraded) {
                  toast.warning(
                    DEGRADED_LABELS[meta.degraded_reason || ''] ||
                      'Search ran in degraded mode.',
                  );
                }
                finalizeAssistant({
                  content: meta.answer,
                  sources: meta.sources || latestSources,
                  trust_score: meta.trust_score,
                  followups,
                  query_id: meta.query_id,
                  response_time_ms: meta.response_time_ms,
                  search_mode: (meta.search_mode as SearchMode) || searchMode,
                  tags: meta.tags,
                  degraded: meta.degraded,
                  degraded_reason: meta.degraded_reason,
                });
              },
              onError: (message) => {
                throw new Error(message);
              },
            },
            {
              searchMode,
              maxSources: preferences?.default_max_sources,
              sourceTypes: preferences?.preferred_source_types,
              enableFollowups: autoFollowups,
              conversationHistory,
              signal: controller.signal,
            },
          );

          // If stream ended without a done/metadata event, keep whatever we have
          if (!finalized) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isRegenerating: false } : m,
              ),
            );
          }
        }

        queryClient.invalidateQueries({ queryKey: ['history'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }
        // Streaming failed — try one-shot query once
        if (usedStreaming && !(err instanceof RateLimitError)) {
          try {
            const response = await searchAPI.query(trimmed, searchMode, false, {
              maxSources: preferences?.default_max_sources,
              sourceTypes: preferences?.preferred_source_types,
              conversationHistory,
            });
            finalizeAssistant({
              content: response.answer,
              sources: response.sources,
              trust_score: response.trust_score,
              followups: autoFollowups ? response.followups : [],
              query_id: response.query_id,
              response_time_ms: response.response_time_ms,
              search_mode: response.search_mode,
              tags: response.tags,
              degraded: response.degraded,
              degraded_reason: response.degraded_reason,
            });
            queryClient.invalidateQueries({ queryKey: ['history'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            return;
          } catch (fallbackErr) {
            err = fallbackErr;
          }
        }

        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setLastFailedQuery(trimmed);
        if (err instanceof RateLimitError) {
          setRetryAfter(err.retryAfter ?? 60);
          setError(
            `Rate limit exceeded. Please wait ${err.retryAfter ?? 60}s before trying again.`,
          );
        } else {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
      } finally {
        setIsLoading(false);
        setStreamStatus(null);
        abortRef.current = null;
        textareaRef.current?.focus();
      }
    },
    [
      isLoading,
      searchMode,
      enableFactCheck,
      preferences,
      router,
      searchParams,
      queryClient,
      messages,
    ],
  );

  // ---- Regenerate last response ---------------------------------------------
  const handleRegenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.type === 'user');
    if (!lastUserMsg) return;

    // Remove the last assistant message
    setMessages((prev) => {
      const idx = prev.length - 1;
      if (prev[idx]?.type === 'assistant') {
        return prev.slice(0, idx);
      }
      return prev;
    });

    handleSubmit(lastUserMsg.content);
  }, [messages, handleSubmit]);

  // ---- Edit a previous user message -----------------------------------------
  const handleEditMessage = useCallback(
    (messageId: string, newContent: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      // Remove everything from this message onward and re-submit
      setMessages((prev) => prev.slice(0, msgIndex));
      handleSubmit(newContent);
    },
    [messages, handleSubmit],
  );

  // ---- Bookmark toggle -------------------------------------------------------
  const handleToggleBookmark = useCallback(
    async (messageId: string) => {
      const msg = messages.find((m) => m.id === messageId);
      if (!msg || !msg.query_id) {
        toast.error('Cannot bookmark — no query ID available.');
        return;
      }

      try {
        if (msg.isBookmarked) {
          toast.info('Use the bookmarks panel to manage your bookmarks.');
        } else {
          await searchAPI.createBookmark(msg.query_id);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, isBookmarked: true } : m,
            ),
          );
          toast.success('Bookmarked!');
        }
      } catch {
        toast.error('Failed to bookmark this search.');
      }
    },
    [messages],
  );

  // ---- Follow-up click -------------------------------------------------------
  const handleFollowUpClick = useCallback(
    (question: string) => {
      handleSubmit(question);
    },
    [handleSubmit],
  );

  // ---- Clear conversation ----------------------------------------------------
  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setRetryAfter(null);
    toast.success('Conversation cleared.');
  }, []);

  // ---- Form submit / keyboard ------------------------------------------------
  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(inputValue);
    },
    [inputValue, handleSubmit],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(inputValue);
      }
      if (e.key === 'r' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault();
        handleRegenerate();
      }
    },
    [inputValue, handleSubmit, handleRegenerate],
  );

  // ---- Voice transcript handler ----------------------------------------------
  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInputValue(text);
      handleSubmit(text);
    },
    [handleSubmit],
  );

  const handleInterimVoice = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  // ---- Auto-resize textarea --------------------------------------------------
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    },
    [],
  );

  const hasMessages = messages.length > 0;
  const lastMessage = messages[messages.length - 1];
  const canRegenerate = hasMessages && lastMessage?.type === 'assistant' && !isLoading;

  return (
    <div
      className="flex flex-col h-full min-h-[calc(100vh-4rem)] app-atmosphere overflow-hidden"
      role="region"
      aria-label="AI Search Chat"
    >
      {/* Screen-reader live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading && 'Searching the web and generating an answer…'}
        {error && `Error: ${error}`}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 safe-padding py-4 md:py-6" ref={scrollAreaRef}>
        <AnimatePresence mode="wait">
          {!hasMessages ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center py-8 md:py-12"
            >
              <FadeIn delay={0.1}>
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative mb-8 md:mb-10"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-[var(--ocean-deep)] rounded-2xl flex items-center justify-center shadow-[var(--shadow-lg)]">
                    <Search className="text-white w-7 h-7 md:w-9 md:h-9" strokeWidth={2.25} />
                  </div>
                </motion.div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="font-display heading-secondary mb-3 md:mb-4 text-[var(--ink)] max-w-3xl">
                  What do you want to know?
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-muted-foreground text-base md:text-lg max-w-xl mb-8 md:mb-12 leading-relaxed px-4">
                  Ask anything — Atlas searches the web and returns a clear answer with citations.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl w-full px-4">
                  {SUGGESTED_QUERIES.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 + index * 0.08, duration: 0.4 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        variant="outline"
                        className="h-auto py-4 px-4 text-left justify-start bg-[var(--paper)]/80 border-[var(--surface-border)] hover:border-[var(--ocean)]/30 hover:shadow-[var(--shadow-md)] transition-all group w-full rounded-xl"
                        onClick={() => handleSubmit(suggestion.text)}
                        aria-label={`Search: ${suggestion.text}`}
                      >
                        <div
                          className={`p-2.5 rounded-lg ${suggestion.accent} mr-3 shadow-sm shrink-0`}
                        >
                          <suggestion.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium group-hover:text-[var(--ocean-deep)] transition-colors text-left wrap-break-word">
                          {suggestion.text}
                        </span>
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </FadeIn>

              <FadeIn delay={0.6}>
                <div className="flex items-center gap-2 mt-8 text-xs text-muted-foreground">
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send
                    {' · '}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Shift+Enter</kbd> new line
                    {' · '}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+Shift+R</kbd> regenerate
                  </span>
                </div>
              </FadeIn>
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-5xl mx-auto space-y-6 md:space-y-8"
            >
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                  >
                    <MessageBubble
                      message={message}
                      onFollowUpClick={handleFollowUpClick}
                      onEdit={handleEditMessage}
                      onToggleBookmark={handleToggleBookmark}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator (only when waiting before first stream chunk) */}
              <AnimatePresence>
                {isLoading && streamStatus && !messages.some((m) => m.type === 'assistant' && m.isRegenerating && m.content) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-5 mb-8"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[var(--ocean-deep)] flex items-center justify-center shrink-0 shadow-[var(--shadow-md)]">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <Card className="p-6 flex-1 max-w-3xl bg-[var(--paper)]/90 border-[var(--surface-border)] shadow-[var(--shadow-md)] rounded-xl">
                      <div className="space-y-3" role="status" aria-label="Loading answer">
                        <motion.p
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-sm text-muted-foreground flex items-center gap-2.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--ocean)] animate-pulse" />
                          {streamStatus}
                        </motion.p>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="safe-padding pb-3"
          >
            <Alert
              variant="destructive"
              className="bg-[var(--paper)] border-red-200 shadow-[var(--shadow-md)] max-w-5xl mx-auto rounded-xl"
            >
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base flex flex-wrap items-center gap-3">
                <span>
                  {error}
                  {retryAfter !== null && retryAfter > 0 && (
                    <span className="ml-2 font-mono text-sm">(retry in {retryAfter}s)</span>
                  )}
                </span>
                {lastFailedQuery && (retryAfter === null || retryAfter <= 0) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      const q = lastFailedQuery;
                      setMessages((prev) => {
                        const last = prev[prev.length - 1];
                        if (last?.type === 'user' && last.content === q) {
                          return prev.slice(0, -1);
                        }
                        return prev;
                      });
                      setError(null);
                      handleSubmit(q);
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="border-t border-[var(--surface-border)] bg-[var(--paper)]/90 backdrop-blur-md safe-padding py-4 md:py-5"
      >
        <form onSubmit={handleFormSubmit} className="max-w-5xl mx-auto" aria-label="Search form">
          {/* Action bar */}
          {hasMessages && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleClearConversation}
                        className="text-xs text-muted-foreground hover:text-destructive"
                        aria-label="Clear conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Clear
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear conversation</TooltipContent>
                  </Tooltip>

                  {canRegenerate && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRegenerate}
                          className="text-xs text-muted-foreground hover:text-[var(--ocean)]"
                          aria-label="Regenerate last response"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Regenerate
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Regenerate last response (Ctrl+Shift+R)</TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>
              </div>

              <span className="text-xs text-muted-foreground">
                {messages.filter((m) => m.type === 'user').length} message
                {messages.filter((m) => m.type === 'user').length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Search mode selector */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {(
              [
                { mode: 'text' as SearchMode, icon: FileText, label: 'Text' },
                { mode: 'academic' as SearchMode, icon: GraduationCap, label: 'Academic' },
                { mode: 'news' as SearchMode, icon: Newspaper, label: 'News' },
                { mode: 'code' as SearchMode, icon: Code2, label: 'Code' },
                { mode: 'image' as SearchMode, icon: ImageIcon, label: 'Image' },
              ] as const
            ).map(({ mode, icon: MIcon, label }) => (
              <Button
                key={mode}
                type="button"
                variant={searchMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchMode(mode)}
                className={`text-xs rounded-lg ${
                  searchMode === mode
                    ? 'bg-[var(--ocean-deep)] text-white hover:bg-[var(--ocean)]'
                    : 'bg-[var(--paper)] border-[var(--surface-border)]'
                }`}
              >
                <MIcon className="w-3.5 h-3.5 mr-1" />
                {label}
              </Button>
            ))}

            <div className="ml-auto flex items-center gap-1.5">
              <Button
                type="button"
                variant={enableFactCheck ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEnableFactCheck(!enableFactCheck)}
                className={`text-xs rounded-lg ${
                  enableFactCheck
                    ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                    : 'bg-[var(--paper)] border-[var(--surface-border)]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Fact Check
              </Button>
            </div>
          </div>

          {/* Input row */}
          <div className="flex items-end gap-3 md:gap-4">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Ask anything… (Shift+Enter for new line)"
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={isLoading || (retryAfter !== null && retryAfter > 0)}
                rows={1}
                className="min-h-[48px] max-h-[160px] resize-none text-base bg-[var(--paper)] border-[var(--surface-border)] focus:border-[var(--ocean)] transition-all rounded-xl border pr-12"
                aria-label="Search query input"
              />
              <div className="absolute right-2 bottom-2">
                {voiceEnabled && (
                  <VoiceSearchButton
                    onTranscript={handleVoiceTranscript}
                    onInterimTranscript={handleInterimVoice}
                    disabled={isLoading}
                  />
                )}
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim() || (retryAfter !== null && retryAfter > 0)}
                size="lg"
                className="h-12 md:h-14 px-6 md:px-7 bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white text-base font-semibold rounded-xl shadow-[var(--shadow-md)]"
                aria-label="Send search query"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export const ChatBox = memo(ChatBoxInner);
ChatBox.displayName = 'ChatBox';
