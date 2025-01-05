const express = require("express");
const https = require("http");
const path = require("path");
const { Server } = require("socket.io");
const lobbysockets = require("./modules/lobbysockets.js");
const gamesockets = require("./modules/gamesockets.js");

const app = express();
const server = https.createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 100 * 1000,
    skipMiddlewares: true,
  }
});

lobbysockets.io = io;
gamesockets.io = io;
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true });
  res.end();
});

app.use("/api", require(path.join(__dirname, "/routers/api.js")));

server.listen(3000, () => {
  console.log("listening on *:3000");
});

module.exports = io;
