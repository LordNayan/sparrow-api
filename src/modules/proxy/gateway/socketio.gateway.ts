import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { SocketIoService } from "../services/socketio.service";

export const SOCKET_IO_PORT = 9001;

@WebSocketGateway(SOCKET_IO_PORT, {
  cors: {
    origin: "*", // Replace "*" with your frontend URL in production
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
  transports: ["websocket"],
})
export class SocketIoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clientSockets = new Map<Socket, any>();

  constructor(private readonly socketIoService: SocketIoService) {}

  async afterInit() {
    console.log("Socket.io Handler Gateway initialized!");
  }

  async handleConnection(client: Socket) {
    const { targetUrl, namespace, headers } = client.handshake.query;

    if (!targetUrl || !namespace) {
      client.disconnect();
      console.error(
        "Missing required query parameters: url, namespace, or tabid",
      );
      return;
    }

    try {
      const parsedHeaders = headers ? JSON.parse(headers as string) : {};

      // Establish a connection to the real Socket.IO server
      const targetSocketIO = await this.socketIoService.connectToRealSocket(
        client,
        targetUrl as string,
        namespace as string,
        parsedHeaders,
      );

      // Store the target socket for this client
      this.clientSockets.set(client, targetSocketIO);

      // Listen for all dynamic events from the frontend and forward them
      client.onAny(async (event: string, ...args: any[]) => {
        try {
          targetSocketIO.emit(event, ...args);
        } catch (err) {
          console.error(
            `Failed to forward event ${event} for ${err.message}`,
          );
        }
      });
    } catch (err) {
      console.error(
        `Failed to connect to real Socket.IO server for ${err.message}`,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const targetSocketIO = this.clientSockets.get(client);
    if (targetSocketIO) {
      targetSocketIO.disconnect();
      this.clientSockets.delete(client);
    }
  }
}
