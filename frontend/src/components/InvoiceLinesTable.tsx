import type { PlatformAccount, PlatformInvoice } from "@kick-demo/shared";
import { formatAmount } from "../lib/format";
import { formatAccountLabel } from "../lib/use-entity-accounts";

function TotalRow({ label, amount }: { label: string; amount: number }) {
    return (
        <tr className="report-total-row">
            <td colSpan={5}>{label}</td>
            <td className="amount">{formatAmount(amount)}</td>
        </tr>
    );
}

/**
 * The invoice's item lines and totals. Tax, discount and deposit aren't lines
 * of their own: each line shows its share, which is 0 when the invoice keeps
 * them only on the invoice, as provider-synced invoices do.
 */
export function InvoiceLinesTable({
    invoice,
    accounts,
}: {
    invoice: PlatformInvoice;
    accounts: PlatformAccount[];
}) {
    const accountLabel = (accountId: string | null) => {
        if (accountId === null) {
            return "Entity default";
        }
        const account = accounts.find(
            (candidate) => candidate.id === accountId,
        );
        return account !== undefined ? formatAccountLabel(account) : accountId;
    };

    return (
        <div className="card table-card">
            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Revenue account</th>
                        <th className="amount">Quantity</th>
                        <th className="amount">Unit amount</th>
                        <th className="amount">Tax</th>
                        <th className="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.lines.map((line) => (
                        <tr key={line.id}>
                            <td>
                                {line.productOrService ??
                                    line.description ??
                                    "—"}
                                {line.productOrService !== null &&
                                    line.description !== null && (
                                        <span className="cell-meta">
                                            {line.description}
                                        </span>
                                    )}
                            </td>
                            <td>{accountLabel(line.revenueAccountId)}</td>
                            <td className="amount">{line.quantity ?? "—"}</td>
                            <td className="amount">
                                {line.unitAmount !== null
                                    ? formatAmount(line.unitAmount)
                                    : "—"}
                            </td>
                            <td className="amount">{formatAmount(line.tax)}</td>
                            <td className="amount">
                                {formatAmount(line.amount)}
                            </td>
                        </tr>
                    ))}
                    <TotalRow label="Subtotal" amount={invoice.subtotal} />
                    {invoice.tax !== 0 && (
                        <TotalRow label="Tax" amount={invoice.tax} />
                    )}
                    {invoice.discount !== 0 && (
                        <TotalRow label="Discount" amount={-invoice.discount} />
                    )}
                    {invoice.deposit !== 0 && (
                        <TotalRow label="Deposit" amount={-invoice.deposit} />
                    )}
                    <TotalRow label="Total" amount={invoice.total} />
                </tbody>
            </table>
        </div>
    );
}
