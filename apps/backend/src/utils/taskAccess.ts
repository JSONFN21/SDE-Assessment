import type { TeamMember, TeamRole } from '@prisma/client';
import { prisma } from '../db';

export async function getTeamMembership(userId: string, teamId: string): Promise<TeamMember | null> {
  return prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });
}

export function canManageTeam(role: TeamRole | undefined): boolean {
  return role === 'OWNER';
}

export function canEditTeamTask(role: TeamRole | undefined): boolean {
  return role === 'OWNER' || role === 'MEMBER';
}

export function canViewTeamTask(role: TeamRole | undefined): boolean {
  return role === 'OWNER' || role === 'MEMBER' || role === 'VIEWER';
}

export function canCommentOnTask(role: TeamRole | undefined): boolean {
  return canViewTeamTask(role);
}

export function parseDateInput(dateValue: string | null | undefined): Date | null | undefined {
  if (dateValue === undefined) return undefined;
  if (dateValue === null || dateValue === '') return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0));
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}