import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Component, FileText, Plus } from "lucide-react";
import { Link, useParams } from "wouter";
import type { Component as ComponentType, Module, Project, TestCase } from "@shared/schema";

export default function ComponentDetail() {
  const { id } = useParams();
  const componentId = parseInt(id!);

  const { data: component, isLoading: componentLoading } = useQuery({
    queryKey: ["/api/components", componentId],
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ["/api/modules"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: testCasesResponse, isLoading: testCasesLoading } = useQuery({
    queryKey: ["/api/test-cases", { limit: 1000 }],
    queryFn: () => fetch(`/api/test-cases?limit=1000`).then(res => res.json())
  });

  const testCases = testCasesResponse?.data || [];

  if (componentLoading || modulesLoading || projectsLoading || testCasesLoading) {
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

  if (!component) {
    return (
      <div className="text-center py-12">
        <Component className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
          Component not found
        </h3>
        <Link href="/components">
          <Button>Go back to Components</Button>
        </Link>
      </div>
    );
  }

  const componentTestCases = (testCases as TestCase[]).filter(
    (testCase) => testCase.componentId === componentId
  );

  const module = (modules as Module[]).find(
    (m) => m.id === (component as ComponentType).moduleId
  );

  const project = module ? (projects as Project[]).find(
    (p) => p.id === module.projectId
  ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/components">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Components
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
              {(component as ComponentType).name}
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              {project && (
                <>
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    <span className="text-sm text-blue-600 dark:text-blue-400">
                      {project.name}
                    </span>
                  </Link>
                  <span className="text-neutral-400">›</span>
                </>
              )}
              {module && (
                <Link href={`/modules/${module.id}`} className="hover:underline">
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {module.name}
                  </span>
                </Link>
              )}
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 mt-2">
              {(component as ComponentType).description || "No description provided"}
            </p>
          </div>
        </div>
        <Link href="/test-cases">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Test Case
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {componentTestCases.length}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Total Test Cases</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
                Component
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Date((component as ComponentType).createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Created</p>
              </div>
              <Component className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          Test Cases in this Component
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {componentTestCases.map((testCase) => (
            <Card key={testCase.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>{testCase.title}</span>
                  <Badge variant="outline">{testCase.testCaseId}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-600 dark:text-neutral-300 text-sm mb-3">
                  {testCase.description || "No description provided"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant={
                    testCase.status === "passed" ? "default" :
                    testCase.status === "failed" ? "destructive" :
                    "secondary"
                  }>
                    {testCase.status}
                  </Badge>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Priority: {testCase.priority}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                  Created {new Date(testCase.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}

          {componentTestCases.length === 0 && (
            <Card className="border-dashed border-2 border-neutral-300 dark:border-neutral-700">
              <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                <FileText className="w-8 h-8 text-neutral-400 mb-2" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  No test cases in this component yet
                </p>
                <Link href="/test-cases">
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test Case
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