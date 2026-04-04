import { useState } from "react";
import { registerUser } from "../../services/authApi";

type RegisterCredentials = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterResult = Awaited<ReturnType<typeof registerUser>>;

type UseRegisterOptions = {
  storageKey?: string;
  persistToken?: boolean;
  redirectTo?: string;
  onSuccess?: (result: RegisterResult) => void;
  onError?: (message: string) => void;
};

type UseRegisterReturn = {
  loading: boolean;
  error: string | null;
  handleRegister: (
    credentials: RegisterCredentials
  ) => Promise<RegisterResult | null>;
  clearError: () => void;
};

export default function useRegister(
  options: UseRegisterOptions = {}
): UseRegisterReturn {
  const {
    storageKey = "auth_token",
    persistToken = true,
    redirectTo,
    onSuccess,
    onError,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const handleRegister = async (
    credentials: RegisterCredentials
  ): Promise<RegisterResult | null> => {
    const username = credentials.username.trim();
    const email = credentials.email.trim();
    const password = credentials.password;
    const confirmPassword = credentials.confirmPassword;

    if (!username || !email || !password || !confirmPassword) {
      const message = "All fields are required.";
      setError(message);
      onError?.(message);
      return null;
    }

    if (password !== confirmPassword) {
      const message = "Passwords do not match.";
      setError(message);
      onError?.(message);
      return null;
    }

    if (password.length < 6) {
      const message = "Password must be at least 6 characters.";
      setError(message);
      onError?.(message);
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await registerUser({
        username,
        email,
        password,
        confirmPassword,
      });

      if (persistToken && result.token) {
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
          : "Registration failed. Please try again.";

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
    handleRegister,
    clearError,
  };
}