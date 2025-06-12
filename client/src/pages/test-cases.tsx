import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, CheckCircle, Clock } from "lucide-react";
import CreateTestCaseModal from "@/components/modals/create-test-case-modal";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useProject } from "@/contexts/ProjectContext";
import { useSorting } from "@/hooks/useSorting";

export default function TestCases() {
  const [showCreateTestCase, setShowCreateTestCase] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTestCase, setEditingTestCase] = useState(null);
  const { selectedProject } = useProject();
  const [filters, setFilters] = useState({
    module: "all",
    component: "all",
    priority: "all",
    status: "all",
  });

  const { toast } = useToast();

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: modules = [] } = useQuery({
    queryKey: ["/api/modules", selectedProject?.id],
  });

  const { data: components = [] } = useQuery({
    queryKey: ["/api/components"],
  });

  const { data: testCases, isLoading: testCasesLoading } = useQuery({
    queryKey: ["/api/test-cases", selectedProject?.id],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Reset module and component filters when header project changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, module: "all", component: "all" }));
  }, [selectedProject]);

  // Get filtered modules based on selected project from header
  const getAvailableModules = () => {
    if (!selectedProject) {
      return Array.isArray(modules) ? modules : [];
    }
    return Array.isArray(modules) ? modules.filter((m: any) => m.projectId === selectedProject.id) : [];
  };

  // Get filtered components based on selected module
  const getAvailableComponents = () => {
    if (!filters.module || filters.module === "all") {
      if (!selectedProject) {
        return Array.isArray(components) ? components : [];
      }
      // Show components from selected project
      const projectModules = Array.isArray(modules) ? modules.filter((m: any) => m.projectId === selectedProject.id) : [];
      const moduleIds = projectModules.map((m: any) => m.id);
      return Array.isArray(components) ? components.filter((c: any) => moduleIds.includes(c.moduleId)) : [];
    }
    const moduleId = parseInt(filters.module);
    return Array.isArray(components) ? components.filter((c: any) => c.moduleId === moduleId) : [];
  };

  // Handle module filter change - reset component filter
  const handleModuleChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      module: value,
      component: "all"
    }));
  };

  // Delete mutation
  const deleteTestCaseMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/test-cases/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-cases'] });
      toast({
        title: "Success",
        description: "Test case deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete test case",
        variant: "destructive",
      });
    },
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      fetch(`/api/test-cases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-cases'] });
      toast({
        title: "Success",
        description: "Test case status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to update test case status",
        variant: "destructive",
      });
    },
  });

  // Filter test cases based on filters and search
  const filteredTestCases = Array.isArray(testCases) ? testCases.filter((testCase: any) => {
    const matchesSearch = testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.testCaseId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesModule = filters.module === "all" || testCase.moduleId === parseInt(filters.module);
    const matchesComponent = filters.component === "all" || testCase.componentId === parseInt(filters.component);
    const matchesPriority = filters.priority === "all" || testCase.priority === filters.priority;
    const matchesStatus = filters.status === "all" || testCase.status === filters.status;

    return matchesSearch && matchesModule && matchesComponent && matchesPriority && matchesStatus;
  }) : [];

  // Sorting
  const { sortConfig, handleSort, sortedItems: sortedTestCases } = useSorting(filteredTestCases, 'title');

  const handleStatusUpdate = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this test case?')) {
      deleteTestCaseMutation.mutate(id);
    }
  };

  const handleEdit = (testCase: any) => {
    setEditingTestCase(testCase);
    setShowCreateTestCase(true);
  };

  const handleModalClose = () => {
    setShowCreateTestCase(false);
    setEditingTestCase(null);
  };

  const availableModules = getAvailableModules();
  const availableComponents = getAvailableComponents();

  if (testCasesLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-8"></div>
          <div className="h-96 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Test Cases</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and execute your test cases
          </p>
        </div>
        <Button onClick={() => setShowCreateTestCase(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Test Case
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <Input
                placeholder="Search test cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.module} onValueChange={handleModuleChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {availableModules.map((module: any) => (
                  <SelectItem key={module.id} value={module.id.toString()}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.component} onValueChange={(value) => setFilters(prev => ({ ...prev, component: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Components" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Components</SelectItem>
                {availableComponents.map((component: any) => (
                  <SelectItem key={component.id} value={component.id.toString()}>
                    {component.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Test Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Cases ({sortedTestCases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <SortableTableHead
                    label="ID"
                    sortKey="testCaseId"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <SortableTableHead
                    label="Title"
                    sortKey="title"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <TableHead>Hierarchy</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Creator</TableHead>
                  <SortableTableHead
                    label="Created"
                    sortKey="createdAt"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTestCases.map((testCase: any) => {
                  // Get hierarchy information from the loaded data using actual test case IDs
                  const project = (projects as any[]).find((p: any) => p.id === testCase.projectId);
                  const module = (modules as any[]).find((m: any) => m.id === testCase.moduleId);  
                  const component = (components as any[]).find((c: any) => c.id === testCase.componentId);
                  const creator = (users as any[]).find((u: any) => u.id === testCase.createdBy);
                  
                  return (
                    <TableRow key={testCase.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {testCase.testCaseId}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {testCase.title}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-blue-600 dark:text-blue-400">
                          {project?.name || 'Unknown Project'}
                        </span>
                        {module && (
                          <>
                            <span className="mx-1 text-neutral-400">></span>
                            <span className="text-green-600 dark:text-green-400">
                              {module.name}
                            </span>
                          </>
                        )}
                        {component && (
                          <>
                            <span className="mx-1 text-neutral-400">></span>
                            <span className="text-purple-600 dark:text-purple-400">
                              {component.name}
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          testCase.priority === "critical" ? "destructive" :
                          testCase.priority === "high" ? "default" :
                          "secondary"
                        }>
                          {testCase.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={testCase.status}
                          onValueChange={(value) => handleStatusUpdate(testCase.id, value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue>
                              <Badge variant={
                                testCase.status === "passed" ? "default" :
                                testCase.status === "failed" ? "destructive" :
                                "secondary"
                              }>
                                {testCase.status === "passed" && <CheckCircle className="w-3 h-3 mr-1" />}
                                {testCase.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                                {testCase.status}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="passed">Passed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="skipped">Skipped</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">
                        {creator?.fullName || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                        {new Date(testCase.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(testCase)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(testCase.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateTestCaseModal
        open={showCreateTestCase}
        onOpenChange={handleModalClose}
        editingTestCase={editingTestCase}
      />
    </div>
  );
}