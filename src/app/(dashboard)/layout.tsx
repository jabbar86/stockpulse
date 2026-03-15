import AuthSessionProvider from '@/lib/auth/session-provider';
import Sidebar from '@/components/dashboard/sidebar';
import Header from '@/components/dashboard/header';
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
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
      <Toaster />
    </AuthSessionProvider>
  );
}
