// This is a simple WebSocket server for the collaborative drawing app
// In a real application, you would use a more robust server setup
// with proper error handling, authentication, and persistence

const WebSocket = require("ws");
const http = require("http");
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store active rooms and users
const rooms = new Map();

wss.on("connection", (ws) => {
  console.log("Client connected");

  let userId = null;
  let username = null;
  let roomId = null;
  let userColor = getRandomColor();

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "createRoom":
          handleCreateRoom(ws, data);
          break;

        case "joinRoom":
          handleJoinRoom(ws, data);
          break;

        case "leaveRoom":
          handleLeaveRoom(ws);
          break;

        case "drawingAction":
          broadcastToRoom(
            roomId,
            {
              type: "drawingAction",
              action: data.action,
              userId: userId,
              username: username,
            },
            ws
          );
          break;

        case "cursorMove":
          broadcastToRoom(
            roomId,
            {
              type: "cursorMove",
              userId: userId,
              x: data.x,
              y: data.y,
            },
            ws
          );
          break;

        case "chatMessage":
          broadcastToRoom(roomId, {
            type: "chatMessage",
            userId: userId,
            username: username,
            message: data.message,
            timestamp: data.timestamp || new Date().toISOString(),
          });
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    handleLeaveRoom(ws);
  });

  function handleCreateRoom(ws, data) {
    roomId = data.roomId;
    username = data.username;
    userId = generateUserId();

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    // Add user to room
    const room = rooms.get(roomId);
    room.set(userId, {
      ws: ws,
      username: username,
      color: userColor,
    });

    // Send confirmation to client
    ws.send(
      JSON.stringify({
        type: "roomCreated",
        roomId: roomId,
        userId: userId,
      })
    );

    console.log(`Room created: ${roomId} by ${username} (${userId})`);
  }

  function handleJoinRoom(ws, data) {
    roomId = data.roomId;
    username = data.username;
    userId = generateUserId();

    // Check if room exists
    if (!rooms.has(roomId)) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Room does not exist",
        })
      );
      return;
    }

    // Add user to room
    const room = rooms.get(roomId);
    room.set(userId, {
      ws: ws,
      username: username,
      color: userColor,
    });

    // Send confirmation to client
    ws.send(
      JSON.stringify({
        type: "roomJoined",
        roomId: roomId,
        userId: userId,
      })
    );

    // Notify other users in the room
    broadcastToRoom(
      roomId,
      {
        type: "userJoined",
        userId: userId,
        username: username,
        color: userColor,
      },
      ws
    );

    // Send existing users to the new user
    room.forEach((user, id) => {
      if (id !== userId) {
        ws.send(
          JSON.stringify({
            type: "userJoined",
            userId: id,
            username: user.username,
            color: user.color,
          })
        );
      }
    });

    console.log(`User joined room: ${username} (${userId}) joined ${roomId}`);
  }

  function handleLeaveRoom(ws) {
    if (!roomId || !userId) return;

    // Check if room exists
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);

      // Remove user from room
      room.delete(userId);

      // Notify other users
      broadcastToRoom(roomId, {
        type: "userLeft",
        userId: userId,
        username: username,
      });

      // Delete room if empty
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`Room deleted: ${roomId}`);
      }
    }

    console.log(`User left room: ${username} (${userId}) left ${roomId}`);

    // Reset user data
    userId = null;
    username = null;
    roomId = null;
  }

  function broadcastToRoom(roomId, message, excludeWs = null) {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const messageStr = JSON.stringify(message);

    room.forEach((user) => {
      if (user.ws !== excludeWs && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(messageStr);
      }
    });
  }
});

function generateUserId() {
  return Math.random().toString(36).substring(2, 15);
}

function getRandomColor() {
  const colors = [
    "#FF5733",
    "#33FF57",
    "#3357FF",
    "#F3FF33",
    "#FF33F3",
    "#33FFF3",
    "#FF3333",
    "#33FF33",
    "#3333FF",
    "#FFFF33",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});

// To run this server:
// 1. Save this file as server.js
// 2. Install dependencies: npm install ws
// 3. Run the server: node server.js
