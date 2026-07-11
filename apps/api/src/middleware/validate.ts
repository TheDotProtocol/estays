import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/app-error';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.flatten();
      throw new AppError('VALIDATION_ERROR', 'Validation failed', 400, {
        fieldErrors: details.fieldErrors,
        formErrors: details.formErrors,
      });
    }
    req[source] = result.data;
    next();
  };
}
