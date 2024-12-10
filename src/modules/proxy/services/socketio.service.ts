import { Injectable } from "@nestjs/common";
import { io, Socket } from "socket.io-client";

@Injectable()
export class SocketIoService {
  /**
   * Connect to the real Socket.IO server with a specific `tabid`.
   */
  async connectToRealSocket(
    proxySocketIO: any,
    targetUrl: string,
    namespace: string,
    headers: Record<string, string> = {},
  ): Promise<any> {

    const realSocket = io(`${targetUrl}${namespace}`, {
      transports: ["websocket"],  
      extraHeaders: headers,
    });

      realSocket.on("connect_error", (err) => {
        proxySocketIO.disconnect();
      });
    
       realSocket.on("disconnect", (err) => {
        proxySocketIO.disconnect();
      });
    

    // Listen for all dynamic events from the real server and forward to the frontend
    realSocket.onAny((event: string, ...args: any[]) => {
      console.log(proxySocketIO, "===================================");
      console.log(event);
      proxySocketIO.emit(event, args);
    });

    // Handle disconnection of the real server
    realSocket.on("disconnect", (reason) => {
      console.warn(
        `Real Socket.IO server disconnected for: ${reason}`,
      );

    });
    return realSocket;
  }

}
