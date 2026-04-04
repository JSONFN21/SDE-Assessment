import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import {
  AppBar, Box, Button, CircularProgress, InputAdornment,
  Stack, TextField, Toolbar, Typography, Chip, Alert, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import BoardColumn from '../components/board/BoardColumn';
import CreateTaskDialog from '../components/board/CreateTaskDialog';
import TaskDetailDialog from '../components/board/TaskDetailDialog';
import TeamManagerDialog from '../components/board/TeamManagerDialog';
import {
  fetchTasks, createTask, updateTask, deleteTask,
  type Task, type TaskStatus, type CreateTaskInput, type UpdateTaskInput,
} from '../services/tasksApi';
import { getMe, getTeamMembers, type AuthUser } from '../services/authApi';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  fetchTeamMembers,
  fetchTeams,
  removeTeamMember,
  type Team,
  type TeamMember,
  type TeamRole,
  updateTeamMember,
} from '../services/teamsApi';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

function parseDueDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const datePart = dateValue.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export default function BoardPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<AuthUser[]>([]);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [createDialogStatus, setCreateDialogStatus] = useState<TaskStatus | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [teamsDialogOpen, setTeamsDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const [taskData, teamData, meResponse, members] = await Promise.all([
        fetchTasks(selectedTeamId),
        fetchTeams(),
        token ? getMe(token) : Promise.resolve(null),
        selectedTeamId
          ? fetchTeamMembers(selectedTeamId)
          : token
            ? getTeamMembers(token).then(response => response.users)
            : Promise.resolve([] as AuthUser[]),
      ]);
      setTasks(taskData);
      setTeams(teamData);
      setCurrentUser(meResponse?.user ?? null);
      setSelectedTeamMembers(selectedTeamId ? members as TeamMember[] : []);
      setTeamMembers(
        selectedTeamId
          ? (members as TeamMember[]).map(member => member.user)
          : [meResponse?.user, ...(members as AuthUser[])]
              .filter((user): user is AuthUser => Boolean(user))
              .filter((user, index, array) => array.findIndex(candidate => candidate.id === user.id) === index),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login', { replace: true });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
    try {
      const updated = await updateTask(draggableId, { status: newStatus });
      setTasks(prev => prev.map(task => task.id === draggableId ? updated : task));
      if (editTask?.id === draggableId) {
        setEditTask(updated);
      }
    } catch {
      load();
    }
  };

  const handleCreate = async (input: CreateTaskInput) => {
    const task = await createTask(input);
    setTasks(prev => [...prev, task]);
  };

  const handleUpdate = async (id: string, input: UpdateTaskInput) => {
    const updated = await updateTask(id, input);
    setTasks(prev => prev.map(t => t.id === id ? updated : t));
    setEditTask(updated);
    return updated;
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleTaskChange = (task: Task) => {
    setTasks(prev => prev.map(item => item.id === task.id ? task : item));
    setEditTask(task);
  };

  const handleCreateTeam = async (input: { name: string; description?: string }) => {
    const team = await createTeam(input);
    setTeams(prev => [...prev, team]);
    setSelectedTeamId(team.id);
    await load();
  };

  const handleDeleteTeam = async (teamId: string) => {
    await deleteTeam(teamId);
    if (selectedTeamId === teamId) {
      setSelectedTeamId(null);
    }
    await load();
  };

  const handleAddTeamMember = async (teamId: string, input: { username: string; role: TeamRole }) => {
    await addTeamMember(teamId, input);
    await load();
  };

  const handleUpdateTeamMemberRole = async (teamId: string, memberId: string, role: TeamRole) => {
    await updateTeamMember(teamId, memberId, role);
    await load();
  };

  const handleRemoveTeamMember = async (teamId: string, memberId: string) => {
    await removeTeamMember(teamId, memberId);
    await load();
  };

  const allLabels = [...new Set(tasks.flatMap(t => (Array.isArray(t.labels) ? t.labels : [])))];

  const filtered = tasks.filter(t => {
    const labels = Array.isArray(t.labels) ? t.labels : [];
    const title = typeof t.title === 'string' ? t.title : '';
    const description = typeof t.description === 'string' ? t.description : '';
    const matchSearch = !search || title.toLowerCase().includes(search.toLowerCase()) || description.toLowerCase().includes(search.toLowerCase());
    const matchLabel = !filterLabel || labels.includes(filterLabel);
    return matchSearch && matchLabel;
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const overdue = tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const dueDate = parseDueDate(t.dueDate);
    if (!dueDate) return false;
    return dueDate < new Date(new Date().toDateString());
  }).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" fontWeight={800} color="primary" sx={{ flexGrow: 0 }}>
            TaskBoard
          </Typography>
          <Stack direction="row" spacing={2} sx={{ ml: 2 }}>
            <Chip label={`${total} total`} size="small" variant="outlined" />
            <Chip label={`${completed} done`} size="small" color="success" variant="outlined" />
            {overdue > 0 && <Chip label={`${overdue} overdue`} size="small" color="error" variant="outlined" />}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <TextField
            select
            size="small"
            value={selectedTeamId ?? '__personal__'}
            onChange={event => setSelectedTeamId(event.target.value === '__personal__' ? null : event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="__personal__">Personal Board</MenuItem>
            {teams.map(team => (
              <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ width: 220 }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment>,
              },
            }}
          />
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateDialogStatus('todo')}>
            New Task
          </Button>
          <Button variant="outlined" size="small" onClick={() => setTeamsDialogOpen(true)}>
            Teams
          </Button>
          <Button variant="outlined" size="small" startIcon={<LogoutIcon />} onClick={handleLogout} color="inherit">
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {allLabels.length > 0 && (
        <Box sx={{ px: 3, py: 1, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Labels:</Typography>
            <Chip
              label="All"
              size="small"
              onClick={() => setFilterLabel(null)}
              color={filterLabel === null ? 'primary' : 'default'}
              variant={filterLabel === null ? 'filled' : 'outlined'}
            />
            {allLabels.map(l => (
              <Chip
                key={l}
                label={l}
                size="small"
                onClick={() => setFilterLabel(filterLabel === l ? null : l)}
                color={filterLabel === l ? 'primary' : 'default'}
                variant={filterLabel === l ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowX: 'auto', p: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: 300 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" mt={2}>Loading your board…</Typography>
          </Stack>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Stack direction="row" spacing={2.5} alignItems="flex-start" sx={{ minWidth: 'max-content' }}>
              {COLUMNS.map(col => (
                <BoardColumn
                  key={col}
                  status={col}
                  tasks={filtered.filter(t => t.status === col)}
                  onAddTask={s => setCreateDialogStatus(s)}
                  onTaskClick={t => setEditTask(t)}
                />
              ))}
            </Stack>
          </DragDropContext>
        )}
      </Box>

      <CreateTaskDialog
        open={createDialogStatus !== null}
        defaultStatus={createDialogStatus ?? 'todo'}
        teamId={selectedTeamId}
        teamName={teams.find(team => team.id === selectedTeamId)?.name ?? null}
        teamMembers={teamMembers}
        onClose={() => setCreateDialogStatus(null)}
        onSubmit={handleCreate}
      />

      <TaskDetailDialog
        task={editTask}
        teamMembers={teamMembers}
        currentUserId={currentUser?.id ?? null}
        onClose={() => setEditTask(null)}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onTaskChange={handleTaskChange}
      />

      <TeamManagerDialog
        open={teamsDialogOpen}
        teams={teams}
        members={selectedTeamMembers}
        selectedTeamId={selectedTeamId}
        onClose={() => setTeamsDialogOpen(false)}
        onSelectTeam={setSelectedTeamId}
        onCreateTeam={handleCreateTeam}
        onDeleteTeam={handleDeleteTeam}
        onAddMember={handleAddTeamMember}
        onUpdateMemberRole={handleUpdateTeamMemberRole}
        onRemoveMember={handleRemoveTeamMember}
      />
    </Box>
  );
}
