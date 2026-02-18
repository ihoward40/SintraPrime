import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Mail, Mic, FileText, CheckCircle2, Clock, XCircle, RefreshCw, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function IngestMonitoring() {
  const [emailFilter, setEmailFilter] = useState<'all' | 'processed' | 'unprocessed'>('all');
  const [audioFilter, setAudioFilter] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [dateRange, setDateRange] = useState('7'); // days

  const { data: emailStats, refetch: refetchEmailStats } = trpc.ingest.getEmailStats.useQuery(
    { days: parseInt(dateRange) },
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  const { data: audioStats, refetch: refetchAudioStats } = trpc.ingest.getAudioStats.useQuery(
    { days: parseInt(dateRange) },
    { refetchInterval: 30000 }
  );

  const { data: recentEmails, refetch: refetchEmails } = trpc.ingest.getRecentEmails.useQuery(
    { limit: 50, processed: emailFilter === 'all' ? undefined : emailFilter === 'processed' },
    { refetchInterval: 30000 }
  );

  const { data: recentAudio, refetch: refetchAudio } = trpc.ingest.getRecentAudio.useQuery(
    { 
      limit: 50, 
      status: audioFilter === 'all' ? undefined : audioFilter 
    },
    { refetchInterval: 30000 }
  );

  const handleRefreshAll = () => {
    refetchEmailStats();
    refetchAudioStats();
    refetchEmails();
    refetchAudio();
  };

  const getTranscriptionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ingest Monitoring Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Real-time monitoring of email and audio ingest pipelines
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefreshAll} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {emailStats?.withAttachments || 0} with attachments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Auto-Created Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.casesCreated || 0}</div>
            <p className="text-xs text-muted-foreground">
              From email ingest
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Audio Recordings</CardTitle>
            <Mic className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audioStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {audioStats?.transcribed || 0} transcribed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Transcription Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audioStats?.total ? Math.round((audioStats.transcribed / audioStats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Ingest Table */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Recent Email Ingests
            </CardTitle>
            <Select value={emailFilter} onValueChange={(v: any) => setEmailFilter(v)}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Emails</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="unprocessed">Unprocessed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">From</th>
                  <th className="text-left py-3 px-4">Subject</th>
                  <th className="text-left py-3 px-4">Received</th>
                  <th className="text-left py-3 px-4">Attachments</th>
                  <th className="text-left py-3 px-4">Case Created</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEmails?.map((email) => (
                  <tr key={email.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">{email.from}</td>
                    <td className="py-3 px-4 text-sm font-medium">{email.subject}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {format(new Date(email.receivedAt), 'MMM dd, HH:mm')}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {email.attachmentCount > 0 ? (
                        <Badge variant="outline">{email.attachmentCount} files</Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {email.caseId ? (
                        <Badge className="bg-green-500">Case #{email.caseId}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {email.processed ? (
                        <Badge variant="outline"><CheckCircle2 className="w-3 h-3 mr-1" />Processed</Badge>
                      ) : (
                        <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {!recentEmails?.length && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No emails found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audio Ingest Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Recent Audio Ingests
            </CardTitle>
            <Select value={audioFilter} onValueChange={(v: any) => setAudioFilter(v)}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audio</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Title</th>
                  <th className="text-left py-3 px-4">File Name</th>
                  <th className="text-left py-3 px-4">Duration</th>
                  <th className="text-left py-3 px-4">Uploaded</th>
                  <th className="text-left py-3 px-4">Case Created</th>
                  <th className="text-left py-3 px-4">Transcription</th>
                </tr>
              </thead>
              <tbody>
                {recentAudio?.map((audio) => (
                  <tr key={audio.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm font-medium">{audio.title}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{audio.fileName}</td>
                    <td className="py-3 px-4 text-sm">
                      {audio.duration ? `${Math.floor(audio.duration / 60)}:${(audio.duration % 60).toString().padStart(2, '0')}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {format(new Date(audio.createdAt), 'MMM dd, HH:mm')}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {audio.caseId ? (
                        <Badge className="bg-green-500">Case #{audio.caseId}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {getTranscriptionStatusBadge(audio.transcriptionStatus)}
                    </td>
                  </tr>
                ))}
                {!recentAudio?.length && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No audio recordings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
