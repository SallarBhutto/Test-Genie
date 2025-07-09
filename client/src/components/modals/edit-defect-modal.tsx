import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertDefectSchema, type InsertDefect } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditDefectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defectId: number | null;
}

export default function EditDefectModal({ open, onOpenChange, defectId }: EditDefectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: defect } = useQuery({
    queryKey: ["/api/defects", defectId],
    queryFn: async () => {
      if (!defectId) return null;
      const response = await fetch(`/api/defects/${defectId}`);
      if (!response.ok) throw new Error('Failed to fetch defect');
      return response.json();
    },
    enabled: !!defectId && open,
  });

  const form = useForm<InsertDefect>({
    resolver: zodResolver(insertDefectSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "open",
      severity: "medium",
      priority: "medium",
      projectId: undefined,
      testCaseId: undefined,
      assignedTo: undefined,
      reportedBy: undefined,
    },
  });

  // Watch the project selection to get project-specific test cases
  const selectedProjectId = form.watch("projectId");

  const { data: testCasesResponse } = useQuery({
    queryKey: ["/api/test-cases", { projectId: selectedProjectId }],
    queryFn: async () => {
      if (!selectedProjectId) return { data: [] };
      const response = await fetch(`/api/test-cases?projectId=${selectedProjectId}`);
      if (!response.ok) throw new Error('Failed to fetch test cases');
      return response.json();
    },
    enabled: !!selectedProjectId,
  });

  // Extract the actual test cases array from the response
  const testCases = testCasesResponse?.data || [];

  // Store original HTML description for saving
  const [originalHtmlDescription, setOriginalHtmlDescription] = useState<string>("");

  // Function to extract plain text from HTML
  const extractPlainTextFromHtml = (htmlContent: string): string => {
    if (!htmlContent) return "";
    
    // If it's already plain text, return it directly
    if (!htmlContent.includes('<')) {
      return htmlContent;
    }

    // Create a temporary div to parse HTML and extract text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Get text content and clean it up
    const textContent = tempDiv.textContent || tempDiv.innerText || "";
    
    return textContent
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/\n\s+/g, '\n') // Clean up newlines
      .trim();
  };

  // Update form when defect data is loaded
  useEffect(() => {
    if (defect && open) {
      // Store the original HTML description
      setOriginalHtmlDescription(defect.description || "");
      
      // Extract plain text for display in textarea
      const plainTextDescription = extractPlainTextFromHtml(defect.description || "");
      
      form.reset({
        title: defect.title,
        description: plainTextDescription,
        status: defect.status,
        severity: defect.severity,
        priority: defect.priority,
        projectId: defect.projectId,
        testCaseId: defect.testCaseId,
        assignedTo: defect.assignedTo,
        reportedBy: defect.reportedBy,
      });
    }
  }, [defect, open, form]);

  // Reset test case selection when project changes
  useEffect(() => {
    const currentTestCaseId = form.getValues("testCaseId");
    if (currentTestCaseId && selectedProjectId) {
      const isTestCaseInProject = testCases.some((tc: any) => 
        tc.id === currentTestCaseId
      );
      if (!isTestCaseInProject) {
        form.setValue("testCaseId", undefined);
      }
    }
  }, [selectedProjectId, testCases, form]);

  const updateDefectMutation = useMutation({
    mutationFn: async (data: InsertDefect) => {
      await apiRequest("PUT", `/api/defects/${defectId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/defects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Defect updated",
        description: "The defect has been updated successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update defect. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDefect) => {
    // Check if the description contains Azure DevOps images
    const hasAzureImages = originalHtmlDescription.includes('<') && 
                          originalHtmlDescription.includes('_apis/wit/attachments/');
    
    const finalData = { ...data };
    
    if (hasAzureImages) {
      // Preserve the original HTML description completely and don't send description update
      finalData.description = originalHtmlDescription;
    }
    
    updateDefectMutation.mutate(finalData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>Edit Defect</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter defect title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {originalHtmlDescription.includes('<') && originalHtmlDescription.includes('_apis/wit/attachments/') ? (
                          <div className="space-y-3">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                              <div className="flex items-start space-x-2">
                                <div className="text-amber-600 mt-0.5">🔒</div>
                                <div>
                                  <div className="text-sm font-medium text-amber-800 mb-1">
                                    Description contains Azure DevOps images
                                  </div>
                                  <div className="text-xs text-amber-700">
                                    This description cannot be edited from QualityBytes to preserve images. 
                                    Please update the description directly in Azure DevOps if changes are needed.
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                              <div className="text-sm text-gray-600 mb-2 font-medium">Current description content:</div>
                              <div 
                                className="prose prose-sm max-w-none text-sm bg-white p-3 rounded border max-h-48 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: originalHtmlDescription }}
                              />
                            </div>
                          </div>
                        ) : (
                          <Textarea 
                            placeholder="Describe the defect in detail" 
                            className="min-h-24"
                            {...field} 
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testCaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Test Case</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} value={field.value?.toString() || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select test case (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {testCases.map((testCase: any) => (
                          <SelectItem key={testCase.id} value={testCase.id.toString()}>
                            {testCase.testCaseId} - {testCase.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="reopened">Reopened</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : parseInt(value))} value={field.value?.toString() || "unassigned"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateDefectMutation.isPending}>
                {updateDefectMutation.isPending ? "Updating..." : "Update Defect"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}