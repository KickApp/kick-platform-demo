import { useQuery } from "@tanstack/react-query";
import {
    PLATFORM_PAGE_LIMIT_MAX,
    TRANSACTION_STATUS_LABELS,
} from "@kick-demo/shared";
import { fetchTransactions } from "../api/platform";
import { formatAmount } from "../lib/format";
import { EmptyMessage, ErrorMessageBox, LoadingMessage } from "./StatusMessage";

/**
 * Reads the transactions a task covers through the transactions listing's
 * `ids` filter, which takes at most 100 ids per request.
 */
export function TaskTransactions({
    workspaceId,
    transactionIds,
    entityName,
}: {
    workspaceId: string;
    transactionIds: string[];
    entityName: (entityId: string) => string | null;
}) {
    const requestedIds = transactionIds.slice(0, PLATFORM_PAGE_LIMIT_MAX);

    const transactionsQuery = useQuery({
        queryKey: ["transactions", workspaceId, "ids", requestedIds],
        queryFn: () =>
            fetchTransactions({
                workspaceId,
                ids: requestedIds,
                limit: PLATFORM_PAGE_LIMIT_MAX,
                offset: 0,
            }),
        enabled: requestedIds.length > 0,
    });

    // A Kick deployment that predates the `ids` filter ignores it and answers
    // with the first page of every transaction, so keep only the asked-for ones.
    const requested = new Set(requestedIds);
    const transactions = (transactionsQuery.data?.data ?? []).filter(
        (transaction) => requested.has(transaction.id),
    );

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Transactions</h3>
                    <p className="page-meta">
                        {transactionIds.length} referenced by this task
                        {transactionIds.length > requestedIds.length &&
                            `, showing the first ${requestedIds.length}`}
                    </p>
                </div>
            </div>

            {transactionIds.length === 0 && (
                <EmptyMessage>
                    This task selects its transactions by other criteria, or
                    none of them remain.
                </EmptyMessage>
            )}
            {transactionsQuery.isLoading && (
                <LoadingMessage label="transactions" />
            )}
            {transactionsQuery.error !== null && (
                <ErrorMessageBox error={transactionsQuery.error} />
            )}

            {transactions.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Entity</th>
                                <th className="amount">Amount</th>
                                <th>Status</th>
                                <th>Memo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((transaction) => (
                                <tr key={transaction.id}>
                                    <td>{transaction.date}</td>
                                    <td>{transaction.bankDescription}</td>
                                    <td>
                                        {entityName(transaction.entityId) ?? (
                                            <span className="mono">
                                                {transaction.entityId}
                                            </span>
                                        )}
                                    </td>
                                    <td className="amount">
                                        {formatAmount(transaction.amount)}
                                    </td>
                                    <td>
                                        {
                                            TRANSACTION_STATUS_LABELS[
                                                transaction.status
                                            ]
                                        }
                                    </td>
                                    <td>{transaction.memo ?? "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
