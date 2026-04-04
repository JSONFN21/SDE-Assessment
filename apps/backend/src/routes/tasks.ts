import express, { Request, Response } from 'express';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { taskDetailsInclude } from '../utils/taskPayload';
import {
  canCommentOnTask,
  canEditTeamTask,
  canManageTeam,
  canViewTeamTask,
  getTeamMembership,
  parseDateInput,
} from '../utils/taskAccess';

const router = express.Router();

router.use(authMiddleware);

function getTaskId(params: Request['params']): string | null {
  const value = params.id;
  if (typeof value !== 'string' || !value.trim()) return null;
  return value;
}

function getQueryString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

async function validateTaskAccess(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskDetailsInclude,
  });

  if (!task) {
    return { error: 'Task not found' as const };
  }

  if (!task.teamId) {
    if (task.userId !== userId) {
      return { error: 'Task not found' as const };
    }

    return { task, membershipRole: undefined };
  }

  const membership = await getTeamMembership(userId, task.teamId);
  if (!membership || !canViewTeamTask(membership.role)) {
    return { error: 'Task not found' as const };
  }

  return { task, membershipRole: membership.role };
}

async function validateAssigneesInput(rawAssignees: unknown): Promise<{ assignees?: string[]; error?: string }> {
  if (rawAssignees === undefined) {
    return {};
  }

  if (!Array.isArray(rawAssignees)) {
    return { error: 'Assignees must be an array of usernames' };
  }

  const normalized = [...new Set(
    rawAssignees
      .filter((value): value is string => typeof value === 'string')
      .map(value => value.trim())
      .filter(Boolean),
  )];

  if (normalized.length !== rawAssignees.length) {
    return { error: 'Assignees must be an array of non-empty usernames' };
  }

  if (normalized.length === 0) {
    return { assignees: [] };
  }

  const users = await prisma.user.findMany({
    where: { username: { in: normalized } },
    select: { username: true },
  });
  const found = new Set(users.map(user => user.username));
  const invalid = normalized.filter(username => !found.has(username));

  if (invalid.length > 0) {
    return { error: `Unknown assignees: ${invalid.join(', ')}` };
  }

  return { assignees: normalized };
}

async function validateAssigneesForScope(rawAssignees: unknown, teamId: string | null): Promise<{ assignees?: string[]; error?: string }> {
  const assigneeValidation = await validateAssigneesInput(rawAssignees);
  if (assigneeValidation.error || !assigneeValidation.assignees) {
    return assigneeValidation;
  }

  if (!teamId || assigneeValidation.assignees.length === 0) {
    return assigneeValidation;
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { username: true } } },
  });
  const usernames = new Set(members.map(member => member.user.username));
  const invalid = assigneeValidation.assignees.filter(username => !usernames.has(username));

  if (invalid.length > 0) {
    return { error: `Assignees must belong to the selected team: ${invalid.join(', ')}` };
  }

  return assigneeValidation;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const teamId = getQueryString(req.query.teamId);

    if (teamId) {
      const membership = await getTeamMembership(req.userId!, teamId);
      if (!membership || !canViewTeamTask(membership.role)) {
        res.status(403).json({ error: 'You do not have access to this team' });
        return;
      }
    }

    const tasks = await prisma.task.findMany({
      where: teamId ? { teamId } : { userId: req.userId!, teamId: null },
      orderBy: { createdAt: 'asc' },
      include: taskDetailsInclude,
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    if (!id) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }

    res.json(access.task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, status, priority, dueDate, labels, assignees, teamId } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      labels?: string[];
      assignees?: string[];
      teamId?: string | null;
    };

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const normalizedTeamId = typeof teamId === 'string' && teamId.trim() ? teamId : null;
    if (normalizedTeamId) {
      const membership = await getTeamMembership(req.userId!, normalizedTeamId);
      if (!membership || !canEditTeamTask(membership.role)) {
        res.status(403).json({ error: 'You do not have permission to create tasks in this team' });
        return;
      }
    }

    const assigneeValidation = await validateAssigneesForScope(assignees, normalizedTeamId);
    if (assigneeValidation.error) {
      res.status(400).json({ error: assigneeValidation.error });
      return;
    }

    const parsedDueDate = parseDateInput(dueDate);
    if (dueDate && parsedDueDate === null) {
      res.status(400).json({ error: 'Invalid due date' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'normal',
        dueDate: parsedDueDate ?? null,
        labels: labels || [],
        assignees: assigneeValidation.assignees || [],
        userId: req.userId!,
        teamId: normalizedTeamId,
      },
      include: taskDetailsInclude,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    if (!id) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }

    if (access.task.teamId && !canEditTeamTask(access.membershipRole)) {
      res.status(403).json({ error: 'You do not have permission to edit this task' });
      return;
    }

    if (!access.task.teamId && access.task.userId !== req.userId) {
      res.status(403).json({ error: 'You do not have permission to edit this task' });
      return;
    }

    const { title, description, status, priority, dueDate, labels, assignees, teamId } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string | null;
      labels?: string[];
      assignees?: string[];
      teamId?: string | null;
    };

    let nextTeamId = access.task.teamId;
    if (teamId !== undefined) {
      nextTeamId = typeof teamId === 'string' && teamId.trim() ? teamId : null;

      if (nextTeamId) {
        const membership = await getTeamMembership(req.userId!, nextTeamId);
        if (!membership || !canEditTeamTask(membership.role)) {
          res.status(403).json({ error: 'You do not have permission to move this task to the selected team' });
          return;
        }
      }
    }

    const assigneeValidation = await validateAssigneesForScope(assignees, nextTeamId);
    if (assigneeValidation.error) {
      res.status(400).json({ error: assigneeValidation.error });
      return;
    }

    const parsedDueDate = parseDateInput(dueDate);
    if (dueDate !== undefined && dueDate !== null && dueDate !== '' && parsedDueDate === null) {
      res.status(400).json({ error: 'Invalid due date' });
      return;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: parsedDueDate ?? null }),
        ...(labels !== undefined && { labels }),
        ...(assignees !== undefined && { assignees: assigneeValidation.assignees }),
        ...(teamId !== undefined && { teamId: nextTeamId }),
      },
      include: taskDetailsInclude,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    if (!id) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }

    if (access.task.teamId) {
      if (!canEditTeamTask(access.membershipRole)) {
        res.status(403).json({ error: 'You do not have permission to delete this task' });
        return;
      }
    } else if (access.task.userId !== req.userId) {
      res.status(403).json({ error: 'You do not have permission to delete this task' });
      return;
    }

    await prisma.task.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!id) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }
    if (!content) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }

    if (access.task.teamId && !canCommentOnTask(access.membershipRole)) {
      res.status(403).json({ error: 'You do not have permission to comment on this task' });
      return;
    }

    await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: req.userId!,
        content,
      },
    });

    const task = await prisma.task.findUnique({
      where: { id },
      include: taskDetailsInclude,
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.patch('/:id/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    const { commentId } = req.params;
    const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

    if (!id || typeof commentId !== 'string' || !commentId) {
      res.status(400).json({ error: 'Invalid comment request' });
      return;
    }
    if (!content) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }

    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.taskId !== id) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const canModerate = access.task.userId === req.userId || canManageTeam(access.membershipRole);
    if (comment.userId !== req.userId && !canModerate) {
      res.status(403).json({ error: 'You do not have permission to edit this comment' });
      return;
    }

    await prisma.taskComment.update({
      where: { id: commentId },
      data: { content },
    });

    const task = await prisma.task.findUnique({
      where: { id },
      include: taskDetailsInclude,
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

router.delete('/:id/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    const { commentId } = req.params;

    if (!id || typeof commentId !== 'string' || !commentId) {
      res.status(400).json({ error: 'Invalid comment request' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }

    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.taskId !== id) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    const canModerate = access.task.userId === req.userId || canManageTeam(access.membershipRole);
    if (comment.userId !== req.userId && !canModerate) {
      res.status(403).json({ error: 'You do not have permission to delete this comment' });
      return;
    }

    await prisma.taskComment.delete({ where: { id: commentId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

router.post('/:id/subtasks', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';

    if (!id) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }
    if (!title) {
      res.status(400).json({ error: 'Subtask title is required' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }
    if (access.task.teamId && !canEditTeamTask(access.membershipRole)) {
      res.status(403).json({ error: 'You do not have permission to edit this task' });
      return;
    }

    await prisma.subtask.create({
      data: {
        taskId: id,
        title,
        createdById: req.userId!,
        updatedById: req.userId!,
      },
    });

    const task = await prisma.task.findUnique({
      where: { id },
      include: taskDetailsInclude,
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add subtask' });
  }
});

router.patch('/:id/subtasks/:subtaskId', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    const { subtaskId } = req.params;
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : undefined;
    const completed = typeof req.body?.completed === 'boolean' ? req.body.completed : undefined;

    if (!id || typeof subtaskId !== 'string' || !subtaskId) {
      res.status(400).json({ error: 'Invalid subtask request' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }
    if (access.task.teamId && !canEditTeamTask(access.membershipRole)) {
      res.status(403).json({ error: 'You do not have permission to edit this task' });
      return;
    }

    const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!subtask || subtask.taskId !== id) {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }

    await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(title !== undefined && { title }),
        ...(completed !== undefined && { completed }),
        updatedById: req.userId!,
      },
    });

    const task = await prisma.task.findUnique({
      where: { id },
      include: taskDetailsInclude,
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subtask' });
  }
});

router.delete('/:id/subtasks/:subtaskId', async (req: Request, res: Response) => {
  try {
    const id = getTaskId(req.params);
    const { subtaskId } = req.params;

    if (!id || typeof subtaskId !== 'string' || !subtaskId) {
      res.status(400).json({ error: 'Invalid subtask request' });
      return;
    }

    const access = await validateTaskAccess(id, req.userId!);
    if ('error' in access) {
      res.status(404).json({ error: access.error });
      return;
    }
    if (access.task.teamId && !canEditTeamTask(access.membershipRole)) {
      res.status(403).json({ error: 'You do not have permission to edit this task' });
      return;
    }

    const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!subtask || subtask.taskId !== id) {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }

    await prisma.subtask.delete({ where: { id: subtaskId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

export default router;
