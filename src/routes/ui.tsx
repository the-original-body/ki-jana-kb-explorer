/**
 * UI Component Showcase Page (/ui)
 *
 * This page demonstrates all shadcn/ui components used in the template:
 * - Button (all variants and sizes)
 * - Input (all variants and sizes)
 * - Dialog (modal functionality)
 * - Toast (notifications)
 * - Table (data display)
 * - Tabs (content organization)
 *
 * The page uses "use client" since many components require client-side interactivity.
 */

'use client';

import * as React from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/dialog';
import {
  ToastProvider,
  Toaster,
  useToast,
} from '@/ui/toast';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';

/**
 * Section wrapper for consistent styling
 */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">{children}</div>
    </section>
  );
}

/**
 * Button variants showcase
 */
function ButtonShowcase() {
  return (
    <div className="space-y-6">
      {/* Variants */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Variants</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Sizes</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg">Large</Button>
          <Button size="default">Default</Button>
          <Button size="sm">Small</Button>
          <Button size="icon" aria-label="Icon button">
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
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </Button>
        </div>
      </div>

      {/* States */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">States</h3>
        <div className="flex flex-wrap gap-4">
          <Button>Normal</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>

      {/* With Icons */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">With Icons</h3>
        <div className="flex flex-wrap gap-4">
          <Button>
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
              className="mr-2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            Download
          </Button>
          <Button variant="outline">
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
              className="mr-2"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" x2="12" y1="2" y2="15" />
            </svg>
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Input variants showcase
 */
function InputShowcase() {
  return (
    <div className="space-y-6">
      {/* Variants */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Variants</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="input-default" className="text-sm font-medium">
              Default
            </label>
            <Input
              id="input-default"
              variant="default"
              placeholder="Enter text..."
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="input-error" className="text-sm font-medium">
              Error
            </label>
            <Input
              id="input-error"
              variant="error"
              placeholder="Invalid input"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="input-ghost" className="text-sm font-medium">
              Ghost
            </label>
            <Input id="input-ghost" variant="ghost" placeholder="Ghost input" />
          </div>
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Sizes</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="input-lg" className="text-sm font-medium">
              Large
            </label>
            <Input id="input-lg" size="lg" placeholder="Large input" />
          </div>
          <div className="space-y-2">
            <label htmlFor="input-md" className="text-sm font-medium">
              Default
            </label>
            <Input id="input-md" size="default" placeholder="Default input" />
          </div>
          <div className="space-y-2">
            <label htmlFor="input-sm" className="text-sm font-medium">
              Small
            </label>
            <Input id="input-sm" size="sm" placeholder="Small input" />
          </div>
        </div>
      </div>

      {/* Input Types */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Input Types
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="input-email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="input-email"
              type="email"
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="input-password" className="text-sm font-medium">
              Password
            </label>
            <Input id="input-password" type="password" placeholder="Password" />
          </div>
          <div className="space-y-2">
            <label htmlFor="input-search" className="text-sm font-medium">
              Search
            </label>
            <Input id="input-search" type="search" placeholder="Search..." />
          </div>
          <div className="space-y-2">
            <label htmlFor="input-disabled" className="text-sm font-medium">
              Disabled
            </label>
            <Input
              id="input-disabled"
              disabled
              placeholder="Disabled input"
              value="Cannot edit"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dialog showcase
 */
function DialogShowcase() {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click the button to open a modal dialog with header, content, and
        footer.
      </p>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Example Dialog</DialogTitle>
            <DialogDescription>
              This is a dialog component built with Radix UI. It includes a
              header, content area, and footer with action buttons.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Dialog content goes here. You can add forms, text, images, or any
              other content.
            </p>
            <div className="mt-4 space-y-2">
              <label htmlFor="dialog-input" className="text-sm font-medium">
                Example Input
              </label>
              <Input
                id="dialog-input"
                placeholder="Type something..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Toast showcase with useToast hook
 */
function ToastShowcaseInner() {
  const { toast } = useToast();

  const showDefaultToast = () => {
    toast({
      title: 'Default Toast',
      description: 'This is a default notification message.',
    });
  };

  const showSuccessToast = () => {
    toast({
      title: 'Success!',
      description: 'Your changes have been saved successfully.',
      variant: 'success',
    });
  };

  const showErrorToast = () => {
    toast({
      title: 'Error',
      description: 'Something went wrong. Please try again.',
      variant: 'error',
    });
  };

  const showWarningToast = () => {
    toast({
      title: 'Warning',
      description: 'This action may have unintended consequences.',
      variant: 'warning',
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click the buttons to trigger different toast notifications.
      </p>
      <div className="flex flex-wrap gap-4">
        <Button variant="outline" onClick={showDefaultToast}>
          Default Toast
        </Button>
        <Button
          variant="outline"
          className="border-green-500 text-green-600 hover:bg-green-50"
          onClick={showSuccessToast}
        >
          Success Toast
        </Button>
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={showErrorToast}
        >
          Error Toast
        </Button>
        <Button
          variant="outline"
          className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
          onClick={showWarningToast}
        >
          Warning Toast
        </Button>
      </div>
    </div>
  );
}

/**
 * Toast showcase wrapper with provider
 */
function ToastShowcase() {
  return (
    <ToastProvider>
      <ToastShowcaseInner />
      <Toaster position="bottom-right" />
    </ToastProvider>
  );
}

/**
 * Table showcase with sample data
 */
function TableShowcase() {
  const invoices = [
    {
      id: 'INV001',
      status: 'Paid',
      method: 'Credit Card',
      amount: '$250.00',
    },
    {
      id: 'INV002',
      status: 'Pending',
      method: 'PayPal',
      amount: '$150.00',
    },
    {
      id: 'INV003',
      status: 'Unpaid',
      method: 'Bank Transfer',
      amount: '$350.00',
    },
    {
      id: 'INV004',
      status: 'Paid',
      method: 'Credit Card',
      amount: '$450.00',
    },
    {
      id: 'INV005',
      status: 'Paid',
      method: 'Credit Card',
      amount: '$550.00',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950 dark:text-yellow-400';
      case 'Unpaid':
        return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
      default:
        return '';
    }
  };

  return (
    <Table>
      <TableCaption>A list of recent invoices.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Method</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-medium">{invoice.id}</TableCell>
            <TableCell>
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(invoice.status)}`}
              >
                {invoice.status}
              </span>
            </TableCell>
            <TableCell>{invoice.method}</TableCell>
            <TableCell className="text-right">{invoice.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Tabs showcase
 */
function TabsShowcase() {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="space-y-4 pt-4">
        <div className="space-y-2">
          <h4 className="font-medium">Account Settings</h4>
          <p className="text-sm text-muted-foreground">
            Make changes to your account here. Click save when you&apos;re done.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input id="name" defaultValue="John Doe" />
          </div>
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <Input id="username" defaultValue="@johndoe" />
          </div>
        </div>
        <Button>Save Changes</Button>
      </TabsContent>
      <TabsContent value="password" className="space-y-4 pt-4">
        <div className="space-y-2">
          <h4 className="font-medium">Password Settings</h4>
          <p className="text-sm text-muted-foreground">
            Change your password here. After saving, you&apos;ll be logged out.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="current" className="text-sm font-medium">
              Current Password
            </label>
            <Input id="current" type="password" />
          </div>
          <div className="space-y-2">
            <label htmlFor="new" className="text-sm font-medium">
              New Password
            </label>
            <Input id="new" type="password" />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm" className="text-sm font-medium">
              Confirm Password
            </label>
            <Input id="confirm" type="password" />
          </div>
        </div>
        <Button>Update Password</Button>
      </TabsContent>
      <TabsContent value="notifications" className="space-y-4 pt-4">
        <div className="space-y-2">
          <h4 className="font-medium">Notification Preferences</h4>
          <p className="text-sm text-muted-foreground">
            Configure how you receive notifications.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive email updates about your account activity.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get push notifications on your mobile device.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Configure
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

/**
 * Header component for the UI showcase page
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
          <a href="/ui" className="text-foreground transition-colors">
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
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          <a href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}

/**
 * Main UI Component Showcase page
 */
export default function UIShowcasePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-muted/30 py-12">
          <div className="container">
            <h1 className="text-4xl font-bold tracking-tight">
              Component Showcase
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Explore the UI components available in this template. All
              components are built with Radix UI primitives and styled with
              Tailwind CSS v4.
            </p>
          </div>
        </section>

        {/* Components */}
        <div className="container py-12 space-y-12">
          <Section
            title="Button"
            description="Buttons trigger actions or navigation. Available in multiple variants and sizes."
          >
            <ButtonShowcase />
          </Section>

          <Section
            title="Input"
            description="Form inputs for collecting user data. Supports various types, variants, and sizes."
          >
            <InputShowcase />
          </Section>

          <Section
            title="Dialog"
            description="Modal dialogs for focused interactions. Built with Radix UI for accessibility."
          >
            <DialogShowcase />
          </Section>

          <Section
            title="Toast"
            description="Toast notifications for non-blocking feedback. Supports multiple variants and auto-dismiss."
          >
            <ToastShowcase />
          </Section>

          <Section
            title="Table"
            description="Data tables for displaying structured information. Responsive with overflow handling."
          >
            <TableShowcase />
          </Section>

          <Section
            title="Tabs"
            description="Tab panels for organizing content into switchable views. Built with Radix UI."
          >
            <TabsShowcase />
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RedwoodSDK. All components are
            open source.
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
              Demo App
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
    </div>
  );
}
