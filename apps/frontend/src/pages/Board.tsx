import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import BoardColumn from '../components/board/BoardColumn';
import CreateTaskDialog from '../components/board/CreateTaskDialog';
import TaskDetailDialog from '../components/board/TaskDetailDialog';
import TeamManagerDialog from '../components/board/TeamManagerDialog';
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
  type UpdateTaskInput,
} from '../services/tasksApi';
import { getMe, getTeamMembers, type AuthUser } from '../services/authApi';
import {
  addTeamMember,
  createTeam,
  deleteTeam,
  fetchTeamMembers,
  fetchTeams,
  removeTeamMember,
  updateTeamMember,
  type Team,
  type TeamMember,
  type TeamRole,
} from '../services/teamsApi';

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];
const PROFILE_ANIMALS = ['\u{1F436}', '\u{1F431}', '\u{1F98A}', '\u{1F43C}', '\u{1F438}', '\u{1F435}', '\u{1F43B}', '\u{1F428}'];

function parseDueDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const datePart = dateValue.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function getProfileAnimal(seed: string | null | undefined): string {
  if (!seed) return PROFILE_ANIMALS[0];

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  return PROFILE_ANIMALS[Math.abs(hash) % PROFILE_ANIMALS.length];
}

function getLoadErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return 'Could not reach the server. If your Render backend was asleep, wait a few seconds and refresh.';
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    return message.length > 0 ? message : 'Failed to load tasks';
  }

  return 'Failed to load tasks';
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
      setSelectedTeamMembers(selectedTeamId ? (members as TeamMember[]) : []);
      setTeamMembers(
        selectedTeamId
          ? (members as TeamMember[]).map(member => member.user)
          : [meResponse?.user, ...(members as AuthUser[])]
              .filter((user): user is AuthUser => Boolean(user))
              .filter((user, index, array) => array.findIndex(candidate => candidate.id === user.id) === index),
      );
    } catch (error) {
      setError(getLoadErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login', { replace: true });
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as TaskStatus;
    setTasks(prev => prev.map(task => (task.id === draggableId ? { ...task, status: newStatus } : task)));
    try {
      const updated = await updateTask(draggableId, { status: newStatus });
      setTasks(prev => prev.map(task => (task.id === draggableId ? updated : task)));
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
    setTasks(prev => prev.map(task => (task.id === id ? updated : task)));
    setEditTask(updated);
    return updated;
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const handleTaskChange = (task: Task) => {
    setTasks(prev => prev.map(item => (item.id === task.id ? task : item)));
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

  const allLabels = [...new Set(tasks.flatMap(task => (Array.isArray(task.labels) ? task.labels : [])))];

  const filtered = tasks.filter(task => {
    const labels = Array.isArray(task.labels) ? task.labels : [];
    const title = typeof task.title === 'string' ? task.title : '';
    const description = typeof task.description === 'string' ? task.description : '';
    const matchSearch =
      !search ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      description.toLowerCase().includes(search.toLowerCase());
    const matchLabel = !filterLabel || labels.includes(filterLabel);
    return matchSearch && matchLabel;
  });

  const total = tasks.length;
  const completed = tasks.filter(task => task.status === 'done').length;
  const overdue = tasks.filter(task => {
    if (!task.dueDate || task.status === 'done') return false;
    const dueDate = parseDueDate(task.dueDate);
    if (!dueDate) return false;
    return dueDate < new Date(new Date().toDateString());
  }).length;
  const profileEmoji = getProfileAnimal(currentUser?.username ?? currentUser?.email ?? null);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <Toolbar
          sx={{
            gap: 2,
            alignItems: { xs: 'stretch', md: 'center' },
            flexWrap: 'wrap',
            px: { xs: 2, sm: 3 },
            py: { xs: 1.5, md: 1 },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: '100%', minWidth: 0, gap: 2 }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              useFlexGap
              sx={{ minWidth: 0, flexWrap: 'wrap' }}
            >
              <Typography variant="h6" fontWeight={800} color="primary">
                TaskBoard
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`${total} total`} size="small" variant="outlined" />
                <Chip label={`${completed} done`} size="small" color="success" variant="outlined" />
                {overdue > 0 && <Chip label={`${overdue} overdue`} size="small" color="error" variant="outlined" />}
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexShrink: 0 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {profileEmoji}
              </Box>
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.primary"
                sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {currentUser?.username ?? currentUser?.email ?? 'Profile'}
              </Typography>
            </Stack>
          </Stack>

          <Box sx={{ flex: { xs: '1 1 100%', md: 1 } }} />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.25}
            sx={{
              width: { xs: '100%', xl: 'auto' },
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: { md: 'flex-end' },
              flexWrap: 'wrap',
            }}
          >
            <TextField
              select
              size="small"
              value={selectedTeamId ?? '__personal__'}
              onChange={event => setSelectedTeamId(event.target.value === '__personal__' ? null : event.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 220 }, flex: { sm: '0 0 auto' } }}
            >
              <MenuItem value="__personal__">Personal Board</MenuItem>
              {teams.map(team => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              placeholder="Search tasks..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              sx={{ width: { xs: '100%', sm: 260 }, flex: { sm: '1 1 260px' } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogStatus('todo')}
                sx={{ flex: { xs: 1, sm: '0 0 auto' } }}
              >
                New Task
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setTeamsDialogOpen(true)}
                sx={{ flex: { xs: 1, sm: '0 0 auto' } }}
              >
                Teams
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                color="inherit"
                sx={{ flex: { xs: 1, sm: '0 0 auto' } }}
              >
                Logout
              </Button>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>

      {allLabels.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3 }, py: 1, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Labels:
            </Typography>
            <Chip
              label="All"
              size="small"
              onClick={() => setFilterLabel(null)}
              color={filterLabel === null ? 'primary' : 'default'}
              variant={filterLabel === null ? 'filled' : 'outlined'}
            />
            {allLabels.map(label => (
              <Chip
                key={label}
                label={label}
                size="small"
                onClick={() => setFilterLabel(filterLabel === label ? null : label)}
                color={filterLabel === label ? 'primary' : 'default'}
                variant={filterLabel === label ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowX: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ height: 300 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Loading your board...
            </Typography>
          </Stack>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Box
              sx={{
                display: 'grid',
                gap: { xs: 1.5, sm: 2.5 },
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
                alignItems: 'start',
              }}
            >
              {COLUMNS.map(column => (
                <BoardColumn
                  key={column}
                  status={column}
                  tasks={filtered.filter(task => task.status === column)}
                  onAddTask={status => setCreateDialogStatus(status)}
                  onTaskClick={task => setEditTask(task)}
                />
              ))}
            </Box>
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
