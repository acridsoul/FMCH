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

