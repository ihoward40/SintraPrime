import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { 
  FileText, Users, DollarSign, Shield, Plus, Trash2, ArrowLeft, ArrowRight,
  Check, AlertCircle, Building, Briefcase, Home, Coins, FileCode, Package
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

type TrustType = "revocable_living" | "irrevocable" | "testamentary" | "charitable" | "special_needs" | "spendthrift" | "asset_protection";
type TrusteeRole = "primary" | "successor" | "co_trustee";
type BeneficiaryType = "primary" | "contingent" | "remainder";
type AssetType = "real_estate" | "cash" | "securities" | "business_interest" | "personal_property" | "intellectual_property" | "other";

interface Trustee {
  id: string;
  name: string;
  role: TrusteeRole;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

interface Beneficiary {
  id: string;
  name: string;
  relationship?: string;
  beneficiaryType: BeneficiaryType;
  distributionShare?: string;
  distributionConditions?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
}

interface Asset {
  id: string;
  assetType: AssetType;
  description: string;
  estimatedValue?: number;
  location?: string;
}

const TRUST_TYPES: { value: TrustType; label: string; description: string }[] = [
  { value: "revocable_living", label: "Revocable Living Trust", description: "Can be modified or revoked during settlor's lifetime" },
  { value: "irrevocable", label: "Irrevocable Trust", description: "Cannot be modified once established, offers asset protection" },
  { value: "testamentary", label: "Testamentary Trust", description: "Created through a will, takes effect after death" },
  { value: "charitable", label: "Charitable Trust", description: "Benefits charitable organizations with tax advantages" },
  { value: "special_needs", label: "Special Needs Trust", description: "Provides for disabled beneficiaries without affecting benefits" },
  { value: "spendthrift", label: "Spendthrift Trust", description: "Protects assets from beneficiary's creditors" },
  { value: "asset_protection", label: "Asset Protection Trust", description: "Shields assets from future creditors and lawsuits" },
];

const ASSET_TYPES: { value: AssetType; label: string; icon: any }[] = [
  { value: "real_estate", label: "Real Estate", icon: Home },
  { value: "cash", label: "Cash & Bank Accounts", icon: DollarSign },
  { value: "securities", label: "Securities & Investments", icon: Coins },
  { value: "business_interest", label: "Business Interest", icon: Briefcase },
  { value: "personal_property", label: "Personal Property", icon: Package },
  { value: "intellectual_property", label: "Intellectual Property", icon: FileCode },
  { value: "other", label: "Other Assets", icon: Building },
];

export default function TrustCreationWizard() {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Basic Information
  const [trustName, setTrustName] = useState("");
  const [trustType, setTrustType] = useState<TrustType>("revocable_living");
  const [settlor, setSettlor] = useState("");
  const [purpose, setPurpose] = useState("");
  const [establishedDate, setEstablishedDate] = useState(new Date().toISOString().split('T')[0]);
  const [caseId, setCaseId] = useState<number | undefined>();
  
  // Step 2: Trustees
  const [trustees, setTrustees] = useState<Trustee[]>([]);
  const [showAddTrustee, setShowAddTrustee] = useState(false);
  const [newTrustee, setNewTrustee] = useState<Partial<Trustee>>({
    role: "primary",
  });
  
  // Step 3: Beneficiaries
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showAddBeneficiary, setShowAddBeneficiary] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState<Partial<Beneficiary>>({
    beneficiaryType: "primary",
  });
  
  // Step 4: Assets
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    assetType: "cash",
  });
  
  // Step 5: Terms & Review
  const [terms, setTerms] = useState("");

  const { data: cases } = trpc.cases.list.useQuery();
  const createTrustMutation = trpc.trusts.create.useMutation();
  const addTrusteeMutation = trpc.trusts.addTrustee.useMutation();
  const addBeneficiaryMutation = trpc.trusts.addBeneficiary.useMutation();
  const addAssetMutation = trpc.trusts.addAsset.useMutation();

  const steps = [
    { number: 1, title: "Basic Information", icon: FileText },
    { number: 2, title: "Trustees", icon: Shield },
    { number: 3, title: "Beneficiaries", icon: Users },
    { number: 4, title: "Assets", icon: DollarSign },
    { number: 5, title: "Terms & Review", icon: Check },
  ];

  // Add Trustee
  const handleAddTrustee = () => {
    if (!newTrustee.name) {
      toast.error("Trustee name is required");
      return;
    }
    const trustee: Trustee = {
      id: Date.now().toString(),
      name: newTrustee.name,
      role: newTrustee.role || "primary",
      email: newTrustee.email,
      phone: newTrustee.phone,
      address: newTrustee.address,
      notes: newTrustee.notes,
    };
    setTrustees([...trustees, trustee]);
    setNewTrustee({ role: "primary" });
    setShowAddTrustee(false);
    toast.success("Trustee added");
  };

  const handleRemoveTrustee = (id: string) => {
    setTrustees(trustees.filter(t => t.id !== id));
    toast.success("Trustee removed");
  };

  // Add Beneficiary
  const handleAddBeneficiary = () => {
    if (!newBeneficiary.name) {
      toast.error("Beneficiary name is required");
      return;
    }
    const beneficiary: Beneficiary = {
      id: Date.now().toString(),
      name: newBeneficiary.name!,
      relationship: newBeneficiary.relationship,
      beneficiaryType: newBeneficiary.beneficiaryType || "primary",
      distributionShare: newBeneficiary.distributionShare,
      distributionConditions: newBeneficiary.distributionConditions,
      email: newBeneficiary.email,
      phone: newBeneficiary.phone,
      address: newBeneficiary.address,
      taxId: newBeneficiary.taxId,
      notes: newBeneficiary.notes,
    };
    setBeneficiaries([...beneficiaries, beneficiary]);
    setNewBeneficiary({ beneficiaryType: "primary" });
    setShowAddBeneficiary(false);
    toast.success("Beneficiary added");
  };

  const handleRemoveBeneficiary = (id: string) => {
    setBeneficiaries(beneficiaries.filter(b => b.id !== id));
    toast.success("Beneficiary removed");
  };

  // Add Asset
  const handleAddAsset = () => {
    if (!newAsset.description) {
      toast.error("Asset description is required");
      return;
    }
    const asset: Asset = {
      id: Date.now().toString(),
      assetType: newAsset.assetType || "cash",
      description: newAsset.description!,
      estimatedValue: newAsset.estimatedValue,
      location: newAsset.location,
    };
    setAssets([...assets, asset]);
    setNewAsset({ assetType: "cash" });
    setShowAddAsset(false);
    toast.success("Asset added");
  };

  const handleRemoveAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    toast.success("Asset removed");
  };

  // Navigation
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return trustName && settlor && terms;
      case 2:
        return trustees.length > 0;
      case 3:
        return beneficiaries.length > 0;
      case 4:
        return true; // Assets are optional
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      toast.error("Please complete all required fields");
      return;
    }
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Submit Trust
  const handleSubmit = async () => {
    if (!canProceed()) {
      toast.error("Please complete all required fields");
      return;
    }

    try {
      // Create trust
      const trustResult = await createTrustMutation.mutateAsync({
        trustName,
        trustType,
        settlor,
        purpose,
        terms,
        caseId,
        establishedDate: new Date(establishedDate),
      });

      const trustId = (trustResult as any).insertId || (trustResult as any)[0]?.insertId;

      if (!trustId) {
        throw new Error("Failed to get trust ID");
      }

      // Add trustees
      for (const trustee of trustees) {
        await addTrusteeMutation.mutateAsync({
          trustId,
          name: trustee.name,
          role: trustee.role,
          contactInfo: {
            email: trustee.email,
            phone: trustee.phone,
            address: trustee.address,
          },
          notes: trustee.notes,
        });
      }

      // Add beneficiaries
      for (const beneficiary of beneficiaries) {
        await addBeneficiaryMutation.mutateAsync({
          trustId,
          name: beneficiary.name,
          relationship: beneficiary.relationship,
          beneficiaryType: beneficiary.beneficiaryType,
          distributionShare: beneficiary.distributionShare,
          distributionConditions: beneficiary.distributionConditions,
          contactInfo: {
            email: beneficiary.email,
            phone: beneficiary.phone,
            address: beneficiary.address,
            taxId: beneficiary.taxId,
          },
          notes: beneficiary.notes,
        });
      }

      // Add assets
      for (const asset of assets) {
        await addAssetMutation.mutateAsync({
          trustId,
          assetType: asset.assetType,
          description: asset.description,
          estimatedValue: asset.estimatedValue ? asset.estimatedValue * 100 : undefined, // Convert to cents
          location: asset.location,
        });
      }

      toast.success("Trust created successfully!");
      navigate("/trusts");
    } catch (error) {
      console.error("Error creating trust:", error);
      toast.error("Failed to create trust");
    }
  };

  const getRoleBadgeColor = (role: TrusteeRole) => {
    switch (role) {
      case "primary": return "bg-blue-100 text-blue-800";
      case "successor": return "bg-purple-100 text-purple-800";
      case "co_trustee": return "bg-green-100 text-green-800";
    }
  };

  const getBeneficiaryTypeBadgeColor = (type: BeneficiaryType) => {
    switch (type) {
      case "primary": return "bg-blue-100 text-blue-800";
      case "contingent": return "bg-yellow-100 text-yellow-800";
      case "remainder": return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Create Trust</h1>
          <p className="text-muted-foreground">
            Set up a new trust with trustees, beneficiaries, and assets
          </p>
        </div>

        {/* Progress Steps */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        currentStep >= step.number
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.number ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-xs mt-2 text-center">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-0.5 w-16 mx-2 ${
                        currentStep > step.number ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step Content */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the fundamental details of the trust</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="trustName">Trust Name *</Label>
                  <Input
                    id="trustName"
                    value={trustName}
                    onChange={(e) => setTrustName(e.target.value)}
                    placeholder="e.g., Smith Family Living Trust"
                  />
                </div>

                <div>
                  <Label htmlFor="trustType">Trust Type *</Label>
                  <Select value={trustType} onValueChange={(v) => setTrustType(v as TrustType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRUST_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="settlor">Settlor (Trust Creator) *</Label>
                  <Input
                    id="settlor"
                    value={settlor}
                    onChange={(e) => setSettlor(e.target.value)}
                    placeholder="Full legal name"
                  />
                </div>

                <div>
                  <Label htmlFor="establishedDate">Established Date</Label>
                  <Input
                    id="establishedDate"
                    type="date"
                    value={establishedDate}
                    onChange={(e) => setEstablishedDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="caseId">Link to Case (Optional)</Label>
                  <Select value={caseId?.toString() || "none"} onValueChange={(v) => setCaseId(v !== "none" ? parseInt(v) : undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {cases?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="purpose">Purpose</Label>
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Describe the purpose of this trust..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="terms">Trust Terms & Conditions *</Label>
                  <Textarea
                    id="terms"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    placeholder="Enter the full trust document text or key terms..."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This should include distribution rules, trustee powers, and any special provisions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trustees</CardTitle>
                  <CardDescription>Add individuals who will manage the trust</CardDescription>
                </div>
                <Dialog open={showAddTrustee} onOpenChange={setShowAddTrustee}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trustee
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Trustee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          value={newTrustee.name || ""}
                          onChange={(e) => setNewTrustee({ ...newTrustee, name: e.target.value })}
                          placeholder="Full legal name"
                        />
                      </div>
                      <div>
                        <Label>Role *</Label>
                        <Select
                          value={newTrustee.role}
                          onValueChange={(v) => setNewTrustee({ ...newTrustee, role: v as TrusteeRole })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary Trustee</SelectItem>
                            <SelectItem value="successor">Successor Trustee</SelectItem>
                            <SelectItem value="co_trustee">Co-Trustee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newTrustee.email || ""}
                          onChange={(e) => setNewTrustee({ ...newTrustee, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={newTrustee.phone || ""}
                          onChange={(e) => setNewTrustee({ ...newTrustee, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Textarea
                          value={newTrustee.address || ""}
                          onChange={(e) => setNewTrustee({ ...newTrustee, address: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={newTrustee.notes || ""}
                          onChange={(e) => setNewTrustee({ ...newTrustee, notes: e.target.value })}
                          rows={2}
                        />
                      </div>
                      <Button onClick={handleAddTrustee} className="w-full">
                        Add Trustee
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {trustees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trustees added yet</p>
                  <p className="text-sm">Click "Add Trustee" to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trustees.map((trustee) => (
                    <Card key={trustee.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{trustee.name}</h4>
                              <Badge className={getRoleBadgeColor(trustee.role)}>
                                {trustee.role.replace("_", " ")}
                              </Badge>
                            </div>
                            {trustee.email && (
                              <p className="text-sm text-muted-foreground">Email: {trustee.email}</p>
                            )}
                            {trustee.phone && (
                              <p className="text-sm text-muted-foreground">Phone: {trustee.phone}</p>
                            )}
                            {trustee.address && (
                              <p className="text-sm text-muted-foreground">Address: {trustee.address}</p>
                            )}
                            {trustee.notes && (
                              <p className="text-sm text-muted-foreground mt-1">Notes: {trustee.notes}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTrustee(trustee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Beneficiaries</CardTitle>
                  <CardDescription>Add individuals or organizations who will benefit from the trust</CardDescription>
                </div>
                <Dialog open={showAddBeneficiary} onOpenChange={setShowAddBeneficiary}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Beneficiary
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Beneficiary</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          value={newBeneficiary.name || ""}
                          onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                          placeholder="Full legal name"
                        />
                      </div>
                      <div>
                        <Label>Beneficiary Type *</Label>
                        <Select
                          value={newBeneficiary.beneficiaryType}
                          onValueChange={(v) => setNewBeneficiary({ ...newBeneficiary, beneficiaryType: v as BeneficiaryType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary Beneficiary</SelectItem>
                            <SelectItem value="contingent">Contingent Beneficiary</SelectItem>
                            <SelectItem value="remainder">Remainder Beneficiary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Relationship</Label>
                        <Input
                          value={newBeneficiary.relationship || ""}
                          onChange={(e) => setNewBeneficiary({ ...newBeneficiary, relationship: e.target.value })}
                          placeholder="e.g., Spouse, Child, Charity"
                        />
                      </div>
                      <div>
                        <Label>Distribution Share</Label>
                        <Input
                          value={newBeneficiary.distributionShare || ""}
                          onChange={(e) => setNewBeneficiary({ ...newBeneficiary, distributionShare: e.target.value })}
                          placeholder="e.g., 50%, 1/3, Equal Share"
                        />
                      </div>
                      <div>
                        <Label>Distribution Conditions</Label>
                        <Textarea
                          value={newBeneficiary.distributionConditions || ""}
                          onChange={(e) => setNewBeneficiary({ ...newBeneficiary, distributionConditions: e.target.value })}
                          placeholder="e.g., Upon reaching age 25, for education expenses"
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newBeneficiary.email || ""}
                          onChange={(e) => setNewBeneficiary({ ...newBeneficiary, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={newBeneficiary.phone || ""}
                          onChange={(e) => setNewBeneficiary({ ...newBeneficiary, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Tax ID (SSN/EIN)</Label>
                        <Input
                          value={newBeneficiary.taxId || ""}
                          onChange={(e) => setNewBeneficiary({ ...newBeneficiary, taxId: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleAddBeneficiary} className="w-full">
                        Add Beneficiary
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {beneficiaries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No beneficiaries added yet</p>
                  <p className="text-sm">Click "Add Beneficiary" to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {beneficiaries.map((beneficiary) => (
                    <Card key={beneficiary.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{beneficiary.name}</h4>
                              <Badge className={getBeneficiaryTypeBadgeColor(beneficiary.beneficiaryType)}>
                                {beneficiary.beneficiaryType}
                              </Badge>
                            </div>
                            {beneficiary.relationship && (
                              <p className="text-sm text-muted-foreground">Relationship: {beneficiary.relationship}</p>
                            )}
                            {beneficiary.distributionShare && (
                              <p className="text-sm text-muted-foreground">Share: {beneficiary.distributionShare}</p>
                            )}
                            {beneficiary.distributionConditions && (
                              <p className="text-sm text-muted-foreground">Conditions: {beneficiary.distributionConditions}</p>
                            )}
                            {beneficiary.email && (
                              <p className="text-sm text-muted-foreground">Email: {beneficiary.email}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveBeneficiary(beneficiary.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trust Assets</CardTitle>
                  <CardDescription>Add assets to be held in the trust (optional)</CardDescription>
                </div>
                <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Asset
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Asset</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Asset Type *</Label>
                        <Select
                          value={newAsset.assetType}
                          onValueChange={(v) => setNewAsset({ ...newAsset, assetType: v as AssetType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSET_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Description *</Label>
                        <Textarea
                          value={newAsset.description || ""}
                          onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                          placeholder="Describe the asset in detail..."
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Estimated Value ($)</Label>
                        <Input
                          type="number"
                          value={newAsset.estimatedValue || ""}
                          onChange={(e) => setNewAsset({ ...newAsset, estimatedValue: parseFloat(e.target.value) || undefined })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Location / Account Info</Label>
                        <Input
                          value={newAsset.location || ""}
                          onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                          placeholder="Physical location or account number"
                        />
                      </div>
                      <Button onClick={handleAddAsset} className="w-full">
                        Add Asset
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assets added yet</p>
                  <p className="text-sm">Assets can be added later</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset) => {
                    const AssetIcon = ASSET_TYPES.find(t => t.value === asset.assetType)?.icon || Building;
                    return (
                      <Card key={asset.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <AssetIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">
                                    {ASSET_TYPES.find(t => t.value === asset.assetType)?.label}
                                  </h4>
                                  {asset.estimatedValue && (
                                    <Badge variant="secondary">
                                      ${asset.estimatedValue.toLocaleString()}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{asset.description}</p>
                                {asset.location && (
                                  <p className="text-sm text-muted-foreground mt-1">Location: {asset.location}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAsset(asset.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Confirm</CardTitle>
              <CardDescription>Review all information before creating the trust</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <div><strong>Trust Name:</strong> {trustName}</div>
                  <div><strong>Type:</strong> {TRUST_TYPES.find(t => t.value === trustType)?.label}</div>
                  <div><strong>Settlor:</strong> {settlor}</div>
                  <div><strong>Established:</strong> {new Date(establishedDate).toLocaleDateString()}</div>
                  {purpose && <div><strong>Purpose:</strong> {purpose}</div>}
                  {caseId && <div><strong>Linked Case:</strong> {cases?.find(c => c.id === caseId)?.title}</div>}
                </div>
              </div>

              {/* Trustees Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Trustees ({trustees.length})
                </h3>
                <div className="space-y-2">
                  {trustees.map((trustee) => (
                    <div key={trustee.id} className="bg-muted p-3 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trustee.name}</span>
                        <Badge className={getRoleBadgeColor(trustee.role)}>
                          {trustee.role.replace("_", " ")}
                        </Badge>
                      </div>
                      {trustee.email && <div className="text-muted-foreground">{trustee.email}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Beneficiaries Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Beneficiaries ({beneficiaries.length})
                </h3>
                <div className="space-y-2">
                  {beneficiaries.map((beneficiary) => (
                    <div key={beneficiary.id} className="bg-muted p-3 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{beneficiary.name}</span>
                        <Badge className={getBeneficiaryTypeBadgeColor(beneficiary.beneficiaryType)}>
                          {beneficiary.beneficiaryType}
                        </Badge>
                      </div>
                      {beneficiary.distributionShare && (
                        <div className="text-muted-foreground">Share: {beneficiary.distributionShare}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Assets Summary */}
              {assets.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Assets ({assets.length})
                  </h3>
                  <div className="space-y-2">
                    {assets.map((asset) => (
                      <div key={asset.id} className="bg-muted p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {ASSET_TYPES.find(t => t.value === asset.assetType)?.label}
                          </span>
                          {asset.estimatedValue && (
                            <Badge variant="secondary">
                              ${asset.estimatedValue.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground">{asset.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Important Legal Notice</p>
                  <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                    This trust document should be reviewed by a qualified attorney before finalization.
                    SintraPrime is a tool, not a lawyer, and does not provide legal advice.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || createTrustMutation.isPending}>
              {createTrustMutation.isPending ? "Creating..." : "Create Trust"}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
