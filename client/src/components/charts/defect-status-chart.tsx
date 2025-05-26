import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DefectStatusChartProps {
  defects: any[];
}

export default function DefectStatusChart({ defects }: DefectStatusChartProps) {
  const defectsBySeverity = defects.reduce((acc, defect) => {
    acc[defect.severity] = (acc[defect.severity] || 0) + 1;
    return acc;
  }, {});

  const total = defects.length || 1;
  const critical = defectsBySeverity.critical || 0;
  const high = defectsBySeverity.high || 0;
  const medium = defectsBySeverity.medium || 0;
  const low = defectsBySeverity.low || 0;

  const severityData = [
    { 
      name: "Critical", 
      count: critical, 
      percentage: (critical / total) * 100,
      color: "bg-red-500"
    },
    { 
      name: "High", 
      count: high, 
      percentage: (high / total) * 100,
      color: "bg-orange-500"
    },
    { 
      name: "Medium", 
      count: medium, 
      percentage: (medium / total) * 100,
      color: "bg-yellow-500"
    },
    { 
      name: "Low", 
      count: low, 
      percentage: (low / total) * 100,
      color: "bg-green-500"
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Defect Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {severityData.map((item) => (
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
