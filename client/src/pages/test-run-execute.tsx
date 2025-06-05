import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, ArrowLeft, Play } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TestRun, TestCase } from "@shared/schema";

export default function TestRunExecute() {
  const [, params] = useRoute("/test-runs/:id/execute");
  const [, setLocation] = useLocation();
  const testRunId = params?.id ? parseInt(params.id) : null;
  
  const { data: testRun, isLoading: testRunLoading } = useQuery<TestRun>({
    queryKey: [`/api/test-runs/${testRunId}`],
    enabled: !!testRunId
  });

  const { data: testRunResults, isLoading: testRunResultsLoading } = useQuery({
    queryKey: [`/api/test-run-results/${testRunId}`],
    enabled: !!testRunId
  });

  const [results, setResults] = useState<Record<number, { status: string; notes: string }>>({});

  // Initialize results state with existing data from database
  useEffect(() => {
    if (testRunResults && Array.isArray(testRunResults)) {
      const initialResults: Record<number, { status: string; notes: string }> = {};
      testRunResults.forEach((result: any) => {
        if (result.status !== 'not_executed') {
          initialResults[result.testCaseId] = {
            status: result.status,
            notes: result.notes || ''
          };
        }
      });
      setResults(initialResults);
    }
  }, [testRunResults]);

  const updateTestRunMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/test-runs/${testRunId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error('Failed to update test run');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-runs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/test-runs', testRunId] });
      // Navigate back after successful update
      setLocation('/test-runs');
    }
  });

  const handleStatusChange = async (testCaseId: number, status: string) => {
    // Update local state immediately for UI responsiveness
    setResults(prev => ({
      ...prev,
      [testCaseId]: { ...prev[testCaseId], status }
    }));

    // Save to database immediately
    try {
      const testRunResult = (testRunResults as any[])?.find(tr => tr.testCaseId === testCaseId);
      if (testRunResult) {
        await apiRequest('PATCH', `/api/test-run-results/${testRunResult.id}`, {
          status: status,
          notes: results[testCaseId]?.notes || '',
          executedBy: 1,
          executedAt: new Date().toISOString()
        });
        // Invalidate cache to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/test-run-results/${testRunId}`] });
        console.log(`Auto-saved status change for test case ${testCaseId}: ${status}`);
      }
    } catch (error) {
      console.error('Failed to auto-save status change:', error);
    }
  };

  const handleNotesChange = async (testCaseId: number, notes: string) => {
    // Update local state immediately for UI responsiveness
    setResults(prev => ({
      ...prev,
      [testCaseId]: { ...prev[testCaseId], notes }
    }));

    // Save to database immediately
    try {
      const testRunResult = (testRunResults as any[])?.find(tr => tr.testCaseId === testCaseId);
      if (testRunResult) {
        await apiRequest('PATCH', `/api/test-run-results/${testRunResult.id}`, {
          status: results[testCaseId]?.status || testRunResult.status,
          notes: notes,
          executedBy: 1,
          executedAt: new Date().toISOString()
        });
        // Invalidate cache to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/test-run-results/${testRunId}`] });
        console.log(`Auto-saved notes change for test case ${testCaseId}`);
      }
    } catch (error) {
      console.error('Failed to auto-save notes change:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "blocked": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleCompleteExecution = async () => {
    // Check if any test cases have been executed
    const hasExecutedTests = testRunResults && Array.isArray(testRunResults) && 
      testRunResults.some((result: any) => result.status !== 'not_executed');
    
    if (!hasExecutedTests) {
      alert('Please execute at least one test case before completing.');
      return;
    }

    // Since results are auto-saved, we only need to update the test run status
    try {
      updateTestRunMutation.mutate({ 
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to complete test execution:', error);
      alert('Failed to complete test execution. Please try again.');
    }
  };

  if (testRunLoading || testRunResultsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!testRun) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Test run not found</p>
        <Button onClick={() => window.history.back()} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const displayTestCases = Array.isArray(testRunResults) ? testRunResults : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/test-runs')}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Execute Test Run
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {testRun?.name || 'Loading...'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Run Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge className={getStatusColor(testRun?.status || 'pending')}>
                  {testRun?.status?.toUpperCase() || 'PENDING'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Progress</p>
                <p className="text-2xl font-bold">
                  {testRunResults ? testRunResults.filter((r: any) => r.status !== 'not_executed').length : 0} / {displayTestCases.length}
                </p>
                <p className="text-xs text-gray-500">Tests executed</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {testRunResults ? testRunResults.filter((r: any) => r.status === 'passed').length : 0}
                  </p>
                  <p className="text-xs">Passed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {testRunResults ? testRunResults.filter((r: any) => r.status === 'failed').length : 0}
                  </p>
                  <p className="text-xs">Failed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600">
                    {testRunResults ? testRunResults.filter((r: any) => r.status === 'blocked').length : 0}
                  </p>
                  <p className="text-xs">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {displayTestCases.map((testCaseResult: any) => (
            <Card key={testCaseResult.testCaseId} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(results[testCaseResult.testCaseId]?.status || testCaseResult.status)}
                    <div>
                      <CardTitle className="text-lg">{testCaseResult.testCaseIdRef}</CardTitle>
                      <p className="text-sm text-gray-600">{testCaseResult.title}</p>
                    </div>
                  </div>
                  {(results[testCaseResult.testCaseId]?.status || testCaseResult.status) && (
                    <Badge className={getStatusColor(results[testCaseResult.testCaseId]?.status || testCaseResult.status)}>
                      {results[testCaseResult.testCaseId]?.status || testCaseResult.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Test Execution</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={results[testCaseResult.testCaseId]?.status === "passed" ? "default" : "outline"}
                      onClick={() => handleStatusChange(testCaseResult.testCaseId, "passed")}
                      className="text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Pass
                    </Button>
                    <Button
                      size="sm"
                      variant={results[testCaseResult.testCaseId]?.status === "failed" ? "destructive" : "outline"}
                      onClick={() => handleStatusChange(testCaseResult.testCaseId, "failed")}
                      className="text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Fail
                    </Button>
                    <Button
                      size="sm"
                      variant={results[testCaseResult.testCaseId]?.status === "blocked" ? "secondary" : "outline"}
                      onClick={() => handleStatusChange(testCaseResult.testCaseId, "blocked")}
                      className="text-xs"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Block
                    </Button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Notes</p>
                  <Textarea
                    placeholder="Add execution notes..."
                    value={results[testCaseResult.testCaseId]?.notes || ''}
                    onChange={(e) => handleNotesChange(testCaseResult.testCaseId, e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="flex justify-end pt-6 border-t">
            <Button 
              onClick={handleCompleteExecution}
              disabled={Object.keys(results).length === 0}
              className="px-8"
            >
              <Play className="w-4 h-4 mr-2" />
              Complete Test Execution
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}