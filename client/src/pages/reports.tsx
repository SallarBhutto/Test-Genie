import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  FileText, 
  PieChart, 
  Calendar,
  Filter
} from "lucide-react";
import TestExecutionChart from "@/components/charts/test-execution-chart";
import DefectStatusChart from "@/components/charts/defect-status-chart";
import { useProject } from "@/contexts/ProjectContext";

export default function Reports() {
  const { selectedProject } = useProject();

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: testCases } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const { data: defects } = useQuery({
    queryKey: ["/api/defects"],
  });

  const { data: testRuns } = useQuery({
    queryKey: ["/api/test-runs"],
  });

  const filteredTestCases = testCases?.filter((tc: any) => !selectedProject || tc.projectId === selectedProject.id) || [];
  const filteredDefects = defects?.filter((defect: any) => !selectedProject || defect.projectId === selectedProject.id) || [];

  // Calculate test case distribution by status
  const testCasesByStatus = filteredTestCases?.reduce((acc: any, testCase: any) => {
    acc[testCase.status] = (acc[testCase.status] || 0) + 1;
    return acc;
  }, {}) || {};

  // Calculate test case distribution by priority
  const testCasesByPriority = filteredTestCases?.reduce((acc: any, testCase: any) => {
    acc[testCase.priority] = (acc[testCase.priority] || 0) + 1;
    return acc;
  }, {}) || {};

  const reportTypes = [
    {
      title: "Test Execution Summary",
      description: "Overview of test execution results and trends",
      icon: BarChart3,
      type: "execution"
    },
    {
      title: "Defect Analysis Report",
      description: "Detailed analysis of defects by severity and status",
      icon: PieChart,
      type: "defects"
    },
    {
      title: "Test Coverage Report",
      description: "Requirements coverage and test case mapping",
      icon: FileText,
      type: "coverage"
    },
    {
      title: "Team Performance Report",
      description: "Individual and team productivity metrics",
      icon: TrendingUp,
      type: "performance"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Reports & Analytics</h1>
        <div className="flex items-center space-x-3">
          <Select defaultValue="last30days">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 days</SelectItem>
              <SelectItem value="last30days">Last 30 days</SelectItem>
              <SelectItem value="last90days">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Test Cases Executed</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {filteredTestCases?.filter((tc: any) => tc.status !== "draft").length || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Pass Rate: {stats?.passRate || "0%"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Defect Resolution Rate</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {filteredDefects?.length > 0 
                    ? Math.round((filteredDefects.filter((d: any) => d.status === "resolved" || d.status === "closed").length / filteredDefects.length) * 100)
                    : 0
                  }%
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {filteredDefects?.filter((d: any) => d.status === "resolved" || d.status === "closed").length || 0} of {filteredDefects?.length || 0} resolved
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Test Automation</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">75%</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={75} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg. Execution Time</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">2.5h</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Per test suite
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TestExecutionChart />
        <DefectStatusChart defects={filteredDefects || []} />
      </div>

      {/* Test Case Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(testCasesByStatus).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      status === "passed" ? "bg-green-500" :
                      status === "failed" ? "bg-red-500" :
                      status === "blocked" ? "bg-yellow-500" :
                      status === "ready" ? "bg-blue-500" : "bg-gray-500"
                    }`}></div>
                    <span className="text-sm font-medium capitalize">{status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24">
                      <Progress 
                        value={filteredTestCases.length > 0 ? (count / filteredTestCases.length) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Cases by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(testCasesByPriority).map(([priority, count]: [string, any]) => (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      priority === "critical" ? "bg-red-500" :
                      priority === "high" ? "bg-orange-500" :
                      priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                    }`}></div>
                    <span className="text-sm font-medium capitalize">{priority}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24">
                      <Progress 
                        value={filteredTestCases.length > 0 ? (count / filteredTestCases.length) * 100 : 0} 
                        className="h-2" 
                      />
                    </div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <div key={report.type} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                        {report.title}
                      </h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                        {report.description}
                      </p>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}