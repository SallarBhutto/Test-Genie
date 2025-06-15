import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTestRunSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertTestRunSchema.extend({
  projectId: z.number().min(1, "Project is required"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTestRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTestRunModal({ open, onOpenChange }: CreateTestRunModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTestCases, setSelectedTestCases] = useState<number[]>([]);
  const [selectedTestSuites, setSelectedTestSuites] = useState<number[]>([]);
  const [selectionOrder, setSelectionOrder] = useState<Array<{type: 'suite' | 'case', id: number}>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: testCasesResponse } = useQuery({
    queryKey: ["/api/test-cases-all"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Large limit to get all test cases
      });
      
      const response = await fetch(`/api/test-cases?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch test cases');
      }
      return response.json();
    },
  });

  const testCases = testCasesResponse?.data || [];

  const { data: testSuites } = useQuery({
    queryKey: ["/api/test-suites"],
  });

  // Get test cases for selected test suites, maintaining order
  const { data: testSuiteTestCases } = useQuery({
    queryKey: ["/api/test-suites/test-cases", selectedTestSuites, selectionOrder],
    queryFn: async () => {
      if (selectedTestSuites.length === 0) return [];
      
      const orderedTestCases = [];
      // Process test suites in selection order
      for (const selection of selectionOrder) {
        if (selection.type === 'suite' && selectedTestSuites.includes(selection.id)) {
          const response = await fetch(`/api/test-suites/${selection.id}/test-cases`);
          const suiteTestCases = await response.json();
          orderedTestCases.push(...suiteTestCases.map((tc: any) => ({ ...tc, fromSuiteId: selection.id })));
        }
      }
      return orderedTestCases;
    },
    enabled: selectedTestSuites.length > 0,
  });

  // Filter test suites by selected project
  const projectTestSuites = (testSuites as any[])?.filter(
    suite => selectedProjectId ? suite.projectId === selectedProjectId : false
  ) || [];

  // Filter test cases by selected project
  const projectTestCases = (testCases as any[])?.filter(
    testCase => selectedProjectId ? testCase.projectId === selectedProjectId : false
  ) || [];

  // Combine test cases maintaining selection order
  const allSelectedTestCases = (() => {
    const orderedTestCaseIds: number[] = [];
    const seenIds = new Set<number>();
    
    // Process selections in order
    for (const selection of selectionOrder) {
      if (selection.type === 'suite') {
        // Add test cases from this specific suite
        const suiteTestCases = (testSuiteTestCases as any[])?.filter(tc => 
          tc.fromSuiteId === selection.id
        ) || [];
        for (const testCase of suiteTestCases) {
          if (!seenIds.has(testCase.id)) {
            orderedTestCaseIds.push(testCase.id);
            seenIds.add(testCase.id);
          }
        }
      } else if (selection.type === 'case') {
        // Add individual test case
        if (!seenIds.has(selection.id)) {
          orderedTestCaseIds.push(selection.id);
          seenIds.add(selection.id);
        }
      }
    }
    
    // Add any remaining selected test cases not in selection order (fallback)
    for (const testCaseId of selectedTestCases) {
      if (!seenIds.has(testCaseId)) {
        orderedTestCaseIds.push(testCaseId);
        seenIds.add(testCaseId);
      }
    }
    
    return orderedTestCaseIds;
  })();

  // Reset selections when project changes
  useEffect(() => {
    setSelectedTestSuites([]);
    setSelectedTestCases([]);
    setSelectionOrder([]);
  }, [selectedProjectId]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      projectId: 0,
      status: "not_started",
      createdBy: 1,
    },
  });

  const createTestRunMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/test-runs", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test run created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create test run. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset();
    setSelectedTestCases([]);
    setSelectedTestSuites([]);
    setSelectionOrder([]);
    setSelectedProjectId(null);
  };

  // Handler for test suite selection that tracks order
  const handleTestSuiteSelection = (suiteId: number, checked: boolean) => {
    if (checked) {
      setSelectedTestSuites(prev => [...prev, suiteId]);
      setSelectionOrder(prev => [...prev, { type: 'suite', id: suiteId }]);
    } else {
      setSelectedTestSuites(prev => prev.filter(id => id !== suiteId));
      setSelectionOrder(prev => prev.filter(item => !(item.type === 'suite' && item.id === suiteId)));
    }
  };

  // Handler for individual test case selection that tracks order
  const handleTestCaseSelection = (testCaseId: number, checked: boolean) => {
    if (checked) {
      setSelectedTestCases(prev => [...prev, testCaseId]);
      setSelectionOrder(prev => [...prev, { type: 'case', id: testCaseId }]);
    } else {
      setSelectedTestCases(prev => prev.filter(id => id !== testCaseId));
      setSelectionOrder(prev => prev.filter(item => !(item.type === 'case' && item.id === testCaseId)));
    }
  };

  const onSubmit = (data: FormData) => {
    if (allSelectedTestCases.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one test case or test suite.",
        variant: "destructive",
      });
      return;
    }

    const submissionData = {
      ...data,
      testCaseIds: allSelectedTestCases,
    };
    createTestRunMutation.mutate(submissionData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Test Run</DialogTitle>
          <DialogDescription>
            Start a new test execution cycle for your project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      const projectId = Number(value);
                      field.onChange(projectId);
                      setSelectedProjectId(projectId);
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Run Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sprint 12 Regression Testing" {...field} />
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
                      placeholder="Complete regression testing for all login functionality"
                      rows={3}
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="aborted">Aborted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Suite and Test Case Selection */}
            {selectedProjectId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <FormLabel>Select Test Content</FormLabel>
                  <Badge variant="secondary">
                    {allSelectedTestCases.length} test cases selected
                  </Badge>
                </div>
                
                <Tabs defaultValue="suites" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="suites">Test Suites</TabsTrigger>
                    <TabsTrigger value="cases">Individual Test Cases</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="suites" className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Select test suites to automatically include all their test cases
                    </div>
                    <ScrollArea className="h-48 border rounded-md p-3">
                      {projectTestSuites.length > 0 ? (
                        <div className="space-y-2">
                          {projectTestSuites.map((testSuite) => (
                            <div key={testSuite.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`testsuite-${testSuite.id}`}
                                checked={selectedTestSuites.includes(testSuite.id)}
                                onCheckedChange={(checked) => {
                                  handleTestSuiteSelection(testSuite.id, !!checked);
                                }}
                              />
                              <label
                                htmlFor={`testsuite-${testSuite.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{testSuite.name}</div>
                                    {testSuite.description && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        {testSuite.description}
                                      </div>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    Suite
                                  </Badge>
                                </div>
                              </label>
                            </div>
                          ))}
                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newSuiteIds = projectTestSuites.map(ts => ts.id).filter(id => !selectedTestSuites.includes(id));
                                setSelectedTestSuites([...selectedTestSuites, ...newSuiteIds]);
                                setSelectionOrder(prev => [
                                  ...prev,
                                  ...newSuiteIds.map(id => ({ type: 'suite' as const, id }))
                                ]);
                              }}
                            >
                              Select All Suites
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTestSuites([]);
                                setSelectionOrder(prev => prev.filter(item => item.type !== 'suite'));
                              }}
                            >
                              Clear Suites
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500 text-center py-4">
                          No test suites available for this project.
                        </p>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="cases" className="space-y-3">
                    <div className="text-sm text-gray-600">
                      Manually select individual test cases (in addition to those from selected test suites)
                    </div>
                    <ScrollArea className="h-48 border rounded-md p-3">
                      {projectTestCases.length > 0 ? (
                        <div className="space-y-2">
                          {projectTestCases.map((testCase) => {
                            const isFromSuite = (testSuiteTestCases as any[])?.some(tc => tc.id === testCase.id);
                            const isManuallySelected = selectedTestCases.includes(testCase.id);
                            const isSelected = isFromSuite || isManuallySelected;
                            
                            return (
                              <div key={testCase.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`testcase-${testCase.id}`}
                                  checked={isSelected}
                                  disabled={isFromSuite}
                                  onCheckedChange={(checked) => {
                                    if (!isFromSuite) {
                                      handleTestCaseSelection(testCase.id, !!checked);
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`testcase-${testCase.id}`}
                                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 ${
                                    isFromSuite ? 'opacity-70' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span>{testCase.testCaseId}: {testCase.title}</span>
                                      {isFromSuite && (
                                        <span className="text-xs text-blue-600 ml-2">(from test suite)</span>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {testCase.priority}
                                    </Badge>
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                          <div className="flex gap-2 pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const availableIds = projectTestCases
                                  .filter(tc => !(testSuiteTestCases as any[])?.some(stc => stc.id === tc.id))
                                  .map(tc => tc.id);
                                const uniqueIds = availableIds.filter(id => !selectedTestCases.includes(id));
                                setSelectedTestCases([...selectedTestCases, ...uniqueIds]);
                                setSelectionOrder(prev => [
                                  ...prev,
                                  ...uniqueIds.map(id => ({ type: 'case' as const, id }))
                                ]);
                              }}
                            >
                              Select All Available
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTestCases([]);
                                setSelectionOrder(prev => prev.filter(item => item.type !== 'case'));
                              }}
                            >
                              Clear Manual Selection
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500 text-center py-4">
                          No test cases available for this project.
                        </p>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {!selectedProjectId && (
              <div className="text-sm text-neutral-500 text-center py-8 border rounded-md border-dashed">
                Please select a project first to choose test suites and test cases
              </div>
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTestRunMutation.isPending || allSelectedTestCases.length === 0}
              >
                {createTestRunMutation.isPending ? "Creating..." : `Create Test Run (${allSelectedTestCases.length} test cases)`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}