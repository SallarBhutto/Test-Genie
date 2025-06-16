import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Users, FileText, Edit, Settings } from "lucide-react";
import CreateProjectModal from "@/components/modals/create-project-modal";
import { getQueryFn } from "@/lib/queryClient";
import type { Project } from "@shared/schema";

export default function Projects() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: testCasesResponse } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const testCases = testCasesResponse?.data || [];

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: defectsResponse } = useQuery({
    queryKey: ["/api/defects"],
  });

  const { data: testRuns = [] } = useQuery({
    queryKey: ["/api/test-runs"],
  });

  const defects = defectsResponse?.data || [];

  // Calculate project-specific statistics
  const getProjectStats = (projectId: number) => {
    const projectTestCases = testCases.filter((tc: any) => tc.projectId === projectId);
    
    // Calculate unique members who have contributed to this project
    const contributorIds = new Set();
    
    // Add users who created test cases for this project
    testCases.forEach((tc: any) => {
      if (tc.projectId === projectId && tc.createdBy) {
        contributorIds.add(tc.createdBy);
      }
      if (tc.projectId === projectId && tc.assignedTo) {
        contributorIds.add(tc.assignedTo);
      }
    });

    // Add users who worked on defects for this project
    defects.forEach((defect: any) => {
      if (defect.projectId === projectId) {
        if (defect.reportedBy) contributorIds.add(defect.reportedBy);
        if (defect.assignedTo) contributorIds.add(defect.assignedTo);
      }
    });

    // Add users who worked on test runs for this project
    testRuns.forEach((testRun: any) => {
      if (testRun.projectId === projectId && testRun.createdBy) {
        contributorIds.add(testRun.createdBy);
      }
    });
    
    // Add the project creator
    const project = Array.isArray(projects) ? projects.find((p: any) => p.id === projectId) : null;
    if (project?.createdBy) {
      contributorIds.add(project.createdBy);
    }

    return {
      testCases: projectTestCases.length,
      members: contributorIds.size,
    };
  };

  const handleEditProject = (project: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setCreateModalOpen(true);
  };

  const handleModalClose = () => {
    setCreateModalOpen(false);
    setEditingProject(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Project
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
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Projects</h1>
         <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Manage and organize your application projects
          </p>
        </div>
        <Button className="ml-auto" onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(projects as Project[])?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                      <Badge
                        variant={
                          project.status === "active" ? "default" : "secondary"
                        }
                        className="mt-1"
                      >
                        {project.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleEditProject(project, e)}
                    className="hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{getProjectStats(project.id).members} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>
                      {getProjectStats(project.id).testCases} test cases
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={handleModalClose}
        editingProject={editingProject}
      />
    </div>
  );
}
