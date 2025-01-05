const cards = require("./cards.js");

const gamelogic = {};

gamelogic.sleep = function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

gamelogic.awaitRepsonse = async function (game, nsp) {
  const sockets = await nsp.fetchSockets();

  for (const player of game.players) {
    let pResolve;
    const promise = new Promise((resolve) => {
      pResolve = resolve;
    });

    sockets
      .find((socket) => socket.id == player.socketId)
      .emit("awaitResponse", (response) => {
        pResolve(response);
      });

    await promise;
  };

  return true;
};

gamelogic.nextTurn = async function (game, nsp) {
  if (game.state == "BETTING") {
    game.state = "DEALING CARDS";
    await gamelogic.dealCards(game, nsp);
    gamelogic.nextTurn(game, nsp);
  } else if (game.state == "DEALING CARDS") {
    game.state = "PLAYERS";
    gamelogic.nextPlayer(game, nsp);
  } else if (game.state == "PLAYERS") {
    game.state = "DEALER";
    await gamelogic.playDealer(game, nsp);
    await gamelogic.awaitRepsonse(game, nsp);
    gamelogic.nextTurn(game, nsp);
  } else if (game.state == "DEALER" || game.state == "ENDED") {
    game.state = "BETTING";

    game.dealerCards = [];
    game.players.forEach((player) => {
      player.ready = false;
      player.blackjack = [];
      player.busted = [];
      player.currentDeck = 0;
      player.bets = [[[]]];
      player.decks = [[]];
    });

    nsp.emit("roundEnded");
    nsp.emit("dealerCardsUpdated", game.dealerCards);
    nsp.emit("playersUpdated", game.players);
    nsp.emit("gameStateChanged", "betting");
  };
};

gamelogic.nextPlayer = async function (game, nsp) {
  let highestNextId = 10;
  let nextPlayer = game.players[0];
  let nextPlayerFound = false;

  game.players.forEach((player) => {
    if (player.id > game.currentPlayerId && player.id <= highestNextId) {
      if (!player.blackjack[0] && !player.busted[0]) {
        highestNextId = player.id;
        nextPlayer = player;
        nextPlayerFound = true;
      };
    };
  });

  if (nextPlayerFound) {
    game.currentPlayerId = nextPlayer.id;

    const sockets = await nsp.fetchSockets();
    sockets
      .find((socket) => socket.id == nextPlayer.socketId)
      .emit("gameStateChanged", "turn");
  } else {
    game.currentPlayerId = -1;
    gamelogic.nextTurn(game, nsp);
  };
};

gamelogic.dealCards = async function (game, nsp) {
  for (let i = 0; i < 2; i++) {
    for (const player of game.players) {
      //PLAY ANIM
      nsp.emit("playAnimation", {
        animation: "pullCard",
        player: player.id,
      });

      await gamelogic.sleep(500);
      player.decks[0].push(cards.pullCard(game.deck));
      nsp.emit("playersUpdated", game.players);

      if (game.deck.length == 0) {
        game.deck = cards.newDeck(4, true);
      };
    };

    //PLAY ANIM
    await gamelogic.sleep(500);
    const dealerCard = cards.pullCard(game.deck);
    dealerCard.hidden = i == 1;
    game.dealerCards.push(dealerCard);
    nsp.emit("dealerCardsUpdated", game.dealerCards);

    if (game.deck.length == 0) {
      game.deck = cards.newDeck(4, true);
    };
  };

  for (const player of game.players) {
    if (cards.checkBlackjack(player.decks[0])) {
      player.blackjack[0] = true;

      console.log("PLAYER BLACKJACK ANIM");
      //PLAY ANIM
      await gamelogic.sleep(1000);
    };
  };

  if (cards.checkBlackjack(game.dealerCards)) {
    game.dealerCards[1].hidden = false;
    nsp.emit("dealerCardsUpdated", game.dealerCards);

    console.log("DEALER BLACKJACK ANIM");
    //PLAY ANIM
    await gamelogic.sleep(1000);

    game.players.forEach(async (player) => {
      if (!player.blackjack[0]) {
        player.bets = [[[]]];
      } else {
        const sockets = await nsp.fetchSockets();
        sockets
          .find((socket) => socket.id == player.socketId)
          .emit("returnDeck", player.bets[0]);
      };
    });

    await gamelogic.awaitRepsonse(game, nsp);

    await gamelogic.sleep(1000);
    nsp.emit("roundEnded");
    game.state = "ENDED";
    return;
  };

  game.players.forEach(async (player) => {
    if (player.blackjack[0]) {
      const sockets = await nsp.fetchSockets();
      sockets
        .find((socket) => socket.id == player.socketId)
        .emit("blackjack", player.bets[0]);
      player.bets[0] = [[]];
    };
  });
};

gamelogic.checkHighestCount = function (cards) {
  const counts = [0, 0];

  cards.forEach((card) => {
    const number = Number(card.rank);

    if (number) {
      counts[0] += number;
      counts[1] += number;
    } else if (
      card.rank == "King" ||
      card.rank == "Queen" ||
      card.rank == "Jack"
    ) {
      counts[0] += 10;
      counts[1] += 10;
    } else if (card.rank == "Ace") {
      counts[0] += 1;

      if (counts[1] + 11 > 21) {
        counts[1] += 1;
      } else {
        counts[1] += 11;
      };
    };
  });

  if (counts[0] >= counts[1] && counts[0] <= 21) {
    return counts[0];
  } else if (counts[1] > counts[0] && counts[1] <= 21) {
    return counts[1];
  }

  return null;
};

gamelogic.playDealer = async function (game, nsp) {
  game.dealerCards[1].hidden = false;
  nsp.emit("dealerCardsUpdated", game.dealerCards);
  await gamelogic.sleep(1000);

  let done = await gamelogic.updateDealer(game, nsp);

  while (!done) {
    done = await gamelogic.updateDealer(game, nsp);
  };
};

gamelogic.updateDealer = async function (game, nsp) {
  const count = gamelogic.checkHighestCount(game.dealerCards);

  if (count) {
    if (count >= 17) {
      console.log("DEALER DONE");
      await gamelogic.compareDealerCount(count, game, nsp);
      return true;
    } else {
      //PLAY ANIM
      await gamelogic.sleep(1000);
      game.dealerCards.push(cards.pullCard(game.deck));
      nsp.emit("dealerCardsUpdated", game.dealerCards);

      if (game.deck.length == 0) {
        game.deck = cards.newDeck(4, true);
      };
    };
  } else {
    console.log("DEALER BUSTED ANIM");
    //PLAY ANIM
    await gamelogic.sleep(1000);

    game.players.forEach((player) => {
      player.decks.forEach(async (deck, index) => {
        if (!player.busted[index] && !player.blackjack[index]) {
          const sockets = await nsp.fetchSockets();
          sockets
            .find((socket) => socket.id == player.socketId)
            .emit("deckWon", player.bets[index]);
        };
      });
    });

    return true;
  };
};

gamelogic.compareDealerCount = async function (count, game, nsp) {
  game.players.forEach((player) => {
    player.decks.forEach(async (deck, index) => {
      if (!player.busted[index] && !player.blackjack[index]) {
        if (gamelogic.checkHighestCount(deck) > count) {
          const sockets = await nsp.fetchSockets();
          sockets
            .find((socket) => socket.id == player.socketId)
            .emit("deckWon", player.bets[index]);
          player.bets[index] = [[]];
        } else if (gamelogic.checkHighestCount(deck) == count) {
          const sockets = await nsp.fetchSockets();
          sockets
            .find((socket) => socket.id == player.socketId)
            .emit("returnDeck", player.bets[index]);
          player.bets[index] = [[]];
        } else {
          player.bets[index] = [[]];
        };
      };
    });
  });

  //PLAY ANIM (WIN OR LOSE)
  await gamelogic.sleep(1000);
  nsp.emit("playersUpdated", game.players);
};

gamelogic.addBet = async function (player, amount, game, nsp) {
  player.bets[0][0].push(amount);
  gamelogic.mergeStack(player.bets[0][0]);
  nsp.emit("playersUpdated", game.players);
};

gamelogic.rebet = function (player, game, nsp) {
  player.bets = [[[]]];
  nsp.emit("playersUpdated", game.players);
};

gamelogic.placeBet = function (player, game, nsp) {
  if (!player.ready && player.bets[0][0].length > 0) {
    player.ready = true;

    let allPlayersReady = true;

    game.players.forEach((player) => {
      if (!player.ready) {
        allPlayersReady = false;
        return;
      };
    });

    if (allPlayersReady) {
      gamelogic.nextTurn(game, nsp);
    };
  };
};

gamelogic.double = async function (player, socket, game, nsp) {
  //PLAY ANIM
  await gamelogic.sleep(500);
  player.bets[player.currentDeck] = player.bets[player.currentDeck].concat(player.bets[player.currentDeck]);
  player.decks[player.currentDeck].push(cards.pullCard(game.deck));

  if (game.deck.length == 0) {
    game.deck = cards.newDeck(4, true);
  };

  if (!cards.checkBusted(player.decks[player.currentDeck])) {
    if (cards.checkBlackjack(player.decks[player.currentDeck])) {
      player.blackjack[player.currentDeck] = true;
      nsp.emit("playersUpdated", game.players);
      console.log("BLACKJACK ANIM");
      //PLAY ANIM
      await gamelogic.sleep(1000);

      const sockets = await nsp.fetchSockets();
      sockets
        .find((socket) => socket.id == player.socketId)
        .emit("blackjack", player.bets[player.currentDeck]);

      if (player.currentDeck + 1 < player.decks.length) {
        player.currentDeck += 1;
        socket.emit("gameStateChanged", "turn");
      } else {
        gamelogic.nextPlayer(game, nsp);
      };
    } else {
      nsp.emit("playersUpdated", game.players);

      if (player.currentDeck + 1 < player.decks.length) {
        player.currentDeck += 1;
        socket.emit("gameStateChanged", "turn");
      } else {
        gamelogic.nextPlayer(game, nsp);
      };
    };
  } else {
    nsp.emit("playersUpdated", game.players);
    console.log("BUSTED ANIM");
    //PLAY ANIM
    await gamelogic.sleep(1000);

    player.bets[player.currentDeck] = [[]];

    if (player.currentDeck + 1 < player.decks.length) {
      player.busted[player.currentDeck] = true;
      player.currentDeck += 1;
      socket.emit("gameStateChanged", "turn");
    } else {
      player.busted[player.currentDeck] = true;
      gamelogic.nextPlayer(game, nsp);
    };
  };
};

gamelogic.split = function (player, socket, game, nsp) {
  if (player.decks[player.currentDeck].length == 2 && cards.numberValue(player.decks[player.currentDeck][0].rank) == cards.numberValue(player.decks[player.currentDeck][1].rank) && player.decks.length < 3) {
    player.decks.push([player.decks[player.currentDeck][1]]);
    player.bets.push(player.bets[player.currentDeck]);
    player.decks[player.currentDeck].splice(1, 1);

    nsp.emit("playersUpdated", game.players);
  };

  socket.emit("gameStateChanged", "turn");
};

gamelogic.stand = function (player, socket, game, nsp) {
  if (player.currentDeck + 1 < player.decks.length) {
    player.currentDeck += 1;
    socket.emit("gameStateChanged", "turn");
  } else {
    gamelogic.nextPlayer(game, nsp);
  };
};

gamelogic.hit = async function (player, socket, game, nsp) {
  //PLAY ANIM
  await gamelogic.sleep(500);
  player.decks[player.currentDeck].push(cards.pullCard(game.deck));

  if (game.deck.length == 0) {
    game.deck = cards.newDeck(4, true);
  };

  if (!cards.checkBusted(player.decks[player.currentDeck])) {
    if (cards.checkBlackjack(player.decks[player.currentDeck])) {
      player.blackjack[player.currentDeck] = true;
      nsp.emit("playersUpdated", game.players);
      console.log("BLACKJACK ANIM");
      //PLAY ANIM
      await gamelogic.sleep(1000);

      const sockets = await nsp.fetchSockets();
      sockets
        .find((socket) => socket.id == player.socketId)
        .emit("blackjack", player.bets[player.currentDeck]);

      if (player.currentDeck + 1 < player.decks.length) {
        player.currentDeck += 1;
        socket.emit("gameStateChanged", "turn");
      } else {
        gamelogic.nextPlayer(game, nsp);
      };
    } else {
      nsp.emit("playersUpdated", game.players);
      socket.emit("gameStateChanged", "turn");
    };
  } else {
    nsp.emit("playersUpdated", game.players);
    console.log("BUSTED ANIM");
    //PLAY ANIM
    await gamelogic.sleep(1000);

    player.bets[player.currentDeck] = [[]];

    if (player.currentDeck + 1 < player.decks.length) {
      player.busted[player.currentDeck] = true;
      player.currentDeck += 1;
      socket.emit("gameStateChanged", "turn");
    } else {
      player.busted[player.currentDeck] = true;
      gamelogic.nextPlayer(game, nsp);
    };
  };
};

gamelogic.mergeStack = function (stack) {
  /*const unique = new Set();

  for (i = 0; i < stack.length; i++) {
    if (unique.has(stack[i])) {
      stack.splice(i, 1);
      i = 0;
    };
  };*/
};

module.exports = gamelogic;