import { z } from "zod";

/**
 * Handed from the create form to the counterparty page through router state,
 * so the page can say when Kick reused a counterparty instead of creating one.
 */
export const counterpartyNoticeStateSchema = z.object({
    counterpartyNotice: z.enum(["created", "reused_global", "reused_existing"]),
});

export type CounterpartyNotice = z.infer<
    typeof counterpartyNoticeStateSchema
>["counterpartyNotice"];

export const COUNTERPARTY_NOTICE_MESSAGES: Record<CounterpartyNotice, string> =
    {
        created: "Counterparty created.",
        reused_global:
            "A global Kick directory entry matched every field you entered, so the workspace now uses it instead of a new counterparty.",
        reused_existing:
            "Kick had already detected a counterparty with this name from transactions. It was verified and updated with what you entered.",
    };
