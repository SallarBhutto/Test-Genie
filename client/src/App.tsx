import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Modules from "@/pages/modules";
import ModuleDetail from "@/pages/module-detail";
import Components from "@/pages/components";
import ComponentDetail from "@/pages/component-detail";
import TestCases from "@/pages/test-cases";
import TestSuites from "@/pages/test-suites";
import TestRunsFixed from "@/pages/test-runs-fixed";
import TestRunExecute from "@/pages/test-run-execute";
import TestRunResults from "@/pages/test-run-results";
import Defects from "@/pages/defects";

import Reports from "@/pages/reports";
import Team from "@/pages/team";
import Settings from "@/pages/settings";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";

function AuthenticatedLayout() {
  const { isOpen } = useSidebar();
  
  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-900">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ease-in-out ${isOpen ? 'ml-64' : 'ml-0'}`}>
        <TopBar />
        <div className="p-6">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/projects" component={Projects} />
                <Route path="/projects/:id" component={ProjectDetail} />
                <Route path="/modules" component={Modules} />
                <Route path="/modules/:id" component={ModuleDetail} />
                <Route path="/modules/:moduleId/components" component={Components} />
                <Route path="/components" component={Components} />
                <Route path="/components/:id" component={ComponentDetail} />
                <Route path="/components/:componentId/test-cases" component={TestCases} />
                <Route path="/test-cases" component={TestCases} />
                <Route path="/test-suites" component={TestSuites} />
                <Route path="/test-runs" component={TestRunsFixed} />
                <Route path="/test-runs/:id/execute" component={TestRunExecute} />
                <Route path="/test-runs/:id/results" component={TestRunResults} />
                <Route path="/defects" component={Defects} />
                <Route path="/reports" component={Reports} />
                <Route path="/team" component={Team} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </div>
      </main>
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <SidebarProvider>
      <ProjectProvider>
        <AuthenticatedLayout />
      </ProjectProvider>
    </SidebarProvider>
  );
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route component={Landing} />
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading QualityBytes...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <UnauthenticatedApp />;
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
