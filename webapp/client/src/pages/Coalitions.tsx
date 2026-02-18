import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Users, Plus, Globe, Lock, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTierGate } from "@/hooks/useTierGate";
import UpgradePrompt from "@/components/UpgradePrompt";

export default function Coalitions() {
  const { tier, canAccess, requiredTier } = useTierGate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);

  const { data: coalitions, isLoading, refetch } = trpc.coalitions.list.useQuery();
  const createCoalition = trpc.coalitions.create.useMutation({
    onSuccess: () => {
      toast.success("Coalition created");
      setCreateDialogOpen(false);
      setNewName("");
      setNewDescription("");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCoalition = trpc.coalitions.delete.useMutation({
    onSuccess: () => {
      toast.success("Coalition deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Please enter a coalition name");
      return;
    }
    createCoalition.mutate({
      name: newName,
      description: newDescription || undefined,
      isPublic: newIsPublic,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Coalitions</h1>
            <p className="text-muted-foreground">
              Coordinate with others and share legal resources
            </p>
          </div>
          {canAccess("coalitions") && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Coalition
            </Button>
          )}
        </div>

        {!canAccess("coalitions") && (
          <UpgradePrompt
            feature="Coalitions"
            requiredTier={requiredTier("coalitions") as "pro" | "coalition" | "enterprise"}
            currentTier={tier}
            description="Coalition features for team collaboration require a Coalition plan or higher."
          />
        )}

        {/* Disclaimer */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Coalitions are for coordination and resource sharing. Shared information is not privileged 
              attorney-client communication. Be mindful of what you share.
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : coalitions && coalitions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coalitions.map((coalition) => (
              <CoalitionCard
                key={coalition.id}
                coalition={coalition}
                onDelete={() => {
                  if (confirm("Delete this coalition?")) {
                    deleteCoalition.mutate({ id: coalition.id });
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <Users className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No coalitions yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Create a coalition to coordinate with other litigants, share resources, and build collective strength.
                </p>
              </div>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Coalition
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Coalition</DialogTitle>
            <DialogDescription>
              Build a coalition to coordinate legal efforts with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Coalition Name *</Label>
              <Input
                placeholder="e.g., ABC Credit Corp Victims Coalition"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the purpose and goals of this coalition..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={newIsPublic}
                onChange={(e) => setNewIsPublic(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="isPublic" className="text-sm font-normal">
                Make this coalition publicly discoverable
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createCoalition.isPending}>
              {createCoalition.isPending ? "Creating..." : "Create Coalition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function CoalitionCard({ coalition, onDelete }: { coalition: any; onDelete: () => void }) {
  const { data: members } = trpc.coalitions.members.useQuery({ coalitionId: coalition.id });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {coalition.isPublic ? (
                <Globe className="h-4 w-4 text-green-500" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <Badge variant="outline" className="text-xs">
                {coalition.isPublic ? "Public" : "Private"}
              </Badge>
            </div>
            <CardTitle className="text-lg">{coalition.name}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive shrink-0"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {coalition.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{coalition.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{members?.length || 1} member{(members?.length || 1) !== 1 ? "s" : ""}</span>
          <span className="mx-1">·</span>
          <span>Created {new Date(coalition.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
