/**
 * HttpClient - Reusable API client wrapper
 */
export class HttpClient {
    constructor(baseUrl, defaultHeaders = {}) {
      this.baseUrl = baseUrl;
      this.defaultHeaders = {
        'Content-Type': 'application/json',
        ...defaultHeaders
      };
    }
  
    setHeader(key, value) {
      this.defaultHeaders[key] = value;
    }
  
    setAuthToken(token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
  
    setApiKey(key, headerName = 'X-API-Key') {
      this.defaultHeaders[headerName] = key;
    }
  
    async request(method, endpoint, data = null, customHeaders = {}) {
      const url = `${this.baseUrl}${endpoint}`;
      
      const options = {
        method,
        headers: {
          ...this.defaultHeaders,
          ...customHeaders
        }
      };
  
      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }
  
      try {
        const response = await fetch(url, options);
        const result = await response.json();
  
        return {
          success: response.ok,
          status: response.status,
          data: result
        };
      } catch (error) {
        return {
          success: false,
          status: 0,
          error: error.message
        };
      }
    }
  
    async get(endpoint, headers = {}) {
      return this.request('GET', endpoint, null, headers);
    }
  
    async post(endpoint, data, headers = {}) {
      return this.request('POST', endpoint, data, headers);
    }
  
    async put(endpoint, data, headers = {}) {
      return this.request('PUT', endpoint, data, headers);
    }
  
    async patch(endpoint, data, headers = {}) {
      return this.request('PATCH', endpoint, data, headers);
    }
  
    async delete(endpoint, headers = {}) {
      return this.request('DELETE', endpoint, null, headers);
    }
  }
  
  export default HttpClient;