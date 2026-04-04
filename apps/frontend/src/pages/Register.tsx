import { Box, Container } from "@mui/material";
import RegisterForm from "../components/Login components/RegisterForm";

export default function RegisterPage() {
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
        <RegisterForm />
      </Container>
    </Box>
  );
}