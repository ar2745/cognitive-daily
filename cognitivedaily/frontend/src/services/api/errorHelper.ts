/**
 * Helper to extract and format user-friendly error messages from API errors.
 * Optionally logs or shows a toast notification (see comments).
 *
 * @param error - The error object thrown by axios or API call
 * @returns { message: string, status?: number, data?: any }
 */
import axios from 'axios';
// import { toast } from '@/hooks/use-toast'; // Uncomment if you want to show toasts

export function formatApiError(error: unknown): { message: string; status?: number; data?: any } {
  let message = 'An unexpected error occurred.';
  let status: number | undefined = undefined;
  let data: any = undefined;

  if (axios.isAxiosError(error)) {
    status = error.response?.status;
    data = error.response?.data;
    message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  // Optionally show a toast notification
  // toast.error(message);

  // Optionally log the error
  // console.error('API Error:', error);

  return { message, status, data };
} 