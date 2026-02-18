import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Mic, Globe, Play, CheckCircle2, XCircle, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MatchedTrigger {
  id: number;
  name: string;
  type: 'email' | 'audio' | 'web';
  matchedKeywords: string[];
  workflowName: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoStart: boolean;
}

export default function TriggerTester() {
  const [testType, setTestType] = useState<'email' | 'audio' | 'web'>('email');
  
  // Email test state
  const [emailFrom, setEmailFrom] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  
  // Audio test state
  const [audioTranscript, setAudioTranscript] = useState('');
  const [audioFilename, setAudioFilename] = useState('');
  
  // Web test state
  const [webUrl, setWebUrl] = useState('');
  const [webContent, setWebContent] = useState('');
  
  // Results state
  const [matchedTriggers, setMatchedTriggers] = useState<MatchedTrigger[]>([]);
  const [hasRun, setHasRun] = useState(false);

  // Mock trigger database - in production, this would come from tRPC
  const mockTriggers = [
    {
      id: 1,
      name: 'FDCPA Violation Detection',
      type: 'email' as const,
      keywords: ['FDCPA', 'debt collection', 'violation', 'harassment'],
      workflowName: 'FDCPA Case Workflow',
      priority: 'critical' as const,
      autoStart: true,
    },
    {
      id: 2,
      name: 'Lawsuit Notification',
      type: 'email' as const,
      keywords: ['lawsuit', 'complaint', 'summons', 'court'],
      workflowName: 'Litigation Response Workflow',
      priority: 'high' as const,
      autoStart: true,
    },
    {
      id: 3,
      name: 'Deposition Transcript Processing',
      type: 'audio' as const,
      keywords: ['deposition', 'testimony', 'witness', 'sworn statement'],
      workflowName: 'Deposition Analysis Workflow',
      priority: 'high' as const,
      autoStart: false,
    },
    {
      id: 4,
      name: 'Court Policy Change Alert',
      type: 'web' as const,
      keywords: ['policy', 'rule change', 'amendment', 'effective date'],
      workflowName: 'Policy Update Workflow',
      priority: 'medium' as const,
      autoStart: true,
    },
    {
      id: 5,
      name: 'Discovery Request',
      type: 'email' as const,
      keywords: ['discovery', 'interrogatories', 'production', 'documents'],
      workflowName: 'Discovery Response Workflow',
      priority: 'high' as const,
      autoStart: false,
    },
  ];

  const runTest = () => {
    let content = '';
    
    if (testType === 'email') {
      content = `${emailFrom} ${emailSubject} ${emailBody}`.toLowerCase();
    } else if (testType === 'audio') {
      content = `${audioFilename} ${audioTranscript}`.toLowerCase();
    } else {
      content = `${webUrl} ${webContent}`.toLowerCase();
    }

    const matches: MatchedTrigger[] = mockTriggers
      .filter(trigger => trigger.type === testType)
      .map(trigger => {
        const matchedKeywords = trigger.keywords.filter(keyword =>
          content.includes(keyword.toLowerCase())
        );
        
        if (matchedKeywords.length > 0) {
          return {
            id: trigger.id,
            name: trigger.name,
            type: trigger.type,
            matchedKeywords,
            workflowName: trigger.workflowName,
            priority: trigger.priority,
            autoStart: trigger.autoStart,
          };
        }
        return null;
      })
      .filter((match): match is MatchedTrigger => match !== null);

    setMatchedTriggers(matches);
    setHasRun(true);
    
    if (matches.length > 0) {
      toast.success(`Found ${matches.length} matching trigger(s)`);
    } else {
      toast.info('No triggers matched this input');
    }
  };

  const loadSampleEmail = () => {
    setEmailFrom('debt.collector@example.com');
    setEmailSubject('Case #12345 - FDCPA Violation Notice');
    setEmailBody('This is to notify you of a potential FDCPA violation regarding debt collection practices. The collector has engaged in harassment and failed to validate the debt as required by law.');
    toast.success('Sample email loaded');
  };

  const loadSampleAudio = () => {
    setAudioFilename('deposition_2024_02_15.mp3');
    setAudioTranscript('This is the sworn testimony of John Doe taken on February 15, 2024. The witness states under oath that the events occurred as described in the complaint. The deposition will be used as evidence in the upcoming trial.');
    toast.success('Sample audio loaded');
  };

  const loadSampleWeb = () => {
    setWebUrl('https://www.uscourts.gov/rules-policies');
    setWebContent('Effective March 1, 2024, the following policy changes will take effect: Rule 26 amendment regarding electronic discovery, new filing requirements for civil cases, and updated procedures for remote hearings.');
    toast.success('Sample web content loaded');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
      case 'web': return <Globe className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Trigger Testing Simulator</h1>
        <p className="text-muted-foreground mt-2">
          Test your trigger rules with sample data to see which workflows would execute
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Test Input</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={testType} onValueChange={(v) => setTestType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="audio">
                  <Mic className="w-4 h-4 mr-2" />
                  Audio
                </TabsTrigger>
                <TabsTrigger value="web">
                  <Globe className="w-4 h-4 mr-2" />
                  Web
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="space-y-4">
                <div>
                  <Label htmlFor="email-from">From</Label>
                  <Input
                    id="email-from"
                    placeholder="sender@example.com"
                    value={emailFrom}
                    onChange={(e) => setEmailFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    placeholder="Email subject line"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email-body">Body</Label>
                  <Textarea
                    id="email-body"
                    placeholder="Email body content..."
                    rows={6}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={loadSampleEmail} className="w-full">
                  Load Sample Email
                </Button>
              </TabsContent>

              <TabsContent value="audio" className="space-y-4">
                <div>
                  <Label htmlFor="audio-filename">Filename</Label>
                  <Input
                    id="audio-filename"
                    placeholder="recording.mp3"
                    value={audioFilename}
                    onChange={(e) => setAudioFilename(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="audio-transcript">Transcript</Label>
                  <Textarea
                    id="audio-transcript"
                    placeholder="Audio transcript content..."
                    rows={8}
                    value={audioTranscript}
                    onChange={(e) => setAudioTranscript(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={loadSampleAudio} className="w-full">
                  Load Sample Audio
                </Button>
              </TabsContent>

              <TabsContent value="web" className="space-y-4">
                <div>
                  <Label htmlFor="web-url">URL</Label>
                  <Input
                    id="web-url"
                    placeholder="https://example.com/page"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="web-content">Page Content</Label>
                  <Textarea
                    id="web-content"
                    placeholder="Website content or change description..."
                    rows={8}
                    value={webContent}
                    onChange={(e) => setWebContent(e.target.value)}
                  />
                </div>
                <Button variant="outline" onClick={loadSampleWeb} className="w-full">
                  Load Sample Web Content
                </Button>
              </TabsContent>
            </Tabs>

            <Button onClick={runTest} className="w-full mt-6">
              <Play className="w-4 h-4 mr-2" />
              Run Test
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasRun ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Enter test data and click "Run Test" to see which triggers would match
                </p>
              </div>
            ) : matchedTriggers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <XCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No Triggers Matched</p>
                <p className="text-sm text-muted-foreground">
                  This input wouldn't trigger any workflows
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="font-semibold">
                    {matchedTriggers.length} Trigger{matchedTriggers.length > 1 ? 's' : ''} Matched
                  </span>
                </div>

                {matchedTriggers.map((trigger) => (
                  <Card key={trigger.id} className="border-l-4 border-l-green-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeIcon(trigger.type)}
                            <h4 className="font-semibold">{trigger.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Workflow: {trigger.workflowName}
                          </p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge className={getPriorityColor(trigger.priority)}>
                              {trigger.priority.toUpperCase()}
                            </Badge>
                            {trigger.autoStart && (
                              <Badge className="bg-green-500">
                                <Zap className="w-3 h-3 mr-1" />
                                Auto-Start
                              </Badge>
                            )}
                          </div>
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-1">Matched Keywords:</p>
                            <div className="flex flex-wrap gap-1">
                              {trigger.matchedKeywords.map((keyword) => (
                                <Badge key={keyword} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      {trigger.autoStart && (
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded text-xs text-green-700 dark:text-green-300">
                          ✓ This workflow would execute automatically
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Triggers Reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active Triggers ({mockTriggers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockTriggers.map((trigger) => (
              <Card key={trigger.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getTypeIcon(trigger.type)}
                    <h5 className="font-semibold text-sm">{trigger.name}</h5>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {trigger.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
