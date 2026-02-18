import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2, Users, DollarSign, FileText, Trash2, Edit2, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { validateEIN, formatEIN } from "@/lib/validation";
import { TrustLedger } from "./TrustLedger";

export function TrustAccountManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTrustId, setSelectedTrustId] = useState<number | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [filterYear, setFilterYear] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<"active" | "terminated" | "archived" | undefined>(undefined);

  // Form state
  const [trustName, setTrustName] = useState("");
  const [ein, setEin] = useState("");
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [trustType, setTrustType] = useState<"simple" | "complex" | "grantor" | "estate">("complex");
  const [fiscalYearEnd, setFiscalYearEnd] = useState("12-31");
  const [beneficiaries, setBeneficiaries] = useState<Array<{
    name: string;
    ssn: string;
    relationship: string;
    distributionPercentage: number;
  }>>([]);
  const [fiduciaries, setFiduciaries] = useState<Array<{
    name: string;
    title: string;
    address: string;
  }>>([]);

  const { data: trustAccounts, refetch } = trpc.trustAccounting.getTrustAccounts.useQuery({
    taxYear: filterYear,
    status: filterStatus,
  });

  const createTrust = trpc.trustAccounting.createTrustAccount.useMutation({
    onSuccess: () => {
      toast.success("Trust account created successfully");
      setShowCreateDialog(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setTrustName("");
    setEin("");
    setTaxYear(new Date().getFullYear());
    setTrustType("complex");
    setFiscalYearEnd("12-31");
    setBeneficiaries([]);
    setFiduciaries([]);
  };

  const addBeneficiary = () => {
    setBeneficiaries([
      ...beneficiaries,
      { name: "", ssn: "", relationship: "", distributionPercentage: 0 },
    ]);
  };

  const updateBeneficiary = (index: number, field: string, value: any) => {
    const updated = [...beneficiaries];
    (updated[index] as any)[field] = value;
    setBeneficiaries(updated);
  };

  const removeBeneficiary = (index: number) => {
    setBeneficiaries(beneficiaries.filter((_, i) => i !== index));
  };

  const addFiduciary = () => {
    setFiduciaries([...fiduciaries, { name: "", title: "", address: "" }]);
  };

  const updateFiduciary = (index: number, field: string, value: any) => {
    const updated = [...fiduciaries];
    (updated[index] as any)[field] = value;
    setFiduciaries(updated);
  };

  const removeFiduciary = (index: number) => {
    setFiduciaries(fiduciaries.filter((_, i) => i !== index));
  };

  const handleCreateTrust = () => {
    // Validate EIN
    const einValidation = validateEIN(ein);
    if (!einValidation.valid) {
      toast.error(einValidation.error);
      return;
    }

    // Validate beneficiaries total percentage
    const totalPercentage = beneficiaries.reduce((sum, b) => sum + b.distributionPercentage, 0);
    if (beneficiaries.length > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      toast.error("Beneficiary distribution percentages must total 100%");
      return;
    }

    createTrust.mutate({
      trustName,
      ein,
      taxYear,
      trustType,
      fiscalYearEnd,
      beneficiaries: beneficiaries.length > 0 ? beneficiaries : undefined,
      fiduciaries: fiduciaries.length > 0 ? fiduciaries : undefined,
    });
  };

  const handleViewLedger = (trustId: number) => {
    setSelectedTrustId(trustId);
    setShowLedger(true);
  };

  if (showLedger && selectedTrustId) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setShowLedger(false)}>
          ← Back to Trust Accounts
        </Button>
        <TrustLedger trustAccountId={selectedTrustId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trust Accounts</CardTitle>
              <CardDescription>Manage fiduciary trust and estate accounts</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Trust Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="w-48">
              <Label htmlFor="filterYear">Tax Year</Label>
              <Select
                value={filterYear?.toString() || "all"}
                onValueChange={(v) => setFilterYear(v === "all" ? undefined : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2023">2023</SelectItem>
                  <SelectItem value="2022">2022</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Label htmlFor="filterStatus">Status</Label>
              <Select
                value={filterStatus || "all"}
                onValueChange={(v: any) => setFilterStatus(v === "all" ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trust Accounts Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trust Name</TableHead>
                <TableHead>EIN</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tax Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trustAccounts?.map((trust) => (
                <TableRow key={trust.id}>
                  <TableCell className="font-medium">{trust.trustName}</TableCell>
                  <TableCell className="font-mono text-sm">{trust.ein}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{trust.trustType}</Badge>
                  </TableCell>
                  <TableCell>{trust.taxYear}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        trust.status === "active"
                          ? "default"
                          : trust.status === "terminated"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {trust.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewLedger(trust.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ledger
                      </Button>
                      <Button size="sm" variant="outline">
                        <FileText className="w-3 h-3 mr-1" />
                        K-1
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {trustAccounts?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No trust accounts yet. Click "New Trust Account" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Trust Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Trust Account</DialogTitle>
            <DialogDescription>
              Set up a new fiduciary trust or estate account for tax reporting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trustName">Trust Name *</Label>
                  <Input
                    id="trustName"
                    value={trustName}
                    onChange={(e) => setTrustName(e.target.value)}
                    placeholder="e.g., Smith Family Trust"
                  />
                </div>
                <div>
                  <Label htmlFor="ein">EIN *</Label>
                  <Input
                    id="ein"
                    value={ein}
                    onChange={(e) => setEin(formatEIN(e.target.value))}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="taxYear">Tax Year *</Label>
                  <Input
                    id="taxYear"
                    type="number"
                    value={taxYear}
                    onChange={(e) => setTaxYear(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="trustType">Trust Type *</Label>
                  <Select value={trustType} onValueChange={(v: any) => setTrustType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple Trust</SelectItem>
                      <SelectItem value="complex">Complex Trust</SelectItem>
                      <SelectItem value="grantor">Grantor Trust</SelectItem>
                      <SelectItem value="estate">Estate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fiscalYearEnd">Fiscal Year End</Label>
                  <Input
                    id="fiscalYearEnd"
                    value={fiscalYearEnd}
                    onChange={(e) => setFiscalYearEnd(e.target.value)}
                    placeholder="MM-DD"
                  />
                </div>
              </div>
            </div>

            {/* Beneficiaries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Beneficiaries</h3>
                <Button size="sm" variant="outline" onClick={addBeneficiary}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Beneficiary
                </Button>
              </div>

              {beneficiaries.map((beneficiary, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-3">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={beneficiary.name}
                          onChange={(e) => updateBeneficiary(index, "name", e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">SSN</Label>
                        <Input
                          value={beneficiary.ssn}
                          onChange={(e) => updateBeneficiary(index, "ssn", e.target.value)}
                          placeholder="XXX-XX-XXXX"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Relationship</Label>
                        <Input
                          value={beneficiary.relationship}
                          onChange={(e) => updateBeneficiary(index, "relationship", e.target.value)}
                          placeholder="Son, Daughter, etc."
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Distribution %</Label>
                        <Input
                          type="number"
                          value={beneficiary.distributionPercentage}
                          onChange={(e) =>
                            updateBeneficiary(index, "distributionPercentage", parseFloat(e.target.value))
                          }
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeBeneficiary(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fiduciaries */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Fiduciaries</h3>
                <Button size="sm" variant="outline" onClick={addFiduciary}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Fiduciary
                </Button>
              </div>

              {fiduciaries.map((fiduciary, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={fiduciary.name}
                          onChange={(e) => updateFiduciary(index, "name", e.target.value)}
                          placeholder="Smith Law Firm"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">Title</Label>
                        <Input
                          value={fiduciary.title}
                          onChange={(e) => updateFiduciary(index, "title", e.target.value)}
                          placeholder="Trustee"
                        />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">Address</Label>
                        <Input
                          value={fiduciary.address}
                          onChange={(e) => updateFiduciary(index, "address", e.target.value)}
                          placeholder="123 Main St, City, State 12345"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFiduciary(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTrust} disabled={createTrust.isPending}>
              {createTrust.isPending ? "Creating..." : "Create Trust Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
