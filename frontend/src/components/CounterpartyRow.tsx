import { Link } from "react-router";
import {
    COUNTERPARTY_DIRECTION_OVERRIDE_LABELS,
    COUNTERPARTY_SOURCE_LABELS,
    type PlatformCounterparty,
} from "@kick-demo/shared";

function eligible1099Label(isEligible1099: boolean | null): string {
    if (isEligible1099 === null) {
        return "Undecided";
    }
    return isEligible1099 ? "Yes" : "No";
}

export function CounterpartyRow({
    counterparty,
}: {
    counterparty: PlatformCounterparty;
}) {
    return (
        <tr>
            <td>
                <Link className="row-link" to={counterparty.id}>
                    {counterparty.name}
                </Link>
                <span className="cell-meta mono">{counterparty.id}</span>
            </td>
            <td>{counterparty.companyName ?? "—"}</td>
            <td>
                {counterparty.source !== null
                    ? COUNTERPARTY_SOURCE_LABELS[counterparty.source]
                    : "—"}
            </td>
            <td>
                <span className="badge">
                    {counterparty.isGlobal ? "Global" : "Workspace"}
                </span>
            </td>
            <td>
                {counterparty.directionOverride !== null ? (
                    COUNTERPARTY_DIRECTION_OVERRIDE_LABELS[
                        counterparty.directionOverride
                    ]
                ) : (
                    <span className="cell-placeholder">Inferred</span>
                )}
            </td>
            <td>{eligible1099Label(counterparty.isEligible1099)}</td>
            <td>
                {counterparty.disabledAt !== null ? (
                    <span className="badge badge-danger">Disabled</span>
                ) : (
                    <span className="badge badge-success">Enabled</span>
                )}
            </td>
        </tr>
    );
}
