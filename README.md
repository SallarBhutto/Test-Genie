# TestGenie - Test Management Platform

A comprehensive QA Touch replica with advanced test management capabilities, featuring a hierarchical project structure and enterprise-grade UI for efficient software testing workflows.

![TestGenie Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

## 🚀 Features

### Core Functionality
- **Project Management**: Organize testing efforts by projects
- **Hierarchical Structure**: Projects → Modules → Components → Test Suites → Test Cases
- **Test Execution**: Run test cases and record results in real-time
- **Test Run Management**: Create, execute, and track test runs
- **Defect Tracking**: Log and manage defects with detailed information
- **Requirements Management**: Track and link requirements to test cases
- **Team Management**: User roles and team collaboration
- **Dashboard & Reporting**: Comprehensive overview with statistics

### Technical Features
- **Enterprise UI**: Professional dark/light theme with responsive design
- **Real-time Updates**: Live status updates across all components
- **Data Persistence**: PostgreSQL database with robust error handling
- **Type Safety**: Full TypeScript implementation
- **Modern Stack**: React + Node.js + Drizzle ORM

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Wouter** for routing
- **TanStack Query** for data fetching
- **Tailwind CSS** + **shadcn/ui** for styling
- **Framer Motion** for animations
- **React Hook Form** with Zod validation

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Drizzle ORM** for database operations
- **PostgreSQL** for data persistence
- **Zod** for schema validation

### Development Tools
- **Vite** for build tooling
- **ESBuild** for fast compilation
- **Hot Module Replacement** for development

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd testgenie
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file with your database URL
   DATABASE_URL=postgresql://username:password@localhost:5432/database_name
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:5000
   ```

## 📊 Database Schema

The application uses a hierarchical data model:

```
Users
├── Projects
    ├── Modules
        ├── Components
    ├── Test Suites
        ├── Test Cases
    ├── Test Runs
        ├── Test Run Results
    ├── Defects
    ├── Requirements
```

## 🎯 Usage Guide

### Creating a Test Project
1. Navigate to the Projects page
2. Click "Create Project" 
3. Fill in project details
4. Organize with modules and components

### Managing Test Cases
1. Go to Test Cases page
2. Create test suites to organize cases
3. Add detailed test cases with steps and expected results
4. Link to project components

### Executing Tests
1. Navigate to Test Runs
2. Create a new test run
3. Select test cases to execute
4. Run tests and record Pass/Fail/Block results
5. Add notes and observations
6. Complete execution to update status

### Tracking Defects
1. Access the Defects page
2. Log new defects with detailed information
3. Link to failed test cases
4. Track resolution status and assignment

## 🗂️ Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── lib/           # Utilities and configurations
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Node.js application
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Data access layer
│   └── db.ts            # Database connection
├── shared/               # Shared TypeScript types
│   └── schema.ts        # Database schema and types
└── package.json         # Dependencies and scripts
```

## 🚀 Deployment

### Using Replit (Recommended)
1. Import this repository to Replit
2. Set up PostgreSQL database
3. Configure environment variables
4. Deploy with one click

### Manual Deployment
1. Build the application:
   ```bash
   npm run build
   ```
2. Set up PostgreSQL database
3. Configure production environment variables
4. Deploy to your preferred hosting platform

## 🧪 Testing Features

- **Comprehensive Test Management**: Create, organize, and execute test cases
- **Real-time Results**: Immediate feedback during test execution
- **Detailed Reporting**: View execution history and results
- **Team Collaboration**: Multiple users can work on projects
- **Defect Integration**: Link test failures to defect tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://username:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGUSER=username
PGPASSWORD=password
PGDATABASE=database_name
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push schema changes to database
- `npm run db:generate` - Generate migration files

## 🎨 UI Components

Built with modern design principles:
- Clean, professional interface
- Dark/light theme support
- Responsive design for all devices
- Accessible components with proper ARIA labels
- Smooth animations and transitions

## 📈 Performance

- Optimized bundle size with code splitting
- Efficient data fetching with TanStack Query
- Database queries optimized with proper indexing
- Fast hot reload during development

---

**TestGenie** - Professional test management made simple and efficient.