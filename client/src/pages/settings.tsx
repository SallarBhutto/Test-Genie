import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Settings as SettingsIcon, 
  Link, 
  Shield, 
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Loader2, Info } from "lucide-react";


interface AzureDevOpsSettings {
  enabled: boolean;
  organization: string;
  project: string;
  personalAccessToken: string;
  webhookSecret?: string;
}

interface SystemSettings {
  azureDevOps: AzureDevOpsSettings;
  emailNotifications: boolean;
  darkMode: boolean;
}

const azureDevOpsSchema = z.object({
  enabled: z.boolean(),
  organization: z.string().min(1, "Organization is required"),
  project: z.string().min(1, "Project is required"),
  personalAccessToken: z.string().min(1, "Personal Access Token is required"),
  webhookSecret: z.string().optional(),
});

export default function Settings() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<any>(null);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["/api/settings"],
    retry: false,
  });

  // Azure DevOps settings mutation
  const azureDevOpsMutation = useMutation({
    mutationFn: async (data: AzureDevOpsSettings) => {
      const response = await apiRequest("POST", "/api/settings/azure-devops", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Azure DevOps Settings Updated",
        description: "Your Azure DevOps integration settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update Azure DevOps settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/settings/azure-devops/test");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Test Failed",
        description: "Unable to test Azure DevOps connection.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof azureDevOpsSchema>>({
    resolver: zodResolver(azureDevOpsSchema),
    defaultValues: {
      enabled: settings?.azureDevOps.enabled || false,
      organization: settings?.azureDevOps.organization || "",
      project: settings?.azureDevOps.project || "",
      personalAccessToken: settings?.azureDevOps.personalAccessToken || "",
      webhookSecret: settings?.azureDevOps.webhookSecret || "",
    },
  });

  // Fetch projects for sync dropdown
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  // Update form values when settings data loads
  useEffect(() => {
    if (settings?.azureDevOps) {
      form.reset({
        enabled: settings.azureDevOps.enabled || false,
        organization: settings.azureDevOps.organization || "",
        project: settings.azureDevOps.project || "",
        personalAccessToken: settings.azureDevOps.personalAccessToken || "",
        webhookSecret: settings.azureDevOps.webhookSecret || "",
      });
    }

    fetchSyncStatus();
  }, [settings, form]);

  const handleAzureDevOpsSubmit = (data: z.infer<typeof azureDevOpsSchema>) => {
    azureDevOpsMutation.mutate(data);
  };

  const getConnectionStatus = () => {
    if (!settings?.azureDevOps.enabled) {
      return { status: "disabled", icon: XCircle, color: "text-gray-500", text: "Disabled" };
    }

    if (!settings?.azureDevOps.organization || !settings?.azureDevOps.project || !settings?.azureDevOps.personalAccessToken) {
      return { status: "incomplete", icon: AlertTriangle, color: "text-yellow-500", text: "Incomplete Configuration" };
    }

    return { status: "ready", icon: CheckCircle, color: "text-green-500", text: "Ready" };
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

    const fetchSyncStatus = async () => {
    try {
      const response = await fetch("/api/azure/sync/status");
      if (response.ok) {
        const status = await response.json();
        setSyncStatus(status);
      }
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  const testConnection = async () => {
    testConnectionMutation.mutate();
  };

  const handleFullSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await apiRequest("POST", "/api/azure/sync");

      const result = await response.json();
      setSyncResult(result);

      if (result.success) {
        toast({
          title: "Sync Completed",
          description: `Created: ${result.stats.created}, Updated: ${result.stats.updated}`,
        });
        // Refresh sync status
        fetchSyncStatus();
      } else {
        toast({
          title: "Sync Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = "Failed to start sync";
      setSyncResult({ success: false, message: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProjectSync = async () => {
    if (!selectedProjectId) return;

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch(`/api/azure/sync/project/${selectedProjectId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      setSyncResult(result);

      if (result.success) {
        toast({
          title: "Project Sync Completed",
          description: `Created: ${result.stats.created}, Updated: ${result.stats.updated}`,
        });
        // Refresh sync status
        fetchSyncStatus();
      } else {
        toast({
          title: "Project Sync Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = "Failed to start project sync";
      setSyncResult({ success: false, message: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="w-32 h-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        <div className="w-full h-96 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <SettingsIcon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Configure integrations and system preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <Link className="w-4 h-4" />
            <span>Integrations</span>
          </TabsTrigger>
        </TabsList>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 8.5L14.5 0L8.5 6L2.8 1.8L0 4.6L8.5 13L24 8.5Z"/>
                    </svg>
                    <span>Azure DevOps Integration</span>
                  </CardTitle>
                  <CardDescription>
                    Configure Azure DevOps integration for automatic bug tracking and bidirectional sync
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIcon className={`w-5 h-5 ${connectionStatus.color}`} />
                  <Badge variant={connectionStatus.status === "ready" ? "default" : "secondary"}>
                    {connectionStatus.text}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAzureDevOpsSubmit)} className="space-y-6">
                  {/* Enable/Disable Switch */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enabled">Enable Azure DevOps Integration</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Automatically sync bugs to Azure DevOps work items
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  {/* Configuration Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="your-organization" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Your Azure DevOps organization name (from URL)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="project"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="your-project" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            The specific project where work items will be created
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="personalAccessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Personal Access Token</FormLabel>
                        <FormControl>
                          <Input 
                            type={showToken ? "text" : "password"}
                            placeholder="Enter your Azure DevOps PAT" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Generate a PAT in Azure DevOps with Work Items (Read & Write) permissions
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webhookSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook Secret (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter webhook secret for signature validation" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Optional secret for validating webhook signatures from Azure DevOps
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Button 
                      type="submit" 
                      disabled={azureDevOpsMutation.isPending}
                      className="flex-1"
                    >
                      {azureDevOpsMutation.isPending ? "Saving..." : "Save Configuration"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testConnectionMutation.mutate()}
                      disabled={testConnectionMutation.isPending || !form.getValues().enabled}
                      className="flex-1"
                    >
                      {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Webhook Configuration Instructions */}
              {settings?.azureDevOps.enabled && (
                <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mt-0.5">
                      <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
                        Configure Azure DevOps Webhook (Optional)
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        Set up a webhook to automatically sync changes from Azure DevOps back to QualityBytes when work items are created or updated.
                      </p>

                      <div className="space-y-4">
                        <div>
                          <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                            Step 1: Get Your Webhook URL
                          </h5>
                          <div className="bg-white dark:bg-gray-800 p-3 rounded border font-mono text-sm">
                            <code className="text-green-600 dark:text-green-400">
                              https://your-app-url/api/webhooks/azure-devops
                            </code>
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            Replace "your-app-url" with your actual QualityBytes deployment URL
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                            Step 2: Configure in Azure DevOps
                          </h5>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                            <li>Go to your Azure DevOps project settings</li>
                            <li>Navigate to <strong>Service hooks</strong></li>
                            <li>Click <strong>+ Create subscription</strong></li>
                            <li>Select <strong>Web Hooks</strong> as the service type</li>
                            <li>Choose trigger: <strong>Work item created</strong> or <strong>Work item updated</strong></li>
                            <li>Filter by work item type: <strong>Bug</strong> (recommended)</li>
                            <li>Set the URL to the webhook URL above</li>
                            <li>Set HTTP method to <strong>POST</strong></li>
                            <li>Add your webhook secret (if configured above) in the <strong>Basic authentication</strong> section</li>
                            <li>Test the subscription and finish setup</li>
                          </ol>
                        </div>

                        <div>
                          <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                            Supported Events
                          </h5>
                          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                            <li><strong>Work item created:</strong> Creates a new defect in QualityBytes</li>
                            <li><strong>Work item updated:</strong> Syncs changes to existing defects</li>
                          </ul>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            <strong>Note:</strong> You may need to create separate webhook subscriptions for "Work item created" and "Work item updated" events, 
                            as Azure DevOps typically allows one event type per subscription.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        {/* Azure DevOps Sync Section */}
        {settings?.azureDevOps.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Azure DevOps Sync
              </CardTitle>
              <CardDescription>
                Synchronize all bugs from Azure DevOps to QualityBytes. This will create new defects for Azure work items that don't exist in QualityBytes and update existing ones.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sync Status */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Synced Defects</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    {syncStatus?.totalDefectsWithAzureId || 0}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Defects linked to Azure work items
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Total Projects</Label>
                  <div className="text-2xl font-bold text-green-600">
                    {syncStatus?.totalProjects || 0}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Projects in QualityBytes
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sync-Enabled Projects</Label>
                  <div className="text-2xl font-bold text-purple-600">
                    {syncStatus?.projectsWithTeamNames || 0}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Projects with team names configured
                  </p>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Full Sync</h4>
                    <p className="text-sm text-neutral-500">
                      Sync all bugs from all Azure area paths to their corresponding QualityBytes projects
                    </p>
                  </div>
                  <Button
                    onClick={handleFullSync}
                    disabled={isSyncing}
                    className="min-w-[120px]"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Start Sync
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Project-Specific Sync</h4>
                    <p className="text-sm text-neutral-500">
                      Sync bugs for a specific project only
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects
                          ?.filter(p => p.teamName)
                          .map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name} ({project.teamName})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleProjectSync}
                      disabled={!selectedProjectId || isSyncing}
                      variant="outline"
                    >
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sync Results */}
              {syncResult && (
                <div className={`p-4 rounded-lg border ${
                  syncResult.success 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {syncResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="space-y-2 flex-1">
                      <p className={`font-medium ${
                        syncResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        {syncResult.message}
                      </p>

                      {syncResult.stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Total:</span> {syncResult.stats.totalAzureWorkItems}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span> {syncResult.stats.created}
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span> {syncResult.stats.updated}
                          </div>
                          <div>
                            <span className="font-medium">Errors:</span> {syncResult.stats.errors}
                          </div>
                        </div>
                      )}

                      {syncResult.errors && syncResult.errors.length > 0 && (
                        <div className="space-y-1">
                          <p className="font-medium text-sm">Errors:</p>
                          {syncResult.errors.slice(0, 5).map((error, index) => (
                            <p key={index} className="text-xs text-red-700 dark:text-red-300">
                              • {error}
                            </p>
                          ))}
                          {syncResult.errors.length > 5 && (
                            <p className="text-xs text-red-600">
                              ...and {syncResult.errors.length - 5} more errors
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Section */}
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      How Azure Sync Works
                    </p>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                      <li>• Fetches all Bug work items from Azure DevOps</li>
                      <li>• Uses project Team Names to match Azure Area Paths</li>
                      <li>• Creates new defects for work items not in QualityBytes</li>
                      <li>• Updates existing defects with latest Azure data</li>
                      <li>• Maintains bidirectional sync with webhook integration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </TabsContent>
      </Tabs>
    </div>
  );
}