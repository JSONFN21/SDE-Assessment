## TaskBoard - Simple Setup Guide

This project is a team task board.
Think of it like a shared to-do app where:

- each person has a personal board,
- teams can have shared boards,
- tasks can have comments and subtasks,
- and you can track who did what.

## Before you start (requirements)

Make sure these are installed first:

1. **Node.js** (recommended: version 20 or newer)
2. **npm** (comes with Node.js)
3. **Docker Desktop** (must be running before `npm run db:up`)
4. **Git** (optional, but helpful for cloning and version control)


## What is in this project?

There are 3 main parts:

1. Frontend (what you see in the browser)
2. Backend (the API that handles login, tasks, teams, and permissions)
3. Database (PostgreSQL, where all data is stored)

In this repo:

- `apps/frontend` = the website (React + Vite)
- `apps/backend` = the server (Express + Prisma)
- `docker-compose.yml` = starts the local PostgreSQL database

## What can the app do?

- Register and log in users
- Create personal tasks
- Create teams and invite members
- Create shared team tasks
- Add comments on tasks
- Add subtasks on tasks
- Show usernames for team actions (for example, who posted a comment)
- Move tasks across columns (To Do, In Progress, In Review, Done)

## Setup story: from zero to running app

Imagine this is your first time opening the project.
Here is the exact order to run things.

### Step 1: Install packages

```bash
npm install
```

This downloads everything both frontend and backend need.

### Step 2: Start the database

```bash
npm run db:up
```

Now PostgreSQL is running in Docker.

### Step 3: Create/update database tables

```bash
npm run prisma:migrate -w apps/backend
npm run prisma:generate
```

First command applies database changes.
Second command updates Prisma client code used by the backend.

### Step 4: Start backend server

Open terminal #1:

```bash
npm run dev:backend
```

Backend should run on:

- `http://localhost:5000`

You can test it quickly:

- `http://localhost:5000/health`

### Step 5: Start frontend app

Open terminal #2:

```bash
npm run dev:frontend
```

Usually frontend runs on:

- `http://localhost:5173`

If 5173 is busy, Vite may choose another port like 5174, 5175, or 5177.
Use the URL printed in the terminal.

## Everyday commands

- Start backend: `npm run dev:backend`
- Start frontend: `npm run dev:frontend`
- Frontend lint + build check: `npm run verify:frontend`
- Stop database: `npm run db:down`
- Reset database (delete all local data): `npm run db:reset`


