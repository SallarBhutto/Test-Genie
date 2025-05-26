import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Clock, CheckCircle, XCircle } from "lucide-react";
import CreateTestRunModal from "@/components/modals/create-test-run-modal";
import SimpleExecuteModal from "@/components/modals/simple-execute-modal";

export default function TestRuns() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [selectedTestRunId, setSelectedTestRunId] = useState<number | null>(null);

  const { data: testRuns, isLoading } = useQuery({
    queryKey: ['/api/test-runs']
  });

  const handleExecuteClick = (id: number) => {
    console.log("EXECUTE CLICKED FOR:", id);
    alert(`Execute clicked for test run ${id}`);
    setSelectedTestRunId(id);
    setShowExecuteModal(true);
  };

  const handleViewClick = (id: number) => {
    console.log("VIEW DETAILS CLICKED FOR:", id);
    alert(`View Details clicked for test run ${id}`);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
        {(testRuns as any[])?.map((testRun) => (
          <Card key={testRun.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{testRun.name}</CardTitle>
              <Badge className="w-fit">
                {testRun.status?.toUpperCase() || 'PENDING'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {testRun.description || 'No description'}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewClick(testRun.id)}
                  >
                    View Details
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleExecuteClick(testRun.id)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Execute
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <CreateTestRunModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
      
      {showExecuteModal && (
        <SimpleExecuteModal
          open={showExecuteModal}
          onOpenChange={setShowExecuteModal}
          testRunId={selectedTestRunId}
        />
      )}
    </div>
  );
}