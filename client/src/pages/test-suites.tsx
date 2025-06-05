import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, Trash2, TestTube, Eye, Users } from "lucide-react";
import CreateTestSuiteModal from "@/components/modals/create-test-suite-modal";
import AddTestCasesModal from "@/components/modals/add-test-cases-modal";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useProject } from "@/contexts/ProjectContext";

export default function TestSuites() {
  const [showCreateTestSuite, setShowCreateTestSuite] = useState(false);
  const [showAddTestCases, setShowAddTestCases] = useState(false);
  const [selectedTestSuite, setSelectedTestSuite] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const { selectedProject: contextProject } = useProject();
  const { toast } = useToast();

  const { data: testSuites, isLoading: loadingTestSuites } = useQuery({
    queryKey: ["/api/test-suites", contextProject?.id],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const deleteTestSuiteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/test-suites/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-suites"] });
      toast({
        title: "Test suite deleted",
        description: "Test suite has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete test suite. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter test suites based on search and project
  const filteredTestSuites = (testSuites || []).filter((suite: any) => {
    const matchesSearch = suite.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         suite.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === "all" || suite.projectId === parseInt(selectedProject);
    return matchesSearch && matchesProject;
  });

  const getProjectName = (projectId: number) => {
    const project = (projects || []).find((p: any) => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const getCreatorName = (createdBy: number) => {
    const user = (users || []).find((u: any) => u.id === createdBy);
    return user?.fullName || user?.username || "Unknown User";
  };

  const handleDeleteTestSuite = (id: number) => {
    if (confirm("Are you sure you want to delete this test suite?")) {
      deleteTestSuiteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Suites</h1>
          <p className="text-neutral-600 dark:text-neutral-400">Manage and organize your test case collections</p>
        </div>
        <Button onClick={() => setShowCreateTestSuite(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Test Suite
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Test Suites</CardTitle>
            <TestTube className="h-4 w-4 text-neutral-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(testSuites || []).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Users className="h-4 w-4 text-neutral-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set((testSuites || []).map((suite: any) => suite.projectId)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Suites</CardTitle>
            <TestTube className="h-4 w-4 text-neutral-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(testSuites || []).filter((suite: any) => {
                const created = new Date(suite.createdAt);
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return created > oneWeekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-4 h-4" />
                <Input
                  placeholder="Search test suites..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {(projects || []).map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Test Suites Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Suites</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTestSuites ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-neutral-600">Loading test suites...</div>
            </div>
          ) : filteredTestSuites.length === 0 ? (
            <div className="text-center py-8">
              <TestTube className="mx-auto h-12 w-12 text-neutral-400" />
              <h3 className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">No test suites</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {searchQuery || selectedProject !== "all" 
                  ? "No test suites match your current filters."
                  : "Get started by creating your first test suite."
                }
              </p>
              {!searchQuery && selectedProject === "all" && (
                <Button onClick={() => setShowCreateTestSuite(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test Suite
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestSuites.map((suite: any) => (
                  <TableRow key={suite.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <TestTube className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{suite.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {suite.description || "No description"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getProjectName(suite.projectId)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {getCreatorName(suite.createdBy)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(suite.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedTestSuite(suite);
                            setShowAddTestCases(true);
                          }}
                          title="Add Test Cases"
                        >
                          <TestTube className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            // TODO: Navigate to test suite detail page
                            toast({
                              title: "View Test Suite",
                              description: "Test suite detail view coming soon.",
                            });
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteTestSuite(suite.id)}
                          disabled={deleteTestSuiteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateTestSuiteModal
        open={showCreateTestSuite}
        onOpenChange={setShowCreateTestSuite}
      />

      {selectedTestSuite && (
        <AddTestCasesModal
          open={showAddTestCases}
          onOpenChange={setShowAddTestCases}
          testSuiteId={selectedTestSuite.id}
          testSuiteName={selectedTestSuite.name}
        />
      )}
    </div>
  );
}