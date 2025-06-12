import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Layers, Plus } from "lucide-react";
import { Link, useParams } from "wouter";
import type { Project, Module } from "@shared/schema";

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = parseInt(id!);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then(res => res.json()),
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/modules"],
  });

  if (projectLoading || modulesLoading) {
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

  if (!project) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
          Project not found
        </h3>
        <Link href="/projects">
          <Button>Go back to Projects</Button>
        </Link>
      </div>
    );
  }

  const projectModules = (modules as Module[]).filter(
    (module) => module.projectId === projectId
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <Link href="/modules">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
          </Link>
        </div>
        
        <div className="max-w-4xl">
          <h1 
            className="text-3xl font-bold text-neutral-900 dark:text-white break-words"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
          >
            {(project as Project).name}
          </h1>
          <p 
            className="text-neutral-600 dark:text-neutral-300 mt-2 break-words"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word'
            }}
          >
            {(project as Project).description || "No description provided"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {projectModules.length}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Modules</p>
              </div>
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {(project as Project).status}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Status</p>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Date((project as Project).createdAt).toLocaleDateString()}
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
          Modules in this Project
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectModules.map((module) => (
            <Link key={module.id} href={`/modules/${module.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    <span>{module.name}</span>
                    <Badge variant="outline">Module</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-4">
                    {module.description || "No description provided"}
                  </p>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Created {new Date(module.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {projectModules.length === 0 && (
            <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-700">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <Package className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  No modules in this project yet
                </p>
                <Link href="/modules">
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Module
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