const cards = require("./cards.js");
const gamelogic = require("./gamelogic.js");

const gamesockets = {};

gamesockets.io = null;
gamesockets.games = new Map();

gamesockets.addGame = function () {
  let success = false;
  let index = 0;

  const gameTemplate = {
    id: 0,
    deck: cards.newDeck(4, true),
    players: [],
    dealerCards: [],
    currentPlayerId: -1,
    state: "BETTING"
  };

  for (let i = 0; i <= gamesockets.games.size; i++) {
    if (!gamesockets.games.get(i)) {
      gameTemplate.id = i;
      gamesockets.games.set(i, gameTemplate);
      gamesockets.new(i);
      success = true;
      index = i;
      break;
    }
  }

  return [success, index];
};

gamesockets.addPlayer = function (players, username, socketId) {
  let success = false;

  const playerTemplate = {
    id: 0,
    username: username,
    socketId: socketId,
    bets: [
      [ //DECK 0
        [] //STACK 0
      ]
    ],
    decks: [
      [] //DECK 0
    ],
    currentDeck: 0,
    state: "waiting",
    ready: false,
    blackjack: [],
    busted: []
  };

  success = true;

  const usedIds = new Set();

  players.forEach((player) => {
    usedIds.add(player.id);
  });

  for (let i = 0; i <= usedIds.size; i++) {
    if (!usedIds.has(i)) {
      playerTemplate.id = i;
    };
  };

  players.push(playerTemplate);
  gamesockets.sortPlayers(players);

  return [success, playerTemplate.id];
};

gamesockets.getPlayer = function(players, id) {
  return players.find((player) => player.id == id);
};

gamesockets.sortPlayers = function(players) {
  players.sort(function (a, b) {
    return a.id - b.id;
  });
};

gamesockets.new = function(id) {
  const nsp = gamesockets.io.of(`/gamesockets/${id}`);

  nsp.on("connection", (socket) => {
    const game = gamesockets.games.get(id);
    const gamePlayers = game.players;
    const dealerCards = game.dealerCards;
    const username = socket.handshake.headers.username;

    const [success, playerId] = gamesockets.addPlayer(gamePlayers, username, socket.id);
    const player = gamesockets.getPlayer(gamePlayers, playerId);

    if (success) {
      socket.emit("gameStateChanged", "betting");
      nsp.emit("playersUpdated", gamePlayers);
      nsp.emit("dealerCardsUpdated", dealerCards);
    } else {
      socket.disconnect();
    };

    socket.on("getPlayer", (setPlayer) => {
      setPlayer(player);
    });

    socket.on("addBet", (amount) => {
      gamelogic.addBet(player, amount, socket, game, nsp);
    });

    socket.on("rebet", () => {
      gamelogic.rebet(player, socket, game, nsp);
    });

    socket.on("placeBet", () => {
      gamelogic.placeBet(player, socket, game, nsp);
    });

    socket.on("double", () => {
      gamelogic.double(player, socket, game, nsp);
    });

    socket.on("split", () => {
      gamelogic.split(player, socket, game, nsp);
    });

    socket.on("stand", () => {
      gamelogic.stand(player, socket, game, nsp);
    });

    socket.on("hit", () => {
      gamelogic.hit(player, socket, game, nsp);
    });

    socket.on("disconnect", (socket) => {
      gamePlayers.splice(gamePlayers.findIndex((player) => player.id == playerId), 1);      

      if (gamePlayers.length <= 0) {
        gamesockets.games.delete(id);
        gamesockets.delete(id);

        return;
      }

      gamesockets.sortPlayers(gamePlayers);
      nsp.emit("playersUpdated", gamePlayers);

      if (game.currentPlayerId == playerId) {
        gamelogic.nextPlayer(game, nsp);
      };
    });
  });
};

gamesockets.delete = function(id) {
  const nsp = gamesockets.io.of(`/gamesockets/${id}`);

  nsp.disconnectSockets();
  nsp.removeAllListeners();
};

module.exports = gamesockets;