import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
    batchCreateTasks,
    createTask,
    deleteTask,
    getTask,
    getTasks,
    Task,
    TaskCreate,
    TaskUpdate,
    updateTask,
} from '../services/api/tasks';

/**
 * React Query hook to fetch all tasks for the current user.
 * @returns {object} Query result with data, error, status, etc.
 */
export function useTasks() {
  return useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });
}

/**
 * React Query hook to fetch a single task by ID.
 * @param id - Task ID
 * @returns {object} Query result with data, error, status, etc.
 */
export function useTask(id: string) {
  return useQuery<Task, Error>({
    queryKey: ['tasks', id],
    queryFn: () => getTask(id),
    enabled: !!id,
  });
}

/**
 * React Query hook to create a new task.
 * Invalidates 'tasks' query on success.
 * @returns {object} Mutation result
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, TaskCreate>({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * React Query hook to update an existing task.
 * Invalidates 'tasks' and the specific task query on success.
 * @returns {object} Mutation result
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation<Task, Error, { id: string; data: TaskUpdate }>({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', data.id] });
    },
  });
}

/**
 * React Query hook to delete a task by ID.
 * Invalidates 'tasks' query on success.
 * @returns {object} Mutation result
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/**
 * React Query hook to batch create tasks.
 * Invalidates 'tasks' query on success.
 * @returns {object} Mutation result
 */
export function useBatchCreateTasks() {
  const queryClient = useQueryClient();
  return useMutation<Task[], Error, TaskCreate[]>({
    mutationFn: batchCreateTasks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Set up Supabase real-time subscription for tasks table
let tasksSubscription: any = null;
export function useTasksRealtimeSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (tasksSubscription) return;
    tasksSubscription = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      })
      .subscribe();
    return () => {
      if (tasksSubscription) {
        supabase.removeChannel(tasksSubscription);
        tasksSubscription = null;
      }
    };
  }, [queryClient]);
} 