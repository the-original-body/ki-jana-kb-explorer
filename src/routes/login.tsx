/**
 * Login Page (/login)
 *
 * This page provides user authentication via a login form.
 * Features:
 * - Email and password inputs
 * - Form validation with error messages
 * - Demo credentials display for testing
 * - Redirect support via ?redirect= query param
 * - Server-side authentication via login server function
 *
 * Uses "use client" directive for form interactivity and state management.
 */

'use client';

import * as React from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';

/**
 * Login response type from the API
 */
interface LoginResponse {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Demo credentials for testing
 * These match the credentials in src/server/auth.ts
 */
const DEMO_CREDENTIALS = [
  { email: 'demo@example.com', password: 'demo1234' },
  { email: 'admin@example.com', password: 'admin1234' },
];

/**
 * Header component for the login page
 */
function Header() {
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
          <a
            href="/app"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Demo App
          </a>
        </nav>
      </div>
    </header>
  );
}

/**
 * Footer component for the login page
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
 * Demo credentials display card
 */
function DemoCredentialsCard({
  onSelectCredentials,
}: {
  onSelectCredentials: (email: string, password: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Demo Credentials
      </h3>
      <div className="space-y-2">
        {DEMO_CREDENTIALS.map((cred) => (
          <button
            key={cred.email}
            type="button"
            onClick={() => onSelectCredentials(cred.email, cred.password)}
            className="w-full text-left p-2 rounded-md bg-background border border-border hover:border-primary/50 transition-colors text-sm"
          >
            <div className="font-medium">{cred.email}</div>
            <div className="text-muted-foreground text-xs">
              Password: {cred.password}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Login form component
 */
function LoginForm() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Get redirect URL from query params
  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('redirect') || '/app';
    }
    return '/app';
  };

  const handleSelectCredentials = (selectedEmail: string, selectedPassword: string) => {
    setEmail(selectedEmail);
    setPassword(selectedPassword);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Client-side validation
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      if (!password || password.length < 4) {
        setError('Password must be at least 4 characters');
        setIsLoading(false);
        return;
      }

      // Submit to API endpoint for authentication
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('redirect', getRedirectUrl());

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json() as LoginResponse;

      if (result.success) {
        // Redirect on success
        window.location.href = result.redirectTo || '/app';
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Email field */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
          disabled={isLoading}
        />
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
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
            Signing in...
          </span>
        ) : (
          'Sign In'
        )}
      </Button>

      {/* Demo credentials */}
      <DemoCredentialsCard onSelectCredentials={handleSelectCredentials} />
    </form>
  );
}

/**
 * Main Login page component
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Login card */}
          <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
              <p className="text-muted-foreground mt-2">
                Sign in to access your account
              </p>
            </div>

            {/* Login form */}
            <LoginForm />

            {/* Footer links */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <a
                href="/"
                className="hover:text-foreground transition-colors underline underline-offset-4"
              >
                Back to home
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
