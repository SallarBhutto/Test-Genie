import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Clock, CheckCircle, XCircle } from "lucide-react";
import CreateTestRunModal from "@/components/modals/create-test-run-modal";
import ExecuteTestRunModal from "@/components/modals/execute-test-run-modal";

export default function TestRuns() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedTestRunId, setSelectedTestRunId] = useState<number | null>(null);
  
  const { data: testRuns, isLoading } = useQuery({
    queryKey: ["/api/test-runs"],
  });

  const handleViewDetails = (testRunId: number) => {
    // Navigate to test run details page
    window.location.href = `/test-runs/${testRunId}`;
  };

  const handleExecuteTestRun = (testRunId: number) => {
    setSelectedTestRunId(testRunId);
    setShowExecuteModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "in_progress":
        return <Play className="w-5 h-5 text-blue-500" />;
      case "aborted":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      aborted: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      not_started: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
    };
    return statusClasses[status as keyof typeof statusClasses] || statusClasses.not_started;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Test Runs</h1>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Test Run
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Test Runs</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Test Run
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(testRuns as any[])?.length > 0 ? (
          (testRuns as any[]).map((testRun) => (
            <Card key={testRun.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(testRun.status)}
                    <div>
                      <CardTitle className="text-lg">{testRun.name}</CardTitle>
                      <Badge className={getStatusBadge(testRun.status)}>
                        {testRun.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {testRun.description || 'No description provided'}
                  </p>
                  <div className="flex justify-between text-xs text-neutral-500">
                    <span>Created: {new Date(testRun.createdAt).toLocaleDateString()}</span>
                    <span>Project: {testRun.projectId}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewDetails(testRun.id)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => handleExecuteTestRun(testRun.id)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Execute
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-neutral-500 dark:text-neutral-400">No test runs found. Create your first test run!</p>
          </div>
        )}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>120/120 tests</span>
              </div>
              <Progress value={100} className="h-2" />
              <div className="flex justify-between text-sm text-neutral-500">
                <span>Started: 2 hours ago</span>
                <span>Duration: 1h 15m</span>
              </div>
              <div className="pt-2">
                <div className="text-sm font-medium text-green-600">95% Pass Rate</div>
                <div className="text-xs text-neutral-500">114 passed, 6 failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon("in_progress")}
                <div>
                  <CardTitle className="text-lg">Payment Gateway Tests</CardTitle>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 mt-1">
                    In Progress
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>67/89 tests</span>
              </div>
              <Progress value={75} className="h-2" />
              <div className="flex justify-between text-sm text-neutral-500">
                <span>Started: 45 min ago</span>
                <span>Est. remaining: 20m</span>
              </div>
              <div className="pt-2">
                <div className="text-sm font-medium text-blue-600">Running...</div>
                <div className="text-xs text-neutral-500">Current: Payment validation tests</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon("aborted")}
                <div>
                  <CardTitle className="text-lg">API Integration Tests</CardTitle>
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 mt-1">
                    Failed
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>35/45 tests</span>
              </div>
              <Progress value={78} className="h-2" />
              <div className="flex justify-between text-sm text-neutral-500">
                <span>Started: 1 day ago</span>
                <span>Failed at: Step 36</span>
              </div>
              <div className="pt-2">
                <div className="text-sm font-medium text-red-600">78% Pass Rate</div>
                <div className="text-xs text-neutral-500">35 passed, 10 failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateTestRunModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      
      <ExecuteTestRunModal
        open={showExecuteModal}
        onOpenChange={setShowExecuteModal}
        testRunId={selectedTestRunId}
      />
    </div>
  );
}
