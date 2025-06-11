/**
 * API service for daily plan operations.
 * Matches backend schema and uses shared axios instance.
 */
import api from './axios';
import { formatApiError } from './errorHelper';

// --- Types ---

/** Daily plan object (matches backend) */
export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string; // YYYY-MM-DD
  energy_level?: number | null;
  available_hours?: number | null;
  schedule?: Record<string, any>;
  notes?: string | null;
  created_at: string; // ISO datetime
}

/** Payload for creating a daily plan */
export type DailyPlanCreate = Omit<DailyPlan, 'id' | 'user_id' | 'created_at'>;

/** Payload for updating a daily plan */
export interface DailyPlanUpdate {
  energy_level?: number;
  available_hours?: number;
  schedule?: Record<string, any>;
  notes?: string;
}

/** Request for AI-powered daily plan generation */
export interface DailyPlanAIGenerateRequest {
  plan_date: string;
  energy_level?: number;
  available_hours?: number;
  goals?: string[];
  preferences?: Record<string, any>;
  history?: Record<string, any>;
}

/** Response from AI-powered daily plan generation */
export interface DailyPlanAIGenerateResponse {
  schedule: Record<string, any>;
  notes?: string;
  raw_response?: any;
}

// --- API Functions ---

/**
 * Fetch all daily plans for the current user.
 */
export async function getDailyPlans(): Promise<DailyPlan[]> {
  try {
    const response = await api.get('/daily-plans/');
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Fetch a single daily plan by ID.
 */
export async function getDailyPlan(id: string): Promise<DailyPlan> {
  try {
    const response = await api.get(`/daily-plans/${id}/`);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Create a new daily plan.
 */
export async function createDailyPlan(data: DailyPlanCreate): Promise<DailyPlan> {
  try {
    const response = await api.post('/daily-plans/', data);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Update an existing daily plan.
 */
export async function updateDailyPlan(id: string, data: DailyPlanUpdate): Promise<DailyPlan> {
  try {
    const response = await api.put(`/daily-plans/${id}/`, data);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Delete a daily plan by ID.
 */
export async function deleteDailyPlan(id: string): Promise<void> {
  try {
    await api.delete(`/daily-plans/${id}/`);
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Generate a daily plan using AI.
 */
export async function aiGenerateDailyPlan(data: DailyPlanAIGenerateRequest): Promise<DailyPlanAIGenerateResponse> {
  try {
    const response = await api.post('/daily-plans/ai-generate/', data);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Patch only the energy_level of a daily plan.
 */
export async function patchDailyPlanEnergyLevel(id: string, energy_level: number): Promise<DailyPlan> {
  try {
    const response = await api.patch(`/daily-plans/${id}/energy-level/`, { energy_level });
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
} 