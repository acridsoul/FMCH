# Film Production Command Hub (FMCH)

A comprehensive, full-stack web application designed to streamline and centralize film production management from pre-production through completion. Built as part of the Mount Kenya University School of Computing and Informatics curriculum.

## Overview

The Film Production Command Hub addresses the inefficiencies of traditional film production workflows that rely on fragmented tools, manual processes, and outdated systems. FMCH provides a unified digital platform for managing all aspects of film production including project coordination, task assignments, scheduling, budget tracking, team collaboration, and resource management.

## Key Features

### Core Functionality

- **Project Management**
  - Create and manage multiple film projects
  - Track project status (pre-production, production, post-production, completed)
  - Budget allocation and monitoring
  - Timeline management with start/end dates
  - Team member assignment with custom roles

- **Task Management**
  - Create and assign tasks to team members
  - Priority levels (low, medium, high)
  - Status tracking (todo, in progress, done)
  - Due date management
  - Real-time updates

- **Schedule Management**
  - Shooting schedule creation
  - Scene-based scheduling with descriptions
  - Location tracking
  - Crew requirements per shoot
  - Equipment tracking

- **Budget & Expense Tracking**
  - Expense logging by category
  - Budget vs actual spending comparison
  - Receipt upload capability
  - Financial reports and analytics
  - Budget warning alerts

- **File Management**
  - Secure document storage (scripts, contracts, call sheets)
  - File categorization
  - Project-scoped access control

- **Messaging System**
  - Project-specific conversations
  - Real-time message delivery
  - Read/unread status tracking

- **Notifications**
  - System-wide notification system
  - Action-required alerts
  - Severity levels
  - Customizable preferences

- **Reporting System**
  - Crew accomplishment reports
  - Task-based reporting
  - Report comments and feedback
  - Attachment support

- **User Management**
  - Role-based access control (Admin, Department Head, Crew)
  - Department assignments
  - User profiles with avatars

- **Dashboard & Analytics**
  - Project overview statistics
  - Visual charts and graphs
  - Expense breakdowns
  - Task status distribution
  - Recent activity feed
  - Upcoming shoots calendar
  - AI-powered insights

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5.6 (App Router)
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.1.14
- **Components**: Radix UI + Shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Date Utilities**: date-fns

### Backend
- **Platform**: Supabase (Backend-as-a-Service)
  - PostgreSQL database
  - Authentication & authorization
  - Real-time subscriptions
  - Row Level Security (RLS)
  - File storage
- **API**: Next.js API routes

### Development Tools
- **Build Tool**: Turbopack
- **Linting**: ESLint
- **Testing**: Playwright

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20 or higher)
- **npm** or **yarn** or **pnpm**
- **Git**
- **Supabase account** (free tier available at [supabase.com](https://supabase.com))

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/FMCH.git
cd FMCH
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

To get your Supabase credentials:
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Navigate to Project Settings > API
4. Copy the Project URL and anon/public key

### 4. Database Setup

The project includes Supabase migrations to set up the database schema.

#### Option A: Using Supabase CLI (Recommended)

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Run migrations:
```bash
supabase db push
```

#### Option B: Manual Setup

1. Navigate to the SQL Editor in your Supabase dashboard
2. Run the migration files in order from `supabase/migrations/`:
   - `001_initial_schema.sql`
   - `002_rls_policies.sql`
   - `003_update_rls_for_roles.sql`
   - Continue with remaining migrations in sequence

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## User Roles & Permissions

FMCH implements a role-based access control (RBAC) system with three levels:

### Admin
- Full system access
- Create and delete projects
- Manage all resources across projects
- User management capabilities
- System configuration

### Department Head
- Manage assigned projects
- Create and assign tasks
- Manage schedules and budgets
- Upload and manage files
- View all project-related data

### Crew
- Read-only access to assigned projects
- Update status of assigned tasks
- Submit accomplishment reports
- View schedules and project information
- Access project files

## Project Structure

```
FMCH/
├── public/                      # Static assets
│   └── illustrations/           # SVG illustrations
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/             # Authentication pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/        # Dashboard pages
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── schedule/
│   │   │   ├── budget/
│   │   │   ├── files/
│   │   │   ├── messages/
│   │   │   ├── reports/
│   │   │   └── users/
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Landing page
│   │   └── globals.css
│   ├── components/             # React components
│   │   ├── ai/
│   │   ├── landing/
│   │   ├── layout/
│   │   ├── messages/
│   │   ├── notifications/
│   │   ├── project/
│   │   └── ui/                 # Reusable UI components
│   ├── context/
│   │   └── AuthContext.tsx     # Authentication state
│   ├── hooks/                  # Custom React hooks
│   │   ├── usePermissions.ts
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   ├── lib/                    # Utility functions
│   │   ├── ai.ts
│   │   ├── crew.ts
│   │   ├── dashboard.ts
│   │   ├── expenses.ts
│   │   ├── files.ts
│   │   ├── messages.ts
│   │   ├── projects.ts
│   │   ├── reports.ts
│   │   ├── schedules.ts
│   │   ├── tasks.ts
│   │   ├── users.ts
│   │   ├── supabase.ts
│   │   ├── supabase-server.ts
│   │   └── utils.ts
│   ├── types/                  # TypeScript definitions
│   │   ├── database.ts
│   │   ├── supabase.ts
│   │   └── index.ts
│   └── constants/              # Application constants
│       ├── departments.ts
│       └── schedule.ts
├── supabase/
│   └── migrations/             # Database migrations
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.js
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production application
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in the Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Digital Ocean
- Railway
- Render

Ensure you set the required environment variables on your chosen platform.

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Database Schema

The application uses the following core tables:

- **profiles** - User profiles with roles and departments
- **projects** - Film projects with budget and timeline
- **project_members** - Project team assignments
- **tasks** - Task assignments and tracking
- **schedules** - Shooting schedules
- **expenses** - Budget and expense tracking
- **files** - Document management
- **messages** - Messaging system
- **conversations** - Message threads
- **notifications** - System notifications
- **reports** - Accomplishment reports

All tables implement Row Level Security (RLS) for data protection.

## Security Features

- **Authentication**: Secure user authentication via Supabase Auth
- **Authorization**: Role-based access control (RBAC)
- **Row Level Security**: Database-level security policies
- **Secure File Storage**: Supabase Storage with access policies
- **Password Reset**: Email-based password recovery
- **Session Management**: Secure session handling

## Contributing

This project was developed as part of an academic curriculum. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is developed for educational purposes as part of the Mount Kenya University curriculum.

## Acknowledgments

- **Mount Kenya University** - School of Computing and Informatics
- **Department of Information Technology**
- Project supervisors and mentors
- Open-source community for the amazing tools and libraries

## Support

For questions or issues, please open an issue on the GitHub repository.

## Screenshots

<!-- Add screenshots of your application here -->

---

Built with dedication and passion for improving film production workflows.
