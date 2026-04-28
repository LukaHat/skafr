# skafr

Opinionated, production-grade CLI scaffolding tool for Express and TypeScript projects.

Stop wasting time setting up the same folder structure, auth system, and boilerplate on every new project. `skafr init` gets you a working Express + TypeScript project in seconds. `skafr add` generates typed resource slices that follow your conventions.

---

## Installation

```bash
npm install -g skafr
```

Or use without installing:

```bash
npx skafr init my-app
```

---

## Quick Start

```bash
skafr init my-app
cd my-app
npm run dev
```

---

## Commands

### `skafr init <project-name>`

Scaffolds a full Express + TypeScript project with an opinionated folder structure, base files, and AI context files.

```bash
skafr init my-app
skafr init my-app --no-auth
```

**Flags:**

| Flag              | Default      | Description               |
| ----------------- | ------------ | ------------------------- |
| `--stack <stack>` | `express`    | Stack to use (`express`)  |
| `--orm <orm>`     | `sequelize`  | ORM to use (`sequelize`)  |
| `--db <db>`       | `postgres`   | Database (`postgres`)     |
| `--no-auth`       | auth enabled | Skip JWT auth scaffolding |

**Generated structure:**

```
my-app/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middlewares/
│   ├── repositories/
│   ├── utils/
│   │   ├── errors.ts
│   │   ├── helpers.ts
│   │   └── successResponses.ts
│   ├── constants/
│   │   └── appConstants.ts
│   ├── di/
│   │   ├── TYPES.ts
│   │   └── inversify.config.ts
│   ├── apiRouter.ts
│   ├── app.ts
│   ├── config.ts
│   └── server.ts
├── AGENTS.md
├── CLAUDE.md -> AGENTS.md
├── .env.example
├── .skafrc
├── package.json
└── tsconfig.json
```

When `--auth` is enabled (default), also generates:

```
src/
├── types.ts
├── models/userModel.ts
├── middlewares/authMiddleware.ts
├── controllers/authController.ts
└── routes/authRouter.ts
```

---

### `skafr add <resource>`

Generates a typed resource slice — model, controller, repository, and router — and auto-registers the route in `apiRouter.ts`.

```bash
skafr add user
skafr add post --crud
skafr add comment --force
```

**Flags:**

| Flag      | Default | Description                                           |
| --------- | ------- | ----------------------------------------------------- |
| `--crud`  | off     | Pre-fill CRUD method stubs with typed implementations |
| `--force` | off     | Overwrite existing files                              |

**Generated files:**

```
src/
├── models/userModel.ts
├── controllers/userController.ts
├── repositories/userRepository.ts
└── routes/userRouter.ts
```

`apiRouter.ts` is automatically updated:

```typescript
import userRouter from "./routes/userRouter";
apiRouter.use("/users", userRouter);
```

---

## Configuration

skafr reads `.skafrc` in your project root. It is generated automatically by `skafr init`.

```json
{
  "stack": "express",
  "srcDir": "./src",
  "orm": "sequelize",
  "db": "postgres",
  "auth": true
}
```

---

## AI Context Files

Every project scaffolded by skafr includes `AGENTS.md` at the root — an opinionated context file that describes the project structure, naming conventions, and architecture patterns. AI coding tools like Claude and Cursor read this file to understand your project.

`CLAUDE.md` is a symlink to `AGENTS.md` for Claude-specific tooling compatibility.

---

## Stack

- **Runtime:** Node.js 22+
- **Framework:** Express
- **Language:** TypeScript
- **DI:** Inversify
- **Auth:** JWT + Argon2
- **ORM:** Sequelize
- **Database:** PostgreSQL

---

## License

MIT
