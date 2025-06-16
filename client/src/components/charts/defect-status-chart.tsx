import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DefectStatusChartProps {
  defects: any[];
}

export default function DefectStatusChart({ defects }: DefectStatusChartProps) {
  const defectsByStatus = defects.reduce((acc, defect) => {
    acc[defect.status] = (acc[defect.status] || 0) + 1;
    return acc;
  }, {});

  const total = defects.length || 1;
  const open = defectsByStatus.open || 0;
  const inProgress = defectsByStatus.in_progress || 0;
  const resolved = defectsByStatus.resolved || 0;
  const closed = defectsByStatus.closed || 0;
  const reopened = defectsByStatus.reopened || 0;

  const statusData = [
    { 
      name: "Open", 
      count: open, 
      percentage: (open / total) * 100,
      color: "bg-red-500"
    },
    { 
      name: "In Progress", 
      count: inProgress, 
      percentage: (inProgress / total) * 100,
      color: "bg-blue-500"
    },
    { 
      name: "Resolved", 
      count: resolved, 
      percentage: (resolved / total) * 100,
      color: "bg-green-500"
    },
    { 
      name: "Closed", 
      count: closed, 
      percentage: (closed / total) * 100,
      color: "bg-gray-500"
    },
    { 
      name: "Reopened", 
      count: reopened, 
      percentage: (reopened / total) * 100,
      color: "bg-yellow-500"
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defect Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {statusData.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 ${item.color} rounded-full`}></div>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24">
                  <Progress value={item.percentage} className="h-2" />
                </div>
                <span className="text-sm text-neutral-600 dark:text-neutral-400 w-6 text-right">
                  {item.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
