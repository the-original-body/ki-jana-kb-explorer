/**
 * Landing Page - Public Homepage
 *
 * This is the main landing page for the RedwoodSDK template.
 * It showcases the template's features and provides navigation.
 *
 * Features:
 * - Responsive header with navigation and dark mode toggle
 * - Hero section with CTA buttons
 * - Feature cards highlighting key capabilities
 * - Footer with links
 *
 * This is a React Server Component (RSC) - no client-side JavaScript required
 * for the initial render.
 */

import { Button } from '@/ui/button';

/**
 * Theme toggle component for the header
 * Uses a form submission to toggle theme (works without JavaScript)
 */
function ThemeToggle() {
  // Inline script to handle theme toggle (works in RSC context)
  const themeToggleScript = `
    (function(){
      var btn = document.getElementById('theme-toggle-btn');
      if (btn) {
        btn.addEventListener('click', function() {
          var h = document.documentElement;
          var t = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
          h.setAttribute('data-theme', t);
          document.cookie = 'theme=' + t + ';path=/;max-age=31536000;samesite=lax';
        });
      }
    })();
  `;

  return (
    <>
      <button
        id="theme-toggle-btn"
        type="button"
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
      <script dangerouslySetInnerHTML={{ __html: themeToggleScript }} />
    </>
  );
}

/**
 * Header component with navigation
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
          <a
            href="/health"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Health
          </a>
          <a
            href="https://github.com/redwoodjs/sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <a href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </a>
          <a href="/app" className="hidden sm:block">
            <Button size="sm">Get Started</Button>
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * Hero section with main CTA
 */
function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-32 lg:py-40">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,rgb(var(--primary)/0.1),transparent)]" />

      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 flex justify-center">
            <div className="rounded-full border border-border bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
              Built on Cloudflare Workers
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Build Fast, Deploy{' '}
            <span className="text-primary">Everywhere</span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl leading-relaxed">
            A production-grade template for React Server Components on Cloudflare
            Workers. Ship global applications with edge performance, zero cold
            starts, and seamless CI/CD.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="/app">
              <Button size="lg" className="w-full sm:w-auto">
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Try the Demo
              </Button>
            </a>
            <a href="/ui">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                View Components
              </Button>
            </a>
          </div>

          {/* Tech stack badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z" />
              </svg>
              React 19 RSC
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-.176 6.194a.756.756 0 0 1 .258-.068c.104-.008.21-.001.313.02.103.022.203.058.296.109a.84.84 0 0 1 .238.189.894.894 0 0 1 .163.264.945.945 0 0 1 .071.324v2.08l2.078-1.2a.89.89 0 0 1 .307-.12.848.848 0 0 1 .315.01.81.81 0 0 1 .285.119.76.76 0 0 1 .212.212.81.81 0 0 1 .119.285.848.848 0 0 1 .01.315.89.89 0 0 1-.12.307l-1.2 2.078 2.08-.001a.945.945 0 0 1 .324.071.894.894 0 0 1 .264.163.84.84 0 0 1 .189.238.756.756 0 0 1 .109.296.71.71 0 0 1 .02.313.679.679 0 0 1-.068.258.669.669 0 0 1-.14.218.757.757 0 0 1-.196.165.945.945 0 0 1-.233.103l-2.349.561 1.186 2.054a.89.89 0 0 1 .1.315.848.848 0 0 1-.029.313.81.81 0 0 1-.139.275.76.76 0 0 1-.224.198.81.81 0 0 1-.29.101.848.848 0 0 1-.314-.018.89.89 0 0 1-.299-.138l-2.054-1.186-.561 2.349a.945.945 0 0 1-.103.233.757.757 0 0 1-.165.196.669.669 0 0 1-.218.14.679.679 0 0 1-.258.068.71.71 0 0 1-.313-.02.756.756 0 0 1-.296-.109.84.84 0 0 1-.238-.189.894.894 0 0 1-.163-.264.945.945 0 0 1-.071-.324v-2.08l-2.078 1.2a.89.89 0 0 1-.307.12.848.848 0 0 1-.315-.01.81.81 0 0 1-.285-.119.76.76 0 0 1-.212-.212.81.81 0 0 1-.119-.285.848.848 0 0 1-.01-.315.89.89 0 0 1 .12-.307l1.2-2.078-2.08.001a.945.945 0 0 1-.324-.071.894.894 0 0 1-.264-.163.84.84 0 0 1-.189-.238.756.756 0 0 1-.109-.296.71.71 0 0 1-.02-.313.679.679 0 0 1 .068-.258.669.669 0 0 1 .14-.218.757.757 0 0 1 .196-.165.945.945 0 0 1 .233-.103l2.349-.561-1.186-2.054a.89.89 0 0 1-.1-.315.848.848 0 0 1 .029-.313.81.81 0 0 1 .139-.275.76.76 0 0 1 .224-.198.81.81 0 0 1 .29-.101.848.848 0 0 1 .314.018.89.89 0 0 1 .299.138l2.054 1.186.561-2.349a.945.945 0 0 1 .103-.233.757.757 0 0 1 .165-.196.669.669 0 0 1 .218-.14z" />
              </svg>
              Cloudflare Workers
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z" />
              </svg>
              Tailwind CSS v4
            </span>
            <span className="text-border">•</span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 12v12h24V0H0v12zm19.52-.902c.458.604.788 1.31.788 2.21 0 3.18-2.396 4.564-4.676 4.564H7.8V5.748h6.952c2.112 0 3.816 1.158 3.816 3.416 0 1.404-.704 2.37-1.56 2.834v.1h.512zM11.4 8.264v3.192h2.364c1.02 0 1.764-.62 1.764-1.596 0-.968-.744-1.596-1.764-1.596H11.4zm2.844 8.428c1.228 0 2.028-.724 2.028-1.808 0-1.136-.8-1.816-2.028-1.816H11.4v3.624h2.844z" />
              </svg>
              TypeScript
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Feature card component
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group relative rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

/**
 * Features section showcasing key capabilities
 */
function FeaturesSection() {
  return (
    <section className="py-20 sm:py-24 bg-muted/30">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Production-ready features to help you build and deploy faster.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            title="Global Edge Network"
            description="Deploy to 300+ locations worldwide. Sub-50ms cold starts with Cloudflare Workers' V8 isolate architecture."
          />

          <FeatureCard
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            }
            title="React Server Components"
            description="Native RSC support with streaming, server functions, and zero-config code splitting. React 19 ready."
          />

          <FeatureCard
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            }
            title="Secure Sessions"
            description="Durable Objects for session storage with HttpOnly cookies. Strong consistency and edge-native authentication."
          />

          <FeatureCard
            icon={
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            }
            title="One-Shot CI/CD"
            description="GitHub Actions workflow for preview, staging, and production. Auto-deploy on PR, merge, or tag."
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Call to action section
 */
function CTASection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container">
        <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-16 sm:px-16 sm:py-20">
          {/* Background pattern */}
          <div className="absolute inset-0 -z-10 opacity-10">
            <svg className="h-full w-full" aria-hidden="true">
              <defs>
                <pattern
                  id="hero-pattern"
                  width={40}
                  height={40}
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx={20} cy={20} r={2} fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-pattern)" />
            </svg>
          </div>

          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Clone the template, configure your secrets, and deploy in minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://github.com/redwoodjs/sdk"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  View on GitHub
                </Button>
              </a>
              <a href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Sign In to Demo
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Footer component
 */
function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border py-12">
      <div className="container">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <a href="/" className="flex items-center space-x-2">
              <span className="text-2xl" role="img" aria-label="Redwood tree">
                🌲
              </span>
              <span className="font-bold text-lg">RedwoodSDK</span>
            </a>
            <p className="text-sm text-muted-foreground">
              Production-grade React Server Components on Cloudflare Workers.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="/ui"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Components
                </a>
              </li>
              <li>
                <a
                  href="/app"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Demo App
                </a>
              </li>
              <li>
                <a
                  href="/health"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Health Check
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://github.com/redwoodjs/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://developers.cloudflare.com/workers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cloudflare Docs
                </a>
              </li>
              <li>
                <a
                  href="https://react.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  React Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} RedwoodSDK. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/redwoodjs/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <a
              href="https://twitter.com/redwoodjs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Twitter"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Main landing page component
 *
 * This is a React Server Component that renders the complete landing page.
 * No client-side JavaScript is required for the initial render.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
