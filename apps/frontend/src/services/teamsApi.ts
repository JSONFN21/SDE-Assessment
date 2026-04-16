import { API_BASE_URL } from './apiBase';

const TEAMS_URL = `${API_BASE_URL}/teams`;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Request failed');
  return data as T;
}

export type TeamRole = 'OWNER' | 'MEMBER' | 'VIEWER';

export type Team = {
  id: string;
  name: string;
  description: string | null;
  role: TeamRole;
  owner: {
    id: string;
    username: string;
    email: string;
  };
  memberCount: number;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TeamMember = {
  id: string;
  role: TeamRole;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

export type CreateTeamInput = {
  name: string;
  description?: string;
};

export type UpdateTeamInput = Partial<CreateTeamInput>;

export type AddTeamMemberInput = {
  username: string;
  role?: TeamRole;
};

export async function fetchTeams(): Promise<Team[]> {
  const res = await fetch(TEAMS_URL, { headers: authHeaders() });
  const data = await handleResponse<{ teams: Team[] }>(res);
  return data.teams;
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const res = await fetch(TEAMS_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ team: Team }>(res);
  return data.team;
}

export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team> {
  const res = await fetch(`${TEAMS_URL}/${teamId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ team: Team }>(res);
  return data.team;
}

export async function deleteTeam(teamId: string): Promise<void> {
  const res = await fetch(`${TEAMS_URL}/${teamId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Delete failed');
  }
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const res = await fetch(`${TEAMS_URL}/${teamId}/members`, { headers: authHeaders() });
  const data = await handleResponse<{ members: TeamMember[] }>(res);
  return data.members;
}

export async function addTeamMember(teamId: string, input: AddTeamMemberInput): Promise<TeamMember> {
  const res = await fetch(`${TEAMS_URL}/${teamId}/members`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  const data = await handleResponse<{ member: TeamMember }>(res);
  return data.member;
}

export async function updateTeamMember(teamId: string, memberId: string, role: TeamRole): Promise<TeamMember> {
  const res = await fetch(`${TEAMS_URL}/${teamId}/members/${memberId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await handleResponse<{ member: TeamMember }>(res);
  return data.member;
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  const res = await fetch(`${TEAMS_URL}/${teamId}/members/${memberId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Delete failed');
  }
}
