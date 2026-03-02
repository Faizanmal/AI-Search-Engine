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
} from 'lucide-react';
import { CitationCard } from './CitationCard';
import { TrustMeter } from './TrustMeter';
import { FollowUps } from './FollowUps';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
          className={`shrink-0 w-12 h-12 ${
            isUser
              ? 'bg-linear-to-br from-blue-500 to-cyan-500'
              : 'bg-linear-to-br from-purple-500 to-pink-500'
          } shadow-xl`}
        >
          <AvatarFallback className="bg-transparent">
            {isUser ? (
              <User className="w-5 h-5 text-white" />
            ) : (
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
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
              <Card className="p-4 bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800 shadow-xl rounded-2xl">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    aria-label="Save edit and re-search"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Save & Search
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-5 bg-linear-to-br from-blue-500 to-cyan-500 text-white border-0 shadow-xl hover:shadow-2xl transition-shadow rounded-2xl relative">
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
              <Card className="p-8 glass border-white/30 hover:shadow-2xl transition-all rounded-2xl relative">
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
                  className="prose prose-base dark:prose-invert max-w-none prose-headings:text-purple-900 dark:prose-headings:text-purple-300 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-purple-600 dark:prose-a:text-purple-400 prose-strong:text-purple-800 dark:prose-strong:text-purple-200"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                      h2: ({ ...props }) => <h2 className="text-xl font-semibold mb-3" {...props} />,
                      h3: ({ ...props }) => <h3 className="text-lg font-medium mb-2" {...props} />,
                      p: ({ ...props }) => <p className="mb-3 leading-relaxed" {...props} />,
                      ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                      ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                      code: ({
                        inline,
                        ...props
                      }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
                        inline ? (
                          <code className="bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                        ) : (
                          <code className="block bg-gray-100 dark:bg-gray-900 p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono" {...props} />
                        ),
                      a: ({ ...props }) => (
                        <a
                          className="text-purple-600 dark:text-purple-400 hover:underline font-medium transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </motion.div>

                {/* Response time */}
                {message.response_time_ms != null && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Response time: {formatResponseTime(message.response_time_ms)}</span>
                  </div>
                )}
              </Card>
            </motion.div>

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
