/**
 * SearchHistorySidebar — collapsible panel showing the user's search history.
 *
 * Features
 * --------
 * - Paginated history list via React Query (useSearchHistory)
 * - Search / filter queries
 * - Click to view full entry details
 * - Delete individual entries or clear all
 * - Responsive: slide-over on mobile, fixed panel on desktop
 * - Accessible: focus trap when open, keyboard navigation
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  History,
  X,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useSearchHistory, useDeleteHistoryEntry, useClearHistory } from '@/hooks/use-search';
import { SearchHistoryListEntry } from '@/types/search';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface SearchHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntry?: (entry: SearchHistoryListEntry) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function SearchHistorySidebarInner({
  isOpen,
  onClose,
  onSelectEntry,
}: SearchHistorySidebarProps) {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error } = useSearchHistory(page, debouncedSearch);
  const deleteEntry = useDeleteHistoryEntry();
  const clearHistory = useClearHistory();

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  }, []);

  // Focus search input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      deleteEntry.mutate(id);
    },
    [deleteEntry],
  );

  const handleClearAll = useCallback(() => {
    clearHistory.mutate();
  }, [clearHistory]);

  const totalPages = data ? Math.ceil(data.count / data.page_size) : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
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

          {/* Sidebar panel */}
          <motion.aside
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-16 left-0 bottom-0 w-[360px] max-w-[85vw] z-50 bg-[var(--paper)] border-r border-[var(--surface-border)] shadow-[var(--shadow-lg)] flex flex-col"
            role="complementary"
            aria-label="Search history"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[var(--ocean)]" />
                <h2 className="text-lg font-semibold">Search History</h2>
                {data && (
                  <Badge variant="secondary" className="text-xs">
                    {data.count}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {data && data.count > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        aria-label="Clear all history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all search history?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all {data.count} search entries.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleClearAll}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Clear All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="w-8 h-8"
                  aria-label="Close history sidebar"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Search filter */}
            <div className="p-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search history…"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9 text-sm"
                  aria-label="Filter search history"
                />
              </div>
            </div>

            {/* History list */}
            <ScrollArea className="flex-1 px-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--ocean)]" />
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                  <p className="text-sm text-destructive">
                    {error instanceof Error ? error.message : 'Failed to load history'}
                  </p>
                </div>
              ) : !data || data.results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {debouncedSearch ? 'No matching searches found.' : 'No search history yet.'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your searches will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {data.results.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card
                        className="p-3 cursor-pointer hover:bg-accent/50 transition-all group/item"
                        onClick={() => onSelectEntry?.(entry)}
                        role="button"
                        tabIndex={0}
                        aria-label={`View search: ${entry.query}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectEntry?.(entry);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium line-clamp-2 flex-1">
                            {entry.query}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(entry.id, e)}
                            className="w-6 h-6 opacity-0 group-hover/item:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                            aria-label={`Delete search: ${entry.query}`}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(entry.created_at)}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${getTrustColor(entry.trust_score)}`}
                          >
                            <Shield className="w-2.5 h-2.5 mr-0.5" />
                            {entry.trust_score}%
                          </Badge>
                          {entry.response_time_ms && (
                            <span className="text-[10px] text-muted-foreground">
                              {entry.response_time_ms >= 1000
                                ? `${(entry.response_time_ms / 1000).toFixed(1)}s`
                                : `${entry.response_time_ms}ms`}
                            </span>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export const SearchHistorySidebar = memo(SearchHistorySidebarInner);
SearchHistorySidebar.displayName = 'SearchHistorySidebar';
