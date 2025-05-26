import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTestCaseSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, X } from "lucide-react";

const formSchema = insertTestCaseSchema.extend({
  steps: z.array(z.string()).min(1, "At least one test step is required"),
  projectId: z.number().min(1, "Project is required"),
  moduleId: z.number().optional(),
  componentId: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTestCaseModal({ open, onOpenChange }: CreateTestCaseModalProps) {
  const [steps, setSteps] = useState<string[]>([""]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: modules } = useQuery({
    queryKey: ["/api/modules"],
    enabled: !!selectedProjectId,
  });

  const { data: components } = useQuery({
    queryKey: ["/api/components"],
    enabled: !!selectedModuleId,
  });

  const { data: testSuites } = useQuery({
    queryKey: ["/api/test-suites"],
  });

  // Filter modules by selected project
  const filteredModules = modules?.filter((module: any) => 
    selectedProjectId ? module.projectId === selectedProjectId : true
  ) || [];

  // Filter components by selected module
  const filteredComponents = components?.filter((component: any) => 
    selectedModuleId ? component.moduleId === selectedModuleId : true
  ) || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      testCaseId: "",
      title: "",
      description: "",
      preconditions: "",
      steps: [""],
      expectedResult: "",
      priority: "medium",
      status: "draft",
      testSuiteId: 0,
      assignedTo: undefined,
      createdBy: 1,
      projectId: 0,
      moduleId: undefined,
      componentId: undefined,
    },
  });

  const createTestCaseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/test-cases", {
        ...data,
        steps: steps.filter(step => step.trim() !== ""),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Test case created",
        description: "The test case has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      setSteps([""]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create test case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddStep = () => {
    setSteps([...steps, ""]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const onSubmit = (data: FormData) => {
    createTestCaseMutation.mutate({
      ...data,
      steps: steps.filter(step => step.trim() !== ""),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Test Case</DialogTitle>
          <DialogDescription>
            Add a new test case to your test suite.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Hierarchical Project → Module → Component Selection */}
            <div className="space-y-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Project Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(Number(value));
                          setSelectedProjectId(Number(value));
                          setSelectedModuleId(null);
                          form.setValue("moduleId", undefined);
                          form.setValue("componentId", undefined);
                        }}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(projects as any[])?.map((project) => (
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
                  name="moduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(Number(value));
                          setSelectedModuleId(Number(value));
                          form.setValue("componentId", undefined);
                        }}
                        value={field.value ? field.value.toString() : ""}
                        disabled={!selectedProjectId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select module" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredModules?.map((module) => (
                            <SelectItem key={module.id} value={module.id.toString()}>
                              {module.name}
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
                  name="componentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Component (Optional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={field.value ? field.value.toString() : ""}
                        disabled={!selectedModuleId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select component" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredComponents?.map((component) => (
                            <SelectItem key={component.id} value={component.id.toString()}>
                              {component.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="testCaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Case ID</FormLabel>
                    <FormControl>
                      <Input placeholder="TC-004" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter test case title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this test case validates" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preconditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preconditions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="List any preconditions required" 
                      rows={2} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Test Steps
              </label>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <Input
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      placeholder="Enter test step"
                      className="flex-1"
                    />
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStep(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAddStep}
                  className="text-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="expectedResult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Result</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the expected outcome" 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
              <FormField
                control={form.control}
                name="testSuiteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Suite</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select test suite" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {testSuites?.map((suite: any) => (
                          <SelectItem key={suite.id} value={suite.id.toString()}>
                            {suite.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTestCaseMutation.isPending}>
                {createTestCaseMutation.isPending ? "Creating..." : "Create Test Case"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
