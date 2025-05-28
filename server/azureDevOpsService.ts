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
    
    this.baseUrl = `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis`;
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
      this.baseUrl = `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis`;

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
          path: '/fields/System.CreatedBy',
          value: reportedBy
        },
        {
          op: 'add',
          path: '/fields/System.Tags',
          value: `QualityBytes; ${defect.defectId}; Test-Management`
        }
      ];

      // Add Area Path if team name is provided
      if (projectTeamName) {
        workItemFields.push({
          op: 'add',
          path: '/fields/System.AreaPath',
          value: `${this.config.project}\\${projectTeamName}`
        });
      }

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

      const url = `${this.baseUrl}/wit/workitems/$Bug?api-version=${this.config.apiVersion}`;
      
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

  private formatDescription(defect: Defect, testCaseTitle?: string): string {
    let description = `<h3>Bug Report from QualityBytes</h3>`;
    description += `<p><strong>Defect ID:</strong> ${defect.defectId}</p>`;
    description += `<p><strong>Description:</strong></p>`;
    description += `<p>${defect.description}</p>`;
    
    if (testCaseTitle) {
      description += `<p><strong>Related Test Case:</strong> ${testCaseTitle}</p>`;
    }
    
    description += `<p><strong>Priority:</strong> ${defect.priority}</p>`;
    description += `<p><strong>Severity:</strong> ${defect.severity}</p>`;
    description += `<p><strong>Status:</strong> ${defect.status}</p>`;
    description += `<p><strong>Reported Date:</strong> ${new Date(defect.createdAt).toLocaleDateString()}</p>`;
    description += `<p><em>This bug was automatically created from QualityBytes test management system.</em></p>`;

    return description;
  }

  async updateWorkItemStatus(workItemId: number, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      const workItemFields: WorkItem[] = [
        {
          op: 'add',
          path: '/fields/System.State',
          value: status
        }
      ];

      const url = `${this.baseUrl}/wit/workitems/${workItemId}?api-version=${this.config.apiVersion}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(workItemFields)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure DevOps Update Error:', response.status, errorText);
        return {
          success: false,
          error: `Failed to update work item: ${response.status} - ${errorText}`
        };
      }

      return { success: true };

    } catch (error) {
      console.error('Error updating Azure DevOps work item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getWorkItemUrl(workItemId: number): string {
    return `https://dev.azure.com/${this.config.organization}/${this.config.project}/_workitems/edit/${workItemId}`;
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
        console.log('🔍 Updated Azure DevOps config for defect creation');
      }
      
      return configured;
    } catch (error) {
      console.error('Error checking Azure DevOps configuration:', error);
      return false;
    }
  }
}

export const azureDevOpsService = new AzureDevOpsService();