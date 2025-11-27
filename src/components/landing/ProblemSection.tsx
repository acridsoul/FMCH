'use client';

import { Zap, DollarSign, Calendar } from 'lucide-react';

export default function ProblemSection() {
  const problems = [
    {
      icon: Zap,
      title: 'Fragmented Tools',
      description: 'Juggling spreadsheets, emails, and messaging apps? Stop the chaos.',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/20'
    },
    {
      icon: DollarSign,
      title: 'Budget Overruns',
      description: 'Lost track of expenses? Get real-time visibility into every dollar spent.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20'
    },
    {
      icon: Calendar,
      title: 'Scheduling Conflicts',
      description: 'Crew double-booked? Coordinate shoots with intelligent scheduling.',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Film Production Shouldn&apos;t Be This Hard
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every day, film professionals struggle with the same challenges that slow down production and blow budgets.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <div 
                key={index}
                className="text-center p-8 rounded-lg bg-background border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${problem.bgColor} mb-6`}>
                  <Icon className={`w-8 h-8 ${problem.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold mb-4">
                  {problem.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {problem.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <p className="text-lg font-medium text-muted-foreground">
            Sound familiar? You&apos;re not alone. But it doesn&apos;t have to be this way.
          </p>
        </div>
      </div>
    </section>
  );
}

