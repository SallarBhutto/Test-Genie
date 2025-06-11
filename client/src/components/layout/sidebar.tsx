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
  X
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";

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
  const { isOpen, close } = useSidebar();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={close}
      />
      
      <aside className="w-64 bg-white dark:bg-neutral-900 shadow-sm border-r border-neutral-200 dark:border-neutral-800 fixed h-full z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">QualityBytes</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              className="h-8 w-8 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
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
      </aside>
    </>
  );
}
