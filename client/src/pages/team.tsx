import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Mail, Phone, Edit, MoreVertical, Users, UserCheck, UserX, Trash2 } from "lucide-react";
import { useState } from "react";
import CreateUserModal from "@/components/modals/create-user-modal";
import { User } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => apiRequest('DELETE', `/api/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.fullName}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: testCases = [] } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const { data: defects = [] } = useQuery({
    queryKey: ["/api/defects"],
  });

  const filteredUsers = users.filter((user: User) =>
    user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const roleClasses = {
      admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      tester: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    };
    return roleClasses[role as keyof typeof roleClasses] || roleClasses.tester;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate user statistics
  const getUserStats = (userId: number) => {
    const assignedTestCases = testCases.filter((tc: any) => tc.assignedTo === userId).length || 0;
    const assignedDefects = defects.filter((d: any) => d.assignedTo === userId).length || 0;
    const reportedDefects = defects.filter((d: any) => d.reportedBy === userId).length || 0;
    
    return {
      assignedTestCases,
      assignedDefects,
      reportedDefects,
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Team</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="h-96 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeMembers = users?.length || 0;
  const admins = users?.filter((u: any) => u.role === "admin").length || 0;
  const managers = users?.filter((u: any) => u.role === "manager").length || 0;
  const testers = users?.filter((u: any) => u.role === "tester").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Team</h1>
        <Button onClick={() => setShowCreateUser(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Members</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{activeMembers}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Admins</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{admins}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Managers</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{managers}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Testers</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{testers}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user: any) => {
          const stats = getUserStats(user.id);
          return (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar} alt={user.fullName} />
                      <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">{user.fullName}</h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">@{user.username}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mb-4">
                  <Badge className={getRoleBadge(user.role)}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {stats.assignedTestCases}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Test Cases</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {stats.assignedDefects}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Assigned Defects</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {stats.reportedDefects}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Reported</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-between">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <div className="flex items-center space-x-1">
                    <UserCheck className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Team Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Test Cases</TableHead>
                  <TableHead>Defects Assigned</TableHead>
                  <TableHead>Defects Reported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => {
                  const stats = getUserStats(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} alt={user.fullName} />
                            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-white">
                              {user.fullName}
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              @{user.username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadge(user.role)}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell className="text-center">{stats.assignedTestCases}</TableCell>
                      <TableCell className="text-center">{stats.assignedDefects}</TableCell>
                      <TableCell className="text-center">{stats.reportedDefects}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <UserCheck className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => alert(`Edit functionality coming soon for ${user.fullName}`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateUserModal 
        open={showCreateUser} 
        onOpenChange={setShowCreateUser} 
      />
    </div>
  );
}
