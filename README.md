# Hiring Tool

A modern web application for tracking job interviews and managing hiring processes. Built to help job seekers organize their applications, track company information, and manage interactions with potential employers.

## 🎯 Features

- **Hiring Process Management** - Create and track multiple job applications with status tracking (ongoing, rejected, dropped-out, hired)
- **Company Information** - Store comprehensive company details including salary, benefits, location, website, and contact information
- **Interview Tracking** - Track interview sessions and interactions with companies (prepared for future implementation)
- **User Authentication** - Secure authentication with Better-Auth
- **Responsive Design** - Modern, mobile-friendly interface built with TailwindCSS and shadcn/ui

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.3.4 or higher)
- PostgreSQL database
- Node.js 18+ (if not using Bun)
- [dotenvx](https://dotenvx.com) CLI installed globally — used to sync environment variables (`curl -sfS https://dotenvx.sh | sh` or `brew install dotenvx/brew/dotenvx`)

> **Node version note**: `apps/angular-web` runs the Angular 22 CLI, which requires Node
> `>= 22.22.3` or `>= 24.15.0`. `nvm install 22 --lts` (currently 22.23.2) or `nvm use 24`
> both satisfy it. On an older Node, the root `build`, `test` and `dev` scripts fan out
> through turbo into `angular-web` and will fail with the CLI's version error.

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd hiring-tool
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

   Environment variables are managed with [dotenvx Ops](https://dotenvx.com). The committed `.env.x` file links this repo to the shared dotenvx project (via `DOTENVX_PROJECT_ID`), so you don't copy `.env.example` files by hand — you pull the real values from the cloud.

   ```bash
   # 1. Authenticate with dotenvx Ops (opens a browser to log in)
   dotenvx ops login

   # 2. Sync all .env files for the project (apps/server, apps/web, apps/mobile)
   dotenvx ops sync
   ```

   After syncing, the `.env` files are populated locally and the app is ready to run. Re-run `dotenvx ops sync` whenever the shared secrets change.

   > If you're not a member of the dotenvx project, fall back to copying each `.env.example` to `.env` (in `apps/server/`, `apps/web/`, `apps/mobile/`) and filling in your own PostgreSQL connection string and auth secrets.

4. Set up the database:

```bash
bun run db:push
```

5. Start the development servers:

```bash
bun run dev
```

The application will be available at:

- **Web App**: [http://localhost:3001](http://localhost:3001)
- **API Server**: [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
hiring-tool/
├── apps/
│   ├── web/              # Frontend application (React + TanStack Start)
│   ├── server/           # Backend API (Elysia)
│   ├── mobile/           # Mobile application (React Native + Expo)
│   ├── angular-web/      # Angular 22 client showcase (talks to the same API)
│   └── fumadocs/         # Documentation site
├── packages/
│   ├── domain/           # Domain layer — constants, schemas, types, interfaces (pure, mobile-safe)
│   ├── application/      # Application layer — use cases depending only on domain interfaces
│   ├── infra-db/         # Infrastructure — Drizzle repositories, mappers, DB schema
│   ├── infra-prisma-db/  # Infrastructure — Prisma client over the SAME tables (demo: Drizzle or Prisma)
│   ├── infra-auth/       # Infrastructure — Better-Auth configuration
│   ├── infra-env/        # Infrastructure — environment/config loading
│   ├── web-ui/           # Shared UI components (shadcn/ui, TailwindCSS)
│   └── config/           # Shared TypeScript configuration
```

The codebase follows **DDD + Hexagonal Architecture** with a layer-first package layout. The dependency rule is strict: `domain <- application <- infra-*`, and only the apps wire the layers together. See [ARCHITECTURE.md](ARCHITECTURE.md) and [CLAUDE.md](CLAUDE.md) for details.

## 🛠️ Available Scripts

### Development

- `bun run dev` - Start all applications in development mode
- `bun run dev:web` - Start only the web application
- `bun run dev:server` - Start only the server
- `bun run dev:native` - Start only the mobile application (Expo)
- `bun run dev:angular` - Start only the Angular client (`apps/angular-web`)

### Building

- `bun run build` - Build all applications for production

### Database

- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open Drizzle Studio (database GUI)
- `bun run db:generate` - Generate migration files
- `bun run db:migrate` - Run database migrations

### Prisma (parallel ORM demo)

`@interviews-tool/infra-prisma-db` exposes a Prisma client over the **same** Neon tables, to
show Drizzle and Prisma coexisting without changing anything. See its
[README](packages/infra-prisma-db/README.md).

- `bun run prisma:pull` - Introspect existing tables into `schema.prisma`
- `bun run prisma:generate` - Generate the typed Prisma client
- `bun run prisma:example` - Read the same rows via Drizzle and Prisma, side by side

### Code Quality

- `bun run check-types` - Check TypeScript types across all apps
- `bun run lint` - Lint all files with oxlint
- `bun run format` - Format all files with oxfmt
- `bun run format:tracked` - Format only tracked files (excludes untracked)
- `bun run check` - Run both lint and format (linting & formatting)

## 🚢 Deployment

### Alchemy (Cloudflare Workers)

```bash
# Development
cd apps/web && bun run dev

# Deploy
cd apps/web && bun run deploy

# Destroy
cd apps/web && bun run destroy
```

## 📚 Documentation

Comprehensive documentation is available in the `apps/fumadocs` directory:

- **Backend Patterns**: API response types, error handling, promise handlers
- **Frontend Patterns**: Data fetching, hooks, component patterns
- **Architecture**: System design and decision records
- **Features**: Implementation details for each feature

## 🏗️ Tech Stack

This project was built using the [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) template as a foundation.

### Frontend

- **React 19** - UI library
- **TanStack Start** - SSR framework with file-based routing
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching and caching
- **TanStack Form** - Form state management
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Eden Treaty** - End-to-end type-safe API client

### Backend

- **Elysia** - Type-safe, high-performance web framework
- **Bun** - JavaScript runtime and package manager
- **Drizzle ORM** - TypeScript-first SQL ORM
- **PostgreSQL** - Relational database
- **Better-Auth** - Authentication library

### Mobile

- **React Native** - Cross-platform mobile framework
- **Expo** - React Native tooling and runtime (with Expo Router)
- **Better-Auth (Expo)** - Shared authentication on mobile

### Development Tools

- **TypeScript** - Type safety
- **Turborepo** - Monorepo build system
- **Oxlint** - Fast linter
- **Oxfmt** - Code formatter
- **Husky** - Git hooks
- **Drizzle Studio** - Database GUI
- **dotenvx** - Encrypted, cloud-synced environment variables

### Architecture

- **Monorepo** - Turborepo for managing multiple packages
- **Domain-Driven Design** - Separated domain, infrastructure, and application layers
- **Type Safety** - End-to-end type safety from database to frontend

## 🙏 Credits

This project was created using the [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) template, a modern TypeScript stack that combines React, TanStack Start, Elysia, and more. Special thanks to [AmanVarshney01](https://github.com/AmanVarshney01) for creating this excellent starter template.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The MIT License allows you to:

- ✅ Use the code commercially
- ✅ Modify the code
- ✅ Distribute the code
- ✅ Use privately

**The only requirement is that you include the original copyright notice and license when you use, modify, or distribute the code.**

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Note**: This project is actively under development. Some features may be in progress or planned for future releases.
