import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "react-router";
import { COUNTERPARTY_SOURCE_LABELS } from "@kick-demo/shared";
import { fetchCounterparty } from "../api/platform";
import { CounterpartyDeleteActions } from "../components/CounterpartyDeleteActions";
import { CounterpartyForm } from "../components/CounterpartyForm";
import { CounterpartyStatusToggle } from "../components/CounterpartyStatusToggle";
import { MergeCounterpartyForm } from "../components/MergeCounterpartyForm";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import {
    COUNTERPARTY_NOTICE_MESSAGES,
    counterpartyNoticeStateSchema,
} from "../lib/counterparty-notice";
import { formatDateTime } from "../lib/format";
import { useWorkspaceContext } from "../lib/workspace-context";

function SummaryItem({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="summary-item">
            <span className="summary-label">{label}</span>
            <span className="summary-value summary-value-text">{children}</span>
        </div>
    );
}

/**
 * One counterparty through the Platform API's `get`, which reads disabled
 * counterparties too, with every write the API allows on it: edit, disable or
 * enable, delete (or remove a global one from the workspace), and merge.
 */
export function WorkspaceCounterpartyPage() {
    const { workspaceId } = useWorkspaceContext();
    const { counterpartyId } = useParams();
    const [isMerging, setIsMerging] = useState(false);
    const notice = counterpartyNoticeStateSchema.safeParse(useLocation().state);

    const counterpartyQuery = useQuery({
        queryKey: ["counterparty", workspaceId, counterpartyId],
        queryFn: () =>
            fetchCounterparty({
                workspaceId,
                counterpartyId: counterpartyId ?? "",
            }),
        enabled: counterpartyId !== undefined,
    });

    if (counterpartyId === undefined) {
        return <EmptyMessage>Counterparty not specified.</EmptyMessage>;
    }

    const counterparty = counterpartyQuery.data;

    return (
        <section>
            <Link to=".." relative="path" className="back-link">
                ← All counterparties
            </Link>

            {counterpartyQuery.isPending && (
                <LoadingMessage label="counterparty" />
            )}
            {counterpartyQuery.error !== null && (
                <ErrorMessageBox error={counterpartyQuery.error} />
            )}

            {counterparty && (
                <>
                    <div className="page-header">
                        <div>
                            <h3 className="section-title">
                                {counterparty.name}
                            </h3>
                            <p className="page-meta mono">{counterparty.id}</p>
                        </div>
                        <div className="row-actions">
                            {!counterparty.isGlobal && (
                                <CounterpartyStatusToggle
                                    workspaceId={workspaceId}
                                    counterparty={counterparty}
                                />
                            )}
                            {!isMerging && (
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() => setIsMerging(true)}
                                >
                                    Merge…
                                </button>
                            )}
                            <CounterpartyDeleteActions
                                workspaceId={workspaceId}
                                counterparty={counterparty}
                            />
                        </div>
                    </div>

                    {notice.success && (
                        <div className="status status-info">
                            {
                                COUNTERPARTY_NOTICE_MESSAGES[
                                    notice.data.counterpartyNotice
                                ]
                            }
                        </div>
                    )}

                    <div className="card summary-card">
                        <SummaryItem label="Owner">
                            {counterparty.isGlobal
                                ? "Global Kick directory"
                                : "This workspace"}
                        </SummaryItem>
                        <SummaryItem label="Source">
                            {counterparty.source !== null
                                ? COUNTERPARTY_SOURCE_LABELS[
                                      counterparty.source
                                  ]
                                : "—"}
                        </SummaryItem>
                        <SummaryItem label="Status">
                            {counterparty.disabledAt !== null
                                ? `Disabled ${formatDateTime(counterparty.disabledAt)}`
                                : "Enabled"}
                        </SummaryItem>
                        <SummaryItem label="Created">
                            {formatDateTime(counterparty.createdAt)}
                        </SummaryItem>
                        <SummaryItem label="Updated">
                            {formatDateTime(counterparty.updatedAt)}
                        </SummaryItem>
                    </div>

                    {isMerging && (
                        <MergeCounterpartyForm
                            workspaceId={workspaceId}
                            counterparty={counterparty}
                            onDone={() => setIsMerging(false)}
                        />
                    )}

                    {counterparty.isGlobal && (
                        <div className="status status-info">
                            This is a shared Kick directory entry, so the
                            Platform API doesn&apos;t let partners edit, disable
                            or enable it. It can still be merged, or removed
                            from this workspace.
                        </div>
                    )}

                    <CounterpartyForm
                        key={counterparty.updatedAt}
                        workspaceId={workspaceId}
                        counterparty={counterparty}
                    />
                </>
            )}
        </section>
    );
}
