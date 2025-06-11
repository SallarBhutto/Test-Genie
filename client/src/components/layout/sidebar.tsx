import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  FolderOpen, 
  FileText, 
  Play, 
  Bug, 
  TrendingUp, 
  Users,
  Package,
  Layers,
  Target,
  Settings,
  TestTube,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Modules", href: "/modules", icon: Package },
  { name: "Components", href: "/components", icon: Layers },
  { name: "Test Cases", href: "/test-cases", icon: FileText },
  { name: "Test Suites", href: "/test-suites", icon: TestTube },
  { name: "Test Runs", href: "/test-runs", icon: Play },
  { name: "Defects", href: "/defects", icon: Bug },

  { name: "Reports", href: "/reports", icon: TrendingUp },
  { name: "Team", href: "/team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { isCollapsed, toggle } = useSidebar();

  const sidebarWidth = isCollapsed ? "w-16" : "w-64";

  return (
    <aside className={`${sidebarWidth} bg-white dark:bg-neutral-900 shadow-sm border-r border-neutral-200 dark:border-neutral-800 fixed h-full z-50 transform transition-all duration-300 ease-in-out flex flex-col`}>
        {/* Header */}
        <div className={`border-b border-neutral-200 dark:border-neutral-800 ${isCollapsed ? 'p-3' : 'p-6'}`}>
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <h1 className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">QualityBytes</h1>
            )}
          </div>
        </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          if (isCollapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-lg transition-colors cursor-pointer mx-auto",
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Toggle Button at Bottom */}
      <div className={`border-t border-neutral-200 dark:border-neutral-800 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "sm"}
          onClick={toggle}
          className={cn(
            "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors",
            isCollapsed ? "w-10 h-10 mx-auto" : "w-full justify-start"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
