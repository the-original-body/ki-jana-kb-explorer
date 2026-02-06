/**
 * AppDocument - Root HTML Document Component
 *
 * This is the root document component that wraps all pages.
 * It provides:
 * - HTML shell with proper meta tags
 * - Tailwind CSS styles
 * - Server-driven dark mode support via data-theme attribute
 * - Accessibility attributes
 *
 * Dark mode is implemented using CSS custom properties because
 * Tailwind CSS v4 alpha does NOT support dark mode variants.
 * The theme is determined server-side from a cookie preference.
 */

import type { ReactNode } from 'react';

// Import CSS with ?url to get the bundled path for the link tag
import stylesUrl from './styles.css?url';

/**
 * Props for the Document component
 */
interface DocumentProps {
  /** Child components to render in the body */
  children: ReactNode;
  /** Theme preference (light or dark), determined from cookie server-side */
  theme?: 'light' | 'dark';
  /** Optional title override for the page */
  title?: string;
  /** Optional description for SEO */
  description?: string;
}

/**
 * Root Document component that provides the HTML shell
 *
 * This component is rendered on the server and provides:
 * - Proper HTML5 document structure
 * - Meta tags for viewport, charset, and SEO
 * - Tailwind CSS v4 styles via CSS import
 * - Dark mode support via data-theme attribute
 *
 * @example
 * ```tsx
 * <Document theme="dark">
 *   <HomePage />
 * </Document>
 * ```
 */
export function Document({
  children,
  theme = 'light',
  title = 'RedwoodSDK Template',
  description = 'A production-grade template for React Server Components on Cloudflare Workers',
}: DocumentProps) {
  return (
    <html lang="en" data-theme={theme} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content={theme === 'dark' ? 'dark' : 'light'} />

        {/* SEO Meta Tags */}
        <title>{title}</title>
        <meta name="description" content={description} />

        {/* Theme Color - adjusts browser UI */}
        <meta
          name="theme-color"
          content={theme === 'dark' ? '#0a0a0a' : '#ffffff'}
        />

        {/* Favicon - uses emoji for simplicity, replace with actual favicon in production */}
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌲</text></svg>"
        />

        {/* Tailwind CSS v4 Styles */}
        <link rel="stylesheet" href={stylesUrl} />

        {/* Prevent FOUC (Flash of Unstyled Content) */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Critical CSS to prevent FOUC */
              html { visibility: visible; }

              /* Default theme variables (light mode) */
              :root {
                --background: 255 255 255;
                --foreground: 10 10 10;
                --muted: 245 245 245;
                --muted-foreground: 115 115 115;
                --border: 229 229 229;
                --primary: 59 130 246;
                --primary-foreground: 255 255 255;
                --secondary: 139 92 246;
                --secondary-foreground: 255 255 255;
                --destructive: 239 68 68;
                --destructive-foreground: 255 255 255;
                --accent: 245 245 245;
                --accent-foreground: 10 10 10;
              }

              /* Dark theme variables */
              [data-theme="dark"] {
                --background: 10 10 10;
                --foreground: 250 250 250;
                --muted: 38 38 38;
                --muted-foreground: 163 163 163;
                --border: 38 38 38;
                --primary: 96 165 250;
                --primary-foreground: 10 10 10;
                --secondary: 167 139 250;
                --secondary-foreground: 10 10 10;
                --destructive: 248 113 113;
                --destructive-foreground: 10 10 10;
                --accent: 38 38 38;
                --accent-foreground: 250 250 250;
              }

              /* Base styles */
              body {
                background-color: rgb(var(--background));
                color: rgb(var(--foreground));
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.5;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Skip link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        >
          Skip to main content
        </a>

        {/* Main content area */}
        <div id="main-content">{children}</div>

        {/* Theme toggle script - runs immediately to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Immediately apply theme from cookie to prevent flash
              (function() {
                try {
                  // Check for theme cookie
                  var match = document.cookie.match(/(?:^|;)\\s*theme=([^;]*)/);
                  var theme = match ? decodeURIComponent(match[1]) : null;

                  // If no cookie, check system preference
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }

                  // Apply theme
                  document.documentElement.setAttribute('data-theme', theme);

                  // Update color-scheme meta tag
                  var colorScheme = document.querySelector('meta[name="color-scheme"]');
                  if (colorScheme) {
                    colorScheme.setAttribute('content', theme);
                  }

                  // Update theme-color meta tag
                  var themeColor = document.querySelector('meta[name="theme-color"]');
                  if (themeColor) {
                    themeColor.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
                  }
                } catch (e) {
                  // Silently fail if anything goes wrong
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}

/**
 * Helper function to get theme from request cookies
 * Use this in your route handlers to determine the user's theme preference
 *
 * @example
 * ```ts
 * const theme = getThemeFromRequest(request);
 * return <Document theme={theme}><HomePage /></Document>;
 * ```
 */
export function getThemeFromRequest(request: Request): 'light' | 'dark' {
  const cookieHeader = request.headers.get('Cookie') || '';
  const themeMatch = cookieHeader.match(/(?:^|;)\s*theme=([^;]*)/);

  if (themeMatch && themeMatch[1]) {
    const theme = decodeURIComponent(themeMatch[1]);
    if (theme === 'dark' || theme === 'light') {
      return theme;
    }
  }

  // Default to light theme
  return 'light';
}

/**
 * Helper function to create a Set-Cookie header for theme preference
 * Use this when the user toggles their theme preference
 *
 * @example
 * ```ts
 * const headers = new Headers();
 * headers.append('Set-Cookie', createThemeCookie('dark'));
 * return new Response(null, { status: 302, headers });
 * ```
 */
export function createThemeCookie(theme: 'light' | 'dark'): string {
  // Cookie expires in 1 year
  const maxAge = 60 * 60 * 24 * 365;
  return `theme=${theme}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

// Default export for convenience
export default Document;
