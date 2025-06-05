import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, CheckCircle, Clock } from "lucide-react";
import CreateTestCaseModal from "@/components/modals/create-test-case-modal";
import EnhancedTestSuiteModal from "@/components/modals/enhanced-test-suite-modal";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useProject } from "@/contexts/ProjectContext";

export default function TestCases() {
  const [showCreateTestCase, setShowCreateTestCase] = useState(false);
  const [showCreateTestSuite, setShowCreateTestSuite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTestCase, setEditingTestCase] = useState(null);
  const { selectedProject } = useProject();
  const [filters, setFilters] = useState({
    module: "all",
    component: "all",
    priority: "all",
    status: "all",
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
        title: "Status Updated",
        description: "Test case status has been updated successfully",
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

  // Handler functions
  const handleEditTestCase = (testCase: any) => {
    console.log("Edit button clicked for test case:", testCase);
    setEditingTestCase(testCase);
    setShowCreateTestCase(true);
    console.log("Modal should open now");
  };

  const handleDeleteTestCase = (id: number) => {
    if (window.confirm('Are you sure you want to delete this test case?')) {
      deleteTestCaseMutation.mutate(id);
    }
  };

  const handleStatusToggle = (testCase: any) => {
    const newStatus = testCase.status === 'draft' ? 'active' : 'draft';
    updateStatusMutation.mutate({ id: testCase.id, status: newStatus });
  };

  const filteredTestCases = Array.isArray(testCases) ? testCases.filter((testCase: any) => {
    const matchesSearch = testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      testCase.testCaseId.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by selected project from header
    const matchesProject = !selectedProject || testCase.projectId === selectedProject.id;
    
    // Get the module and component for filtering
    const module = Array.isArray(modules) ? modules.find((m: any) => m.id === testCase.moduleId) : null;
    const component = Array.isArray(components) ? components.find((c: any) => c.id === testCase.componentId) : null;
    
    const matchesModule = !filters.module || filters.module === "all" || (module && module.id.toString() === filters.module);
    const matchesComponent = !filters.component || filters.component === "all" || (component && component.id.toString() === filters.component);
    const matchesPriority = !filters.priority || filters.priority === "all" || testCase.priority === filters.priority;
    const matchesStatus = !filters.status || filters.status === "all" || testCase.status === filters.status;
    
    return matchesSearch && matchesProject && matchesModule && matchesComponent && matchesPriority && matchesStatus;
  }) : [];

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      passed: "status-passed",
      failed: "status-failed", 
      blocked: "status-blocked",
      ready: "status-ready",
      draft: "status-draft",
    };
    return statusClasses[status as keyof typeof statusClasses] || "status-draft";
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

  if (testCasesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Test Cases</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Test Case
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
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Test Cases</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreateTestSuite(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Test Suite
          </Button>
          <Button onClick={() => setShowCreateTestCase(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Test Case
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Test Cases</CardTitle>
          
          {/* Filter Controls */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              
              <Select value={filters.module} onValueChange={handleModuleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {getAvailableModules().map((module: any) => (
                    <SelectItem key={module.id} value={module.id.toString()}>{module.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.component} onValueChange={(value) => setFilters(prev => ({ ...prev, component: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Components" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Components</SelectItem>
                  {getAvailableComponents().map((component: any) => (
                    <SelectItem key={component.id} value={component.id.toString()}>{component.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search test cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setFilters({ module: "all", component: "all", priority: "all", status: "all" })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Test Case ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestCases.map((testCase: any) => {
                  // Get hierarchy information from the loaded data using actual test case IDs
                  const project = projects.find((p: any) => p.id === testCase.projectId);
                  const module = modules.find((m: any) => m.id === testCase.moduleId);  
                  const component = components.find((c: any) => c.id === testCase.componentId);
                  
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
                          {project?.name || 'No Project'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-purple-600 dark:text-purple-400">
                          {module?.name || 'No Module'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          {component?.name || 'No Component'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("status-badge", getPriorityBadge(testCase.priority))}>
                          {testCase.priority}
                        </Badge>
                      </TableCell>
                    <TableCell>
                      <Badge className={cn("status-badge", getStatusBadge(testCase.status))}>
                        {testCase.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            JS
                          </span>
                        </div>
                        <span className="text-sm">
                          John Smith
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {new Date(testCase.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleStatusToggle(testCase)}
                          className={cn(
                            "hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20",
                            testCase.status === 'active' && "text-green-600 bg-green-50 dark:bg-green-900/20"
                          )}
                          title={testCase.status === 'draft' ? 'Mark as Active' : 'Mark as Draft'}
                        >
                          {testCase.status === 'draft' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditTestCase(testCase)}
                          className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteTestCase(testCase.id)}
                          className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
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
        onOpenChange={(open) => {
          setShowCreateTestCase(open);
          if (!open) setEditingTestCase(null);
        }}
        editingTestCase={editingTestCase}
      />
      <EnhancedTestSuiteModal
        open={showCreateTestSuite}
        onOpenChange={setShowCreateTestSuite}
      />
    </div>
  );
}
