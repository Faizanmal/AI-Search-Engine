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

  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  };

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5" />
          Sources ({sources.length})
        </CardTitle>
        <CardDescription>
          Referenced sources used to generate this answer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sources.map((source, index) => (
            <div
              key={index}
              className="p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {source.position || index + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getDomain(source.url)}
                    </span>
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
                  aria-label="Open source"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
