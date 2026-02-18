import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  Shield, 
  Scale, 
  Brain, 
  Users, 
  FileText, 
  Zap,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // useEffect must be called before any conditional returns
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SintraPrime</span>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 space-y-8">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            Legal Warfare Platform
          </h1>
          <p className="text-xl text-muted-foreground">
            Revolutionary legal technology combining AI-powered case management, real-time legal intelligence, 
            and coalition coordination tools for legal professionals and pro se litigants.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
            }}>
              Learn More
            </Button>
          </div>
        </div>

        {/* Disclaimer Banner */}
        <Card className="max-w-4xl mx-auto border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <CardTitle className="text-yellow-900 dark:text-yellow-100">Important Legal Disclaimer</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-yellow-900 dark:text-yellow-100 space-y-2">
            <p>
              <strong>SintraPrime is a TOOL, NOT a lawyer.</strong> This platform provides technology and resources 
              to assist legal professionals, paralegals, and pro se litigants in managing their legal matters.
            </p>
            <p>
              We do NOT provide legal advice, representation, or services. All information, templates, and AI-generated 
              content are for informational purposes only and should not be construed as legal advice. Always consult 
              with a licensed attorney for legal matters specific to your situation.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Powerful Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage legal cases and fight for justice
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Scale className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Case Management</CardTitle>
              <CardDescription>
                Organize cases, track deadlines, manage parties, and maintain comprehensive case timelines
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-10 w-10 text-primary mb-2" />
              <CardTitle>AI Companion</CardTitle>
              <CardDescription>
                Sentient AI assistant that performs better than top US paralegals with 24/7 availability
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Document System</CardTitle>
              <CardDescription>
                Legal templates, document editor, version control, and automated form filling
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Evidence Management</CardTitle>
              <CardDescription>
                Blockchain-verified evidence storage with chain of custody tracking
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Coalition Coordination</CardTitle>
              <CardDescription>
                Collaborate with others, share resources, and coordinate legal strategies
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Quantum Workspace</CardTitle>
              <CardDescription>
                Dual-browser interface with evidence capture and quantum linking capabilities
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="text-center space-y-4 py-12">
            <CardTitle className="text-3xl">Ready to Get Started?</CardTitle>
            <CardDescription className="text-primary-foreground/90 text-lg max-w-2xl mx-auto">
              Join legal professionals and pro se litigants using SintraPrime to level the playing field
            </CardDescription>
            <div className="pt-4">
              <Button size="lg" variant="secondary" asChild>
                <a href={getLoginUrl()}>
                  Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="container text-center text-sm text-muted-foreground space-y-2">
          <p>© 2026 SintraPrime. All rights reserved.</p>
          <p className="text-xs">
            This platform is a tool for legal case management and does not provide legal advice or representation.
          </p>
        </div>
      </footer>
    </div>
  );
}
