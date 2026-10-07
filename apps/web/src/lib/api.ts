import axios from "axios";
import { envConfig } from "../config/env";
import { parseApiError } from "./apiError";

const { VITE_API_URL } = envConfig;

export const api = axios.create({
  baseURL: VITE_API_URL,
  withCredentials: true,
});

export async function fetcher<T>(url: string): Promise<T> {
  const response = await api.get<T>(url);

  return response.data;
}

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(parseApiError(error)),
);
