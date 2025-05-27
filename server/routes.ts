import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTestCaseSchema, insertDefectSchema, insertProjectSchema, insertTestSuiteSchema, insertTestRunSchema, insertTestRunResultSchema, insertModuleSchema, insertComponentSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

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
      const user = await storage.createUser(validatedData);
      
      // Create session for new user
      const sessionId = crypto.randomUUID();
      const session = await storage.createSession({
        id: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      res.status(201).json({
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
      console.error("Signup error:", error);
      res.status(400).json({ 
        message: "Signup failed", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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

  app.post("/api/test-suites", async (req, res) => {
    try {
      const validatedData = insertTestSuiteSchema.parse(req.body);
      const testSuite = await storage.createTestSuite(validatedData);
      res.status(201).json(testSuite);
    } catch (error) {
      res.status(400).json({ message: "Invalid test suite data" });
    }
  });

  // Test Cases
  app.get("/api/test-cases", async (req, res) => {
    try {
      const testSuiteId = req.query.testSuiteId ? parseInt(req.query.testSuiteId as string) : undefined;
      const testCases = await storage.getTestCases(testSuiteId);
      
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

  app.post("/api/defects", async (req, res) => {
    try {
      const validatedData = insertDefectSchema.parse(req.body);
      const defect = await storage.createDefect(validatedData);
      res.status(201).json(defect);
    } catch (error) {
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

  const httpServer = createServer(app);
  return httpServer;
}
