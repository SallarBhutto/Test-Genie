import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  FolderOpen, 
  FileText, 
  Play, 
  Bug, 
  FileCheck, 
  TrendingUp, 
  Users,
  Package,
  Layers,
  Target
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Modules", href: "/modules", icon: Package },
  { name: "Components", href: "/components", icon: Layers },
  { name: "Test Cases", href: "/test-cases", icon: FileText },
  { name: "Test Runs", href: "/test-runs", icon: Play },
  { name: "Defects", href: "/defects", icon: Bug },
  { name: "Requirements", href: "/requirements", icon: FileCheck },
  { name: "Reports", href: "/reports", icon: TrendingUp },
  { name: "Team", href: "/team", icon: Users },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 shadow-sm border-r border-neutral-200 dark:border-neutral-800 fixed h-full z-10">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">TestGenie</h1>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>


    </aside>
  );
}
