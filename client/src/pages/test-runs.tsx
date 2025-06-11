import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Plus, Play, Clock, CheckCircle, XCircle } from "lucide-react";
import CreateTestRunModal from "@/components/modals/create-test-run-modal";
import SimpleExecuteModal from "@/components/modals/simple-execute-modal";
import { useProject } from "@/contexts/ProjectContext";
import { useSorting } from "@/hooks/useSorting";

export default function TestRuns() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedTestRunId, setSelectedTestRunId] = useState<number | null>(null);
  const { selectedProject } = useProject();

  const { data: testRuns = [], isLoading } = useQuery({
    queryKey: ['/api/test-runs', selectedProject?.id]
  });

  const { sortedData: sortedTestRuns, sortConfig, requestSort } = useSorting(testRuns, "createdAt");

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case 'in_progress':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case 'failed':
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleExecuteTestRun = (testRunId: number) => {
    console.log("Execute button clicked for test run:", testRunId);
    setSelectedTestRunId(testRunId);
    setShowExecuteModal(true);
    console.log("Modal should open now");
  };

  const handleViewDetails = (testRunId: number) => {
    console.log("View Details button clicked for test run:", testRunId);
    alert(`Viewing details for Test Run ID: ${testRunId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Test Runs</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
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
        {/* <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Test Runs</h1> */}
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Test Run
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTestRuns?.length > 0 ? (
          sortedTestRuns.map((testRun) => (
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
          <div className="col-span-full text-center py-8">
            <p className="text-neutral-500">No test runs found.</p>
          </div>
        )}
      </div>

      <CreateTestRunModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
      
      <SimpleExecuteModal
        open={showExecuteModal}
        onOpenChange={setShowExecuteModal}
        testRunId={selectedTestRunId}
      />
    </div>
  );
}