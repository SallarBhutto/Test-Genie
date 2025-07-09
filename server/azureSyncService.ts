import { storage } from "./storage";
import { settingsService } from "./settingsService";
import { eventLogger } from "./eventLogger";
import { azureDevOpsService } from "./azureDevOpsService";
import { azureWebhookService } from "./azureWebhookService";

interface SyncResult {
  success: boolean;
  message: string;
  stats: {
    totalAzureWorkItems: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors: string[];
}

interface WorkItemQuery {
  workItems: Array<{ id: number }>;
}

interface WorkItemDetails {
  id: number;
  rev: number;
  fields: {
    [key: string]: any;
  };
}

export class AzureSyncService {
  /**
   * Test Azure DevOps connection and authentication
   */
  private async testConnection(organization: string, project: string): Promise<{ success: boolean; message: string }> {
    try {
      // First test: Check if we can access the project itself
      const projectUrl = `https://dev.azure.com/${organization}/_apis/projects/${project}?api-version=7.0`;
      
      console.log(`🔍 Testing Azure DevOps connection to: ${projectUrl}`);
      
      const headers = await this.getAuthHeaders();
      console.log(`🔍 Using headers:`, { ...headers, Authorization: '[REDACTED]' });

      const projectResponse = await fetch(projectUrl, {
        method: 'GET',
        headers
      });

      console.log(`🔍 Project API response status: ${projectResponse.status}`);

      if (!projectResponse.ok) {
        const responseText = await projectResponse.text();
        console.log(`🔍 Project API response text:`, responseText.substring(0, 200));

        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.includes('<html')) {
          return {
            success: false,
            message: 'Authentication failed. The Personal Access Token is invalid or lacks permissions. Please ensure the token has "Work Items - Read" permissions and is not expired.'
          };
        }

        if (projectResponse.status === 401) {
          return {
            success: false,
            message: 'Unauthorized: Please check your Personal Access Token. It may be invalid or expired.'
          };
        }

        if (projectResponse.status === 403) {
          return {
            success: false,
            message: 'Forbidden: The Personal Access Token lacks necessary permissions. Ensure it has "Work Items - Read" access.'
          };
        }

        if (projectResponse.status === 404) {
          return {
            success: false,
            message: `Project '${project}' not found in organization '${organization}'. Please verify the organization and project names.`
          };
        }

        return {
          success: false,
          message: `Connection test failed: ${projectResponse.status} - ${responseText}`
        };
      }

      const projectText = await projectResponse.text();

      if (projectText.trim().startsWith('<!DOCTYPE') || projectText.includes('<html')) {
        return {
          success: false,
          message: 'Received HTML response instead of JSON. This indicates an authentication or permissions issue with your Personal Access Token.'
        };
      }

      // Try to parse the project response
      try {
        const projectData = JSON.parse(projectText);
        console.log(`✅ Successfully accessed project: ${projectData.name || 'Unknown'}`);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid JSON response from Azure DevOps. This may indicate an authentication issue.'
        };
      }

      // Second test: Check work item types access
      const workItemTypesUrl = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitemtypes?api-version=7.0`;
      
      const workItemResponse = await fetch(workItemTypesUrl, {
        method: 'GET',
        headers
      });

      if (!workItemResponse.ok) {
        const responseText = await workItemResponse.text();
        
        if (workItemResponse.status === 403) {
          return {
            success: false,
            message: 'Project access succeeded but Work Items access failed. Please ensure your Personal Access Token has "Work Items - Read" permissions.'
          };
        }

        return {
          success: false,
          message: `Work Items API test failed: ${workItemResponse.status} - ${responseText}`
        };
      }

      const workItemText = await workItemResponse.text();
      
      try {
        const workItemData = JSON.parse(workItemText);
        console.log(`✅ Work Items API access successful. Found ${workItemData.count || 0} work item types.`);
      } catch (parseError) {
        return {
          success: false,
          message: 'Invalid JSON response from Work Items API.'
        };
      }

      return {
        success: true,
        message: 'Connection successful. Both project and work items access verified.'
      };
    } catch (error) {
      console.error('❌ Azure DevOps connection test error:', error);
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async getAuthHeaders() {
    if (azureDevOpsService['getAuthHeaders']) {
      return azureDevOpsService['getAuthHeaders']();
    }
    return await this.createAuthHeaders();
  }

  private createAuthHeaders() {
    const settings = settingsService.getSettings();
    const token = Buffer.from(`:${settings.azureDevOps?.personalAccessToken || ''}`).toString('base64');
    return {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Query work items from Azure DevOps using WIQL
   */
  private async queryWorkItems(organization: string, project: string, areaPath?: string): Promise<number[]> {
    try {
      let wiql = `
        SELECT [System.Id] 
        FROM WorkItems 
        WHERE [System.WorkItemType] = 'Bug' 
        AND [System.TeamProject] = '${project}'
      `;

      // Add area path filter if specified
      if (areaPath) {
        wiql += ` AND [System.AreaPath] UNDER '${areaPath}'`;
      }

      // Order by ID to get consistent results
      wiql += ` ORDER BY [System.Id] DESC`;

      const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/wiql?api-version=7.0`;

      const response = await fetch(url, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ query: wiql })
      });

      if (!response.ok) {
        throw new Error(`Failed to query work items: ${response.status} - ${await response.text()}`);
      }

      const result: WorkItemQuery = await response.json();
      return result.workItems.map(wi => wi.id);
    } catch (error) {
      console.error('Error querying work items:', error);
      throw error;
    }
  }

  /**
   * Fetch work item details in batches
   */
  private async fetchWorkItemDetails(organization: string, project: string, workItemIds: number[]): Promise<WorkItemDetails[]> {
    try {
      if (workItemIds.length === 0) return [];

      // Azure DevOps API supports up to 200 work items per batch
      const batchSize = 200;
      const workItems: WorkItemDetails[] = [];

      for (let i = 0; i < workItemIds.length; i += batchSize) {
        const batch = workItemIds.slice(i, i + batchSize);
        const ids = batch.join(',');

        const url = `https://dev.azure.com/${organization}/${project}/_apis/wit/workitems?ids=${ids}&api-version=7.0`;

        const response = await fetch(url, {
          method: 'GET',
          headers: await this.getAuthHeaders()
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch work item details: ${response.status} - ${await response.text()}`);
        }

        const result = await response.json();
        workItems.push(...result.value);
      }

      return workItems;
    } catch (error) {
      console.error('Error fetching work item details:', error);
      throw error;
    }
  }

  /**
   * Convert Azure work item to webhook payload format for processing
   */
  private createWebhookPayload(workItem: WorkItemDetails): any {
    return {
      eventType: 'workitem.created',
      resource: {
        id: workItem.id,
        workItemId: workItem.id,
        rev: workItem.rev,
        fields: Object.keys(workItem.fields).reduce((acc, key) => {
          acc[key] = { newValue: workItem.fields[key] };
          return acc;
        }, {} as any)
      }
    };
  }

  /**
   * Sync all Azure DevOps bugs to QualityBytes
   */
  async syncAllBugs(projectFilter?: number): Promise<SyncResult> {
    const stats = {
      totalAzureWorkItems: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    const errors: string[] = [];

    try {
      console.log('🔄 Starting Azure DevOps full sync...');

      // Get settings
      const settings = await settingsService.getSettings();
      const azureConfig = settings.azureDevOps;

      if (!azureConfig?.enabled || !azureConfig.organization || !azureConfig.project || !azureConfig.personalAccessToken) {
        throw new Error('Azure DevOps integration not configured or disabled');
      }

      // Test the connection before proceeding
      const connectionTestResult = await this.testConnection(azureConfig.organization, azureConfig.project);
      if (!connectionTestResult.success) {
        throw new Error(`Azure DevOps connection failed: ${connectionTestResult.message}`);
      }

      // Get all QualityBytes projects with team names
      const allProjects = await storage.getProjects();
      let projectsToSync = allProjects.filter(p => p.teamName);

      // Filter by specific project if requested
      if (projectFilter) {
        projectsToSync = projectsToSync.filter(p => p.id === projectFilter);
      }

      if (projectsToSync.length === 0) {
        return {
          success: false,
          message: 'No projects with team names found for syncing',
          stats,
          errors
        };
      }

      console.log(`🔍 Found ${projectsToSync.length} projects to sync:`, projectsToSync.map(p => `${p.name} (${p.teamName})`));

      // Get existing defects with Azure work item IDs
      const existingDefects = await storage.getDefects();
      const existingWorkItemIds = new Set(
        existingDefects
          .filter(d => d.azureWorkItemId)
          .map(d => d.azureWorkItemId!)
      );

      console.log(`📊 Found ${existingDefects.length} existing defects, ${existingWorkItemIds.size} with Azure work item IDs`);

      // Sync each project
      for (const project of projectsToSync) {
        try {
          console.log(`🔄 Syncing project: ${project.name} (team: ${project.teamName})`);

          // Construct area path
          const areaPath = `${azureConfig.project}\\${project.teamName}`;
          console.log(`🔍 Querying Azure DevOps for area path: ${areaPath}`);

          // Query work items for this area path
          const workItemIds = await this.queryWorkItems(
            azureConfig.organization,
            azureConfig.project,
            areaPath
          );

          console.log(`📋 Found ${workItemIds.length} work items in ${areaPath}`);
          stats.totalAzureWorkItems += workItemIds.length;

          if (workItemIds.length === 0) {
            console.log(`ℹ️ No work items found for project ${project.name}`);
            continue;
          }

          // Fetch work item details
          const workItems = await this.fetchWorkItemDetails(
            azureConfig.organization,
            azureConfig.project,
            workItemIds
          );

          console.log(`📄 Fetched details for ${workItems.length} work items`);

          // Process each work item
          for (const workItem of workItems) {
            try {
              const workItemId = workItem.id;

              if (existingWorkItemIds.has(workItemId)) {
                // Work item exists - check if update is needed
                const existingDefect = existingDefects.find(d => d.azureWorkItemId === workItemId);
                if (existingDefect) {
                  // Convert to webhook payload and process as update
                  const webhookPayload = this.createWebhookPayload(workItem);

                  console.log(`🔄 Updating existing defect ${existingDefect.defectId} from work item ${workItemId}`);

                  // Use the webhook service to handle the update
                  const result = await azureWebhookService['handleWorkItemUpdated'](webhookPayload, workItemId);

                  if (result.success) {
                    stats.updated++;
                    console.log(`✅ Updated defect ${existingDefect.defectId}`);
                  } else {
                    stats.skipped++;
                    console.log(`⚠️ Skipped update for work item ${workItemId}: ${result.message}`);
                  }
                }
              } else {
                // Work item doesn't exist - create new defect
                console.log(`🆕 Creating new defect from work item ${workItemId}`);

                // Convert to webhook payload and process as creation
                const webhookPayload = this.createWebhookPayload(workItem);

                // Use the webhook service to handle the creation
                const result = await azureWebhookService['handleWorkItemCreated'](webhookPayload, workItemId);

                if (result.success) {
                  stats.created++;
                  console.log(`✅ Created defect from work item ${workItemId}`);
                } else {
                  stats.skipped++;
                  console.log(`⚠️ Skipped creation for work item ${workItemId}: ${result.message}`);
                }
              }
            } catch (error) {
              stats.errors++;
              const errorMsg = `Error processing work item ${workItem.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
              errors.push(errorMsg);
              console.error(`❌ ${errorMsg}`);
            }
          }

          console.log(`✅ Completed sync for project ${project.name}`);
        } catch (error) {
          const errorMsg = `Error syncing project ${project.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      // Log sync completion
      eventLogger.logEvent({
        type: 'sync_success',
        message: `Full sync completed: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`
      });

      const message = `Sync completed successfully. Created: ${stats.created}, Updated: ${stats.updated}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`;
      console.log(`🎉 ${message}`);

      return {
        success: true,
        message,
        stats,
        errors
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Full sync failed:', errorMsg);

      eventLogger.logEvent({
        type: 'sync_error',
        message: 'Full sync failed',
        error: errorMsg
      });

      return {
        success: false,
        message: `Sync failed: ${errorMsg}`,
        stats,
        errors: [...errors, errorMsg]
      };
    }
  }

  /**
   * Sync bugs for a specific project only
   */
  async syncProjectBugs(projectId: number): Promise<SyncResult> {
    return this.syncAllBugs(projectId);
  }

  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<{
    lastSyncTime?: Date;
    totalDefectsWithAzureId: number;
    totalProjects: number;
    projectsWithTeamNames: number;
  }> {
    try {
      const defects = await storage.getDefects();
      const projects = await storage.getProjects();

      const totalDefectsWithAzureId = defects.filter(d => d.azureWorkItemId).length;
      const projectsWithTeamNames = projects.filter(p => p.teamName).length;

      return {
        totalDefectsWithAzureId,
        totalProjects: projects.length,
        projectsWithTeamNames
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }
}

export const azureSyncService = new AzureSyncService();