import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, MenuItem, Chip, Box, Typography,
  IconButton, Autocomplete, Checkbox, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Task, UpdateTaskInput, TaskStatus, TaskPriority, Subtask } from '../../services/tasksApi';
import type { AuthUser } from '../../services/authApi';
import {
  addSubtask,
  addTaskComment,
  deleteSubtask,
  deleteTaskComment,
  fetchTask,
  updateSubtask,
} from '../../services/tasksApi';

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

type Props = {
  task: Task | null;
  teamMembers: AuthUser[];
  currentUserId: string | null;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateTaskInput) => Promise<Task>;
  onDelete: (id: string) => Promise<void>;
  onTaskChange: (task: Task) => void;
};

export default function TaskDetailDialog({ task, teamMembers, currentUserId, onClose, onUpdate, onDelete, onTaskChange }: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>((task?.status ?? 'todo') as TaskStatus);
  const [priority, setPriority] = useState<TaskPriority>((task?.priority ?? 'normal') as TaskPriority);
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : '');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState<string[]>(task?.labels ?? []);
  const [assignees, setAssignees] = useState<string[]>(task?.assignees ?? []);
  const [commentInput, setCommentInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus((task?.status ?? 'todo') as TaskStatus);
    setPriority((task?.priority ?? 'normal') as TaskPriority);
    setDueDate(task?.dueDate ? task.dueDate.slice(0, 10) : '');
    setLabelInput('');
    setLabels(task?.labels ?? []);
    setAssignees(task?.assignees ?? []);
    setCommentInput('');
    setSubtaskInput('');
    setError(null);
  }, [task]);

  if (!task) return null;

  const addLabel = () => {
    const l = labelInput.trim();
    if (l && !labels.includes(l)) setLabels(prev => [...prev, l]);
    setLabelInput('');
  };
  const removeLabel = (l: string) => setLabels(prev => prev.filter(x => x !== l));

  const refreshTask = async () => {
    const refreshed = await fetchTask(task.id);
    onTaskChange(refreshed);
  };

  const applyTask = (nextTask: Task) => {
    onTaskChange(nextTask);
    setCommentInput('');
    setSubtaskInput('');
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      const updated = await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || null,
        labels,
        assignees,
      });
      applyTask(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(task.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    setWorking(true);
    try {
      const updated = await addTaskComment(task.id, { content: commentInput.trim() });
      applyTask(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add comment');
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setWorking(true);
    try {
      await deleteTaskComment(task.id, commentId);
      await refreshTask();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete comment');
    } finally {
      setWorking(false);
    }
  };

  const handleAddSubtask = async () => {
    if (!subtaskInput.trim()) return;
    setWorking(true);
    try {
      const updated = await addSubtask(task.id, { title: subtaskInput.trim() });
      applyTask(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add subtask');
    } finally {
      setWorking(false);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    setWorking(true);
    try {
      const updated = await updateSubtask(task.id, subtask.id, { completed: !subtask.completed });
      applyTask(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update subtask');
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    setWorking(true);
    try {
      await deleteSubtask(task.id, subtaskId);
      await refreshTask();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete subtask');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={!!task} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography fontWeight={700} fontSize={18}>Edit Task</Typography>
          <Typography variant="body2" color="text.secondary">
            {task.team ? `Shared in ${task.team.name}` : 'Personal task'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && (
            <Typography color="error" variant="body2" sx={{ background: '#fef2f2', p: 1.5, borderRadius: 2 }}>
              {error}
            </Typography>
          )}
          <TextField label="Title" value={title} onChange={e => { setTitle(e.target.value); setError(null); }} fullWidth required size="small" />
          <TextField label="Description" value={description} onChange={e => setDescription(e.target.value)} fullWidth multiline rows={3} size="small" />
          <Stack direction="row" spacing={2}>
            <TextField select label="Status" value={status} onChange={e => setStatus(e.target.value as TaskStatus)} size="small" sx={{ flex: 1 }}>
              {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            <TextField select label="Priority" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} size="small" sx={{ flex: 1 }}>
              {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} />
          <Autocomplete
            multiple
            size="small"
            options={teamMembers.map(member => member.username)}
            value={assignees}
            onChange={(_, value) => setAssignees(value)}
            renderInput={(params) => <TextField {...params} label="Assigned Team Members" placeholder="Select members" />}
          />
          <Box>
            <Stack direction="row" spacing={1} mb={1}>
              <TextField label="Add Label" value={labelInput} onChange={e => setLabelInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }} size="small" sx={{ flex: 1 }} />
              <Button variant="outlined" onClick={addLabel} size="small" sx={{ minWidth: 36, px: 1 }}>
                <AddIcon fontSize="small" />
              </Button>
            </Stack>
            {labels.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {labels.map(l => <Chip key={l} label={l} size="small" onDelete={() => removeLabel(l)} />)}
              </Stack>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography fontWeight={700} mb={1}>Subtasks</Typography>
            <Stack direction="row" spacing={1} mb={1}>
              <TextField
                label="Add Subtask"
                value={subtaskInput}
                onChange={event => setSubtaskInput(event.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={handleAddSubtask} disabled={working}>Add</Button>
            </Stack>
            <Stack spacing={1}>
              {task.subtasks.length === 0 && (
                <Typography variant="body2" color="text.secondary">No subtasks yet.</Typography>
              )}
              {task.subtasks.map(subtask => (
                <Stack key={subtask.id} direction="row" alignItems="center" spacing={1}>
                  <Checkbox checked={subtask.completed} onChange={() => handleToggleSubtask(subtask)} />
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ textDecoration: subtask.completed ? 'line-through' : 'none' }}>
                      {subtask.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Created by {subtask.createdBy ? `@${subtask.createdBy.username}` : 'unknown user'}
                      {subtask.updatedBy ? ` | Last updated by @${subtask.updatedBy.username}` : ''}
                    </Typography>
                  </Box>
                  <Button color="error" onClick={() => handleDeleteSubtask(subtask.id)}>Remove</Button>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography fontWeight={700} mb={1}>Comments</Typography>
            <Stack spacing={1.5} mb={1.5}>
              {task.comments.length === 0 && (
                <Typography variant="body2" color="text.secondary">No comments yet.</Typography>
              )}
              {task.comments.map(comment => (
                <Box key={comment.id} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography fontWeight={600} variant="body2">@{comment.user.username}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(comment.createdAt).toLocaleString()}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    Posted by @{comment.user.username}
                  </Typography>
                  <Typography variant="body2" mb={0.5}>{comment.content}</Typography>
                  {(comment.user.id === currentUserId || task.userId === currentUserId) && (
                    <Button color="error" size="small" onClick={() => handleDeleteComment(comment.id)}>Delete</Button>
                  )}
                </Box>
              ))}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Add Comment"
                value={commentInput}
                onChange={event => setCommentInput(event.target.value)}
                size="small"
                multiline
                maxRows={3}
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={handleAddComment} disabled={working}>Post</Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={handleDelete}
          disabled={deleting || saving}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} disabled={saving} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
