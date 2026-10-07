import { z } from "zod";
import { workspacePlanSchema } from "./workspace.schema";

/**
 * Wire shape of the organization behind the access token. `allowedPlans` is
 * the resolved list of plans the organization may assign to a client
 * workspace — the upstream API never sends the ambiguous "no restrictions"
 * null, so the list is what a plan picker should offer.
 */
export const platformOrganizationSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    allowedPlans: z.array(workspacePlanSchema),
});

export type PlatformOrganization = z.infer<typeof platformOrganizationSchema>;

export const platformOrganizationResponseSchema = z.object({
    organization: platformOrganizationSchema,
});

export type PlatformOrganizationResponse = z.infer<
    typeof platformOrganizationResponseSchema
>;
