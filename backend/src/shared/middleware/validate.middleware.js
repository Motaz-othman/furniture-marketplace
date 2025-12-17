export const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body against schema
      const validated = schema.parse(req.body);
      
      // Replace req.body with validated data (sanitized)
      req.body = validated;
      
      next();
    } catch (error) {
      // Return validation errors (Zod uses 'issues' not 'errors')
      if (error.issues) {
        const errors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }
      
      res.status(400).json({ error: 'Invalid request data' });
    }
  };
};