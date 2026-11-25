import express from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { config } from "./config";
import {
    forwardUpstreamError,
    kickAuthorizationHeaders,
    UpstreamError,
} from "./kick-client";

/**
 * Relays an invoice PDF from the Platform API's `downloadPdf` at the same
 * path the upstream contract uses. It is a plain Express route rather than a
 * ts-rest one because the ts-rest fetch client decodes any non-JSON body as
 * text, which would corrupt the PDF bytes.
 */
export const invoicePdfRouter = express.Router();

const PDF_CONTENT_TYPE = "application/pdf";

const paramsSchema = z.object({
    workspaceId: z.string().uuid(),
    invoiceId: z.string().uuid(),
});

async function readJsonBody(upstream: globalThis.Response): Promise<unknown> {
    const text = await upstream.text();
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

async function relayInvoicePdf(req: Request, res: Response): Promise<void> {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
        res.status(400).json({
            message: "workspaceId and invoiceId must be uuids",
        });
        return;
    }
    const { workspaceId, invoiceId } = params.data;
    const upstream = await fetch(
        `${config.kickApiBaseUrl}/platform/v1/workspaces/${workspaceId}/invoices/${invoiceId}/pdf`,
        { headers: kickAuthorizationHeaders },
    );
    const contentType = upstream.headers.get("content-type") ?? "";

    if (upstream.status === 200 && contentType.startsWith(PDF_CONTENT_TYPE)) {
        res.set("Content-Type", contentType);
        const disposition = upstream.headers.get("content-disposition");
        if (disposition !== null) {
            res.set("Content-Disposition", disposition);
        }
        res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
        return;
    }

    const body = await readJsonBody(upstream);
    if (upstream.status === 200) {
        throw new UpstreamError(upstream.status, body);
    }
    const forwarded = forwardUpstreamError({ status: upstream.status, body });
    res.status(forwarded.status).json(forwarded.body);
}

invoicePdfRouter.get(
    "/platform/v1/workspaces/:workspaceId/invoices/:invoiceId/pdf",
    (req: Request, res: Response, next: NextFunction): void => {
        relayInvoicePdf(req, res).catch(next);
    },
);
