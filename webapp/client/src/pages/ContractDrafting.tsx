import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Sparkles, Download } from "lucide-react";

export default function ContractDrafting() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [parties, setParties] = useState<string[]>(["", ""]);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [draftedContract, setDraftedContract] = useState<any>(null);

  const { data: templates, isLoading: templatesLoading } = trpc.contracts.getTemplates.useQuery();
  const createContract = trpc.contracts.createFromTemplate.useMutation();
  const suggestClauses = trpc.contracts.suggestClauses.useMutation();

  const selectedTemplateData = templates?.find((t) => t.id === selectedTemplate);

  const handleAddParty = () => {
    setParties([...parties, ""]);
  };

  const handleRemoveParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index));
  };

  const handlePartyChange = (index: number, value: string) => {
    const newParties = [...parties];
    newParties[index] = value;
    setParties(newParties);
  };

  const handlePlaceholderChange = (key: string, value: string) => {
    setPlaceholders({ ...placeholders, [key]: value });
  };

  const handleDraftContract = async () => {
    if (!selectedTemplate || !title) return;

    const result = await createContract.mutateAsync({
      templateId: selectedTemplate,
      title,
      parties: parties.filter((p) => p.trim() !== ""),
      placeholderValues: placeholders,
    });

    setDraftedContract(result);
  };

  const handleGetSuggestions = async () => {
    if (!selectedTemplateData) return;

    const context = `Title: ${title}\nParties: ${parties.join(", ")}\nPlaceholders: ${JSON.stringify(placeholders)}`;
    const suggestions = await suggestClauses.mutateAsync({
      contractType: selectedTemplateData.contractType,
      context,
    });

    console.log("AI Suggestions:", suggestions);
    alert(`Received ${suggestions.length} clause suggestions! Check console for details.`);
  };

  const handleDownload = () => {
    if (!draftedContract) return;

    const blob = new Blob([draftedContract.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draftedContract.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (templatesLoading) {
    return (
      <div className="container py-8">
        <p>Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Contract Drafting Wizard</h1>
        <p className="text-muted-foreground mt-2">Create professional contracts from templates with AI-powered assistance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Wizard Form */}
        <div className="space-y-6">
          {/* Step 1: Select Template */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Step 1: Select Template
              </CardTitle>
              <CardDescription>Choose a contract template to start with</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTemplate?.toString()} onValueChange={(v) => setSelectedTemplate(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name} ({template.contractType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplateData && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <p className="text-sm font-medium">{selectedTemplateData.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedTemplateData.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Used {selectedTemplateData.usageCount} times • Type: {selectedTemplateData.contractType}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Contract Details */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Contract Details</CardTitle>
                <CardDescription>Fill in the basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Contract Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Service Agreement with Acme Corp" />
                </div>

                <div>
                  <Label>Parties</Label>
                  {parties.map((party, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input value={party} onChange={(e) => handlePartyChange(index, e.target.value)} placeholder={`Party ${index + 1} name`} />
                      {parties.length > 2 && (
                        <Button variant="outline" size="icon" onClick={() => handleRemoveParty(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-2" onClick={handleAddParty}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Party
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Placeholders */}
          {selectedTemplate && selectedTemplateData?.placeholders && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Fill Placeholders</CardTitle>
                <CardDescription>Customize the contract with specific details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTemplateData.placeholders?.map((placeholder) => (
                  <div key={placeholder.key}>
                    <Label htmlFor={placeholder.key}>{placeholder.label}</Label>
                    <Input
                      id={placeholder.key}
                      value={placeholders[placeholder.key] || ""}
                      onChange={(e) => handlePlaceholderChange(placeholder.key, e.target.value)}
                      placeholder={`Enter ${placeholder.label.toLowerCase()}`}
                      required={placeholder.required}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {selectedTemplate && (
            <div className="flex gap-2">
              <Button onClick={handleDraftContract} disabled={!title || createContract.isPending} className="flex-1">
                {createContract.isPending ? "Drafting..." : "Draft Contract"}
              </Button>
              <Button variant="outline" onClick={handleGetSuggestions} disabled={suggestClauses.isPending}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Suggestions
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Preview */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Contract Preview</CardTitle>
              <CardDescription>
                {draftedContract ? "Your drafted contract" : "Select a template and fill in details to see preview"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {draftedContract ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-md">
                    <p className="font-semibold">{draftedContract.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">Type: {draftedContract.contractType}</p>
                    <p className="text-sm text-muted-foreground">Status: {draftedContract.status}</p>
                  </div>

                  <div className="max-h-96 overflow-y-auto p-4 border rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">{draftedContract.content}</pre>
                  </div>

                  <Button onClick={handleDownload} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Contract
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No contract drafted yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
