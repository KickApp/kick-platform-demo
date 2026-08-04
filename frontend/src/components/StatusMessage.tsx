export function LoadingMessage({ label }: { label: string }) {
    return <div className="status status-loading">Loading {label}…</div>;
}

export function ErrorMessageBox({ error }: { error: Error }) {
    return (
        <div className="status status-error" role="alert">
            {error.message}
        </div>
    );
}

export function EmptyMessage({ children }: { children: React.ReactNode }) {
    return <div className="status status-empty">{children}</div>;
}
