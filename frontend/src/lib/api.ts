/**
 * API client for Pure Price Press backend
 */

import type {
  MonitorTarget,
  MonitorTargetCreate,
  MonitorTargetUpdate,
  AlertHistory,
  AlertHistoryCreate,
  SystemConfig,
  DashboardStats,
  MessageResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.detail || `HTTP ${response.status}`,
        response.status,
        error.detail
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      "Network error",
      0,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// Monitor Targets API
export const monitorTargetsApi = {
  /**
   * Get all monitor targets
   */
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<MonitorTarget[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params?.active_only !== undefined)
      queryParams.append("active_only", params.active_only.toString());

    const query = queryParams.toString();
    return fetchApi<MonitorTarget[]>(
      `/api/targets${query ? `?${query}` : ""}`
    );
  },

  /**
   * Get a specific monitor target
   */
  getById: async (id: number): Promise<MonitorTarget> => {
    return fetchApi<MonitorTarget>(`/api/targets/${id}`);
  },

  /**
   * Create a new monitor target
   */
  create: async (data: MonitorTargetCreate): Promise<MonitorTarget> => {
    return fetchApi<MonitorTarget>("/api/targets", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Update a monitor target
   */
  update: async (
    id: number,
    data: MonitorTargetUpdate
  ): Promise<MonitorTarget> => {
    return fetchApi<MonitorTarget>(`/api/targets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a monitor target
   */
  delete: async (id: number): Promise<MessageResponse> => {
    return fetchApi<MessageResponse>(`/api/targets/${id}`, {
      method: "DELETE",
    });
  },
};

// Alerts API
export const alertsApi = {
  /**
   * Get all alerts
   */
  getAll: async (params?: {
    skip?: number;
    limit?: number;
    symbol?: string;
    days?: number;
  }): Promise<AlertHistory[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined)
      queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined)
      queryParams.append("limit", params.limit.toString());
    if (params?.symbol) queryParams.append("symbol", params.symbol);
    if (params?.days !== undefined)
      queryParams.append("days", params.days.toString());

    const query = queryParams.toString();
    return fetchApi<AlertHistory[]>(`/api/alerts${query ? `?${query}` : ""}`);
  },

  /**
   * Get a specific alert
   */
  getById: async (id: number): Promise<AlertHistory> => {
    return fetchApi<AlertHistory>(`/api/alerts/${id}`);
  },

  /**
   * Create a new alert (typically called by monitor)
   */
  create: async (data: AlertHistoryCreate): Promise<AlertHistory> => {
    return fetchApi<AlertHistory>("/api/alerts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// System Config API
export const configApi = {
  /**
   * Get all system configs
   */
  getAll: async (): Promise<SystemConfig[]> => {
    return fetchApi<SystemConfig[]>("/api/config");
  },

  /**
   * Get a specific config
   */
  getByKey: async (key: string): Promise<SystemConfig> => {
    return fetchApi<SystemConfig>(`/api/config/${key}`);
  },

  /**
   * Set or update a config
   */
  set: async (
    key: string,
    value: string,
    description?: string
  ): Promise<SystemConfig> => {
    return fetchApi<SystemConfig>(`/api/config/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value, description }),
    });
  },

  /**
   * Delete a config
   */
  delete: async (key: string): Promise<MessageResponse> => {
    return fetchApi<MessageResponse>(`/api/config/${key}`, {
      method: "DELETE",
    });
  },
};

// Dashboard API
export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  getStats: async (): Promise<DashboardStats> => {
    return fetchApi<DashboardStats>("/api/dashboard/stats");
  },
};

// Health Check
export const healthCheck = async (): Promise<MessageResponse> => {
  return fetchApi<MessageResponse>("/api/health");
};

// Export ApiError for error handling
export { ApiError };
