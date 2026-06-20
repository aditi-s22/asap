import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // needed so the httpOnly refresh-token cookie is sent/received
});

// Authentication Helpers
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Called by AuthContext once, so the interceptor can update stored state on refresh/logout
// without api.js needing to import the React context directly.
let onSessionExpired = () => {};
export const setOnSessionExpired = (handler) => {
  onSessionExpired = handler;
};

// On a 401, try refreshing the access token once (using the httpOnly refresh cookie)
// and retry the original request; if that also fails, force a logout.
let refreshPromise = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && !config._retried && !config.url?.includes('/auth/refresh')) {
      config._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const refreshRes = await refreshPromise;
        setAuthToken(refreshRes.data.token);
        config.headers['Authorization'] = `Bearer ${refreshRes.data.token}`;
        return api(config);
      } catch (refreshError) {
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs — every sign-in method (email/password, phone, Google) ends with Firebase
// issuing an ID token, which this single endpoint exchanges for our app session.
export const exchangeFirebaseToken = (idToken, extra = {}) => api.post('/auth/firebase-session', { idToken, ...extra });
export const loginUser = (email, password) => api.post('/auth/login', { email, password });
export const refreshAccessToken = () => api.post('/auth/refresh');
export const logoutUser = () => api.post('/auth/logout');

// Parking APIs
export const fetchParkings = () => api.get('/parking');
export const fetchNearbyParkings = (lat, lng) => api.get(`/parking/search/nearby?lat=${lat}&lng=${lng}`);
export const createParking = (data) => api.post('/parking', data);

// Booking & Payment APIs
// createOrder/verifyPayment are bound to a specific bookingId — the server derives the
// charge amount from that booking's stored price, it is never taken from the client.
export const createOrder = (bookingId) => api.post('/payment/create-order', { bookingId });
export const verifyPayment = (paymentData) => api.post('/payment/verify', paymentData);
export const createBooking = (bookingData) => api.post('/bookings', bookingData);
export const fetchUserBookings = (userId) => api.get(`/bookings/user/${userId}`);
export const cancelBooking = (id) => api.patch(`/bookings/${id}/cancel`);

// Advanced Parking & Discovery APIs
export const searchParkings = (query) => api.get(`/parking/search?query=${query}`);
export const getLiveAvailability = (lat, lng) => api.get(`/parking/availability?lat=${lat}&lng=${lng}`);
export const getRecommended = () => api.get('/parking/recommended');
export const getDeals = () => api.get('/parking/deals');

// Public Data
export const getStats = () => api.get('/public/stats');
export const getTestimonials = () => api.get('/public/testimonials');

// User Actions
export const toggleFavorite = (parkingId) => api.post('/users/favorites', { parkingId });
export const getFavorites = () => api.get('/users/favorites');
export const updateUserProfile = (data) => api.put('/users/profile', data);
export const applyForHost = (data) => api.post('/users/host-application', data);
export const getNotifications = () => api.get('/users/notifications');
export const markNotificationRead = (id) => api.patch(`/users/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/users/notifications/read-all');

// Review & Report APIs
export const getParkingReviews = (id) => api.get(`/parking/${id}/reviews`);
export const submitParkingReview = (id, data) => api.post(`/parking/${id}/reviews`, data);
export const reportParkingListing = (id) => api.post(`/parking/${id}/report`);

// Extended Parking & Host Dashboard Actions
export const fetchParkingById = (id) => api.get(`/parking/${id}`);
export const fetchHostParkings = (hostId) => api.get(`/parking/host/${hostId}`);
export const fetchHostMetrics = (hostId) => api.get(`/parking/host/${hostId}/metrics`);
export const deleteParkingListing = (id) => api.delete(`/parking/${id}`);
export const updateParkingListing = (id, data) => api.put(`/parking/${id}`, data);

// Admin Actions
export const getAdminMetrics = () => api.get('/admin/metrics');
export const getAdminUsers = () => api.get('/admin/users');
export const toggleUserStatus = (id) => api.patch(`/admin/users/${id}/status`);
export const getAdminListings = () => api.get('/admin/listings');
export const approveParking = (id) => api.patch(`/admin/parking/${id}/approve`);
export const rejectParking = (id) => api.patch(`/admin/parking/${id}/reject`);
export const suspendParking = (id) => api.patch(`/admin/parking/${id}/suspend`);
export const unsuspendParking = (id) => api.patch(`/admin/parking/${id}/unsuspend`);
export const deleteParking = (id) => api.delete(`/admin/parking/${id}`);
export const getAdminPayments = () => api.get('/admin/payments');
export const getPendingHosts = () => api.get('/admin/hosts/pending');
export const verifyHost = (id, status) => api.patch(`/admin/hosts/${id}/verify`, { status });
export const getAdminDisputes = () => api.get('/admin/disputes');
export const resolveRefund = (id, action, adminNotes) => api.patch(`/admin/payments/${id}/refund`, { action, adminNotes });
export const getAdminActivities = () => api.get('/admin/activities');
export const getSystemHealth = () => api.get('/admin/health');
export const seedDemoData = () => api.post('/admin/seed-demo');
export const uploadImages = (formData) => api.post('/upload/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// New session & ticket APIs
export const manualCheckIn = (qrToken) => api.post('/bookings/check-in', { qrToken });
export const startSession = (id) => api.patch(`/bookings/${id}/start`);
export const checkOutBooking = (id) => api.patch(`/bookings/${id}/check-out`);
export const extendBooking = (id, hours) => api.post(`/bookings/${id}/extend`, { hours });
export const createTicket = (ticketData) => api.post('/users/tickets', ticketData);
export const getTickets = () => api.get('/admin/tickets');
export const updateTicket = (id, data) => api.patch(`/admin/tickets/${id}`, data);

export default api;
