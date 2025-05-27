import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  avatar?: string;
}

interface AuthResponse {
  user: User;
  sessionId: string;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const response = await apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
      
      // Store session ID in localStorage
      localStorage.setItem("sessionId", response.sessionId);
      
      // Set authorization header for future requests
      const authHeader = `Bearer ${response.sessionId}`;
      queryClient.setQueryData(["authHeader"], authHeader);
      
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (userData: {
      username: string;
      password: string;
      email: string;
      fullName: string;
    }) => {
      const response = await apiRequest<AuthResponse>("/api/auth/signup", {
        method: "POST",
        body: userData,
      });
      
      // Store session ID in localStorage
      localStorage.setItem("sessionId", response.sessionId);
      
      // Set authorization header for future requests
      const authHeader = `Bearer ${response.sessionId}`;
      queryClient.setQueryData(["authHeader"], authHeader);
      
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const sessionId = localStorage.getItem("sessionId");
      if (sessionId) {
        await apiRequest("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        });
      }
      
      // Clear session data
      localStorage.removeItem("sessionId");
      queryClient.removeQueries({ queryKey: ["authHeader"] });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    signup: signupMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isSignupPending: signupMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    loginError: loginMutation.error,
    signupError: signupMutation.error,
  };
}

// Initialize auth on app start
export function initializeAuth() {
  const sessionId = localStorage.getItem("sessionId");
  if (sessionId) {
    // Set up authorization header for API requests
    const authHeader = `Bearer ${sessionId}`;
    return authHeader;
  }
  return null;
}