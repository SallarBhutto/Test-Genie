import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, initializeDefaultUser } from "./storage";
import { azureDevOpsService } from "./azureDevOpsService";
import { settingsService } from "./settingsService";
import { insertTestCaseSchema, insertDefectSchema, insertDefectWithIdSchema, insertProjectSchema, insertTestSuiteSchema, insertTestRunSchema, insertTestRunResultSchema, insertModuleSchema, insertComponentSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import { 
  generateVerificationToken, 
  generateVerificationExpiry, 
  sendVerificationEmail, 
  sendWelcomeEmail 
} from "./emailService";
import { licenseMiddleware } from "./middleware/license";
import { getLicenseInfo } from "./utils/license";

// Extend Express session interface
declare module "express-session" {
  interface SessionData {
    userId: number;
    user: {
      id: number;
      username: string;
      email: string;
      fullName: string;
      role: string;
      avatar: string | null;
    };
  }
}

// In-memory session store as fallback
const activeSessions = new Map<string, { userId: number; expiresAt: Date }>();

// Authentication middleware
async function requireAuth(req: any, res: any, next: any) {
  try {
    // First try session-based auth
    if (req.session && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) {
        req.user = user;
        return next();
      }
    }
    
    // Fallback to Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const sessionData = activeSessions.get(token);
      
      if (sessionData && sessionData.expiresAt > new Date()) {
        const user = await storage.getUser(sessionData.userId);
        if (user) {
          req.user = user;
          return next();
        }
      }
    }
    
    return res.status(401).json({ message: "Authentication required" });
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication required" });
  }
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

      // Create Express session
      (req as any).session.userId = user.id;
      (req as any).session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
      };

      // Generate backup token for fallback authentication
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      activeSessions.set(token, { userId: user.id, expiresAt });

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
        token,
        sessionId: (req as any).session.id,
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

  app.post("/api/auth/logout", async (req: any, res) => {
    try {
      if (req.session) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Session destroy error:", err);
            return res.status(500).json({ message: "Logout failed" });
          }
          res.json({ message: "Logged out successfully" });
        });
      } else {
        res.json({ message: "Logged out successfully" });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
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

  // License info endpoint
  app.get("/api/license/info", async (req, res) => {
    try {
      const licenseKey = req.headers['x-license-key'] as string || process.env.LICENSE_KEY;
      
      if (!licenseKey) {
        return res.status(403).json({ message: "License key required" });
      }

      const licenseInfo = await getLicenseInfo(licenseKey);
      
      if (!licenseInfo || !licenseInfo.valid) {
        return res.status(403).json({ message: "Invalid license key" });
      }

      const currentUsers = await storage.getUsers();
      const currentUserCount = currentUsers.length;
      const maxUsers = licenseInfo.subscription?.userCount || 0;

      res.json({
        valid: licenseInfo.valid,
        subscription: licenseInfo.subscription,
        currentUserCount,
        maxUsers,
        remainingSlots: Math.max(0, maxUsers - currentUserCount)
      });
    } catch (error) {
      console.error("Error fetching license info:", error);
      res.status(500).json({ message: "Failed to fetch license information" });
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
      
      // Get license key from header or environment
      const licenseKey = req.headers['x-license-key'] as string || process.env.LICENSE_KEY;
      
      if (!licenseKey) {
        return res.status(403).json({ 
          message: "License key required to add team members" 
        });
      }

      // Get license information to check user limits
      const licenseInfo = await getLicenseInfo(licenseKey);
      
      if (!licenseInfo || !licenseInfo.valid) {
        return res.status(403).json({ 
          message: "Invalid license key" 
        });
      }

      // Get current user count
      const currentUsers = await storage.getUsers();
      const currentUserCount = currentUsers.length;
      const maxUsers = licenseInfo.subscription?.userCount || 0;
      
      // Check if adding a new user would exceed the limit
      if (currentUserCount >= maxUsers) {
        return res.status(400).json({ 
          message: `User limit reached. Your subscription allows ${maxUsers} users. You currently have ${currentUserCount} users.`,
          currentUserCount,
          maxUsers,
          remainingSlots: 0
        });
      }

      const validatedData = insertUserSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const user = await storage.createUser(validatedData);
      console.log("Created user:", user);
      
      // Return success response with updated counts
      res.status(201).json({
        ...user,
        licenseInfo: {
          currentUserCount: currentUserCount + 1,
          maxUsers,
          remainingSlots: maxUsers - (currentUserCount + 1)
        }
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ 
        message: "Invalid user data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { currentPassword, ...updateData } = req.body;
      const currentUser = req.user;
      
      // Allow users to update their own profile, or admins to update any user
      if (currentUser.id !== id && currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Permission denied. Only admins can update other users." });
      }
      
      // If password is being changed, verify current password
      if (updateData.password && currentPassword) {
        const existingUser = await storage.getUser(id);
        if (!existingUser) {
          return res.status(404).json({ message: "User not found" });
        }
        
        // In a real app, you would hash and compare passwords
        // For this demo, we'll do a simple comparison
        if (existingUser.password !== currentPassword) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }
      
      const validatedData = insertUserSchema.partial().parse(updateData);
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

  app.delete("/api/users/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = req.user;
      
      // Only admins can delete users
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Permission denied. Only administrators can delete users." });
      }
      
      // Prevent self-deletion
      if (currentUser.id === id) {
        return res.status(400).json({ message: "Cannot delete your own account." });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot delete user')) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Delete user error:", error);
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

  app.put("/api/projects/:id", async (req, res) => {
    console.log("=== PROJECT UPDATE START ===");
    console.log("Project ID:", req.params.id);
    console.log("Raw request body:", req.body);
    
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      const project = await storage.updateProject(id, validatedData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log("Project updated successfully:", project);
      res.json(project);
    } catch (error) {
      console.error("=== PROJECT UPDATE ERROR ===");
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

  app.get("/api/modules/:id", async (req, res) => {
    try {
      const module = await storage.getModule(parseInt(req.params.id));
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch module" });
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

  app.get("/api/test-suites/:id/test-cases", async (req, res) => {
    try {
      const testSuiteId = parseInt(req.params.id);
      const testCases = await storage.getTestSuiteTestCases(testSuiteId);
      res.json(testCases);
    } catch (error) {
      console.error("Error fetching test suite test cases:", error);
      res.status(500).json({ message: "Failed to fetch test suite test cases" });
    }
  });

  app.post("/api/test-suites/:id/test-cases", async (req, res) => {
    try {
      const testSuiteId = parseInt(req.params.id);
      const { testCaseIds } = req.body;
      
      console.log("=== ADD TEST CASES TO SUITE START ===");
      console.log("Test Suite ID:", testSuiteId);
      console.log("Test Case IDs:", testCaseIds);
      
      await storage.addTestCasesToSuite(testSuiteId, testCaseIds);
      console.log("Test cases added successfully");
      
      res.status(200).json({ message: "Test cases added successfully" });
    } catch (error) {
      console.error("=== ADD TEST CASES TO SUITE ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : "Unknown");
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack");
      
      res.status(500).json({ 
        message: "Failed to add test cases to suite",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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

  // Auto-generate test case ID (must be before :id route)
  app.get("/api/test-cases/generate-id", async (req, res) => {
    try {
      console.log("=== GENERATING TEST CASE ID ===");
      const testCases = await storage.getTestCases();
      console.log("Fetched test cases count:", testCases.length);
      
      const maxId = testCases.reduce((max, tc) => {
        const match = tc.testCaseId?.match(/TC-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          console.log("Found test case ID:", tc.testCaseId, "Extracted number:", num);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      console.log("Max ID found:", maxId);
      const nextId = `TC-${(maxId + 1).toString().padStart(4, '0')}`;
      console.log("Generated next ID:", nextId);
      
      res.json({ testCaseId: nextId });
    } catch (error) {
      console.error("Error generating test case ID:", error);
      res.status(500).json({ message: "Failed to generate test case ID", error: error instanceof Error ? error.message : "Unknown error" });
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

  app.post("/api/test-cases", licenseMiddleware, async (req, res) => {
    console.log("=== TEST CASE CREATION START ===");
    console.log("Raw request body:", req.body);
    
    try {
      // Auto-generate test case ID
      const existingTestCases = await storage.getTestCases();
      const maxId = existingTestCases.reduce((max, tc) => {
        const match = tc.testCaseId.match(/TC-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      const generatedTestCaseId = `TC-${(maxId + 1).toString().padStart(4, '0')}`;
      console.log("Generated test case ID:", generatedTestCaseId);
      
      // Add the generated ID to the request data and ensure steps is a proper array
      const dataWithId = {
        ...req.body,
        testCaseId: generatedTestCaseId,
        steps: Array.isArray(req.body.steps) ? req.body.steps.filter((step: any) => step && step.trim() !== "") : []
      };
      
      const validatedData = insertTestCaseSchema.parse(dataWithId);
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
    console.log("=== TEST CASE UPDATE START ===");
    console.log("Test case ID:", req.params.id);
    console.log("Raw request body:", req.body);
    
    try {
      const id = parseInt(req.params.id);
      
      // Check if this is a partial update (like status change)
      const isPartialUpdate = Object.keys(req.body).length === 1 && 
        ['status', 'priority', 'assignedTo'].includes(Object.keys(req.body)[0]);
      
      if (isPartialUpdate) {
        // For partial updates, just validate the specific fields
        console.log("Processing partial update");
        const testCase = await storage.updateTestCase(id, req.body);
        if (!testCase) {
          return res.status(404).json({ message: "Test case not found" });
        }
        console.log("Test case updated successfully:", testCase);
        res.json(testCase);
      } else {
        // For full updates, use full validation
        console.log("Processing full update");
        // Ensure steps is a proper array
        const dataWithFixedSteps = {
          ...req.body,
          steps: Array.isArray(req.body.steps) ? req.body.steps.filter((step: any) => step && step.trim() !== "") : []
        };
        
        const validatedData = insertTestCaseSchema.parse(dataWithFixedSteps);
        console.log("Validated data:", validatedData);
        
        const testCase = await storage.updateTestCase(id, validatedData);
        if (!testCase) {
          return res.status(404).json({ message: "Test case not found" });
        }
        
        console.log("Test case updated successfully:", testCase);
        res.json(testCase);
      }
    } catch (error) {
      console.error("=== TEST CASE UPDATE ERROR ===");
      console.error("Error details:", error);
      console.error("Error message:", error instanceof Error ? error.message : "Unknown");
      
      res.status(400).json({ 
        message: "Failed to update test case", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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

  app.post("/api/test-runs", licenseMiddleware, async (req, res) => {
    try {
      const { testCaseIds, ...testRunData } = req.body;
      const validatedData = insertTestRunSchema.parse(testRunData);
      
      // Create the test run first
      const testRun = await storage.createTestRun(validatedData);
      
      // Create test run results for all selected test cases (order preserved by creation sequence)
      if (testCaseIds && Array.isArray(testCaseIds) && testCaseIds.length > 0) {
        for (const testCaseId of testCaseIds) {
          await storage.createTestRunResult({
            testRunId: testRun.id,
            testCaseId: testCaseId,
            status: "not_executed",
            notes: "",
            executedBy: testRunData.createdBy,
          });
        }
      }
      
      res.status(201).json(testRun);
    } catch (error) {
      console.error("Error creating test run:", error);
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

  app.patch("/api/test-runs/:id", licenseMiddleware, async (req, res) => {
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
      // Auto-generate defect ID
      const existingDefects = await storage.getDefects();
      const maxId = existingDefects.reduce((max, defect) => {
        const match = defect.defectId.match(/DEF-(\d+)/);
        if (match) {
          const num = parseInt(match[1]);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      
      const generatedDefectId = `DEF-${(maxId + 1).toString().padStart(4, '0')}`;
      
      // Add the generated ID to the request data
      const dataWithId = {
        ...req.body,
        defectId: generatedDefectId
      };
      
      const validatedData = insertDefectWithIdSchema.parse(dataWithId);
      
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
      
      // Get the original defect to check if it has Azure DevOps integration
      const originalDefect = await storage.getDefect(id);
      if (!originalDefect) {
        return res.status(404).json({ message: "Defect not found" });
      }
      
      // Update the defect in QualityBytes
      const updatedDefect = await storage.updateDefect(id, req.body);
      if (!updatedDefect) {
        return res.status(404).json({ message: "Defect not found" });
      }
      
      // If this defect was synced to Azure DevOps, update it there too
      if (originalDefect.azureWorkItemId && await azureDevOpsService.isConfigured()) {
        try {
          console.log(`🔄 Updating Azure DevOps work item ${originalDefect.azureWorkItemId} for defect ${originalDefect.defectId}`);
          
          // Get test case title - check if testCaseId is being updated or use existing
          let testCaseTitle;
          const testCaseId = req.body.testCaseId !== undefined ? req.body.testCaseId : updatedDefect.testCaseId;
          if (testCaseId) {
            const testCase = await storage.getTestCase(testCaseId);
            testCaseTitle = testCase?.title;
          }
          
          // Create update data that includes both new values and context needed for Azure DevOps
          const updateData = {
            ...req.body,
            // Include original defect context for proper formatting
            defectId: originalDefect.defectId,
            createdAt: originalDefect.createdAt,
            // Use updated values where available, otherwise fall back to original
            priority: req.body.priority || originalDefect.priority,
            severity: req.body.severity || originalDefect.severity,
            status: req.body.status || originalDefect.status
          };
          
          // Update all changed fields in Azure DevOps
          const azureResult = await azureDevOpsService.updateWorkItem(
            originalDefect.azureWorkItemId,
            updateData,
            testCaseTitle
          );
          
          if (azureResult.success) {
            console.log(`✅ Azure DevOps work item ${originalDefect.azureWorkItemId} updated successfully`);
          } else {
            console.warn(`⚠️ Failed to update Azure DevOps work item ${originalDefect.azureWorkItemId}:`, azureResult.error);
          }
        } catch (azureError) {
          console.error(`❌ Azure DevOps update error for defect ${originalDefect.defectId}:`, azureError);
          // Don't fail the defect update if Azure DevOps fails
        }
      }
      
      res.json(updatedDefect);
    } catch (error) {
      console.error('Error updating defect:', error);
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

  app.patch("/api/test-run-results/:id", licenseMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.updateTestRunResult(id, req.body);
      if (!result) {
        return res.status(404).json({ error: "Test run result not found" });
      }
      
      // If status is being updated (not just notes), change test run status to "in progress"
      if (req.body.status && req.body.status !== "not_executed") {
        const testRun = await storage.getTestRun(result.testRunId);
        if (testRun && testRun.status !== "in progress") {
          await storage.updateTestRun(result.testRunId, { 
            status: "in progress",
            startedAt: new Date()
          });
          console.log(`Auto-updated test run ${result.testRunId} status to "in progress"`);
        }
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error updating test run result:", error);
      res.status(500).json({ error: "Failed to update test run result" });
    }
  });

  // Dashboard Statistics (protected by license)
  app.get("/api/dashboard/stats", licenseMiddleware, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let testCases = await storage.getTestCases();
      let testRuns = await storage.getTestRuns();
      let defects = await storage.getDefects();
      
      // Filter by project if projectId is provided
      if (projectId) {
        testCases = testCases.filter(tc => tc.projectId === projectId);
        testRuns = testRuns.filter(tr => tr.projectId === projectId);
        defects = defects.filter(d => d.projectId === projectId);
      }
      
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
