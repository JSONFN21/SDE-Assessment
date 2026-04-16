import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, Chip, Stack, Tooltip, Typography } from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { format, isPast, isToday } from 'date-fns';
import type { Task } from '../../services/tasksApi';

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  normal: '#f59e0b',
  low: '#10b981',
};

const LABEL_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#3b82f6', '#f97316',
];

function labelColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

function parseDueDate(dateValue: string | null): Date | null {
  if (!dateValue) return null;
  const datePart = dateValue.slice(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

type Props = {
  task: Task;
  index: number;
  onClick: (task: Task) => void;
};

export default function TaskCard({ task, index, onClick }: Props) {
  const due = parseDueDate(task.dueDate);
  const isOverdue = due && isPast(due) && !isToday(due) && task.status !== 'done';
  const isDueToday = due && isToday(due) && task.status !== 'done';
  const assignees = Array.isArray(task.assignees) ? task.assignees : [];

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          elevation={snapshot.isDragging ? 6 : 0}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
            cursor: 'pointer',
            transition: 'box-shadow 0.15s, border-color 0.15s',
            background: snapshot.isDragging ? '#f0f5ff' : '#fff',
            '&:hover': { borderColor: 'primary.light', boxShadow: 2 },
            mb: 1.5,
          }}
        >
          <CardContent sx={{ p: '12px 14px !important' }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4, flex: 1, pr: 0.5 }}>
                  {task.title}
                </Typography>
                <Tooltip title={`Priority: ${task.priority}`}>
                  <FlagIcon sx={{ fontSize: 16, color: PRIORITY_COLORS[task.priority] ?? '#94a3b8', mt: 0.2 }} />
                </Tooltip>
              </Stack>

              {task.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                >
                  {task.description}
                </Typography>
              )}

              {task.labels.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {task.labels.map(label => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: labelColor(label), color: '#fff' }}
                    />
                  ))}
                </Stack>
              )}

              {assignees.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  {assignees.slice(0, 2).map(name => (
                    <Chip
                      key={name}
                      label={`@${name}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  ))}
                  {assignees.length > 2 && (
                    <Chip
                      label={`+${assignees.length - 2}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: 10 }}
                    />
                  )}
                </Stack>
              )}

              {due && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <CalendarTodayIcon
                    sx={{ fontSize: 12, color: isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : '#94a3b8' }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: isOverdue ? '#ef4444' : isDueToday ? '#f59e0b' : '#64748b', fontWeight: isOverdue || isDueToday ? 600 : 400 }}
                  >
                    {isOverdue ? 'Overdue - ' : isDueToday ? 'Due today - ' : ''}
                    {format(due, 'MMM d')}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
