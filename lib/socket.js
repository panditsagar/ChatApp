// lib/socket.js
import { io } from "socket.io-client";

const SOCKET_URL =  "http://localhost:5000";

const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

export default socket;
