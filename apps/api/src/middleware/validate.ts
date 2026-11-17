import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

/** Validate and replace `req.body` with the parsed (stripped, coerced) value. */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body ?? {});
    next();
  };
}

/** Parse query params (Express 5 `req.query` is read-only, so return the value). */
export function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown): z.infer<S> {
  return schema.parse(query);
}
