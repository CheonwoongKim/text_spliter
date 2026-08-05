interface PaginationProps {
  page: number;
  total: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  total,
  rowsPerPage,
  onPageChange,
}: PaginationProps) {
  const startIndex = page * rowsPerPage + 1;
  const endIndex = Math.min((page + 1) * rowsPerPage, total);
  const hasPrevious = page > 0;
  const hasNext = (page + 1) * rowsPerPage < total;

  if (total <= rowsPerPage) {
    return null;
  }

  return (
    <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-card">
      <p className="text-sm text-muted-foreground">
        Showing {startIndex} to {endIndex} of {total} results
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={!hasPrevious}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
        >
          Next
        </button>
      </div>
    </div>
  );
}
