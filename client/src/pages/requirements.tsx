import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, FileCheck, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Requirements() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: requirements, isLoading } = useQuery({
    queryKey: ["/api/requirements"],
  });

  const filteredRequirements = requirements?.filter((requirement: any) => {
    const matchesSearch = requirement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         requirement.requirementId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || requirement.type === typeFilter;
    const matchesStatus = statusFilter === "all" || requirement.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      draft: "status-draft",
      approved: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      implemented: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      tested: "status-passed",
    };
    return statusClasses[status as keyof typeof statusClasses] || statusClasses.draft;
  };

  const getTypeBadge = (type: string) => {
    const typeClasses = {
      functional: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      non_functional: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
      technical: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
    };
    return typeClasses[type as keyof typeof typeClasses] || typeClasses.functional;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityClasses = {
      critical: "priority-critical",
      high: "priority-high",
      medium: "priority-medium",
      low: "priority-low",
    };
    return priorityClasses[priority as keyof typeof priorityClasses] || "priority-medium";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Requirements</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Requirement
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Requirements</h1>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Requirement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Requirements</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {requirements?.length || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Draft</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {requirements?.filter((r: any) => r.status === "draft").length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Approved</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {requirements?.filter((r: any) => r.status === "approved").length || 0}
                </p>
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
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Tested</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {requirements?.filter((r: any) => r.status === "tested").length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Requirements</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="non_functional">Non-Functional</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                  <SelectItem value="tested">Tested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequirements.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No requirements found
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {requirements?.length === 0 
                  ? "No requirements have been defined yet. Create your first requirement to get started."
                  : "No requirements match your current filters. Try adjusting your search criteria."
                }
              </p>
              {requirements?.length === 0 && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Requirement
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Requirement ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequirements.map((requirement: any) => (
                    <TableRow key={requirement.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {requirement.requirementId}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {requirement.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", getTypeBadge(requirement.type))}>
                          {requirement.type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", getPriorityBadge(requirement.priority))}>
                          {requirement.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", getStatusBadge(requirement.status))}>
                          {requirement.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">Created by user</span>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {new Date(requirement.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
