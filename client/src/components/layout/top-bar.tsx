import { Bell, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export default function TopBar() {
  const { user, logout, isLogoutPending } = useAuth();

  const handleLogout = () => {
    logout({}, {
      onSuccess: () => {
        window.location.href = "/";
      },
    });
  };

  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">Dashboard</h2>
          <Badge variant="secondary" className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            Project: E-Commerce Testing
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </Button>
          
          {/* User Profile Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-3 px-3 py-2 h-auto">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {user.fullName}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isLogoutPending}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLogoutPending ? "Signing out..." : "Sign out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
