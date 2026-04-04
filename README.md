# Todo App Project Setup
Frontend: http://localhost:5173<br>
Backend:  http://localhost:5000<br>
Postgres: localhost:5432<br>

## Prereqs
- Node.js, npm, git, docker desktop
- Docker Desktop should be open before running DB commands

## Connect to local repo
Assuming you have already run git init locally:<br>
- git remote add origin https://github.com/jeannamatthews-classes/group-project-emr-pa.git<br>
- git pull origin main
- git checkout main
- npm install

### start up project
- npm run db:up (starts Postgres container)
    - When to do this: at the start of each dev session if DB is not already running

- Create a .env file in apps/backend and copy values from .env.template
    - When to do this: first-time setup only (or whenever env values change)
    - .env should never be pushed to github, always push template only

- navigate to apps/backend
- run npx prisma generate
    - When to do this: first setup and after schema changes
- run npm run prisma:migrate
    - When to do this: first setup and whenever new migrations exist

- go back to root (../..)
- run npm run dev:frontend to start frontend
- in a second terminal (from root), run npm run dev:backend to start backend
    - Keep both terminals running while developing
