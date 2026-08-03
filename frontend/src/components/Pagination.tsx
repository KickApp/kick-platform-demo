import type { PlatformPagination } from "@kick-demo/shared";

export function Pagination({
    pagination,
    onOffsetChange,
}: {
    pagination: PlatformPagination;
    onOffsetChange: (offset: number) => void;
}) {
    const { limit, offset, total } = pagination;
    if (total <= limit) {
        return null;
    }
    const from = offset + 1;
    const to = Math.min(offset + limit, total);
    return (
        <div className="pagination">
            <button
                type="button"
                className="button button-secondary"
                disabled={offset === 0}
                onClick={() => onOffsetChange(Math.max(0, offset - limit))}
            >
                Previous
            </button>
            <span className="pagination-info">
                {from}–{to} of {total}
            </span>
            <button
                type="button"
                className="button button-secondary"
                disabled={offset + limit >= total}
                onClick={() => onOffsetChange(offset + limit)}
            >
                Next
            </button>
        </div>
    );
}
