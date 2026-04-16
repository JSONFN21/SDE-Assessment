import { API_BASE_URL } from './apiBase';

const TASKS_URL = `${API_BASE_URL}/tasks`;

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

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high';

export type TaskComment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
  createdById: string | null;
  updatedById: string | null;
  createdBy: {
    id: string;
    username: string;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    username: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskTeam = {
  id: string;
  name: string;
  description: string | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  labels: string[];
  assignees: string[];
  userId: string;
  teamId: string | null;
  team: TaskTeam | null;
  comments: TaskComment[];
  subtasks: Subtask[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  labels?: string[];
  assignees?: string[];
  teamId?: string | null;
};

export type UpdateTaskInput = Partial<CreateTaskInput>;

export type AddCommentInput = {
  content: string;
};

export type AddSubtaskInput = {
  title: string;
};

export type UpdateSubtaskInput = {
  title?: string;
  completed?: boolean;
};

function normalizeTask(task: Task): Task {
  return {
    ...task,
    teamId: task.teamId ?? null,
    team: task.team ?? null,
    labels: Array.isArray(task.labels) ? task.labels : [],
    assignees: Array.isArray(task.assignees) ? task.assignees : [],
    comments: Array.isArray(task.comments) ? task.comments : [],
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
  };
}

export async function fetchTasks(teamId?: string | null): Promise<Task[]> {
  const url = new URL(TASKS_URL, window.location.origin);
  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }

  const res = await fetch(url.toString(), { headers: authHeaders() });
  const tasks = await handleResponse<Task[]>(res);
  return tasks.map(normalizeTask);
}

export async function fetchTask(id: string): Promise<Task> {
  const res = await fetch(`${TASKS_URL}/${id}`, { headers: authHeaders() });
  return normalizeTask(await handleResponse<Task>(res));
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await fetch(TASKS_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return normalizeTask(await handleResponse<Task>(res));
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const res = await fetch(`${TASKS_URL}/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return normalizeTask(await handleResponse<Task>(res));
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${TASKS_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Delete failed');
  }
}

export async function addTaskComment(taskId: string, input: AddCommentInput): Promise<Task> {
  const res = await fetch(`${TASKS_URL}/${taskId}/comments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return normalizeTask(await handleResponse<Task>(res));
}

export async function updateTaskComment(taskId: string, commentId: string, input: AddCommentInput): Promise<Task> {
  const res = await fetch(`${TASKS_URL}/${taskId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return normalizeTask(await handleResponse<Task>(res));
}

export async function deleteTaskComment(taskId: string, commentId: string): Promise<void> {
  const res = await fetch(`${TASKS_URL}/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Delete failed');
  }
}

export async function addSubtask(taskId: string, input: AddSubtaskInput): Promise<Task> {
  const res = await fetch(`${TASKS_URL}/${taskId}/subtasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return normalizeTask(await handleResponse<Task>(res));
}

export async function updateSubtask(taskId: string, subtaskId: string, input: UpdateSubtaskInput): Promise<Task> {
  const res = await fetch(`${TASKS_URL}/${taskId}/subtasks/${subtaskId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return normalizeTask(await handleResponse<Task>(res));
}

export async function deleteSubtask(taskId: string, subtaskId: string): Promise<void> {
  const res = await fetch(`${TASKS_URL}/${taskId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Delete failed');
  }
}
