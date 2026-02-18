/**
 * NotebookLM Research Hub
 * 
 * Documentation Memory System with:
 * - Document upload (PDF, DOCX, URLs)
 * - Source-grounded Q&A
 * - Study guides, timelines, flashcards, quizzes
 * - Audio overview generation
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  FileText, Upload, MessageSquare, BookOpen, Clock, 
  Zap, FileQuestion, Mic, Plus, Trash2, Download, Headphones, Search 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function NotebookLM() {
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [question, setQuestion] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const { data: collections, refetch: refetchCollections } = trpc.notebooklm.listCollections.useQuery();
  const { data: documents } = trpc.notebooklm.listDocuments.useQuery(
    { collectionId: selectedCollection! },
    { enabled: !!selectedCollection }
  );
  const { data: insights } = trpc.notebooklm.listInsights.useQuery(
    { collectionId: selectedCollection! },
    { enabled: !!selectedCollection }
  );
  const { data: audioOverviews } = trpc.notebooklm.listAudioOverviews.useQuery(
    { collectionId: selectedCollection! },
    { enabled: !!selectedCollection }
  );

  const createCollection = trpc.notebooklm.createCollection.useMutation({
    onSuccess: () => {
      refetchCollections();
      setNewCollectionName("");
      toast.success("Collection created");
    },
  });

  const uploadDocument = trpc.notebooklm.uploadDocument.useMutation({
    onSuccess: () => {
      refetchCollections();
      setDocumentUrl("");
      toast.success("Document uploaded");
    },
  });

  const askQuestion = trpc.notebooklm.askQuestion.useMutation({
    onSuccess: () => {
      refetchCollections();
      setQuestion("");
      toast.success("Question answered");
    },
  });

  const generateStudyGuide = trpc.notebooklm.generateStudyGuide.useMutation({
    onSuccess: () => {
      refetchCollections();
      toast.success("Study guide generated");
    },
  });

  const generateTimeline = trpc.notebooklm.generateTimeline.useMutation({
    onSuccess: () => {
      refetchCollections();
      toast.success("Timeline generated");
    },
  });

  const generateFlashcards = trpc.notebooklm.generateFlashcards.useMutation({
    onSuccess: () => {
      refetchCollections();
      toast.success("Flashcards generated");
    },
  });

  const generateQuiz = trpc.notebooklm.generateQuiz.useMutation({
    onSuccess: () => {
      refetchCollections();
      toast.success("Quiz generated");
    },
  });

  const generateAudioOverview = trpc.notebooklm.generateAudioOverview.useMutation({
    onSuccess: () => {
      refetchCollections();
      toast.success("Audio overview generated");
    },
  });

  const searchDocuments = trpc.notebooklm.searchDocuments.useMutation({
    onSuccess: (data) => {
      setSearchResults(data.results || []);
      toast.success(`Found ${data.results?.length || 0} relevant documents`);
    },
    onError: (error) => {
      toast.error(`Search failed: ${error.message}`);
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">NotebookLM Research Hub</h1>
          <p className="text-muted-foreground">Documentation Memory System</p>
        </div>
        <Button
          onClick={() => {
            const name = prompt("Collection name:");
            if (name) createCollection.mutate({ name, description: "" });
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Collection
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Collections Sidebar */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold">Research Collections</h2>
          <div className="space-y-2">
            {collections?.map((col: any) => (
              <Button
                key={col.id}
                variant={selectedCollection === col.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setSelectedCollection(col.id)}
              >
                <FileText className="mr-2 h-4 w-4" />
                {col.name}
              </Button>
            ))}
          </div>
        </Card>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {selectedCollection ? (
            <Tabs defaultValue="documents" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="search">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="qa">Q&A</TabsTrigger>
                <TabsTrigger value="tools">AI Tools</TabsTrigger>
                <TabsTrigger value="audio">
                  <Headphones className="mr-2 h-4 w-4" />
                  Audio
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-6">
                <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Documents
                </h2>
                <div className="flex gap-2">
                  <Input
                    placeholder="Document URL or paste text..."
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (!documentUrl) return;
                      uploadDocument.mutate({
                        collectionId: selectedCollection,
                        fileContent: documentUrl,
                        fileName: "Document",
                        fileType: "url",
                      });
                    }}
                    disabled={uploadDocument.isPending}
                  >
                    Upload
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {documents?.length || 0} / 50 documents
                </div>
                </Card>
              </TabsContent>

              <TabsContent value="search" className="space-y-6">
                <Card className="p-6 space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Semantic Search
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Search across all documents using natural language. Results are ranked by relevance.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for concepts, topics, or questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && searchQuery) {
                          searchDocuments.mutate({
                            collectionId: selectedCollection,
                            query: searchQuery,
                            topK: 10,
                          });
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        if (!searchQuery) return;
                        searchDocuments.mutate({
                          collectionId: selectedCollection,
                          query: searchQuery,
                          topK: 10,
                        });
                      }}
                      disabled={searchDocuments.isPending || !searchQuery}
                    >
                      {searchDocuments.isPending ? "Searching..." : "Search"}
                    </Button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h3 className="font-semibold">Search Results ({searchResults.length})</h3>
                      {searchResults.map((result: any, idx: number) => (
                        <div key={idx} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{result.fileName}</h4>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Relevance: {(result.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{result.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.length === 0 && searchDocuments.isSuccess && (
                    <div className="text-center p-8 text-muted-foreground">
                      No results found. Try different search terms.
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="qa" className="space-y-6">
                <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Ask Questions
                </h2>
                <Textarea
                  placeholder="Ask a question about your documents..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={() => {
                    if (!question) return;
                    askQuestion.mutate({
                      collectionId: selectedCollection,
                      question,
                    });
                  }}
                  disabled={askQuestion.isPending}
                >
                  Ask Question
                </Button>
                </Card>
              </TabsContent>

              <TabsContent value="tools" className="space-y-6">
                <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">AI-Powered Tools</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      generateStudyGuide.mutate({ collectionId: selectedCollection })
                    }
                    disabled={generateStudyGuide.isPending}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Study Guide
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      generateTimeline.mutate({ collectionId: selectedCollection })
                    }
                    disabled={generateTimeline.isPending}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Timeline
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      generateFlashcards.mutate({
                        collectionId: selectedCollection,
                        count: 20,
                      })
                    }
                    disabled={generateFlashcards.isPending}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Flashcards
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      generateQuiz.mutate({
                        collectionId: selectedCollection,
                        questionCount: 10,
                      })
                    }
                    disabled={generateQuiz.isPending}
                  >
                    <FileQuestion className="mr-2 h-4 w-4" />
                    Quiz
                  </Button>
                  <Button
                    variant="outline"
                    className="col-span-2"
                    onClick={() =>
                      generateAudioOverview.mutate({ collectionId: selectedCollection })
                    }
                    disabled={generateAudioOverview.isPending}
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Generate Audio Overview (Podcast)
                  </Button>
                </div>
                </Card>
              </TabsContent>

              <TabsContent value="audio" className="space-y-6">
                {audioOverviews && audioOverviews.length > 0 ? (
                  audioOverviews.map((overview: any) => (
                    <Card key={overview.id} className="p-6 space-y-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">Podcast Overview</h3>
                          <p className="text-sm text-muted-foreground">
                            Generated {new Date(overview.generatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Math.floor(overview.duration / 60)}:{(overview.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-4">
                        <audio
                          controls
                          className="w-full"
                          src={overview.audioUrl}
                          preload="metadata"
                        >
                          Your browser does not support the audio element.
                        </audio>
                      </div>

                      {overview.focusAreas && overview.focusAreas.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Focus Areas:</h4>
                          <div className="flex flex-wrap gap-2">
                            {overview.focusAreas.map((area: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                              >
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {overview.transcript && (
                        <details className="group">
                          <summary className="cursor-pointer text-sm font-medium hover:text-primary">
                            View Transcript
                          </summary>
                          <div className="mt-2 p-4 bg-muted/30 rounded text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                            {overview.transcript}
                          </div>
                        </details>
                      )}
                    </Card>
                  ))
                ) : (
                  <Card className="p-12 text-center">
                    <Mic className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Audio Overviews Yet</h3>
                    <p className="text-muted-foreground">
                      Generate your first podcast-style overview from the AI Tools tab
                    </p>
                  </Card>
                )}
              </TabsContent>

              {/* Insights History */}
              {insights && insights.length > 0 && (
                <Card className="p-6 space-y-4 mt-6">
                  <h2 className="text-xl font-semibold">Recent Insights</h2>
                  <div className="space-y-3">
                    {insights.map((insight: any) => (
                      <div
                        key={insight.id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            {insight.insightType}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(insight.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {insight.question && (
                          <p className="font-medium">{insight.question}</p>
                        )}
                        <p className="text-sm">{insight.answer.substring(0, 200)}...</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </Tabs>
          ) : (
            <Card className="p-12 text-center mt-6">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Collection Selected</h3>
              <p className="text-muted-foreground">
                Select a collection or create a new one to get started
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
