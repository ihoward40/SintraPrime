import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, DollarSign, FileText, TrendingUp } from 'lucide-react';

export default function BeneficiaryManagement() {
  const [selectedTrustId, setSelectedTrustId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<number | null>(null);
  
  // Form states
  const [beneficiaryForm, setBeneficiaryForm] = useState({
    name: '',
    relationship: '',
    email: '',
    sharePercentage: '',
    taxId: '',
  });
  
  const [distributionForm, setDistributionForm] = useState({
    amount: '',
    distributionType: 'income' as 'income' | 'principal' | 'required_minimum' | 'discretionary',
    description: '',
    distributionDate: new Date().toISOString().split('T')[0],
  });
  
  // Queries
  const { data: beneficiaries, refetch: refetchBeneficiaries } = trpc.beneficiary.getByTrust.useQuery(
    { trustId: selectedTrustId! },
    { enabled: !!selectedTrustId }
  );
  const { data: distributions = [] } = trpc.beneficiary.getDistributions.useQuery(   { beneficiaryId: selectedBeneficiaryId!, taxYear: new Date().getFullYear() },
    { enabled: !!selectedBeneficiaryId }
  );
  
  const { data: k1Data } = trpc.beneficiary.prepareK1.useQuery(
    { beneficiaryId: selectedBeneficiaryId!, taxYear: new Date().getFullYear() },
    { enabled: !!selectedBeneficiaryId }
  );
  
  // Mutations
  const createBeneficiary = trpc.beneficiary.create.useMutation({
    onSuccess: () => {
      refetchBeneficiaries();
      setShowCreateDialog(false);
      resetBeneficiaryForm();
      alert('Beneficiary created successfully!');
    },
  });
  
  const recordDistribution = trpc.beneficiary.recordDistribution.useMutation({
    onSuccess: () => {
      setShowDistributionDialog(false);
      resetDistributionForm();
      alert('Distribution recorded successfully!');
    },
  });
  
  const resetBeneficiaryForm = () => {
    setBeneficiaryForm({
      name: '',
      relationship: '',
      email: '',
      sharePercentage: '',
      taxId: '',
    });
  };
  
  const resetDistributionForm = () => {
    setDistributionForm({
      amount: '',
      distributionType: 'income',
      description: '',
      distributionDate: new Date().toISOString().split('T')[0],
    });
  };
  
  const handleCreateBeneficiary = async () => {
    if (!selectedTrustId) {
      alert('Please select a trust first');
      return;
    }
    
    try {
      await createBeneficiary.mutateAsync({
        trustId: selectedTrustId,
        name: beneficiaryForm.name,
        relationship: beneficiaryForm.relationship,
        contactEmail: beneficiaryForm.email,
        distributionPercentage: parseFloat(beneficiaryForm.sharePercentage),
        taxId: beneficiaryForm.taxId,
      });
    } catch (error) {
      alert('Failed to create beneficiary: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  const handleRecordDistribution = async () => {
    if (!selectedBeneficiaryId || !selectedTrustId) {
      alert('Please select a beneficiary first');
      return;
    }
    
    try {
      await recordDistribution.mutateAsync({
        beneficiaryId: selectedBeneficiaryId,
        trustId: selectedTrustId,
        amount: Math.round(parseFloat(distributionForm.amount) * 100), // Convert to cents
        distributionType: distributionForm.distributionType,
        distributionDate: distributionForm.distributionDate,
        taxYear: new Date(distributionForm.distributionDate).getFullYear(),
        description: distributionForm.description,
      });
    } catch (error) {
      alert('Failed to record distribution: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Beneficiary Management</h1>
        <p className="text-muted-foreground">
          Manage trust beneficiaries, record distributions, and prepare K-1 forms
        </p>
      </div>
      
      {/* Trust Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Trust</CardTitle>
          <CardDescription>Choose a trust to manage its beneficiaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Enter Trust ID"
                value={selectedTrustId || ''}
                onChange={(e) => setSelectedTrustId(e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
            <Button onClick={() => refetchBeneficiaries()}>
              Load Beneficiaries
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {selectedTrustId && (
        <Tabs defaultValue="beneficiaries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="beneficiaries">
              <Users className="h-4 w-4 mr-2" />
              Beneficiaries
            </TabsTrigger>
            <TabsTrigger value="distributions">
              <DollarSign className="h-4 w-4 mr-2" />
              Distributions
            </TabsTrigger>
            <TabsTrigger value="k1">
              <FileText className="h-4 w-4 mr-2" />
              K-1 Data
            </TabsTrigger>
          </TabsList>
          
          {/* Beneficiaries Tab */}
          <TabsContent value="beneficiaries">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Beneficiaries</CardTitle>
                    <CardDescription>Manage trust beneficiaries and their information</CardDescription>
                  </div>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Beneficiary
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {beneficiaries && beneficiaries.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Relationship</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Share %</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {beneficiaries.map((beneficiary: any) => (
                        <TableRow key={beneficiary.id}>
                          <TableCell className="font-medium">{beneficiary.name}</TableCell>
                          <TableCell>{beneficiary.relationship}</TableCell>
                          <TableCell>{beneficiary.email}</TableCell>
                          <TableCell>{beneficiary.sharePercentage}%</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              beneficiary.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {beneficiary.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedBeneficiaryId(beneficiary.id);
                                setShowDistributionDialog(true);
                              }}
                            >
                              Record Distribution
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No beneficiaries found. Click "Add Beneficiary" to create one.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Distributions Tab */}
          <TabsContent value="distributions">
            <Card>
              <CardHeader>
                <CardTitle>Distribution History</CardTitle>
                <CardDescription>
                  {selectedBeneficiaryId 
                    ? `Viewing distributions for beneficiary ID ${selectedBeneficiaryId}`
                    : 'Select a beneficiary to view distributions'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {distributions && distributions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Tax Year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions.map((dist: any) => (
                        <TableRow key={dist.id}>
                          <TableCell>{new Date(dist.distributionDate).toLocaleDateString()}</TableCell>
                          <TableCell className="capitalize">{dist.distributionType.replace('_', ' ')}</TableCell>
                          <TableCell>${(dist.amount / 100).toFixed(2)}</TableCell>
                          <TableCell>{dist.description || '-'}</TableCell>
                          <TableCell>{dist.taxYear}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedBeneficiaryId 
                      ? 'No distributions found for this beneficiary.'
                      : 'Select a beneficiary from the Beneficiaries tab to view distributions.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* K-1 Data Tab */}
          <TabsContent value="k1">
            <Card>
              <CardHeader>
                <CardTitle>Schedule K-1 Data</CardTitle>
                <CardDescription>
                  {selectedBeneficiaryId 
                    ? `K-1 data for beneficiary ID ${selectedBeneficiaryId} (Tax Year ${new Date().getFullYear()})`
                    : 'Select a beneficiary to view K-1 data'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {k1Data ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Beneficiary Name</Label>
                        <p className="font-medium">{k1Data.beneficiary?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Tax ID</Label>
                        <p className="font-medium">{k1Data.beneficiary?.taxId || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Share Percentage</Label>
                        <p className="font-medium">{k1Data.beneficiary?.distributionPercentage || 0}%</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Tax Year</Label>
                        <p className="font-medium">{new Date().getFullYear()}</p>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Distribution Summary</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <Label className="text-sm text-muted-foreground">Income Distributions</Label>
                          <p className="text-2xl font-bold">${k1Data.summary ? (k1Data.summary.totalIncome / 100).toFixed(2) : '0.00'}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg">
                          <Label className="text-sm text-muted-foreground">Principal Distributions</Label>
                          <p className="text-2xl font-bold">${k1Data.summary ? (k1Data.summary.totalPrincipal / 100).toFixed(2) : '0.00'}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <Label className="text-sm text-muted-foreground">Required Minimum</Label>
                          <p className="text-2xl font-bold">${k1Data.summary ? (k1Data.summary.totalRMD / 100).toFixed(2) : '0.00'}</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg">
                          <Label className="text-sm text-muted-foreground">Discretionary</Label>
                          <p className="text-2xl font-bold">${k1Data.summary ? (k1Data.summary.totalDiscretionary / 100).toFixed(2) : '0.00'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Total Distributions</h3>
                      <div className="bg-gray-50 p-6 rounded-lg">
                        <p className="text-3xl font-bold">${k1Data.summary ? (k1Data.summary.totalAmount / 100).toFixed(2) : '0.00'}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Based on {(k1Data.distributions || []).length} distribution(s) in {new Date().getFullYear()}
                        </p>
                      </div>
                    </div>
                    
                    <Button className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate K-1 Form
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedBeneficiaryId 
                      ? 'No K-1 data available for this beneficiary.'
                      : 'Select a beneficiary from the Beneficiaries tab to view K-1 data.'}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Create Beneficiary Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Beneficiary</DialogTitle>
            <DialogDescription>
              Enter the beneficiary's information to add them to the trust
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={beneficiaryForm.name}
                onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="relationship">Relationship</Label>
              <Input
                id="relationship"
                value={beneficiaryForm.relationship}
                onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, relationship: e.target.value })}
                placeholder="Child, Spouse, etc."
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={beneficiaryForm.email}
                onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, email: e.target.value })}
                placeholder="beneficiary@example.com"
              />
            </div>
            <div>
              <Label htmlFor="sharePercentage">Share Percentage</Label>
              <Input
                id="sharePercentage"
                type="number"
                step="0.01"
                value={beneficiaryForm.sharePercentage}
                onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, sharePercentage: e.target.value })}
                placeholder="33.33"
              />
            </div>
            <div>
              <Label htmlFor="taxId">Tax ID (SSN/EIN)</Label>
              <Input
                id="taxId"
                value={beneficiaryForm.taxId}
                onChange={(e) => setBeneficiaryForm({ ...beneficiaryForm, taxId: e.target.value })}
                placeholder="XXX-XX-XXXX"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBeneficiary}>
              Create Beneficiary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Record Distribution Dialog */}
      <Dialog open={showDistributionDialog} onOpenChange={setShowDistributionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Distribution</DialogTitle>
            <DialogDescription>
              Enter distribution details for the selected beneficiary
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={distributionForm.amount}
                onChange={(e) => setDistributionForm({ ...distributionForm, amount: e.target.value })}
                placeholder="1000.00"
              />
            </div>
            <div>
              <Label htmlFor="distributionType">Distribution Type</Label>
              <Select
                value={distributionForm.distributionType}
                onValueChange={(value: any) => setDistributionForm({ ...distributionForm, distributionType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="required_minimum">Required Minimum</SelectItem>
                  <SelectItem value="discretionary">Discretionary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="distributionDate">Distribution Date</Label>
              <Input
                id="distributionDate"
                type="date"
                value={distributionForm.distributionDate}
                onChange={(e) => setDistributionForm({ ...distributionForm, distributionDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={distributionForm.description}
                onChange={(e) => setDistributionForm({ ...distributionForm, description: e.target.value })}
                placeholder="Quarterly income distribution"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDistributionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordDistribution}>
              Record Distribution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
