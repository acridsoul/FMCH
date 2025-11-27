'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';

interface CTASectionProps {
  isAuthenticated: boolean;
}

export default function CTASection({ isAuthenticated }: CTASectionProps) {
  const benefits = [
    'No credit card required',
    'Get started in under 2 minutes',
    'Full access to all features',
    'Cancel anytime'
  ];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Transform Your Production?
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join producers and directors who have eliminated production chaos and streamlined their workflows. 
          Start your first project today and see the difference.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          {isAuthenticated ? (
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link href="/signup">
                Start Free Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{benefit}</span>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Give it a try today!
          </div>
        </div>
      </div>
    </section>
  );
}

