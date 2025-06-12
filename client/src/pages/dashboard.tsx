import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, 
  Play, 
  Bug, 
  CheckCircle, 
  TrendingUp, 
  ArrowUp, 
  ArrowDown, 
  Plus,
  Search,
  Edit,
  Trash2,
  BarChart3
} from "lucide-react";
import CreateTestCaseModal from "@/components/modals/create-test-case-modal";
import CreateDefectModal from "@/components/modals/create-defect-modal";
import TestExecutionChart from "@/components/charts/test-execution-chart";
import DefectStatusChart from "@/components/charts/defect-status-chart";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/ProjectContext";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [showCreateTestCase, setShowCreateTestCase] = useState(false);
  const [showCreateDefect, setShowCreateDefect] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedProject } = useProject();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats", selectedProject?.id],
  });

  const { data: testCases, isLoading: testCasesLoading } = useQuery({
    queryKey: ["/api/test-cases", selectedProject?.id],
  });

  const { data: defects } = useQuery({
    queryKey: ["/api/defects", selectedProject?.id],
  });

  const { data: testRuns } = useQuery({
    queryKey: ["/api/test-runs", selectedProject?.id],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const filteredTestCases = (testCases as any[] || []).filter((testCase: any) =>
    testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    testCase.testCaseId.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (statsLoading || testCasesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Test Cases</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {(stats as any)?.totalTestCases || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                {selectedProject ? `Project: ${selectedProject.name}` : 'All Projects'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Test Runs</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {(stats as any)?.testRuns || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                Total active runs
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Open Defects</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {(stats as any)?.openDefects || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Bug className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                Active defects
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Pass Rate</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {(stats as any)?.passRate || "0%"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                Test success rate
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* <TestExecutionChart /> */}
        <DefectStatusChart defects={(defects as any[]) || []} />
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              onClick={() => setShowCreateTestCase(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test Case
            </Button>
            {/* <Button variant="outline" className="w-full">
              <Play className="w-4 h-4 mr-2" />
              Run Test Suite
            </Button> */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowCreateDefect(true)}
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Defect
            </Button>
            {/* <Button variant="outline" className="w-full">
              <BarChart3 className="w-4 h-4 mr-2" />
              Generate Report
            </Button> */}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Test Runs */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Test Runs</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation('/test-runs')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(testRuns) && testRuns.length > 0 ? (
                  testRuns.slice(0, 3).map((testRun: any) => {
                    const getStatusIcon = (status: string) => {
                      switch (status) {
                        case 'completed':
                          return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
                        case 'running':
                          return <Play className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
                        case 'failed':
                          return <Bug className="w-5 h-5 text-red-600 dark:text-red-400" />;
                        default:
                          return <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
                      }
                    };

                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'completed':
                          return 'bg-green-100 dark:bg-green-900/20';
                        case 'running':
                          return 'bg-yellow-100 dark:bg-yellow-900/20';
                        case 'failed':
                          return 'bg-red-100 dark:bg-red-900/20';
                        default:
                          return 'bg-blue-100 dark:bg-blue-900/20';
                      }
                    };

                    const getStatusTextColor = (status: string) => {
                      switch (status) {
                        case 'completed':
                          return 'text-green-600 dark:text-green-400';
                        case 'running':
                          return 'text-yellow-600 dark:text-yellow-400';
                        case 'failed':
                          return 'text-red-600 dark:text-red-400';
                        default:
                          return 'text-blue-600 dark:text-blue-400';
                      }
                    };

                    return (
                      <div key={testRun.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 ${getStatusColor(testRun.status)} rounded-lg flex items-center justify-center`}>
                            {getStatusIcon(testRun.status)}
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-white">{testRun.name}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {testRun.executedAt ? 
                                `Executed ${new Date(testRun.executedAt).toLocaleDateString()}` : 
                                `Created ${new Date(testRun.createdAt).toLocaleDateString()}`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${getStatusTextColor(testRun.status)}`}>
                            {testRun.status.charAt(0).toUpperCase() + testRun.status.slice(1)}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {testRun.description || 'No description'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    No test runs available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        
      </div>

      {/* Test Case Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Test Case Management</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search test cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={() => setShowCreateTestCase(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Test Case
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
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Last Updated</TableHead>
                  {/* <TableHead>Actions</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestCases.slice(0, 10).map((testCase: any) => {
                  const assignedUser = (users as any[]).find((u: any) => u.id === testCase.assignedTo);
                  
                  return (
                    <TableRow key={testCase.id}>
                      <TableCell>
                        <Checkbox />
                      </TableCell>
                      <TableCell className="font-medium text-primary">
                        {testCase.testCaseId}
                      </TableCell>
                      <TableCell>{testCase.title}</TableCell>
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
                          {assignedUser && (
                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {assignedUser.fullName ? assignedUser.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : assignedUser.username[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-sm">
                            {assignedUser?.fullName || assignedUser?.username || "Unassigned"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-neutral-500">
                        {new Date(testCase.updatedAt).toLocaleString()}
                      </TableCell>
                      {/* <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell> */}
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
        onOpenChange={setShowCreateTestCase} 
      />
      <CreateDefectModal 
        open={showCreateDefect} 
        onOpenChange={setShowCreateDefect} 
      />
    </div>
  );
}
