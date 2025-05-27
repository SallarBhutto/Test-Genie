import {
  users, projects, modules, components, testSuites, testCases, testRuns, testRunResults, defects, requirements,
  type User, type InsertUser, type Project, type InsertProject,
  type Module, type InsertModule, type Component, type InsertComponent,
  type TestSuite, type InsertTestSuite, type TestCase, type InsertTestCase,
  type TestRun, type InsertTestRun, type TestRunResult, type InsertTestRunResult,
  type Defect, type InsertDefect, type Requirement, type InsertRequirement
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getUsers(): Promise<User[]>;

  // Sessions
  createSession(session: { id: string; userId: number; expiresAt: Date }): Promise<{ id: string; userId: number; expiresAt: Date; createdAt: Date }>;
  getSession(id: string): Promise<{ id: string; userId: number; expiresAt: Date; createdAt: Date } | undefined>;
  deleteSession(id: string): Promise<boolean>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Modules
  getModules(projectId?: number): Promise<Module[]>;
  getModule(id: number): Promise<Module | undefined>;
  createModule(module: InsertModule): Promise<Module>;
  updateModule(id: number, module: Partial<Module>): Promise<Module | undefined>;
  deleteModule(id: number): Promise<boolean>;

  // Components
  getComponents(moduleId?: number): Promise<Component[]>;
  getComponent(id: number): Promise<Component | undefined>;
  createComponent(component: InsertComponent): Promise<Component>;
  updateComponent(id: number, component: Partial<Component>): Promise<Component | undefined>;
  deleteComponent(id: number): Promise<boolean>;

  // Test Suites
  getTestSuites(projectId?: number): Promise<TestSuite[]>;
  getTestSuite(id: number): Promise<TestSuite | undefined>;
  createTestSuite(testSuite: InsertTestSuite): Promise<TestSuite>;
  updateTestSuite(id: number, testSuite: Partial<TestSuite>): Promise<TestSuite | undefined>;
  deleteTestSuite(id: number): Promise<boolean>;

  // Test Cases
  getTestCases(testSuiteId?: number): Promise<TestCase[]>;
  getTestCase(id: number): Promise<TestCase | undefined>;
  createTestCase(testCase: InsertTestCase): Promise<TestCase>;
  updateTestCase(id: number, testCase: Partial<TestCase>): Promise<TestCase | undefined>;
  deleteTestCase(id: number): Promise<boolean>;

  // Test Runs
  getTestRuns(projectId?: number): Promise<TestRun[]>;
  getTestRun(id: number): Promise<TestRun | undefined>;
  createTestRun(testRun: InsertTestRun): Promise<TestRun>;
  updateTestRun(id: number, testRun: Partial<TestRun>): Promise<TestRun | undefined>;
  deleteTestRun(id: number): Promise<boolean>;

  // Test Run Results
  getTestRunResults(testRunId: number): Promise<TestRunResult[]>;
  createTestRunResult(result: InsertTestRunResult): Promise<TestRunResult>;
  updateTestRunResult(id: number, result: Partial<TestRunResult>): Promise<TestRunResult | undefined>;

  // Defects
  getDefects(projectId?: number): Promise<Defect[]>;
  getDefect(id: number): Promise<Defect | undefined>;
  createDefect(defect: InsertDefect): Promise<Defect>;
  updateDefect(id: number, defect: Partial<Defect>): Promise<Defect | undefined>;
  deleteDefect(id: number): Promise<boolean>;

  // Requirements
  getRequirements(projectId?: number): Promise<Requirement[]>;
  getRequirement(id: number): Promise<Requirement | undefined>;
  createRequirement(requirement: InsertRequirement): Promise<Requirement>;
  updateRequirement(id: number, requirement: Partial<Requirement>): Promise<Requirement | undefined>;
  deleteRequirement(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private projects: Map<number, Project> = new Map();
  private modules: Map<number, Module> = new Map();
  private components: Map<number, Component> = new Map();
  private testSuites: Map<number, TestSuite> = new Map();
  private testCases: Map<number, TestCase> = new Map();
  private testRuns: Map<number, TestRun> = new Map();
  private testRunResults: Map<number, TestRunResult> = new Map();
  private defects: Map<number, Defect> = new Map();
  private requirements: Map<number, Requirement> = new Map();
  private currentId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed users
    const user1: User = {
      id: this.currentId++,
      username: "john.smith",
      password: "hashed_password",
      email: "john.smith@qatouch.com",
      fullName: "John Smith",
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
      createdAt: new Date(),
    };
    
    const user2: User = {
      id: this.currentId++,
      username: "sarah.wilson",
      password: "hashed_password",
      email: "sarah.wilson@qatouch.com",
      fullName: "Sarah Wilson",
      role: "tester",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face",
      createdAt: new Date(),
    };

    const user3: User = {
      id: this.currentId++,
      username: "mike.chen",
      password: "hashed_password",
      email: "mike.chen@qatouch.com",
      fullName: "Mike Chen",
      role: "tester",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
      createdAt: new Date(),
    };

    const user4: User = {
      id: this.currentId++,
      username: "lisa.rodriguez",
      password: "hashed_password",
      email: "lisa.rodriguez@qatouch.com",
      fullName: "Lisa Rodriguez",
      role: "manager",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face",
      createdAt: new Date(),
    };

    this.users.set(user1.id, user1);
    this.users.set(user2.id, user2);
    this.users.set(user3.id, user3);
    this.users.set(user4.id, user4);

    // Seed project
    const project1: Project = {
      id: this.currentId++,
      name: "E-Commerce Testing",
      description: "Comprehensive testing suite for the e-commerce platform",
      status: "active",
      createdBy: user1.id,
      createdAt: new Date(),
    };
    this.projects.set(project1.id, project1);

    // Seed modules
    const module1: Module = {
      id: this.currentId++,
      name: "Authentication Module",
      description: "User authentication and authorization functionality",
      projectId: project1.id,
      createdBy: user1.id,
      createdAt: new Date(),
    };
    this.modules.set(module1.id, module1);

    // Seed components
    const component1: Component = {
      id: this.currentId++,
      name: "Login Component",
      description: "User login interface and validation",
      moduleId: module1.id,
      createdBy: user1.id,
      createdAt: new Date(),
    };
    this.components.set(component1.id, component1);

    // Seed test suite
    const testSuite1: TestSuite = {
      id: this.currentId++,
      name: "Login Module",
      description: "Authentication and login functionality tests",
      projectId: project1.id,
      moduleId: module1.id,
      componentId: component1.id,
      createdBy: user1.id,
      createdAt: new Date(),
    };
    this.testSuites.set(testSuite1.id, testSuite1);

    // Seed test cases
    const testCase1: TestCase = {
      id: this.currentId++,
      testCaseId: "TC-001",
      title: "Verify user login with valid credentials",
      description: "Test successful user authentication with valid username and password",
      preconditions: "User account exists in the system",
      steps: [
        "Navigate to login page",
        "Enter valid username",
        "Enter valid password",
        "Click login button"
      ],
      expectedResult: "User should be successfully logged in and redirected to dashboard",
      priority: "high",
      status: "passed",
      testSuiteId: testSuite1.id,
      assignedTo: user2.id,
      createdBy: user1.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const testCase2: TestCase = {
      id: this.currentId++,
      testCaseId: "TC-002",
      title: "Test password reset functionality",
      description: "Verify password reset process works correctly",
      preconditions: "User account exists with valid email",
      steps: [
        "Navigate to login page",
        "Click 'Forgot Password' link",
        "Enter valid email address",
        "Click reset button"
      ],
      expectedResult: "Password reset email should be sent successfully",
      priority: "medium",
      status: "ready",
      testSuiteId: testSuite1.id,
      assignedTo: user3.id,
      createdBy: user1.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.testCases.set(testCase1.id, testCase1);
    this.testCases.set(testCase2.id, testCase2);

    // Seed defects
    const defect1: Defect = {
      id: this.currentId++,
      defectId: "DEF-001",
      title: "Login button not responsive on mobile",
      description: "The login button becomes unclickable on mobile devices below 480px width",
      severity: "high",
      priority: "high",
      status: "open",
      testCaseId: testCase1.id,
      projectId: project1.id,
      reportedBy: user2.id,
      assignedTo: user3.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.defects.set(defect1.id, defect1);
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentId++,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const project: Project = {
      ...insertProject,
      id: this.currentId++,
      createdAt: new Date(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...projectUpdate };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Modules
  async getModules(projectId?: number): Promise<Module[]> {
    const allModules = Array.from(this.modules.values());
    if (projectId) {
      return allModules.filter(module => module.projectId === projectId);
    }
    return allModules;
  }

  async getModule(id: number): Promise<Module | undefined> {
    return this.modules.get(id);
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const module: Module = {
      id: this.currentId++,
      ...insertModule,
      description: insertModule.description || null,
      createdAt: new Date(),
    };
    this.modules.set(module.id, module);
    return module;
  }

  async updateModule(id: number, moduleUpdate: Partial<Module>): Promise<Module | undefined> {
    const module = this.modules.get(id);
    if (!module) return undefined;
    
    const updatedModule = { ...module, ...moduleUpdate };
    this.modules.set(id, updatedModule);
    return updatedModule;
  }

  async deleteModule(id: number): Promise<boolean> {
    return this.modules.delete(id);
  }

  // Components
  async getComponents(moduleId?: number): Promise<Component[]> {
    const allComponents = Array.from(this.components.values());
    if (moduleId) {
      return allComponents.filter(component => component.moduleId === moduleId);
    }
    return allComponents;
  }

  async getComponent(id: number): Promise<Component | undefined> {
    return this.components.get(id);
  }

  async createComponent(insertComponent: InsertComponent): Promise<Component> {
    const component: Component = {
      id: this.currentId++,
      ...insertComponent,
      description: insertComponent.description || null,
      createdAt: new Date(),
    };
    this.components.set(component.id, component);
    return component;
  }

  async updateComponent(id: number, componentUpdate: Partial<Component>): Promise<Component | undefined> {
    const component = this.components.get(id);
    if (!component) return undefined;
    
    const updatedComponent = { ...component, ...componentUpdate };
    this.components.set(id, updatedComponent);
    return updatedComponent;
  }

  async deleteComponent(id: number): Promise<boolean> {
    return this.components.delete(id);
  }

  // Test Suites
  async getTestSuites(projectId?: number): Promise<TestSuite[]> {
    const suites = Array.from(this.testSuites.values());
    return projectId ? suites.filter(suite => suite.projectId === projectId) : suites;
  }

  async getTestSuite(id: number): Promise<TestSuite | undefined> {
    return this.testSuites.get(id);
  }

  async createTestSuite(insertTestSuite: InsertTestSuite): Promise<TestSuite> {
    const testSuite: TestSuite = {
      ...insertTestSuite,
      id: this.currentId++,
      createdAt: new Date(),
    };
    this.testSuites.set(testSuite.id, testSuite);
    return testSuite;
  }

  async updateTestSuite(id: number, testSuiteUpdate: Partial<TestSuite>): Promise<TestSuite | undefined> {
    const testSuite = this.testSuites.get(id);
    if (!testSuite) return undefined;
    
    const updatedTestSuite = { ...testSuite, ...testSuiteUpdate };
    this.testSuites.set(id, updatedTestSuite);
    return updatedTestSuite;
  }

  async deleteTestSuite(id: number): Promise<boolean> {
    return this.testSuites.delete(id);
  }

  // Test Cases
  async getTestCases(testSuiteId?: number): Promise<TestCase[]> {
    const cases = Array.from(this.testCases.values());
    return testSuiteId ? cases.filter(testCase => testCase.testSuiteId === testSuiteId) : cases;
  }

  async getTestCase(id: number): Promise<TestCase | undefined> {
    return this.testCases.get(id);
  }

  async createTestCase(insertTestCase: InsertTestCase): Promise<TestCase> {
    const testCase: TestCase = {
      ...insertTestCase,
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.testCases.set(testCase.id, testCase);
    return testCase;
  }

  async updateTestCase(id: number, testCaseUpdate: Partial<TestCase>): Promise<TestCase | undefined> {
    const testCase = this.testCases.get(id);
    if (!testCase) return undefined;
    
    const updatedTestCase = { 
      ...testCase, 
      ...testCaseUpdate, 
      updatedAt: new Date() 
    };
    this.testCases.set(id, updatedTestCase);
    return updatedTestCase;
  }

  async deleteTestCase(id: number): Promise<boolean> {
    return this.testCases.delete(id);
  }

  // Test Runs
  async getTestRuns(projectId?: number): Promise<TestRun[]> {
    const runs = Array.from(this.testRuns.values());
    return projectId ? runs.filter(run => run.projectId === projectId) : runs;
  }

  async getTestRun(id: number): Promise<TestRun | undefined> {
    return this.testRuns.get(id);
  }

  async createTestRun(insertTestRun: InsertTestRun): Promise<TestRun> {
    const testRun: TestRun = {
      ...insertTestRun,
      id: this.currentId++,
      createdAt: new Date(),
    };
    this.testRuns.set(testRun.id, testRun);
    return testRun;
  }

  async updateTestRun(id: number, testRunUpdate: Partial<TestRun>): Promise<TestRun | undefined> {
    const testRun = this.testRuns.get(id);
    if (!testRun) return undefined;
    
    // Convert string dates to Date objects
    const processedUpdate = { ...testRunUpdate };
    if (processedUpdate.completedAt && typeof processedUpdate.completedAt === 'string') {
      processedUpdate.completedAt = new Date(processedUpdate.completedAt);
    }
    
    const updatedTestRun = { ...testRun, ...processedUpdate };
    this.testRuns.set(id, updatedTestRun);
    return updatedTestRun;
  }

  async deleteTestRun(id: number): Promise<boolean> {
    return this.testRuns.delete(id);
  }

  // Test Run Results
  async getTestRunResults(testRunId: number): Promise<TestRunResult[]> {
    return Array.from(this.testRunResults.values()).filter(result => result.testRunId === testRunId);
  }

  async createTestRunResult(insertResult: InsertTestRunResult): Promise<TestRunResult> {
    const result: TestRunResult = {
      ...insertResult,
      id: this.currentId++,
      executedAt: new Date(),
    };
    this.testRunResults.set(result.id, result);
    return result;
  }

  async updateTestRunResult(id: number, resultUpdate: Partial<TestRunResult>): Promise<TestRunResult | undefined> {
    const result = this.testRunResults.get(id);
    if (!result) return undefined;
    
    const updatedResult = { ...result, ...resultUpdate };
    this.testRunResults.set(id, updatedResult);
    return updatedResult;
  }

  // Defects
  async getDefects(projectId?: number): Promise<Defect[]> {
    const defects = Array.from(this.defects.values());
    return projectId ? defects.filter(defect => defect.projectId === projectId) : defects;
  }

  async getDefect(id: number): Promise<Defect | undefined> {
    return this.defects.get(id);
  }

  async createDefect(insertDefect: InsertDefect): Promise<Defect> {
    const defect: Defect = {
      ...insertDefect,
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.defects.set(defect.id, defect);
    return defect;
  }

  async updateDefect(id: number, defectUpdate: Partial<Defect>): Promise<Defect | undefined> {
    const defect = this.defects.get(id);
    if (!defect) return undefined;
    
    const updatedDefect = { 
      ...defect, 
      ...defectUpdate, 
      updatedAt: new Date() 
    };
    this.defects.set(id, updatedDefect);
    return updatedDefect;
  }

  async deleteDefect(id: number): Promise<boolean> {
    return this.defects.delete(id);
  }

  // Requirements
  async getRequirements(projectId?: number): Promise<Requirement[]> {
    const requirements = Array.from(this.requirements.values());
    return projectId ? requirements.filter(req => req.projectId === projectId) : requirements;
  }

  async getRequirement(id: number): Promise<Requirement | undefined> {
    return this.requirements.get(id);
  }

  async createRequirement(insertRequirement: InsertRequirement): Promise<Requirement> {
    const requirement: Requirement = {
      ...insertRequirement,
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.requirements.set(requirement.id, requirement);
    return requirement;
  }

  async updateRequirement(id: number, requirementUpdate: Partial<Requirement>): Promise<Requirement | undefined> {
    const requirement = this.requirements.get(id);
    if (!requirement) return undefined;
    
    const updatedRequirement = { 
      ...requirement, 
      ...requirementUpdate, 
      updatedAt: new Date() 
    };
    this.requirements.set(id, updatedRequirement);
    return updatedRequirement;
  }

  async deleteRequirement(id: number): Promise<boolean> {
    return this.requirements.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log("DatabaseStorage.createUser called with:", insertUser);
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        password: insertUser.password || 'hashed_password_default',
        email: insertUser.email,
        fullName: insertUser.fullName,
        role: insertUser.role || 'tester',
        avatar: insertUser.avatar || null
      })
      .returning();
    console.log("DatabaseStorage.createUser result:", user);
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, projectUpdate: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set(projectUpdate)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  async getModules(projectId?: number): Promise<Module[]> {
    if (projectId) {
      return await db.select().from(modules).where(eq(modules.projectId, projectId));
    }
    return await db.select().from(modules);
  }

  async getModule(id: number): Promise<Module | undefined> {
    const [module] = await db.select().from(modules).where(eq(modules.id, id));
    return module || undefined;
  }

  async createModule(insertModule: InsertModule): Promise<Module> {
    const [module] = await db
      .insert(modules)
      .values(insertModule)
      .returning();
    return module;
  }

  async updateModule(id: number, moduleUpdate: Partial<Module>): Promise<Module | undefined> {
    const [module] = await db
      .update(modules)
      .set(moduleUpdate)
      .where(eq(modules.id, id))
      .returning();
    return module || undefined;
  }

  async deleteModule(id: number): Promise<boolean> {
    const result = await db.delete(modules).where(eq(modules.id, id));
    return result.rowCount > 0;
  }

  async getComponents(moduleId?: number): Promise<Component[]> {
    if (moduleId) {
      return await db.select().from(components).where(eq(components.moduleId, moduleId));
    }
    return await db.select().from(components);
  }

  async getComponent(id: number): Promise<Component | undefined> {
    const [component] = await db.select().from(components).where(eq(components.id, id));
    return component || undefined;
  }

  async createComponent(insertComponent: InsertComponent): Promise<Component> {
    const [component] = await db
      .insert(components)
      .values(insertComponent)
      .returning();
    return component;
  }

  async updateComponent(id: number, componentUpdate: Partial<Component>): Promise<Component | undefined> {
    const [component] = await db
      .update(components)
      .set(componentUpdate)
      .where(eq(components.id, id))
      .returning();
    return component || undefined;
  }

  async deleteComponent(id: number): Promise<boolean> {
    const result = await db.delete(components).where(eq(components.id, id));
    return result.rowCount > 0;
  }

  async getTestSuites(projectId?: number): Promise<TestSuite[]> {
    if (projectId) {
      return await db.select().from(testSuites).where(eq(testSuites.projectId, projectId));
    }
    return await db.select().from(testSuites);
  }

  async getTestSuite(id: number): Promise<TestSuite | undefined> {
    const [testSuite] = await db.select().from(testSuites).where(eq(testSuites.id, id));
    return testSuite || undefined;
  }

  async createTestSuite(insertTestSuite: InsertTestSuite): Promise<TestSuite> {
    const [testSuite] = await db
      .insert(testSuites)
      .values(insertTestSuite)
      .returning();
    return testSuite;
  }

  async updateTestSuite(id: number, testSuiteUpdate: Partial<TestSuite>): Promise<TestSuite | undefined> {
    const [testSuite] = await db
      .update(testSuites)
      .set(testSuiteUpdate)
      .where(eq(testSuites.id, id))
      .returning();
    return testSuite || undefined;
  }

  async deleteTestSuite(id: number): Promise<boolean> {
    const result = await db.delete(testSuites).where(eq(testSuites.id, id));
    return result.rowCount > 0;
  }

  async getTestCases(testSuiteId?: number): Promise<TestCase[]> {
    if (testSuiteId) {
      return await db.select().from(testCases).where(eq(testCases.testSuiteId, testSuiteId));
    }
    return await db.select().from(testCases);
  }

  async getTestCase(id: number): Promise<TestCase | undefined> {
    const [testCase] = await db.select().from(testCases).where(eq(testCases.id, id));
    return testCase || undefined;
  }

  async createTestCase(insertTestCase: InsertTestCase): Promise<TestCase> {
    const [testCase] = await db
      .insert(testCases)
      .values(insertTestCase)
      .returning();
    return testCase;
  }

  async updateTestCase(id: number, testCaseUpdate: Partial<TestCase>): Promise<TestCase | undefined> {
    const [testCase] = await db
      .update(testCases)
      .set(testCaseUpdate)
      .where(eq(testCases.id, id))
      .returning();
    return testCase || undefined;
  }

  async deleteTestCase(id: number): Promise<boolean> {
    const result = await db.delete(testCases).where(eq(testCases.id, id));
    return result.rowCount > 0;
  }

  async getTestRuns(projectId?: number): Promise<TestRun[]> {
    if (projectId) {
      return await db.select().from(testRuns).where(eq(testRuns.projectId, projectId));
    }
    return await db.select().from(testRuns);
  }

  async getTestRun(id: number): Promise<TestRun | undefined> {
    const [testRun] = await db.select().from(testRuns).where(eq(testRuns.id, id));
    return testRun || undefined;
  }

  async createTestRun(insertTestRun: InsertTestRun): Promise<TestRun> {
    const [testRun] = await db
      .insert(testRuns)
      .values(insertTestRun)
      .returning();
    return testRun;
  }

  async updateTestRun(id: number, testRunUpdate: Partial<TestRun>): Promise<TestRun | undefined> {
    try {
      console.log("Database updateTestRun called with:", { id, testRunUpdate });
      
      // Convert ISO string to Date object if completedAt is provided
      if (testRunUpdate.completedAt && typeof testRunUpdate.completedAt === 'string') {
        testRunUpdate.completedAt = new Date(testRunUpdate.completedAt);
      }
      
      const [testRun] = await db
        .update(testRuns)
        .set(testRunUpdate)
        .where(eq(testRuns.id, id))
        .returning();
      
      console.log("Database updateTestRun result:", testRun);
      return testRun || undefined;
    } catch (error) {
      console.error("Database updateTestRun error:", error);
      throw error;
    }
  }

  async deleteTestRun(id: number): Promise<boolean> {
    const result = await db.delete(testRuns).where(eq(testRuns.id, id));
    return result.rowCount > 0;
  }

  async getTestRunResults(testRunId: number): Promise<TestRunResult[]> {
    return await db.select().from(testRunResults).where(eq(testRunResults.testRunId, testRunId));
  }

  async createTestRunResult(insertResult: InsertTestRunResult): Promise<TestRunResult> {
    const [result] = await db
      .insert(testRunResults)
      .values(insertResult)
      .returning();
    return result;
  }

  async updateTestRunResult(id: number, resultUpdate: Partial<TestRunResult>): Promise<TestRunResult | undefined> {
    const [result] = await db
      .update(testRunResults)
      .set(resultUpdate)
      .where(eq(testRunResults.id, id))
      .returning();
    return result || undefined;
  }

  async getDefects(projectId?: number): Promise<Defect[]> {
    if (projectId) {
      return await db.select().from(defects).where(eq(defects.projectId, projectId));
    }
    return await db.select().from(defects);
  }

  async getDefect(id: number): Promise<Defect | undefined> {
    const [defect] = await db.select().from(defects).where(eq(defects.id, id));
    return defect || undefined;
  }

  async createDefect(insertDefect: InsertDefect): Promise<Defect> {
    const [defect] = await db
      .insert(defects)
      .values(insertDefect)
      .returning();
    return defect;
  }

  async updateDefect(id: number, defectUpdate: Partial<Defect>): Promise<Defect | undefined> {
    const [defect] = await db
      .update(defects)
      .set(defectUpdate)
      .where(eq(defects.id, id))
      .returning();
    return defect || undefined;
  }

  async deleteDefect(id: number): Promise<boolean> {
    const result = await db.delete(defects).where(eq(defects.id, id));
    return result.rowCount > 0;
  }

  async getRequirements(projectId?: number): Promise<Requirement[]> {
    if (projectId) {
      return await db.select().from(requirements).where(eq(requirements.projectId, projectId));
    }
    return await db.select().from(requirements);
  }

  async getRequirement(id: number): Promise<Requirement | undefined> {
    const [requirement] = await db.select().from(requirements).where(eq(requirements.id, id));
    return requirement || undefined;
  }

  async createRequirement(insertRequirement: InsertRequirement): Promise<Requirement> {
    const [requirement] = await db
      .insert(requirements)
      .values(insertRequirement)
      .returning();
    return requirement;
  }

  async updateRequirement(id: number, requirementUpdate: Partial<Requirement>): Promise<Requirement | undefined> {
    const [requirement] = await db
      .update(requirements)
      .set(requirementUpdate)
      .where(eq(requirements.id, id))
      .returning();
    return requirement || undefined;
  }

  async deleteRequirement(id: number): Promise<boolean> {
    const result = await db.delete(requirements).where(eq(requirements.id, id));
    return result.rowCount > 0;
  }

  // Sessions
  async createSession(sessionData: { id: string; userId: number; expiresAt: Date }): Promise<{ id: string; userId: number; expiresAt: Date; createdAt: Date }> {
    const [session] = await db
      .insert(sessions)
      .values(sessionData)
      .returning();
    return session;
  }

  async getSession(id: string): Promise<{ id: string; userId: number; expiresAt: Date; createdAt: Date } | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async deleteSession(id: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
