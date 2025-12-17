// Custom error class
export class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Global error handler
  export const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
  
    // Log error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', err);
    }
  
    // Prisma errors
    if (err.code === 'P2002') {
      const message = 'Duplicate value entered';
      error = new AppError(message, 400);
    }
  
    if (err.code === 'P2025') {
      const message = 'Resource not found';
      error = new AppError(message, 404);
    }
  
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      const message = 'Invalid token';
      error = new AppError(message, 401);
    }
  
    if (err.name === 'TokenExpiredError') {
      const message = 'Token expired';
      error = new AppError(message, 401);
    }
  
    // Validation errors
    if (err.name === 'ValidationError') {
      const message = 'Invalid input data';
      error = new AppError(message, 400);
    }
  
    // Send response
    res.status(error.statusCode || 500).json({
      error: error.isOperational 
        ? error.message 
        : process.env.NODE_ENV === 'production'
          ? 'Something went wrong'
          : error.message
    });
  };
  
  // Catch async errors
  export const catchAsync = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };