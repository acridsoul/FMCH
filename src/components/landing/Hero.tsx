'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import Image from 'next/image';

interface HeroProps {
  isAuthenticated: boolean;
}

export default function Hero({ isAuthenticated }: HeroProps) {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left: Content */}
          <div className="lg:col-span-3 space-y-8 animate-fadeInUp">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Streamline Your Film Production{' '}
              <span className="text-primary">from Script to Screen</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              The all-in-one command hub that eliminates scheduling conflicts, 
              budget overruns, and miscommunication. Manage your entire production 
              in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <Button size="lg" asChild>
                  <Link href="/dashboard">
                    Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start Your Production Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
              
              <Button size="lg" variant="outline" onClick={scrollToFeatures}>
                <Play className="mr-2 h-5 w-5" />
                See How It Works
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              No credit card required • Free to start • Set up in 2 minutes
            </p>
          </div>
          
          {/* Right: SVG Illustrations */}
          <div className="lg:col-span-2 relative h-[400px] md:h-[500px] lg:h-[600px]">
            {/* Glow effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl -z-10" />
            
            {/* Primary illustration - collaboration */}
            <div className="relative z-10 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <Image
                src="/illustrations/collaboration.svg"
                alt="Team collaborating on film production dashboard"
                width={800}
                height={520}
                priority
                className="w-full h-auto drop-shadow-xl"
              />
            </div>
            
            {/* Secondary illustration - planning (desktop only) */}
            <div className="hidden lg:block absolute bottom-8 -left-12 w-72 z-20 animate-float" style={{ animationDelay: '0.4s' }}>
              <div className="relative">
                {/* White background for contrast */}
                <div className="absolute inset-0 bg-background rounded-2xl shadow-2xl -z-10 transform rotate-3" />
                <Image
                  src="/illustrations/planning.svg"
                  alt="Project planning and task management"
                  width={300}
                  height={180}
                  className="w-full h-auto p-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

