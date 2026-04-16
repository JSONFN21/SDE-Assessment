import { Droppable } from '@hello-pangea/dnd';
import { Box, Stack, Typography, IconButton, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskCard from './TaskCard';
import type { Task, TaskStatus } from '../../services/tasksApi';

const COLUMN_META: Record<TaskStatus, { label: string; accent: string; bg: string }> = {
  todo:        { label: 'To Do',       accent: '#6366f1', bg: '#f5f5ff' },
  in_progress: { label: 'In Progress', accent: '#f59e0b', bg: '#fffbeb' },
  in_review:   { label: 'In Review',   accent: '#3b82f6', bg: '#eff6ff' },
  done:        { label: 'Done',        accent: '#10b981', bg: '#f0fdf4' },
};

type Props = {
  status: TaskStatus;
  tasks: Task[];
  onAddTask: (status: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
};

export default function BoardColumn({ status, tasks, onAddTask, onTaskClick }: Props) {
  const meta = COLUMN_META[status];

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        background: meta.bg,
        border: '1px solid',
        borderColor: `${meta.accent}22`,
        overflow: 'hidden',
        minHeight: { xs: 320, sm: 400 },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: `${meta.accent}22` }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: meta.accent }} />
          <Typography fontSize={13} fontWeight={700} color="text.primary">{meta.label}</Typography>
          <Chip label={tasks.length} size="small" sx={{ height: 18, fontSize: 11, bgcolor: `${meta.accent}22`, color: meta.accent, fontWeight: 700 }} />
        </Stack>
        <IconButton size="small" onClick={() => onAddTask(status)} sx={{ color: meta.accent }}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              p: 1.5,
              minHeight: 100,
              background: snapshot.isDraggingOver ? `${meta.accent}0d` : 'transparent',
              transition: 'background 0.15s',
            }}
          >
            {tasks.map((task, idx) => (
              <TaskCard key={task.id} task={task} index={idx} onClick={onTaskClick} />
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>
    </Box>
  );
}
