'use client';

import React from 'react';
import { Source } from '@/types/search';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText } from 'lucide-react';

interface CitationCardProps {
  sources: Source[];
}

export function CitationCard({ sources }: CitationCardProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  const getDomain = (source: Source): string => {
    if (source.domain) return source.domain;
    try {
      return new URL(source.url).hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  };

  // Cited sources first for scanning, but keep stable citation numbers via position/id
  const ordered = [...sources].sort((a, b) => {
    const citedDiff = Number(Boolean(b.cited)) - Number(Boolean(a.cited));
    if (citedDiff !== 0) return citedDiff;
    return (a.position || 0) - (b.position || 0);
  });

  return (
    <Card className="w-full mt-4 border-[var(--surface-border)] bg-[var(--paper)]/90">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-[var(--ocean)]" />
          Sources ({sources.length})
        </CardTitle>
        <CardDescription>
          Referenced sources used to generate this answer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ordered.map((source, index) => {
            const num = source.position || index + 1;
            const domain = getDomain(source);
            return (
              <div
                key={`${source.url}-${num}`}
                id={`source-${num}`}
                className={`p-3 border rounded-lg hover:bg-accent/60 transition-colors scroll-mt-24 ${
                  source.cited ? 'border-[var(--ocean)]/30 bg-[var(--sea-light)]/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs font-mono">
                        [{num}]
                      </Badge>
                      {source.favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={source.favicon}
                          alt=""
                          width={14}
                          height={14}
                          className="rounded-sm"
                        />
                      ) : null}
                      <span className="text-xs text-muted-foreground">{domain}</span>
                      {source.cited && (
                        <Badge className="text-[10px] bg-[var(--ocean)] text-white border-0">
                          Cited
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1 line-clamp-2">
                      {source.title || 'Untitled Source'}
                    </h4>
                    {source.snippet && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {source.snippet}
                      </p>
                    )}
                  </div>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-2 hover:bg-background rounded-md transition-colors"
                    aria-label={`Open source ${num}`}
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
