export const taskDetailsInclude = {
  user: {
    select: {
      id: true,
      username: true,
      email: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      description: true,
    },
  },
  comments: {
    orderBy: {
      createdAt: 'asc' as const,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  },
  subtasks: {
    orderBy: {
      createdAt: 'asc' as const,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
    },
  },
} as const;