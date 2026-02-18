import { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function TimelineBuilder() {
  const { caseId } = useParams();
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventDate: '',
    eventType: 'filing',
    importance: 'medium',
  });

  const { data: events, isLoading, refetch } = trpc.timeline.listEvents.useQuery(
    { caseId: parseInt(caseId || '0') },
    { enabled: !!caseId }
  );

  const createEvent = trpc.timeline.createEvent.useMutation({
    onSuccess: () => {
      refetch();
      setIsAddEventOpen(false);
      setNewEvent({ title: '', description: '', eventDate: '', eventType: 'filing', importance: 'medium' });
    },
  });

  const deleteEvent = trpc.timeline.deleteEvent.useMutation({
    onSuccess: () => refetch(),
  });

  const generateNarrative = trpc.timeline.generateNarrative.useMutation();

  const handleCreateEvent = () => {
    if (!caseId || !newEvent.title || !newEvent.eventDate) return;
    createEvent.mutate({
      caseId: parseInt(caseId),
      ...newEvent,
    });
  };

  const handleGenerateNarrative = async () => {
    if (!caseId) return;
    const result = await generateNarrative.mutateAsync({
      caseId: parseInt(caseId),
      narrativeType: 'chronological',
    });
    alert(`Narrative generated!\n\n${result.content.substring(0, 500)}...`);
  };

  const sortedEvents = events?.sort((a, b) => 
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );

  if (isLoading) return <div className="p-8">Loading timeline...</div>;

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Timeline Builder</h1>
          <p className="text-muted-foreground">Case #{caseId} - Chronological Event Timeline</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerateNarrative} variant="outline" disabled={!events?.length}>
            <FileText className="w-4 h-4 mr-2" />
            Generate Narrative
          </Button>
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Timeline Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Event Title</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., Motion to Dismiss Filed"
                  />
                </div>
                <div>
                  <Label>Event Date</Label>
                  <Input
                    type="date"
                    value={newEvent.eventDate}
                    onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Event Type</Label>
                  <Select value={newEvent.eventType} onValueChange={(v) => setNewEvent({ ...newEvent, eventType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="filing">Filing</SelectItem>
                      <SelectItem value="hearing">Hearing</SelectItem>
                      <SelectItem value="discovery">Discovery</SelectItem>
                      <SelectItem value="correspondence">Correspondence</SelectItem>
                      <SelectItem value="ruling">Ruling</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Importance</Label>
                  <Select value={newEvent.importance} onValueChange={(v) => setNewEvent({ ...newEvent, importance: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event details..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleCreateEvent} className="w-full" disabled={createEvent.isPending}>
                  {createEvent.isPending ? 'Creating...' : 'Create Event'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!events?.length ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No Events Yet</h3>
          <p className="text-muted-foreground mb-4">Start building your case timeline by adding events</p>
          <Button onClick={() => setIsAddEventOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add First Event
          </Button>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline visualization */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-6">
            {sortedEvents?.map((event, index) => (
              <div key={event.id} className="relative pl-20">
                <div className={`absolute left-6 w-5 h-5 rounded-full border-4 border-background ${
                  event.importance === 'critical' ? 'bg-red-500' :
                  event.importance === 'high' ? 'bg-orange-500' :
                  event.importance === 'medium' ? 'bg-blue-500' : 'bg-gray-400'
                }`} />
                <Card className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {format(new Date(event.eventDate), 'MMM dd, yyyy')}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary">
                          {event.eventType}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.importance === 'critical' ? 'bg-red-100 text-red-700' :
                          event.importance === 'high' ? 'bg-orange-100 text-orange-700' :
                          event.importance === 'medium' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.importance}
                        </span>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEvent.mutate({ id: event.id })}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
