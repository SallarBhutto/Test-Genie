import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Calendar, AlertCircle, CheckCircle, Webhook } from "lucide-react";
import { format } from "date-fns";

interface SyncEvent {
  id: string;
  timestamp: string;
  type: 'webhook_received' | 'sync_success' | 'sync_error';
  workItemId?: number;
  defectId?: string;
  message: string;
  error?: string;
}

export default function WebhookLogs() {
  const { data: events, isLoading, refetch } = useQuery<SyncEvent[]>({
    queryKey: ["/api/sync-events"],
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'webhook_received':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'sync_success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sync_error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'webhook_received':
        return <Webhook className="w-4 h-4" />;
      case 'sync_success':
        return <CheckCircle className="w-4 h-4" />;
      case 'sync_error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Webhook Logs
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor Azure DevOps webhook events and synchronization status
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Webhook className="w-5 h-5" />
            <span>Recent Events</span>
            {events && (
              <Badge variant="secondary" className="ml-auto">
                {events.length} events
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Badge className={`${getEventTypeColor(event.type)} flex items-center space-x-1`}>
                        {getEventIcon(event.type)}
                        <span className="capitalize">{event.type.replace('_', ' ')}</span>
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}</span>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      {event.workItemId && (
                        <Badge variant="outline" className="text-xs">
                          Work Item: {event.workItemId}
                        </Badge>
                      )}
                      {event.defectId && (
                        <Badge variant="outline" className="text-xs">
                          Defect: {event.defectId}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{event.message}</p>
                  
                  {event.error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mt-2">
                      <p className="text-red-700 dark:text-red-300 text-sm font-medium">Error Details:</p>
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">{event.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Webhook className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-1">No webhook events yet</p>
              <p className="text-sm">Webhook events will appear here when received from Azure DevOps</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}