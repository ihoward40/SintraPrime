import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Star,
  Search,
  Sparkles,
  User,
  Briefcase,
  Scale,
  Info,
  Loader2,
  RefreshCw,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

type MemoryCategory = "user_preference" | "case_fact" | "legal_strategy" | "general_context";

interface Memory {
  id: number;
  userId: number;
  caseId: number | null;
  category: MemoryCategory;
  key: string;
  value: string;
  importance: number;
  source: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

const CATEGORY_CONFIG: Record<MemoryCategory, { label: string; icon: any; color: string; description: string }> = {
  user_preference: {
    label: "User Preference",
    icon: User,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    description: "How you like things done — response style, formatting, etc.",
  },
  case_fact: {
    label: "Case Fact",
    icon: Briefcase,
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description: "Key facts about a specific case — parties, dates, incidents.",
  },
  legal_strategy: {
    label: "Legal Strategy",
    icon: Scale,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    description: "The legal approach and strategy being pursued.",
  },
  general_context: {
    label: "General Context",
    icon: Info,
    color: "bg-green-500/10 text-green-400 border-green-500/20",
    description: "Other important context the AI should know about you.",
  },
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Added manually",
  chat: "Extracted from chat",
  chat_extraction: "Auto-extracted",
  document_extraction: "From document",
};

function ImportanceStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 cursor-pointer transition-colors ${
            star <= value ? "fill-amber-400 text-amber-400" : "text-gray-600"
          }`}
          onClick={() => onChange?.(star)}
        />
      ))}
    </div>
  );
}

function MemoryCard({ memory, onEdit, onDelete }: { memory: Memory; onEdit: (m: Memory) => void; onDelete: (id: number) => void }) {
  const config = CATEGORY_CONFIG[memory.category];
  const Icon = config.icon;

  return (
    <Card className="bg-gray-900/50 border-gray-700/50 hover:border-gray-600/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-1.5 rounded-md border ${config.color} shrink-0 mt-0.5`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-white truncate">{memory.key}</span>
                <Badge variant="outline" className={`text-xs border ${config.color}`}>
                  {config.label}
                </Badge>
                {memory.caseId && (
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                    Case #{memory.caseId}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-300 mt-1 line-clamp-2">{memory.value}</p>
              <div className="flex items-center gap-3 mt-2">
                <ImportanceStars value={memory.importance} />
                <span className="text-xs text-gray-500">
                  {SOURCE_LABELS[memory.source] ?? memory.source}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white"
              onClick={() => onEdit(memory)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-red-400"
              onClick={() => onDelete(memory.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AIMemoryManager() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [extractText, setExtractText] = useState("");
  const [showExtractPanel, setShowExtractPanel] = useState(false);

  // Form state
  const [formCategory, setFormCategory] = useState<MemoryCategory>("general_context");
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formImportance, setFormImportance] = useState(3);

  const utils = trpc.useUtils();

  const { data: memories, isLoading } = trpc.aiMemory.list.useQuery();

  const addMutation = trpc.aiMemory.add.useMutation({
    onSuccess: () => {
      toast.success("Memory saved successfully");
      utils.aiMemory.list.invalidate();
      setShowAddDialog(false);
      resetForm();
    },
    onError: (err) => toast.error(`Failed to save memory: ${err.message}`),
  });

  const updateMutation = trpc.aiMemory.update.useMutation({
    onSuccess: () => {
      toast.success("Memory updated");
      utils.aiMemory.list.invalidate();
      setEditingMemory(null);
    },
    onError: (err) => toast.error(`Failed to update memory: ${err.message}`),
  });

  const deleteMutation = trpc.aiMemory.delete.useMutation({
    onSuccess: () => {
      toast.success("Memory deleted");
      utils.aiMemory.list.invalidate();
    },
    onError: (err) => toast.error(`Failed to delete: ${err.message}`),
  });

  const extractMutation = trpc.aiMemory.extractFromMessage.useMutation({
    onSuccess: (data) => {
      if (data.extracted > 0) {
        toast.success(`Extracted ${data.extracted} new memor${data.extracted === 1 ? "y" : "ies"} from text`);
        utils.aiMemory.list.invalidate();
        setExtractText("");
        setShowExtractPanel(false);
      } else {
        toast.info("No memorable facts found in the provided text");
      }
    },
    onError: (err) => toast.error(`Extraction failed: ${err.message}`),
  });

  function resetForm() {
    setFormCategory("general_context");
    setFormKey("");
    setFormValue("");
    setFormImportance(3);
  }

  function openEditDialog(memory: Memory) {
    setEditingMemory(memory);
    setFormCategory(memory.category);
    setFormKey(memory.key);
    setFormValue(memory.value);
    setFormImportance(memory.importance);
  }

  function handleSave() {
    if (!formKey.trim() || !formValue.trim()) {
      toast.error("Key and value are required");
      return;
    }
    addMutation.mutate({
      category: formCategory,
      key: formKey.trim(),
      value: formValue.trim(),
      importance: formImportance,
    });
  }

  function handleUpdate() {
    if (!editingMemory) return;
    if (!formKey.trim() || !formValue.trim()) {
      toast.error("Key and value are required");
      return;
    }
    updateMutation.mutate({
      id: editingMemory.id,
      category: formCategory,
      key: formKey.trim(),
      value: formValue.trim(),
      importance: formImportance,
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this memory? The AI will no longer remember this.")) return;
    deleteMutation.mutate({ id });
  }

  const filteredMemories = (memories ?? []).filter((m) => {
    const matchesTab = activeTab === "all" || m.category === activeTab;
    const matchesSearch =
      !searchQuery ||
      m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.value.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const categoryCounts = (memories ?? []).reduce(
    (acc, m) => {
      acc[m.category] = (acc[m.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-6 w-6 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">AI Memory Manager</h1>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                Persistent Context
              </Badge>
            </div>
            <p className="text-gray-400 text-sm">
              Teach SintraPrime AI what to remember across all conversations. Memories are automatically
              injected into every chat session so the AI always knows your preferences and case facts.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => setShowExtractPanel(!showExtractPanel)}
            >
              <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
              Auto-Extract
              {showExtractPanel ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => { resetForm(); setShowAddDialog(true); }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Memory
            </Button>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.entries(CATEGORY_CONFIG) as [MemoryCategory, typeof CATEGORY_CONFIG[MemoryCategory]][]).map(([cat, cfg]) => {
            const Icon = cfg.icon;
            return (
              <Card key={cat} className="bg-gray-900/50 border-gray-700/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-md border ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{cfg.label}</p>
                    <p className="text-xl font-bold text-white">{categoryCounts[cat] ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Auto-Extract Panel */}
        {showExtractPanel && (
          <Card className="bg-gray-900/50 border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Auto-Extract Memories from Text
              </CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                Paste any text — a chat message, case notes, or document excerpt — and the AI will automatically
                identify and save important facts and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                placeholder="Paste text here to extract memories from it..."
                className="bg-gray-800 border-gray-600 text-white min-h-[100px] resize-none"
                value={extractText}
                onChange={(e) => setExtractText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300"
                  onClick={() => { setExtractText(""); setShowExtractPanel(false); }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={!extractText.trim() || extractMutation.isPending}
                  onClick={() => extractMutation.mutate({ message: extractText })}
                >
                  {extractMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Extracting...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Extract Memories</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* How it works */}
        <Card className="bg-purple-950/20 border-purple-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <span className="font-medium text-purple-300">How it works: </span>
              Every time you chat with SintraPrime AI, all memories marked with importance ★★★ or higher are
              automatically included in the AI's context window. The AI will use these to personalize its
              responses, remember case facts, and maintain your preferred working style across all sessions.
            </div>
          </CardContent>
        </Card>

        {/* Search + Filter */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search memories..."
              className="pl-9 bg-gray-900 border-gray-700 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-gray-600 text-gray-400 hover:bg-gray-800"
            onClick={() => utils.aiMemory.list.invalidate()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs + Memory List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-900 border border-gray-700 w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="data-[state=active]:bg-gray-700">
              All
              <Badge variant="secondary" className="ml-1.5 text-xs bg-gray-700 text-gray-300">
                {memories?.length ?? 0}
              </Badge>
            </TabsTrigger>
            {(Object.entries(CATEGORY_CONFIG) as [MemoryCategory, typeof CATEGORY_CONFIG[MemoryCategory]][]).map(([cat, cfg]) => (
              <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-gray-700">
                {cfg.label}
                {(categoryCounts[cat] ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs bg-gray-700 text-gray-300">
                    {categoryCounts[cat]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mr-3" />
                Loading memories...
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Brain className="h-12 w-12 text-gray-600 mb-4" />
                <p className="text-gray-400 font-medium mb-1">
                  {searchQuery ? "No memories match your search" : "No memories yet"}
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  {searchQuery
                    ? "Try a different search term"
                    : "Add your first memory or use Auto-Extract to get started"}
                </p>
                {!searchQuery && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                      onClick={() => setShowExtractPanel(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-amber-400" />
                      Auto-Extract
                    </Button>
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => { resetForm(); setShowAddDialog(true); }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Memory
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-2">
                <div className="flex flex-col gap-3">
                  {filteredMemories.map((memory) => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory as Memory}
                      onEdit={openEditDialog}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Memory Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              Add New Memory
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Teach the AI something important to remember across all future sessions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Category</label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as MemoryCategory)}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {(Object.entries(CATEGORY_CONFIG) as [MemoryCategory, typeof CATEGORY_CONFIG[MemoryCategory]][]).map(([cat, cfg]) => (
                    <SelectItem key={cat} value={cat} className="text-white hover:bg-gray-700">
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">{CATEGORY_CONFIG[formCategory].description}</p>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Key (short label)</label>
              <Input
                placeholder="e.g., preferred_format, defendant_name"
                className="bg-gray-800 border-gray-600 text-white"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Value (what to remember)</label>
              <Textarea
                placeholder="e.g., Always use bullet points and keep responses under 200 words"
                className="bg-gray-800 border-gray-600 text-white resize-none"
                rows={3}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Importance</label>
              <ImportanceStars value={formImportance} onChange={setFormImportance} />
              <p className="text-xs text-gray-500 mt-1">
                Higher importance = more likely to be included in every chat context
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={addMutation.isPending}
              onClick={handleSave}
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Save Memory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Memory Dialog */}
      <Dialog open={!!editingMemory} onOpenChange={(open) => !open && setEditingMemory(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-400" />
              Edit Memory
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Category</label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as MemoryCategory)}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {(Object.entries(CATEGORY_CONFIG) as [MemoryCategory, typeof CATEGORY_CONFIG[MemoryCategory]][]).map(([cat, cfg]) => (
                    <SelectItem key={cat} value={cat} className="text-white hover:bg-gray-700">
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Key</label>
              <Input
                className="bg-gray-800 border-gray-600 text-white"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Value</label>
              <Textarea
                className="bg-gray-800 border-gray-600 text-white resize-none"
                rows={3}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Importance</label>
              <ImportanceStars value={formImportance} onChange={setFormImportance} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setEditingMemory(null)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={updateMutation.isPending}
              onClick={handleUpdate}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit2 className="h-4 w-4 mr-2" />}
              Update Memory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
