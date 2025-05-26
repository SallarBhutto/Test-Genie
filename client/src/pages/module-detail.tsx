import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Component, Plus } from "lucide-react";
import { Link, useParams } from "wouter";
import type { Module, Component as ComponentType, Project } from "@shared/schema";

export default function ModuleDetail() {
  const { id } = useParams();
  const moduleId = parseInt(id!);

  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ["/api/modules", moduleId],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: components = [], isLoading: componentsLoading } = useQuery({
    queryKey: ["/api/components"],
  });

  if (moduleLoading || projectsLoading || componentsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <Layers className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
          Module not found
        </h3>
        <Link href="/modules">
          <Button>Go back to Modules</Button>
        </Link>
      </div>
    );
  }

  const moduleComponents = (components as ComponentType[]).filter(
    (component) => component.moduleId === moduleId
  );

  const project = (projects as Project[]).find(
    (p) => p.id === (module as Module).projectId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/modules">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Modules
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {(module as Module).name}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-300 mt-1">
              {project && (
                <Link href={`/projects/${project.id}`} className="hover:underline">
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {project.name}
                  </span>
                </Link>
              )}
            </p>
            <p className="text-neutral-600 dark:text-neutral-300 mt-2">
              {(module as Module).description || "No description provided"}
            </p>
          </div>
        </div>
        <Link href="/components">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Component
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {moduleComponents.length}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Components</p>
              </div>
              <Component className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  Active
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Status</p>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Module
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Date((module as Module).createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Created</p>
              </div>
              <Layers className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          Components in this Module
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleComponents.map((component) => (
            <Link key={component.id} href={`/components/${component.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{component.name}</span>
                    <Badge variant="outline">Component</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-4">
                    {component.description || "No description provided"}
                  </p>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Created {new Date(component.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {moduleComponents.length === 0 && (
            <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-700">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Component className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  No components in this module yet
                </p>
                <Link href="/components">
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Component
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}