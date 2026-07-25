/**
 * SettingsDialog — user preferences dialog.
 */

'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings, Loader2, Save, RotateCcw, X,
  Mic, Search, BookOpen, ShieldCheck,
  BellRing, Layers, Hash,
} from 'lucide-react';
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
// Props & Constants
// ---------------------------------------------------------------------------
interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_TYPES = [
  'news', 'academic', 'social', 'government',
  'blog', 'wiki', 'forum', 'video',
] as const;

const SEARCH_MODES = [
  { value: 'text', label: 'Text', icon: Search },
  { value: 'academic', label: 'Academic', icon: BookOpen },
  { value: 'news', label: 'News', icon: Layers },
  { value: 'code', label: 'Code', icon: Hash },
  { value: 'image', label: 'Image', icon: Search },
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
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>(() => prefs ?? DEFAULT_PREFERENCES);
  const [isDirty, setIsDirty] = useState(false);
  const [prevPrefs, setPrevPrefs] = useState<UserPreferences | undefined>(prefs);

  if (prefs !== prevPrefs) {
    setPrevPrefs(prefs);
    if (prefs && !isDirty) {
      setLocalPrefs(prefs);
    }
  }

  const updateLocal = useCallback(<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const toggleSourceType = useCallback((type: string) => {
    setLocalPrefs((prev) => {
      const types = prev.preferred_source_types.includes(type)
        ? prev.preferred_source_types.filter((t) => t !== type)
        : [...prev.preferred_source_types, type];
      return { ...prev, preferred_source_types: types };
    });
    setIsDirty(true);
  }, []);

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

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVars: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-[var(--surface-border)] bg-[var(--paper)] shadow-[var(--shadow-lg)] sm:rounded-xl">
        <div className="relative w-full h-full flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 py-5 border-b border-[var(--surface-border)] sticky top-0 bg-[var(--paper)] z-10">
            <DialogTitle className="flex items-center gap-3 font-display text-2xl text-[var(--ink)]">
              <div className="p-2 rounded-lg bg-[var(--ocean-deep)] text-white shadow-[var(--shadow-sm)]">
                <Settings className="w-5 h-5" />
              </div>
              Search Preferences
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-1">
              Personalize your AI search engine capabilities and interface.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--ocean)]" />
              </div>
            ) : (
              <motion.div
                variants={containerVars}
                initial="hidden"
                animate="show"
                className="space-y-8"
              >
                <motion.div variants={itemVars} className="space-y-6">
                  <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-[var(--surface-border)] transition-all hover:bg-muted/40">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[var(--ocean)]" /> Maximum Sources
                        </Label>
                        <span className="px-2.5 py-0.5 rounded-lg bg-[var(--sea-light)] text-[var(--ocean-deep)] text-sm font-bold">
                          {localPrefs.default_max_sources}
                        </span>
                      </div>
                      <Slider
                        value={[localPrefs.default_max_sources]}
                        onValueChange={([v]) => updateLocal('default_max_sources', v)}
                        min={1}
                        max={15}
                        step={1}
                        className="py-2"
                      />
                      <p className="text-xs text-muted-foreground">Number of web sources to include per search (1–15)</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-muted/30 p-5 rounded-xl border border-[var(--surface-border)] transition-all hover:bg-muted/40">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Minimum Trust Score
                        </Label>
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-sm font-bold">
                          {localPrefs.min_trust_score}%
                        </span>
                      </div>
                      <Slider
                        value={[localPrefs.min_trust_score]}
                        onValueChange={([v]) => updateLocal('min_trust_score', v)}
                        min={0}
                        max={100}
                        step={5}
                        className="py-2"
                      />
                      <p className="text-xs text-muted-foreground">Only show results above this trust threshold</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVars} className="grid sm:grid-cols-2 gap-4">
                  {[
                    { id: 'enable_voice_search', label: 'Voice Search', desc: 'Enable microphone input', icon: Mic, color: 'text-[var(--ocean)]' },
                    { id: 'enable_auto_followups', label: 'Auto Follow-ups', desc: 'Show suggested questions', icon: Search, color: 'text-[var(--ocean-deep)]' },
                    { id: 'enable_fact_checking', label: 'Fact Checking', desc: 'Auto-verify search claims', icon: ShieldCheck, color: 'text-emerald-600' },
                    { id: 'enable_topic_alerts', label: 'Topic Alerts', desc: 'Get updates on your interests', icon: BellRing, color: 'text-amber-600' },
                  ].map((feature) => (
                    <label
                      key={feature.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[var(--surface-border)] bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <div className="flex gap-3">
                        <feature.icon className={`w-5 h-5 mt-0.5 ${feature.color}`} />
                        <div className="space-y-1">
                          <span className="text-sm font-semibold select-none">{feature.label}</span>
                          <p className="text-xs text-muted-foreground leading-tight">{feature.desc}</p>
                        </div>
                      </div>
                      <Switch
                        checked={localPrefs[feature.id as keyof UserPreferences] as boolean}
                        onCheckedChange={(v) => updateLocal(feature.id as keyof UserPreferences, v)}
                      />
                    </label>
                  ))}
                </motion.div>

                <motion.div variants={itemVars} className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Default Search Mode</Label>
                    <Select
                      value={localPrefs.default_search_mode}
                      onValueChange={(v) => updateLocal('default_search_mode', v as UserPreferences['default_search_mode'])}
                    >
                      <SelectTrigger className="w-full h-12 bg-background/50 rounded-xl border-[var(--surface-border)]">
                        <SelectValue placeholder="Select search mode" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl overflow-hidden">
                        {SEARCH_MODES.map((mode) => (
                          <SelectItem key={mode.value} value={mode.value} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <mode.icon className="w-4 h-4 text-[var(--ocean)]" />
                              <span className="font-medium">{mode.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Preferred Source Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {SOURCE_TYPES.map((type) => {
                        const isSelected = localPrefs.preferred_source_types.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize border ${
                              isSelected
                                ? 'bg-[var(--ocean-deep)] text-white border-transparent shadow-[var(--shadow-sm)]'
                                : 'bg-background hover:bg-muted border-[var(--surface-border)] text-foreground'
                            }`}
                            onClick={() => toggleSourceType(type)}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3 p-5 rounded-xl bg-[var(--sea-light)]/30 border border-[var(--surface-border)]">
                    <Label className="text-base font-semibold text-[var(--ocean-deep)]">Your Interests</Label>
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence>
                        {(localPrefs.interests ?? []).map((interest) => (
                          <motion.div
                            key={interest}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                          >
                            <Badge
                              variant="default"
                              className="bg-[var(--sea-light)] hover:bg-[var(--sea-light)]/80 text-[var(--ocean-deep)] cursor-pointer capitalize gap-1 py-1 px-3 border border-[var(--surface-border)] rounded-lg"
                              onClick={() => updateLocal('interests', localPrefs.interests.filter((i) => i !== interest))}
                            >
                              {interest}
                              <X className="w-3 h-3 hover:text-red-500 transition-colors" />
                            </Badge>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <div className="relative group">
                      <Input
                        placeholder="Type a topic and press Enter..."
                        className="h-11 bg-background/80 border-[var(--surface-border)] focus-visible:ring-[var(--ocean)]/40 rounded-xl"
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
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        Press Enter ↵
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>

          <div className="p-6 border-t border-[var(--surface-border)] bg-[var(--paper)] sticky bottom-0 z-10">
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between w-full gap-3 sm:gap-0">
              <Button
                variant="ghost"
                onClick={handleReset}
                disabled={updatePrefs.isPending}
                className="w-full sm:w-auto h-11 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Defaults
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={updatePrefs.isPending}
                  className="w-full sm:w-auto h-11 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || updatePrefs.isPending}
                  className="w-full sm:w-auto h-11 px-8 rounded-xl bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white shadow-[var(--shadow-sm)] transition-all font-semibold"
                >
                  {updatePrefs.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const SettingsDialog = memo(SettingsDialogInner);
SettingsDialog.displayName = 'SettingsDialog';
