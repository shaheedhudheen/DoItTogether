import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // safeParseAsync also works across zod module instances (shared vs server)
      const result = await schema.safeParseAsync(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: result.error.errors
        });
      }

      // Replace the body with the parsed result so unknown fields are
      // stripped and schema defaults are applied before controllers run.
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};
