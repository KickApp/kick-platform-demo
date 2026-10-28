import { z } from "zod";

/**
 * Multi-choice query param, matching how the upstream API parses it: a single
 * value and a repeated (or indexed) query param both normalize to an array; an
 * empty value reads as "filter not provided".
 */
export const arrayQueryParamSchema = <TItem extends z.ZodTypeAny>(
    itemSchema: TItem,
) =>
    z.preprocess((value) => {
        if (value === undefined || value === null || value === "") {
            return undefined;
        }
        return Array.isArray(value) ? value : [value];
    }, z.array(itemSchema).min(1).optional());

export const uuidArrayQueryParamSchema = arrayQueryParamSchema(
    z.string().uuid(),
);
