import { useState } from "react";
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
  Bell, 
  Palette,
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrations" className="flex items-center space-x-2">
            <Link className="w-4 h-4" />
            <span>Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Appearance</span>
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
                      disabled={testConnectionMutation.isPending || !form.getValues("enabled")}
                    >
                      {testConnectionMutation.isPending ? "Testing..." : "Test Connection"}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* Integration Info */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  How it works:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• When a bug is reported in QualityBytes, a work item is automatically created in Azure DevOps</li>
                  <li>• Bug details (title, description, priority, severity) are transferred to the work item</li>
                  <li>• Test case information is included if the bug is related to a specific test</li>
                  <li>• A clickable link appears in the defects table linking to the Azure DevOps work item</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Receive email updates for test results and defects
                    </p>
                  </div>
                  <Switch defaultChecked={settings?.emailNotifications} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of QualityBytes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Toggle between light and dark themes
                    </p>
                  </div>
                  <Switch defaultChecked={settings?.darkMode} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}