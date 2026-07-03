import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/types/telegram.d.ts";

const Home = lazy(() => import("@/pages/home"));
const Profile = lazy(() => import("@/pages/profile"));
const Referrals = lazy(() => import("@/pages/referrals"));
const Leaderboard = lazy(() => import("@/pages/leaderboard"));
const Tasks = lazy(() => import("@/pages/tasks"));
const Quests = lazy(() => import("@/pages/quests"));
const Achievements = lazy(() => import("@/pages/achievements"));
const Notifications = lazy(() => import("@/pages/notifications"));
const WalletPage = lazy(() => import("@/pages/wallet"));
const AdminPanel = lazy(() => import("@/pages/admin/index"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={/^\/admin(\/.*)?$/} component={AdminPanel} />
        <Route>
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/referrals" component={Referrals} />
                <Route path="/leaderboard" component={Leaderboard} />
                <Route path="/tasks" component={Tasks} />
                <Route path="/quests" component={Quests} />
                <Route path="/achievements" component={Achievements} />
                <Route path="/notifications" component={Notifications} />
                <Route path="/wallet" component={WalletPage} />
                <Route path="/profile" component={Profile} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>
          </Layout>
        </Route>
      </Switch>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
