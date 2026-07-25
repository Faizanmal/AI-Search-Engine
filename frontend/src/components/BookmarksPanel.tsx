/**
 * BookmarksPanel — slide-over panel showing saved bookmarks.
 *
 * Features
 * --------
 * - Lists bookmarks with query, trust score, and date
 * - Delete individual bookmarks
 * - Click to navigate/view full entry
 * - Accessible keyboard navigation
 */

'use client';

import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookmarkCheck,
  X,
  Trash2,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
  Bookmark,
} from 'lucide-react';
import { useBookmarks, useDeleteBookmark } from '@/hooks/use-search';
import { BookmarkEntry } from '@/types/search';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface BookmarksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBookmark?: (bookmark: BookmarkEntry) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function BookmarksPanelInner({ isOpen, onClose, onSelectBookmark }: BookmarksPanelProps) {
  const { data: bookmarks, isLoading, isError, error } = useBookmarks();
  const deleteBookmark = useDeleteBookmark();

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteBookmark.mutate(id);
    },
    [deleteBookmark],
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTrustColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-16 right-0 bottom-0 w-[360px] max-w-[85vw] z-50 bg-[var(--paper)] border-l border-[var(--surface-border)] shadow-[var(--shadow-lg)] flex flex-col"
            role="complementary"
            aria-label="Bookmarks"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-[var(--ocean)]" />
                <h2 className="text-lg font-semibold">Bookmarks</h2>
                {bookmarks && (
                  <Badge variant="secondary" className="text-xs">
                    {bookmarks.length}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8"
                aria-label="Close bookmarks panel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Bookmark list */}
            <ScrollArea className="flex-1 px-4 py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--ocean)]" />
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                  <p className="text-sm text-destructive">
                    {error instanceof Error ? error.message : 'Failed to load bookmarks'}
                  </p>
                </div>
              ) : !bookmarks || bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bookmark className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">No bookmarks yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bookmark search results to save them here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {bookmarks.map((bookmark) => (
                    <motion.div
                      key={bookmark.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-all group/item"
                        onClick={() => onSelectBookmark?.(bookmark)}
                        role="button"
                        tabIndex={0}
                        aria-label={`View bookmarked search: ${bookmark.search_query.query}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectBookmark?.(bookmark);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">
                              {bookmark.search_query.query}
                            </p>
                            {bookmark.note && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                                {bookmark.note}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(bookmark.id, e)}
                            className="w-6 h-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                            aria-label={`Delete bookmark: ${bookmark.search_query.query}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(bookmark.created_at)}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${getTrustColor(bookmark.search_query.trust_score)}`}
                          >
                            <Shield className="w-2.5 h-2.5 mr-0.5" />
                            {bookmark.search_query.trust_score}%
                          </Badge>
                        </div>

                        {/* Preview of answer */}
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {bookmark.search_query.answer}
                        </p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export const BookmarksPanel = memo(BookmarksPanelInner);
BookmarksPanel.displayName = 'BookmarksPanel';
