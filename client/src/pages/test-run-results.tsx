import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, Clock, Calendar, User } from "lucide-react";
import type { TestRun, TestRunResult, TestCase } from "@shared/schema";

export default function TestRunResults() {
  const [, params] = useRoute("/test-runs/:id/results");
  const [, setLocation] = useLocation();
  const testRunId = params?.id ? parseInt(params.id) : null;

  const { data: testRun, isLoading: testRunLoading } = useQuery<TestRun>({
    queryKey: ['/api/test-runs', testRunId],
    enabled: !!testRunId
  });

  const { data: results, isLoading: resultsLoading } = useQuery<TestRunResult[]>({
    queryKey: [`/api/test-run-results/${testRunId}`],
    enabled: !!testRunId
  });

  const { data: testCases, isLoading: testCasesLoading } = useQuery<TestCase[]>({
    queryKey: ['/api/test-cases']
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users']
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'passed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (testRunLoading || resultsLoading || testCasesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading test results...</div>
      </div>
    );
  }

  if (!testRun) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Test run not found</div>
      </div>
    );
  }

  const displayResults = Array.isArray(results) ? results : [];
  const displayTestCases = Array.isArray(testCases) ? testCases : [];
  const displayUsers = Array.isArray(users) ? users : [];

  // Create a map of test case IDs to test case details
  const testCaseMap = displayTestCases.reduce((map, testCase) => {
    map[testCase.id] = testCase;
    return map;
  }, {} as Record<number, TestCase>);

  // Create a map of user IDs to user names
  const userMap = displayUsers.reduce((map, user) => {
    map[user.id] = user.fullName || user.username;
    return map;
  }, {} as Record<number, string>);

  // Helper function to get user name
  const getUserName = (userId: number) => {
    return userMap[userId] || `User ${userId}`;
  };

  // Calculate summary statistics
  const totalTests = displayResults.length;
  const passedTests = displayResults.filter(r => r.status === 'passed').length;
  const failedTests = displayResults.filter(r => r.status === 'failed').length;
  const skippedTests = displayResults.filter(r => r.status === 'skipped').length;

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
            Test Results
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {testRun.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{passedTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedTests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Skipped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{skippedTests}</div>
          </CardContent>
        </Card>
      </div>

      {/* Test Run Details */}
      <Card>
        <CardHeader>
          <CardTitle>Test Run Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge className={getStatusColor(testRun.status)}>
                {testRun.status?.toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created</p>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(testRun.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {testRun.completedAt 
                    ? new Date(testRun.completedAt).toLocaleDateString()
                    : 'Not completed'
                  }
                </span>
              </div>
            </div>
          </div>
          {testRun.description && (
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-sm">{testRun.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results List */}
      <Card>
        <CardHeader>
          <CardTitle>Test Case Results</CardTitle>
        </CardHeader>
        <CardContent>
          {displayResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No test results available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayResults.map((result) => {
                const testCase = testCaseMap[result.testCaseId];
                return (
                  <div key={result.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(result.status)}
                          <h3 className="font-medium">
                            {testCase?.title || `Test Case ${result.testCaseId}`}
                          </h3>
                          <Badge className={getStatusColor(result.status)}>
                            {result.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          ID: {testCase?.testCaseId || `TC-${result.testCaseId}`}
                        </div>
                        {result.notes && (
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                              {result.notes}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(result.executedAt).toLocaleString()}
                        </div>
                        {result.executedBy && (
                          <div className="flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {getUserName(result.executedBy)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}