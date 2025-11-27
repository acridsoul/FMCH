'use client';

import { useAuth } from '@/context/AuthContext';
import LandingHeader from '@/components/landing/LandingHeader';
import Hero from '@/components/landing/Hero';
import ProblemSection from '@/components/landing/ProblemSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
  const { user } = useAuth();
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <Hero isAuthenticated={isAuthenticated} />
      <div id="features">
        <FeaturesSection />
      </div>
      <ProblemSection />
      <div id="how-it-works">
        <HowItWorksSection />
      </div>
      <CTASection isAuthenticated={isAuthenticated} />
      <div id="footer">
        <LandingFooter isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
