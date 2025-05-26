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
  
  const [results, setResults] = useState<Record<number, { status: string; notes: string }>>({});

  const { data: testRun, isLoading: testRunLoading } = useQuery<TestRun>({
    queryKey: ['/api/test-runs', testRunId],
    enabled: !!testRunId
  });

  const { data: testCases, isLoading: testCasesLoading } = useQuery<TestCase[]>({
    queryKey: ['/api/test-cases']
  });

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
    }
  });

  const handleStatusChange = (testCaseId: number, status: string) => {
    setResults(prev => ({
      ...prev,
      [testCaseId]: { ...prev[testCaseId], status }
    }));
  };

  const handleNotesChange = (testCaseId: number, notes: string) => {
    setResults(prev => ({
      ...prev,
      [testCaseId]: { ...prev[testCaseId], notes }
    }));
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

  const handleCompleteExecution = () => {
    const totalTests = Array.isArray(testCases) ? testCases.length : 0;
    const executedTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.status === 'passed').length;
    const failedTests = Object.values(results).filter(r => r.status === 'failed').length;

    const status = failedTests > 0 ? 'failed' : executedTests === totalTests ? 'completed' : 'in_progress';

    updateTestRunMutation.mutate({
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : null
    });

    // Navigate back to test runs page after successful update
    setLocation('/test-runs');
  };

  if (testRunLoading || testCasesLoading) {
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

  const displayTestCases = Array.isArray(testCases) ? testCases : [];

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
                  {Object.keys(results).length} / {displayTestCases.length}
                </p>
                <p className="text-xs text-gray-500">Tests executed</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {Object.values(results).filter(r => r.status === 'passed').length}
                  </p>
                  <p className="text-xs">Passed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {Object.values(results).filter(r => r.status === 'failed').length}
                  </p>
                  <p className="text-xs">Failed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-600">
                    {Object.values(results).filter(r => r.status === 'blocked').length}
                  </p>
                  <p className="text-xs">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {displayTestCases.map((testCase: any) => (
            <Card key={testCase.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(results[testCase.id]?.status)}
                    <div>
                      <CardTitle className="text-lg">{testCase.testCaseId}</CardTitle>
                      <p className="text-sm text-gray-600">{testCase.title}</p>
                    </div>
                  </div>
                  {results[testCase.id]?.status && (
                    <Badge className={getStatusColor(results[testCase.id].status)}>
                      {results[testCase.id].status}
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
                      variant={results[testCase.id]?.status === "passed" ? "default" : "outline"}
                      onClick={() => handleStatusChange(testCase.id, "passed")}
                      className="text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Pass
                    </Button>
                    <Button
                      size="sm"
                      variant={results[testCase.id]?.status === "failed" ? "destructive" : "outline"}
                      onClick={() => handleStatusChange(testCase.id, "failed")}
                      className="text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Fail
                    </Button>
                    <Button
                      size="sm"
                      variant={results[testCase.id]?.status === "blocked" ? "secondary" : "outline"}
                      onClick={() => handleStatusChange(testCase.id, "blocked")}
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
                    value={results[testCase.id]?.notes || ''}
                    onChange={(e) => handleNotesChange(testCase.id, e.target.value)}
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