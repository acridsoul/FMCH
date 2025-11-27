import { AppLayoutNew } from '@/components/layout/AppLayoutNew';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayoutNew>{children}</AppLayoutNew>;
}
