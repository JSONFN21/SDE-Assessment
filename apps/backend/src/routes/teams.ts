import express, { Request, Response } from 'express';
import { TeamRole } from '@prisma/client';
import { prisma } from '../db';
import { authMiddleware } from '../middleware/auth';
import { canManageTeam, canViewTeamTask, getTeamMembership } from '../utils/taskAccess';

const router = express.Router();

router.use(authMiddleware);

function getTeamId(params: Request['params']): string | null {
  const value = params.teamId ?? params.id;
  if (typeof value !== 'string' || !value.trim()) return null;
  return value;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'asc' },
      include: {
        team: {
          include: {
            owner: {
              select: { id: true, username: true, email: true },
            },
            _count: {
              select: { members: true, tasks: true },
            },
          },
        },
      },
    });

    const teams = memberships.map(membership => ({
      id: membership.team.id,
      name: membership.team.name,
      description: membership.team.description,
      role: membership.role,
      owner: membership.team.owner,
      memberCount: membership.team._count.members,
      taskCount: membership.team._count.tasks,
      createdAt: membership.team.createdAt,
      updatedAt: membership.team.updatedAt,
    }));

    res.json({ teams });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';

    if (!name) {
      res.status(400).json({ error: 'Team name is required' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        name,
        description: description || null,
        ownerId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            role: TeamRole.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        _count: {
          select: { members: true, tasks: true },
        },
      },
    });

    res.status(201).json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        role: TeamRole.OWNER,
        owner: team.owner,
        memberCount: team._count.members,
        taskCount: team._count.tasks,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to create team', details });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req.params);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : undefined;

    if (!teamId) {
      res.status(400).json({ error: 'Invalid team id' });
      return;
    }

    const membership = await getTeamMembership(req.userId!, teamId);
    if (!membership || !canManageTeam(membership.role)) {
      res.status(403).json({ error: 'You do not have permission to update this team' });
      return;
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
      },
      include: {
        owner: {
          select: { id: true, username: true, email: true },
        },
        _count: {
          select: { members: true, tasks: true },
        },
      },
    });

    res.json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        role: membership.role,
        owner: team.owner,
        memberCount: team._count.members,
        taskCount: team._count.tasks,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req.params);
    if (!teamId) {
      res.status(400).json({ error: 'Invalid team id' });
      return;
    }

    const membership = await getTeamMembership(req.userId!, teamId);
    if (!membership || !canManageTeam(membership.role)) {
      res.status(403).json({ error: 'You do not have permission to delete this team' });
      return;
    }

    await prisma.team.delete({ where: { id: teamId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

router.get('/:teamId/members', async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req.params);
    if (!teamId) {
      res.status(400).json({ error: 'Invalid team id' });
      return;
    }

    const membership = await getTeamMembership(req.userId!, teamId);
    if (!membership || !canViewTeamTask(membership.role)) {
      res.status(403).json({ error: 'You do not have access to this team' });
      return;
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.json({
      members: members.map(member => ({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        user: member.user,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

router.post('/:teamId/members', async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req.params);
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const roleInput = typeof req.body?.role === 'string' ? req.body.role.toUpperCase() : TeamRole.MEMBER;
    const role = Object.values(TeamRole).includes(roleInput as TeamRole) ? (roleInput as TeamRole) : TeamRole.MEMBER;

    if (!teamId) {
      res.status(400).json({ error: 'Invalid team id' });
      return;
    }
    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const membership = await getTeamMembership(req.userId!, teamId);
    if (!membership || !canManageTeam(membership.role)) {
      res.status(403).json({ error: 'You do not have permission to manage this team' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: user.id,
        role,
      },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.status(201).json({
      member: {
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        user: member.user,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to add team member', details });
  }
});

router.patch('/:teamId/members/:memberId', async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req.params);
    const { memberId } = req.params;
    const roleInput = typeof req.body?.role === 'string' ? req.body.role.toUpperCase() : '';
    const role = Object.values(TeamRole).includes(roleInput as TeamRole) ? (roleInput as TeamRole) : null;

    if (!teamId || typeof memberId !== 'string' || !memberId) {
      res.status(400).json({ error: 'Invalid team member id' });
      return;
    }
    if (!role) {
      res.status(400).json({ error: 'Valid role is required' });
      return;
    }

    const membership = await getTeamMembership(req.userId!, teamId);
    if (!membership || !canManageTeam(membership.role)) {
      res.status(403).json({ error: 'You do not have permission to manage this team' });
      return;
    }

    const target = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!target || target.teamId !== teamId) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    if (target.userId === req.userId) {
      res.status(400).json({ error: 'Use team settings to manage the owner account' });
      return;
    }

    const member = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.json({
      member: {
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        user: member.user,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

router.delete('/:teamId/members/:memberId', async (req: Request, res: Response) => {
  try {
    const teamId = getTeamId(req.params);
    const { memberId } = req.params;

    if (!teamId || typeof memberId !== 'string' || !memberId) {
      res.status(400).json({ error: 'Invalid team member id' });
      return;
    }

    const membership = await getTeamMembership(req.userId!, teamId);
    if (!membership || !canManageTeam(membership.role)) {
      res.status(403).json({ error: 'You do not have permission to manage this team' });
      return;
    }

    const target = await prisma.teamMember.findUnique({ where: { id: memberId } });
    if (!target || target.teamId !== teamId) {
      res.status(404).json({ error: 'Team member not found' });
      return;
    }
    if (target.userId === req.userId) {
      res.status(400).json({ error: 'Team owners cannot remove themselves from the team' });
      return;
    }

    await prisma.teamMember.delete({ where: { id: memberId } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

export default router;