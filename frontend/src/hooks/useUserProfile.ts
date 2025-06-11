import api from "@/services/api/axios";
import { useQuery } from "@tanstack/react-query";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  preferences?: Record<string, any>;
  created_at: string;
  default_working_hours?: number;
  timezone?: string;
}

export function useUserProfile() {
  return useQuery<UserProfile, Error>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data } = await api.get("/users/me");
      return data;
    },
  });
} 