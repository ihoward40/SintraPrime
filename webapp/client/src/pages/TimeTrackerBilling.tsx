import { useState } from "react";
import { Clock, DollarSign, Plus, Play, Square, FileText, Trash2, CheckCircle, Send, AlertCircle } from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  research: "Research", drafting: "Drafting", court: "Court", client_comm: "Client Comm",
  admin: "Admin", review: "Review", other: "Other",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  overdue: "bg-red-500/20 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/20 text-gray-500 border-gray-500/30",
};

export default function TimeTrackerBilling() {
  const { toast } = useToast();
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  const [timerDesc, setTimerDesc] = useState("");
  const [timerCategory, setTimerCategory] = useState("research");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [invoiceClient, setInvoiceClient] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [newEntry, setNewEntry] = useState({ description: "", category: "research", durationMinutes: 60, hourlyRate: 250, billable: true });

  const { data: entries, refetch: refetchEntries } = trpc.timeTracker.listEntries.useQuery({ limit: 100 });
  const { data: invoices, refetch: refetchInvoices } = trpc.timeTracker.listInvoices.useQuery({});
  const { data: summary } = trpc.timeTracker.getBillingSummary.useQuery({});
  const addEntry = trpc.timeTracker.addEntry.useMutation();
  const deleteEntry = trpc.timeTracker.deleteEntry.useMutation();
  const createInvoice = trpc.timeTracker.createInvoice.useMutation();
  const updateInvoiceStatus = trpc.timeTracker.updateInvoiceStatus.useMutation();

  const handleStartTimer = () => {
    setTimerStart(new Date());
    setIsTimerRunning(true);
  };

  const handleStopTimer = async () => {
    if (!timerStart || !timerDesc.trim()) return;
    const end = new Date();
    const duration = Math.round((end.getTime() - timerStart.getTime()) / 60000);
    await addEntry.mutateAsync({
      description: timerDesc,
      category: timerCategory as any,
      startTime: timerStart.toISOString(),
      endTime: end.toISOString(),
      durationMinutes: Math.max(1, duration),
      billable: true,
      hourlyRate: 250,
    });
    setIsTimerRunning(false);
    setTimerStart(null);
    setTimerDesc("");
    refetchEntries();
    toast({ title: "Time entry saved!", description: `${Math.max(1, duration)} minutes recorded.` });
  };

  const handleAddManual = async () => {
    await addEntry.mutateAsync({
      description: newEntry.description,
      category: newEntry.category as any,
      startTime: new Date().toISOString(),
      durationMinutes: newEntry.durationMinutes,
      billable: newEntry.billable,
      hourlyRate: newEntry.hourlyRate,
    });
    setShowAddEntry(false);
    refetchEntries();
    toast({ title: "Entry added!" });
  };

  const handleCreateInvoice = async () => {
    if (selectedEntries.length === 0 || !invoiceClient.trim()) return;
    const result = await createInvoice.mutateAsync({
      clientName: invoiceClient,
      clientEmail: invoiceEmail || undefined,
      entryIds: selectedEntries,
    });
    setShowCreateInvoice(false);
    setSelectedEntries([]);
    refetchEntries();
    refetchInvoices();
    toast({ title: "Invoice created!", description: `Invoice ${result.invoiceNumber} — $${result.totalAmount.toFixed(2)}` });
  };

  const toggleEntry = (id: number) => {
    setSelectedEntries(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/10 rounded-lg">
          <Clock className="h-6 w-6 text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Time Tracker & Billing</h1>
          <p className="text-gray-400 text-sm">Track billable hours and generate professional invoices</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Hours", value: `${summary?.totalHours ?? 0}h`, icon: Clock, color: "text-blue-400" },
          { label: "Unbilled Hours", value: `${summary?.unbilledHours ?? 0}h`, icon: AlertCircle, color: "text-yellow-400" },
          { label: "Total Billed", value: `$${(summary?.totalAmount ?? 0).toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
          { label: "Unbilled Entries", value: summary?.unbilledCount ?? 0, icon: FileText, color: "text-orange-400" },
        ].map(stat => (
          <Card key={stat.label} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 text-xs">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timer */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-400" /> Live Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                placeholder="What are you working on?"
                value={timerDesc}
                onChange={e => setTimerDesc(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                disabled={isTimerRunning}
              />
            </div>
            <Select value={timerCategory} onValueChange={setTimerCategory} disabled={isTimerRunning}>
              <SelectTrigger className="w-36 bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-white">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isTimerRunning ? (
              <Button onClick={handleStartTimer} className="bg-green-600 hover:bg-green-700" disabled={!timerDesc.trim()}>
                <Play className="h-4 w-4 mr-2" /> Start
              </Button>
            ) : (
              <Button onClick={handleStopTimer} className="bg-red-600 hover:bg-red-700">
                <Square className="h-4 w-4 mr-2" /> Stop
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowAddEntry(true)} className="border-gray-600 text-gray-300">
              <Plus className="h-4 w-4 mr-2" /> Manual
            </Button>
          </div>
          {isTimerRunning && timerStart && (
            <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Timer running since {timerStart.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="entries">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="entries">Time Entries ({entries?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries" className="space-y-3">
          {selectedEntries.length > 0 && (
            <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-300 text-sm">{selectedEntries.length} entries selected</p>
              <Button onClick={() => setShowCreateInvoice(true)} className="bg-blue-600 hover:bg-blue-700 h-8 text-sm">
                <FileText className="h-3 w-3 mr-2" /> Create Invoice
              </Button>
            </div>
          )}
          {(!entries || entries.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No time entries yet. Start the timer or add a manual entry.</p>
            </div>
          )}
          {entries?.map(entry => (
            <Card key={entry.id} className={`bg-gray-800/50 border-gray-700 cursor-pointer transition-colors ${selectedEntries.includes(entry.id) ? "border-blue-500/50 bg-blue-500/5" : ""}`}
              onClick={() => !entry.invoiced && toggleEntry(entry.id)}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${selectedEntries.includes(entry.id) ? "bg-blue-500 border-blue-500" : "border-gray-600"}`} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{entry.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge className="bg-gray-700 text-gray-300 border-gray-600 text-xs">{CATEGORY_LABELS[entry.category]}</Badge>
                    <span className="text-gray-500 text-xs">{new Date(entry.startTime).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{entry.durationMinutes}m</p>
                  {entry.hourlyRate && (
                    <p className="text-green-400 text-xs">${((parseFloat(entry.hourlyRate) * (entry.durationMinutes ?? 0)) / 60).toFixed(2)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {entry.invoiced ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Invoiced</Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Unbilled</Badge>
                  )}
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteEntry.mutateAsync({ id: entry.id }).then(() => refetchEntries()); }}
                    className="text-red-400 hover:text-red-300 h-7 w-7 p-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-3">
          {(!invoices || invoices.length === 0) && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No invoices yet. Select time entries and create an invoice.</p>
            </div>
          )}
          {invoices?.map(invoice => (
            <Card key={invoice.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4 flex items-center gap-4">
                <FileText className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{invoice.invoiceNumber}</p>
                  <p className="text-gray-400 text-xs">{invoice.clientName} • {new Date(invoice.createdAt).toLocaleDateString()}</p>
                </div>
                <p className="text-green-400 font-bold">${parseFloat(invoice.totalAmount).toFixed(2)}</p>
                <Badge className={INVOICE_STATUS_COLORS[invoice.status]}>{invoice.status}</Badge>
                {invoice.status === "draft" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                    onClick={() => updateInvoiceStatus.mutateAsync({ id: invoice.id, status: "sent" }).then(() => refetchInvoices())}>
                    <Send className="h-3 w-3 mr-1" /> Mark Sent
                  </Button>
                )}
                {invoice.status === "sent" && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                    onClick={() => updateInvoiceStatus.mutateAsync({ id: invoice.id, status: "paid" }).then(() => refetchInvoices())}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Mark Paid
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Add Manual Entry Dialog */}
      <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader><DialogTitle>Add Manual Time Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Description" value={newEntry.description} onChange={e => setNewEntry(p => ({ ...p, description: e.target.value }))} className="bg-gray-700 border-gray-600 text-white" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Duration (minutes)</label>
                <Input type="number" value={newEntry.durationMinutes} onChange={e => setNewEntry(p => ({ ...p, durationMinutes: parseInt(e.target.value) || 0 }))} className="bg-gray-700 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Hourly Rate ($)</label>
                <Input type="number" value={newEntry.hourlyRate} onChange={e => setNewEntry(p => ({ ...p, hourlyRate: parseFloat(e.target.value) || 0 }))} className="bg-gray-700 border-gray-600 text-white" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEntry(false)} className="border-gray-600 text-gray-300">Cancel</Button>
            <Button onClick={handleAddManual} className="bg-green-600 hover:bg-green-700" disabled={!newEntry.description.trim()}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">{selectedEntries.length} time entries selected</p>
            <Input placeholder="Client Name *" value={invoiceClient} onChange={e => setInvoiceClient(e.target.value)} className="bg-gray-700 border-gray-600 text-white" />
            <Input placeholder="Client Email (optional)" value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)} className="bg-gray-700 border-gray-600 text-white" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateInvoice(false)} className="border-gray-600 text-gray-300">Cancel</Button>
            <Button onClick={handleCreateInvoice} className="bg-green-600 hover:bg-green-700" disabled={!invoiceClient.trim() || createInvoice.isPending}>
              {createInvoice.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
