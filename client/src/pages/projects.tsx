import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Plus, FolderOpen, Users, FileText } from "lucide-react";
import CreateProjectModal from "@/components/modals/create-project-modal";
import { getQueryFn } from "@/lib/queryClient";
import { useSorting } from "@/hooks/useSorting";
import type { Project } from "@shared/schema";

export default function Projects() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: testCases = [] } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Calculate project-specific statistics
  const getProjectStats = (projectId: number) => {
    const projectTestCases = (testCases as any[]).filter((tc: any) => tc.projectId === projectId);
    const projectMembers = (users as any[]).filter((user: any) => user.role !== 'admin').length; // Basic member count
    
    return {
      testCases: projectTestCases.length,
      members: projectMembers
    };
  };

  const { sortedData: sortedProjects, sortConfig, requestSort } = useSorting(projects as any[], "name");

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
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Projects</h1>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="name"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                >
                  Name
                </SortableTableHead>
                <SortableTableHead
                  sortKey="description"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                >
                  Description
                </SortableTableHead>
                <SortableTableHead
                  sortKey="status"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                >
                  Status
                </SortableTableHead>
                <SortableTableHead
                  sortKey="teamName"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                >
                  Team
                </SortableTableHead>
                <SortableTableHead
                  sortKey="createdAt"
                  currentSortKey={sortConfig.key}
                  sortDirection={sortConfig.direction}
                  onSort={requestSort}
                >
                  Created
                </SortableTableHead>
                <TableHead>Test Cases</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.map((project: any) => {
                const stats = getProjectStats(project.id);
                return (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FolderOpen className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">{project.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {project.description || "No description"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={project.status === "active" ? "default" : "secondary"}
                      >
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {project.teamName || "No team assigned"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span>{stats.testCases}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-green-600" />
                          <span>{stats.members}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateProjectModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
      />
    </div>
  );
}
