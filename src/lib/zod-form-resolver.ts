import type { FieldError, FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

/**
 * Lets react-hook-form validate with a Zod schema, so a form uses exactly
 * the schema the API uses. On success the form receives the parsed values
 * (trimmed, normalised); on failure, the first message for each field.
 *
 * Written for flat forms, where every field is a top-level key.
 */
export function zodFormResolver<TInput extends FieldValues, TOutput>(
  schema: z.ZodType<TOutput, TInput>,
): Resolver<TInput, unknown, TOutput> {
  return async (values, _context, options) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };

    const errors: Record<string, FieldError> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]);
      errors[field] ??= {
        type: issue.code,
        message: issue.message,
        // Lets the form move focus to the first field that needs fixing.
        ref: options.fields[field]?.ref,
      };
    }

    return { values: {}, errors } as Awaited<
      ReturnType<Resolver<TInput, unknown, TOutput>>
    >;
  };
}
