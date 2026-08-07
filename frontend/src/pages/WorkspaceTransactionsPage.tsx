import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    TRANSACTION_STATUS_LABELS,
    TRANSACTION_TYPE_LABELS,
} from "@kick-demo/shared";
import { fetchTransactions } from "../api/platform";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatAmount } from "../lib/format";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;

export function WorkspaceTransactionsPage() {
    const { workspaceId } = useWorkspaceContext();
    const { entityName } = useWorkspaceEntities(workspaceId);
    const [offset, setOffset] = useState(0);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const transactionsQuery = useQuery({
        queryKey: ["transactions", workspaceId, startDate, endDate, offset],
        queryFn: () =>
            fetchTransactions({
                workspaceId,
                startDate: startDate !== "" ? startDate : undefined,
                endDate: endDate !== "" ? endDate : undefined,
                limit: PAGE_SIZE,
                offset,
            }),
    });

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Transactions</h3>
                    {transactionsQuery.data && (
                        <p className="page-meta">
                            {transactionsQuery.data.pagination.total} total
                            across every entity of the workspace
                        </p>
                    )}
                </div>
            </div>

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">From</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                            setStartDate(event.target.value);
                            setOffset(0);
                        }}
                    />
                </label>
                <label className="field-inline">
                    <span className="field-label">To</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(event) => {
                            setEndDate(event.target.value);
                            setOffset(0);
                        }}
                    />
                </label>
                {(startDate !== "" || endDate !== "") && (
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                            setStartDate("");
                            setEndDate("");
                            setOffset(0);
                        }}
                    >
                        Clear dates
                    </button>
                )}
            </div>

            {transactionsQuery.isPending && (
                <LoadingMessage label="transactions" />
            )}
            {transactionsQuery.error !== null && (
                <ErrorMessageBox error={transactionsQuery.error} />
            )}

            {transactionsQuery.data &&
                transactionsQuery.data.data.length === 0 && (
                    <EmptyMessage>
                        No transactions in this workspace for the selected
                        period.
                    </EmptyMessage>
                )}

            {transactionsQuery.data &&
                transactionsQuery.data.data.length > 0 && (
                    <div className="card table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Entity</th>
                                    <th className="amount">Amount</th>
                                    <th>Source</th>
                                    <th>Status</th>
                                    <th>Books</th>
                                    <th>Memo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactionsQuery.data.data.map(
                                    (transaction) => (
                                        <tr key={transaction.id}>
                                            <td>{transaction.date}</td>
                                            <td>
                                                {transaction.bankDescription}
                                            </td>
                                            <td>
                                                {entityName(
                                                    transaction.entityId,
                                                ) ?? (
                                                    <span className="mono">
                                                        {transaction.entityId}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="amount">
                                                {formatAmount(
                                                    transaction.amount,
                                                )}
                                            </td>
                                            <td>
                                                {
                                                    TRANSACTION_TYPE_LABELS[
                                                        transaction.type
                                                    ]
                                                }
                                            </td>
                                            <td>
                                                {
                                                    TRANSACTION_STATUS_LABELS[
                                                        transaction.status
                                                    ]
                                                }
                                            </td>
                                            <td>
                                                <span className="badge">
                                                    {transaction.isBusiness
                                                        ? "Business"
                                                        : "Personal"}
                                                </span>
                                            </td>
                                            <td>{transaction.memo ?? "—"}</td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

            {transactionsQuery.data && (
                <Pagination
                    pagination={transactionsQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
