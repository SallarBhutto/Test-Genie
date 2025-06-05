import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Module } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  moduleId: z.coerce.number().min(1, "Module is required"),
});

type FormData = z.infer<typeof formSchema>;

interface CreateComponentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modules: Module[];
  selectedModuleId?: number;
}

export default function CreateComponentModal({ open, onOpenChange, modules, selectedModuleId }: CreateComponentModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      moduleId: selectedModuleId || modules[0]?.id || 0,
    },
  });

  // Reset form with selected module when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        description: "",
        moduleId: selectedModuleId || modules[0]?.id || 0,
      });
    }
  }, [open, selectedModuleId, modules, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const selectedModule = modules.find(m => m.id === data.moduleId);
      const response = await fetch("/api/components", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          projectId: selectedModule?.projectId,
          createdBy: 1, // Default user ID
        }),
        headers: { "Content-Type": "application/json" },
      });
      // Accept both 200 and 201 as success
      if (response.status >= 200 && response.status < 300) {
        return response.json();
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to create component");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/components"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Component created successfully!",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create component. Please try again.",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Component</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="moduleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a module" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id.toString()}>
                          {module.name}
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
                  <FormLabel>Component Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter component name..." {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the component..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Component"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}