'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TrustMeterProps {
  score: number;
}

export function TrustMeter({ score }: TrustMeterProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'High Confidence';
    if (score >= 60) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="w-5 h-5" />;
    if (score >= 60) return <Shield className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const progressColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <Card className="w-full mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5" />
          Trust Score
        </CardTitle>
        <CardDescription>
          Confidence level based on source quality and consistency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 font-semibold ${getScoreColor(score)}`}>
              {getScoreIcon(score)}
              <span>{getScoreLabel(score)}</span>
            </div>
            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
              {score}%
            </span>
          </div>
          
          <div className="relative">
            <Progress value={score} className="h-3" />
            <div 
              className={`absolute inset-0 h-3 rounded-full ${progressColor} transition-all`}
              style={{ width: `${score}%` }}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Based on {score >= 80 ? 'multiple high-quality' : score >= 60 ? 'several reliable' : 'limited'} sources</p>
            <p>• {score >= 80 ? 'Strong consensus' : score >= 60 ? 'General agreement' : 'Varying perspectives'} across sources</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
