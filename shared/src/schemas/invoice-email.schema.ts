import { z } from "zod";
import { platformInvoiceSchema } from "./invoice.schema";

export const INVOICE_EMAIL_MAX_RECIPIENTS = 50;
export const INVOICE_EMAIL_SUBJECT_MAX_LENGTH = 255;
export const INVOICE_EMAIL_MESSAGE_MAX_LENGTH = 5000;

/**
 * Delivery status of the queued email when `send` returned; `pending` means
 * it goes out shortly. Grows with Kick's outbound email checks.
 */
export const INVOICE_EMAIL_STATUSES = [
    "pending",
    "sent",
    "blocked",
    "rate_limited",
    "failed",
] as const;

export const invoiceEmailStatusSchema = z.enum(INVOICE_EMAIL_STATUSES);

export type InvoiceEmailStatus = z.infer<typeof invoiceEmailStatusSchema>;

export const INVOICE_EMAIL_STATUS_LABELS: Record<InvoiceEmailStatus, string> =
    {
        pending: "queued",
        sent: "sent",
        blocked: "blocked",
        rate_limited: "rate limited",
        failed: "failed",
    };

const recipientsSchema = z
    .array(z.string().trim().email())
    .max(INVOICE_EMAIL_MAX_RECIPIENTS);

/**
 * Every field is optional and falls back to what Kick saved on the invoice;
 * the fields sent are remembered. Those saved defaults are not on the
 * invoice wire shape. After the fallback, no recipient or no subject answers
 * 400. `replyTo: null` clears the saved one.
 */
export const platformInvoiceSendBodySchema = z
    .object({
        to: recipientsSchema.min(1).optional(),
        cc: recipientsSchema.optional(),
        bcc: recipientsSchema.optional(),
        replyTo: z.string().trim().email().nullable().optional(),
        subject: z
            .string()
            .trim()
            .min(1)
            .max(INVOICE_EMAIL_SUBJECT_MAX_LENGTH)
            .optional(),
        message: z.string().max(INVOICE_EMAIL_MESSAGE_MAX_LENGTH).optional(),
        attachPdf: z.boolean().optional(),
    })
    .strict();

export type PlatformInvoiceSendBody = z.infer<
    typeof platformInvoiceSendBodySchema
>;

export const platformInvoiceEmailSchema = z.object({
    id: z.string().uuid(),
    status: invoiceEmailStatusSchema,
    createdAt: z.string(),
});

export type PlatformInvoiceEmail = z.infer<typeof platformInvoiceEmailSchema>;

/**
 * A draft becomes `open` only once its email actually goes out, so a draft
 * sent with a `pending` email still comes back as a `draft` here.
 */
export const platformInvoiceSendResponseSchema = z.object({
    invoice: platformInvoiceSchema,
    email: platformInvoiceEmailSchema,
});

export type PlatformInvoiceSendResponse = z.infer<
    typeof platformInvoiceSendResponseSchema
>;
