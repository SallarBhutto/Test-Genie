import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = localStorage.getItem("authToken");
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    const urlParams = new URLSearchParams();
    
    // Handle project filtering for endpoints that support it
    if (queryKey.length > 1 && queryKey[1] !== undefined && queryKey[1] !== null) {
      urlParams.append('projectId', queryKey[1].toString());
    }
    
    // Handle date filtering parameters
    if (queryKey.length > 2 && queryKey[2] !== undefined && queryKey[2] !== null) {
      urlParams.append('dateRange', queryKey[2].toString());
    }
    
    if (queryKey.length > 3 && queryKey[3] !== undefined && queryKey[3] !== null && queryKey[3] !== '') {
      urlParams.append('dateFrom', queryKey[3].toString());
    }
    
    if (queryKey.length > 4 && queryKey[4] !== undefined && queryKey[4] !== null && queryKey[4] !== '') {
      urlParams.append('dateTo', queryKey[4].toString());
    }
    
    // Append parameters to URL if any exist
    const paramString = urlParams.toString();
    if (paramString) {
      url = `${url}?${paramString}`;
    }
    
    const token = localStorage.getItem("authToken");
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
