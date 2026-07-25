/**
 * MessageBubble — renders a single user or assistant message in the chat.
 *
 * Features
 * --------
 * - Markdown rendering with syntax highlighting (react-markdown + remark-gfm)
 * - Inline edit for user messages (pencil icon → textarea → save/cancel)
 * - Copy-to-clipboard for assistant answers
 * - Bookmark toggle with visual indicator
 * - Share button (Web Share API with clipboard fallback)
 * - Response-time badge for assistant messages
 * - Trust meter, citations, follow-ups for assistant messages
 * - Accessible ARIA labels throughout
 */

'use client';

import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Message } from '@/types/search';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Sparkles,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Share2,
  Pencil,
  X,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { CitationCard } from './CitationCard';
import { TrustMeter } from './TrustMeter';
import { FollowUps } from './FollowUps';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface MessageBubbleProps {
  message: Message;
  onFollowUpClick?: (question: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onToggleBookmark?: (messageId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatResponseTime(ms?: number): string | null {
  if (!ms) return null;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

const VERDICT_STYLES: Record<string, string> = {
  true: 'bg-emerald-100 text-emerald-800',
  mostly_true: 'bg-emerald-50 text-emerald-700',
  mixed: 'bg-amber-100 text-amber-800',
  mostly_false: 'bg-orange-100 text-orange-800',
  false: 'bg-red-100 text-red-800',
  unverifiable: 'bg-slate-100 text-slate-700',
};

function renderTextWithCitations(text: string): React.ReactNode[] {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return <React.Fragment key={i}>{part}</React.Fragment>;
    const n = match[1];
    return (
      <a
        key={i}
        href={`#source-${n}`}
        className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.5 text-[11px] font-semibold rounded-md bg-[var(--sea-light)] text-[var(--ocean-deep)] hover:bg-[var(--ocean)] hover:text-white no-underline align-super"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(`source-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
      >
        {n}
      </a>
    );
  });
}

function markdownComponents(): Components {
  return {
    h1: ({ ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
    h2: ({ ...props }) => <h2 className="text-xl font-semibold mb-3" {...props} />,
    h3: ({ ...props }) => <h3 className="text-lg font-medium mb-2" {...props} />,
    p: ({ children, ...props }) => (
      <p className="mb-3 leading-relaxed" {...props}>
        {React.Children.map(children, (child) =>
          typeof child === 'string' ? renderTextWithCitations(child) : child,
        )}
      </p>
    ),
    li: ({ children, ...props }) => (
      <li {...props}>
        {React.Children.map(children, (child) =>
          typeof child === 'string' ? renderTextWithCitations(child) : child,
        )}
      </li>
    ),
    ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
    ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
    code: ({
      inline,
      ...props
    }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
      inline ? (
        <code className="bg-[var(--sea-light)]/60 text-[var(--ocean-deep)] px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
      ) : (
        <code className="block bg-gray-100 dark:bg-gray-900 p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono" {...props} />
      ),
    a: ({ ...props }) => (
      <a
        className="text-[var(--ocean)] hover:underline font-medium transition-colors"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    ),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function MessageBubbleInner({
  message,
  onFollowUpClick,
  onEdit,
  onToggleBookmark,
}: MessageBubbleProps) {
  const isUser = message.type === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  // ---- Copy to clipboard ----------------------------------------------------
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [message.content]);

  // ---- Share ----------------------------------------------------------------
  const handleShare = useCallback(async () => {
    const shareData: ShareData = {
      title: 'AI Search Result',
      text: message.content.slice(0, 200),
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${message.content}\n\n${window.location.href}`,
        );
        toast.success('Link copied to clipboard');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error('Failed to share');
    }
  }, [message.content]);

  // ---- Edit -----------------------------------------------------------------
  const handleSaveEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error('Message cannot be empty.');
      return;
    }
    onEdit?.(message.id, trimmed);
    setIsEditing(false);
  }, [editValue, message.id, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditValue(message.content);
    setIsEditing(false);
  }, [message.content]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEdit();
      }
      if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`flex gap-5 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-8 group`}
      role="article"
      aria-label={`${isUser ? 'Your' : 'Assistant'} message`}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <Avatar
          className={`shrink-0 w-10 h-10 rounded-xl ${
            isUser
              ? 'bg-[var(--ink)]'
              : 'bg-[var(--ocean-deep)]'
          } shadow-[var(--shadow-sm)]`}
        >
          <AvatarFallback className="bg-transparent rounded-xl">
            {isUser ? (
              <User className="w-4.5 h-4.5 text-white" />
            ) : (
              <Sparkles className="w-4.5 h-4.5 text-white" />
            )}
          </AvatarFallback>
        </Avatar>
      </motion.div>

      {/* Message Content */}
      <div className="flex-1 max-w-3xl">
        {isUser ? (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.01 }}
          >
            {isEditing ? (
              <Card className="p-4 bg-[var(--sea-light)]/40 border-[var(--ocean)]/20 shadow-[var(--shadow-md)] rounded-xl">
                <Textarea
                  ref={editRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  rows={2}
                  className="resize-none text-base mb-3"
                  aria-label="Edit your message"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    aria-label="Cancel edit"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="bg-[var(--ocean-deep)] hover:bg-[var(--ocean)] text-white"
                    aria-label="Save edit and re-search"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Save & Search
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-4 md:p-5 bg-[var(--ink)] text-white border-0 shadow-[var(--shadow-md)] rounded-xl relative">
                <p className="text-base font-medium leading-relaxed pr-8">
                  {message.content}
                </p>
                {onEdit && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditing(true)}
                          className="absolute top-3 right-3 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-white/70 hover:text-white hover:bg-white/20"
                          aria-label="Edit message"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit & re-search</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Card>
            )}
          </motion.div>
        ) : (
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              <Card className="p-6 md:p-7 bg-[var(--paper)]/95 border-[var(--surface-border)] hover:shadow-[var(--shadow-md)] transition-all rounded-xl relative">
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopy}
                          className="w-8 h-8 text-muted-foreground hover:text-foreground"
                          aria-label={isCopied ? 'Copied' : 'Copy answer'}
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isCopied ? 'Copied!' : 'Copy answer'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleShare}
                          className="w-8 h-8 text-muted-foreground hover:text-foreground"
                          aria-label="Share"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share</TooltipContent>
                    </Tooltip>

                    {onToggleBookmark && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleBookmark(message.id)}
                            className={`w-8 h-8 ${
                              message.isBookmarked
                                ? 'text-yellow-500 hover:text-yellow-600'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-label={message.isBookmarked ? 'Bookmarked' : 'Bookmark'}
                            aria-pressed={message.isBookmarked}
                          >
                            {message.isBookmarked ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {message.isBookmarked ? 'Bookmarked' : 'Bookmark'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>

                {/* Markdown answer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="prose prose-base dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-[var(--ink)] dark:prose-headings:text-[var(--ink)] prose-p:text-foreground/85 prose-a:text-[var(--ocean)] prose-strong:text-[var(--ink)]"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents()}
                  >
                    {message.content}
                  </ReactMarkdown>
                </motion.div>

                {message.degraded && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      Degraded response
                      {message.degraded_reason ? ` (${message.degraded_reason})` : ''}.
                      Configure API keys for full search quality.
                    </span>
                  </div>
                )}

                {/* Response time */}
                {message.response_time_ms != null && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Response time: {formatResponseTime(message.response_time_ms)}</span>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Fact check */}
            {message.fact_check_result?.claims && message.fact_check_result.claims.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
              >
                <Card className="p-4 border-[var(--surface-border)] bg-[var(--paper)]/90 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-[var(--ocean)]" />
                    <h3 className="text-sm font-semibold">Fact check</h3>
                    {message.fact_check_result.overall_verdict && (
                      <Badge
                        className={`text-[10px] border-0 ${
                          VERDICT_STYLES[message.fact_check_result.overall_verdict] ||
                          VERDICT_STYLES.unverifiable
                        }`}
                      >
                        {message.fact_check_result.overall_verdict.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {message.fact_check_result.claims.map((claim, idx) => (
                      <li key={idx} className="text-sm border-t border-[var(--surface-border)] pt-3 first:border-0 first:pt-0">
                        <div className="flex items-start gap-2 mb-1">
                          <Badge
                            className={`text-[10px] shrink-0 border-0 ${
                              VERDICT_STYLES[claim.verdict] || VERDICT_STYLES.unverifiable
                            }`}
                          >
                            {claim.verdict.replace(/_/g, ' ')}
                          </Badge>
                          <p className="font-medium text-[var(--ink)]">{claim.claim}</p>
                        </div>
                        {claim.explanation && (
                          <p className="text-xs text-muted-foreground pl-1">{claim.explanation}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}

            {/* Trust Score */}
            {message.trust_score !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <TrustMeter score={message.trust_score} />
              </motion.div>
            )}

            {/* Sources */}
            {message.sources && message.sources.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
              >
                <CitationCard sources={message.sources} />
              </motion.div>
            )}

            {/* Follow-up Questions */}
            {message.followups && message.followups.length > 0 && onFollowUpClick && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
              >
                <FollowUps questions={message.followups} onQuestionClick={onFollowUpClick} />
              </motion.div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
          className="text-sm text-muted-foreground mt-3 font-medium"
        >
          {message.timestamp.toLocaleTimeString()}
        </motion.p>
      </div>
    </motion.div>
  );
}

export const MessageBubble = memo(MessageBubbleInner);
MessageBubble.displayName = 'MessageBubble';
