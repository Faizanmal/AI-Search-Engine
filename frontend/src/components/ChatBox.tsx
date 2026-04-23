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
} from 'lucide-react';
import { searchAPI, RateLimitError } from '@/lib/search-api';
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
  { text: 'What is quantum computing?', icon: Sparkles, gradient: 'from-purple-500 to-pink-500' },
  { text: 'Explain climate change causes', icon: Zap, gradient: 'from-blue-500 to-cyan-500' },
  { text: 'How does machine learning work?', icon: Sparkles, gradient: 'from-green-500 to-emerald-500' },
  { text: 'Latest developments in AI', icon: Zap, gradient: 'from-orange-500 to-red-500' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ChatBoxInner({}: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [enableFactCheck, setEnableFactCheck] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      const userMessage: Message = {
        id: crypto.randomUUID(),
        type: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);
      setError(null);
      setRetryAfter(null);

      try {
        const response = await searchAPI.query(trimmed, searchMode, enableFactCheck);

        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          type: 'assistant',
          content: response.answer,
          sources: response.sources,
          trust_score: response.trust_score,
          followups: response.followups,
          timestamp: new Date(),
          query_id: response.query_id,
          response_time_ms: response.response_time_ms,
          isBookmarked: false,
          search_mode: response.search_mode,
          tags: response.tags,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if (err instanceof RateLimitError) {
          setRetryAfter(err.retryAfter ?? 60);
          setError(`Rate limit exceeded. Please wait ${err.retryAfter ?? 60}s before trying again.`);
        } else {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        }
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [isLoading, searchMode, enableFactCheck],
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
      className="flex flex-col h-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950 dark:to-purple-950 overflow-hidden"
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
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative mb-8 md:mb-10"
                >
                  <div className="w-20 h-20 md:w-28 md:h-28 bg-linear-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
                    <Sparkles className="text-white w-10 h-10 md:w-14 md:h-14" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 bg-linear-to-br from-purple-500 to-blue-500 rounded-3xl -z-10"
                  />
                </motion.div>
              </FadeIn>

              <FadeIn delay={0.2}>
                <h1 className="heading-secondary mb-4 md:mb-6 bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent max-w-4xl">
                  AI Search Assistant
                </h1>
              </FadeIn>

              <FadeIn delay={0.3}>
                <p className="text-muted-foreground text-base md:text-xl max-w-2xl mb-8 md:mb-16 leading-relaxed px-4">
                  Ask me anything and I&apos;ll search the web to provide you with accurate,
                  well-researched answers with citations.
                </p>
              </FadeIn>

              <FadeIn delay={0.4}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 lg:gap-6 max-w-4xl w-full px-4">
                  {SUGGESTED_QUERIES.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.5 }}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        variant="outline"
                        className="h-auto py-4 md:py-5 px-4 md:px-6 text-left justify-start glass border-white/30 hover:shadow-xl transition-all group w-full rounded-xl"
                        onClick={() => handleSubmit(suggestion.text)}
                        aria-label={`Search: ${suggestion.text}`}
                      >
                        <div
                          className={`p-2 md:p-3 rounded-xl bg-linear-to-br ${suggestion.gradient} mr-3 md:mr-4 shadow-lg shrink-0`}
                        >
                          <suggestion.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </div>
                        <span className="text-sm md:text-sm font-semibold group-hover:text-purple-600 transition-colors text-left wrap-break-word">
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

              {/* Loading indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-5 mb-8"
                  >
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 shadow-lg">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                    <Card className="p-8 flex-1 max-w-3xl glass border-white/30 shadow-lg">
                      <div className="space-y-3" role="status" aria-label="Loading answer">
                        {['Searching the web…', 'Analyzing sources…', 'Generating answer…'].map(
                          (text, i) => (
                            <motion.p
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.3, duration: 0.3 }}
                              className="text-sm text-muted-foreground flex items-center gap-2"
                            >
                              <motion.span
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                                className="w-2 h-2 rounded-full bg-purple-500"
                              />
                              {text}
                            </motion.p>
                          ),
                        )}
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
              className="glass border-red-300 dark:border-red-800 shadow-lg max-w-5xl mx-auto"
            >
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-base">
                {error}
                {retryAfter !== null && retryAfter > 0 && (
                  <span className="ml-2 font-mono text-sm">(retry in {retryAfter}s)</span>
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
        className="border-t glass-strong backdrop-blur-xl safe-padding py-4 md:py-6"
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
                          className="text-xs text-muted-foreground hover:text-purple-600"
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
                className={`text-xs rounded-full ${
                  searchMode === mode
                    ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white'
                    : ''
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
                className={`text-xs rounded-full ${
                  enableFactCheck
                    ? 'bg-linear-to-r from-green-600 to-emerald-600 text-white'
                    : ''
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
                className="min-h-[48px] max-h-[160px] resize-none text-base glass border-white/30 focus:border-purple-400 transition-all rounded-xl border-2 pr-12"
                aria-label="Search query input"
              />
              <div className="absolute right-2 bottom-2">
                <VoiceSearchButton
                  onTranscript={handleVoiceTranscript}
                  onInterimTranscript={handleInterimVoice}
                  disabled={isLoading}
                />
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                type="submit"
                disabled={isLoading || !inputValue.trim() || (retryAfter !== null && retryAfter > 0)}
                size="lg"
                className="h-12 md:h-14 px-6 md:px-8 btn-gradient-primary text-base font-semibold rounded-xl"
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
