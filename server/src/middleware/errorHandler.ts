import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  // Never echo internal error details (Prisma/SQL/stack info) for server-side
  // failures — clients only get a generic message; full error is logged here.
  const message =
    status >= 500 ? 'Internal Server Error' : err.message || 'Bad Request';

  res.status(status).json({ success: false, message });
};
