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

export function formatDate(isoDatetime: string): string {
    const date = new Date(isoDatetime);
    if (Number.isNaN(date.getTime())) {
        return isoDatetime;
    }
    return date.toLocaleDateString(undefined, { dateStyle: "medium" });
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

/** January 1st of this year, the start of the default reporting period. */
export function currentYearStartIsoDate(): string {
    return `${new Date().getFullYear()}-01-01`;
}

export function todayIsoDate(): string {
    const today = new Date();
    const month = `${today.getMonth() + 1}`.padStart(2, "0");
    const day = `${today.getDate()}`.padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
}
