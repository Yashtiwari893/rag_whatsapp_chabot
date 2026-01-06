import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">WhatsApp AI Platform 🚀</h1>
          <p className="text-gray-600">
            Manage chatbot, OCR, documents & automations from one place
          </p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* RAG Chatbot */}
          <Card>
            <CardHeader>
              <CardTitle>🤖 RAG Chatbot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Auto-reply WhatsApp users using document-based AI
              </p>
              <Link href="/chat">
                <Button className="w-full">Open Chatbot</Button>
              </Link>
            </CardContent>
          </Card>

          {/* WhatsApp Messages */}
          <Card>
            <CardHeader>
              <CardTitle>📩 WhatsApp Messages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                View incoming & outgoing WhatsApp messages
              </p>
              <Link href="/messages">
                <Button className="w-full">View Messages</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Business Card OCR */}
          <Card>
            <CardHeader>
              <CardTitle>🪪 Business Card OCR</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Scan business cards & save contacts automatically
              </p>
              <Link href="/ocr">
                <Button className="w-full">Scan Cards</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Knowledge Base */}
          <Card>
            <CardHeader>
              <CardTitle>📂 Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                Upload PDFs & documents for RAG
              </p>
              <Link href="/files">
                <Button className="w-full">Manage Files</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                View usage, scans, replies & stats
              </p>
              <Link href="/dashboard">
                <Button className="w-full" variant="secondary">
                  Open Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle>⚙️ Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                WhatsApp, API keys & system configuration
              </p>
              <Link href="/settings">
                <Button className="w-full" variant="outline">
                  Open Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400">
          Built with ❤️ using Next.js, Supabase & AI
        </div>
      </div>
    </main>
  );
}
