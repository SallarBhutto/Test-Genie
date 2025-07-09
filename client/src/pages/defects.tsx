import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, Filter } from "lucide-react";
import CreateDefectModal from "@/components/modals/create-defect-modal";
import EditDefectModal from "@/components/modals/edit-defect-modal";
import { useProject } from "@/contexts/ProjectContext";
import { useSorting } from "@/hooks/useSorting";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function Defects() {
  const [showCreateDefect, setShowCreateDefect] = useState(false);
  const [showEditDefect, setShowEditDefect] = useState(false);
  const [editingDefectId, setEditingDefectId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedDefects, setSelectedDefects] = useState<Set<number>>(new Set());
  const { selectedProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounced search query with 500ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Reset page and selections when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedDefects(new Set());
  }, [statusFilter, severityFilter, priorityFilter, projectFilter, debouncedSearchQuery, selectedProject]);

  const { data: defectsResponse, isLoading } = useQuery({
    queryKey: ["/api/defects", selectedProject?.id, currentPage, pageSize, statusFilter, severityFilter, priorityFilter, projectFilter, debouncedSearchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (selectedProject?.id) {
        params.append('projectId', selectedProject.id.toString());
      }

      if (statusFilter !== "all") {
        params.append('status', statusFilter);
      }

      if (severityFilter !== "all") {
        params.append('severity', severityFilter);
      }

      if (priorityFilter !== "all") {
        params.append('priority', priorityFilter);
      }

      if (projectFilter !== "all") {
        params.append('filterProjectId', projectFilter);
      }

      if (debouncedSearchQuery.trim()) {
        params.append('search', debouncedSearchQuery.trim());
      }

      const response = await fetch(`/api/defects?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch defects');
      }
      return response.json();
    },
  });

  const defects = defectsResponse?.data || [];
  const pagination = defectsResponse?.pagination;

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
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

  const bulkDeleteDefectsMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await apiRequest("DELETE", "/api/defects/bulk", { ids });
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["/api/defects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSelectedDefects(new Set());
      toast({
        title: "Defects deleted",
        description: `${ids.length} defect${ids.length > 1 ? 's' : ''} deleted successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete defects. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { sortedData: sortedDefects, sortConfig, requestSort } = useSorting(defects, "defectId");

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allDefectIds = new Set(sortedDefects.map((defect: any) => defect.id));
      setSelectedDefects(allDefectIds);
    } else {
      setSelectedDefects(new Set());
    }
  };

  const handleSelectDefect = (defectId: number, checked: boolean) => {
    const newSelected = new Set(selectedDefects);
    if (checked) {
      newSelected.add(defectId);
    } else {
      newSelected.delete(defectId);
    }
    setSelectedDefects(newSelected);
  };

  const isAllSelected = sortedDefects.length > 0 && selectedDefects.size === sortedDefects.length;
  const isIndeterminate = selectedDefects.size > 0 && selectedDefects.size < sortedDefects.length;

  const handleBulkDelete = () => {
    if (selectedDefects.size === 0) return;

    const selectedCount = selectedDefects.size;
    const confirmMessage = `Are you sure you want to delete ${selectedCount} defect${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      bulkDeleteDefectsMutation.mutate(Array.from(selectedDefects));
    }
  };

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

  const handleEditDefect = (id: number) => {
    setEditingDefectId(id);
    setShowEditDefect(true);
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
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Defects</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and organize your application defects
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {selectedDefects.size > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteDefectsMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedDefects.size} Selected
            </Button>
          )}
          <Button onClick={() => setShowCreateDefect(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Report Defect
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Defects</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {pagination?.total || 0}
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Closed</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {defects?.filter((d: any) => d.status === "closed").length || 0}
                </p>
              </div>
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-900/20 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
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
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {Array.isArray(projects) && projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {defects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                {isLoading ? "Loading defects..." : "No defects found"}
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {isLoading 
                  ? "Please wait while we fetch your defects."
                  : pagination?.total === 0 
                  ? "No defects have been reported yet. Create your first defect to get started."
                  : "No defects match your current filters. Try adjusting your search criteria."
                }
              </p>
              {!isLoading && pagination?.total === 0 && (
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
                      <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className={isIndeterminate ? "data-[state=checked]:bg-primary/50" : ""}
                      />
                    </TableHead>
                    <SortableTableHead
                      sortKey="defectId"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Defect ID
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="title"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Title
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="severity"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Severity
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="priority"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Priority
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="status"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Status
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="assignedTo"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Assigned To
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="reportedBy"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Reported By
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="createdAt"
                      currentSortKey={sortConfig.key}
                      sortDirection={sortConfig.direction}
                      onSort={requestSort}
                    >
                      Created
                    </SortableTableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDefects.map((defect: any) => (
                    <TableRow key={defect.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedDefects.has(defect.id)}
                          onCheckedChange={(checked) => handleSelectDefect(defect.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {defect.defectId}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {defect.description?.includes('<') && defect.description?.includes('_apis/wit/attachments/') ? (
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: defect.description }}
                          />
                        ) : (
                          defect.description
                        )}
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
                        <div className="flex items-center gap-2">
                          <Badge className={cn("status-badge", getStatusBadge(defect.status))}>
                            {defect.status.replace("_", " ")}
                          </Badge>
                          {defect.azureWorkItemId && (
                            <a
                              href={defect.azureWorkItemUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              title={`Azure DevOps Work Item #${defect.azureWorkItemId}`}
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 8.5L14.5 0L8.5 6L2.8 1.8L0 4.6L8.5 13L24 8.5Z"/>
                              </svg>
                              #{defect.azureWorkItemId}
                            </a>
                          )}
                        </div>
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
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditDefect(defect.id)}
                          >
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

      {/* Pagination Controls */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between px-6 py-4 border-t bg-white dark:bg-neutral-900">
          <div className="flex items-center space-x-2 whitespace-nowrap">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} defects
            </span>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">per page</span>
          </div>

          <div className="flex items-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => pagination.hasPrev && setCurrentPage(currentPage - 1)}
                    className={!pagination.hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={pageNum === pagination.page}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => pagination.hasNext && setCurrentPage(currentPage + 1)}
                    className={!pagination.hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}

      <CreateDefectModal 
        open={showCreateDefect} 
        onOpenChange={setShowCreateDefect} 
      />

      <EditDefectModal 
        open={showEditDefect} 
        onOpenChange={setShowEditDefect} 
        defectId={editingDefectId}
      />
    </div>
  );
}