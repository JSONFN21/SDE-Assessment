import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import BoardPage from './pages/Board';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';

function hasToken(): boolean {
  return Boolean(localStorage.getItem('auth_token'));
}

function RequireAuth({ children }: { children: ReactElement }) {
  return hasToken() ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuthed({ children }: { children: ReactElement }) {
  return hasToken() ? <Navigate to="/board" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={hasToken() ? '/board' : '/login'} replace />} />
        <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />
        <Route path="/board" element={<RequireAuth><BoardPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}