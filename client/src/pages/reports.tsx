import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  FileText, 
  PieChart, 
  Calendar,
  Filter,
  CalendarIcon
} from "lucide-react";
import DefectStatusChart from "@/components/charts/defect-status-chart";
import { useProject } from "@/contexts/ProjectContext";

export default function Reports() {
  const { selectedProject } = useProject();
  const [dateRange, setDateRange] = useState("last30days");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: reportStats } = useQuery({
    queryKey: ["/api/reports/stats", selectedProject?.id, dateRange, dateFrom, dateTo],
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: defects } = useQuery({
    queryKey: ["/api/defects", selectedProject?.id, dateRange, dateFrom, dateTo],
    refetchOnMount: true,
    staleTime: 0,
  });

  // Filter defects for the chart component
  const filteredDefects = defects?.filter((defect: any) => !selectedProject || defect.projectId === selectedProject.id) || [];

  // Calculate average execution time from test runs (mock calculation)
  const calculateAvgExecutionTime = () => {
    if (!reportStats?.totalTestRuns || reportStats.totalTestRuns === 0) return "0h";

    // Mock calculation - in real scenario this would come from actual execution times
    const totalRuns = reportStats.totalTestRuns;
    const avgHours = Math.round((totalRuns * 2.5) / totalRuns * 10) / 10; // Mock calculation
    return `${avgHours}h`;
  };

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    if (value !== "custom") {
      setDateFrom("");
      setDateTo("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Reports & Analytics</h1>
        <div className="flex items-center space-x-3">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
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
          {dateRange === "custom" && (
            <>
              <div className="flex flex-col space-y-1">
                <Label htmlFor="date-from" className="text-xs text-neutral-600 dark:text-neutral-400">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="flex flex-col space-y-1">
                <Label htmlFor="date-to" className="text-xs text-neutral-600 dark:text-neutral-400">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-32"
                />
              </div>
            </>
          )}

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
                  {reportStats?.executedTestCases || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Total Active: {reportStats?.executedTestCases || 0} / {reportStats?.totalTestCases || 0}
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
                  {reportStats?.defectResolutionRate || 0}%
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {reportStats?.resolvedDefects || 0} of {reportStats?.totalDefects || 0} resolved
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Test Automation</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {reportStats?.automationRate || 0}%
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={reportStats?.automationRate || 0} 
                className="h-2" 
              />
            </div>
            <div className="mt-2">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {reportStats?.automatedTestCases || 0} of {reportStats?.totalTestCases || 0} automated
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg. Execution Time</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{calculateAvgExecutionTime()}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                Based on {reportStats?.totalTestRuns || 0} test runs
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section - Only DefectStatusChart */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
              {Object.entries(reportStats?.testCasesByStatus || {}).map(([status, count]: [string, any]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${
                      status === "passed" ? "bg-green-500" :
                      status === "failed" ? "bg-red-500" :
                      status === "blocked" ? "bg-yellow-500" :
                      status === "ready" ? "bg-blue-500" : 
                      status === "active" ? "bg-blue-500" : "bg-gray-500"
                    }`}></div>
                    <span className="text-sm font-medium capitalize">{status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24">
                      <Progress 
                        value={reportStats?.totalTestCases > 0 ? (count / reportStats.totalTestCases) * 100 : 0} 
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
              {Object.entries(reportStats?.testCasesByPriority || {}).map(([priority, count]: [string, any]) => (
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
                        value={reportStats?.totalTestCases > 0 ? (count / reportStats.totalTestCases) * 100 : 0} 
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
    </div>
  );
}