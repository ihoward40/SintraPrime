import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, DollarSign, BookOpen, TrendingUp, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TrustLedgerProps {
  trustAccountId: number;
}

export function TrustLedger({ trustAccountId }: TrustLedgerProps) {
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [basis, setBasis] = useState<"book" | "tax" | "both">("both");
  const [lines, setLines] = useState<Array<{
    ledgerAccountId: number;
    lineType: "debit" | "credit";
    amount: string;
    memo: string;
  }>>([
    { ledgerAccountId: 0, lineType: "debit", amount: "", memo: "" },
    { ledgerAccountId: 0, lineType: "credit", amount: "", memo: "" },
  ]);

  const { data: chartOfAccounts } = trpc.trustAccounting.getChartOfAccounts.useQuery({
    trustAccountId,
  });

  const { data: journalEntries, refetch: refetchEntries } = trpc.trustAccounting.getJournalEntries.useQuery({
    trustAccountId,
  });

  const { data: trialBalance } = trpc.trustAccounting.getTrialBalance.useQuery({
    trustAccountId,
    asOfDate: new Date(),
    basis: "both",
  });

  const createEntry = trpc.trustAccounting.createJournalEntry.useMutation({
    onSuccess: () => {
      toast.success("Journal entry created successfully");
      setShowNewEntry(false);
      resetForm();
      refetchEntries();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setDescription("");
    setReference("");
    setBasis("both");
    setLines([
      { ledgerAccountId: 0, lineType: "debit", amount: "", memo: "" },
      { ledgerAccountId: 0, lineType: "credit", amount: "", memo: "" },
    ]);
  };

  const addLine = () => {
    setLines([...lines, { ledgerAccountId: 0, lineType: "debit", amount: "", memo: "" }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    (newLines[index] as any)[field] = value;
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const totalDebits = lines
      .filter(l => l.lineType === "debit" && l.amount)
      .reduce((sum, l) => sum + parseFloat(l.amount || "0"), 0);
    const totalCredits = lines
      .filter(l => l.lineType === "credit" && l.amount)
      .reduce((sum, l) => sum + parseFloat(l.amount || "0"), 0);
    return { totalDebits, totalCredits, balanced: Math.abs(totalDebits - totalCredits) < 0.01 };
  };

  const handleSubmit = () => {
    const { balanced } = calculateTotals();
    if (!balanced) {
      toast.error("Debits must equal credits");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    const validLines = lines.filter(l => l.ledgerAccountId > 0 && l.amount && parseFloat(l.amount) > 0);
    if (validLines.length < 2) {
      toast.error("At least 2 valid lines required");
      return;
    }

    createEntry.mutate({
      trustAccountId,
      entryDate: new Date(entryDate),
      description,
      reference,
      basis,
      lines: validLines.map(l => ({
        ledgerAccountId: l.ledgerAccountId,
        lineType: l.lineType,
        amountInCents: Math.round(parseFloat(l.amount) * 100),
        memo: l.memo || undefined,
      })),
    });
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Journal Entries</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
        </TabsList>

        {/* Journal Entries Tab */}
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Journal Entries</CardTitle>
                  <CardDescription>Record trust accounting transactions</CardDescription>
                </div>
                <Button onClick={() => setShowNewEntry(!showNewEntry)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Entry
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showNewEntry && (
                <Card className="mb-6 border-2 border-primary">
                  <CardHeader>
                    <CardTitle className="text-lg">New Journal Entry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="entryDate">Entry Date</Label>
                        <Input
                          id="entryDate"
                          type="date"
                          value={entryDate}
                          onChange={(e) => setEntryDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="basis">Basis</Label>
                        <Select value={basis} onValueChange={(v: any) => setBasis(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="book">Book</SelectItem>
                            <SelectItem value="tax">Tax</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Record dividend income"
                      />
                    </div>

                    <div>
                      <Label htmlFor="reference">Reference (Optional)</Label>
                      <Input
                        id="reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Check #, invoice #, etc."
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Entry Lines</Label>
                        <Button size="sm" variant="outline" onClick={addLine}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Line
                        </Button>
                      </div>

                      {lines.map((line, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-4">
                            <Label className="text-xs">Account</Label>
                            <Select
                              value={line.ledgerAccountId.toString()}
                              onValueChange={(v) => updateLine(index, "ledgerAccountId", parseInt(v))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select account" />
                              </SelectTrigger>
                              <SelectContent>
                                {chartOfAccounts?.map((account) => (
                                  <SelectItem key={account.id} value={account.id.toString()}>
                                    {account.accountNumber} - {account.accountName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Type</Label>
                            <Select
                              value={line.lineType}
                              onValueChange={(v: any) => updateLine(index, "lineType", v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="debit">Debit</SelectItem>
                                <SelectItem value="credit">Credit</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Amount</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.amount}
                              onChange={(e) => updateLine(index, "amount", e.target.value)}
                              placeholder="0.00"
                            />
                          </div>

                          <div className="col-span-3">
                            <Label className="text-xs">Memo</Label>
                            <Input
                              value={line.memo}
                              onChange={(e) => updateLine(index, "memo", e.target.value)}
                              placeholder="Optional"
                            />
                          </div>

                          <div className="col-span-1">
                            {lines.length > 2 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeLine(index)}
                                className="text-destructive"
                              >
                                ×
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="space-y-1">
                          <div className="flex items-center gap-4 text-sm">
                            <span>Total Debits: ${totals.totalDebits.toFixed(2)}</span>
                            <span>Total Credits: ${totals.totalCredits.toFixed(2)}</span>
                          </div>
                          {totals.balanced ? (
                            <Badge variant="default" className="bg-green-500">Balanced ✓</Badge>
                          ) : (
                            <Badge variant="destructive">Out of Balance</Badge>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setShowNewEntry(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSubmit} disabled={!totals.balanced || createEntry.isPending}>
                            {createEntry.isPending ? "Saving..." : "Save Entry"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* List of existing entries */}
              <div className="space-y-3">
                {journalEntries?.map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold">{entry.entryNumber}</span>
                            <Badge variant="outline">{entry.basis}</Badge>
                            {entry.isPosted && <Badge variant="default">Posted</Badge>}
                          </div>
                          <p className="text-sm">{entry.description}</p>
                          {entry.reference && (
                            <p className="text-xs text-muted-foreground">Ref: {entry.reference}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(entry.entryDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {journalEntries?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No journal entries yet. Click "New Entry" to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trial Balance Tab */}
        <TabsContent value="trial-balance">
          <Card>
            <CardHeader>
              <CardTitle>Trial Balance</CardTitle>
              <CardDescription>Account balances as of {new Date().toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account #</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance?.map((account: any) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.accountNumber}</TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {account.debitBalance > 0 ? `$${(account.debitBalance / 100).toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {account.creditBalance > 0 ? `$${(account.creditBalance / 100).toFixed(2)}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        ${Math.abs(account.netBalance / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {trialBalance?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No transactions recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart of Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>Trust accounting ledger accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account #</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Normal Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chartOfAccounts?.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-mono text-sm">{account.accountNumber}</TableCell>
                      <TableCell className="font-medium">{account.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.accountType}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{account.accountCategory}</TableCell>
                      <TableCell>
                        <Badge variant={account.normalBalance === "debit" ? "default" : "secondary"}>
                          {account.normalBalance}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
