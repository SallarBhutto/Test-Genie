import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChevronDown, ChevronRight, Search } from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTestCases, setSelectedTestCases] = useState<number[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  // Fetch test suite details
  const { data: testSuite } = useQuery({
    queryKey: ["/api/test-suites", testSuiteId, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/test-suites/${testSuiteId}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.json();
    },
    enabled: open && !!testSuiteId,
  });

  // Fetch all test cases with fresh data
  const { data: testCasesResponse } = useQuery({
    queryKey: ["/api/test-cases-modal-all"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: '1000', // Large limit to get all test cases
      });
      
      const response = await fetch(`/api/test-cases?${params}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch test cases');
      }
      return response.json();
    },
  });

  const testCases = testCasesResponse?.data || [];

  // Fetch modules and components with fresh data
  const { data: modules } = useQuery({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      const response = await fetch("/api/modules", {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.json();
    },
  });

  const { data: components } = useQuery({
    queryKey: ["/api/components"],
    queryFn: async () => {
      const response = await fetch("/api/components", {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.json();
    },
  });

  // Fetch existing test cases in this test suite
  const { data: existingTestCases } = useQuery({
    queryKey: ["/api/test-suites", testSuiteId, "test-cases"],
    queryFn: async () => {
      const response = await fetch(`/api/test-suites/${testSuiteId}/test-cases`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.json();
    },
    enabled: open && !!testSuiteId,
  });

  const addTestCasesMutation = useMutation({
    mutationFn: async (testCaseIds: number[]) => {
      const response = await apiRequest("POST", `/api/test-suites/${testSuiteId}/test-cases`, {
        testCaseIds
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-suites", testSuiteId, "test-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-suites"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add test cases. Please try again.",
        variant: "destructive",
      });
    },
  });

  const removeTestCaseMutation = useMutation({
    mutationFn: async (testCaseId: number) => {
      const response = await apiRequest("DELETE", `/api/test-suites/${testSuiteId}/test-cases/${testCaseId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/test-suites", testSuiteId, "test-cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-suites"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove test case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const existingTestCaseIds = Array.isArray(existingTestCases) 
    ? existingTestCases.map((tc: any) => tc.id) 
    : [];

  const testSuiteProjectId = (testSuite as any)?.projectId;

  // Show all test cases from the same project as the test suite
  const projectTestCases = Array.isArray(testCases) 
    ? testCases.filter((tc: any) => tc.projectId === testSuiteProjectId)
    : [];

  // Debug logging
  console.log("Debug Info:", {
    testSuite,
    testSuiteProjectId,
    allTestCases: testCases,
    projectTestCases,
    modules,
    components,
    existingTestCaseIds
  });

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

  // Initialize selected test cases with existing ones when modal opens
  React.useEffect(() => {
    if (open && existingTestCases && Array.isArray(existingTestCases)) {
      setSelectedTestCases(existingTestCases.map((tc: any) => tc.id));
    } else if (!open) {
      // Reset selections when modal closes
      setSelectedTestCases([]);
    }
  }, [open, existingTestCases]);

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

  const handleAddTestCases = async () => {
    try {
      // Find test cases to add (newly selected)
      const testCasesToAdd = selectedTestCases.filter(id => !existingTestCaseIds.includes(id));
      
      // Find test cases to remove (previously selected but now deselected)
      const testCasesToRemove = existingTestCaseIds.filter(id => !selectedTestCases.includes(id));
      
      let addedCount = 0;
      let removedCount = 0;
      
      // Remove deselected test cases
      for (const testCaseId of testCasesToRemove) {
        await removeTestCaseMutation.mutateAsync(testCaseId);
        removedCount++;
      }
      
      // Add newly selected test cases
      if (testCasesToAdd.length > 0) {
        await addTestCasesMutation.mutateAsync(testCasesToAdd);
        addedCount = testCasesToAdd.length;
      }
      
      // Show success message
      if (addedCount > 0 || removedCount > 0) {
        const messages = [];
        if (addedCount > 0) messages.push(`${addedCount} test cases added`);
        if (removedCount > 0) messages.push(`${removedCount} test cases removed`);
        
        toast({
          title: "Test suite updated",
          description: messages.join(", ") + ".",
        });
        
        onOpenChange(false);
        setSelectedTestCases([]);
        setSearchQuery("");
      } else {
        toast({
          title: "No changes",
          description: "No changes were made to the test suite.",
        });
      }
    } catch (error) {
      console.error("Error updating test suite:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Test Cases to {testSuiteName}</DialogTitle>
        </DialogHeader>
        
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
                                          <span className="font-mono text-sm text-blue-600">{testCase.testCaseId}</span>
                                          <Badge variant={testCase.priority === 'critical' ? 'destructive' : testCase.priority === 'high' ? 'default' : 'secondary'}>
                                            {testCase.priority}
                                          </Badge>
                                          <Badge variant="outline">{testCase.status}</Badge>
                                        </div>
                                        <div className="text-sm text-gray-700 mt-1">{testCase.title}</div>
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
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedTestCases.length} test case{selectedTestCases.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddTestCases}
                disabled={
                  (addTestCasesMutation.isPending || removeTestCaseMutation.isPending) ||
                  (() => {
                    const testCasesToAdd = selectedTestCases.filter(id => !existingTestCaseIds.includes(id));
                    const testCasesToRemove = existingTestCaseIds.filter(id => !selectedTestCases.includes(id));
                    return testCasesToAdd.length === 0 && testCasesToRemove.length === 0;
                  })()
                }
              >
                {(addTestCasesMutation.isPending || removeTestCaseMutation.isPending) ? "Updating..." : 
                  (() => {
                    const testCasesToAdd = selectedTestCases.filter(id => !existingTestCaseIds.includes(id));
                    const testCasesToRemove = existingTestCaseIds.filter(id => !selectedTestCases.includes(id));
                    
                    if (testCasesToAdd.length === 0 && testCasesToRemove.length === 0) {
                      return "No Changes";
                    }
                    
                    const actions = [];
                    if (testCasesToAdd.length > 0) actions.push(`Add ${testCasesToAdd.length}`);
                    if (testCasesToRemove.length > 0) actions.push(`Remove ${testCasesToRemove.length}`);
                    
                    return actions.join(" & ");
                  })()
                }
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}