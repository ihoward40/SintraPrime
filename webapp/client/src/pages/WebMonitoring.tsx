import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Globe, Plus, Eye, Trash2, CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WebMonitoring() {
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [newSite, setNewSite] = useState({
    name: '',
    url: '',
    description: '',
    siteType: 'court',
    checkFrequency: 'daily',
  });

  const { data: monitoredSites, refetch } = trpc.webMonitoring.listSites.useQuery(
    {},
    { refetchInterval: 60000 } // Refresh every minute
  );

  const { data: recentChanges } = trpc.webMonitoring.getRecentChanges.useQuery(
    { limit: 20 },
    { refetchInterval: 60000 }
  );

  const createSite = trpc.webMonitoring.createSite.useMutation({
    onSuccess: () => {
      toast.success('Monitoring site added successfully');
      refetch();
      setIsAddSiteOpen(false);
      setNewSite({ name: '', url: '', description: '', siteType: 'court', checkFrequency: 'daily' });
    },
    onError: (error) => {
      toast.error(`Failed to add site: ${error.message}`);
    },
  });

  const deleteSite = trpc.webMonitoring.deleteSite.useMutation({
    onSuccess: () => {
      toast.success('Site removed from monitoring');
      refetch();
    },
  });

  const toggleSite = trpc.webMonitoring.toggleSite.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const checkNow = trpc.webMonitoring.checkNow.useMutation({
    onSuccess: () => {
      toast.success('Site check initiated');
      setTimeout(() => refetch(), 2000);
    },
  });

  const handleCreateSite = () => {
    if (!newSite.name || !newSite.url) {
      toast.error('Please fill in name and URL');
      return;
    }
    createSite.mutate(newSite);
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Web Monitoring & Policy Radar</h1>
          <p className="text-muted-foreground mt-2">
            Track changes on court websites, regulatory pages, and legal databases
          </p>
        </div>
        <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Site
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Monitored Site</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Site Name</Label>
                <Input
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  placeholder="e.g., PACER District Court"
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label>Site Type</Label>
                <Select value={newSite.siteType} onValueChange={(v) => setNewSite({ ...newSite, siteType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="court">Court Website</SelectItem>
                    <SelectItem value="regulatory">Regulatory Agency</SelectItem>
                    <SelectItem value="corporate">Corporate Website</SelectItem>
                    <SelectItem value="legal_database">Legal Database</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Check Frequency</Label>
                <Select value={newSite.checkFrequency} onValueChange={(v) => setNewSite({ ...newSite, checkFrequency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newSite.description}
                  onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
                  placeholder="What are you monitoring for?"
                  rows={3}
                />
              </div>
              <Button onClick={handleCreateSite} className="w-full" disabled={createSite.isPending}>
                {createSite.isPending ? 'Adding...' : 'Add Site'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monitored Sites</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoredSites?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {monitoredSites?.filter(s => s.isActive).length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Changes Detected</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentChanges?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentChanges?.filter(c => c.severity === 'critical').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires immediate review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Check</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitoredSites?.filter(s => s.lastChecked).length || 0}/{monitoredSites?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Sites checked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monitored Sites Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Monitored Sites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">URL</th>
                  <th className="text-left py-3 px-4">Type</th>
                  <th className="text-left py-3 px-4">Frequency</th>
                  <th className="text-left py-3 px-4">Last Checked</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {monitoredSites?.map((site) => (
                  <tr key={site.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{site.name}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {site.url.substring(0, 50)}...
                      </a>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <Badge variant="outline">{site.siteType}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm">{site.checkFrequency}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {site.lastChecked ? format(new Date(site.lastChecked), 'MMM dd, HH:mm') : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {site.isActive ? (
                        <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge>
                      ) : (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkNow.mutate({ siteId: site.id })}
                          disabled={checkNow.isPending}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleSite.mutate({ siteId: site.id, isActive: !site.isActive })}
                        >
                          {site.isActive ? 'Pause' : 'Resume'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSite.mutate({ siteId: site.id })}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!monitoredSites?.length && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      No sites being monitored. Add your first site to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Recent Changes Detected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentChanges?.map((change) => (
              <Card key={change.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{change.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{change.description}</p>
                    </div>
                    {getSeverityBadge(change.severity)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                    <span>{format(new Date(change.detectedAt), 'MMM dd, yyyy HH:mm')}</span>
                    <span>•</span>
                    <span>{change.changeType}</span>
                    {change.isReviewed && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Reviewed
                        </Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!recentChanges?.length && (
              <div className="py-12 text-center text-muted-foreground">
                No changes detected yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
