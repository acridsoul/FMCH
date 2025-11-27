'use client';

import { PlusCircle, UserPlus, BarChart } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: PlusCircle,
      title: 'Create Your Project',
      description: 'Set up your production details, budget, and timeline in minutes.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      number: '02',
      icon: UserPlus,
      title: 'Invite Your Team',
      description: 'Add crew members with role-based permissions and access controls.',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      number: '03',
      icon: BarChart,
      title: 'Manage & Track',
      description: 'Coordinate schedules, assign tasks, and track progress in real-time.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            From Chaos to Control in 3 Steps
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Getting started is simple. In just a few minutes, you&apos;ll have your entire production organized and running smoothly.
          </p>
        </div>

        {/* Desktop: Horizontal timeline */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-16 left-0 right-0 h-0 bg-border">
              <div className="absolute top-0 left-1/3 w-1/3 h-full bg-primary/20" />
            </div>
            
            <div className="grid grid-cols-3 gap-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="text-center">
                    <div className="relative mb-8">
                      <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full ${step.bgColor} border-4 border-background shadow-lg`}>
                        <Icon className={`w-12 h-12 ${step.color}`} />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {step.number}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-3">
                      {step.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile: Vertical timeline */}
        <div className="lg:hidden space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${step.bgColor} border-2 border-background shadow-md`}>
                    <Icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <div className="text-center mt-2">
                    <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold mx-auto">
                      {step.number}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 pt-2">
                  <h3 className="text-lg font-semibold mb-2">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Ready to get started? It takes less than 5 minutes to set up your first project.
          </div>
        </div>
      </div>
    </section>
  );
}

