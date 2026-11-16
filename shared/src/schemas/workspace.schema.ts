import { z } from "zod";
import {
    platformMetadataSchema,
    platformMetadataWireSchema,
} from "./metadata.schema";
import { platformPaginationSchema } from "./pagination.schema";

/**
 * Every plan the Platform API reads or writes, vendored from the upstream
 * `PLATFORM_ASSIGNABLE_PLANS`. Workspaces on any other plan (Enterprise,
 * FreshBooks) are filtered out upstream, so the wire `plan` never carries
 * one. Which of these the caller's organization can actually assign comes
 * from `GET /platform/v1/organization` (`allowedPlans`); Kick answers 400 for
 * a plan outside that list.
 */
export const WORKSPACE_PLANS = [
    "FREE",
    "BASIC",
    "PLUS",
    "ADVANCED",
    "READ_ONLY",
    "TAX",
] as const;

export const workspacePlanSchema = z.enum(WORKSPACE_PLANS);

export type WorkspacePlan = z.infer<typeof workspacePlanSchema>;

export const WORKSPACE_PLAN_LABELS: Record<WorkspacePlan, string> = {
    FREE: "Free",
    BASIC: "Basic",
    PLUS: "Plus",
    ADVANCED: "Advanced",
    READ_ONLY: "Read-only",
    TAX: "Tax",
};

/**
 * Timezone a workspace resolves accounting calendar days in. Set at create
 * (default `America/Los_Angeles`) and frozen afterwards.
 */
export const WORKSPACE_TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Phoenix",
    "America/Los_Angeles",
    "America/Anchorage",
    "America/Adak",
    "Pacific/Honolulu",
    "America/Puerto_Rico",
    "Pacific/Guam",
    "Pacific/Pago_Pago",
    "UTC",
] as const;

export const workspaceTimezoneSchema = z.enum(WORKSPACE_TIMEZONES);

export type WorkspaceTimezone = z.infer<typeof workspaceTimezoneSchema>;

/**
 * Wire shape of a Platform API workspace, i.e. the JSON the endpoint actually
 * returns rather than the server's internal representation of it.
 * `createdAt` is an ISO-8601 datetime string.
 *
 * Any Kick-internal fields the upstream API may include are deliberately
 * omitted; the BFF's response validation strips unmodeled fields before they
 * reach the browser.
 */
export const platformWorkspaceSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    timezone: workspaceTimezoneSchema,
    plan: workspacePlanSchema,
    metadata: platformMetadataWireSchema,
    createdAt: z.string(),
});

export type PlatformWorkspace = z.infer<typeof platformWorkspaceSchema>;

export const platformWorkspacePathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

export const platformWorkspacesListResponseSchema = z.object({
    data: z.array(platformWorkspaceSchema),
    pagination: platformPaginationSchema,
});

export type PlatformWorkspacesListResponse = z.infer<
    typeof platformWorkspacesListResponseSchema
>;

export const platformWorkspaceResponseSchema = z.object({
    workspace: platformWorkspaceSchema,
});

export type PlatformWorkspaceResponse = z.infer<
    typeof platformWorkspaceResponseSchema
>;

export const createPlatformWorkspaceBodySchema = z
    .object({
        name: z.string().min(1).max(200),
        timezone: workspaceTimezoneSchema.optional(),
        plan: workspacePlanSchema,
    })
    .strict();

export type CreatePlatformWorkspaceBody = z.infer<
    typeof createPlatformWorkspaceBodySchema
>;

/**
 * Changing `plan` requires the organization to own the workspace billing; the
 * new plan takes effect immediately. `metadata` replaces the stored object in
 * full. An empty body answers 400.
 */
export const updatePlatformWorkspaceBodySchema = z
    .object({
        plan: workspacePlanSchema.optional(),
        metadata: platformMetadataSchema.optional(),
    })
    .strict();

export type UpdatePlatformWorkspaceBody = z.infer<
    typeof updatePlatformWorkspaceBodySchema
>;
