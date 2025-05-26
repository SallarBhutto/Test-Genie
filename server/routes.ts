import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTestCaseSchema, insertDefectSchema, insertProjectSchema, insertTestSuiteSchema, insertTestRunSchema, insertModuleSchema, insertComponentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
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
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
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
    try {
      console.log("Creating module with data:", req.body);
      
      // Create module data with required fields
      const moduleData = {
        name: req.body.name,
        description: req.body.description || "",
        projectId: req.body.projectId,
        createdBy: req.body.createdBy || 1
      };
      
      console.log("Processed module data:", moduleData);
      const module = await storage.createModule(moduleData);
      console.log("Module created successfully:", module);
      res.status(201).json(module);
    } catch (error) {
      console.error("Module creation error:", error);
      res.status(400).json({ message: "Invalid module data", error: error instanceof Error ? error.message : "Unknown error" });
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
    try {
      const validatedData = insertTestCaseSchema.parse(req.body);
      const testCase = await storage.createTestCase(validatedData);
      res.status(201).json(testCase);
    } catch (error) {
      res.status(400).json({ message: "Invalid test case data" });
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
