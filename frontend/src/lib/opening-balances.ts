import { useQueryClient } from "@tanstack/react-query";
import { isNonzeroInCents } from "@kick-demo/shared";

/** The default main opening balance date: the day before the bookkeeping start. */
export function dayBeforeIsoDate(isoDate: string): string {
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        return isoDate;
    }
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

/**
 * Kick refuses an amount that rounds to zero cents, so a form treats one as
 * not entered yet rather than letting the request fail.
 */
export function parseNonzeroAmount(text: string): number | null {
    if (text.trim() === "") {
        return null;
    }
    const amount = Number(text);
    return Number.isFinite(amount) && isNonzeroInCents(amount) ? amount : null;
}

export function sumInCents(amounts: number[]): number {
    const cents = amounts.reduce(
        (total, amount) => total + Math.round(amount * 100),
        0,
    );
    return cents / 100;
}

/**
 * An opening balance books journal entries, so a write moves the balance
 * sheet and trial balance as well as the listing.
 */
export function useInvalidateOpeningBalances(entityId: string) {
    const queryClient = useQueryClient();
    return async () => {
        await Promise.all([
            queryClient.invalidateQueries({
                queryKey: ["opening-balances", entityId],
            }),
            queryClient.invalidateQueries({ queryKey: ["report"] }),
        ]);
    };
}
