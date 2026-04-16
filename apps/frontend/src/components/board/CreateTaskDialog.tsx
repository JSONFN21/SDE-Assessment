import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Stack, MenuItem, Chip, Box, Typography, Alert,
  IconButton, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import type { CreateTaskInput, TaskStatus, TaskPriority } from '../../services/tasksApi';
import type { AuthUser } from '../../services/authApi';

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
  open: boolean;
  defaultStatus?: TaskStatus;
  teamId?: string | null;
  teamName?: string | null;
  teamMembers: AuthUser[];
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
};

export default function CreateTaskDialog({ open, defaultStatus = 'todo', teamId = null, teamName = null, teamMembers, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle(''); setDescription(''); setStatus(defaultStatus); setPriority('normal');
    setDueDate(''); setLabelInput(''); setLabels([]); setAssignees([]); setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const addLabel = () => {
    const l = labelInput.trim();
    if (l && !labels.includes(l)) setLabels(prev => [...prev, l]);
    setLabelInput('');
  };

  const removeLabel = (l: string) => setLabels(prev => prev.filter(x => x !== l));

  const handleSubmit = async () => {
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        dueDate: dueDate || null,
        labels,
        assignees,
        teamId,
      });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontWeight={700} fontSize={18}>{teamName ? `New Task in ${teamName}` : 'New Personal Task'}</Typography>
        <IconButton size="small" onClick={handleClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label="Title"
            value={title}
            onChange={e => { setTitle(e.target.value); setError(null); }}
            fullWidth
            required
            size="small"
          />
          <TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
            size="small"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Status"
              value={status}
              onChange={e => setStatus(e.target.value as TaskStatus)}
              size="small"
              sx={{ flex: 1 }}
            >
              {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            <TextField
              select
              label="Priority"
              value={priority}
              onChange={e => setPriority(e.target.value as TaskPriority)}
              size="small"
              sx={{ flex: 1 }}
            >
              {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField
            label="Due Date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Autocomplete
            multiple
            size="small"
            options={teamMembers.map(member => member.username)}
            value={assignees}
            onChange={(_, value) => setAssignees(value)}
            renderInput={(params) => <TextField {...params} label="Assign Team Members" placeholder="Select members" />}
          />
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={1}>
              <TextField
                label="Add Label"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={addLabel} size="small" sx={{ minWidth: { xs: '100%', sm: 36 }, px: 1 }}>
                <AddIcon fontSize="small" />
              </Button>
            </Stack>
            {labels.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {labels.map(l => (
                  <Chip key={l} label={l} size="small" onDelete={() => removeLabel(l)} />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose} disabled={loading} color="inherit">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating…' : 'Create Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
