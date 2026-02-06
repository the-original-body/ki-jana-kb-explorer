import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Table component.
 * Wrapper component that provides the table container with overflow handling.
 *
 * @example
 * <Table>
 *   <TableCaption>A list of your recent invoices.</TableCaption>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Invoice</TableHead>
 *       <TableHead>Status</TableHead>
 *       <TableHead className="text-right">Amount</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>INV001</TableCell>
 *       <TableCell>Paid</TableCell>
 *       <TableCell className="text-right">$250.00</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

/**
 * TableHeader component.
 * Contains the header row(s) of the table.
 *
 * @example
 * <TableHeader>
 *   <TableRow>
 *     <TableHead>Name</TableHead>
 *     <TableHead>Email</TableHead>
 *   </TableRow>
 * </TableHeader>
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('[&_tr]:border-b', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

/**
 * TableBody component.
 * Contains the main content rows of the table.
 *
 * @example
 * <TableBody>
 *   <TableRow>
 *     <TableCell>John Doe</TableCell>
 *     <TableCell>john@example.com</TableCell>
 *   </TableRow>
 * </TableBody>
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

/**
 * TableFooter component.
 * Contains the footer row(s) of the table, typically for totals or summaries.
 *
 * @example
 * <TableFooter>
 *   <TableRow>
 *     <TableCell colSpan={2}>Total</TableCell>
 *     <TableCell className="text-right">$500.00</TableCell>
 *   </TableRow>
 * </TableFooter>
 */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t bg-muted/50 font-medium [&>tr]:last:border-b-0',
      className
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

/**
 * TableRow component.
 * Represents a single row in the table.
 *
 * @example
 * <TableRow>
 *   <TableCell>Data 1</TableCell>
 *   <TableCell>Data 2</TableCell>
 * </TableRow>
 *
 * @example
 * // Clickable row
 * <TableRow className="cursor-pointer" onClick={handleRowClick}>
 *   <TableCell>Clickable row</TableCell>
 * </TableRow>
 */
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b transition-colors',
      'hover:bg-muted/50',
      'data-[state=selected]:bg-muted',
      className
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

/**
 * TableHead component.
 * Header cell component (th) for column headers.
 *
 * @example
 * <TableHead>Column Name</TableHead>
 *
 * @example
 * // Right-aligned header
 * <TableHead className="text-right">Amount</TableHead>
 *
 * @example
 * // Sortable header
 * <TableHead className="cursor-pointer" onClick={handleSort}>
 *   Name <SortIcon />
 * </TableHead>
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
      '[&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

/**
 * TableCell component.
 * Standard table cell (td) for data display.
 *
 * @example
 * <TableCell>Cell content</TableCell>
 *
 * @example
 * // Right-aligned cell
 * <TableCell className="text-right">$100.00</TableCell>
 *
 * @example
 * // Cell with actions
 * <TableCell>
 *   <Button variant="ghost" size="sm">Edit</Button>
 *   <Button variant="ghost" size="sm">Delete</Button>
 * </TableCell>
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'p-4 align-middle',
      '[&:has([role=checkbox])]:pr-0',
      className
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

/**
 * TableCaption component.
 * Provides a caption or description for the table.
 * Displayed at the bottom of the table by default.
 *
 * @example
 * <TableCaption>A list of your recent invoices.</TableCaption>
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
