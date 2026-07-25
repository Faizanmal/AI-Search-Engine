'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Sparkles, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Lightweight tag shape used only within this component. */
interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface TagInputProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
  availableTags?: Tag[];
  className?: string;
}

const TAG_COLORS = [
  '#176b86', // ocean
  '#1f8a5c', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#0e4f66', // ocean deep
  '#f05a2b', // signal
  '#14b8a6', // teal
  '#243447', // ink soft
];

export function TagInput({ selectedTags, onChange, availableTags = [], className }: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [newTagName, setNewTagName] = React.useState('');
  const [localTags, setLocalTags] = React.useState<Tag[]>([]);
  const [isFocused, setIsFocused] = React.useState(false);

  const tags = React.useMemo(() => {
    return [...availableTags, ...localTags];
  }, [availableTags, localTags]);

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    try {
      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const newTag: Tag = {
        id: Math.random().toString(36).substring(2, 9),
        name: newTagName.trim(),
        color,
      };
      setLocalTags((prev) => [...prev, newTag]);
      onChange([...selectedTags, newTag]);
      setNewTagName('');
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleToggleTag = (tag: Tag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    if (isSelected) {
      onChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTags.filter((t) => t.id !== tagId));
  };

  return (
    <div className={cn('space-y-3 w-full', className)}>
      <div
        className={cn(
          'min-h-12 p-2 flex flex-wrap gap-2 items-center rounded-xl border bg-background/50 backdrop-blur-md transition-all duration-300',
          isFocused ? 'ring-2 ring-[var(--ocean)]/40 border-[var(--ocean)]/40 shadow-[var(--shadow-sm)]' : 'border-border/50 hover:border-[var(--ocean)]/30'
        )}
      >
        <AnimatePresence>
          {selectedTags.length === 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-2 text-sm text-muted-foreground italic flex items-center gap-1.5"
            >
              <TagIcon className="w-3.5 h-3.5" /> No tags selected
            </motion.span>
          )}

          {selectedTags.map((tag) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Badge
                variant="outline"
                className="group relative overflow-hidden gap-1.5 px-3 py-1 font-medium bg-background text-foreground transition-all hover:pr-7 shadow-sm border-border/80"
                style={{
                  background: tag.color ? `${tag.color}15` : undefined,
                  borderColor: tag.color ? `${tag.color}40` : undefined,
                  color: tag.color || undefined,
                }}
              >
                {tag.color && (
                  <span
                    className="absolute inset-0 opacity-10"
                    style={{ background: `linear-gradient(45deg, transparent, ${tag.color}, transparent)` }}
                  />
                )}
                {tag.name}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag.id);
                  }}
                  className="absolute right-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive flex items-center justify-center p-0.5 rounded-full hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>

        <Popover open={open} onOpenChange={(val) => { setOpen(val); setIsFocused(val); }}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 gap-1.5 rounded-full font-medium ml-auto transition-all duration-300",
                open ? "bg-[var(--sea-light)] text-[var(--ocean-deep)]" : "hover:bg-[var(--sea-light)]/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Manage Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0 overflow-hidden rounded-xl border border-[var(--surface-border)] shadow-[var(--shadow-lg)] bg-[var(--paper)]"
            align="end"
            sideOffset={8}
          >
            <div className="absolute inset-0 bg-[var(--ocean)]/5 pointer-events-none" />
            
            <div className="relative p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-[var(--ocean)]" />
                  <h4 className="font-semibold text-sm tracking-tight text-[var(--ink)]">Select Existing Tags</h4>
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {tags.length === 0 ? (
                    <div className="w-full py-4 text-center text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border/50">
                      No tags created yet.
                    </div>
                  ) : (
                    tags.map((tag: Tag) => {
                      const isSelected = selectedTags.some((t) => t.id === tag.id);
                      return (
                        <motion.div
                          key={tag.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Badge
                            variant={isSelected ? 'default' : 'outline'}
                            className="cursor-pointer transition-all duration-200 shadow-sm font-medium px-3 py-1"
                            style={
                              tag.color
                                ? isSelected
                                  ? { backgroundColor: tag.color, borderColor: tag.color, color: '#ffffff', boxShadow: `0 4px 10px ${tag.color}40` }
                                  : { borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}10` }
                                : undefined
                            }
                            onClick={() => handleToggleTag(tag)}
                          >
                            {tag.name}
                          </Badge>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-border/50 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h4 className="font-semibold text-sm tracking-tight text-foreground">Create New Tag</h4>
                </div>
                <div className="flex gap-2 relative">
                  <Input
                    placeholder="E.g., urgent, research..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateTag();
                      }
                    }}
                    className="flex-1 h-9 bg-background/50 border-border/60 focus:ring-[var(--ocean)]/40 rounded-lg text-sm transition-all"
                  />
                  <Button
                    size="sm"
                    className="h-9 px-4 bg-[var(--ocean-deep)] hover:bg-[var(--ocean)] text-white shadow-[var(--shadow-sm)] transition-all rounded-lg font-medium"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
