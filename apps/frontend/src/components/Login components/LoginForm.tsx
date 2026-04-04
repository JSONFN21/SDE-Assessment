import { useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Box, Card, CardContent, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import LoginInput from "./LoginInput";
import Botton from "./botton";
import useLogin from "./useLogin";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { loading, error, handleLogin, clearError } = useLogin({
    redirectTo: "/board",
  });

  const onSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = async (event) => {
    event.preventDefault();

    await handleLogin({
      email,
      password,
    });
  };

  return (
    <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 3, mx: "auto" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Sign In
          </Typography>

          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <LoginInput
                label="Email"
                type="email"
                value={email}
                onChange={(value) => {
                  if (error) clearError();
                  setEmail(value);
                }}
                disabled={loading}
                autoComplete="email"
              />

              <LoginInput
                label="Password"
                type="password"
                value={password}
                onChange={(value) => {
                  if (error) clearError();
                  setPassword(value);
                }}
                disabled={loading}
                autoComplete="current-password"
              />

              {error ? <Alert severity="error">{error}</Alert> : null}

              <Botton
                loading={loading}
                label={loading ? "Signing in..." : "Sign In"}
              />
            </Stack>
          </Box>

          <Typography variant="body2" textAlign="center">
            Don&apos;t have an account?{" "}
            <Link component={RouterLink} to="/register">
              Create one
            </Link>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}