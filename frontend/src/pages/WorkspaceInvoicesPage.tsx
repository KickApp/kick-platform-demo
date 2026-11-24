import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
    INVOICE_SOURCE_LABELS,
    INVOICE_SOURCES,
    INVOICE_STATUS_LABELS,
    INVOICE_STATUSES,
} from "@kick-demo/shared";
import { fetchInvoices } from "../api/invoices";
import { CreateInvoiceForm } from "../components/CreateInvoiceForm";
import { InvoiceStatusBadge } from "../components/InvoiceStatusBadge";
import { Pagination } from "../components/Pagination";
import {
    EmptyMessage,
    ErrorMessageBox,
    LoadingMessage,
} from "../components/StatusMessage";
import { formatAmount } from "../lib/format";
import { formatIsoDay, useCustomerNames } from "../lib/invoices";
import { useWorkspaceEntities } from "../lib/use-workspace-entities";
import { useWorkspaceContext } from "../lib/workspace-context";

const PAGE_SIZE = 25;
const ANY = "";

/**
 * The workspace's invoices from every source — created in Kick, imported, or
 * synced from a provider — newest invoice date first, with the form that
 * creates one. Listing them needs a plan with invoicing; Kick's 403 says so
 * otherwise.
 */
export function WorkspaceInvoicesPage() {
    const { workspaceId } = useWorkspaceContext();
    const { entities, entityName } = useWorkspaceEntities(workspaceId);
    const [offset, setOffset] = useState(0);
    const [entityId, setEntityId] = useState(ANY);
    const [status, setStatus] = useState(ANY);
    const [source, setSource] = useState(ANY);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    const selectedStatus = INVOICE_STATUSES.find((value) => value === status);
    const selectedSource = INVOICE_SOURCES.find((value) => value === source);

    const invoicesQuery = useQuery({
        queryKey: [
            "invoices",
            workspaceId,
            entityId,
            status,
            source,
            startDate,
            endDate,
            offset,
        ],
        queryFn: () =>
            fetchInvoices({
                workspaceId,
                ...(entityId !== ANY && { entityIds: [entityId] }),
                ...(selectedStatus !== undefined && { status: selectedStatus }),
                ...(selectedSource !== undefined && {
                    sources: [selectedSource],
                }),
                ...(startDate !== "" && { startDate }),
                ...(endDate !== "" && { endDate }),
                limit: PAGE_SIZE,
                offset,
            }),
    });

    const invoices = invoicesQuery.data?.data ?? [];
    const { customerName } = useCustomerNames({
        workspaceId,
        customerIds: invoices.flatMap((invoice) =>
            invoice.customerId !== null ? [invoice.customerId] : [],
        ),
    });
    const hasFilters =
        entityId !== ANY ||
        status !== ANY ||
        source !== ANY ||
        startDate !== "" ||
        endDate !== "";

    const resetOffset =
        (setter: (value: string) => void) => (value: string) => {
            setter(value);
            setOffset(0);
        };

    return (
        <section>
            <div className="page-header">
                <div>
                    <h3 className="section-title">Invoices</h3>
                    {invoicesQuery.data && (
                        <p className="page-meta">
                            {invoicesQuery.data.pagination.total} invoices,
                            newest first
                        </p>
                    )}
                </div>
                {!isCreating && (
                    <div className="row-actions">
                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => setIsCreating(true)}
                            disabled={entities.length === 0}
                        >
                            Create invoice
                        </button>
                    </div>
                )}
            </div>

            {isCreating && (
                <CreateInvoiceForm
                    workspaceId={workspaceId}
                    entities={entities}
                    onDone={() => setIsCreating(false)}
                />
            )}

            <div className="filter-bar">
                <label className="field-inline">
                    <span className="field-label">Entity</span>
                    <select
                        value={entityId}
                        onChange={(event) =>
                            resetOffset(setEntityId)(event.target.value)
                        }
                    >
                        <option value={ANY}>All entities</option>
                        {entities.map((entity) => (
                            <option key={entity.id} value={entity.id}>
                                {entity.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Status</span>
                    <select
                        value={status}
                        onChange={(event) =>
                            resetOffset(setStatus)(event.target.value)
                        }
                    >
                        <option value={ANY}>Any</option>
                        {INVOICE_STATUSES.map((value) => (
                            <option key={value} value={value}>
                                {INVOICE_STATUS_LABELS[value]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">Source</span>
                    <select
                        value={source}
                        onChange={(event) =>
                            resetOffset(setSource)(event.target.value)
                        }
                    >
                        <option value={ANY}>Any</option>
                        {INVOICE_SOURCES.map((value) => (
                            <option key={value} value={value}>
                                {INVOICE_SOURCE_LABELS[value]}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="field-inline">
                    <span className="field-label">From</span>
                    <input
                        type="date"
                        value={startDate}
                        max={endDate !== "" ? endDate : undefined}
                        onChange={(event) =>
                            resetOffset(setStartDate)(event.target.value)
                        }
                    />
                </label>
                <label className="field-inline">
                    <span className="field-label">To</span>
                    <input
                        type="date"
                        value={endDate}
                        min={startDate !== "" ? startDate : undefined}
                        onChange={(event) =>
                            resetOffset(setEndDate)(event.target.value)
                        }
                    />
                </label>
                {hasFilters && (
                    <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                            setEntityId(ANY);
                            setStatus(ANY);
                            setSource(ANY);
                            setStartDate("");
                            setEndDate("");
                            setOffset(0);
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {invoicesQuery.isPending && <LoadingMessage label="invoices" />}
            {invoicesQuery.error !== null && (
                <ErrorMessageBox error={invoicesQuery.error} />
            )}

            {invoicesQuery.data && invoices.length === 0 && (
                <EmptyMessage>
                    {hasFilters
                        ? "No invoices match these filters."
                        : "No invoices in this workspace yet."}
                </EmptyMessage>
            )}

            {invoices.length > 0 && (
                <div className="card table-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Number</th>
                                <th>Customer</th>
                                <th>Entity</th>
                                <th>Date</th>
                                <th>Due</th>
                                <th>Status</th>
                                <th>Source</th>
                                <th className="amount">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td>
                                        <Link
                                            className="row-link"
                                            to={invoice.id}
                                        >
                                            {invoice.invoiceNumber ??
                                                "Unnumbered"}
                                        </Link>
                                        <span className="cell-meta mono">
                                            {invoice.id}
                                        </span>
                                    </td>
                                    <td>
                                        {invoice.customerId !== null
                                            ? (customerName(
                                                  invoice.customerId,
                                              ) ?? invoice.customerId)
                                            : "—"}
                                    </td>
                                    <td>
                                        {entityName(invoice.entityId) ?? "—"}
                                    </td>
                                    <td>{formatIsoDay(invoice.invoiceDate)}</td>
                                    <td>{formatIsoDay(invoice.dueDate)}</td>
                                    <td>
                                        <InvoiceStatusBadge
                                            status={invoice.status}
                                        />
                                    </td>
                                    <td>
                                        {INVOICE_SOURCE_LABELS[invoice.source]}
                                    </td>
                                    <td className="amount">
                                        {formatAmount(invoice.total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {invoicesQuery.data && (
                <Pagination
                    pagination={invoicesQuery.data.pagination}
                    onOffsetChange={setOffset}
                />
            )}
        </section>
    );
}
