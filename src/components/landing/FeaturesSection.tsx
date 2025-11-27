'use client';

import { 
  FolderKanban, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  Users, 
  FileText 
} from 'lucide-react';

export default function FeaturesSection() {
  const features = [
    {
      icon: FolderKanban,
      title: 'Project Management',
      description: 'Create and track multiple productions with status workflows and team collaboration.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description: 'Coordinate shoots, scenes, crew, and equipment without conflicts or double-booking.',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      icon: CheckSquare,
      title: 'Task Assignment',
      description: 'Assign and track tasks across departments with real-time updates and notifications.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    {
      icon: DollarSign,
      title: 'Budget Tracking',
      description: 'Monitor expenses by category and stay within budget with real-time financial insights.',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Manage crew roles, availability, and responsibilities with role-based permissions.',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/20'
    },
    {
      icon: FileText,
      title: 'Secure File Storage',
      description: 'Store scripts, contracts, and call sheets in one secure, organized location.',
      color: 'text-rose-500',
      bgColor: 'bg-rose-50 dark:bg-rose-950/20'
    }
  ];

  return (
    <section id="features" className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything Your Production Needs, One Platform
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Stop switching between tools. The Film Production Command Hub brings all your production management 
            needs together in one powerful, easy-to-use platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="group p-6 rounded-lg bg-background border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.bgColor} mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            All features included • No hidden costs • Start free today
          </div>
        </div>
      </div>
    </section>
  );
}

