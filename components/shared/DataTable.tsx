"use client";

import { memo, type ReactNode } from "react";

/**
 * The comparison table the workbench keeps rebuilding.
 *
 * Three screens had copied the same CSS-grid table — the same header cell
 * classes, the same left borders, the same selected-row treatment — and each
 * copy had drifted slightly in column widths and padding. A grid is used
 * instead of `<table>` because these tables size columns to fixed pixel budgets
 * and need a row to be one grid line, not a nested element tree.
 *
 * Column widths stay with the caller: they are a judgement about the data, not
 * something the primitive can guess.
 */

export interface DataTableColumn<Row> {
  key: string;
  header: ReactNode;
  /** A grid track, such as `minmax(200px,1.5fr)` or `96px`. */
  width: string;
  render: (row: Row, index: number) => ReactNode;
  /** Explains the column when the header has to stay short. */
  title?: string;
}

interface DataTableProps<Row> {
  columns: ReadonlyArray<DataTableColumn<Row>>;
  rows: readonly Row[];
  rowKey: (row: Row, index: number) => string;
  /** Marks the row currently open elsewhere on the page. */
  isSelected?: (row: Row, index: number) => boolean;
  /** Smallest width before the table scrolls horizontally instead of squashing. */
  minWidth?: number;
  /** Shown in place of rows, so an empty table is never a blank box. */
  empty?: ReactNode;
  /** Rendered under the last row, for "still loading the rest" notices. */
  footer?: ReactNode;
  caption?: string;
}

function DataTableInner<Row>({
  columns,
  rows,
  rowKey,
  isSelected,
  minWidth,
  empty,
  footer,
  caption,
}: DataTableProps<Row>) {
  const template = { gridTemplateColumns: columns.map((column) => column.width).join(" ") };
  const width = minWidth ?? columns.length * 120;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <div style={{ minWidth: `${width}px` }} role="table" aria-label={caption}>
        <div className="grid bg-upload-zone" style={template} role="row">
          {columns.map((column, index) => (
            <div
              key={column.key}
              role="columnheader"
              title={column.title}
              className={`px-3 py-2 text-xs font-medium text-muted-foreground ${
                index > 0 ? "border-l border-border-subtle" : ""
              }`}
            >
              {column.header}
            </div>
          ))}
        </div>

        {rows.length === 0 && empty ? (
          <div className="border-t border-border-subtle bg-card px-3 py-6">{empty}</div>
        ) : (
          rows.map((row, rowIndex) => (
            <div
              key={rowKey(row, rowIndex)}
              role="row"
              style={template}
              className={`grid border-t border-border-subtle ${
                isSelected?.(row, rowIndex) ? "bg-upload-zone" : "bg-card"
              }`}
            >
              {columns.map((column, index) => (
                <div
                  key={column.key}
                  role="cell"
                  className={`flex min-w-0 items-center px-3 py-3 text-xs text-card-foreground ${
                    index > 0 ? "border-l border-border-subtle" : ""
                  }`}
                >
                  {column.render(row, rowIndex)}
                </div>
              ))}
            </div>
          ))
        )}

        {footer && (
          <div className="border-t border-border-subtle bg-card px-3 py-3">{footer}</div>
        )}
      </div>
    </div>
  );
}

const DataTable = memo(DataTableInner) as typeof DataTableInner;

export default DataTable;
