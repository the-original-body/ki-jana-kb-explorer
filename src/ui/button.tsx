import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Button component variants using class-variance-authority (cva).
 * Supports multiple visual variants and sizes for flexible UI composition.
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-md text-sm font-medium',
    'ring-offset-background transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      /**
       * Visual style variant
       * - default: Primary action button with brand color
       * - destructive: Dangerous/destructive actions (delete, remove)
       * - outline: Secondary action with border
       * - secondary: Alternative secondary style
       * - ghost: Minimal styling, hover reveals background
       * - link: Appears as a text link
       */
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      /**
       * Size variant
       * - default: Standard button size
       * - sm: Small button for compact UIs
       * - lg: Large button for primary CTAs
       * - icon: Square button for icon-only buttons
       */
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Button component props interface
 * Extends HTML button attributes and cva variant props
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * If true, renders as a child component (useful for composing with other elements)
   * @default false
   */
  asChild?: boolean;
}

/**
 * Button component with multiple variants and sizes.
 *
 * @example
 * // Default button
 * <Button>Click me</Button>
 *
 * @example
 * // Destructive button with icon
 * <Button variant="destructive">
 *   <TrashIcon /> Delete
 * </Button>
 *
 * @example
 * // Small outline button
 * <Button variant="outline" size="sm">Secondary</Button>
 *
 * @example
 * // Icon-only button
 * <Button variant="ghost" size="icon">
 *   <MenuIcon />
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild: _asChild = false, ...props }, ref) => {
    // Note: asChild is included for API compatibility but simplified implementation
    // In a full shadcn/ui setup, this would use @radix-ui/react-slot for composition
    void _asChild; // Suppress unused variable - kept for API compatibility
    const Comp = 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
