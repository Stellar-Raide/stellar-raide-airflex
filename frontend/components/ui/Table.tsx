import React, { forwardRef } from "react";

/**
 * Reusable, theme-tokenised table primitives (issue #448).
 *
 * Admin tables previously used hardcoded dark-glass colours (`text-white`,
 * `bg-white/5`, `border-white/5`) that produced invisible borders and low
 * contrast in dark mode and were unreadable in light mode. These primitives
 * use Tailwind theme tokens with explicit `dark:` variants so every table
 * inherits legible header/body/empty states, visible row separators, and
 * accessible hover/selected states in both light and dark mode.
 */

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** Accessible label for the table (rendered via aria-label). */
  caption?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className = "", children, caption, ...props }, ref) => (
    <table
      ref={ref}
      aria-label={caption}
      className={`w-full border-collapse text-left text-sm text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    >
      {children}
    </table>
  ),
);
Table.displayName = "Table";

export interface THeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const THead = forwardRef<HTMLTableSectionElement, THeadProps>(
  ({ className = "", children, ...props }, ref) => (
    <thead
      ref={ref}
      className={`border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400 ${className}`}
      {...props}
    >
      {children}
    </thead>
  ),
);
THead.displayName = "THead";

export interface TBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TBody = forwardRef<HTMLTableSectionElement, TBodyProps>(
  ({ className = "", children, ...props }, ref) => (
    <tbody
      ref={ref}
      className={`divide-y divide-gray-100 dark:divide-gray-700/60 ${className}`}
      {...props}
    >
      {children}
    </tbody>
  ),
);
TBody.displayName = "TBody";

export interface TRProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Highlights the row as selected (accessible in both modes). */
  selected?: boolean;
}

export const TR = forwardRef<HTMLTableRowElement, TRProps>(
  ({ className = "", selected = false, children, ...props }, ref) => (
    <tr
      ref={ref}
      data-selected={selected || undefined}
      className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
        selected ? "bg-violet-50 dark:bg-violet-900/20" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  ),
);
TR.displayName = "TR";

export interface THProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export const TH = forwardRef<HTMLTableCellElement, THProps>(
  ({ className = "", children, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      className={`px-4 py-3 font-medium ${className}`}
      {...props}
    >
      {children}
    </th>
  ),
);
TH.displayName = "TH";

export interface TDProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export const TD = forwardRef<HTMLTableCellElement, TDProps>(
  ({ className = "", children, ...props }, ref) => (
    <td ref={ref} className={`px-4 py-3 ${className}`} {...props}>
      {children}
    </td>
  ),
);
TD.displayName = "TD";

export interface TableEmptyStateProps extends React.HTMLAttributes<HTMLTableCellElement> {
  /** Column count for the colspan. */
  colSpan?: number;
}

export const TableEmptyState = forwardRef<HTMLTableCellElement, TableEmptyStateProps>(
  ({ className = "", colSpan = 1, children, ...props }, ref) => (
    <td
      ref={ref}
      colSpan={colSpan}
      className={`px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400 ${className}`}
      {...props}
    >
      {children}
    </td>
  ),
);
TableEmptyState.displayName = "TableEmptyState";

export default Table;
