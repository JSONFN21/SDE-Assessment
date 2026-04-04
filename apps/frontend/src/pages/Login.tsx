import { Box, Container } from "@mui/material";
import LoginForm from "../components/Login components/LoginForm";

export default function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <LoginForm />
      </Container>
    </Box>
  );
}