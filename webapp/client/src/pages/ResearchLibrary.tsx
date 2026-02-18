import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, Search, Bookmark, BookmarkCheck, Scale, FileText,
  GraduationCap, ExternalLink, Loader2, Database, ChevronRight
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All", icon: BookOpen },
  { value: "federal_statute", label: "Federal Statutes", icon: Scale },
  { value: "procedural_rule", label: "Procedural Rules", icon: FileText },
  { value: "legal_guide", label: "Legal Guides", icon: GraduationCap },
];

export default function ResearchLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedResearch, setSelectedResearch] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: research, isLoading, refetch } = trpc.research.list.useQuery(
    {
      query: searchQuery || undefined,
      category: activeCategory !== "all" ? activeCategory : undefined,
    },
    { placeholderData: (prev) => prev }
  );

  const { data: bookmarks, refetch: refetchBookmarks } = trpc.research.bookmarks.list.useQuery();

  const seedMutation = trpc.research.seed.useMutation({
    onSuccess: (data) => {
      toast.success(`Seeded ${data.seeded} legal research entries`);
      refetch();
    },
    onError: () => toast.error("Failed to seed library"),
  });

  const bookmarkMutation = trpc.research.bookmarks.create.useMutation({
    onSuccess: () => {
      toast.success("Bookmarked!");
      refetchBookmarks();
    },
    onError: () => toast.error("Failed to bookmark"),
  });

  const removeBookmarkMutation = trpc.research.bookmarks.delete.useMutation({
    onSuccess: () => {
      toast.success("Bookmark removed");
      refetchBookmarks();
    },
    onError: () => toast.error("Failed to remove bookmark"),
  });

  const isBookmarked = (researchId: number) =>
    bookmarks?.some((b: any) => b.researchId === researchId);

  const getBookmarkId = (researchId: number) =>
    bookmarks?.find((b: any) => b.researchId === researchId)?.id;

  const toggleBookmark = (researchId: number) => {
    if (isBookmarked(researchId)) {
      const bmId = getBookmarkId(researchId);
      if (bmId) removeBookmarkMutation.mutate({ id: bmId });
    } else {
      bookmarkMutation.mutate({ researchId });
    }
  };

  const openDetail = (item: any) => {
    setSelectedResearch(item);
    setDetailOpen(true);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "federal_statute": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "procedural_rule": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "legal_guide": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const isEmpty = !research || research.length === 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Legal Research Library</h1>
          <p className="text-muted-foreground mt-1">
            Searchable knowledge base of statutes, procedural rules, and legal guides
          </p>
        </div>
        {isEmpty && !isLoading && (
          <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
            Seed Library
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search statutes, rules, and guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="gap-2">
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isEmpty ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Library is empty</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Seed Library" to populate with common legal statutes and guides.
                  </p>
                  <Button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                    {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Database className="h-4 w-4 mr-2" />}
                    Seed Library
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {research?.map((item: any) => (
                  <Card
                    key={item.id}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => openDetail(item)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={getCategoryColor(item.category)}>
                              {item.category === "federal_statute" ? "Federal Statute" :
                               item.category === "procedural_rule" ? "Procedural Rule" :
                               item.category === "legal_guide" ? "Legal Guide" : item.category}
                            </Badge>
                            {item.jurisdiction && (
                              <Badge variant="outline">{item.jurisdiction}</Badge>
                            )}
                            {item.subcategory && (
                              <Badge variant="secondary">{item.subcategory}</Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {item.title}
                          </CardTitle>
                          {item.citation && (
                            <p className="text-sm text-muted-foreground font-mono mt-1">{item.citation}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookmark(item.id);
                            }}
                          >
                            {isBookmarked(item.id) ? (
                              <BookmarkCheck className="h-5 w-5 text-primary" />
                            ) : (
                              <Bookmark className="h-5 w-5" />
                            )}
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      <CardDescription className="mt-2">{item.summary}</CardDescription>
                    </CardHeader>
                    {item.tags && item.tags.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="flex gap-2 flex-wrap">
                          {item.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bookmarks Section */}
      {bookmarks && bookmarks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5" />
            Your Bookmarks ({bookmarks.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {bookmarks.map((bm: any) => (
              <Card key={bm.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Research #{bm.researchId}</p>
                    {bm.notes && <p className="text-sm text-muted-foreground">{bm.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Bookmarked {new Date(bm.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBookmarkMutation.mutate({ id: bm.id })}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          {selectedResearch && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Badge className={getCategoryColor(selectedResearch.category)}>
                    {selectedResearch.category === "federal_statute" ? "Federal Statute" :
                     selectedResearch.category === "procedural_rule" ? "Procedural Rule" :
                     selectedResearch.category === "legal_guide" ? "Legal Guide" : selectedResearch.category}
                  </Badge>
                  {selectedResearch.jurisdiction && (
                    <Badge variant="outline">{selectedResearch.jurisdiction}</Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedResearch.title}</DialogTitle>
                {selectedResearch.citation && (
                  <p className="text-sm text-muted-foreground font-mono">{selectedResearch.citation}</p>
                )}
                <DialogDescription>{selectedResearch.summary}</DialogDescription>
              </DialogHeader>
              <Separator />
              <ScrollArea className="max-h-[50vh] pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {selectedResearch.content?.split("\n").map((line: string, i: number) => {
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <h3 key={i} className="font-bold text-base mt-4 mb-2">{line.replace(/\*\*/g, "")}</h3>;
                    }
                    if (line.startsWith("**")) {
                      const parts = line.split("**");
                      return (
                        <p key={i} className="mb-2">
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                          )}
                        </p>
                      );
                    }
                    if (line.trim() === "") return <br key={i} />;
                    return <p key={i} className="mb-2">{line}</p>;
                  })}
                </div>
              </ScrollArea>
              <div className="flex justify-between items-center pt-4">
                <div className="flex gap-2 flex-wrap">
                  {selectedResearch.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
                <Button
                  variant={isBookmarked(selectedResearch.id) ? "secondary" : "default"}
                  onClick={() => toggleBookmark(selectedResearch.id)}
                >
                  {isBookmarked(selectedResearch.id) ? (
                    <><BookmarkCheck className="h-4 w-4 mr-2" /> Bookmarked</>
                  ) : (
                    <><Bookmark className="h-4 w-4 mr-2" /> Bookmark</>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
