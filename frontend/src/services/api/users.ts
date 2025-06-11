/**
 * API service for user-related operations.
 * Uses shared axios instance and error formatting helper.
 */
import api from './axios';
import { formatApiError } from './errorHelper';

// Define User types
export interface User {
  id: string;
  email: string;
  name?: string;
  preferences?: Record<string, any>;
  created_at: string;
  default_working_hours?: number;
  timezone?: string;
}

export interface UserBootstrapRequest {
  user_id: string;
  email: string;
  name?: string;
}

/**
 * Bootstrap a new user without authentication.
 * This is a temporary development/testing solution.
 * @param data - User bootstrap data including user_id from auth
 * @returns {Promise<User>}
 */
export async function bootstrapUser(data: UserBootstrapRequest): Promise<User> {
  try {
    const response = await api.post('/users/bootstrap', {
      user_id: data.user_id,
      email: data.email,
      name: data.name || "",
    });
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Update the current user's profile (name, default_working_hours, preferences)
 * @param data - Partial user fields to update
 * @returns {Promise<User>}
 */
export async function updateCurrentUser(data: {
  name?: string;
  default_working_hours?: number;
  preferences?: Record<string, any>;
  timezone?: string;
}): Promise<User> {
  try {
    const response = await api.put('/users/me', data);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
} 