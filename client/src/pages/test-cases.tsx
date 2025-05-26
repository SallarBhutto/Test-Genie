import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Edit, Play, Trash2 } from "lucide-react";
import CreateTestCaseModal from "@/components/modals/create-test-case-modal";
import CreateTestSuiteModal from "@/components/modals/create-test-suite-modal";
import { cn } from "@/lib/utils";

export default function TestCases() {
  const [showCreateTestCase, setShowCreateTestCase] = useState(false);
  const [showCreateTestSuite, setShowCreateTestSuite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: testCases, isLoading } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const filteredTestCases = testCases?.filter((testCase: any) =>
    testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    testCase.testCaseId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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

  if (isLoading) {
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
          <div className="flex items-center justify-between">
            <CardTitle>All Test Cases</CardTitle>
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestCases.map((testCase: any) => (
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
                        {testCase.assignee?.avatar && (
                          <img 
                            src={testCase.assignee.avatar} 
                            alt={testCase.assignee.fullName} 
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm">
                          {testCase.assignee?.fullName || "Unassigned"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {new Date(testCase.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateTestCaseModal 
        open={showCreateTestCase} 
        onOpenChange={setShowCreateTestCase} 
      />
      <CreateTestSuiteModal
        open={showCreateTestSuite}
        onOpenChange={setShowCreateTestSuite}
      />
    </div>
  );
}
