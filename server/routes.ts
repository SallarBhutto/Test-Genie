import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, initializeDefaultUser } from "./storage";
import { azureDevOpsService } from "./azureDevOpsService";
import { settingsService } from "./settingsService";
import { insertTestCaseSchema, insertDefectSchema, insertProjectSchema, insertTestSuiteSchema, insertTestRunSchema, insertTestRunResultSchema, insertModuleSchema, insertComponentSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { 
  generateVerificationToken, 
  generateVerificationExpiry, 
  sendVerificationEmail, 
  sendWelcomeEmail 
} from "./emailService";

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  const sessionId = req.headers.authorization?.split(' ')[1];
  if (!sessionId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Verify session exists and is valid
  // For now, we'll implement basic session management
  req.sessionId = sessionId;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize default admin user
  await initializeDefaultUser();
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Email verification removed - all users can login directly

      // Create session
      const sessionId = crypto.randomUUID();
      const session = await storage.createSession({
        id: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      // Update last login
      await storage.updateUser(user.id, { lastLogin: new Date() });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar,
        },
        sessionId: session.id,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create user with email already verified (no verification needed)
      const user = await storage.createUser({
        ...validatedData,
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      res.status(201).json({
        message: "Account created successfully! You can now log in.",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          isEmailVerified: user.isEmailVerified,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(400).json({ 
        message: "Signup failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Email verification route
  app.get("/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #dc2626;">Invalid Verification Link</h1>
              <p>The verification link is invalid or missing. Please check your email and try again.</p>
            </body>
          </html>
        `);
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #dc2626;">Invalid Verification Token</h1>
              <p>This verification token is invalid or has already been used.</p>
              <a href="/login" style="color: #2563eb;">Go to Login</a>
            </body>
          </html>
        `);
      }

      // Check if token has expired
      if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1 style="color: #dc2626;">Verification Link Expired</h1>
              <p>This verification link has expired. Please request a new verification email.</p>
              <a href="/signup" style="color: #2563eb;">Sign Up Again</a>
            </body>
          </html>
        `);
      }

      // Update user as verified
      await storage.updateUser(user.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      // Send welcome email
      await sendWelcomeEmail(user.email, user.username);

      // Success page
      res.send(`
        <html>
          <head>
            <title>Email Verified - QualityBytes</title>
          </head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <div style="max-width: 500px; margin: 0 auto;">
              <h1 style="color: #16a34a;">✅ Email Verified Successfully!</h1>
              <p style="font-size: 18px; margin: 20px 0;">
                Welcome to QualityBytes, <strong>${user.fullName}</strong>!
              </p>
              <p style="color: #6b7280;">
                Your email has been verified and your account is now active. You can now log in and start managing your test cases.
              </p>
              <div style="margin-top: 30px;">
                <a href="/login" 
                   style="background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); 
                          color: white; 
                          padding: 12px 30px; 
                          text-decoration: none; 
                          border-radius: 6px; 
                          font-weight: bold;
                          display: inline-block;">
                  Login to QualityBytes
                </a>
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Verification Failed</h1>
            <p>An error occurred during email verification. Please try again later.</p>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const sessionId = req.headers.authorization?.split(' ')[1];
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const session = await storage.getSession(req.sessionId);
      if (!session || session.expiresAt < new Date()) {
        return res.status(401).json({ message: "Session expired" });
      }

      const user = await storage.getUser(session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      console.log("POST /api/users called with body:", req.body);
      const validatedData = insertUserSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const user = await storage.createUser(validatedData);
      console.log("Created user:", user);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ 
        message: "Invalid user data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ 
        message: "Invalid user data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    console.log("=== PROJECT CREATION START ===");
    console.log("Raw request body:", req.body);
    
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      const project = await storage.createProject(validatedData);
      console.log("Project created successfully:", project);
      
      res.status(201).json(project);
    } catch (error) {
      console.error("=== PROJECT CREATION ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : "Unknown");
      
      res.status(400).json({ 
        message: "Invalid project data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Modules
  app.get("/api/modules", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const modules = await storage.getModules(projectId);
      res.json(modules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  app.post("/api/modules", async (req, res) => {
    console.log("=== MODULE CREATION START ===");
    console.log("Raw request body:", req.body);
    
    try {
      // Validate required fields
      if (!req.body.name || !req.body.projectId) {
        console.log("Validation failed: missing name or projectId");
        return res.status(400).json({ message: "Name and project are required" });
      }
      
      // Create module data
      const moduleData = {
        name: String(req.body.name).trim(),
        description: String(req.body.description || "").trim(),
        projectId: Number(req.body.projectId),
        createdBy: Number(req.body.createdBy || 1)
      };
      
      console.log("Creating module with processed data:", moduleData);
      
      const module = await storage.createModule(moduleData);
      console.log("Module created successfully:", module);
      
      res.status(201).json(module);
    } catch (error) {
      console.error("=== MODULE CREATION ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : "Unknown");
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
      
      res.status(500).json({ 
        message: "Failed to create module", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Components
  app.get("/api/components", async (req, res) => {
    try {
      const moduleId = req.query.moduleId ? parseInt(req.query.moduleId as string) : undefined;
      const components = await storage.getComponents(moduleId);
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch components" });
    }
  });

  app.post("/api/components", async (req, res) => {
    try {
      const validatedData = insertComponentSchema.parse(req.body);
      const component = await storage.createComponent(validatedData);
      res.status(201).json(component);
    } catch (error) {
      res.status(400).json({ message: "Invalid component data" });
    }
  });

  // Test Suites
  app.get("/api/test-suites", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const testSuites = await storage.getTestSuites(projectId);
      res.json(testSuites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test suites" });
    }
  });

  app.get("/api/test-suites/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const testSuite = await storage.getTestSuite(id);
      if (!testSuite) {
        return res.status(404).json({ message: "Test suite not found" });
      }
      res.json(testSuite);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test suite" });
    }
  });

  app.post("/api/test-suites", async (req, res) => {
    console.log("=== TEST SUITE CREATION START ===");
    console.log("Raw request body:", req.body);
    
    try {
      const { testCaseIds, ...testSuiteData } = req.body;
      const validatedData = insertTestSuiteSchema.parse(testSuiteData);
      
      // Create the test suite
      const testSuite = await storage.createTestSuite(validatedData);
      console.log("Test suite created:", testSuite);
      
      // Add test cases to the suite if provided
      if (testCaseIds && testCaseIds.length > 0) {
        await storage.addTestCasesToSuite(testSuite.id, testCaseIds);
        console.log(`Added ${testCaseIds.length} test cases to test suite ${testSuite.id}`);
      }
      
      res.status(201).json(testSuite);
    } catch (error) {
      console.error("Test suite creation error:", error);
      res.status(400).json({ message: "Invalid test suite data" });
    }
  });

  // Test Suite Test Cases endpoints
  app.get("/api/test-suites/:id/test-cases", async (req, res) => {
    try {
      const testSuiteId = parseInt(req.params.id);
      const testCases = await storage.getTestSuiteTestCases(testSuiteId);
      res.json(testCases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test suite test cases" });
    }
  });

  app.post("/api/test-suites/:id/test-cases", async (req, res) => {
    try {
      const testSuiteId = parseInt(req.params.id);
      const { testCaseIds } = req.body;
      
      await storage.addTestCasesToSuite(testSuiteId, testCaseIds);
      res.status(200).json({ message: "Test cases added successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add test cases to suite" });
    }
  });

  app.delete("/api/test-suites/:id/test-cases/:testCaseId", async (req, res) => {
    try {
      const testSuiteId = parseInt(req.params.id);
      const testCaseId = parseInt(req.params.testCaseId);
      
      const removed = await storage.removeTestCaseFromSuite(testSuiteId, testCaseId);
      if (removed) {
        res.status(200).json({ message: "Test case removed successfully" });
      } else {
        res.status(404).json({ message: "Test case not found in suite" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove test case from suite" });
    }
  });

  // Helper endpoints for test case filtering
  app.get("/api/projects/:id/test-cases", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const testCases = await storage.getTestCasesForProject(projectId);
      res.json(testCases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project test cases" });
    }
  });

  app.get("/api/modules/:id/test-cases", async (req, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const testCases = await storage.getTestCasesForModule(moduleId);
      res.json(testCases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch module test cases" });
    }
  });

  app.get("/api/components/:id/test-cases", async (req, res) => {
    try {
      const componentId = parseInt(req.params.id);
      const testCases = await storage.getTestCasesForComponent(componentId);
      res.json(testCases);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch component test cases" });
    }
  });

  // Test Cases
  app.get("/api/test-cases", async (req, res) => {
    try {
      const testSuiteId = req.query.testSuiteId ? parseInt(req.query.testSuiteId as string) : undefined;
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let testCases = await storage.getTestCases(testSuiteId);
      
      // Filter by project if projectId is provided
      if (projectId) {
        testCases = testCases.filter(tc => tc.projectId === projectId);
      }
      
      // Populate with user data
      const users = await storage.getUsers();
      const testCasesWithUsers = testCases.map(testCase => ({
        ...testCase,
        assignee: users.find(user => user.id === testCase.assignedTo),
        createdByUser: users.find(user => user.id === testCase.createdBy),
      }));
      
      res.json(testCasesWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test cases" });
    }
  });

  app.get("/api/test-cases/:id", async (req, res) => {
    try {
      const testCase = await storage.getTestCase(parseInt(req.params.id));
      if (!testCase) {
        return res.status(404).json({ message: "Test case not found" });
      }
      res.json(testCase);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test case" });
    }
  });

  app.post("/api/test-cases", async (req, res) => {
    console.log("=== TEST CASE CREATION START ===");
    console.log("Raw request body:", req.body);
    
    try {
      const validatedData = insertTestCaseSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      const testCase = await storage.createTestCase(validatedData);
      console.log("Test case created successfully:", testCase);
      
      res.status(201).json(testCase);
    } catch (error) {
      console.error("=== TEST CASE CREATION ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : "Unknown");
      
      res.status(400).json({ 
        message: "Invalid test case data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.put("/api/test-cases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const testCase = await storage.updateTestCase(id, req.body);
      if (!testCase) {
        return res.status(404).json({ message: "Test case not found" });
      }
      res.json(testCase);
    } catch (error) {
      res.status(500).json({ message: "Failed to update test case" });
    }
  });

  app.delete("/api/test-cases/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTestCase(id);
      if (!deleted) {
        return res.status(404).json({ message: "Test case not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete test case" });
    }
  });

  // Test Runs
  app.get("/api/test-runs", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const testRuns = await storage.getTestRuns(projectId);
      res.json(testRuns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test runs" });
    }
  });

  app.post("/api/test-runs", async (req, res) => {
    try {
      const validatedData = insertTestRunSchema.parse(req.body);
      const testRun = await storage.createTestRun(validatedData);
      res.status(201).json(testRun);
    } catch (error) {
      res.status(400).json({ message: "Invalid test run data" });
    }
  });

  app.get("/api/test-runs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const testRun = await storage.getTestRun(id);
      if (!testRun) {
        return res.status(404).json({ message: "Test run not found" });
      }
      res.json(testRun);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch test run" });
    }
  });

  app.patch("/api/test-runs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Updating test run", id, "with data:", req.body);
      const testRun = await storage.updateTestRun(id, req.body);
      if (!testRun) {
        return res.status(404).json({ message: "Test run not found" });
      }
      res.json(testRun);
    } catch (error) {
      console.error("Error updating test run:", error);
      res.status(500).json({ message: "Failed to update test run" });
    }
  });

  // Test Run Results
  app.get("/api/test-run-results/:testRunId", async (req, res) => {
    try {
      const testRunId = parseInt(req.params.testRunId);
      console.log("Fetching test run results for testRunId:", testRunId);
      const results = await storage.getTestRunResults(testRunId);
      console.log("Found results:", results);
      res.json(results);
    } catch (error) {
      console.error("Error fetching test run results:", error);
      res.status(500).json({ message: "Failed to fetch test run results" });
    }
  });

  app.post("/api/test-run-results", async (req, res) => {
    try {
      const validatedData = insertTestRunResultSchema.parse(req.body);
      const result = await storage.createTestRunResult(validatedData);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Invalid test run result data" });
    }
  });

  // Defects
  app.get("/api/defects", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const defects = await storage.getDefects(projectId);
      
      // Populate with user data
      const users = await storage.getUsers();
      const defectsWithUsers = defects.map(defect => ({
        ...defect,
        assignee: users.find(user => user.id === defect.assignedTo),
        reporter: users.find(user => user.id === defect.reportedBy),
      }));
      
      res.json(defectsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch defects" });
    }
  });

  app.get("/api/defects/:id", async (req, res) => {
    try {
      const defect = await storage.getDefect(parseInt(req.params.id));
      if (!defect) {
        return res.status(404).json({ message: "Defect not found" });
      }
      res.json(defect);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch defect" });
    }
  });

  app.post("/api/defects", async (req, res) => {
    try {
      const validatedData = insertDefectSchema.parse(req.body);
      
      // Create the defect in QualityBytes
      const defect = await storage.createDefect(validatedData);
      
      // Try to create corresponding Azure DevOps work item
      console.log('🔍 About to check if Azure DevOps is configured...');
      
      // Get settings directly to debug
      const debugSettings = await settingsService.getSettings();
      console.log('🔍 Direct settings check:', {
        enabled: debugSettings.azureDevOps?.enabled,
        org: debugSettings.azureDevOps?.organization,
        project: debugSettings.azureDevOps?.project,
        hasToken: !!debugSettings.azureDevOps?.personalAccessToken
      });
      
      const isConfigured = await azureDevOpsService.isConfigured();
      console.log('🔍 Azure DevOps configuration check result:', isConfigured);
      
      if (isConfigured) {
        try {
          // Get user information for the reporter
          const reporter = await storage.getUser(defect.reportedBy);
          const reporterName = reporter ? reporter.fullName : 'QualityBytes User';
          
          // Get test case title if available
          let testCaseTitle;
          if (defect.testCaseId) {
            const testCase = await storage.getTestCase(defect.testCaseId);
            testCaseTitle = testCase?.title;
          }
          
          // Get project team name for Area Path
          const project = await storage.getProject(defect.projectId);
          const projectTeamName = project?.teamName ? project.teamName : undefined;
          
          // Create Azure DevOps work item
          const azureResult = await azureDevOpsService.createBugWorkItem(
            defect, 
            reporterName, 
            testCaseTitle,
            projectTeamName
          );
          
          if (azureResult.success && azureResult.workItemId) {
            // Update defect with Azure DevOps information
            const azureWorkItemUrl = await azureDevOpsService.getWorkItemUrl(azureResult.workItemId);
            await storage.updateDefect(defect.id, {
              azureWorkItemId: azureResult.workItemId,
              azureWorkItemUrl: azureWorkItemUrl
            });
            
            console.log(`✅ Azure DevOps work item created: ${azureResult.workItemId} for defect ${defect.defectId}`);
            
            // Return defect with Azure DevOps information
            return res.status(201).json({
              ...defect,
              azureWorkItemId: azureResult.workItemId,
              azureWorkItemUrl: azureWorkItemUrl,
              azureDevOpsSuccess: true
            });
          } else {
            console.warn(`⚠️ Failed to create Azure DevOps work item for defect ${defect.defectId}:`, azureResult.error);
          }
        } catch (azureError) {
          console.error(`❌ Azure DevOps integration error for defect ${defect.defectId}:`, azureError);
          // Don't fail the defect creation if Azure DevOps fails
        }
      } else {
        console.log('ℹ️ Azure DevOps not configured - skipping work item creation');
      }
      
      res.status(201).json(defect);
    } catch (error) {
      console.error('Error creating defect:', error);
      res.status(400).json({ message: "Invalid defect data" });
    }
  });

  app.put("/api/defects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const defect = await storage.updateDefect(id, req.body);
      if (!defect) {
        return res.status(404).json({ message: "Defect not found" });
      }
      res.json(defect);
    } catch (error) {
      res.status(500).json({ message: "Failed to update defect" });
    }
  });

  app.delete("/api/defects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDefect(id);
      if (!success) {
        return res.status(404).json({ message: "Defect not found" });
      }
      res.json({ message: "Defect deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete defect" });
    }
  });

  // Requirements
  app.get("/api/requirements", async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const requirements = await storage.getRequirements(projectId);
      res.json(requirements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requirements" });
    }
  });

  // Test Run Results
  app.get("/api/test-run-results/:testRunId", async (req, res) => {
    try {
      const testRunId = parseInt(req.params.testRunId);
      const results = await storage.getTestRunResults(testRunId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching test run results:", error);
      res.status(500).json({ error: "Failed to fetch test run results" });
    }
  });

  app.post("/api/test-run-results", async (req, res) => {
    try {
      const validatedData = insertTestRunResultSchema.parse(req.body);
      const result = await storage.createTestRunResult(validatedData);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating test run result:", error);
      res.status(500).json({ error: "Failed to create test run result" });
    }
  });

  app.patch("/api/test-run-results/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.updateTestRunResult(id, req.body);
      if (!result) {
        return res.status(404).json({ error: "Test run result not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error updating test run result:", error);
      res.status(500).json({ error: "Failed to update test run result" });
    }
  });

  // Dashboard Statistics
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const testCases = await storage.getTestCases();
      const testRuns = await storage.getTestRuns();
      const defects = await storage.getDefects();
      
      const totalTestCases = testCases.length;
      const passedTestCases = testCases.filter(tc => tc.status === "passed").length;
      const openDefects = defects.filter(d => d.status === "open").length;
      const passRate = totalTestCases > 0 ? (passedTestCases / totalTestCases * 100).toFixed(1) : "0";
      
      res.json({
        totalTestCases,
        testRuns: testRuns.length,
        openDefects,
        passRate: `${passRate}%`,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Settings API Routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await settingsService.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/azure-devops", async (req, res) => {
    try {
      const azureSettings = req.body;
      const updatedSettings = await settingsService.updateAzureDevOpsSettings(azureSettings);
      
      console.log(`🔧 Azure DevOps settings updated: enabled=${azureSettings.enabled}, org=${azureSettings.organization}, project=${azureSettings.project}`);
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating Azure DevOps settings:", error);
      res.status(500).json({ message: "Failed to update Azure DevOps settings" });
    }
  });

  app.post("/api/settings/azure-devops/test", async (req, res) => {
    try {
      const testResult = await settingsService.testAzureDevOpsConnection();
      res.json(testResult);
    } catch (error) {
      console.error("Error testing Azure DevOps connection:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to test Azure DevOps connection" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
