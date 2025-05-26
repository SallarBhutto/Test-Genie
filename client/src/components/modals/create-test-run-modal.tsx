import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTestRunSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertTestRunSchema.extend({
  projectId: z.number().min(1, "Project is required"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateTestRunModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTestRunModal({ open, onOpenChange }: CreateTestRunModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTestCases, setSelectedTestCases] = useState<number[]>([]);

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: testCases } = useQuery({
    queryKey: ["/api/test-cases"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      projectId: 0,
      status: "not_started",
      createdBy: 1,
    },
  });

  const createTestRunMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/test-runs", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test run created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create test run. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createTestRunMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Test Run</DialogTitle>
          <DialogDescription>
            Start a new test execution cycle for your project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(projects as any[])?.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Test Run Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sprint 12 Regression Testing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Complete regression testing for all login functionality"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="aborted">Aborted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Case Selection Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Select Test Cases</FormLabel>
                <Badge variant="secondary">
                  {selectedTestCases.length} selected
                </Badge>
              </div>
              <ScrollArea className="h-48 border rounded-md p-3">
                {(testCases as any[])?.length > 0 ? (
                  <div className="space-y-2">
                    {(testCases as any[]).map((testCase) => (
                      <div key={testCase.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`testcase-${testCase.id}`}
                          checked={selectedTestCases.includes(testCase.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTestCases([...selectedTestCases, testCase.id]);
                            } else {
                              setSelectedTestCases(selectedTestCases.filter(id => id !== testCase.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`testcase-${testCase.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center justify-between">
                            <span>{testCase.testCaseId}: {testCase.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {testCase.priority}
                            </Badge>
                          </div>
                        </label>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTestCases((testCases as any[])?.map(tc => tc.id) || [])}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTestCases([])}
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    No test cases available. Create test cases first.
                  </p>
                )}
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTestRunMutation.isPending}>
                {createTestRunMutation.isPending ? "Creating..." : "Create Test Run"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}