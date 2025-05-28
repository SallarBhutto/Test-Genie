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

import { storage } from './storage';

export class SettingsService {
  async getSettings(): Promise<SystemSettings> {
    // Load from database or return defaults
    const azureDevOpsSetting = await storage.getSetting('azureDevOps');
    const emailNotificationsSetting = await storage.getSetting('emailNotifications');
    const darkModeSetting = await storage.getSetting('darkMode');

    return {
      azureDevOps: azureDevOpsSetting?.value || {
        enabled: false,
        organization: '',
        project: '',
        personalAccessToken: '',
      },
      emailNotifications: emailNotificationsSetting?.value || true,
      darkMode: darkModeSetting?.value || false,
    };
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
      const baseUrl = `https://dev.azure.com/${azureDevOps.organization}/_apis`;
      const apiUrl = `${baseUrl}/projects/${azureDevOps.project}?api-version=7.0`;
      const token = Buffer.from(`:${azureDevOps.personalAccessToken}`).toString('base64');
      
      console.log('🔍 Azure DevOps Test Connection Details:');
      console.log('Organization:', azureDevOps.organization);
      console.log('Project:', azureDevOps.project);
      console.log('API URL:', apiUrl);
      console.log('Token length:', azureDevOps.personalAccessToken ? azureDevOps.personalAccessToken.length : 0);
      console.log('Token preview:', azureDevOps.personalAccessToken ? azureDevOps.personalAccessToken.substring(0, 10) + '...' : 'No token');
      
      const response = await fetch(apiUrl, {
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