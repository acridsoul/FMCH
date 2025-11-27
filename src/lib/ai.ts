import axios from 'axios';

// DeepSeek API configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Types for AI responses
export interface AIReport {
  summary: string;
  recommendations: string[];
  insights: string[];
  riskAssessment: string;
}

export interface ProjectAnalysis {
  budgetStatus: string;
  timelineStatus: string;
  resourceUtilization: string;
  recommendations: string[];
}

// DeepSeek API service
export class DeepSeekService {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.deepseek.com';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateProductionReport(projectData: any): Promise<AIReport> {
    const prompt = `Analyze this film production project and provide a comprehensive report:

Project: ${projectData.title}
Budget: KSh ${projectData.budget?.toLocaleString('en-KE') || 'Not set'}
Status: ${projectData.status}
Description: ${projectData.description || 'No description'}

Please provide:
1. A brief summary of the project status
2. 3-5 specific recommendations for improvement
3. Key insights about the project
4. Risk assessment

Format your response as JSON with keys: summary, recommendations (array), insights (array), riskAssessment.`;

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      // Try to parse JSON response, fallback to structured text
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, create structured response
        return {
          summary: content.split('\n')[0] || 'Analysis completed',
          recommendations: content.split('\n').filter((line: string) => line.includes('•') || line.includes('-')).slice(0, 5),
          insights: ['AI analysis completed successfully'],
          riskAssessment: 'Review the recommendations above for potential risks'
        };
      }
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error('Failed to generate AI report');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async analyzeBudget(expenses: any[], budget: number): Promise<ProjectAnalysis> {
    const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const remaining = budget - totalSpent;
    const percentageUsed = (totalSpent / budget) * 100;

    const prompt = `You are a film production budget analyst. Analyze this detailed budget breakdown:

BUDGET OVERVIEW:
- Total Budget: KSh ${budget.toLocaleString('en-KE')}
- Total Spent: KSh ${totalSpent.toLocaleString('en-KE')}
- Remaining: KSh ${remaining.toLocaleString('en-KE')}
- Percentage Used: ${percentageUsed.toFixed(1)}%

EXPENSE BREAKDOWN BY CATEGORY:
${expenses.map((exp) => `- ${exp.category}: KSh ${Number(exp.amount).toLocaleString('en-KE')}`).join('\n')}

CATEGORY PERCENTAGES:
${expenses.map((exp) => {
  const percentage = (Number(exp.amount) / totalSpent * 100).toFixed(1);
  return `- ${exp.category}: ${percentage}% of total spending`;
}).join('\n')}

Provide a DETAILED analysis with specific numbers and insights:

1. Budget Status: Include actual amounts and percentages. Be specific about whether on track, over budget, or approaching limit. Mention the exact remaining amount.

2. Timeline Status: Based on the ${percentageUsed.toFixed(1)}% budget utilization, provide specific timeline implications. If over 90%, warn about potential delays. If under 50%, suggest timeline is healthy.

3. Resource Utilization: Analyze each expense category with specific numbers. Identify which categories are consuming the most budget and whether this is typical for film production. Mention specific amounts and percentages.

4. Recommendations: Provide 3-5 SPECIFIC, ACTIONABLE recommendations based on the actual spending data. Reference specific categories and amounts. For example:
   - If equipment is >60% of budget, suggest rental alternatives
   - If crew costs are low, suggest reviewing staffing
   - If one category dominates, suggest rebalancing

Be verbose and include actual numbers in your analysis. Format as JSON with keys: budgetStatus, timelineStatus, resourceUtilization, recommendations (array).`;

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch {
        // Enhanced fallback response with detailed data
        const sortedExpenses = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount));
        
        return {
          budgetStatus: `You have spent KSh ${totalSpent.toLocaleString('en-KE')} out of KSh ${budget.toLocaleString('en-KE')} (${percentageUsed.toFixed(1)}% of budget). ${
            percentageUsed > 100 ? 'You are OVER BUDGET by KSh ' + Math.abs(remaining).toLocaleString('en-KE') + '!' :
            percentageUsed > 90 ? 'You are approaching your budget limit with only KSh ' + remaining.toLocaleString('en-KE') + ' remaining.' :
            percentageUsed > 75 ? 'You have KSh ' + remaining.toLocaleString('en-KE') + ' remaining (healthy buffer).' :
            'Budget is on track with KSh ' + remaining.toLocaleString('en-KE') + ' remaining.'
          }`,
          timelineStatus: `With ${percentageUsed.toFixed(1)}% of budget utilized, ${
            percentageUsed > 90 ? 'timeline may be at risk. Consider reviewing remaining deliverables and budget allocation.' :
            percentageUsed > 75 ? 'timeline appears on track but monitor spending closely for remaining production phases.' :
            'timeline is healthy with adequate budget remaining for planned activities.'
          }`,
          resourceUtilization: expenses.length > 0 
            ? `Top spending categories: ${sortedExpenses
                .slice(0, 3)
                .map(exp => {
                  const pct = (Number(exp.amount) / totalSpent * 100).toFixed(1);
                  return `${exp.category} (KSh ${Number(exp.amount).toLocaleString('en-KE')}, ${pct}%)`;
                })
                .join(', ')}. Review if allocation aligns with production priorities.`
            : 'No expense data available for analysis.',
          recommendations: [
            percentageUsed > 90 ? `Critical: Only KSh ${Math.abs(remaining).toLocaleString('en-KE')} remaining. Freeze non-essential spending immediately.` : 
            `Budget utilization at ${percentageUsed.toFixed(1)}% - ${percentageUsed > 75 ? 'monitor remaining expenses closely' : 'healthy spending pace'}`,
            expenses.length > 0 && sortedExpenses[0] ? 
              `${sortedExpenses[0].category} is your largest expense at KSh ${Number(sortedExpenses[0].amount).toLocaleString('en-KE')} - verify this aligns with production needs` :
              'Track expenses by category for better budget visibility',
            'Review and update budget forecasts weekly to avoid surprises',
            percentageUsed < 50 ? 'Consider accelerating planned expenditures if timeline permits' : 'Prioritize remaining budget for critical production needs'
          ]
        };
      }
    } catch (error) {
      console.error('DeepSeek API error:', error);
      // Log more details for debugging
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      throw new Error('Failed to analyze budget');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async suggestTaskAssignments(tasks: any[], teamMembers: any[]): Promise<any[]> {
    const prompt = `Suggest optimal task assignments for this film production team:

Available Team Members:
${teamMembers.map((member) => `- ${member.profile?.full_name || 'Unknown'}: ${member.role}`).join('\n')}

Pending Tasks:
${tasks.map((task) => `- ${task.title} (Priority: ${task.priority}, Due: ${task.due_date})`).join('\n')}

Suggest the best person for each task based on their role and availability. Consider workload distribution.

Format as JSON array with task assignments.`;

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 600
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch {
        // Fallback to simple assignment logic
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return tasks.map((task: any) => ({
          taskId: task.id,
          suggestedAssignee: teamMembers[0]?.user_id || null,
          reason: 'AI suggested assignment based on role matching'
        }));
      }
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw new Error('Failed to suggest task assignments');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async analyzePortfolio(expenses: any[], budget: number, projectCount: number): Promise<ProjectAnalysis> {
    const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const remaining = budget - totalSpent;
    const percentageUsed = (totalSpent / budget) * 100;

    // Calculate category totals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryTotals = expenses.reduce((acc: any, exp: any) => {
      const category = exp.category || 'other';
      acc[category] = (acc[category] || 0) + Number(exp.amount);
      return acc;
    }, {});

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedCategories = Object.entries(categoryTotals)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort(([, a]: any, [, b]: any) => b - a)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(([category, amount]: any) => ({
        category,
        amount,
        percentage: ((amount / totalSpent) * 100).toFixed(1)
      }));

    const prompt = `You are a film production portfolio analyst. Analyze this multi-project production portfolio:

PORTFOLIO OVERVIEW:
- Number of Projects: ${projectCount}
- Total Portfolio Budget: KSh ${budget.toLocaleString('en-KE')}
- Total Spent Across All Projects: KSh ${totalSpent.toLocaleString('en-KE')}
- Remaining Budget: KSh ${remaining.toLocaleString('en-KE')}
- Portfolio Budget Utilization: ${percentageUsed.toFixed(1)}%

SPENDING BREAKDOWN BY CATEGORY:
${sortedCategories.map((cat) => 
  `- ${cat.category}: KSh ${Number(cat.amount).toLocaleString('en-KE')} (${cat.percentage}% of total spending)`
).join('\n')}

ANALYSIS REQUIREMENTS:
Provide a comprehensive portfolio-level analysis with the following structure:

1. BUDGET STATUS (budgetStatus):
   - State the exact amounts: "You have spent KSh X out of KSh Y (Z% of portfolio budget)"
   - Compare to healthy utilization rates for film production portfolios
   - Identify if any projects are at risk based on spending velocity
   - Include specific risk indicators with numbers

2. TIMELINE STATUS (timelineStatus):
   - Analyze spending utilization: "You have spent KSh X (Y% of budget) with KSh Z remaining"
   - Do NOT calculate burn rates (money per week/month) without timeline data
   - Instead focus on: "At X% utilization, your portfolio status is..."
   - Provide specific budget health indicators based on spending percentage
   - Warning signs if spending is too fast or too slow based on utilization percentage

3. RESOURCE UTILIZATION (resourceUtilization):
   - Detailed category analysis with actual amounts
   - Compare category spending to industry standards
   - Identify the top 3 cost drivers with specific KSh amounts
   - Calculate potential savings: "Reducing equipment costs by 10% would save KSh X"
   - Cross-project optimization opportunities

4. RECOMMENDATIONS (recommendations array):
   - Provide 5-7 specific, actionable recommendations
   - Each must include actual numbers and calculations
   - Focus on portfolio-level strategies (bulk deals, resource sharing between projects)
   - Prioritize by potential impact with estimated savings in KSh
   - Include specific next steps

CRITICAL REQUIREMENTS:
- Every statement must include specific KSh amounts
- Use percentages with one decimal place
- Compare actual spending to industry benchmarks
- Provide concrete savings estimates
- No generic advice like "monitor spending" - be specific about what to monitor and why
- Focus on portfolio-level insights (cross-project patterns, bulk opportunities)

Format as JSON with keys: budgetStatus, timelineStatus, resourceUtilization, recommendations (array).`;

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/chat/completions`,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are an expert film production financial analyst. Provide detailed, data-driven analysis with specific numbers and actionable recommendations. Never give generic advice. Do NOT calculate "burn rates" (money per time period) without timeline data - focus on budget utilization percentages instead.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      try {
        return JSON.parse(content);
      } catch {
        // Enhanced fallback with detailed portfolio analysis
        const topCategories = sortedCategories.slice(0, 3);
        const avgPerProject = totalSpent / projectCount;
        
        return {
          budgetStatus: `Portfolio Analysis: You have spent KSh ${totalSpent.toLocaleString('en-KE')} out of KSh ${budget.toLocaleString('en-KE')} (${percentageUsed.toFixed(1)}% utilization) across ${projectCount} projects. Average spending per project is KSh ${avgPerProject.toLocaleString('en-KE')}. ${
            percentageUsed > 90 ? `CRITICAL: You are at ${percentageUsed.toFixed(1)}% budget utilization with only KSh ${remaining.toLocaleString('en-KE')} remaining across all projects.` :
            percentageUsed > 75 ? `WARNING: At ${percentageUsed.toFixed(1)}% utilization, you have KSh ${remaining.toLocaleString('en-KE')} remaining. Monitor spending closely.` :
            `HEALTHY: At ${percentageUsed.toFixed(1)}% utilization with KSh ${remaining.toLocaleString('en-KE')} remaining, your portfolio is on track.`
          }`,
          timelineStatus: `Spending Analysis: With KSh ${totalSpent.toLocaleString('en-KE')} spent across ${projectCount} projects, average spending per project is KSh ${avgPerProject.toLocaleString('en-KE')}. ${
            percentageUsed > 85 ? `At this utilization rate, your remaining KSh ${remaining.toLocaleString('en-KE')} provides limited budget. Consider pausing non-critical expenses.` :
            percentageUsed > 60 ? `You have utilized ${percentageUsed.toFixed(1)}% of your portfolio budget with KSh ${remaining.toLocaleString('en-KE')} remaining. Monitor spending trends closely.` :
            `Your spending is well-paced at ${percentageUsed.toFixed(1)}% utilization. You have KSh ${remaining.toLocaleString('en-KE')} remaining to maintain this trajectory.`
          }`,
          resourceUtilization: `Category Analysis:\n${topCategories.map((cat, idx) => 
            `${idx + 1}. ${cat.category.toUpperCase()}: KSh ${Number(cat.amount).toLocaleString('en-KE')} (${cat.percentage}% of total spending)${
              idx === 0 ? ` - This is your largest cost driver. A 10% reduction would save KSh ${(Number(cat.amount) * 0.1).toLocaleString('en-KE')}.` : ''
            }`
          ).join('\n')}\n\nPortfolio Efficiency: ${
            topCategories[0] && Number(topCategories[0].percentage) > 50 
              ? `${topCategories[0].category} dominates at ${topCategories[0].percentage}% of spending. Consider bulk deals or resource sharing across projects.`
              : 'Spending is reasonably distributed across categories.'
          }`,
          recommendations: [
            `Negotiate bulk ${topCategories[0]?.category || 'equipment'} deals across all ${projectCount} projects. Potential savings: KSh ${(Number(topCategories[0]?.amount || 0) * 0.15).toLocaleString('en-KE')} (15% reduction).`,
            `Implement cross-project resource sharing for ${topCategories[1]?.category || 'crew'}. Current spending: KSh ${Number(topCategories[1]?.amount || 0).toLocaleString('en-KE')}. Sharing could reduce costs by 20%.`,
            `Set project-specific spending caps: KSh ${Math.round(remaining / projectCount).toLocaleString('en-KE')} per project for remaining budget.`,
            `Review ${topCategories[0]?.category || 'top category'} expenses (KSh ${Number(topCategories[0]?.amount || 0).toLocaleString('en-KE')}). Identify items that can be reused across projects.`,
            percentageUsed > 80 
              ? `URGENT: With only KSh ${remaining.toLocaleString('en-KE')} remaining (${(100 - percentageUsed).toFixed(1)}%), defer non-essential expenses and renegotiate vendor contracts.`
              : `Maintain current spending pace. You have KSh ${remaining.toLocaleString('en-KE')} buffer for contingencies.`,
            `Analyze per-project efficiency: Average spend is KSh ${avgPerProject.toLocaleString('en-KE')}. Identify outliers and apply best practices from efficient projects.`,
            `Create a portfolio reserve fund: Allocate 10% of remaining budget (KSh ${(remaining * 0.1).toLocaleString('en-KE')}) for unexpected costs across all projects.`
          ]
        };
      }
    } catch (error) {
      console.error('DeepSeek API error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      throw new Error('Failed to analyze portfolio');
    }
  }
}

// Gemini API service (alternative)
export class GeminiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async generateProductionReport(projectData: any): Promise<AIReport> {
    const prompt = `Analyze this film production project and provide a comprehensive report:

Project: ${projectData.title}
Budget: KSh ${projectData.budget?.toLocaleString('en-KE') || 'Not set'}
Status: ${projectData.status}
Description: ${projectData.description || 'No description'}

Please provide:
1. A brief summary of the project status
2. 3-5 specific recommendations for improvement
3. Key insights about the project
4. Risk assessment

Format your response as JSON with keys: summary, recommendations (array), insights (array), riskAssessment.`;

    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        }
      );

      const content = response.data.candidates[0].content.parts[0].text;
      
      try {
        return JSON.parse(content);
      } catch {
        return {
          summary: content.split('\n')[0] || 'Analysis completed',
          recommendations: content.split('\n').filter((line: string) => line.includes('•') || line.includes('-')).slice(0, 5),
          insights: ['AI analysis completed successfully'],
          riskAssessment: 'Review the recommendations above for potential risks'
        };
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to generate AI report');
    }
  }
}

// Factory function to create AI service
export function createAIService(provider: 'deepseek' | 'gemini', apiKey: string) {
  if (provider === 'deepseek') {
    return new DeepSeekService(apiKey);
  } else if (provider === 'gemini') {
    return new GeminiService(apiKey);
  }
  throw new Error('Unsupported AI provider');
}
