import { useMemo, useState } from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

type LoginInputProps = {
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
};

export default function LoginInput({
  label,
  type,
  value,
  onChange,
  error = false,
  helperText = "",
  disabled = false,
  name,
  autoComplete,
}: LoginInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordField = type === "password";
  const effectiveType = useMemo(() => {
    if (!isPasswordField) return type;
    return showPassword ? "text" : "password";
  }, [isPasswordField, showPassword, type]);

  const endAdornment = isPasswordField ? (
    <InputAdornment position="end">
      <IconButton
        onClick={() => setShowPassword((prev) => !prev)}
        edge="end"
        aria-label={showPassword ? "Hide password" : "Show password"}
        disabled={disabled}
      >
        {showPassword ? <VisibilityOff /> : <Visibility />}
      </IconButton>
    </InputAdornment>
  ) : undefined;

  return (
    <TextField
        fullWidth
        variant="outlined"
        label={label}
        type={effectiveType}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        helperText={helperText}
        disabled={disabled}
        name={name}
        autoComplete={autoComplete}
        slotProps={{
            input: {
            endAdornment,
            },
        }}
    />
  );
}