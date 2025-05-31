import { useState, useEffect } from "react";
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
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: testCases } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const { data: testSuites } = useQuery({
    queryKey: ["/api/test-suites"],
  });

  // Get test cases for selected test suites
  const { data: testSuiteTestCases } = useQuery({
    queryKey: ["/api/test-suites/test-cases", selectedTestSuites],
    queryFn: async () => {
      if (selectedTestSuites.length === 0) return [];
      
      const allTestCases = [];
      for (const suiteId of selectedTestSuites) {
        const response = await fetch(`/api/test-suites/${suiteId}/test-cases`);
        const suiteTestCases = await response.json();
        allTestCases.push(...suiteTestCases);
      }
      return allTestCases;
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

  // Combine test cases from test suites and manually selected ones, avoiding duplicates
  const allSelectedTestCases = (() => {
    const suiteTestCaseIds = (testSuiteTestCases as any[])?.map(tc => tc.id) || [];
    const combined = [...suiteTestCaseIds, ...selectedTestCases];
    const unique = combined.filter((id, index) => combined.indexOf(id) === index);
    return unique;
  })();

  // Reset selections when project changes
  useEffect(() => {
    setSelectedTestSuites([]);
    setSelectedTestCases([]);
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
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/test-runs", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test run created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      form.reset();
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

  const onSubmit = (data: FormData) => {
    createTestRunMutation.mutate(data);
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
                                  if (checked) {
                                    setSelectedTestSuites([...selectedTestSuites, testSuite.id]);
                                  } else {
                                    setSelectedTestSuites(selectedTestSuites.filter(id => id !== testSuite.id));
                                  }
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
                              onClick={() => setSelectedTestSuites(projectTestSuites.map(ts => ts.id))}
                            >
                              Select All Suites
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTestSuites([])}
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
                                    if (checked) {
                                      setSelectedTestCases([...selectedTestCases, testCase.id]);
                                    } else {
                                      setSelectedTestCases(selectedTestCases.filter(id => id !== testCase.id));
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
                              }}
                            >
                              Select All Available
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTestCases([])}
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
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTestRunMutation.isPending}>
                {createTestRunMutation.isPending ? "Creating..." : "Create Test Run"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}