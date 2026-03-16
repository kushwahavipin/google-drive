const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const getErrorMessage = async (response) => {
  try {
    const body = await response.json();
    return body.message || "Request failed";
  } catch {
    return `Request failed with status ${response.status}`;
  }
};

export const request = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch (error) {
    throw new Error("Backend is offline. Start the server with npm run dev.");
  }

  if (!response.ok) {
    const message = await getErrorMessage(response);
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export { API_BASE_URL };
