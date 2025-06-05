import React, { useState } from "react";
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
import { ChevronDown, ChevronRight, Search } from "lucide-react";

interface CreateTestSuiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTestSuiteModal({ open, onOpenChange }: CreateTestSuiteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTestCases, setSelectedTestCases] = useState<number[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: testCases } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const { data: modules } = useQuery({
    queryKey: ["/api/modules"],
  });

  const { data: components } = useQuery({
    queryKey: ["/api/components"],
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

  const selectedProjectId = form.watch("projectId");

  const addTestCasesMutation = useMutation({
    mutationFn: async ({ testSuiteId, testCaseIds }: { testSuiteId: number, testCaseIds: number[] }) => {
      const response = await apiRequest("POST", `/api/test-suites/${testSuiteId}/test-cases`, {
        testCaseIds
      });
      return response.json();
    },
  });

  const createTestSuiteMutation = useMutation({
    mutationFn: async (data: InsertTestSuite) => {
      const response = await apiRequest("POST", "/api/test-suites", data);
      return response.json();
    },
    onSuccess: async (createdTestSuite) => {
      // Add selected test cases to the newly created test suite
      if (selectedTestCases.length > 0) {
        try {
          await addTestCasesMutation.mutateAsync({
            testSuiteId: createdTestSuite.id,
            testCaseIds: selectedTestCases
          });
        } catch (error) {
          console.error("Error adding test cases:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/test-suites"] });
      toast({
        title: "Test suite created",
        description: `Test suite has been created successfully${selectedTestCases.length > 0 ? ` with ${selectedTestCases.length} test cases` : ""}.`,
      });
      onOpenChange(false);
      form.reset();
      setSelectedTestCases([]);
      setSearchQuery("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create test suite. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter test cases by selected project
  const projectTestCases = Array.isArray(testCases) && selectedProjectId > 0
    ? testCases.filter((tc: any) => tc.projectId === selectedProjectId)
    : [];

  // Group test cases by module and component for hierarchical display
  const hierarchicalData = React.useMemo(() => {
    if (!projectTestCases || !modules || !components) return {};
    
    const grouped: { 
      [moduleId: number]: { 
        module: any, 
        components: { 
          [componentId: number]: { 
            component: any, 
            testCases: any[] 
          } 
        } 
      } 
    } = {};
    
    projectTestCases.forEach(testCase => {
      const moduleId = testCase.moduleId;
      const componentId = testCase.componentId;
      
      if (!moduleId || !componentId) return;
      
      if (!grouped[moduleId]) {
        const module = Array.isArray(modules) ? modules.find((m: any) => m.id === moduleId) : null;
        grouped[moduleId] = { module, components: {} };
      }
      
      if (!grouped[moduleId].components[componentId]) {
        const component = Array.isArray(components) ? components.find((c: any) => c.id === componentId) : null;
        grouped[moduleId].components[componentId] = { component, testCases: [] };
      }
      
      grouped[moduleId].components[componentId].testCases.push(testCase);
    });
    
    return grouped;
  }, [projectTestCases, modules, components]);

  // Filter by search query
  const filteredHierarchicalData = React.useMemo(() => {
    if (!searchQuery) return hierarchicalData;
    
    const filtered: typeof hierarchicalData = {};
    
    Object.entries(hierarchicalData).forEach(([moduleIdStr, moduleData]) => {
      const moduleId = parseInt(moduleIdStr);
      
      Object.entries(moduleData.components).forEach(([componentIdStr, componentData]) => {
        const componentId = parseInt(componentIdStr);
        
        const matchingTestCases = componentData.testCases.filter(tc => 
          tc.testCaseId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tc.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        if (matchingTestCases.length > 0) {
          if (!filtered[moduleId]) {
            filtered[moduleId] = { module: moduleData.module, components: {} };
          }
          filtered[moduleId].components[componentId] = {
            component: componentData.component,
            testCases: matchingTestCases
          };
        }
      });
    });
    
    return filtered;
  }, [hierarchicalData, searchQuery]);

  const handleTestCaseToggle = (testCaseId: number) => {
    setSelectedTestCases(prev => 
      prev.includes(testCaseId) 
        ? prev.filter(id => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const handleModuleSelectAll = (moduleId: number) => {
    const moduleTestCases = Object.values(filteredHierarchicalData[moduleId]?.components || {})
      .flatMap(comp => comp.testCases.map(tc => tc.id));
    
    const allSelected = moduleTestCases.every(id => selectedTestCases.includes(id));
    
    if (allSelected) {
      setSelectedTestCases(prev => prev.filter(id => !moduleTestCases.includes(id)));
    } else {
      setSelectedTestCases(prev => [...new Set([...prev, ...moduleTestCases])]);
    }
  };

  const handleComponentSelectAll = (moduleId: number, componentId: number) => {
    const componentTestCases = filteredHierarchicalData[moduleId]?.components[componentId]?.testCases.map(tc => tc.id) || [];
    
    const allSelected = componentTestCases.every(id => selectedTestCases.includes(id));
    
    if (allSelected) {
      setSelectedTestCases(prev => prev.filter(id => !componentTestCases.includes(id)));
    } else {
      setSelectedTestCases(prev => [...new Set([...prev, ...componentTestCases])]);
    }
  };

  const toggleModuleExpansion = (moduleId: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const onSubmit = (data: InsertTestSuite) => {
    createTestSuiteMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Test Suite</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 flex-1 min-h-0">
            <Tabs defaultValue="details" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Test Suite Details</TabsTrigger>
                <TabsTrigger value="testcases">Select Test Cases</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
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
                          {...field}
                          value={field.value || ""}
                        />
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
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.isArray(projects) && projects.map((project: any) => (
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
              </TabsContent>

              <TabsContent value="testcases" className="flex-1 flex flex-col min-h-0">
                {selectedProjectId > 0 ? (
                  <div className="flex flex-col gap-4 flex-1 min-h-0">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search test cases..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Selected count */}
                    {selectedTestCases.length > 0 && (
                      <div className="text-sm text-gray-600">
                        {selectedTestCases.length} test case{selectedTestCases.length === 1 ? '' : 's'} selected
                      </div>
                    )}
                    
                    {/* Hierarchical Test Cases List */}
                    <div className="flex-1 overflow-auto border rounded-lg p-4">
                      {Object.keys(filteredHierarchicalData).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          {projectTestCases.length === 0 
                            ? "No test cases available for this project" 
                            : "No test cases match your search"}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(filteredHierarchicalData).map(([moduleIdStr, moduleData]) => {
                            const moduleId = parseInt(moduleIdStr);
                            const isExpanded = expandedModules.has(moduleId);
                            const moduleTestCases = Object.values(moduleData.components)
                              .flatMap(comp => comp.testCases.map(tc => tc.id));
                            const allSelected = moduleTestCases.length > 0 && moduleTestCases.every(id => selectedTestCases.includes(id));
                            const someSelected = moduleTestCases.some(id => selectedTestCases.includes(id));
                            
                            return (
                              <div key={moduleId} className="border rounded-lg">
                                <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleModuleExpansion(moduleId)}
                                    className="p-0 h-auto"
                                    type="button"
                                  >
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </Button>
                                  <Checkbox
                                    checked={allSelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = someSelected && !allSelected;
                                    }}
                                    onCheckedChange={() => handleModuleSelectAll(moduleId)}
                                  />
                                  <span className="font-medium">{moduleData.module?.name || `Module ${moduleId}`}</span>
                                  <Badge variant="secondary">{moduleTestCases.length} test cases</Badge>
                                </div>
                                
                                {isExpanded && (
                                  <div className="p-3 space-y-3">
                                    {Object.entries(moduleData.components).map(([componentIdStr, componentData]) => {
                                      const componentId = parseInt(componentIdStr);
                                      const componentTestCases = componentData.testCases.map(tc => tc.id);
                                      const allComponentSelected = componentTestCases.every(id => selectedTestCases.includes(id));
                                      const someComponentSelected = componentTestCases.some(id => selectedTestCases.includes(id));
                                      
                                      return (
                                        <div key={componentId} className="ml-6 border rounded">
                                          <div className="flex items-center gap-2 p-2 bg-blue-50 border-b">
                                            <Checkbox
                                              checked={allComponentSelected}
                                              ref={(el) => {
                                                if (el) el.indeterminate = someComponentSelected && !allComponentSelected;
                                              }}
                                              onCheckedChange={() => handleComponentSelectAll(moduleId, componentId)}
                                            />
                                            <span className="font-medium text-sm">{componentData.component?.name || `Component ${componentId}`}</span>
                                            <Badge variant="outline" className="text-xs">{componentTestCases.length} test cases</Badge>
                                          </div>
                                          
                                          <div className="p-2 space-y-2">
                                            {componentData.testCases.map((testCase) => (
                                              <div key={testCase.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                                                <Checkbox
                                                  checked={selectedTestCases.includes(testCase.id)}
                                                  onCheckedChange={() => handleTestCaseToggle(testCase.id)}
                                                />
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">{testCase.testCaseId}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                      {testCase.priority}
                                                    </Badge>
                                                    <Badge variant={testCase.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                                      {testCase.status}
                                                    </Badge>
                                                  </div>
                                                  <div className="text-sm text-gray-600 truncate">{testCase.title}</div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Please select a project first to view available test cases
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTestSuiteMutation.isPending}
              >
                {createTestSuiteMutation.isPending ? "Creating..." : "Create Test Suite"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}