// Map Stripe errors to user-friendly messages
export const getPaymentErrorMessage = (error) => {
    const errorCode = error.code || error.type;
  
    const errorMessages = {
      // Card errors
      'card_declined': 'Your card was declined. Please try a different payment method.',
      'insufficient_funds': 'Insufficient funds. Please try a different card.',
      'expired_card': 'Your card has expired. Please use a different card.',
      'incorrect_cvc': 'Your card\'s security code is incorrect. Please try again.',
      'incorrect_number': 'Your card number is incorrect. Please check and try again.',
      'processing_error': 'An error occurred while processing your card. Please try again.',
      
      // Authentication errors
      'authentication_required': 'Your card requires authentication. Please complete the verification.',
      'card_not_supported': 'This card is not supported. Please try a different card.',
      
      // Issuer errors
      'card_velocity_exceeded': 'You have exceeded the number of allowed attempts. Please try again later.',
      'fraudulent': 'This transaction has been flagged as potentially fraudulent.',
      'generic_decline': 'Your card was declined. Please contact your bank for more information.',
      'invalid_account': 'The card account is invalid. Please try a different card.',
      'lost_card': 'This card has been reported lost. Please use a different card.',
      'stolen_card': 'This card has been reported stolen. Please use a different card.',
      
      // Amount errors
      'amount_too_large': 'The payment amount is too large. Please contact support.',
      'amount_too_small': 'The payment amount is too small.',
      
      // Connect errors
      'account_invalid': 'The connected account is invalid.',
      'platform_api_key_expired': 'Platform API key has expired. Please contact support.',
      
      // Rate limit
      'rate_limit': 'Too many requests. Please try again in a few moments.',
      
      // Network errors
      'api_connection_error': 'Unable to connect to payment processor. Please check your connection.',
      'api_error': 'An error occurred with our payment processor. Please try again.',
      
      // Validation errors
      'invalid_request_error': 'Invalid payment request. Please check your information.',
      'validation_error': 'Payment validation failed. Please check your information.'
    };
  
    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again or contact support.';
  };
  
  // Enhanced error response
  export const formatPaymentError = (error) => {
    return {
      error: getPaymentErrorMessage(error),
      code: error.code || 'unknown',
      type: error.type || 'unknown',
      // Only include decline_code if it exists
      ...(error.decline_code && { decline_code: error.decline_code })
    };
  };