
import { storage } from "./storage";
import { settingsService } from "./settingsService";
import { eventLogger } from "./eventLogger";

interface AzureWebhookPayload {
  eventType: string;
  publisherId: string;
  scope: string;
  message: {
    text: string;
    html: string;
    markdown: string;
  };
  detailedMessage: {
    text: string;
    html: string;
    markdown: string;
  };
  resource: {
    id: number;
    workItemId?: number; // Optional as it might not always be present
    rev: number;
    revisedBy?: {
      displayName: string;
      id: string;
    };
    revisedDate?: string;
    fields: {
      [key: string]: {
        oldValue?: any;
        newValue: any;
      };
    };
  };
  resourceVersion: string;
  resourceContainers: {
    collection: {
      id: string;
    };
    account: {
      id: string;
    };
    project: {
      id: string;
    };
  };
  createdDate: string;
}

export class AzureWebhookService {
  
  /**
   * Validates webhook signature to ensure it comes from Azure DevOps
   */
  validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!secret || !signature) {
      console.warn("⚠️ Webhook signature validation skipped - no secret configured");
      return true; // Allow if no secret is configured
    }
    
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
    
    if (!isValid) {
      console.error("❌ Webhook signature validation failed");
    }
    
    return isValid;
  }

  /**
   * Processes incoming Azure DevOps webhook
   */
  async processWebhook(payload: AzureWebhookPayload): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      // Azure DevOps work item webhooks use different field names for work item ID
      const workItemId = payload.resource?.workItemId || payload.resource?.id;
      
      // Log webhook received
      eventLogger.logEvent({
        type: 'webhook_received',
        workItemId,
        message: `Received ${payload.eventType} webhook for work item ${workItemId}`
      });

      console.log("🔄 Processing Azure DevOps webhook:", {
        eventType: payload.eventType,
        workItemId: workItemId,
        resourceId: payload.resource?.id,
        resourceWorkItemId: payload.resource?.workItemId,
        fields: Object.keys(payload.resource?.fields || {})
      });

      // Check if this is a supported work item event
      if (payload.eventType !== "workitem.updated" && payload.eventType !== "workitem.created") {
        console.log("ℹ️ Ignoring unsupported event:", payload.eventType);
        return {
          success: true,
          message: "Event type not handled"
        };
      }
      if (!workItemId) {
        console.warn("⚠️ No work item ID found in webhook payload");
        return {
          success: false,
          error: "No work item ID found in payload"
        };
      }

      // Handle workitem.created event
      if (payload.eventType === "workitem.created") {
        return await this.handleWorkItemCreated(payload, workItemId);
      }

      // Handle workitem.updated event
      if (payload.eventType === "workitem.updated") {
        return await this.handleWorkItemUpdated(payload, workItemId);
      }

    } catch (error) {
      console.error("❌ Error processing Azure DevOps webhook:", error);
      
      // Log sync error
      eventLogger.logEvent({
        type: 'sync_error',
        workItemId: payload.resource?.workItemId,
        message: "Error processing webhook",
        error: error instanceof Error ? error.message : "Unknown error occurred"
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  /**
   * Handle workitem.created event - create new defect in QualityBytes
   */
  private async handleWorkItemCreated(payload: AzureWebhookPayload, workItemId: number) {
    console.log(`🆕 Processing workitem.created for work item ${workItemId}`);

    // Check if we already have a defect for this work item
    const existingDefect = await this.findDefectByWorkItemId(workItemId);
    if (existingDefect) {
      console.log(`ℹ️ Defect already exists for work item ${workItemId}: ${existingDefect.defectId}`);
      return {
        success: true,
        message: `Defect ${existingDefect.defectId} already exists for this work item`
      };
    }

    // Extract defect data from the created work item
    const defectData = this.extractDefectDataFromWorkItem(payload);
    if (!defectData) {
      console.log("ℹ️ Could not extract valid defect data from work item");
      return {
        success: true,
        message: "No valid defect data found in work item"
      };
    }

    try {
      // Create new defect in QualityBytes
      const azureWorkItemUrl = `https://dev.azure.com/${payload.resourceContainers.account.id}/${payload.resourceContainers.project.id}/_workitems/edit/${workItemId}`;
      
      const newDefect = await storage.createDefect({
        ...defectData,
        azureWorkItemId: workItemId,
        azureWorkItemUrl: azureWorkItemUrl,
        reportedBy: 1 // Default to admin user for Azure-created defects
      });

      console.log(`✅ Created new defect ${newDefect.defectId} from Azure work item ${workItemId}`);

      // Broadcast real-time update
      try {
        const { sseService } = await import("./sseService");
        sseService.broadcastDefectUpdate(newDefect.defectId, workItemId);
      } catch (error) {
        console.warn("⚠️ Failed to broadcast real-time update:", error);
      }

      // Log sync success
      eventLogger.logEvent({
        type: 'sync_success',
        workItemId,
        defectId: newDefect.defectId,
        message: `Created defect ${newDefect.defectId} from Azure work item ${workItemId}`
      });

      return {
        success: true,
        message: `Created defect ${newDefect.defectId} from Azure work item`
      };

    } catch (error) {
      console.error("❌ Error creating defect from Azure work item:", error);
      throw error;
    }
  }

  /**
   * Handle workitem.updated event - update existing defect in QualityBytes
   */
  private async handleWorkItemUpdated(payload: AzureWebhookPayload, workItemId: number) {
    console.log(`🔄 Processing workitem.updated for work item ${workItemId}`);

    // Find the defect that corresponds to this work item
    const defect = await this.findDefectByWorkItemId(workItemId);
    if (!defect) {
      console.log("ℹ️ No matching defect found for work item:", workItemId);
      return {
        success: true,
        message: "No matching defect found"
      };
    }

    console.log(`✅ Found matching defect: ${defect.defectId} for work item ${workItemId}`);

    // Extract changes from the webhook payload
    const changes = this.extractChanges(payload);
    if (Object.keys(changes).length === 0) {
      console.log("ℹ️ No relevant changes found in webhook");
      return {
        success: true,
        message: "No relevant changes to sync"
      };
    }

    console.log("🔄 Syncing changes:", changes);

    // Update the defect in QualityBytes
    const updatedDefect = await storage.updateDefect(defect.id, changes);
    if (!updatedDefect) {
      throw new Error("Failed to update defect in database");
    }

    console.log(`✅ Successfully synced Azure DevOps changes to defect ${defect.defectId}`);

    // Broadcast real-time update to connected clients
    try {
      const { sseService } = await import("./sseService");
      sseService.broadcastDefectUpdate(defect.defectId, workItemId);
    } catch (error) {
      console.warn("⚠️ Failed to broadcast real-time update:", error);
    }

    // Log sync success
    eventLogger.logEvent({
      type: 'sync_success',
      workItemId,
      defectId: defect.defectId,
      message: `Successfully synced work item ${workItemId} to defect ${defect.defectId}`
    });

    return {
      success: true,
      message: `Defect ${defect.defectId} updated successfully`
    };
  }

  /**
   * Extract defect data from newly created work item
   */
  private extractDefectDataFromWorkItem(payload: AzureWebhookPayload): any | null {
    const resource = payload.resource;
    if (!resource) return null;

    try {
      // Generate a unique defect ID
      const defectId = `AZ-${resource.workItemId}`;

      // Extract title (required)
      const title = resource.fields?.['System.Title']?.newValue;
      if (!title) {
        console.warn("⚠️ No title found in created work item");
        return null;
      }

      // Extract description
      let description = "Imported from Azure DevOps";
      if (resource.fields?.['System.Description']?.newValue) {
        description = this.extractDescriptionFromHtml(resource.fields['System.Description'].newValue) || description;
      } else if (resource.fields?.['Microsoft.VSTS.TCM.ReproSteps']?.newValue) {
        description = this.extractDescriptionFromReproSteps(resource.fields['Microsoft.VSTS.TCM.ReproSteps'].newValue) || description;
      }

      // Extract other fields with defaults
      const status = this.mapAzureStatusToQualityBytes(resource.fields?.['System.State']?.newValue) || 'open';
      const priority = this.mapAzurePriorityToQualityBytes(resource.fields?.['Microsoft.VSTS.Common.Priority']?.newValue) || 'medium';
      const severity = this.mapAzureSeverityToQualityBytes(resource.fields?.['Microsoft.VSTS.Common.Severity']?.newValue) || 'medium';

      return {
        defectId,
        title,
        description,
        status,
        priority,
        severity,
        projectId: 2, // Default to a project - you might want to make this configurable
        stepsToReproduce: description,
        environment: 'Azure DevOps Import',
        attachments: null
      };

    } catch (error) {
      console.error("❌ Error extracting defect data from work item:", error);
      return null;
    }
  }

  /**
   * Find defect by Azure Work Item ID
   */
  private async findDefectByWorkItemId(workItemId: number) {
    try {
      const defects = await storage.getDefects();
      return defects.find(defect => defect.azureWorkItemId === workItemId);
    } catch (error) {
      console.error("Error finding defect by work item ID:", error);
      return null;
    }
  }

  /**
   * Extract relevant changes from Azure DevOps webhook payload
   */
  private extractChanges(payload: AzureWebhookPayload): Record<string, any> {
    const changes: Record<string, any> = {};
    const fields = payload.resource?.fields || {};

    // Map Azure DevOps field changes to QualityBytes fields
    if (fields['System.Title']) {
      changes.title = fields['System.Title'].newValue;
    }

    if (fields['System.Description']) {
      // Extract description from HTML content if needed
      const description = this.extractDescriptionFromHtml(fields['System.Description'].newValue);
      if (description) {
        changes.description = description;
      }
    }

    if (fields['Microsoft.VSTS.TCM.ReproSteps']) {
      // Extract description from repro steps as backup
      const description = this.extractDescriptionFromReproSteps(fields['Microsoft.VSTS.TCM.ReproSteps'].newValue);
      if (description && !changes.description) {
        changes.description = description;
      }
    }

    if (fields['System.State']) {
      const azureStatus = fields['System.State'].newValue;
      const mappedStatus = this.mapAzureStatusToQualityBytes(azureStatus);
      if (mappedStatus) {
        changes.status = mappedStatus;
      }
    }

    if (fields['Microsoft.VSTS.Common.Priority']) {
      const azurePriority = fields['Microsoft.VSTS.Common.Priority'].newValue;
      const mappedPriority = this.mapAzurePriorityToQualityBytes(azurePriority);
      if (mappedPriority) {
        changes.priority = mappedPriority;
      }
    }

    if (fields['Microsoft.VSTS.Common.Severity']) {
      const azureSeverity = fields['Microsoft.VSTS.Common.Severity'].newValue;
      const mappedSeverity = this.mapAzureSeverityToQualityBytes(azureSeverity);
      if (mappedSeverity) {
        changes.severity = mappedSeverity;
      }
    }

    return changes;
  }

  /**
   * Extract clean description from HTML content
   */
  private extractDescriptionFromHtml(htmlContent: string): string | null {
    if (!htmlContent) return null;

    // Simple HTML to text conversion for description
    const textContent = htmlContent
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
      .replace(/&lt;/g, '<') // Decode HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    // Look for description pattern in QualityBytes format
    const descriptionMatch = textContent.match(/Description:\s*(.+?)(?:\s*Related Test Case:|$)/i);
    if (descriptionMatch) {
      return descriptionMatch[1].trim();
    }

    // If no pattern found, return the cleaned text (first 500 characters)
    return textContent.length > 500 ? textContent.substring(0, 500) + '...' : textContent;
  }

  /**
   * Extract description from repro steps
   */
  private extractDescriptionFromReproSteps(reproSteps: string): string | null {
    if (!reproSteps) return null;

    // Look for description pattern in the repro steps
    const descriptionMatch = reproSteps.match(/\*\*Description:\*\*\s*(.+?)(?:\n\n|\*\*)/);
    if (descriptionMatch) {
      return descriptionMatch[1].trim();
    }

    return null;
  }

  /**
   * Map Azure DevOps status to QualityBytes status
   */
  private mapAzureStatusToQualityBytes(azureStatus: string): string | null {
    const statusMap: { [key: string]: string } = {
      'New': 'open',
      'Active': 'in_progress',
      'Resolved': 'resolved',
      'Closed': 'closed'
    };

    return statusMap[azureStatus] || null;
  }

  /**
   * Map Azure DevOps priority to QualityBytes priority
   */
  private mapAzurePriorityToQualityBytes(azurePriority: string): string | null {
    const priorityMap: { [key: string]: string } = {
      '1': 'critical',
      '2': 'high',
      '3': 'medium',
      '4': 'low'
    };

    return priorityMap[azurePriority.toString()] || null;
  }

  /**
   * Map Azure DevOps severity to QualityBytes severity
   */
  private mapAzureSeverityToQualityBytes(azureSeverity: string): string | null {
    const severityMap: { [key: string]: string } = {
      '1 - Critical': 'critical',
      '2 - High': 'high',
      '3 - Medium': 'medium',
      '4 - Low': 'low'
    };

    return severityMap[azureSeverity] || null;
  }
}

export const azureWebhookService = new AzureWebhookService();
