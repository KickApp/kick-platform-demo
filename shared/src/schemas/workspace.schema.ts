import { z } from "zod";
import { platformPaginationSchema } from "./pagination.schema";

/**
 * Every plan a workspace can read back. Vendored from the upstream
 * `FLAT_RATE_PLANS` enum; a plan Kick adds upstream fails the BFF's response
 * validation until it is copied here.
 */
export const WORKSPACE_PLANS = [
    "FREE",
    "BASIC",
    "PLUS",
    "ENTERPRISE",
    "FRESHBOOKS",
    "READ_ONLY",
] as const;

export const workspacePlanSchema = z.enum(WORKSPACE_PLANS);

export type WorkspacePlan = z.infer<typeof workspacePlanSchema>;

/**
 * The subset of plans an organization may assign to a client workspace on
 * create/update. Which of these the caller's organization can actually use
 * comes from `GET /platform/v1/organization` (`allowedPlans`); Kick answers
 * 400 for a plan outside that list.
 */
export const WORKSPACE_ASSIGNABLE_PLANS = [
    "FREE",
    "BASIC",
    "PLUS",
    "READ_ONLY",
] as const;

export const workspaceAssignablePlanSchema = z.enum(WORKSPACE_ASSIGNABLE_PLANS);

export type WorkspaceAssignablePlan = z.infer<
    typeof workspaceAssignablePlanSchema
>;

export const WORKSPACE_PLAN_LABELS: Record<WorkspacePlan, string> = {
    FREE: "Free",
    BASIC: "Basic",
    PLUS: "Plus",
    ENTERPRISE: "Advanced",
    FRESHBOOKS: "FreshBooks",
    READ_ONLY: "Read-only",
};

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
    plan: workspacePlanSchema,
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

export const createPlatformWorkspaceBodySchema = z.object({
    name: z.string().min(1).max(200),
    plan: workspaceAssignablePlanSchema,
});

export type CreatePlatformWorkspaceBody = z.infer<
    typeof createPlatformWorkspaceBodySchema
>;

/**
 * Changing `plan` requires the organization to own the workspace billing; the
 * new plan takes effect immediately.
 */
export const updatePlatformWorkspaceBodySchema = z.object({
    plan: workspaceAssignablePlanSchema,
});

export type UpdatePlatformWorkspaceBody = z.infer<
    typeof updatePlatformWorkspaceBodySchema
>;
