import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Component } from "lucide-react";
import { Link } from "wouter";
import CreateModuleModal from "@/components/modals/create-module-modal";
import { useProject } from "@/contexts/ProjectContext";
import type { Module, Project } from "@shared/schema";

export default function Modules() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { selectedProject } = useProject();
  
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/modules", selectedProject?.id],
  });

  if (projectsLoading || modulesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Modules</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Module
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
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Modules</h1>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Module
        </Button>
      </div>

      {projects.map((project: Project) => {
        const projectModules = (modules as Module[]).filter(
          module => module.projectId === project.id
        );

        return (
          <div key={project.id} className="space-y-4">
            <div className="flex items-center space-x-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {project.name}
              </h2>
              <Badge variant="secondary">{projectModules.length} modules</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectModules.map((module) => (
                <Link key={module.id} href={`/modules/${module.id}/components`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                            <Component className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{module.name}</CardTitle>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                              {module.description || "No description"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500 dark:text-neutral-400">
                          Created {new Date(module.createdAt).toLocaleDateString()}
                        </span>
                        <Badge variant="outline">Module</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {projectModules.length === 0 && (
                <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-700">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <Component className="w-8 h-8 text-neutral-400 mb-2" />
                    <p className="text-neutral-500 dark:text-neutral-400">No modules yet</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Module
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );
      })}

      {projects.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No projects found
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            Create a project first to organize your modules
          </p>
          <Link href="/projects">
            <Button>Go to Projects</Button>
          </Link>
        </div>
      )}

      <CreateModuleModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        projects={projects as Project[]}
      />
    </div>
  );
}