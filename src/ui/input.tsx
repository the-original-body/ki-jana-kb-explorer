import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Input component variants using class-variance-authority (cva).
 * Supports multiple visual variants and sizes for flexible form composition.
 */
const inputVariants = cva(
  // Base styles applied to all inputs
  [
    'flex w-full rounded-md border bg-background text-foreground',
    'text-sm ring-offset-background',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'transition-colors',
  ],
  {
    variants: {
      /**
       * Visual style variant
       * - default: Standard input with border
       * - error: Input with error state (red border/ring)
       * - ghost: Minimal styling, border appears on focus
       */
      variant: {
        default: 'border-input',
        error:
          'border-destructive focus-visible:ring-destructive/50 text-destructive placeholder:text-destructive/60',
        ghost:
          'border-transparent hover:border-input focus-visible:border-input',
      },
      /**
       * Size variant
       * - default: Standard input height
       * - sm: Small input for compact UIs
       * - lg: Large input for prominent forms
       */
      size: {
        default: 'h-10 px-3 py-2',
        sm: 'h-9 px-3 py-1 text-xs',
        lg: 'h-12 px-4 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Input component props interface
 * Extends HTML input attributes and cva variant props
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

/**
 * Input component with multiple variants and sizes.
 * Supports all native input types and integrates with form libraries.
 *
 * @example
 * // Default text input
 * <Input type="text" placeholder="Enter your name" />
 *
 * @example
 * // Email input with error state
 * <Input type="email" variant="error" placeholder="Invalid email" />
 *
 * @example
 * // Large search input
 * <Input type="search" size="lg" placeholder="Search..." />
 *
 * @example
 * // File input
 * <Input type="file" accept="image/*" />
 *
 * @example
 * // Disabled input
 * <Input disabled value="Cannot edit" />
 *
 * @example
 * // Password input with custom className
 * <Input type="password" className="font-mono" />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, size, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
