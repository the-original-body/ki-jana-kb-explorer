'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Toast variants using class-variance-authority.
 * Supports different visual styles for different notification types.
 */
const toastVariants = cva(
  [
    'group pointer-events-auto relative flex w-full items-center justify-between',
    'space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg',
    'transition-all duration-300',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0',
    'data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full',
  ],
  {
    variants: {
      /**
       * Visual style variant
       * - default: Neutral notification
       * - success: Success/confirmation notification
       * - error: Error/failure notification (destructive)
       * - warning: Warning/caution notification
       */
      variant: {
        default: 'border-border bg-background text-foreground',
        success: 'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
        error: 'border-destructive/50 bg-destructive/10 text-destructive dark:bg-destructive/20',
        warning: 'border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Toast data structure
 */
export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning';
  duration?: number;
  action?: React.ReactNode;
}

/**
 * Toast context type for managing toasts
 */
interface ToastContextType {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

/**
 * Toast Provider component.
 * Wraps the application to provide toast functionality.
 *
 * @example
 * <ToastProvider>
 *   <App />
 *   <ToastViewport />
 * </ToastProvider>
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastData = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const value = React.useMemo(
    () => ({ toasts, addToast, removeToast, clearToasts }),
    [toasts, addToast, removeToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}
ToastProvider.displayName = 'ToastProvider';

/**
 * useToast hook for managing toast notifications.
 *
 * @example
 * const { toast, dismiss, dismissAll } = useToast();
 *
 * // Show a success toast
 * toast({ title: 'Success!', variant: 'success' });
 *
 * // Show an error toast
 * toast({ title: 'Error!', description: 'Something went wrong.', variant: 'error' });
 *
 * // Dismiss a specific toast
 * const id = toast({ title: 'Loading...' });
 * dismiss(id);
 *
 * // Dismiss all toasts
 * dismissAll();
 */
export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const { addToast, removeToast, clearToasts, toasts } = context;

  return {
    /** Show a toast notification */
    toast: addToast,
    /** Dismiss a specific toast by ID */
    dismiss: removeToast,
    /** Dismiss all toasts */
    dismissAll: clearToasts,
    /** Current list of toasts */
    toasts,
  };
}

/**
 * Toast component props
 */
export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  /** Unique identifier for the toast */
  id?: string;
  /** Toast title */
  title?: string;
  /** Toast description/message */
  description?: string;
  /** Whether the toast is open */
  open?: boolean;
  /** Callback when toast is dismissed */
  onOpenChange?: (open: boolean) => void;
  /** Custom action element */
  action?: React.ReactNode;
}

/**
 * Toast component for displaying notifications.
 *
 * @example
 * <Toast
 *   title="Success!"
 *   description="Your changes have been saved."
 *   variant="success"
 * />
 *
 * @example
 * <Toast variant="error">
 *   <ToastTitle>Error</ToastTitle>
 *   <ToastDescription>Failed to save changes.</ToastDescription>
 * </Toast>
 */
const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, open = true, onOpenChange, action, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(open);

    React.useEffect(() => {
      setIsVisible(open);
    }, [open]);

    const handleClose = React.useCallback(() => {
      setIsVisible(false);
      onOpenChange?.(false);
    }, [onOpenChange]);

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-state={isVisible ? 'open' : 'closed'}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="grid gap-1">
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {children}
        </div>
        {action && <ToastAction>{action}</ToastAction>}
        <ToastClose onClick={handleClose} />
      </div>
    );
  }
);
Toast.displayName = 'Toast';

/**
 * ToastTitle component for the main heading of a toast.
 *
 * @example
 * <ToastTitle>Notification Title</ToastTitle>
 */
const ToastTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = 'ToastTitle';

/**
 * ToastDescription component for secondary text in a toast.
 *
 * @example
 * <ToastDescription>Your changes have been saved successfully.</ToastDescription>
 */
const ToastDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = 'ToastDescription';

/**
 * ToastAction component for interactive elements in a toast.
 *
 * @example
 * <ToastAction>
 *   <Button variant="outline" size="sm">Undo</Button>
 * </ToastAction>
 */
const ToastAction = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center shrink-0',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';

/**
 * ToastClose component for dismissing a toast.
 */
const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      'absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background',
      'transition-opacity hover:opacity-100',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'disabled:pointer-events-none',
      className
    )}
    aria-label="Close notification"
    {...props}
  >
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
      className="h-4 w-4"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  </button>
));
ToastClose.displayName = 'ToastClose';

/**
 * Toast viewport variants for positioning
 */
const toastViewportVariants = cva(
  [
    'fixed z-[100] flex max-h-screen flex-col-reverse gap-2 p-4',
    'sm:flex-col',
  ],
  {
    variants: {
      position: {
        'top-right': 'top-0 right-0 sm:flex-col',
        'top-left': 'top-0 left-0 sm:flex-col',
        'bottom-right': 'bottom-0 right-0 sm:flex-col-reverse',
        'bottom-left': 'bottom-0 left-0 sm:flex-col-reverse',
        'top-center': 'top-0 left-1/2 -translate-x-1/2 sm:flex-col',
        'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 sm:flex-col-reverse',
      },
    },
    defaultVariants: {
      position: 'bottom-right',
    },
  }
);

/**
 * ToastViewport component for rendering toasts in a fixed position.
 * Should be placed at the root of your app alongside ToastProvider.
 *
 * @example
 * <ToastProvider>
 *   <App />
 *   <ToastViewport position="top-right" />
 * </ToastProvider>
 */
export interface ToastViewportProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastViewportVariants> {}

const ToastViewport = React.forwardRef<HTMLDivElement, ToastViewportProps>(
  ({ className, position, ...props }, ref) => {
    const context = React.useContext(ToastContext);

    if (!context) {
      return null;
    }

    const { toasts, removeToast } = context;

    return (
      <div
        ref={ref}
        className={cn(
          toastViewportVariants({ position }),
          'w-full sm:max-w-[420px]',
          className
        )}
        {...props}
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
            action={toast.action}
            onOpenChange={(open) => {
              if (!open) removeToast(toast.id);
            }}
          />
        ))}
      </div>
    );
  }
);
ToastViewport.displayName = 'ToastViewport';

/**
 * Standalone Toaster component that includes both provider and viewport.
 * Convenient for simple setups where you just need to add toast functionality.
 *
 * @example
 * // In your layout or root component:
 * <Toaster position="top-right" />
 *
 * // Then use the hook anywhere:
 * const { toast } = useToast();
 * toast({ title: 'Hello!', variant: 'success' });
 */
export function Toaster({
  position = 'bottom-right',
}: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}) {
  return <ToastViewport position={position} />;
}
Toaster.displayName = 'Toaster';

export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastViewport,
  toastVariants,
  toastViewportVariants,
};
