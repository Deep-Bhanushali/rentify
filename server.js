import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import pkg from 'jsonwebtoken';
const { verify } = pkg;

// Import shared configuration
import { JWT_SECRET, getUserRoom } from './config.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);

    if (parsedUrl.pathname?.startsWith('/socket.io/') || req.url?.startsWith('/socket.io/')) {
      return; 
    }

    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? "http://localhost:3000" : false,
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('❌ No token provided for socket auth');
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.user = decoded;
      console.log('✅ Socket authentication successful for user:', decoded.userId);
      next();
    } catch (err) {
      console.log('❌ Socket authentication failed:', err.message);
      next(new Error('Authentication error'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected via socket`);

    socket.join(getUserRoom(socket.userId));

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
    socket.on('ping', (callback) => {
      callback('pong');
    });
  });

  global.io = io;

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
