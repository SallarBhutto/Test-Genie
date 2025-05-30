import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus } from "lucide-react";

interface AddTestCasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSuiteId: number;
  testSuiteName: string;
}

export default function AddTestCasesModal({ 
  open, 
  onOpenChange, 
  testSuiteId, 
  testSuiteName 
}: AddTestCasesModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTestCases, setSelectedTestCases] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");

  const { data: testCases } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: existingTestCases } = useQuery({
    queryKey: ["/api/test-suites", testSuiteId, "test-cases"],
    enabled: open,
  });

  const addTestCasesMutation = useMutation({
    mutationFn: async (testCaseIds: number[]) => {
      const response = await apiRequest("POST", `/api/test-suites/${testSuiteId}/test-cases`, {
        testCaseIds
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-suites", testSuiteId, "test-cases"] });
      toast({
        title: "Test cases added",
        description: `${selectedTestCases.length} test cases have been added to the test suite.`,
      });
      onOpenChange(false);
      setSelectedTestCases([]);
      setSearchQuery("");
      setSelectedProject("all");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add test cases. Please try again.",
        variant: "destructive",
      });
    },
  });

  const existingTestCaseIds = Array.isArray(existingTestCases) 
    ? existingTestCases.map((tc: any) => tc.id) 
    : [];

  const availableTestCases = Array.isArray(testCases) 
    ? testCases.filter((tc: any) => !existingTestCaseIds.includes(tc.id))
    : [];

  const filteredTestCases = availableTestCases.filter((testCase: any) => {
    const matchesSearch = testCase.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         testCase.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProject === "all" || 
                          testCase.projectId?.toString() === selectedProject;
    return matchesSearch && matchesProject;
  });

  const getProjectName = (projectId: number) => {
    const project = Array.isArray(projects) ? projects.find((p: any) => p.id === projectId) : null;
    return project?.name || "Unknown Project";
  };

  const handleTestCaseToggle = (testCaseId: number) => {
    setSelectedTestCases(prev => 
      prev.includes(testCaseId)
        ? prev.filter(id => id !== testCaseId)
        : [...prev, testCaseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTestCases.length === filteredTestCases.length) {
      setSelectedTestCases([]);
    } else {
      setSelectedTestCases(filteredTestCases.map((tc: any) => tc.id));
    }
  };

  const handleAddTestCases = () => {
    if (selectedTestCases.length > 0) {
      addTestCasesMutation.mutate(selectedTestCases);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Test Cases to "{testSuiteName}"</DialogTitle>
          <DialogDescription>
            Select test cases to add to this test suite. Only test cases not already in the suite are shown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Search test cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {Array.isArray(projects) && projects.map((project: any) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedTestCases.length === filteredTestCases.length && filteredTestCases.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select all ({filteredTestCases.length} test cases)
              </label>
            </div>
            <div className="text-sm text-neutral-600">
              {selectedTestCases.length} selected
            </div>
          </div>

          {/* Test Cases List */}
          <ScrollArea className="h-96 border rounded-lg">
            <div className="p-4 space-y-3">
              {filteredTestCases.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Plus className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
                  <p className="font-medium">No available test cases</p>
                  <p className="text-sm">
                    {availableTestCases.length === 0 
                      ? "All test cases are already in this test suite or no test cases exist."
                      : "No test cases match your current filters."
                    }
                  </p>
                </div>
              ) : (
                filteredTestCases.map((testCase: any) => (
                  <div 
                    key={testCase.id}
                    className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <Checkbox
                      id={`testcase-${testCase.id}`}
                      checked={selectedTestCases.includes(testCase.id)}
                      onCheckedChange={() => handleTestCaseToggle(testCase.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <label 
                          htmlFor={`testcase-${testCase.id}`}
                          className="font-medium text-sm cursor-pointer"
                        >
                          {testCase.title}
                        </label>
                        <Badge variant="secondary" className="text-xs">
                          {testCase.testCaseId}
                        </Badge>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                        {testCase.description || "No description"}
                      </p>
                      <div className="flex gap-2">
                        {testCase.projectId && (
                          <Badge variant="outline" className="text-xs">
                            {getProjectName(testCase.projectId)}
                          </Badge>
                        )}
                        <Badge 
                          variant={testCase.priority === "High" ? "destructive" : 
                                  testCase.priority === "Medium" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {testCase.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {testCase.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddTestCases}
              disabled={selectedTestCases.length === 0 || addTestCasesMutation.isPending}
            >
              {addTestCasesMutation.isPending 
                ? "Adding..." 
                : `Add ${selectedTestCases.length} Test Case${selectedTestCases.length === 1 ? '' : 's'}`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}