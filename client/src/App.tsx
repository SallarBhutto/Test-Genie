import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import TestCases from "@/pages/test-cases";
import TestRuns from "@/pages/test-runs";
import Defects from "@/pages/defects";
import Requirements from "@/pages/requirements";
import Reports from "@/pages/reports";
import Team from "@/pages/team";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";

function Router() {
  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <TopBar />
        <div className="p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/test-cases" component={TestCases} />
            <Route path="/test-runs" component={TestRuns} />
            <Route path="/defects" component={Defects} />
            <Route path="/requirements" component={Requirements} />
            <Route path="/reports" component={Reports} />
            <Route path="/team" component={Team} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
