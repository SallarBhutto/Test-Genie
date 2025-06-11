import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Plus, Layers, FileText, Filter } from "lucide-react";
import { Link, useParams } from "wouter";
import CreateComponentModal from "@/components/modals/create-component-modal";
import { useProject } from "@/contexts/ProjectContext";
import { useSorting } from "@/hooks/useSorting";
import type { Component, Module, TestCase, Project } from "@shared/schema";

export default function Components() {
  const { moduleId } = useParams();
  const { selectedProject } = useProject();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedModuleId, setSelectedModuleId] = useState<string>(moduleId || "all");

  // Update local project filter when header project changes
  useEffect(() => {
    if (selectedProject) {
      setSelectedProjectId(selectedProject.id.toString());
    } else {
      setSelectedProjectId("all");
    }
  }, [selectedProject]);
  
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/modules"],
  });

  const { data: components = [], isLoading: componentsLoading } = useQuery({
    queryKey: ["/api/components"],
  });

  const { data: testCases = [], isLoading: testCasesLoading } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  // Filter modules by selected project
  const filteredModules = selectedProjectId === "all" ? 
    (modules as Module[]) : 
    (modules as Module[]).filter(module => module.projectId === parseInt(selectedProjectId));

  // Filter components by selected project and module
  const filteredComponents = (components as Component[]).filter(component => {
    const componentModule = (modules as Module[]).find(m => m.id === component.moduleId);
    
    // Filter by project
    if (selectedProjectId !== "all" && componentModule?.projectId !== parseInt(selectedProjectId)) {
      return false;
    }
    
    // Filter by module
    if (selectedModuleId !== "all" && component.moduleId !== parseInt(selectedModuleId)) {
      return false;
    }
    
    return true;
  });

  const currentModule = selectedModuleId !== "all" ? 
    (modules as Module[]).find((m: Module) => m.id === parseInt(selectedModuleId)) : null;

  const { sortedData: sortedComponents, sortConfig, requestSort } = useSorting(filteredComponents, "createdAt");

  if (projectsLoading || modulesLoading || componentsLoading || testCasesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Components</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Component
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Components
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and organize your application components
          </p>
        </div>
        <Button className="ml-auto" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Component
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Filter by:</span>
            </div>
            
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {(projects as Project[]).map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {filteredModules.map((module) => (
                  <SelectItem key={module.id} value={module.id.toString()}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {filteredComponents.length} component{filteredComponents.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedComponents.map((component) => {
          const componentTestCases = (testCases as TestCase[]).filter(
            tc => tc.componentId === component.id
          );

          return (
            <Link key={component.id} href={`/components/${component.id}/test-cases`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                        <Layers className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{component.name}</CardTitle>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                          {component.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {componentTestCases.length} test cases
                        </span>
                      </div>
                      <Badge variant="outline">Component</Badge>
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Created {new Date(component.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {filteredComponents.length === 0 && (
          <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-700">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Layers className="w-8 h-8 text-neutral-400 mb-2" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {currentModule ? `No components in ${currentModule.name} yet` : 'No components yet'}
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateComponentModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        modules={filteredModules}
        selectedModuleId={selectedModuleId !== "all" ? parseInt(selectedModuleId) : undefined}
      />
    </div>
  );
}