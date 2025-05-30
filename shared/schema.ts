import { pgTable, text, serial, integer, boolean, timestamp, json, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("tester"), // admin, manager, tester
  avatar: text("avatar"),
  isActive: boolean("is_active").notNull().default(true),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  teamName: text("team_name"), // Used as Area Path in Azure DevOps
  status: text("status").notNull().default("active"), // active, inactive, archived
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const components = pgTable("components", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  moduleId: integer("module_id").references(() => modules.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testSuites = pgTable("test_suites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testSuiteTestCases = pgTable("test_suite_test_cases", {
  id: serial("id").primaryKey(),
  testSuiteId: integer("test_suite_id").references(() => testSuites.id).notNull(),
  testCaseId: integer("test_case_id").references(() => testCases.id).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const testCases = pgTable("test_cases", {
  id: serial("id").primaryKey(),
  testCaseId: text("test_case_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  preconditions: text("preconditions"),
  steps: json("steps").$type<string[]>().notNull().default([]),
  expectedResult: text("expected_result").notNull(),
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("draft"), // draft, ready, passed, failed, blocked
  projectId: integer("project_id").references(() => projects.id),
  moduleId: integer("module_id").references(() => modules.id),
  componentId: integer("component_id").references(() => components.id),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const testRuns = pgTable("test_runs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, aborted
  projectId: integer("project_id").references(() => projects.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testRunResults = pgTable("test_run_results", {
  id: serial("id").primaryKey(),
  testRunId: integer("test_run_id").references(() => testRuns.id).notNull(),
  testCaseId: integer("test_case_id").references(() => testCases.id).notNull(),
  status: text("status").notNull(), // passed, failed, blocked, skipped
  executedBy: integer("executed_by").references(() => users.id),
  notes: text("notes"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const defects = pgTable("defects", {
  id: serial("id").primaryKey(),
  defectId: text("defect_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed, reopened
  testCaseId: integer("test_case_id").references(() => testCases.id),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  reportedBy: integer("reported_by").references(() => users.id).notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  azureWorkItemId: integer("azure_work_item_id"), // Azure DevOps work item ID
  azureWorkItemUrl: text("azure_work_item_url"), // Direct link to Azure DevOps work item
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const requirements = pgTable("requirements", {
  id: serial("id").primaryKey(),
  requirementId: text("requirement_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default("functional"), // functional, non_functional, technical
  priority: text("priority").notNull().default("medium"), // low, medium, high, critical
  status: text("status").notNull().default("draft"), // draft, approved, implemented, tested
  projectId: integer("project_id").references(() => projects.id).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: json("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});



// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertModuleSchema = createInsertSchema(modules).omit({
  id: true,
  createdAt: true,
});

export const insertComponentSchema = createInsertSchema(components).omit({
  id: true,
  createdAt: true,
});

export const insertTestSuiteSchema = createInsertSchema(testSuites).omit({
  id: true,
  createdAt: true,
});

export const insertTestSuiteTestCaseSchema = createInsertSchema(testSuiteTestCases).omit({
  id: true,
  addedAt: true,
});

export const insertTestCaseSchema = createInsertSchema(testCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTestRunSchema = createInsertSchema(testRuns).omit({
  id: true,
  createdAt: true,
});

export const insertTestRunResultSchema = createInsertSchema(testRunResults).omit({
  id: true,
  executedAt: true,
});

export const insertDefectSchema = createInsertSchema(defects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRequirementSchema = createInsertSchema(requirements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  modules: many(modules),
  components: many(components),
  testSuites: many(testSuites),
  testCases: many(testCases),
  testRuns: many(testRuns),
  defectsReported: many(defects, { relationName: "reporter" }),
  defectsAssigned: many(defects, { relationName: "assignee" }),
  requirements: many(requirements),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  modules: many(modules),
  testSuites: many(testSuites),
  testRuns: many(testRuns),
  defects: many(defects),
  requirements: many(requirements),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, {
    fields: [modules.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [modules.createdBy],
    references: [users.id],
  }),
  components: many(components),
  testSuites: many(testSuites),
}));

export const componentsRelations = relations(components, ({ one, many }) => ({
  module: one(modules, {
    fields: [components.moduleId],
    references: [modules.id],
  }),
  createdBy: one(users, {
    fields: [components.createdBy],
    references: [users.id],
  }),
  testSuites: many(testSuites),
}));

export const testSuitesRelations = relations(testSuites, ({ one, many }) => ({
  project: one(projects, {
    fields: [testSuites.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [testSuites.createdBy],
    references: [users.id],
  }),
  testSuiteTestCases: many(testSuiteTestCases),
}));

export const testSuiteTestCasesRelations = relations(testSuiteTestCases, ({ one }) => ({
  testSuite: one(testSuites, {
    fields: [testSuiteTestCases.testSuiteId],
    references: [testSuites.id],
  }),
  testCase: one(testCases, {
    fields: [testSuiteTestCases.testCaseId],
    references: [testCases.id],
  }),
}));

export const testCasesRelations = relations(testCases, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [testCases.createdBy],
    references: [users.id],
  }),
  assignedTo: one(users, {
    fields: [testCases.assignedTo],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [testCases.projectId],
    references: [projects.id],
  }),
  module: one(modules, {
    fields: [testCases.moduleId],
    references: [modules.id],
  }),
  component: one(components, {
    fields: [testCases.componentId],
    references: [components.id],
  }),
  testSuiteTestCases: many(testSuiteTestCases),
  testRunResults: many(testRunResults),
}));

export const testRunsRelations = relations(testRuns, ({ one, many }) => ({
  project: one(projects, {
    fields: [testRuns.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [testRuns.createdBy],
    references: [users.id],
  }),
  testRunResults: many(testRunResults),
}));

export const testRunResultsRelations = relations(testRunResults, ({ one }) => ({
  testCase: one(testCases, {
    fields: [testRunResults.testCaseId],
    references: [testCases.id],
  }),
  testRun: one(testRuns, {
    fields: [testRunResults.testRunId],
    references: [testRuns.id],
  }),
  executedBy: one(users, {
    fields: [testRunResults.executedBy],
    references: [users.id],
  }),
}));

export const defectsRelations = relations(defects, ({ one }) => ({
  project: one(projects, {
    fields: [defects.projectId],
    references: [projects.id],
  }),
  testCase: one(testCases, {
    fields: [defects.testCaseId],
    references: [testCases.id],
  }),
  reportedBy: one(users, {
    fields: [defects.reportedBy],
    references: [users.id],
    relationName: "reporter",
  }),
  assignedTo: one(users, {
    fields: [defects.assignedTo],
    references: [users.id],
    relationName: "assignee",
  }),
}));

export const requirementsRelations = relations(requirements, ({ one }) => ({
  project: one(projects, {
    fields: [requirements.projectId],
    references: [projects.id],
  }),
  createdBy: one(users, {
    fields: [requirements.createdBy],
    references: [users.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Module = typeof modules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type Component = typeof components.$inferSelect;
export type InsertComponent = z.infer<typeof insertComponentSchema>;
export type TestSuite = typeof testSuites.$inferSelect;
export type InsertTestSuite = z.infer<typeof insertTestSuiteSchema>;
export type TestSuiteTestCase = typeof testSuiteTestCases.$inferSelect;
export type InsertTestSuiteTestCase = z.infer<typeof insertTestSuiteTestCaseSchema>;
export type TestCase = typeof testCases.$inferSelect;
export type InsertTestCase = z.infer<typeof insertTestCaseSchema>;
export type TestRun = typeof testRuns.$inferSelect;
export type InsertTestRun = z.infer<typeof insertTestRunSchema>;
export type TestRunResult = typeof testRunResults.$inferSelect;
export type InsertTestRunResult = z.infer<typeof insertTestRunResultSchema>;
export type Defect = typeof defects.$inferSelect;
export type InsertDefect = z.infer<typeof insertDefectSchema>;
export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = z.infer<typeof insertRequirementSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;


