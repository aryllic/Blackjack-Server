const express = require("express");
const router = express.Router();

const lobbysockets = require("../modules/lobbysockets.js");
const gamesockets = require("../modules/gamesockets.js");

const api = (req, res) => {
  res.json({ success: true });
  res.end();
};

const getLobbies = (req, res) => {
  res.json(Array.from(lobbysockets.lobbies, ([index, value]) => value));
  res.end();
};

const getLobby = (req, res) => {
  res.json(lobbysockets.lobbies.get(Number(req.params.id)) || []);
  res.end();
};

const postLobby = (req, res) => {
  const [success, lobby] = lobbysockets.addLobby(req.body.hostName, req.body.maxPlayers);

  res.json({ success: success, lobby: lobby });
  res.end();
};

router.get("/", api);
router.get("/lobbies", getLobbies);
router.get("/lobby/:id", getLobby);

router.post("/lobby", postLobby);

module.exports = router;
