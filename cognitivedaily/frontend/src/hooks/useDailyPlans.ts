import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
    aiGenerateDailyPlan,
    createDailyPlan,
    DailyPlan,
    DailyPlanAIGenerateRequest,
    DailyPlanAIGenerateResponse,
    DailyPlanCreate,
    DailyPlanUpdate,
    deleteDailyPlan,
    getDailyPlan,
    getDailyPlans,
    patchDailyPlanEnergyLevel,
    updateDailyPlan,
} from '../services/api/dailyPlan';

/**
 * React Query hook to fetch all daily plans for the current user.
 * @returns {object} Query result with data, error, status, etc.
 */
export function useDailyPlans() {
  return useQuery<DailyPlan[], Error>({
    queryKey: ['dailyPlans'],
    queryFn: getDailyPlans,
  });
}

/**
 * React Query hook to fetch a single daily plan by ID.
 * @param id - Daily plan ID
 * @returns {object} Query result with data, error, status, etc.
 */
export function useDailyPlan(id: string) {
  return useQuery<DailyPlan, Error>({
    queryKey: ['dailyPlans', id],
    queryFn: () => getDailyPlan(id),
    enabled: !!id,
  });
}

/**
 * React Query hook to create a new daily plan.
 * Invalidates 'dailyPlans' query on success.
 * @returns {object} Mutation result
 */
export function useCreateDailyPlan() {
  const queryClient = useQueryClient();
  return useMutation<DailyPlan, Error, DailyPlanCreate>({
    mutationFn: createDailyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyPlans'] });
    },
  });
}

/**
 * React Query hook to update an existing daily plan.
 * Invalidates 'dailyPlans' and the specific plan query on success.
 * @returns {object} Mutation result
 */
export function useUpdateDailyPlan() {
  const queryClient = useQueryClient();
  return useMutation<DailyPlan, Error, { id: string; data: DailyPlanUpdate }>({
    mutationFn: ({ id, data }) => updateDailyPlan(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dailyPlans'] });
      queryClient.invalidateQueries({ queryKey: ['dailyPlans', data.id] });
    },
  });
}

/**
 * React Query hook to delete a daily plan by ID.
 * Invalidates 'dailyPlans' query on success.
 * @returns {object} Mutation result
 */
export function useDeleteDailyPlan() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteDailyPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyPlans'] });
    },
  });
}

/**
 * React Query hook to generate a daily plan using AI.
 * @returns {object} Mutation result
 */
export function useAIGenerateDailyPlan() {
  return useMutation<DailyPlanAIGenerateResponse, Error, DailyPlanAIGenerateRequest>({
    mutationFn: aiGenerateDailyPlan,
  });
}

/**
 * React Query hook to patch only the energy_level of a daily plan.
 * Invalidates 'dailyPlans' and the specific plan query on success.
 * @returns {object} Mutation result
 */
export function usePatchDailyPlanEnergyLevel() {
  const queryClient = useQueryClient();
  return useMutation<DailyPlan, Error, { id: string; energy_level: number }>({
    mutationFn: ({ id, energy_level }) => patchDailyPlanEnergyLevel(id, energy_level),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dailyPlans'] });
      queryClient.invalidateQueries({ queryKey: ['dailyPlans', data.id] });
    },
  });
}

// Set up Supabase real-time subscription for daily_plans table
let dailyPlansSubscription: any = null;
export function useDailyPlansRealtimeSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (dailyPlansSubscription) return;
    dailyPlansSubscription = supabase
      .channel('public:daily_plans')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_plans' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['dailyPlans'] });
      })
      .subscribe();
    return () => {
      if (dailyPlansSubscription) {
        supabase.removeChannel(dailyPlansSubscription);
        dailyPlansSubscription = null;
      }
    };
  }, [queryClient]);
} 