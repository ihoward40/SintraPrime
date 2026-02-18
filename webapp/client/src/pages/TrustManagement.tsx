import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  FileText, Plus, Search, Filter, Eye, Edit, Archive, Trash2, 
  Users, DollarSign, Calendar, AlertCircle, CheckCircle, Clock,
  Download, Share2, MoreVertical
} from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type TrustStatus = "draft" | "active" | "terminated" | "amended";
type TrustType = "revocable_living" | "irrevocable" | "testamentary" | "charitable" | "special_needs" | "asset_protection";

const TRUST_TYPE_LABELS: Record<TrustType, string> = {
  revocable_living: "Revocable Living",
  irrevocable: "Irrevocable",
  testamentary: "Testamentary",
  charitable: "Charitable",
  special_needs: "Special Needs",
  asset_protection: "Asset Protection",
};

const STATUS_COLORS: Record<TrustStatus, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-300",
  active: "bg-green-100 text-green-700 border-green-300",
  terminated: "bg-red-100 text-red-700 border-red-300",
  amended: "bg-blue-100 text-blue-700 border-blue-300",
};

const STATUS_ICONS: Record<TrustStatus, any> = {
  draft: Clock,
  active: CheckCircle,
  terminated: AlertCircle,
  amended: Edit,
};

export default function TrustManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedTrust, setSelectedTrust] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  const { data: trusts, refetch } = trpc.trusts.list.useQuery();
  const deleteTrustMutation = trpc.trusts.delete.useMutation();
  const updateTrustMutation = trpc.trusts.update.useMutation();

  // Filter trusts
  const filteredTrusts = trusts?.filter(trust => {
    const matchesSearch = !searchQuery || 
      trust.trustName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trust.settlor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || trust.status === statusFilter;
    const matchesType = typeFilter === "all" || trust.trustType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this trust? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteTrustMutation.mutateAsync({ id });
      await refetch();
      toast.success("Trust deleted successfully");
    } catch (error) {
      toast.error("Failed to delete trust");
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await updateTrustMutation.mutateAsync({ id, status: "terminated" });
      await refetch();
      toast.success("Trust archived");
    } catch (error) {
      toast.error("Failed to archive trust");
    }
  };

  const handleViewDetails = async (trustId: number) => {
    try {
      const caller = trpc.useUtils();
      const trustDetails = await caller.trusts.getById.fetch({ id: trustId });
      setSelectedTrust(trustDetails);
      setShowDetails(true);
    } catch (error) {
      toast.error("Failed to load trust details");
    }
  };

  const exportTrust = (trust: any) => {
    const data = JSON.stringify(trust, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trust-${trust.trustName.replace(/\s+/g, '-')}.json`;
    a.click();
    toast.success("Trust exported");
  };

  // Calculate statistics
  const stats = {
    total: trusts?.length || 0,
    active: trusts?.filter(t => t.status === "active").length || 0,
    draft: trusts?.filter(t => t.status === "draft").length || 0,
    totalAssets: 0, // Will be calculated from assets when available
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Trust Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor all trusts
            </p>
          </div>
          <Link href="/trusts/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Trust
            </Button>
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Trusts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Trusts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{stats.active}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft Trusts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-2xl font-bold">{stats.draft}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">
                  ${(stats.totalAssets / 100).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search trusts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="amended">Amended</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="revocable_living">Revocable Living</SelectItem>
                  <SelectItem value="irrevocable">Irrevocable</SelectItem>
                  <SelectItem value="testamentary">Testamentary</SelectItem>
                  <SelectItem value="charitable">Charitable</SelectItem>
                  <SelectItem value="special_needs">Special Needs</SelectItem>
                  <SelectItem value="asset_protection">Asset Protection</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trust List */}
        <div className="space-y-4">
          {filteredTrusts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No trusts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by creating your first trust"}
                </p>
                {!searchQuery && statusFilter === "all" && typeFilter === "all" && (
                  <Link href="/trusts/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Trust
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredTrusts.map((trust) => {
              const StatusIcon = STATUS_ICONS[trust.status as TrustStatus];
              return (
                <Card key={trust.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{trust.trustName}</h3>
                          <Badge variant="outline" className={STATUS_COLORS[trust.status as TrustStatus]}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {trust.status}
                          </Badge>
                          <Badge variant="outline">
                            {TRUST_TYPE_LABELS[trust.trustType as TrustType]}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Settlor: {trust.settlor}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {trust.establishedDate
                                ? new Date(trust.establishedDate).toLocaleDateString()
                                : "Not established"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>
                              {trust.trustType.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>

                        {trust.purpose && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                            {trust.purpose}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(trust.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportTrust(trust)}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleArchive(trust.id)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(trust.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Trust Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTrust?.trustName}</DialogTitle>
            </DialogHeader>
            {selectedTrust && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Type:</span>
                      <p className="font-medium">
                        {TRUST_TYPE_LABELS[selectedTrust.trustType as TrustType]}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-medium capitalize">{selectedTrust.status}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Settlor:</span>
                      <p className="font-medium">{selectedTrust.settlor}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Established:</span>
                      <p className="font-medium">
                        {selectedTrust.establishedDate
                          ? new Date(selectedTrust.establishedDate).toLocaleDateString()
                          : "Not established"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedTrust.purpose && (
                  <div>
                    <h4 className="font-semibold mb-2">Purpose</h4>
                    <p className="text-sm text-muted-foreground">{selectedTrust.purpose}</p>
                  </div>
                )}

                {selectedTrust.trustees && selectedTrust.trustees.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Trustees ({selectedTrust.trustees.length})</h4>
                    <div className="space-y-2">
                      {selectedTrust.trustees.map((trustee: any) => (
                        <div key={trustee.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{trustee.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{trustee.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTrust.beneficiaries && selectedTrust.beneficiaries.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Beneficiaries ({selectedTrust.beneficiaries.length})</h4>
                    <div className="space-y-2">
                      {selectedTrust.beneficiaries.map((beneficiary: any) => (
                        <div key={beneficiary.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{beneficiary.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {beneficiary.relationship} • {beneficiary.distributionShare}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTrust.assets && selectedTrust.assets.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Assets ({selectedTrust.assets.length})</h4>
                    <div className="space-y-2">
                      {selectedTrust.assets.map((asset: any) => (
                        <div key={asset.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{asset.description}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {asset.assetType.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <p className="font-semibold">
                            ${(asset.estimatedValue / 100).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
