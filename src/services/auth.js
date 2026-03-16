import { request } from "./api";

const STORAGE_KEY = "safeDriveUser";

export const getSessionUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSessionUser = (user) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
};

export const signup = async ({ name, email, password }) => {
  const user = await request("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  saveSessionUser(user);
  return user;
};

export const login = async ({ email, password }) => {
  const user = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  saveSessionUser(user);
  return user;
};

export const logoutSession = () => {
  localStorage.removeItem(STORAGE_KEY);
};
