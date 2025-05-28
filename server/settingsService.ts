interface AzureDevOpsSettings {
  enabled: boolean;
  organization: string;
  project: string;
  personalAccessToken: string;
}

interface SystemSettings {
  azureDevOps: AzureDevOpsSettings;
  emailNotifications: boolean;
  darkMode: boolean;
}

// In-memory settings storage (you can replace this with database storage later)
let systemSettings: SystemSettings = {
  azureDevOps: {
    enabled: false,
    organization: '',
    project: '',
    personalAccessToken: ''
  },
  emailNotifications: true,
  darkMode: false
};

export class SettingsService {
  async getSettings(): Promise<SystemSettings> {
    return systemSettings;
  }

  async updateAzureDevOpsSettings(settings: AzureDevOpsSettings): Promise<SystemSettings> {
    systemSettings.azureDevOps = settings;
    
    // Update environment variables for the Azure DevOps service
    if (settings.enabled && settings.organization && settings.project && settings.personalAccessToken) {
      process.env.AZURE_DEVOPS_ORGANIZATION = settings.organization;
      process.env.AZURE_DEVOPS_PROJECT = settings.project;
      process.env.AZURE_DEVOPS_PAT = settings.personalAccessToken;
    } else {
      // Clear environment variables if disabled or incomplete
      delete process.env.AZURE_DEVOPS_ORGANIZATION;
      delete process.env.AZURE_DEVOPS_PROJECT;
      delete process.env.AZURE_DEVOPS_PAT;
    }
    
    return systemSettings;
  }

  async testAzureDevOpsConnection(): Promise<{ success: boolean; message: string }> {
    const { azureDevOps } = systemSettings;
    
    if (!azureDevOps.enabled) {
      return { success: false, message: 'Azure DevOps integration is disabled' };
    }
    
    if (!azureDevOps.organization || !azureDevOps.project || !azureDevOps.personalAccessToken) {
      return { success: false, message: 'Missing required Azure DevOps configuration' };
    }
    
    try {
      // Test the connection by making a simple API call to get project info
      const baseUrl = `https://dev.azure.com/${azureDevOps.organization}/${azureDevOps.project}/_apis`;
      const token = Buffer.from(`:${azureDevOps.personalAccessToken}`).toString('base64');
      
      const response = await fetch(`${baseUrl}/project?api-version=7.0`, {
        headers: {
          'Authorization': `Basic ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const projectData = await response.json();
        return { 
          success: true, 
          message: `Successfully connected to project "${projectData.name}" in organization "${azureDevOps.organization}"` 
        };
      } else {
        const errorText = await response.text();
        console.error(`Azure DevOps API Error: ${response.status} - ${errorText}`);
        return { 
          success: false, 
          message: `Connection failed: ${response.status} - ${errorText}` 
        };
      }
    } catch (error) {
      console.error('Azure DevOps connection test error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown connection error' 
      };
    }
  }
}

export const settingsService = new SettingsService();