import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { AlertCircle, CheckCircle, Copy, Download, Loader2, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/clipboard-utils';
import Breadcrumbs from '@/app/components/Breadcrumbs';

export default function BooksSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualInstructions, setShowManualInstructions] = useState(true); // Show manual instructions by default

  const migrationSQL = `-- Create books table (platform-wide independent elements like checklists and documents)
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cover_image TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  likes UUID[] DEFAULT '{}', -- Array of user IDs who liked
  favorites UUID[] DEFAULT '{}', -- Array of user IDs who favorited
  views INTEGER DEFAULT 0,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chapters table (content within a book)
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  order_index INTEGER DEFAULT 0, -- For ordering chapters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON chapters(book_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(book_id, order_index);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_books_is_template ON books(is_template);
CREATE INDEX IF NOT EXISTS idx_books_created_by ON books(created_by);
CREATE INDEX IF NOT EXISTS idx_books_tags ON books USING GIN(tags);

-- Enable Row Level Security
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for books
-- Anyone can view books
CREATE POLICY "Anyone can view books"
  ON books FOR SELECT
  USING (true);

-- Authenticated users can create books
CREATE POLICY "Authenticated users can create books"
  ON books FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own books or super admins can update any
CREATE POLICY "Users can update own books or super admins all"
  ON books FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super'
    )
  );

-- Users can delete their own books or super admins can delete any
CREATE POLICY "Users can delete own books or super admins all"
  ON books FOR DELETE
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super'
    )
  );

-- Users can update likes and favorites
CREATE POLICY "Users can update book favorites"
  ON books
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for chapters
-- Anyone can view chapters
CREATE POLICY "Anyone can view chapters"
  ON chapters FOR SELECT
  USING (true);

-- Authenticated users can create chapters for books they own or super admins
CREATE POLICY "Book owners can create chapters"
  ON chapters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM books 
      WHERE books.id = chapters.book_id 
      AND (
        books.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'super'
        )
      )
    )
  );

-- Users can update chapters in their own books or super admins can update any
CREATE POLICY "Book owners can update chapters"
  ON chapters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM books 
      WHERE books.id = chapters.book_id 
      AND (
        books.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'super'
        )
      )
    )
  );

-- Users can delete chapters from their own books or super admins can delete any
CREATE POLICY "Book owners can delete chapters"
  ON chapters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM books 
      WHERE books.id = chapters.book_id 
      AND (
        books.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'super'
        )
      )
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_books_updated_at();

CREATE TRIGGER set_chapters_updated_at
  BEFORE UPDATE ON chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_books_updated_at();`;

  const copySQLToClipboard = async () => {
    await copyToClipboard(migrationSQL, 'SQL migration');
  };

  const handleTestConnection = async () => {
    setIsInitializing(true);
    try {
      // Try to query the books table to see if it exists
      const { data, error } = await supabase
        .from('books')
        .select('count')
        .limit(1);

      if (!error) {
        setIsComplete(true);
        toast.success('Books system is ready!');
        setTimeout(() => {
          navigate('/books');
        }, 1500);
      } else {
        toast.error('Tables not found. Please run the migration in Supabase SQL Editor.');
      }
    } catch (error: any) {
      toast.error('Connection test failed');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <Breadcrumbs
        items={[
          { label: 'Books', href: '/books' },
          { label: 'Setup' },
        ]}
      />

      <div className="text-center space-y-2">
        <BookOpen className="w-16 h-16 text-emerald-600 mx-auto" />
        <h1 className="text-3xl font-bold text-gray-900">Setup Books System</h1>
        <p className="text-gray-600">
          Initialize the database tables and policies for Books
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Initialization</CardTitle>
          <CardDescription>
            The Books system requires database tables to be created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isComplete ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Setup Complete!</AlertTitle>
              <AlertDescription>
                The Books system is now ready to use. Redirecting to Books page...
              </AlertDescription>
            </Alert>
          ) : showManualInstructions ? (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Manual Setup Required</AlertTitle>
                <AlertDescription>
                  Please run the SQL migration in your Supabase SQL Editor to set up the Books system.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Step 1: Copy the SQL Migration</h3>
                  <Button onClick={copySQLToClipboard} variant="outline" className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy SQL to Clipboard
                  </Button>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Step 2: Run in Supabase</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to <strong>SQL Editor</strong></li>
                    <li>Create a new query and paste the SQL migration</li>
                    <li>Click <strong>Run</strong> to execute the migration</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Step 3: Test Connection</h3>
                  <Button 
                    onClick={handleTestConnection} 
                    disabled={isInitializing}
                    className="w-full"
                  >
                    {isInitializing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      'Test Connection & Continue'
                    )}
                  </Button>
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer font-semibold text-sm text-gray-700">
                  View Full SQL Migration
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-xs overflow-x-auto border">
                  {migrationSQL}
                </pre>
              </details>
            </>
          ) : null}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What You'll Get</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>Create and manage books with multiple chapters</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>Organize content with categories and tags</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>Track likes, favorites, and views</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>Share books with your community</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>Import books from JSON format</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
