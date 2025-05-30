import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertTestSuiteSchema, type InsertTestSuite } from "@shared/schema";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ChevronDown, ChevronRight, Package, Layers, TestTube } from "lucide-react";

interface EnhancedTestSuiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EnhancedTestSuiteModal({ open, onOpenChange }: EnhancedTestSuiteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [selectedComponents, setSelectedComponents] = useState<number[]>([]);
  const [selectedTestCases, setSelectedTestCases] = useState<number[]>([]);
  const [expandedModules, setExpandedModules] = useState<number[]>([]);
  const [selectionMode, setSelectionMode] = useState<"smart" | "manual">("smart");

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: modules } = useQuery({
    queryKey: ["/api/modules"],
    enabled: !!selectedProject,
  });

  const { data: components } = useQuery({
    queryKey: ["/api/components"],
    enabled: !!selectedProject,
  });

  const { data: testCases } = useQuery({
    queryKey: ["/api/test-cases"],
    enabled: !!selectedProject,
  });

  const form = useForm<InsertTestSuite>({
    resolver: zodResolver(insertTestSuiteSchema),
    defaultValues: {
      name: "",
      description: "",
      projectId: 0,
      createdBy: 1,
    },
  });

  // Filter data based on selected project
  const filteredModules = (modules || []).filter((module: any) => module.projectId === selectedProject);
  const filteredComponents = (components || []).filter((component: any) => 
    selectedModules.length > 0 
      ? selectedModules.includes(component.moduleId)
      : filteredModules.some((module: any) => module.id === component.moduleId)
  );
  const filteredTestCases = (testCases || []).filter((testCase: any) => {
    if (selectedComponents.length > 0) {
      return selectedComponents.includes(testCase.componentId);
    }
    if (selectedModules.length > 0) {
      return selectedModules.includes(testCase.moduleId);
    }
    return filteredModules.some((module: any) => module.id === testCase.moduleId);
  });

  // Auto-select test cases based on smart selection
  useEffect(() => {
    if (selectionMode === "smart") {
      const autoSelectedTestCases = filteredTestCases.map((tc: any) => tc.id);
      setSelectedTestCases(autoSelectedTestCases);
    }
  }, [selectedModules, selectedComponents, selectionMode]);

  const handleModuleToggle = (moduleId: number) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
    // Clear component selection when module changes
    setSelectedComponents([]);
  };

  const handleComponentToggle = (componentId: number) => {
    setSelectedComponents(prev => 
      prev.includes(componentId) 
        ? prev.filter(id => id !== componentId)
        : [...prev, componentId]
    );
  };

  const handleTestCaseToggle = (testCaseId: number) => {
    setSelectedTestCases(prev => 
      prev.includes(testCaseId) 
        ? prev.filter(id => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const toggleModuleExpansion = (moduleId: number) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const createTestSuiteMutation = useMutation({
    mutationFn: async (data: InsertTestSuite & { testCaseIds: number[] }) => {
      const response = await apiRequest("POST", "/api/test-suites", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-suites"] });
      toast({
        title: "Test suite created",
        description: `Test suite created with ${selectedTestCases.length} test cases.`,
      });
      onOpenChange(false);
      form.reset();
      setSelectedProject(null);
      setSelectedModules([]);
      setSelectedComponents([]);
      setSelectedTestCases([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create test suite. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTestSuite) => {
    if (selectedTestCases.length === 0) {
      toast({
        title: "No test cases selected",
        description: "Please select at least one test case for the test suite.",
        variant: "destructive",
      });
      return;
    }

    createTestSuiteMutation.mutate({
      ...data,
      projectId: selectedProject!,
      testCaseIds: selectedTestCases,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Test Suite</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Suite Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter test suite name" {...field} />
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
                        placeholder="Describe the test suite" 
                        className="min-h-10"
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Project Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project *</label>
                <Select value={selectedProject?.toString()} onValueChange={(value) => {
                  setSelectedProject(parseInt(value));
                  setSelectedModules([]);
                  setSelectedComponents([]);
                  setSelectedTestCases([]);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject && (
                <Tabs value={selectionMode} onValueChange={(value) => setSelectionMode(value as "smart" | "manual")}>
                  <TabsList>
                    <TabsTrigger value="smart">Smart Selection</TabsTrigger>
                    <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                  </TabsList>

                  <TabsContent value="smart" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Smart Test Case Selection</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Module Selection */}
                        <div>
                          <h4 className="font-medium mb-2">Select Modules</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {filteredModules.map((module: any) => (
                              <div key={module.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={selectedModules.includes(module.id)}
                                  onCheckedChange={() => handleModuleToggle(module.id)}
                                />
                                <Package className="w-4 h-4" />
                                <span className="text-sm">{module.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Component Selection */}
                        {selectedModules.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Select Components (Optional)</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {filteredComponents.map((component: any) => (
                                <div key={component.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedComponents.includes(component.id)}
                                    onCheckedChange={() => handleComponentToggle(component.id)}
                                  />
                                  <Layers className="w-4 h-4" />
                                  <span className="text-sm">{component.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Selected Test Cases Summary */}
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                          <h4 className="font-medium mb-2">Selected Test Cases ({filteredTestCases.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {filteredTestCases.slice(0, 5).map((testCase: any) => (
                              <Badge key={testCase.id} variant="secondary">
                                {testCase.testCaseId}
                              </Badge>
                            ))}
                            {filteredTestCases.length > 5 && (
                              <Badge variant="outline">+{filteredTestCases.length - 5} more</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="manual" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Manual Test Case Selection</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                          {filteredModules.map((module: any) => (
                            <div key={module.id} className="border rounded-lg p-3">
                              <div 
                                className="flex items-center space-x-2 cursor-pointer"
                                onClick={() => toggleModuleExpansion(module.id)}
                              >
                                {expandedModules.includes(module.id) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <Package className="w-4 h-4" />
                                <span className="font-medium">{module.name}</span>
                              </div>

                              {expandedModules.includes(module.id) && (
                                <div className="mt-3 ml-6 space-y-2">
                                  {testCases?.filter((tc: any) => tc.moduleId === module.id).map((testCase: any) => (
                                    <div key={testCase.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={selectedTestCases.includes(testCase.id)}
                                        onCheckedChange={() => handleTestCaseToggle(testCase.id)}
                                      />
                                      <TestTube className="w-4 h-4" />
                                      <div className="flex-1">
                                        <span className="text-sm font-medium">{testCase.testCaseId}</span>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-400">{testCase.title}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTestSuiteMutation.isPending || !selectedProject || selectedTestCases.length === 0}
              >
                {createTestSuiteMutation.isPending ? "Creating..." : `Create Test Suite (${selectedTestCases.length} tests)`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}