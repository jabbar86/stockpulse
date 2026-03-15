import AuthSessionProvider from '@/lib/auth/session-provider';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
import BottomNav from '@/components/dashboard/bottom-nav';
import TickerTape from '@/components/dashboard/ticker-tape';
import { Toaster } from '@/components/ui/sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthSessionProvider>
      <div className="min-h-screen bg-muted/30">
        <Sidebar />
        <div className="md:ml-64">
          <TickerTape />
          <Header />
          <main className="px-3 py-4 pb-20 sm:px-4 md:px-6 md:py-6 md:pb-6">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
      <Toaster />
    </AuthSessionProvider>
  );
}
