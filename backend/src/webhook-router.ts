import type { IncomingHttpHeaders } from "node:http";
import express from "express";
import { Webhook } from "svix";
import { identifyKickWebhookEvent } from "@kick-demo/shared";
import { config } from "./config";

/**
 * Receiver for the webhooks Kick delivers to a Platform partner. It logs every
 * delivery and does nothing else: no persistence, no refetching of the affected
 * resource. The point is to show what arrives on the wire.
 *
 * Kick delivers through Svix, so this is a plain Express route rather than a
 * ts-rest one — the signature covers the raw request bytes, and validating the
 * body against a contract would reject any event Kick adds later instead of
 * logging it.
 */
export const kickWebhookRouter = express.Router();

const MAX_LOGGED_BODY_LENGTH = 2000;

function toHeaderMap(headers: IncomingHttpHeaders): Record<string, string> {
    const entries = Object.entries(headers).flatMap(([name, value]) =>
        typeof value === "string" ? [[name, value] as const] : [],
    );
    return Object.fromEntries(entries);
}

/**
 * Svix names the id and timestamp headers `svix-*` on the free tier and
 * `webhook-*` on the paid ones, so read both.
 */
function readHeader(
    headers: Record<string, string>,
    name: string,
): string | undefined {
    return headers[`svix-${name}`] ?? headers[`webhook-${name}`];
}

function describeTimestamp(timestamp: string | undefined): string {
    if (timestamp === undefined) {
        return "unknown";
    }
    const seconds = Number(timestamp);
    if (!Number.isFinite(seconds)) {
        return timestamp;
    }
    return new Date(seconds * 1000).toISOString();
}

function parseJsonBody(
    rawBody: string,
): { parsed: true; payload: unknown } | { parsed: false } {
    try {
        return { parsed: true, payload: JSON.parse(rawBody) };
    } catch {
        return { parsed: false };
    }
}

function logDelivery({
    headers,
    payload,
    signature,
}: {
    headers: Record<string, string>;
    payload: unknown;
    signature: "verified" | "unverified";
}): void {
    const eventName = identifyKickWebhookEvent(payload);
    console.log(
        `[webhook] ${eventName ?? "unrecognized payload"} ` +
            `id=${readHeader(headers, "id") ?? "unknown"} ` +
            `timestamp=${describeTimestamp(readHeader(headers, "timestamp"))} ` +
            `signature=${signature}`,
    );
    console.log(JSON.stringify(payload, null, 2));
    if (eventName === null) {
        console.warn(
            "[webhook] This payload matches no event shape this demo knows. " +
                "Kick may have added an event; see shared/src/schemas/webhook-event.schema.ts.",
        );
    }
}

kickWebhookRouter.post(
    "/kick",
    express.raw({ type: "*/*" }),
    (req, res): void => {
        const rawBody = Buffer.isBuffer(req.body)
            ? req.body.toString("utf8")
            : "";
        const headers = toHeaderMap(req.headers);
        const secret = config.kickWebhookSigningSecret;

        if (secret !== undefined) {
            try {
                logDelivery({
                    headers,
                    payload: new Webhook(secret).verify(rawBody, headers),
                    signature: "verified",
                });
                res.status(200).json({ status: "received" });
            } catch (error) {
                console.warn(
                    "[webhook] Rejected a delivery whose signature did not verify:",
                    error instanceof Error ? error.message : error,
                );
                res.status(400).json({ message: "Invalid webhook signature" });
            }
            return;
        }

        const body = parseJsonBody(rawBody);
        if (!body.parsed) {
            // Answering 200 anyway: nothing here acts on the payload, and a
            // non-2xx would only make Svix retry a body it cannot fix.
            console.warn(
                "[webhook] Received a body that is not JSON:",
                rawBody.slice(0, MAX_LOGGED_BODY_LENGTH),
            );
            res.status(200).json({ status: "received" });
            return;
        }

        logDelivery({
            headers,
            payload: body.payload,
            signature: "unverified",
        });
        res.status(200).json({ status: "received" });
    },
);
