// lib/socket.js
import { io } from "socket.io-client";

const SOCKET_URL =  "https://chatapp-api-production-d8c0.up.railway.app/";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

export default socket;
