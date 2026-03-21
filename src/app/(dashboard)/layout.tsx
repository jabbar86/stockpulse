import AuthSessionProvider from '@/lib/auth/session-provider';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import BottomNav from '@/components/dashboard/bottom-nav';
import TickerTape from '@/components/dashboard/ticker-tape';
import { DashboardMain } from '@/components/dashboard/dashboard-main';
import { NavigationPendingProvider } from '@/components/dashboard/navigation-pending-context';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <NavigationPendingProvider>
        <div className="min-h-screen bg-muted/30">
          <Sidebar />
          <div className="md:ml-64">
            <TickerTape />
            <Header />
            <DashboardMain className="px-3 py-4 pb-20 sm:px-4 md:px-6 md:py-6 md:pb-6">
              {children}
            </DashboardMain>
          </div>
          <BottomNav />
        </div>
        <Toaster />
      </NavigationPendingProvider>
    </AuthSessionProvider>
  );
}
