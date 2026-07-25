'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FolderOpen, Globe, MessageSquare, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { searchAPI } from '@/lib/search-api';

export default function SharedCollectionPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shared-collection', token],
    queryFn: () => searchAPI.getSharedCollection(token as string),
    enabled: !!token,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen app-atmosphere">
      <div className="page-shell-inner max-w-4xl">
        {isLoading && (
          <div className="grid gap-4">
            <Card className="animate-pulse h-32 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]" />
            <Card className="animate-pulse h-56 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]" />
          </div>
        )}

        {!isLoading && (isError || !data) && (
          <Card className="text-center py-16 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
            <CardContent>
              <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <p className="text-lg font-medium">Shared collection not found</p>
              <p className="text-sm text-muted-foreground mt-1">
                The link may be invalid or the collection is no longer public.
              </p>
            </CardContent>
          </Card>
        )}

        {data && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-4 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-display text-2xl flex items-center gap-2 text-[var(--ink)]">
                      <FolderOpen className="w-6 h-6 text-[var(--ocean)]" />
                      {data.name}
                    </CardTitle>
                    {data.description && (
                      <p className="text-sm text-muted-foreground mt-2">{data.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Globe className="w-3 h-3 mr-1" /> Public
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {data.collaborator_usernames.length} collaborator
                    {data.collaborator_usernames.length === 1 ? '' : 's'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderOpen className="w-4 h-4" />
                    {data.query_count} saved quer{data.query_count === 1 ? 'y' : 'ies'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {data.comments.length} comment{data.comments.length === 1 ? '' : 's'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
              <CardHeader>
                <CardTitle className="text-lg">Comments</CardTitle>
              </CardHeader>
              <CardContent>
                {data.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  <div className="space-y-4">
                    {data.comments.map((comment) => (
                      <div key={comment.id}>
                        <p className="text-sm">{comment.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {comment.username} · {new Date(comment.created_at).toLocaleString()}
                        </p>
                        <Separator className="mt-3" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
