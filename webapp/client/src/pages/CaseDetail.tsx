import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit, FileText, Shield, Users, Calendar, StickyNote, Swords, Activity, Sparkles } from "lucide-react";
import CaseTimeline from "@/components/CaseTimeline";
import { CaseActivityFeed } from "@/components/CaseActivityFeed";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function CaseDetail() {
  const [, params] = useRoute("/cases/:id");
  const [, setLocation] = useLocation();
  const caseId = params?.id ? parseInt(params.id) : 0;

  const { data: caseData, isLoading } = trpc.cases.get.useQuery({ id: caseId });
  const { data: parties } = trpc.parties.list.useQuery({ caseId });
  const { data: documents } = trpc.documents.list.useQuery({ caseId });
  const { data: evidence } = trpc.evidence.list.useQuery({ caseId });
  const { data: events } = trpc.caseEvents.list.useQuery({ caseId });
  const { data: notes } = trpc.caseNotes.list.useQuery({ caseId });
  const { data: strategies } = trpc.warfareStrategies.list.useQuery({ caseId });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Case not found</p>
            <Button className="mt-4" onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "pending": return "bg-yellow-500";
      case "won": return "bg-blue-500";
      case "lost": return "bg-red-500";
      case "settled": return "bg-purple-500";
      case "archived": return "bg-gray-500";
      default: return "bg-gray-400";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{caseData.title}</h1>
              <Badge className={getStatusColor(caseData.status)}>{caseData.status}</Badge>
            </div>
            {caseData.caseNumber && (
              <p className="text-muted-foreground">Case #{caseData.caseNumber}</p>
            )}
          </div>
          <Button variant="outline" onClick={() => setLocation(`/cases/${caseId}/template`)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Template
          </Button>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Case
          </Button>
        </div>

        {/* Case Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {caseData.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                <p className="mt-1">{caseData.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {caseData.caseType && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Type</h4>
                  <p className="mt-1">{caseData.caseType}</p>
                </div>
              )}
              {caseData.jurisdiction && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Jurisdiction</h4>
                  <p className="mt-1">{caseData.jurisdiction}</p>
                </div>
              )}
              {caseData.court && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Court</h4>
                  <p className="mt-1">{caseData.court}</p>
                </div>
              )}
              {caseData.priority && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Priority</h4>
                  <Badge variant="outline" className="mt-1">{caseData.priority}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parties">Parties ({parties?.length || 0})</TabsTrigger>
            <TabsTrigger value="documents">Documents ({documents?.length || 0})</TabsTrigger>
            <TabsTrigger value="evidence">Evidence ({evidence?.length || 0})</TabsTrigger>
            <TabsTrigger value="timeline">Timeline ({events?.length || 0})</TabsTrigger>
            <TabsTrigger value="notes">Notes ({notes?.length || 0})</TabsTrigger>
            <TabsTrigger value="strategies">Strategies ({strategies?.length || 0})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Parties</CardTitle>
                  <CardDescription>{parties?.length || 0} parties involved</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <FileText className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>{documents?.length || 0} documents</CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Evidence</CardTitle>
                  <CardDescription>{evidence?.length || 0} pieces of evidence</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="parties">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Parties</CardTitle>
                  <Button onClick={() => toast.info("Add party feature coming soon")}>Add Party</Button>
                </div>
              </CardHeader>
              <CardContent>
                {parties && parties.length > 0 ? (
                  <div className="space-y-4">
                    {parties.map((party) => (
                      <div key={party.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{party.name}</h4>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{party.type}</Badge>
                              {party.entityType && <Badge variant="outline">{party.entityType}</Badge>}
                            </div>
                          </div>
                        </div>
                        {party.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">{party.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No parties added yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Documents</CardTitle>
                  <Button onClick={() => toast.info("Upload document feature coming soon")}>Upload Document</Button>
                </div>
              </CardHeader>
              <CardContent>
                {documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:bg-accent cursor-pointer">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <h4 className="font-medium">{doc.title}</h4>
                            {doc.documentType && (
                              <p className="text-sm text-muted-foreground">{doc.documentType}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No documents yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Evidence</CardTitle>
                  <Button onClick={() => toast.info("Add evidence feature coming soon")}>Add Evidence</Button>
                </div>
              </CardHeader>
              <CardContent>
                {evidence && evidence.length > 0 ? (
                  <div className="space-y-2">
                    {evidence.map((item) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <h4 className="font-medium">{item.title}</h4>
                            {item.evidenceType && (
                              <p className="text-sm text-muted-foreground">{item.evidenceType}</p>
                            )}
                            {item.blockchainVerified && (
                              <Badge variant="outline" className="mt-1">Blockchain Verified</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No evidence yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <CaseTimeline caseId={caseId} />
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notes</CardTitle>
                  <Button onClick={() => toast.info("Add note feature coming soon")}>Add Note</Button>
                </div>
              </CardHeader>
              <CardContent>
                {notes && notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(note.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {note.isPinned && <Badge variant="outline">Pinned</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No notes yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategies">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Warfare Strategies</CardTitle>
                  <Button onClick={() => toast.info("Add strategy feature coming soon")}>Add Strategy</Button>
                </div>
              </CardHeader>
              <CardContent>
                {strategies && strategies.length > 0 ? (
                  <div className="space-y-4">
                    {strategies.map((strategy) => (
                      <div key={strategy.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{strategy.strategyName}</h4>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline">{strategy.front}</Badge>
                              <Badge>{strategy.status}</Badge>
                            </div>
                          </div>
                        </div>
                        {strategy.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{strategy.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No strategies yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <CaseActivityFeed caseId={caseId} limit={50} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
