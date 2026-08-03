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

export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}
