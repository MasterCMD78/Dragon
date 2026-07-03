import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Referrals from "@/pages/referrals";
import Leaderboard from "@/pages/leaderboard";
import Tasks from "@/pages/tasks";
import Quests from "@/pages/quests";
import Achievements from "@/pages/achievements";
import Notifications from "@/pages/notifications";
import { Layout } from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/types/telegram.d.ts";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/referrals" component={Referrals} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/quests" component={Quests} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
