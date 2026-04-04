import { useState } from "react";
import { loginUser } from "../../services/authApi";

type LoginCredentials = {
  email: string;
  password: string;
};

type LoginResult = Awaited<ReturnType<typeof loginUser>>;

type UseLoginOptions = {
  storageKey?: string;
  redirectTo?: string;
  onSuccess?: (result: LoginResult) => void;
  onError?: (message: string) => void;
};

type UseLoginReturn = {
  loading: boolean;
  error: string | null;
  handleLogin: (credentials: LoginCredentials) => Promise<LoginResult | null>;
  clearError: () => void;
};

export default function useLogin(options: UseLoginOptions = {}): UseLoginReturn {
  const {
    storageKey = "auth_token",
    redirectTo,
    onSuccess,
    onError,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleLogin = async (
    credentials: LoginCredentials
  ): Promise<LoginResult | null> => {
    const email = credentials.email.trim();
    const password = credentials.password;

    if (!email || !password) {
      const message = "Email and password are required.";
      setError(message);
      onError?.(message);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await loginUser({ email, password });

      if (result.token) {
        localStorage.setItem(storageKey, result.token);
      }

      onSuccess?.(result);

      if (redirectTo) {
        window.location.href = redirectTo;
      }

      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Login failed. Please try again.";

      setError(message);
      onError?.(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    handleLogin,
    clearError,
  };
}