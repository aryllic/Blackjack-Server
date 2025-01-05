const cards = {};

cards.deckTemplate = [
  { rank: "2", suit: "Hearts" },
  { rank: "3", suit: "Hearts" },
  { rank: "4", suit: "Hearts" },
  { rank: "5", suit: "Hearts" },
  { rank: "6", suit: "Hearts" },
  { rank: "7", suit: "Hearts" },
  { rank: "8", suit: "Hearts" },
  { rank: "9", suit: "Hearts" },
  { rank: "10", suit: "Hearts" },
  { rank: "Jack", suit: "Hearts" },
  { rank: "Queen", suit: "Hearts" },
  { rank: "King", suit: "Hearts" },
  { rank: "Ace", suit: "Hearts" },
  { rank: "2", suit: "Diamonds" },
  { rank: "3", suit: "Diamonds" },
  { rank: "4", suit: "Diamonds" },
  { rank: "5", suit: "Diamonds" },
  { rank: "6", suit: "Diamonds" },
  { rank: "7", suit: "Diamonds" },
  { rank: "8", suit: "Diamonds" },
  { rank: "9", suit: "Diamonds" },
  { rank: "10", suit: "Diamonds" },
  { rank: "Jack", suit: "Diamonds" },
  { rank: "Queen", suit: "Diamonds" },
  { rank: "King", suit: "Diamonds" },
  { rank: "Ace", suit: "Diamonds" },
  { rank: "2", suit: "Clubs" },
  { rank: "3", suit: "Clubs" },
  { rank: "4", suit: "Clubs" },
  { rank: "5", suit: "Clubs" },
  { rank: "6", suit: "Clubs" },
  { rank: "7", suit: "Clubs" },
  { rank: "8", suit: "Clubs" },
  { rank: "9", suit: "Clubs" },
  { rank: "10", suit: "Clubs" },
  { rank: "Jack", suit: "Clubs" },
  { rank: "Queen", suit: "Clubs" },
  { rank: "King", suit: "Clubs" },
  { rank: "Ace", suit: "Clubs" },
  { rank: "2", suit: "Spades" },
  { rank: "3", suit: "Spades" },
  { rank: "4", suit: "Spades" },
  { rank: "5", suit: "Spades" },
  { rank: "6", suit: "Spades" },
  { rank: "7", suit: "Spades" },
  { rank: "8", suit: "Spades" },
  { rank: "9", suit: "Spades" },
  { rank: "10", suit: "Spades" },
  { rank: "Jack", suit: "Spades" },
  { rank: "Queen", suit: "Spades" },
  { rank: "King", suit: "Spades" },
  { rank: "Ace", suit: "Spades" }
];

cards.numberValue = function (rank) {
  let number = Number(rank);

  if (!number) {
    if (rank == "Ace") {
      number = 11;
    } else {
      number = 10;
    };
  };

  return number;
};

cards.checkBlackjack = function(deck) {
  let blackjack = false;

  if (deck.length == 2) {
      if (deck[0].rank == "Ace" && cards.numberValue(deck[1].rank) == 10) {
          blackjack = true;
      } else if (cards.numberValue(deck[0].rank) == 10 && deck[1].rank == "Ace") {
        blackjack = true;
      };
  };

  return blackjack;
};

cards.checkBusted = function(deck) { //FIX
  let busted = false;
  let count = 0;

  deck.forEach((card) => {
    const number = Number(card.rank);

    if (number) {
      count += number;
    } else if (card.rank == "King" || card.rank == "Queen" || card.rank == "Jack") {
      count += 10;
    } else if (card.rank == "Ace") {
      count += 1;
    };

    if (count > 21) {
      busted = true;
    };
  });

  return busted;
};

cards.newDeck = function (deckAmount, shuffle) {
  const newDeck = [];

  for (let i = 0; i < deckAmount; i++) {
    newDeck.push(...cards.deckTemplate);
  }

  if (shuffle) {
    cards.shuffle(newDeck);
  };

  return newDeck;
};

cards.shuffle = function (deck) {
  let currentIndex = deck.length;
  let randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [deck[currentIndex], deck[randomIndex]] = [
      deck[randomIndex],
      deck[currentIndex],
    ];
  };
};

cards.pullCard = function (deck) { //CHECK IF DECK EMPTY
  return structuredClone(deck.shift());
};

module.exports = cards;
