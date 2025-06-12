
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
    workItemId: number;
    rev: number;
    revisedBy: {
      displayName: string;
      id: string;
    };
    revisedDate: string;
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
      const workItemId = payload.resource?.workItemId;
      
      // Log webhook received
      eventLogger.logEvent({
        type: 'webhook_received',
        workItemId,
        message: `Received ${payload.eventType} webhook for work item ${workItemId}`
      });

      console.log("🔄 Processing Azure DevOps webhook:", {
        eventType: payload.eventType,
        workItemId: payload.resource?.workItemId,
        fields: Object.keys(payload.resource?.fields || {})
      });

      // Check if this is a work item update event
      if (payload.eventType !== "workitem.updated") {
        console.log("ℹ️ Ignoring non-update event:", payload.eventType);
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
