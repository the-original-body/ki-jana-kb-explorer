/**
 * Protected App Page (/app)
 *
 * This is the main protected application area that requires authentication.
 * Features:
 * - Display list of user's notes
 * - Form to create new notes
 * - Delete button per note
 * - User session info display
 * - Logout functionality
 *
 * This route is protected by the auth interceptor - unauthenticated users
 * are redirected to /login.
 *
 * Uses "use client" directive for form interactivity and state management.
 */

'use client';

import * as React from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';

/**
 * Note type definition
 */
interface Note {
  id: string;
  content: string;
  createdAt: string;
}

/**
 * User session info (loaded from session)
 */
interface UserSession {
  email: string;
  name?: string;
}

/**
 * Generates a random ID for notes
 */
function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Header component for the app page
 */
function Header({ user }: { user: UserSession | null }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center space-x-2">
          <span className="text-2xl" role="img" aria-label="Redwood tree">
            🌲
          </span>
          <span className="font-bold text-xl">RedwoodSDK</span>
        </a>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <a
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </a>
          <a
            href="/ui"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Components
          </a>
          <a href="/app" className="text-foreground font-semibold">
            Notes App
          </a>
        </nav>

        {/* User actions */}
        <div className="flex items-center space-x-4">
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user.email}
            </span>
          )}
          <ThemeToggle />
          <a href="/logout">
            <Button variant="outline" size="sm">
              Sign Out
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * Theme toggle component
 */
function ThemeToggle() {
  const handleToggle = () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    document.cookie = `theme=${newTheme};path=/;max-age=31536000;samesite=lax`;
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="p-2 rounded-md hover:bg-accent transition-colors"
      aria-label="Toggle dark mode"
    >
      {/* Sun icon for light mode */}
      <svg
        className="h-5 w-5 hidden [html[data-theme='dark']_&]:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
      {/* Moon icon for dark mode */}
      <svg
        className="h-5 w-5 block [html[data-theme='dark']_&]:hidden"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}

/**
 * Footer component
 */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-8">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} RedwoodSDK. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </a>
          <a
            href="/ui"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Components
          </a>
          <a
            href="https://github.com/redwoodjs/sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

/**
 * Create note form component
 */
function CreateNoteForm({ onCreateNote }: { onCreateNote: (content: string) => void }) {
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!content.trim()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    onCreateNote(content.trim());
    setContent('');
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        type="text"
        placeholder="Write a new note..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1"
        disabled={isSubmitting}
        autoComplete="off"
      />
      <Button type="submit" disabled={isSubmitting || !content.trim()}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Adding...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Add Note
          </span>
        )}
      </Button>
    </form>
  );
}

/**
 * Single note card component
 */
function NoteCard({
  note,
  onDelete,
}: {
  note: Note;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    onDelete(note.id);
  };

  const formattedDate = new Date(note.createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="group relative rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">
            {note.content}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{formattedDate}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isDeleting}
          className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          aria-label={`Delete note: ${note.content.substring(0, 20)}...`}
        >
          {isDeleting ? (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Notes list component
 */
function NotesList({
  notes,
  onDeleteNote,
}: {
  notes: Note[];
  onDeleteNote: (id: string) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No notes yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first note using the form above.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onDelete={onDeleteNote} />
      ))}
    </div>
  );
}

/**
 * User info card component
 */
function UserInfoCard({ user }: { user: UserSession }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-2">
        Signed in as
      </h3>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-semibold">
            {user.email.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="font-medium">{user.name || 'User'}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Demo notice component
 */
function DemoNotice() {
  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-500 mt-0.5 shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <div>
          <h4 className="font-medium text-amber-700 dark:text-amber-300">
            Demo Mode
          </h4>
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            Notes are stored in browser memory only. They will be lost when you
            refresh the page. Full persistence with Durable Objects or D1
            coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Initial demo notes
 */
const INITIAL_NOTES: Note[] = [
  {
    id: 'note_demo_1',
    content: 'Welcome to the Notes app! This is a demo note to get you started.',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'note_demo_2',
    content:
      'Try creating a new note using the form above. You can also delete notes by hovering and clicking the trash icon.',
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
  },
];

/**
 * Main App page component
 *
 * This is a protected page that requires authentication.
 * The auth interceptor middleware handles redirecting unauthenticated users.
 */
export default function AppPage() {
  // In-memory notes state (will be replaced with server state when notes.ts is implemented)
  const [notes, setNotes] = React.useState<Note[]>(INITIAL_NOTES);

  // Mock user session (in production, this comes from session context)
  // For now, we'll try to get it from a cookie or use a default
  const [user, setUser] = React.useState<UserSession | null>(null);

  // Load user info from session on mount
  React.useEffect(() => {
    // In production, the session would be loaded server-side
    // For the demo, we'll use a simple approach
    // The user is authenticated if they reached this page (auth interceptor)
    setUser({
      email: 'demo@example.com',
      name: 'Demo User',
    });
  }, []);

  const handleCreateNote = (content: string) => {
    const newNote: Note = {
      id: generateNoteId(),
      content,
      createdAt: new Date().toISOString(),
    };

    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={user} />

      <main className="flex-1 py-8">
        <div className="container">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
            <p className="text-muted-foreground mt-2">
              Create, view, and manage your personal notes.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            {/* Main content */}
            <div className="space-y-6">
              {/* Create note form */}
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-medium mb-3">New Note</h2>
                <CreateNoteForm onCreateNote={handleCreateNote} />
              </div>

              {/* Notes list */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Your Notes</h2>
                  <span className="text-sm text-muted-foreground">
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                  </span>
                </div>
                <NotesList notes={notes} onDeleteNote={handleDeleteNote} />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* User info */}
              {user && <UserInfoCard user={user} />}

              {/* Demo notice */}
              <DemoNotice />

              {/* Quick stats */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="text-sm font-medium mb-3">Quick Stats</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Total Notes</dt>
                    <dd className="font-medium">{notes.length}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">Storage</dt>
                    <dd className="font-medium text-amber-500">In-Memory</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
