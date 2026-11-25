import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    INVOICE_EMAIL_MAX_RECIPIENTS,
    INVOICE_EMAIL_MESSAGE_MAX_LENGTH,
    INVOICE_EMAIL_STATUS_LABELS,
    INVOICE_EMAIL_SUBJECT_MAX_LENGTH,
    type PlatformInvoice,
    type PlatformInvoiceSendBody,
    type PlatformInvoiceEmail,
} from "@kick-demo/shared";
import { fetchInvoice, sendInvoice } from "../api/invoices";
import { fetchCounterparty } from "../api/platform";
import { invalidateInvoiceQueries } from "../lib/invoices";
import { ErrorMessageBox } from "./StatusMessage";

function parseRecipients(value: string): string[] {
    return value
        .split(/[,;\s]+/)
        .map((recipient) => recipient.trim())
        .filter((recipient) => recipient !== "");
}

const ISSUE_POLL_INTERVAL_MS = 2000;

function sentNotice({
    email,
    isAwaitingIssue,
}: {
    email: PlatformInvoiceEmail;
    isAwaitingIssue: boolean;
}): string {
    const status = INVOICE_EMAIL_STATUS_LABELS[email.status];
    return isAwaitingIssue
        ? `Email ${status}. The invoice is issued once it goes out.`
        : `Email ${status}.`;
}

/**
 * Emails a `manual` draft or open invoice through the Platform API's `send`.
 * Kick's saved email defaults aren't on the wire, so "To" starts from the
 * customer's email and the subject from the invoice number; any field left
 * blank is omitted and falls back to what Kick saved. A draft is issued by
 * its first email, which posts its journal entries.
 */
export function SendInvoiceEmailForm({
    workspaceId,
    invoice,
}: {
    workspaceId: string;
    invoice: PlatformInvoice;
}) {
    const queryClient = useQueryClient();
    const customerId = invoice.customerId;
    const customerQuery = useQuery({
        queryKey: ["counterparty", workspaceId, customerId],
        queryFn: () =>
            fetchCounterparty({
                workspaceId,
                counterpartyId: customerId ?? "",
            }),
        enabled: customerId !== null,
        retry: false,
    });
    const [editedTo, setEditedTo] = useState<string | null>(null);
    const to = editedTo ?? customerQuery.data?.email ?? "";
    const [cc, setCc] = useState("");
    const [bcc, setBcc] = useState("");
    const [replyTo, setReplyTo] = useState("");
    const [subject, setSubject] = useState(
        invoice.invoiceNumber !== null
            ? `Invoice ${invoice.invoiceNumber}`
            : "",
    );
    const [message, setMessage] = useState("");
    const [attachPdf, setAttachPdf] = useState(true);
    const isDraft = invoice.status === "draft";

    const toRecipients = parseRecipients(to);
    const ccRecipients = parseRecipients(cc);
    const bccRecipients = parseRecipients(bcc);
    const body: PlatformInvoiceSendBody = {
        ...(toRecipients.length > 0 && { to: toRecipients }),
        ...(ccRecipients.length > 0 && { cc: ccRecipients }),
        ...(bccRecipients.length > 0 && { bcc: bccRecipients }),
        ...(replyTo.trim() !== "" && { replyTo: replyTo.trim() }),
        ...(subject.trim() !== "" && { subject: subject.trim() }),
        ...(message.trim() !== "" && { message }),
        attachPdf,
    };

    const mutation = useMutation({
        mutationFn: () =>
            sendInvoice({ workspaceId, invoiceId: invoice.id, body }),
        onSuccess: async (response) => {
            queryClient.setQueryData(
                ["invoice", workspaceId, response.invoice.id],
                response.invoice,
            );
            await invalidateInvoiceQueries({
                queryClient,
                workspaceId,
                invoice: response.invoice,
            });
        },
    });

    // Kick issues a sent draft only once its queued email goes out, so the
    // page's invoice query is polled until the draft turns open.
    const isAwaitingIssue =
        isDraft &&
        mutation.data?.invoice.status === "draft" &&
        mutation.data.email.status === "pending";
    useQuery({
        queryKey: ["invoice", workspaceId, invoice.id],
        queryFn: async () => {
            const latest = await fetchInvoice({
                workspaceId,
                invoiceId: invoice.id,
            });
            if (latest.status !== "draft") {
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: ["invoices", workspaceId],
                    }),
                    queryClient.invalidateQueries({
                        queryKey: ["journal-entries", latest.entityId],
                    }),
                    queryClient.invalidateQueries({ queryKey: ["report"] }),
                ]);
            }
            return latest;
        },
        enabled: isAwaitingIssue,
        refetchInterval: ISSUE_POLL_INTERVAL_MS,
    });

    const recipientHint = `Comma-separated, at most ${INVOICE_EMAIL_MAX_RECIPIENTS}.`;

    return (
        <form
            className="card form-card"
            onSubmit={(event) => {
                event.preventDefault();
                if (
                    isDraft &&
                    !window.confirm(
                        "Sending a draft issues it and posts its journal entries. Send it?",
                    )
                ) {
                    return;
                }
                mutation.mutate();
            }}
        >
            <h4 className="form-title">Send by email</h4>
            <label className="field">
                <span className="field-label">To</span>
                <input
                    type="text"
                    value={to}
                    onChange={(event) => setEditedTo(event.target.value)}
                />
                <span className="field-hint">
                    {recipientHint} Blank uses the recipients Kick saved.
                </span>
            </label>
            <label className="field">
                <span className="field-label">Cc</span>
                <input
                    type="text"
                    value={cc}
                    onChange={(event) => setCc(event.target.value)}
                />
            </label>
            <label className="field">
                <span className="field-label">Bcc</span>
                <input
                    type="text"
                    value={bcc}
                    onChange={(event) => setBcc(event.target.value)}
                />
            </label>
            <label className="field">
                <span className="field-label">Reply-to</span>
                <input
                    type="email"
                    value={replyTo}
                    onChange={(event) => setReplyTo(event.target.value)}
                />
            </label>
            <label className="field">
                <span className="field-label">Subject</span>
                <input
                    type="text"
                    value={subject}
                    maxLength={INVOICE_EMAIL_SUBJECT_MAX_LENGTH}
                    onChange={(event) => setSubject(event.target.value)}
                />
            </label>
            <label className="field">
                <span className="field-label">Message</span>
                <textarea
                    rows={4}
                    value={message}
                    maxLength={INVOICE_EMAIL_MESSAGE_MAX_LENGTH}
                    onChange={(event) => setMessage(event.target.value)}
                />
            </label>
            <label className="field-checkbox">
                <input
                    type="checkbox"
                    checked={attachPdf}
                    onChange={(event) => setAttachPdf(event.target.checked)}
                />
                Attach the invoice PDF
            </label>
            <p className="field-hint">
                Kick picks the sender, and remembers the fields sent for the
                next email.
            </p>
            {mutation.error !== null && (
                <ErrorMessageBox error={mutation.error} />
            )}
            {mutation.data !== undefined && (
                <div className="status status-info">
                    {sentNotice({
                        email: mutation.data.email,
                        isAwaitingIssue,
                    })}
                </div>
            )}
            <div className="form-actions">
                <button
                    type="submit"
                    className="button button-primary"
                    disabled={mutation.isPending}
                >
                    {mutation.isPending
                        ? "Sending…"
                        : isDraft
                          ? "Send and issue"
                          : "Send again"}
                </button>
            </div>
        </form>
    );
}
