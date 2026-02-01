'use client';

import { Component } from 'react';
import Link from 'next/link';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to an error reporting service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error tracking service
      // logErrorToService(error, errorInfo);
    } else {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h1>Something went wrong</h1>
            <p>We're sorry, but something unexpected happened. Please try again.</p>
            <div className="error-actions">
              <button onClick={this.handleRetry} className="error-retry-btn">
                Try Again
              </button>
              <Link href="/" className="error-home-btn">
                Go to Homepage
              </Link>
            </div>
          </div>
          <style jsx>{`
            .error-boundary {
              min-height: 50vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 40px 20px;
              text-align: center;
            }
            .error-content {
              max-width: 500px;
            }
            .error-content h1 {
              font-size: 2rem;
              color: #3f3d3e;
              margin-bottom: 16px;
            }
            .error-content p {
              color: #666;
              margin-bottom: 24px;
              line-height: 1.6;
            }
            .error-actions {
              display: flex;
              gap: 16px;
              justify-content: center;
              flex-wrap: wrap;
            }
            .error-retry-btn {
              padding: 14px 32px;
              background: #3f3d3e;
              color: #fff;
              border: none;
              border-radius: 40px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
            }
            .error-retry-btn:hover {
              background: #2a2829;
              transform: translateY(-2px);
            }
            .error-home-btn {
              padding: 14px 32px;
              background: transparent;
              color: #3f3d3e;
              border: 2px solid #3f3d3e;
              border-radius: 40px;
              font-weight: 600;
              text-decoration: none;
              transition: all 0.3s;
            }
            .error-home-btn:hover {
              background: #f5f5f5;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
