const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/agent', chatController.chatAgent);

module.exports = router;
