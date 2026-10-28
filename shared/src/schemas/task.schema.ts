import { z } from "zod";
import { platformEntitySchema } from "./entity.schema";
import {
    platformPaginationQuerySchema,
    platformPaginationSchema,
} from "./pagination.schema";
import {
    arrayQueryParamSchema,
    uuidArrayQueryParamSchema,
} from "./query.schema";

export const TASK_STATUSES = [
    "todo",
    "in_progress",
    "blocked",
    "done",
    "cancelled",
] as const;

export const taskStatusSchema = z.enum(TASK_STATUSES);

export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    todo: "To do",
    in_progress: "In progress",
    blocked: "Blocked",
    done: "Done",
    cancelled: "Cancelled",
};

export const TASK_PRIORITIES = ["urgent", "high", "medium", "low"] as const;

export const taskPrioritySchema = z.enum(TASK_PRIORITIES);

export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
    urgent: "Urgent",
    high: "High",
    medium: "Medium",
    low: "Low",
};

/**
 * What a task is about. Kick adds types regularly, and a type missing here
 * fails the BFF's response validation until it is copied over.
 */
export const TASK_TYPES = [
    "file",
    "transaction",
    "transactions",
    "question",
    "invite_accountant",
    "receipt_phone_number",
    "connection_broken",
    "plaid_new_accounts_available",
    "plaid_statements_refresh",
    "map_chart_of_accounts",
    "connect_account",
    "map_migrated_data",
    "profit_loss_activation",
    "profit_loss",
    "balance_sheet",
    "document_retrieval",
    "get_documents",
    "accrual_review",
    "reconciliation",
    "file_migration_upload",
    "xero_file_upload",
    "qbdt_file_upload",
    "transaction_review",
    "form_1099",
    "counterparties",
    "bills",
    "invoices",
    "financial_documents",
    "schedule_rule_suggested_review",
    "schedule_suspicious_transaction_review",
    "revenue_recognition_review",
    "schedule_source_change_review",
    "milestone_revenue_recognition_review",
    "integration_coa_mapping",
] as const;

export const taskTypeSchema = z.enum(TASK_TYPES);

export type TaskType = z.infer<typeof taskTypeSchema>;

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
    file: "File",
    transaction: "Transaction",
    transactions: "Transactions",
    question: "Question",
    invite_accountant: "Invite accountant",
    receipt_phone_number: "Receipt phone number",
    connection_broken: "Broken connection",
    plaid_new_accounts_available: "New Plaid accounts",
    plaid_statements_refresh: "Plaid statements refresh",
    map_chart_of_accounts: "Map chart of accounts",
    connect_account: "Connect account",
    map_migrated_data: "Map migrated data",
    profit_loss_activation: "P&L activation",
    profit_loss: "Profit and loss",
    balance_sheet: "Balance sheet",
    document_retrieval: "Document retrieval",
    get_documents: "Get documents",
    accrual_review: "Accrual review",
    reconciliation: "Reconciliation",
    file_migration_upload: "Migration file upload",
    xero_file_upload: "Xero file upload",
    qbdt_file_upload: "QuickBooks Desktop file upload",
    transaction_review: "Transaction review",
    form_1099: "1099 review",
    counterparties: "Counterparties",
    bills: "Bills",
    invoices: "Invoices",
    financial_documents: "Financial documents",
    schedule_rule_suggested_review: "Suggested schedule rule review",
    schedule_suspicious_transaction_review: "Suspicious transaction review",
    revenue_recognition_review: "Revenue recognition review",
    schedule_source_change_review: "Schedule source change review",
    milestone_revenue_recognition_review:
        "Milestone revenue recognition review",
    integration_coa_mapping: "Integration chart mapping",
};

export const platformUserIdentitySchema = z.object({
    id: z.string().uuid(),
    email: z.string().nullable(),
    name: z.string().nullable(),
});

export type PlatformUserIdentity = z.infer<typeof platformUserIdentitySchema>;

/**
 * Wire shape of a Platform API task. `dueDate` is a calendar day
 * (YYYY-MM-DD); timestamps are ISO-8601 strings. `completedById` /
 * `completedAt` record who last marked the task as done. The expanded
 * relations are present only when requested through `relations`.
 */
export const platformTaskSchema = z.object({
    id: z.string().uuid(),
    workspaceId: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    status: taskStatusSchema,
    priority: taskPrioritySchema.nullable(),
    type: taskTypeSchema,
    dueDate: z.string().date().nullable(),
    groupId: z.string().uuid().nullable(),
    entityIds: z.array(z.string().uuid()),
    assigneeId: z.string().uuid().nullable(),
    createdById: z.string().uuid().nullable(),
    completedById: z.string().uuid().nullable(),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    entities: z.array(platformEntitySchema).optional(),
    assignee: platformUserIdentitySchema.nullable().optional(),
    createdBy: platformUserIdentitySchema.nullable().optional(),
    completedBy: platformUserIdentitySchema.nullable().optional(),
});

export type PlatformTask = z.infer<typeof platformTaskSchema>;

export const TASK_RELATIONS = [
    "entities",
    "assignee",
    "createdBy",
    "completedBy",
] as const;

export type TaskRelation = (typeof TASK_RELATIONS)[number];

export const platformTasksPathParamsSchema = z.object({
    workspaceId: z.string().uuid(),
});

/**
 * Tasks are listed newest first. Date ranges are inclusive calendar days, and
 * `isUnassigned=true` combined with `assigneeIds` adds unassigned tasks to the
 * selection rather than narrowing it.
 */
export const platformTasksListQuerySchema =
    platformPaginationQuerySchema.extend({
        relations: arrayQueryParamSchema(z.enum(TASK_RELATIONS)),
        ids: uuidArrayQueryParamSchema,
        statuses: arrayQueryParamSchema(taskStatusSchema),
        priorities: arrayQueryParamSchema(taskPrioritySchema),
        groupIds: uuidArrayQueryParamSchema,
        entityIds: uuidArrayQueryParamSchema,
        assigneeIds: uuidArrayQueryParamSchema,
        isUnassigned: z.enum(["true", "false"]).optional(),
        createdByIds: uuidArrayQueryParamSchema,
        completedByIds: uuidArrayQueryParamSchema,
        dueDateStart: z.string().date().optional(),
        dueDateEnd: z.string().date().optional(),
        createdAtStart: z.string().date().optional(),
        createdAtEnd: z.string().date().optional(),
        completedAtStart: z.string().date().optional(),
        completedAtEnd: z.string().date().optional(),
        search: z.string().min(1).max(200).optional(),
    });

export type PlatformTasksListQuery = z.infer<
    typeof platformTasksListQuerySchema
>;

export const platformTasksListResponseSchema = z.object({
    data: z.array(platformTaskSchema),
    pagination: platformPaginationSchema,
});

export type PlatformTasksListResponse = z.infer<
    typeof platformTasksListResponseSchema
>;
