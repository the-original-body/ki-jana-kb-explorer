/**
 * 404 Not Found Page
 *
 * A friendly error page displayed when users navigate to non-existent routes.
 * Features:
 * - Clear 404 message with explanation
 * - Illustration/icon for visual appeal
 * - Link back to home page
 * - Consistent styling with the rest of the application
 * - Responsive design
 *
 * This is a React Server Component (RSC) - no client-side JavaScript required.
 */

import { Button } from '@/ui/button';

/**
 * Header component for the 404 page
 * Simplified navigation focusing on getting users back to working pages
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

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          <a href="/">
            <Button size="sm">Go Home</Button>
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * Footer component for the 404 page
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
 * 404 illustration component
 * A simple, friendly illustration to accompany the error message
 */
function NotFoundIllustration() {
  return (
    <div className="relative mx-auto w-48 h-48 sm:w-64 sm:h-64">
      {/* Background circle */}
      <div className="absolute inset-0 rounded-full bg-primary/10" />

      {/* 404 text as visual element */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl sm:text-8xl font-bold text-primary/20">404</span>
      </div>

      {/* Search icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="h-24 w-24 sm:h-32 sm:w-32 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
      </div>
    </div>
  );
}

/**
 * Quick links component
 * Provides alternative navigation options for lost users
 */
function QuickLinks() {
  const links = [
    { href: '/', label: 'Home', description: 'Go back to the landing page' },
    { href: '/ui', label: 'Components', description: 'Explore UI components' },
    { href: '/app', label: 'Demo App', description: 'Try the Notes application' },
    { href: '/health', label: 'Health Check', description: 'View system status' },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full max-w-4xl">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="group flex flex-col p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all"
        >
          <span className="font-medium group-hover:text-primary transition-colors">
            {link.label}
          </span>
          <span className="text-sm text-muted-foreground mt-1">
            {link.description}
          </span>
        </a>
      ))}
    </div>
  );
}

/**
 * Main 404 page component
 *
 * Displays a friendly error message when users navigate to a non-existent route.
 * Includes:
 * - Clear messaging about what happened
 * - Visual illustration
 * - Direct link to home page
 * - Quick links to popular pages
 */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center space-y-8 max-w-2xl mx-auto">
          {/* Illustration */}
          <NotFoundIllustration />

          {/* Error message */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Page Not Found
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Sorry, we couldn&apos;t find the page you&apos;re looking for.
              The page may have been moved, deleted, or never existed.
            </p>
          </div>

          {/* Primary action */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/">
              <Button size="lg">
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Back to Home
              </Button>
            </a>
            <a href="/app">
              <Button variant="outline" size="lg">
                Try the Demo App
              </Button>
            </a>
          </div>

          {/* Quick links section */}
          <div className="pt-8 border-t border-border">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">
              Or try one of these pages:
            </h2>
            <QuickLinks />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
