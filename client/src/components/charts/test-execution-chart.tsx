import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3 } from "lucide-react";

export default function TestExecutionChart() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Test Execution Trends</CardTitle>
          <Select defaultValue="7days">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-600">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-500 dark:text-neutral-400">
              Chart visualization would render here
            </p>
            <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
              Test execution metrics and progress tracking
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
