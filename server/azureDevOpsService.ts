import type { Defect } from "@shared/schema";
import { settingsService } from "./settingsService";

interface AzureDevOpsConfig {
  organization: string;
  project: string;
  personalAccessToken: string;
  apiVersion: string;
}

interface WorkItem {
  op: string;
  path: string;
  value: any;
}

export class AzureDevOpsService {
  private config: AzureDevOpsConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      organization: process.env.AZURE_DEVOPS_ORGANIZATION || '',
      project: process.env.AZURE_DEVOPS_PROJECT || '',
      personalAccessToken: process.env.AZURE_DEVOPS_PAT || '',
      apiVersion: '7.0'
    };
    
    this.baseUrl = `https://dev.azure.com/${this.config.organization}`;
  }

  private getAuthHeaders() {
    const token = Buffer.from(`:${this.config.personalAccessToken}`).toString('base64');
    return {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json-patch+json',
      'Accept': 'application/json'
    };
  }

  private mapPriorityToAzureDevOps(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      'critical': '1',
      'high': '2', 
      'medium': '3',
      'low': '4'
    };
    return priorityMap[priority] || '3';
  }

  private mapSeverityToAzureDevOps(severity: string): string {
    const severityMap: { [key: string]: string } = {
      'critical': '1 - Critical',
      'high': '2 - High',
      'medium': '3 - Medium', 
      'low': '4 - Low'
    };
    return severityMap[severity] || '3 - Medium';
  }

  private mapStatusToAzureDevOps(status: string): string {
    const statusMap: { [key: string]: string } = {
      'open': 'New',
      'in_progress': 'Active',
      'resolved': 'Resolved',
      'closed': 'Closed',
      'reopened': 'Active'
    };
    return statusMap[status] || 'New';
  }

  async createBugWorkItem(defect: Defect, reportedBy: string, testCaseTitle?: string, projectTeamName?: string): Promise<{ success: boolean; workItemId?: number; error?: string }> {
    try {
      // Get settings from database
      const settings = await settingsService.getSettings();
      const azureConfig = settings.azureDevOps;
      
      if (!azureConfig.enabled || !azureConfig.organization || !azureConfig.project || !azureConfig.personalAccessToken) {
        return {
          success: false,
          error: 'Azure DevOps integration not configured or disabled. Please check settings.'
        };
      }

      // Update config with current settings
      this.config.organization = azureConfig.organization;
      this.config.project = azureConfig.project;
      this.config.personalAccessToken = azureConfig.personalAccessToken;
      this.baseUrl = `https://dev.azure.com/${this.config.organization}`;

      const workItemFields: WorkItem[] = [
        {
          op: 'add',
          path: '/fields/System.Title',
          value: defect.title
        },
        {
          op: 'add', 
          path: '/fields/System.Description',
          value: this.formatDescription(defect, testCaseTitle)
        },
        {
          op: 'add',
          path: '/fields/Microsoft.VSTS.Common.Priority',
          value: this.mapPriorityToAzureDevOps(defect.priority)
        },
        {
          op: 'add',
          path: '/fields/Microsoft.VSTS.Common.Severity',
          value: this.mapSeverityToAzureDevOps(defect.severity)
        },
        {
          op: 'add',
          path: '/fields/System.State',
          value: this.mapStatusToAzureDevOps(defect.status)
        },
        {
          op: 'add',
          path: '/fields/System.CreatedBy',
          value: reportedBy
        },
        {
          op: 'add',
          path: '/fields/System.Tags',
          value: `QualityBytes; ${defect.defectId}; Test-Management`
        }
      ];

      // Add Area Path - use team name if provided, otherwise use project name
      const areaPath = projectTeamName ? `${this.config.project}\\${projectTeamName}` : this.config.project;
      console.log(`🔍 Azure DevOps Area Path being set: "${areaPath}" (project: ${this.config.project}, teamName: ${projectTeamName})`);
      workItemFields.push({
        op: 'add',
        path: '/fields/System.AreaPath',
        value: areaPath
      });

      // Add repro steps with description and test case reference
      let reproSteps = `**Defect Description:**\n${defect.description}\n\n**Defect ID:** ${defect.defectId}`;
      
      if (testCaseTitle) {
        reproSteps += `\n\n**Related Test Case:** ${testCaseTitle}`;
      }
      
      workItemFields.push({
        op: 'add',
        path: '/fields/Microsoft.VSTS.TCM.ReproSteps',
        value: reproSteps
      });

      const url = `${this.baseUrl}/${this.config.project}/_apis/wit/workitems/$Bug?api-version=${this.config.apiVersion}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(workItemFields)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure DevOps API Error:', response.status, errorText);
        return {
          success: false,
          error: `Azure DevOps API Error: ${response.status} - ${errorText}`
        };
      }

      const workItem = await response.json();
      console.log(`Bug work item created in Azure DevOps: ${workItem.id}`);

      return {
        success: true,
        workItemId: workItem.id
      };

    } catch (error) {
      console.error('Error creating Azure DevOps work item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private formatDescription(defect: any, testCaseTitle?: string): string {
    let description = `<h3>Bug Report from QualityBytes</h3>`;
    
    if (defect.defectId) {
      description += `<p><strong>Defect ID:</strong> ${defect.defectId}</p>`;
    }
    
    description += `<p><strong>Description:</strong></p>`;
    description += `<p>${defect.description}</p>`;
    
    if (testCaseTitle) {
      description += `<p><strong>Related Test Case:</strong> ${testCaseTitle}</p>`;
    }
    
    if (defect.priority) {
      description += `<p><strong>Priority:</strong> ${defect.priority}</p>`;
    }
    
    if (defect.severity) {
      description += `<p><strong>Severity:</strong> ${defect.severity}</p>`;
    }
    
    if (defect.status) {
      description += `<p><strong>Status:</strong> ${defect.status}</p>`;
    }
    
    if (defect.createdAt) {
      description += `<p><strong>Reported Date:</strong> ${new Date(defect.createdAt).toLocaleDateString()}</p>`;
    }
    
    description += `<p><em>This bug was automatically created from QualityBytes test management system.</em></p>`;

    return description;
  }

  async updateWorkItem(workItemId: number, updates: any, testCaseTitle?: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔍 Azure DevOps update request for work item ${workItemId}:`, JSON.stringify(updates, null, 2));
      
      // Get settings from database
      const settings = await settingsService.getSettings();
      const azureConfig = settings.azureDevOps;
      
      if (!azureConfig.enabled || !azureConfig.organization || !azureConfig.project || !azureConfig.personalAccessToken) {
        return {
          success: false,
          error: 'Azure DevOps integration not configured or disabled. Please check settings.'
        };
      }

      // Update config with current settings
      this.config.organization = azureConfig.organization;
      this.config.project = azureConfig.project;
      this.config.personalAccessToken = azureConfig.personalAccessToken;
      this.baseUrl = `https://dev.azure.com/${this.config.organization}`;
      
      // First, verify the work item exists
      const checkUrl = `${this.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=${this.config.apiVersion}`;
      console.log(`🔍 Check URL: ${checkUrl}`);
      console.log(`🔍 Base URL: ${this.baseUrl}`);
      const checkResponse = await fetch(checkUrl, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error(`❌ Work item ${workItemId} not found or not accessible:`, checkResponse.status, errorText);
        return {
          success: false,
          error: `Work item ${workItemId} not found or not accessible: ${checkResponse.status} - ${errorText}`
        };
      }

      console.log(`✅ Work item ${workItemId} exists and is accessible`);
      
      const workItemFields: WorkItem[] = [];

      // Update title if provided
      if (updates.title) {
        console.log(`📝 Adding title update: ${updates.title}`);
        workItemFields.push({
          op: 'add',
          path: '/fields/System.Title',
          value: updates.title
        });
      }

      // Update description if provided
      if (updates.description) {
        const formattedDescription = this.formatDescription(updates, testCaseTitle);
        console.log(`📝 Adding description update:`, formattedDescription);
        
        // Update both System.Description and Repro Steps for better visibility
        workItemFields.push({
          op: 'add',
          path: '/fields/System.Description',
          value: formattedDescription
        });
        
        // Also update the Repro Steps field with a simpler format
        const reproSteps = `**Description:** ${updates.description}\n\n` +
                          `**Defect ID:** ${updates.defectId || 'N/A'}\n\n` +
                          (testCaseTitle ? `**Related Test Case:** ${testCaseTitle}\n\n` : '') +
                          `**Priority:** ${updates.priority || 'N/A'}\n\n` +
                          `**Severity:** ${updates.severity || 'N/A'}\n\n` +
                          `**Status:** ${updates.status || 'N/A'}\n\n` +
                          `*Synced from QualityBytes*`;
        
        workItemFields.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.TCM.ReproSteps',
          value: reproSteps
        });
        
        console.log(`📝 Adding repro steps update:`, reproSteps);
      }

      // Update status if provided
      if (updates.status) {
        const mappedStatus = this.mapStatusToAzureDevOps(updates.status);
        console.log(`📝 Adding status update: ${updates.status} -> ${mappedStatus}`);
        workItemFields.push({
          op: 'add',
          path: '/fields/System.State',
          value: mappedStatus
        });
      }

      // Update priority if provided
      if (updates.priority) {
        const mappedPriority = this.mapPriorityToAzureDevOps(updates.priority);
        console.log(`📝 Adding priority update: ${updates.priority} -> ${mappedPriority}`);
        workItemFields.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.Common.Priority',
          value: mappedPriority
        });
      }

      // Update severity if provided
      if (updates.severity) {
        const mappedSeverity = this.mapSeverityToAzureDevOps(updates.severity);
        console.log(`📝 Adding severity update: ${updates.severity} -> ${mappedSeverity}`);
        workItemFields.push({
          op: 'add',
          path: '/fields/Microsoft.VSTS.Common.Severity',
          value: mappedSeverity
        });
      }

      // Only proceed if there are fields to update
      if (workItemFields.length === 0) {
        console.log(`ℹ️ No fields to update for work item ${workItemId}`);
        return { success: true }; // Nothing to update
      }

      console.log(`🔄 Sending ${workItemFields.length} field updates to Azure DevOps work item ${workItemId}`);
      
      const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=${this.config.apiVersion}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(workItemFields)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure DevOps Update Error:', response.status, errorText);
        console.error('Update payload:', JSON.stringify(workItemFields, null, 2));
        return {
          success: false,
          error: `Failed to update work item: ${response.status} - ${errorText}`
        };
      }

      console.log(`✅ Successfully updated Azure DevOps work item ${workItemId}`);
      return { success: true };

    } catch (error) {
      console.error('Error updating Azure DevOps work item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Keep the old method for backward compatibility but delegate to new method
  async updateWorkItemStatus(workItemId: number, status: string): Promise<{ success: boolean; error?: string }> {
    return this.updateWorkItem(workItemId, { status });
  }

  async getWorkItemUrl(workItemId: number): string {
    return `https://dev.azure.com/${this.config.organization}/${this.config.project}/_workitems/edit/${workItemId}`;
  }

  async testWorkItemAccess(workItemId: number): Promise<{ success: boolean; error?: string; workItem?: any }> {
    try {
      console.log(`🔍 Testing access to work item ${workItemId}`);
      
      // Get settings from database
      const settings = await settingsService.getSettings();
      const azureConfig = settings.azureDevOps;
      
      if (!azureConfig.enabled || !azureConfig.organization || !azureConfig.project || !azureConfig.personalAccessToken) {
        return {
          success: false,
          error: 'Azure DevOps integration not configured or disabled. Please check settings.'
        };
      }

      // Update config with current settings
      this.config.organization = azureConfig.organization;
      this.config.project = azureConfig.project;
      this.config.personalAccessToken = azureConfig.personalAccessToken;
      this.baseUrl = `https://dev.azure.com/${this.config.organization}`;
      
      console.log(`🔍 Using base URL: ${this.baseUrl}`);
      
      const url = `${this.baseUrl}/_apis/wit/workitems/${workItemId}?api-version=${this.config.apiVersion}`;
      console.log(`🔍 Request URL: ${url}`);
      
      const authHeaders = this.getAuthHeaders();
      console.log(`🔍 Auth headers:`, { ...authHeaders, Authorization: '[REDACTED]' });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: authHeaders
      });

      console.log(`🔍 Response status: ${response.status}`);
      console.log(`🔍 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Failed to access work item ${workItemId}:`, response.status, errorText);
        return {
          success: false,
          error: `${response.status} - ${errorText}`
        };
      }

      const workItem = await response.json();
      console.log(`✅ Successfully accessed work item ${workItemId}:`, {
        id: workItem.id,
        title: workItem.fields?.['System.Title'],
        state: workItem.fields?.['System.State']
      });

      return {
        success: true,
        workItem
      };

    } catch (error) {
      console.error(`❌ Error testing work item access:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async isConfigured(): Promise<boolean> {
    try {
      const settings = await settingsService.getSettings();
      console.log('🔍 Checking Azure DevOps configuration in defect creation:', {
        enabled: settings.azureDevOps?.enabled,
        hasOrg: !!settings.azureDevOps?.organization,
        hasProject: !!settings.azureDevOps?.project,
        hasToken: !!settings.azureDevOps?.personalAccessToken,
        rawSettings: settings.azureDevOps
      });
      
      const configured = !!(settings.azureDevOps?.enabled && 
               settings.azureDevOps?.organization && 
               settings.azureDevOps?.project && 
               settings.azureDevOps?.personalAccessToken);
      
      console.log('🔍 Azure DevOps isConfigured result in defect creation:', configured);
      
      // Update the local config if configured
      if (configured) {
        this.config = {
          organization: settings.azureDevOps.organization,
          project: settings.azureDevOps.project,
          personalAccessToken: settings.azureDevOps.personalAccessToken,
          apiVersion: '7.0'
        };
        this.baseUrl = `https://dev.azure.com/${this.config.organization}/_apis`;
        console.log('🔍 Updated Azure DevOps config and baseUrl for defect creation');
      }
      
      return configured;
    } catch (error) {
      console.error('Error checking Azure DevOps configuration:', error);
      return false;
    }
  }
}

export const azureDevOpsService = new AzureDevOpsService();