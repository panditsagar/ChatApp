import { auth } from "@/lib/firebase";

const BASE_URL = "https://chatapp-api-production-d8c0.up.railway.app/api";

const request = async (endpoint, method, body = null) => {
  const headers = { "Content-Type": "application/json" };

  // Add Firebase Token
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  return response.json();
};

// Export API helpers
const api = {
  get: (endpoint) => request(endpoint, "GET"),
  post: (endpoint, body) => request(endpoint, "POST", body),
  put: (endpoint, body) => request(endpoint, "PUT", body),
  delete: (endpoint, body) => request(endpoint, "DELETE", body),
};

export default api;
