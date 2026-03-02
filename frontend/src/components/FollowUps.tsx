'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, HelpCircle } from 'lucide-react';

interface FollowUpsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export function FollowUps({ questions, onQuestionClick }: FollowUpsProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <Card className="w-full mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="w-5 h-5" />
          Related Questions
        </CardTitle>
        <CardDescription>
          Explore these related topics to learn more
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {questions.map((question, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-between text-left h-auto py-3 px-4"
              onClick={() => onQuestionClick(question)}
            >
              <span className="flex-1 text-sm">{question}</span>
              <ArrowRight className="w-4 h-4 ml-2 shrink-0" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
