'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';
import { createAIService, ProjectAnalysis } from '@/lib/ai';

interface AIInsightsWidgetProps {
  budget?: number;
  expenses?: unknown[];
  aiProvider?: 'deepseek' | 'gemini';
  apiKey?: string;
  projectCount?: number;
}

export default function AIInsightsWidget({ 
  budget, 
  expenses = [], 
  aiProvider = 'deepseek',
  apiKey,
  projectCount = 1
}: AIInsightsWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<ProjectAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!budget || !apiKey) {
      setError('Budget or API key is missing');
      return;
    }

    setLoading(true);
    setError(null);

    console.log('🤖 Starting AI analysis...');
    console.log('Budget:', budget);
    console.log('Expenses count:', expenses.length);
    console.log('Project Count:', projectCount);
    console.log('API Key present:', !!apiKey);

    try {
      const aiService = createAIService('deepseek', apiKey);
      console.log('AI Service created, calling analyzePortfolio...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const analysis = await (aiService as any).analyzePortfolio(expenses as any[], budget, projectCount);
      console.log('✅ AI Analysis received:', analysis);
      setInsights(analysis);
    } catch (err) {
      console.error('❌ AI Analysis Error:', err);
      setError('Failed to generate AI insights. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Insights</CardTitle>
          </div>
        </div>
        <CardDescription>
          Get AI-powered analysis and recommendations for your project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!insights && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use AI to analyze your budget, expenses, and get intelligent recommendations.
            </p>
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !budget || !apiKey}
              className="w-full"
            >
              {loading ? 'Analyzing...' : 'Generate AI Insights'}
            </Button>
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
            {!apiKey && (
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-600 text-sm rounded-md">
                Add your AI API key to .env.local to use AI features
              </div>
            )}
          </div>
        )}

        {insights && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <h3 className="font-semibold">Budget Status</h3>
            </div>
            <p className="text-sm">{insights.budgetStatus}</p>

            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <h3 className="font-semibold">Timeline Status</h3>
            </div>
            <p className="text-sm">{insights.timelineStatus}</p>

            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h3 className="font-semibold">Resource Utilization</h3>
            </div>
            <p className="text-sm">{insights.resourceUtilization}</p>

            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-purple-600" />
              <h3 className="font-semibold">Recommendations</h3>
            </div>
            <ul className="list-disc list-inside text-sm space-y-1">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="text-muted-foreground">
                  {rec}
                </li>
              ))}
            </ul>

            <Button 
              onClick={() => setInsights(null)} 
              variant="outline" 
              className="w-full mt-4"
            >
              Analyze Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
