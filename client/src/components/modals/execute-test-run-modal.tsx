import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ExecuteTestRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testRunId: number | null;
}

export default function ExecuteTestRunModal({ open, onOpenChange, testRunId }: ExecuteTestRunModalProps) {
  const [selectedResults, setSelectedResults] = useState<Record<number, { status: string; notes: string }>>({});
  const { toast } = useToast();

  const { data: testRun } = useQuery({
    queryKey: ["/api/test-runs", testRunId],
    enabled: !!testRunId,
  });

  const { data: testCases } = useQuery({
    queryKey: ["/api/test-cases"],
    enabled: !!testRunId,
  });

  const { data: testRunResults } = useQuery({
    queryKey: ["/api/test-run-results", testRunId],
    enabled: !!testRunId,
  });

  const updateResultMutation = useMutation({
    mutationFn: async (data: { testCaseId: number; status: string; notes: string }) => {
      return apiRequest("/api/test-run-results", {
        method: "POST",
        body: {
          testRunId,
          testCaseId: data.testCaseId,
          status: data.status,
          notes: data.notes,
          executedBy: 1, // Current user ID
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-run-results", testRunId] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      toast({
        title: "Test result updated",
        description: "Test case result has been recorded successfully.",
      });
    },
  });

  const updateTestRunStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest(`/api/test-runs/${testRunId}`, {
        method: "PATCH",
        body: {
          status,
          completedAt: status === "completed" ? new Date().toISOString() : null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      toast({
        title: "Test run updated",
        description: "Test run status has been updated successfully.",
      });
    },
  });

  const handleResultChange = (testCaseId: number, field: string, value: string) => {
    setSelectedResults(prev => ({
      ...prev,
      [testCaseId]: {
        ...prev[testCaseId],
        [field]: value,
      },
    }));
  };

  const handleSaveResult = async (testCaseId: number) => {
    const result = selectedResults[testCaseId];
    if (!result?.status) {
      toast({
        title: "Error",
        description: "Please select a status for the test case.",
        variant: "destructive",
      });
      return;
    }

    await updateResultMutation.mutateAsync({
      testCaseId,
      status: result.status,
      notes: result.notes || "",
    });
  };

  const handleCompleteTestRun = async () => {
    await updateTestRunStatusMutation.mutateAsync("completed");
    onOpenChange(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "blocked":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "blocked":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!testRun || !testCases) return null;

  // Get test cases for this test run (assuming we store test case IDs in the test run)
  const testRunTestCases = Array.isArray(testCases) ? testCases.filter((tc: any) => tc.id) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Execute Test Run: {testRun.name}</DialogTitle>
          <DialogDescription>
            Execute test cases and record results for this test run.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div>
              <h3 className="font-medium">{testRun.name}</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{testRun.description}</p>
            </div>
            <Badge className={getStatusColor(testRun.status)}>
              {testRun.status}
            </Badge>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Test Cases</h4>
            {testRunTestCases.map((testCase: any) => {
              const existingResult = Array.isArray(testRunResults) 
                ? testRunResults.find((r: any) => r.testCaseId === testCase.id)
                : null;
              
              const currentResult = selectedResults[testCase.id] || {
                status: existingResult?.status || "",
                notes: existingResult?.notes || "",
              };

              return (
                <Card key={testCase.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(currentResult.status)}
                          <h5 className="font-medium">{testCase.testCaseId}</h5>
                          <Badge variant="outline" className={`text-xs ${
                            testCase.priority === "high" ? "border-red-200 text-red-700" :
                            testCase.priority === "medium" ? "border-yellow-200 text-yellow-700" :
                            "border-green-200 text-green-700"
                          }`}>
                            {testCase.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium mb-2">{testCase.title}</p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
                          {testCase.description}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Status</Label>
                            <Select
                              value={currentResult.status}
                              onValueChange={(value) => handleResultChange(testCase.id, "status", value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="passed">Passed</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="blocked">Blocked</SelectItem>
                                <SelectItem value="skipped">Skipped</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              placeholder="Add execution notes..."
                              value={currentResult.notes}
                              onChange={(e) => handleResultChange(testCase.id, "notes", e.target.value)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end mt-3">
                          <Button
                            size="sm"
                            onClick={() => handleSaveResult(testCase.id)}
                            disabled={!currentResult.status || updateResultMutation.isPending}
                          >
                            {updateResultMutation.isPending ? "Saving..." : "Save Result"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={handleCompleteTestRun}
              disabled={updateTestRunStatusMutation.isPending}
            >
              {updateTestRunStatusMutation.isPending ? "Completing..." : "Complete Test Run"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}