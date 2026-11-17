import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found'));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appErr: AppError;

  if (err instanceof AppError) {
    appErr = err;
  } else if (err instanceof ZodError) {
    appErr = AppError.badRequest(
      'Invalid request',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  } else if (err instanceof mongoose.Error.ValidationError) {
    appErr = AppError.badRequest(
      'Invalid data',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  } else if (err instanceof mongoose.Error.CastError) {
    appErr = AppError.notFound();
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    appErr = AppError.conflict('Resource already exists');
  } else if (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: string }).type === 'entity.parse.failed'
  ) {
    appErr = AppError.badRequest('Malformed JSON body');
  } else if (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: string }).type === 'entity.too.large'
  ) {
    appErr = new AppError(413, 'VALIDATION_ERROR', 'Request body too large');
  } else {
    logger.error({ err, path: req.path }, 'Unhandled error');
    appErr = new AppError(500, 'INTERNAL_ERROR', 'Something went wrong');
  }

  res.status(appErr.status).json({
    error: { code: appErr.code, message: appErr.message, details: appErr.details },
  });
};
