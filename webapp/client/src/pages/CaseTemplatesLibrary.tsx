import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CaseTemplatesLibrary() {
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateCaseType, setTemplateCaseType] = useState("");
  const [templatePriority, setTemplatePriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [templateDocuments, setTemplateDocuments] = useState("");
  const [templateWorkflow, setTemplateWorkflow] = useState("");

  const { data: templates, isLoading, refetch } = trpc.caseTemplates.list.useQuery() as { data: any[], isLoading: boolean, refetch: () => void };

  const createTemplate = trpc.caseTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTemplate = trpc.caseTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      setEditDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTemplate = trpc.caseTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createCaseFromTemplate = trpc.caseTemplates.createCaseFromTemplate.useMutation({
    onSuccess: (data) => {
      toast.success("Case created from template");
      setLocation(`/cases/${data.caseId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTemplateCaseType("");
    setTemplatePriority("medium");
    setTemplateDocuments("");
    setTemplateWorkflow("");
    setSelectedTemplate(null);
  };

  const handleCreate = () => {
    createTemplate.mutate({
      name: templateName,
      description: templateDescription,
      caseType: templateCaseType,
      priority: templatePriority,
      documents: templateDocuments.split("\n").filter(d => d.trim()),
      workflow: templateWorkflow.split("\n").filter(w => w.trim()),
    });
  };

  const handleEdit = () => {
    if (!selectedTemplate) return;
    updateTemplate.mutate({
      id: selectedTemplate.id,
      name: templateName,
      description: templateDescription,
      caseType: templateCaseType,
      priority: templatePriority,
      documents: templateDocuments.split("\n").filter(d => d.trim()),
      workflow: templateWorkflow.split("\n").filter(w => w.trim()),
    });
  };

  const openEditDialog = (template: any) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    setTemplateCaseType(template.caseType || "");
    setTemplatePriority(template.priority || "medium");
    setTemplateDocuments(template.documents?.join("\n") || "");
    setTemplateWorkflow(template.workflow?.join("\n") || "");
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Case Templates Library</h1>
          <p className="text-muted-foreground">Create and manage reusable case templates</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {!templates || templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">Create your first case template to get started</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-2 line-clamp-1">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{template.caseType || "General"}</Badge>
                  <Badge variant="outline">{template.priority || "Medium"}</Badge>
                </div>
                {template.documents && template.documents.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{template.documents.length}</span> documents
                  </div>
                )}
                {template.workflow && template.workflow.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">{template.workflow.length}</span> workflow steps
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => createCaseFromTemplate.mutate({ templateId: template.id })}
                    className="flex-1"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Use Template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Delete this template?")) {
                        deleteTemplate.mutate({ id: template.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Case Template</DialogTitle>
            <DialogDescription>
              Define a reusable template for creating new cases quickly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., FDCPA Violation Template"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of this template"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="caseType">Case Type</Label>
                <Input
                  id="caseType"
                  value={templateCaseType}
                  onChange={(e) => setTemplateCaseType(e.target.value)}
                  placeholder="e.g., FDCPA"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={templatePriority} onValueChange={(value: any) => setTemplatePriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="documents">Required Documents (one per line)</Label>
              <Textarea
                id="documents"
                value={templateDocuments}
                onChange={(e) => setTemplateDocuments(e.target.value)}
                placeholder="Complaint&#10;Demand Letter&#10;Evidence Photos"
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="workflow">Workflow Steps (one per line)</Label>
              <Textarea
                id="workflow"
                value={templateWorkflow}
                onChange={(e) => setTemplateWorkflow(e.target.value)}
                placeholder="Initial consultation&#10;Send demand letter&#10;File complaint&#10;Discovery"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!templateName.trim()}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Case Template</DialogTitle>
            <DialogDescription>
              Update template details and configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Template Name</Label>
              <Input
                id="edit-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-caseType">Case Type</Label>
                <Input
                  id="edit-caseType"
                  value={templateCaseType}
                  onChange={(e) => setTemplateCaseType(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={templatePriority} onValueChange={(value: any) => setTemplatePriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-documents">Required Documents (one per line)</Label>
              <Textarea
                id="edit-documents"
                value={templateDocuments}
                onChange={(e) => setTemplateDocuments(e.target.value)}
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="edit-workflow">Workflow Steps (one per line)</Label>
              <Textarea
                id="edit-workflow"
                value={templateWorkflow}
                onChange={(e) => setTemplateWorkflow(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!templateName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
