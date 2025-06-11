/**
 * API service for task-related operations.
 * Uses shared axios instance and error formatting helper.
 */
import api from './axios';
import { formatApiError } from './errorHelper';

// Define Task type (replace with your actual Task type if available)
export interface Task {
  id: string; // UUID
  user_id: string; // UUID
  title: string;
  duration: number; // minutes
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  preferred_time?: string | null; // 12-hour time string, e.g., "2:15 PM"
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  created_at: string; // ISO datetime
  completed_at?: string | null; // ISO datetime or null
}

export type TaskCreate = Omit<Task, 'id' | 'user_id' | 'created_at' | 'completed_at'>;
export type TaskUpdate = Partial<TaskCreate>;

/**
 * Fetch all tasks for the current user.
 * @returns {Promise<Task[]>}
 */
export async function getTasks(): Promise<Task[]> {
  try {
    const response = await api.get('/tasks');
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Fetch a single task by ID.
 * @param id - Task ID
 * @returns {Promise<Task>}
 */
export async function getTask(id: string): Promise<Task> {
  try {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Create a new task.
 * @param data - TaskCreate payload
 * @returns {Promise<Task>}
 */
export async function createTask(data: TaskCreate): Promise<Task> {
  try {
    const response = await api.post('/tasks', data);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Update an existing task.
 * @param id - Task ID
 * @param data - TaskUpdate payload
 * @returns {Promise<Task>}
 */
export async function updateTask(id: string, data: TaskUpdate): Promise<Task> {
  try {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Delete a task by ID.
 * @param id - Task ID
 * @returns {Promise<void>}
 */
export async function deleteTask(id: string): Promise<void> {
  try {
    await api.delete(`/tasks/${id}`);
  } catch (error) {
    throw formatApiError(error);
  }
}

/**
 * Batch create tasks.
 * @param data - Array of TaskCreate payloads
 * @returns {Promise<Task[]>}
 */
export async function batchCreateTasks(data: TaskCreate[]): Promise<Task[]> {
  try {
    const response = await api.post('/tasks/batch', data);
    return response.data;
  } catch (error) {
    throw formatApiError(error);
  }
} 