
interface SSEClient {
  id: string;
  response: any;
  lastPing: number;
}

export class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private pingInterval: NodeJS.Timeout;

  constructor() {
    // Send ping every 30 seconds to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);
  }

  addClient(clientId: string, response: any) {
    this.clients.set(clientId, {
      id: clientId,
      response,
      lastPing: Date.now()
    });

    console.log(`📡 SSE client connected: ${clientId} (total: ${this.clients.size})`);

    // Send initial connection message
    this.sendToClient(clientId, {
      type: 'connected',
      timestamp: new Date().toISOString(),
      message: 'Connected to real-time updates'
    });
  }

  removeClient(clientId: string) {
    this.clients.delete(clientId);
    console.log(`📡 SSE client disconnected: ${clientId} (total: ${this.clients.size})`);
  }

  broadcastDefectUpdate(defectId: string, workItemId?: number) {
    const event = {
      type: 'defect_updated',
      defectId,
      workItemId,
      timestamp: new Date().toISOString(),
      message: `Defect ${defectId} has been updated`
    };

    console.log(`📡 Broadcasting defect update: ${defectId} to ${this.clients.size} clients`);
    this.broadcast(event);
  }

  private broadcast(data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const disconnectedClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      try {
        client.response.write(message);
      } catch (error) {
        console.log(`📡 Failed to send to client ${clientId}, marking for removal`);
        disconnectedClients.push(clientId);
      }
    });

    // Remove disconnected clients
    disconnectedClients.forEach(clientId => {
      this.removeClient(clientId);
    });
  }

  private sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        client.response.write(message);
      } catch (error) {
        console.log(`📡 Failed to send to client ${clientId}, removing`);
        this.removeClient(clientId);
      }
    }
  }

  private pingClients() {
    const now = Date.now();
    const disconnectedClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      try {
        // Send ping
        client.response.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
        client.lastPing = now;
      } catch (error) {
        disconnectedClients.push(clientId);
      }
    });

    // Remove disconnected clients
    disconnectedClients.forEach(clientId => {
      this.removeClient(clientId);
    });
  }

  destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.clients.clear();
  }
}

export const sseService = new SSEService();
