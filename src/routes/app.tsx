/**
 * KB Analytics Explorer Page (/app)
 *
 * This is the main application page for exploring Ki-Jana Knowledge Base analytics.
 * Features:
 * - Links to interactive visualizations
 * - Overview of available analytics data
 * - Quick access to topic explorer, entity network, and coverage heatmap
 *
 * Zero-Auth: Public access, no authentication required.
 */

'use client';

import * as React from 'react';

/**
 * Analytics resource type
 */
interface AnalyticsResource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'visualization' | 'data';
  icon: React.ReactNode;
}

/**
 * Header component for the app page
 */
function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center space-x-2">
          <span className="text-2xl" role="img" aria-label="Knowledge Base">
            KB
          </span>
          <span className="font-bold text-xl">Ki-Jana KB Explorer</span>
        </a>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <a
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </a>
          <a href="/app" className="text-foreground font-semibold">
            Analytics
          </a>
          <a
            href="/ui"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Components
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
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
          &copy; {currentYear} Ki-Jana Knowledge Base. All rights reserved.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Home
          </a>
          <a
            href="/app"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Analytics
          </a>
        </div>
      </div>
    </footer>
  );
}

/**
 * Resource card component
 */
function ResourceCard({ resource }: { resource: AnalyticsResource }) {
  return (
    <a
      href={resource.url}
      target={resource.url.endsWith('.html') ? '_blank' : undefined}
      rel={resource.url.endsWith('.html') ? 'noopener noreferrer' : undefined}
      className="group block rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {resource.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
            {resource.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {resource.description}
          </p>
          <span className="inline-flex items-center mt-3 text-sm font-medium text-primary">
            {resource.url.endsWith('.html') ? 'Open Visualization' : 'View Data'}
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
              className="ml-1"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </a>
  );
}

/**
 * Stats card component
 */
function StatsCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Analytics resources
 */
const ANALYTICS_RESOURCES: AnalyticsResource[] = [
  {
    id: 'topic-explorer',
    title: 'Topic Explorer',
    description: 'Interactive exploration of extracted topics from the knowledge base with hierarchical navigation.',
    url: '/topic_explorer.html',
    type: 'visualization',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
  {
    id: 'entity-network',
    title: 'Entity Network',
    description: 'Visualize relationships between entities extracted from the knowledge base content.',
    url: '/entity_network.html',
    type: 'visualization',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M8.59 13.51 15.42 17.49" />
        <path d="M15.41 6.51 8.59 10.49" />
      </svg>
    ),
  },
  {
    id: 'coverage-heatmap',
    title: 'Coverage Heatmap',
    description: 'Analyze coverage patterns across different topics and categories in the knowledge base.',
    url: '/coverage_heatmap.html',
    type: 'visualization',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
      </svg>
    ),
  },
  {
    id: 'bertopic-viz',
    title: 'BERTopic Visualization',
    description: 'Advanced topic modeling visualization using BERTopic algorithm results.',
    url: '/bertopic_visualization.html',
    type: 'visualization',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
];

/**
 * Main KB Explorer page component
 */
export default function AppPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">KB Analytics Explorer</h1>
            <p className="text-muted-foreground mt-2">
              Explore and analyze the Ki-Jana Knowledge Base with interactive visualizations and data insights.
            </p>
          </div>

          {/* Stats overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatsCard
              label="Total Topics"
              value="~100+"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M12 20V10" />
                  <path d="M18 20V4" />
                  <path d="M6 20v-4" />
                </svg>
              }
            />
            <StatsCard
              label="Entities"
              value="500+"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
            />
            <StatsCard
              label="Questions"
              value="1000+"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                </svg>
              }
            />
            <StatsCard
              label="Visualizations"
              value="4"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M3 3v18h18" />
                  <rect width="4" height="7" x="7" y="10" rx="1" />
                  <rect width="4" height="12" x="15" y="5" rx="1" />
                </svg>
              }
            />
          </div>

          {/* Visualizations section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Interactive Visualizations</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {ANALYTICS_RESOURCES.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </section>

          {/* Data files section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Data Files</h2>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Raw JSON data files are available for programmatic access:
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'bertopic_topics.json',
                  'cluster_hierarchy.json',
                  'coverage_matrix.json',
                  'entity_cooccurrence.json',
                  'entity_statistics.json',
                  'hierarchy_statistics.json',
                  'questions_with_entities.json',
                  'roi_ranked_topics.json',
                ].map((file) => (
                  <a
                    key={file}
                    href={`/data/${file}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span className="text-foreground">{file}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
