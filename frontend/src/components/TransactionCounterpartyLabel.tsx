import { Link } from "react-router";
import type { PlatformTransaction } from "@kick-demo/shared";

/**
 * Reads the embedded `counterparty` relation, so the listing must be
 * requested with `relations=counterparty`; without it only the id is known.
 */
export function TransactionCounterpartyLabel({
    transaction,
    workspaceId,
}: {
    transaction: PlatformTransaction;
    workspaceId: string;
}) {
    const { counterparty, counterpartyId } = transaction;

    if (counterpartyId === null) {
        return <span className="cell-placeholder">No counterparty</span>;
    }

    return (
        <span>
            <Link
                className="row-link"
                to={`/workspaces/${workspaceId}/counterparties/${counterpartyId}`}
            >
                {counterparty?.name ?? (
                    <span className="mono">{counterpartyId}</span>
                )}
            </Link>
            {counterparty?.companyName && (
                <span className="cell-meta">{counterparty.companyName}</span>
            )}
        </span>
    );
}
