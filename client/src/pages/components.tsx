import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, FileText } from "lucide-react";
import { Link, useParams } from "wouter";
import CreateComponentModal from "@/components/modals/create-component-modal";
import type { Component, Module, TestCase } from "@shared/schema";

export default function Components() {
  const { moduleId } = useParams();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/modules"],
  });

  const { data: components = [], isLoading: componentsLoading } = useQuery({
    queryKey: ["/api/components"],
  });

  const { data: testCases = [], isLoading: testCasesLoading } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const currentModule = moduleId ? modules.find((m: Module) => m.id === parseInt(moduleId)) : null;
  const moduleComponents = moduleId ? 
    (components as Component[]).filter(comp => comp.moduleId === parseInt(moduleId)) :
    (components as Component[]);

  if (modulesLoading || componentsLoading || testCasesLoading) {
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
          <div className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            <Link href="/modules">
              <span className="hover:text-primary cursor-pointer">Modules</span>
            </Link>
            {currentModule && (
              <>
                <span>/</span>
                <span className="text-neutral-900 dark:text-white font-medium">
                  {currentModule.name}
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            {currentModule ? `${currentModule.name} Components` : 'All Components'}
          </h1>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Component
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moduleComponents.map((component) => {
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

        {moduleComponents.length === 0 && (
          <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-700">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              <Layers className="w-8 h-8 text-neutral-400 mb-2" />
              <p className="text-neutral-500 dark:text-neutral-400">
                {currentModule ? `No components in ${currentModule.name} yet` : 'No components yet'}
              </p>
              <Button variant="outline" size="sm" className="mt-2">
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
        modules={modules as Module[]}
      />
    </div>
  );
}