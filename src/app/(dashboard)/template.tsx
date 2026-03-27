import { RouteTransition } from '@/components/transition/route-transition';

export default function DashboardRouteTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
