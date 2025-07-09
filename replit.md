# QualityBytes - Test Management Platform

## Overview

QualityBytes is a comprehensive self-hosted test management platform developed by Samosa Labs. It provides an enterprise-grade solution for organizing, executing, and tracking testing activities with a hierarchical project structure: Projects → Modules → Components → Test Suites → Test Cases. The application includes defect tracking, requirements management, team collaboration, and Azure DevOps integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Architecture Pattern
The application follows a modern full-stack architecture with a clear separation between frontend and backend:

- **Frontend**: React-based SPA with TypeScript
- **Backend**: Node.js/Express REST API with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite for frontend, ESBuild for backend
- **Deployment**: Self-hosted with Docker support

### Technology Choices
The stack was chosen for:
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **Developer Experience**: Hot reload, fast builds, and modern tooling
- **Enterprise UI**: Professional design system using shadcn/ui components
- **Database Flexibility**: Support for both Neon serverless and traditional PostgreSQL
- **Self-Hosting**: Complete control over data and deployment

## Key Components

### Frontend Architecture
- **React 18** with functional components and hooks
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management and caching
- **Tailwind CSS + shadcn/ui** for consistent design system
- **Framer Motion** for smooth animations
- **React Hook Form + Zod** for form validation

### Backend Architecture
- **Express.js** server with middleware pattern
- **Drizzle ORM** for type-safe database operations
- **Session-based authentication** with memory store
- **RESTful API** design with consistent error handling
- **Server-Sent Events (SSE)** for real-time updates

### Database Schema
The application uses a hierarchical structure:
- **Users**: Authentication and role management
- **Projects**: Top-level organization unit
- **Modules**: Logical groupings within projects
- **Components**: Specific areas within modules
- **Test Suites**: Collections of related test cases
- **Test Cases**: Individual test scenarios
- **Test Runs**: Execution instances with results
- **Defects**: Bug tracking with Azure DevOps sync
- **Settings**: System configuration storage

## Data Flow

### Authentication Flow
1. Users authenticate via username/password
2. Sessions stored in memory with configurable expiration
3. Routes protected by authentication middleware
4. User context maintained throughout application

### Test Management Flow
1. Projects created with team assignments
2. Modules and components organized hierarchically
3. Test cases created and grouped into suites
4. Test runs execute collections of test cases
5. Results captured with pass/fail status and notes

### Defect Management Flow
1. Defects created manually or imported from Azure DevOps
2. Real-time synchronization with Azure DevOps work items
3. Status updates propagated via Server-Sent Events
4. Webhook integration for bidirectional sync

## External Dependencies

### Azure DevOps Integration
- **Bidirectional sync** of defects and work items
- **Webhook support** for real-time updates
- **Personal Access Token** authentication
- **Area Path mapping** via project team names

### Email Services
- **Nodemailer** for email notifications
- **Verification emails** for new user accounts
- **Welcome emails** for account activation

### License Validation
- **Remote license validation** service
- **Development mode bypass** for local development
- **Header-based or environment variable license keys

## Deployment Strategy

### Development
- **Vite dev server** with hot module replacement
- **TSX** for TypeScript execution
- **Memory-based sessions** for simplicity
- **Automatic database migrations** on startup

### Production
- **Docker containerization** with multi-stage builds
- **PostgreSQL** as primary database
- **Static file serving** for built frontend
- **Environment-based configuration**
- **Health checks** and connection testing

### Database Support
The application intelligently detects and supports:
- **Neon Serverless** for cloud deployment (Replit)
- **Traditional PostgreSQL** for self-hosted environments
- **Automatic driver selection** based on connection string
- **Migration compatibility** across both database types

### Configuration
- **Environment variables** for sensitive configuration
- **Database settings** stored in application tables
- **Session secrets** and security configuration
- **Feature flags** for optional integrations

The architecture prioritizes developer experience, type safety, and deployment flexibility while maintaining enterprise-grade features for professional test management workflows.