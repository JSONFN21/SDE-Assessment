const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/auth';
const AUTH_ENDPOINTS = {
    login: "/login",
    register: "/register",
    me: "/me",
    users: "/users",
} as const;


type AuthUser = {
    id: string;
    username: string;
    email: string;
};

type LoginInput = {
    email: string;
    password: string;
};

type RegisterInput = {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
};

type AuthSuccessResponse = {
    message?: string;
    user: AuthUser;
    token?: string;
};

type MeResponse = {
    user: AuthUser;
};

type TeamMembersResponse = {
    users: AuthUser[];
};

type ApiErrorResponse = {
    error?: string;
    details?: string;
};


async function parseResponse<T>(response: Response): Promise<T> {
    const data = (await response.json()) as T | ApiErrorResponse;

    if (!response.ok){
        const errorMessage = 
        (data as ApiErrorResponse).error ||
        (data as ApiErrorResponse).details ||
        "Request failed";
        throw new Error(errorMessage)
    }
    return data as T;
}



export async function loginUser(payload: LoginInput): Promise<AuthSuccessResponse>{
    const response = await fetch(API_BASE_URL+AUTH_ENDPOINTS.login, {
        method: "POST",
        headers:{
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseResponse<AuthSuccessResponse>(response);
}


export async function registerUser(payload: RegisterInput): Promise<AuthSuccessResponse>{
    const response = await fetch(API_BASE_URL+AUTH_ENDPOINTS.register, {
        method: "POST",
        headers:{
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return parseResponse<AuthSuccessResponse>(response);
}


export async function getMe(token: string): Promise<MeResponse>{
    const response = await fetch(API_BASE_URL+AUTH_ENDPOINTS.me, {
        method: "GET",
        headers:{
            Authorization: "Bearer " + token,
        },
    });
    return parseResponse<MeResponse>(response);
}

export async function getTeamMembers(token: string): Promise<TeamMembersResponse> {
    const response = await fetch(API_BASE_URL + AUTH_ENDPOINTS.users, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token,
        },
    });
    return parseResponse<TeamMembersResponse>(response);
}


function normalizeApiError(error: unknown): Error{
    if (error instanceof Error){
        const cleanedMessage = error.message.trim();
        if(cleanedMessage.length > 0){
            return new Error(cleanedMessage);
        }
        return new Error("Something went wrong. Please try again.")
    }
    return new Error("Unexpected error. Please try again.")
}




export type {
  AuthUser,
  LoginInput,
  RegisterInput,
  AuthSuccessResponse,
  MeResponse,
    TeamMembersResponse,
  ApiErrorResponse,
};

export {
  parseResponse,
  normalizeApiError,
};


type LogoutOptions = {
  clearStorage?: boolean;
  storageKey?: string;
};

export function logout(options: LogoutOptions = {}): void {
  const { clearStorage = true, storageKey = "auth_token" } = options;

  if (clearStorage) {
    localStorage.removeItem(storageKey);
  }
}

export function getStoredToken(storageKey = "auth_token"): string | null {
  return localStorage.getItem(storageKey);
}

export function setStoredToken(token: string, storageKey = "auth_token"): void {
  localStorage.setItem(storageKey, token);
}

export async function refreshAccessToken(): Promise<void> {
  throw new Error("refreshAccessToken is not implemented yet.");
}