import { z } from 'zod';

// Register validator schema
export const registerSchema = z.object({
  name: z.string().trim().min(2, { message: 'Name must be at least 2 characters long' }),
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Za-z]/, { message: 'Password must contain at least one letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
});

// Login validator schema
export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

// Generic validation middleware
export const validateBody = (schema) => {
  return async (req, res, next) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map errors to simple fields
        const formattedErrors = error.errors.reduce((acc, curr) => {
          const field = curr.path[0];
          acc[field] = curr.message;
          return acc;
        }, {});

        return res.status(400).json({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      }
      next(error);
    }
  };
};
