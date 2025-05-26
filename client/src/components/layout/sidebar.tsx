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
  Users 
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Projects", href: "/projects", icon: FolderOpen },
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
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bug className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Auto QA AI</h1>
        </div>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-white"
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
