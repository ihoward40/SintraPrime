/**
 * Workflows Dashboard
 * Lists all workflows and provides workflow management interface
 */

import React, { useState } from "react";
import { Plus, Zap, Trash2, Edit, Play } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { WorkflowDialog } from "./WorkflowDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  status: "active" | "inactive" | "error";
  createdAt: Date;
  updatedAt: Date;
  nodeCount: number;
}

export function WorkflowsDashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);

  // Fetch workflows
  const { data: workflows = [], isLoading, refetch } = trpc.workflow.list.useQuery();

  // Delete mutation
  const deleteWorkflow = trpc.workflow.delete.useMutation({
    onSuccess: () => {
      toast.success("Workflow deleted successfully");
      setDeleteWorkflowId(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete workflow: ${error.message}`);
    },
  });

  // Execute mutation
  const executeWorkflow = trpc.workflow.execute.useMutation({
    onSuccess: () => {
      toast.success("Workflow started");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to execute workflow: ${error.message}`);
    },
  });

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "scheduled":
        return "🕐";
      case "webhook":
        return "🪝";
      case "event":
        return "⚡";
      default:
        return "👆";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-gray-600 mt-2">
            Manage and create automation workflows
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Workflows</div>
          <div className="text-3xl font-bold mt-2">{workflows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {workflows.filter((w) => w.status === "active").length}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Errors</div>
          <div className="text-3xl font-bold text-red-600 mt-2">
            {workflows.filter((w) => w.status === "error").length}
          </div>
        </Card>
      </div>

      {/* Workflows Table */}
      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading workflows...
          </div>
        ) : workflows.length === 0 ? (
          <div className="p-8 text-center">
            <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No workflows yet</p>
            <Button onClick={() => setDialogOpen(true)}>
              Create your first workflow
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{workflow.name}</p>
                      {workflow.description && (
                        <p className="text-sm text-gray-600">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-lg">
                      {getTriggerIcon(workflow.triggerType)}
                    </span>
                    <span className="ml-2 text-sm capitalize">
                      {workflow.triggerType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(workflow.status)}>
                      {workflow.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{workflow.nodeCount}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(workflow.updatedAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => (window.location.href = `/workflow/${workflow.id}`)}
                      title="Edit workflow"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => executeWorkflow.mutate({ id: workflow.id })}
                      disabled={executeWorkflow.isPending}
                      title="Execute workflow"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteWorkflowId(workflow.id)}
                      title="Delete workflow"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Workflow Dialog */}
      <WorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteWorkflowId}
        onOpenChange={(open) => !open && setDeleteWorkflowId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The workflow and its execution
              history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (deleteWorkflowId) {
                deleteWorkflow.mutate({ id: deleteWorkflowId });
              }
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
