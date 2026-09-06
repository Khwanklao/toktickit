import React from "react";

interface PaginationFooterProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
}

export const PaginationFooter: React.FC<PaginationFooterProps> = ({
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onPageSizeChange,
}) => {
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers array (up to max 5 visible page numbers around current page)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 mt-4 border-top"
      data-testid="pagination-footer"
    >
      {/* Item range indicator */}
      <div className="text-muted small" data-testid="pagination-info">
        Showing <span className="fw-semibold text-dark">{startItem}</span> to{" "}
        <span className="fw-semibold text-dark">{endItem}</span> of{" "}
        <span className="fw-semibold text-dark">{totalItems}</span> tickets
      </div>

      <div className="d-flex flex-wrap align-items-center gap-3">
        {/* Page size dropdown */}
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="page-size-select" className="small text-muted mb-0 me-1">
            Per page:
          </label>
          <select
            id="page-size-select"
            data-testid="page-size-select"
            className="form-select form-select-sm"
            style={{ width: "auto", height: 36 }}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Page navigation controls */}
        <nav aria-label="Ticket list pagination">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
              <button
                className="page-item-btn btn btn-sm btn-outline-secondary me-1"
                data-testid="prev-page-btn"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                aria-label="Previous page"
              >
                Previous
              </button>
            </li>

            {pageNumbers.map((p) => (
              <li key={p} className="page-item">
                <button
                  className={`btn btn-sm me-1 ${
                    p === page ? "btn-success" : "btn-outline-secondary"
                  }`}
                  style={p === page ? { backgroundColor: "#006B3C", borderColor: "#006B3C" } : {}}
                  data-testid={`page-num-btn-${p}`}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </button>
              </li>
            ))}

            <li className={`page-item ${page >= totalPages || totalPages === 0 ? "disabled" : ""}`}>
              <button
                className="page-item-btn btn btn-sm btn-outline-secondary"
                data-testid="next-page-btn"
                disabled={page >= totalPages || totalPages === 0}
                onClick={() => onPageChange(page + 1)}
                aria-label="Next page"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};
