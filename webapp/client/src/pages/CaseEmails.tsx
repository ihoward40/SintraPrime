import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Mail, Send, Inbox, Star, Trash2, Plus, ArrowLeft, ChevronDown,
  Paperclip, Clock, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function CaseEmails() {
  const { user } = useAuth();
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<number | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "inbound" | "outbound" | "starred">("all");

  // Form state
  const [newEmail, setNewEmail] = useState({
    direction: "outbound" as "inbound" | "outbound",
    toAddress: "",
    fromAddress: "",
    subject: "",
    body: "",
  });

  const { data: cases } = trpc.cases.list.useQuery();
  const { data: emails, refetch: refetchEmails } = trpc.emails.list.useQuery(
    { caseId: selectedCaseId! },
    { enabled: !!selectedCaseId }
  );

  const createEmail = trpc.emails.create.useMutation({
    onSuccess: () => {
      refetchEmails();
      setComposeOpen(false);
      setNewEmail({ direction: "outbound", toAddress: "", fromAddress: "", subject: "", body: "" });
      toast.success("Email logged");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleStar = trpc.emails.toggleStar.useMutation({
    onSuccess: () => refetchEmails(),
  });

  const deleteEmail = trpc.emails.delete.useMutation({
    onSuccess: () => {
      refetchEmails();
      setSelectedEmailId(null);
      toast.success("Email deleted");
    },
  });

  const filteredEmails = useMemo(() => {
    if (!emails) return [];
    switch (filter) {
      case "inbound": return emails.filter((e: any) => e.direction === "inbound");
      case "outbound": return emails.filter((e: any) => e.direction === "outbound");
      case "starred": return emails.filter((e: any) => e.isStarred);
      default: return emails;
    }
  }, [emails, filter]);

  const selectedEmail = useMemo(() => {
    if (!selectedEmailId || !emails) return null;
    return emails.find((e: any) => e.id === selectedEmailId) || null;
  }, [selectedEmailId, emails]);

  const handleSubmit = () => {
    if (!selectedCaseId) return;
    createEmail.mutate({
      caseId: selectedCaseId,
      ...newEmail,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Correspondence</h1>
          <p className="text-muted-foreground">Track and log legal correspondence for your cases</p>
        </div>
      </div>

      {/* Case Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="shrink-0 font-medium">Select Case:</Label>
            <Select
              value={selectedCaseId?.toString() || ""}
              onValueChange={(v) => {
                setSelectedCaseId(parseInt(v));
                setSelectedEmailId(null);
              }}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Choose a case to view correspondence" />
              </SelectTrigger>
              <SelectContent>
                {cases?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.title} ({c.caseType || "General"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedCaseId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(["all", "inbound", "outbound", "starred"] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className="text-xs"
                  >
                    {f === "all" && <Mail className="w-3 h-3 mr-1" />}
                    {f === "inbound" && <Inbox className="w-3 h-3 mr-1" />}
                    {f === "outbound" && <Send className="w-3 h-3 mr-1" />}
                    {f === "starred" && <Star className="w-3 h-3 mr-1" />}
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Log Correspondence
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Log Email Correspondence</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Direction</Label>
                    <Select
                      value={newEmail.direction}
                      onValueChange={(v) => setNewEmail({ ...newEmail, direction: v as "inbound" | "outbound" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outbound">Outbound (Sent)</SelectItem>
                        <SelectItem value="inbound">Inbound (Received)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{newEmail.direction === "outbound" ? "To" : "From"}</Label>
                    <Input
                      value={newEmail.direction === "outbound" ? newEmail.toAddress : newEmail.fromAddress}
                      onChange={(e) =>
                        newEmail.direction === "outbound"
                          ? setNewEmail({ ...newEmail, toAddress: e.target.value })
                          : setNewEmail({ ...newEmail, fromAddress: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={newEmail.subject}
                      onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                      placeholder="Email subject"
                    />
                  </div>
                  <div>
                    <Label>Body</Label>
                    <Textarea
                      value={newEmail.body}
                      onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                      placeholder="Email content..."
                      rows={8}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSubmit} disabled={!newEmail.subject || !newEmail.body || createEmail.isPending}>
                    {createEmail.isPending ? "Saving..." : "Log Email"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Email list items */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredEmails.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No correspondence logged yet</p>
                  </CardContent>
                </Card>
              ) : (
                filteredEmails.map((email: any) => (
                  <Card
                    key={email.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedEmailId === email.id ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => setSelectedEmailId(email.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={email.direction === "inbound" ? "secondary" : "outline"} className="text-[10px] shrink-0">
                              {email.direction === "inbound" ? "IN" : "OUT"}
                            </Badge>
                            <span className="text-sm font-medium truncate">{email.subject}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {email.direction === "inbound" ? `From: ${email.fromAddress || "Unknown"}` : `To: ${email.toAddress || "Unknown"}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(email.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar.mutate({ id: email.id });
                          }}
                          className="shrink-0"
                        >
                          <Star className={`w-4 h-4 ${email.isStarred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Email Detail */}
          <div className="lg:col-span-2">
            {selectedEmail ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedEmail.subject}</CardTitle>
                      <CardDescription className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={selectedEmail.direction === "inbound" ? "secondary" : "outline"}>
                            {selectedEmail.direction === "inbound" ? "Received" : "Sent"}
                          </Badge>
                          <span className="text-xs">
                            {new Date(selectedEmail.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {selectedEmail.fromAddress && (
                          <p className="text-sm">From: <span className="font-medium">{selectedEmail.fromAddress}</span></p>
                        )}
                        {selectedEmail.toAddress && (
                          <p className="text-sm">To: <span className="font-medium">{selectedEmail.toAddress}</span></p>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStar.mutate({ id: selectedEmail.id })}
                      >
                        <Star className={`w-4 h-4 ${selectedEmail.isStarred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Delete this email record?")) {
                            deleteEmail.mutate({ id: selectedEmail.id });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed border-t pt-4">
                      {selectedEmail.body}
                    </div>
                  </div>
                  {selectedEmail.attachments && (selectedEmail.attachments as any[]).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Attachments
                      </p>
                      <div className="space-y-2">
                        {(selectedEmail.attachments as any[]).map((att: any, i: number) => (
                          <a
                            key={i}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{att.fileName}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {(att.fileSize / 1024).toFixed(1)} KB
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Select an email to view</p>
                  <p className="text-sm mt-1">Choose from the list or log new correspondence</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {!selectedCaseId && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select a case to view correspondence</p>
            <p className="text-sm mt-1">Choose a case from the dropdown above to manage email records</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
