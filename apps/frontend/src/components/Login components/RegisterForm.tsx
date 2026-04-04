import { useState } from "react";
import type { ComponentProps } from "react";
import { Alert, Box, Card, CardContent, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import LoginInput from "./LoginInput";
import Botton from "./botton";
import useRegister from "./useRegister";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { loading, error, handleRegister, clearError } = useRegister({
    persistToken: false,
    redirectTo: "/login",
  });

  const onSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = async (event) => {
    event.preventDefault();

    await handleRegister({
      username,
      email,
      password,
      confirmPassword,
    });
  };

  return (
    <Card sx={{ width: "100%", maxWidth: 460, borderRadius: 3, mx: "auto" }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>
            Create Account
          </Typography>

          <Box component="form" onSubmit={onSubmit} noValidate>
            <Stack spacing={2}>
              <LoginInput
                label="Username"
                type="text"
                value={username}
                onChange={(value) => {
                  if (error) clearError();
                  setUsername(value);
                }}
                disabled={loading}
                autoComplete="username"
              />

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
                autoComplete="new-password"
              />

              <LoginInput
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(value) => {
                  if (error) clearError();
                  setConfirmPassword(value);
                }}
                disabled={loading}
                autoComplete="new-password"
              />

              {error ? <Alert severity="error">{error}</Alert> : null}

              <Botton
                loading={loading}
                label={loading ? "Creating account..." : "Create Account"}
              />
            </Stack>
          </Box>

          <Typography variant="body2" textAlign="center">
            Already have an account?{" "}
            <Link component={RouterLink} to="/login">
              Sign In
            </Link>
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}