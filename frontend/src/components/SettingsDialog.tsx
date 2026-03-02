/**
 * SettingsDialog — user preferences dialog.
 *
 * Features
 * --------
 * - Max sources slider
 * - Minimum trust score slider
 * - Voice search toggle
 * - Auto follow-ups toggle
 * - Preferred source types (multi-select chips)
 * - Optimistic updates via React Query
 */

'use client';

import React, { memo, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, Loader2, Save, RotateCcw, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { usePreferences, useUpdatePreferences } from '@/hooks/use-search';
import { UserPreferences } from '@/types/search';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Available source types
// ---------------------------------------------------------------------------
const SOURCE_TYPES = [
  'news',
  'academic',
  'social',
  'government',
  'blog',
  'wiki',
  'forum',
  'video',
] as const;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const SEARCH_MODES = [
  { value: 'text', label: 'Text' },
  { value: 'academic', label: 'Academic' },
  { value: 'news', label: 'News' },
  { value: 'code', label: 'Code' },
  { value: 'image', label: 'Image' },
] as const;

const DEFAULT_PREFERENCES: UserPreferences = {
  default_max_sources: 5,
  min_trust_score: 0,
  preferred_source_types: [],
  enable_voice_search: true,
  enable_auto_followups: true,
  enable_fact_checking: false,
  default_search_mode: 'text',
  enable_topic_alerts: false,
  interests: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function SettingsDialogInner({ open, onOpenChange }: SettingsDialogProps) {
  const { data: prefs, isLoading } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(
    () => prefs ?? DEFAULT_PREFERENCES,
  );
  const [isDirty, setIsDirty] = useState(false);

  // Sync from server when prefs load/change (skip if user is editing)
  useEffect(() => {
    if (prefs && !isDirty) {
      setLocalPrefs(prefs);
    }
  }, [prefs]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateLocal = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setLocalPrefs((prev) => ({ ...prev, [key]: value }));
      setIsDirty(true);
    },
    [],
  );

  const toggleSourceType = useCallback(
    (type: string) => {
      setLocalPrefs((prev) => {
        const types = prev.preferred_source_types.includes(type)
          ? prev.preferred_source_types.filter((t) => t !== type)
          : [...prev.preferred_source_types, type];
        return { ...prev, preferred_source_types: types };
      });
      setIsDirty(true);
    },
    [],
  );

  const handleSave = useCallback(() => {
    updatePrefs.mutate(localPrefs, {
      onSuccess: () => {
        setIsDirty(false);
        onOpenChange(false);
      },
    });
  }, [localPrefs, updatePrefs, onOpenChange]);

  const handleReset = useCallback(() => {
    setLocalPrefs(DEFAULT_PREFERENCES);
    setIsDirty(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Search Preferences
          </DialogTitle>
          <DialogDescription>
            Customize how the AI search engine works for you.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Max sources */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Maximum Sources</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {localPrefs.default_max_sources}
                </span>
              </div>
              <Slider
                value={[localPrefs.default_max_sources]}
                onValueChange={([v]) => updateLocal('default_max_sources', v)}
                min={1}
                max={15}
                step={1}
                aria-label="Maximum number of sources"
              />
              <p className="text-xs text-muted-foreground">
                Number of web sources to include per search (1–15)
              </p>
            </div>

            {/* Min trust score */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Minimum Trust Score</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {localPrefs.min_trust_score}%
                </span>
              </div>
              <Slider
                value={[localPrefs.min_trust_score]}
                onValueChange={([v]) => updateLocal('min_trust_score', v)}
                min={0}
                max={100}
                step={5}
                aria-label="Minimum trust score"
              />
              <p className="text-xs text-muted-foreground">
                Only show results above this trust threshold
              </p>
            </div>

            {/* Voice search toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Voice Search</Label>
                <p className="text-xs text-muted-foreground">Enable microphone input</p>
              </div>
              <Switch
                checked={localPrefs.enable_voice_search}
                onCheckedChange={(v) => updateLocal('enable_voice_search', v)}
                aria-label="Enable voice search"
              />
            </div>

            {/* Auto follow-ups toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Follow-ups</Label>
                <p className="text-xs text-muted-foreground">
                  Show suggested follow-up questions
                </p>
              </div>
              <Switch
                checked={localPrefs.enable_auto_followups}
                onCheckedChange={(v) => updateLocal('enable_auto_followups', v)}
                aria-label="Enable auto follow-up questions"
              />
            </div>

            {/* Fact checking toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Fact Checking</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically verify claims in search results
                </p>
              </div>
              <Switch
                checked={localPrefs.enable_fact_checking}
                onCheckedChange={(v) => updateLocal('enable_fact_checking', v)}
                aria-label="Enable fact checking"
              />
            </div>

            {/* Default search mode */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Default Search Mode</Label>
              </div>
              <Select
                value={localPrefs.default_search_mode}
                onValueChange={(v) => updateLocal('default_search_mode', v as UserPreferences['default_search_mode'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select search mode" />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose the default mode for new searches
              </p>
            </div>

            {/* Topic alerts toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Topic Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when topics matching your interests trend
                </p>
              </div>
              <Switch
                checked={localPrefs.enable_topic_alerts}
                onCheckedChange={(v) => updateLocal('enable_topic_alerts', v)}
                aria-label="Enable topic alerts"
              />
            </div>

            {/* Interests (tag-style chips + text input) */}
            <div className="space-y-3">
              <Label>Interests</Label>
              <div className="flex flex-wrap gap-2">
                {(localPrefs.interests ?? []).map((interest) => (
                  <Badge
                    key={interest}
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer capitalize"
                    onClick={() =>
                      updateLocal(
                        'interests',
                        localPrefs.interests.filter((i) => i !== interest),
                      )
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        updateLocal(
                          'interests',
                          localPrefs.interests.filter((i) => i !== interest),
                        );
                      }
                    }}
                  >
                    {interest}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Type an interest and press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim().toLowerCase();
                    if (value && !(localPrefs.interests ?? []).includes(value)) {
                      updateLocal('interests', [...(localPrefs.interests ?? []), value]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {(localPrefs.interests ?? []).length === 0
                  ? 'No interests added yet'
                  : `${localPrefs.interests.length} interest(s) — click to remove`}
              </p>
            </div>

            {/* Preferred source types */}
            <div className="space-y-3">
              <Label>Preferred Source Types</Label>
              <div className="flex flex-wrap gap-2">
                {SOURCE_TYPES.map((type) => {
                  const isSelected = localPrefs.preferred_source_types.includes(type);
                  return (
                    <Badge
                      key={type}
                      variant={isSelected ? 'default' : 'outline'}
                      className={`cursor-pointer capitalize transition-all ${
                        isSelected
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'hover:bg-purple-50 dark:hover:bg-purple-950/20'
                      }`}
                      onClick={() => toggleSourceType(type)}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSourceType(type);
                        }
                      }}
                    >
                      {type}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {localPrefs.preferred_source_types.length === 0
                  ? 'No preference — all source types will be used'
                  : `${localPrefs.preferred_source_types.length} type(s) selected`}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={updatePrefs.isPending}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updatePrefs.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || updatePrefs.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {updatePrefs.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const SettingsDialog = memo(SettingsDialogInner);
SettingsDialog.displayName = 'SettingsDialog';
