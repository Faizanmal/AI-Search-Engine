'use client';

import React, { Suspense } from 'react';
import { ChatBox } from '@/components/ChatBox';
import { Loader2 } from 'lucide-react';

function SearchFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--ocean)]" />
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen w-full flex flex-col overflow-hidden">
      <Suspense fallback={<SearchFallback />}>
        <ChatBox />
      </Suspense>
    </main>
  );
}
