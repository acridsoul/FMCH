'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Film } from 'lucide-react';

interface LandingFooterProps {
  isAuthenticated?: boolean;
}

export default function LandingFooter({ isAuthenticated = false }: LandingFooterProps) {
  return (
    <footer className="bg-background border-t"></footer>
  );
}

