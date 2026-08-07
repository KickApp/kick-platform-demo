export function formatDateTime(isoDatetime: string): string {
    const date = new Date(isoDatetime);
    if (Number.isNaN(date.getTime())) {
        return isoDatetime;
    }
    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export function formatAmount(amount: number): string {
    return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

/** January 1st of last year, the default start date for new books. */
export function previousYearStartIsoDate(): string {
    return `${new Date().getFullYear() - 1}-01-01`;
}
