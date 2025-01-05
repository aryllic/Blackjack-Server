const gamesockets = require("./gamesockets.js");

const lobbysockets = {};

lobbysockets.io = null;
lobbysockets.lobbies = new Map();

lobbysockets.addLobby = function (hostName, maxPlayers) {
  let success = false;
  let index = 0;

  const lobbyTemplate = {
    id: 0,
    hostName: "",
    players: [],
    maxPlayers: 5,
    started: false,
  };

  for (let i = 0; i <= lobbysockets.lobbies.size; i++) {
    if (!lobbysockets.lobbies.get(i)) {
      lobbyTemplate.id = i;
      lobbyTemplate.hostName = hostName;
      lobbyTemplate.maxPlayers = maxPlayers;
      lobbysockets.lobbies.set(i, lobbyTemplate);
      lobbysockets.new(i);
      success = true;
      index = i;
      break;
    };
  };

  return [success, lobbysockets.lobbies.get(index)];
};

lobbysockets.new = function (id) {
  const nsp = lobbysockets.io.of(`/lobbysockets/${id}`);

  nsp.on("connection", (socket) => {
    const lobby = lobbysockets.lobbies.get(id);
    const lobbyPlayers = lobby.players;
    const username = socket.handshake.headers.username;
    const isHost = socket.handshake.headers.ishost;

    lobbyPlayers.push(username);
    nsp.emit("playersUpdated", lobbyPlayers);

    socket.on("startGame", (socket) => {
      if (!lobby.started) {
        lobby.started = true;

        const [success, gameId] = gamesockets.addGame();

        if (success) {
          nsp.emit("gameStarted", gameId);

          setTimeout(() => {
            lobbysockets.lobbies.delete(id);
            lobbysockets.delete(id);
          }, 10000);
        };
      };
    });

    socket.on("disconnect", (socket) => {
      if (isHost == "true" && !lobby.started) {
        lobbysockets.lobbies.delete(id);
        lobbysockets.delete(id);

        return;
      };

      lobbyPlayers.splice(lobbyPlayers.indexOf(username), 1);
      nsp.emit("playersUpdated", lobbyPlayers);
    });
  });
};

lobbysockets.delete = function (id) {
  const nsp = lobbysockets.io.of(`/lobbysockets/${id}`);

  nsp.disconnectSockets();
  nsp.removeAllListeners();
};

module.exports = lobbysockets;
