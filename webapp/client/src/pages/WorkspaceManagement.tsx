import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Plus, Mail, Trash2, Settings, Crown, Shield, User, UserCheck } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function WorkspaceManagement() {
  const { user } = useAuth();
  const toast = ({ title, description, variant }: { title: string; description?: string; variant?: string }) => {
    console.log(`[Toast ${variant || 'info'}]:`, title, description);
    alert(title + (description ? `\n${description}` : ''));
  };
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  // Form states
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"attorney" | "paralegal" | "client">("paralegal");

  // Queries
  const workspacesQuery = trpc.workspaces.list.useQuery();
  const membersQuery = trpc.workspaces.members.list.useQuery(
    { workspaceId: parseInt(selectedWorkspace!) },
    { enabled: !!selectedWorkspace }
  );

  // Mutations
  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: () => {
      toast({ title: "Workspace created successfully", variant: "success" });
      setCreateDialogOpen(false);
      setWorkspaceName("");
      setWorkspaceDescription("");
      workspacesQuery.refetch();
    },
    onError: (error) => {
      toast({ title: "Failed to create workspace", description: error.message, variant: "destructive" });
    },
  });

  const inviteMember = trpc.workspaces.members.add.useMutation({
    onSuccess: () => {
      toast({ title: "Invitation sent successfully", variant: "success" });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("paralegal");
      membersQuery.refetch();
    },
    onError: (error) => {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const removeMember = trpc.workspaces.members.remove.useMutation({
    onSuccess: () => {
      toast({ title: "Member removed successfully", variant: "success" });
      membersQuery.refetch();
    },
    onError: (error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const updateRole = trpc.workspaces.members.updateRole.useMutation({
    onSuccess: () => {
      toast({ title: "Role updated successfully", variant: "success" });
      membersQuery.refetch();
    },
    onError: (error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateWorkspace = () => {
    if (!workspaceName.trim()) {
      toast({ title: "Workspace name is required", variant: "destructive" });
      return;
    }
    createWorkspace.mutate({ name: workspaceName, description: workspaceDescription });
  };

  const handleInviteMember = () => {
    if (!selectedWorkspace) {
      toast({ title: "Please select a workspace first", variant: "destructive" });
      return;
    }
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast({ title: "Valid email is required", variant: "destructive" });
      return;
    }
    // TODO: Implement email invitation system
    toast({ title: "Email invitation not yet implemented", description: "Please add members by user ID for now", variant: "destructive" });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4" />;
      case "attorney":
        return <Shield className="h-4 w-4" />;
      case "paralegal":
        return <UserCheck className="h-4 w-4" />;
      case "client":
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case "owner":
        return "default";
      case "attorney":
        return "default";
      case "paralegal":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Workspace Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage team workspaces, invite members, and control access to shared cases
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Create a collaborative workspace for your team to share cases and documents
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  placeholder="e.g., Smith & Associates Legal Team"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description (Optional)</Label>
                <Textarea
                  id="workspace-description"
                  placeholder="Brief description of this workspace's purpose"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWorkspace} disabled={createWorkspace.isPending}>
                {createWorkspace.isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Workspaces List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Your Workspaces</h2>
        {workspacesQuery.isLoading ? (
          <p className="text-muted-foreground">Loading workspaces...</p>
        ) : workspacesQuery.data && workspacesQuery.data.length > 0 ? (
          <div className="space-y-3">
            {workspacesQuery.data.map((workspace: any) => (
              <div
                key={workspace.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedWorkspace === workspace.id
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50"
                }`}
                onClick={() => setSelectedWorkspace(workspace.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{workspace.name}</h3>
                      <Badge variant={getRoleBadgeVariant(workspace.role)}>
                        {workspace.role}
                      </Badge>
                    </div>
                    {workspace.description && (
                      <p className="text-sm text-muted-foreground mt-1">{workspace.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {workspace.memberCount} member{workspace.memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No workspaces yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first workspace to start collaborating with your team
            </p>
          </div>
        )}
      </Card>

      {/* Team Members */}
      {selectedWorkspace && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Team Members</h2>
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join this workspace
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email Address</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attorney">Attorney</SelectItem>
                        <SelectItem value="paralegal">Paralegal</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {inviteRole === "attorney" && "Full access to all workspace features"}
                      {inviteRole === "paralegal" && "Can manage cases and documents"}
                      {inviteRole === "client" && "View-only access to assigned cases"}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember} disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {membersQuery.isLoading ? (
            <p className="text-muted-foreground">Loading members...</p>
          ) : membersQuery.data && membersQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersQuery.data.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.userName}</TableCell>
                    <TableCell>{member.userEmail}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role)}
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.role !== "owner" && (
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(newRole) =>
              updateRole.mutate({
                id: member.id,
                role: newRole,
              })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="attorney">Attorney</SelectItem>
                              <SelectItem value="paralegal">Paralegal</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
              removeMember.mutate({ id: member.id })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No members yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Invite team members to start collaborating
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
