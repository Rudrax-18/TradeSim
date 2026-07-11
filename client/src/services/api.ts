import axios from 'axios';

// Get API URL from Vite env variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send HTTP-only cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = '';
let refreshSubscribers: ((token: string) => void)[] = [];
let isRefreshing = false;

// Set token in memory
export const setAccessToken = (token: string) => {
  accessToken = token;
};

export const getAccessToken = () => {
  return accessToken;
};

// Helper: subscribe to token refresh completion
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// Helper: notify all subscribers after refresh completes
const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Request Interceptor: Attach bearer token if present
api.interceptors.request.use(
  (config) => {
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 Unauthorized errors (refresh token mechanism)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 and it's not a retry already
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Avoid looping if the refresh request itself fails with 401
      if (originalRequest.url === '/api/auth/refresh') {
        setAccessToken('');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Wait until refresh finishes, then retry
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = response.data.accessToken;
        setAccessToken(newAccessToken);
        
        isRefreshing = false;
        onRefreshed(newAccessToken);

        // Retry the original request
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        setAccessToken('');
        // Let the application know the session expired
        window.dispatchEvent(new Event('auth-session-expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
