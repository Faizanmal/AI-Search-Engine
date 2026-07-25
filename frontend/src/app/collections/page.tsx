'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  Plus,
  Trash2,
  Users,
  Globe,
  Lock,
  Link2,
  MessageSquare,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useAddCollaborator,
} from '@/hooks/use-search';
import { toast } from 'sonner';

export default function CollectionsPage() {
  const { data: collections, isLoading } = useCollections();
  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();
  const addCollaborator = useAddCollaborator();

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [collabUsername, setCollabUsername] = useState('');
  const [collabCollectionId, setCollabCollectionId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCollection.mutate(
      { name: newName.trim(), description: newDesc.trim(), isPublic: newPublic },
      {
        onSuccess: () => {
          setNewName('');
          setNewDesc('');
          setNewPublic(false);
          setCreateOpen(false);
        },
      },
    );
  };

  const handleAddCollaborator = () => {
    if (!collabCollectionId || !collabUsername.trim()) return;
    addCollaborator.mutate(
      { collectionId: collabCollectionId, username: collabUsername.trim() },
      { onSuccess: () => { setCollabUsername(''); setCollabCollectionId(null); } },
    );
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/collections/shared/${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied!');
  };

  return (
    <div className="min-h-screen app-atmosphere">
      <div className="page-shell-inner max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="page-title flex items-center gap-3">
              <FolderOpen className="w-7 h-7 text-[var(--ocean)]" />
              Collections
            </h1>
            <p className="page-subtitle">
              Organize and collaborate on search research
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white">
                <Plus className="w-4 h-4 mr-2" /> New Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <Input
                  placeholder="Collection name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    id="public"
                    checked={newPublic}
                    onCheckedChange={setNewPublic}
                  />
                  <Label htmlFor="public">Make public</Label>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!newName.trim() || createCollection.isPending}
                  className="w-full"
                >
                  {createCollection.isPending ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse h-40 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && (!collections || collections.length === 0) && (
          <Card className="text-center py-16 bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)]">
            <CardContent>
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No collections yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first collection to start organizing research
              </p>
            </CardContent>
          </Card>
        )}

        {/* Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence>
            {collections?.map((col) => (
              <motion.div
                key={col.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className="group bg-[var(--paper)]/90 border-[var(--surface-border)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{col.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        {col.is_public ? (
                          <Badge variant="secondary" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" /> Public
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" /> Private
                          </Badge>
                        )}
                      </div>
                    </div>
                    {col.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {col.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Search className="w-3.5 h-3.5" />
                        {col.query_count} queries
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {col.collaborator_usernames.length} collaborators
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {col.comments?.length ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyShareLink(col.share_token)}
                      >
                        <Link2 className="w-3.5 h-3.5 mr-1" /> Share
                      </Button>

                      <Dialog
                        open={collabCollectionId === col.id}
                        onOpenChange={(open) =>
                          setCollabCollectionId(open ? col.id : null)
                        }
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Users className="w-3.5 h-3.5 mr-1" /> Add
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Collaborator</DialogTitle>
                          </DialogHeader>
                          <div className="flex gap-2 mt-2">
                            <Input
                              placeholder="Username"
                              value={collabUsername}
                              onChange={(e) => setCollabUsername(e.target.value)}
                            />
                            <Button
                              onClick={handleAddCollaborator}
                              disabled={addCollaborator.isPending}
                            >
                              Add
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 ml-auto"
                        onClick={() => deleteCollection.mutate(col.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
