import AuthSessionProvider from '@/lib/auth/session-provider';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import BottomNav from '@/components/dashboard/bottom-nav';
import TickerTape from '@/components/dashboard/ticker-tape';
import { DashboardMain } from '@/components/dashboard/dashboard-main';
import { NavigationPendingProvider } from '@/components/dashboard/navigation-pending-context';
import { Toaster } from '@/components/ui/sonner';
import { CopilotPanel } from '@/components/ai/copilot-panel';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <NavigationPendingProvider>
        <div className="dashboard-app min-h-screen bg-background text-foreground">
          {/* Grid (not flex): keeps main column width correct. minmax(0,1fr) prevents flex/grid overflow under sidebar. */}
          <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)]">
            <Sidebar />
            <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
              <TickerTape />
              <Header />
              <DashboardMain className="px-3 py-4 pb-20 sm:px-4 md:px-6 md:py-6 md:pb-6">
                {children}
              </DashboardMain>
            </div>
          </div>
          <BottomNav />
          <CopilotPanel />
        </div>
        <Toaster />
      </NavigationPendingProvider>
    </AuthSessionProvider>
  );
}
