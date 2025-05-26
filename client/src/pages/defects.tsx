import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Filter } from "lucide-react";
import CreateDefectModal from "@/components/modals/create-defect-modal";
import { cn } from "@/lib/utils";

export default function Defects() {
  const [showCreateDefect, setShowCreateDefect] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: defects, isLoading } = useQuery({
    queryKey: ["/api/defects"],
  });

  const deleteDefectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/defects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/defects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Defect deleted",
        description: "The defect has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete defect. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredDefects = defects?.filter((defect: any) => {
    const matchesSearch = defect.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         defect.defectId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || defect.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || defect.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
  }) || [];

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      open: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      reopened: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    };
    return statusClasses[status as keyof typeof statusClasses] || statusClasses.open;
  };

  const getSeverityBadge = (severity: string) => {
    const severityClasses = {
      critical: "priority-critical",
      high: "priority-high",
      medium: "priority-medium",
      low: "priority-low",
    };
    return severityClasses[severity as keyof typeof severityClasses] || "priority-medium";
  };

  const handleDeleteDefect = (id: number) => {
    if (window.confirm("Are you sure you want to delete this defect?")) {
      deleteDefectMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Defects</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Report Defect
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
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Defects</h1>
        <Button onClick={() => setShowCreateDefect(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Report Defect
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Defects</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {defects?.length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Open</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {defects?.filter((d: any) => d.status === "open").length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">In Progress</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {defects?.filter((d: any) => d.status === "in_progress").length || 0}
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
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Resolved</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {defects?.filter((d: any) => d.status === "resolved").length || 0}
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
            <CardTitle>All Defects</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search defects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDefects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No defects found
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {defects?.length === 0 
                  ? "No defects have been reported yet. Create your first defect to get started."
                  : "No defects match your current filters. Try adjusting your search criteria."
                }
              </p>
              {defects?.length === 0 && (
                <Button onClick={() => setShowCreateDefect(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Report First Defect
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
                    <TableHead>Defect ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDefects.map((defect: any) => (
                    <TableRow key={defect.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {defect.defectId}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {defect.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", getSeverityBadge(defect.severity))}>
                          {defect.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", getSeverityBadge(defect.priority))}>
                          {defect.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", getStatusBadge(defect.status))}>
                          {defect.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {defect.assignee?.avatar && (
                            <img 
                              src={defect.assignee.avatar} 
                              alt={defect.assignee.fullName} 
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm">
                            {defect.assignee?.fullName || "Unassigned"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {defect.reporter?.avatar && (
                            <img 
                              src={defect.reporter.avatar} 
                              alt={defect.reporter.fullName} 
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <span className="text-sm">
                            {defect.reporter?.fullName || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {new Date(defect.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteDefect(defect.id)}
                            disabled={deleteDefectMutation.isPending}
                          >
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

      <CreateDefectModal 
        open={showCreateDefect} 
        onOpenChange={setShowCreateDefect} 
      />
    </div>
  );
}
