import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DefectStatusPriorityChartProps {
  defects: any[];
}

export default function DefectStatusPriorityChart({ defects }: DefectStatusPriorityChartProps) {
  // Ensure defects is an array
  const defectsArray = Array.isArray(defects) ? defects : [];
  
  // Define status and priority mappings with colors
  const statusConfig = {
    'open': { label: 'Open', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-100 dark:bg-red-900/20' },
    'in_progress': { label: 'In Progress', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/20' },
    'resolved': { label: 'Resolved', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/20' },
    'closed': { label: 'Closed', color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-100 dark:bg-gray-900/20' },
    'reopened': { label: 'Reopened', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/20' },
  };

  const priorityConfig = {
    'critical': { label: 'Critical', color: 'bg-red-600', textColor: 'text-red-800' },
    'high': { label: 'High', color: 'bg-orange-500', textColor: 'text-orange-800' },
    'medium': { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-800' },
    'low': { label: 'Low', color: 'bg-green-500', textColor: 'text-green-800' },
  };

  // Calculate data for the matrix
  const statusKeys = Object.keys(statusConfig);
  const priorityKeys = Object.keys(priorityConfig);
  
  // Create matrix data
  const matrixData = statusKeys.map(status => {
    const statusDefects = defectsArray.filter(d => d.status === status);
    const priorityBreakdown = priorityKeys.map(priority => {
      const count = statusDefects.filter(d => d.priority === priority).length;
      return { priority, count };
    });
    
    return {
      status,
      total: statusDefects.length,
      priorities: priorityBreakdown
    };
  });

  // Calculate totals by priority
  const priorityTotals = priorityKeys.map(priority => {
    const count = defectsArray.filter(d => d.priority === priority).length;
    return { priority, count };
  });

  const totalDefects = defectsArray.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Defects by Status & Priority</span>
          <Badge variant="secondary">{totalDefects} total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Status breakdown with priority details */}
          <div className="space-y-4">
            {matrixData.map(({ status, total, priorities }) => {
              const statusInfo = statusConfig[status as keyof typeof statusConfig];
              if (!statusInfo || total === 0) return null;
              
              return (
                <div 
                  key={status} 
                  className={`p-4 rounded-lg border ${statusInfo.bgColor} border-opacity-20`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 ${statusInfo.color} rounded-full`}></div>
                      <span className={`font-medium ${statusInfo.textColor} dark:text-white`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <Badge variant="outline" className={statusInfo.textColor}>
                      {total} defects
                    </Badge>
                  </div>
                  
                  {/* Priority breakdown for this status */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {priorities.map(({ priority, count }) => {
                      const priorityInfo = priorityConfig[priority as keyof typeof priorityConfig];
                      if (count === 0) return null;
                      
                      return (
                        <div key={priority} className="flex items-center justify-between p-2 bg-white/50 dark:bg-black/20 rounded">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {priorityInfo.label}
                          </span>
                          <span className={`text-xs font-bold ${priorityInfo.textColor} dark:text-white`}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Priority summary */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Priority Summary</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {priorityTotals.map(({ priority, count }) => {
                const priorityInfo = priorityConfig[priority as keyof typeof priorityConfig];
                if (count === 0) return null;
                
                const percentage = totalDefects > 0 ? ((count / totalDefects) * 100).toFixed(1) : '0';
                
                return (
                  <div key={priority} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className={`w-4 h-4 ${priorityInfo.color} rounded-full mx-auto mb-1`}></div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {priorityInfo.label}
                    </div>
                    <div className={`text-lg font-bold ${priorityInfo.textColor} dark:text-white`}>
                      {count}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {percentage}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}