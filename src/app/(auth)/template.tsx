import { RouteTransition } from '@/components/transition/route-transition';

export default function AuthRouteTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition variant="auth">{children}</RouteTransition>;
}
