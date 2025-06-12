import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/contexts/ProjectContext";
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
  FormDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  steps: z.array(z.string()).min(1, "At least one test step is required"),
  expectedResult: z.string().min(1, "Expected result is required"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["draft", "active"]),
  isAutomated: z.boolean(),
  projectId: z.number().min(1, "Project is required"),
  moduleId: z.number().min(1, "Module is required"),
  componentId: z.number().min(1, "Component is required"),
  assignedTo: z.number().nullable().optional(),
  createdBy: z.number(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTestCaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTestCase?: any;
}

export default function CreateTestCaseModal({ open, onOpenChange, editingTestCase }: CreateTestCaseModalProps) {
  const [steps, setSteps] = useState<string[]>([""]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedProject } = useProject();

  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
  });

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
  const filteredModules = (modules as any[])?.filter((module: any) => 
    selectedProjectId ? module.projectId === selectedProjectId : true
  ) || [];

  // Filter components by selected module
  const filteredComponents = (components as any[])?.filter((component: any) => 
    selectedModuleId ? component.moduleId === selectedModuleId : true
  ) || [];

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      preconditions: "",
      steps: [""],
      expectedResult: "",
      priority: "medium",
      status: "draft",
      isAutomated: false,
      assignedTo: undefined,
      createdBy: (currentUser as any)?.id || 1,
      projectId: 0,
      moduleId: 0,
      componentId: 0,
    },
  });

  // Effect to auto-select header project
  useEffect(() => {
    if (open && !editingTestCase) {
      // Auto-select header project
      if (selectedProject) {
        setSelectedProjectId(selectedProject.id);
        form.setValue("projectId", selectedProject.id);
      }
    }
  }, [open, selectedProject, editingTestCase, form, currentUser]);

  // Effect to populate form when editing
  useEffect(() => {
    if (editingTestCase && open) {
      form.reset({
        title: editingTestCase.title || "",
        description: editingTestCase.description || "",
        preconditions: editingTestCase.preconditions || "",
        steps: editingTestCase.steps || [""],
        expectedResult: editingTestCase.expectedResult || "",
        priority: editingTestCase.priority || "medium",
        status: editingTestCase.status || "draft",
        assignedTo: editingTestCase.assignedTo,
        createdBy: editingTestCase.createdBy || (currentUser as any)?.id || 1,
        projectId: editingTestCase.projectId || 0,
        moduleId: editingTestCase.moduleId || 0,
        componentId: editingTestCase.componentId || 0,
      });
      setSteps(editingTestCase.steps || [""]);
      setSelectedProjectId(editingTestCase.projectId || null);
      setSelectedModuleId(editingTestCase.moduleId || null);
    } else if (!editingTestCase && open) {
      // Reset form for new test case
      form.reset({
        title: "",
        description: "",
        preconditions: "",
        steps: [""],
        expectedResult: "",
        priority: "medium",
        status: "draft",
        assignedTo: undefined,
        createdBy: (currentUser as any)?.id || 1,
        projectId: 0,
        moduleId: 0,
        componentId: 0,
      });
      setSteps([""]);
      setSelectedProjectId(null);
      setSelectedModuleId(null);
    }
  }, [editingTestCase, open, form, currentUser]);

  const createTestCaseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        steps: steps.filter(step => step.trim() !== ""),
      };
      
      if (editingTestCase) {
        // Update existing test case
        const response = await apiRequest("PUT", `/api/test-cases/${editingTestCase.id}`, payload);
        return response.json();
      } else {
        // Create new test case
        const response = await apiRequest("POST", "/api/test-cases", payload);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: editingTestCase ? "Test case updated" : "Test case created",
        description: editingTestCase 
          ? "The test case has been updated successfully." 
          : "The test case has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      setSteps([""]);
    },
    onError: (error) => {
      console.error("Test case creation/update error:", error);
      toast({
        title: "Error",
        description: editingTestCase 
          ? "Failed to update test case. Please try again." 
          : "Failed to create test case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    console.log("Form submitted with data:", data);
    console.log("Is editing?", !!editingTestCase);
    console.log("Steps:", steps);
    console.log("Form errors:", form.formState.errors);
    
    const finalData = {
      ...data,
      steps: steps.filter(step => step.trim() !== ""),
    };
    
    createTestCaseMutation.mutate(finalData);
  };

  const addStep = () => {
    setSteps([...steps, ""]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps.length > 0 ? newSteps : [""]);
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  console.log("Form state:", {
    isValid: form.formState.isValid,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting
  });
  console.log("Modal render - open:", open, "editingTestCase:", editingTestCase);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTestCase ? "Edit Test Case" : "Create New Test Case"}
          </DialogTitle>
          <DialogDescription>
            {editingTestCase 
              ? "Update the test case details below." 
              : "Fill in the details to create a new test case. The test case ID will be auto-generated."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const projectId = Number(value);
                        field.onChange(projectId);
                        setSelectedProjectId(projectId);
                        setSelectedModuleId(null);
                        form.setValue("moduleId", 0);
                        form.setValue("componentId", 0);
                      }}
                      value={field.value ? field.value.toString() : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(projects as any[])?.map((project: any) => (
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
                    <FormLabel>Module *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const moduleId = Number(value);
                        field.onChange(moduleId);
                        setSelectedModuleId(moduleId);
                        form.setValue("componentId", 0);
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
                        {filteredModules?.map((module: any) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="componentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Component *</FormLabel>
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
                        {filteredComponents?.map((component: any) => (
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
                  <FormLabel>Title *</FormLabel>
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
                      placeholder="Enter test case description"
                      className="min-h-[80px]"
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
                      placeholder="Enter any preconditions"
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Test Steps *</FormLabel>
              <FormDescription>
                Add the steps to execute this test case
              </FormDescription>
              <div className="space-y-2 mt-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder={`Step ${index + 1}`}
                        value={step}
                        onChange={(e) => updateStep(index, e.target.value)}
                      />
                    </div>
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeStep(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addStep}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="expectedResult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Result *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter the expected result"
                      className="min-h-[80px]"
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
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
                    <Select 
                      onValueChange={(value) => field.onChange(value === "unassigned" ? null : Number(value))}
                      value={field.value ? field.value.toString() : "unassigned"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {(users as any[])?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName || user.username}
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
              <Button 
                type="submit" 
                disabled={createTestCaseMutation.isPending}
              >
                {createTestCaseMutation.isPending 
                  ? (editingTestCase ? "Updating..." : "Creating...") 
                  : (editingTestCase ? "Update Test Case" : "Create Test Case")
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}