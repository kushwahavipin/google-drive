const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many login attempts, please try again later.",
});
const { signUp, Log_in,verifyToken } = require("../Controllers/authController");
const { registerValidator, loginValidator } = require("../Helpers/validation");

router.post('/signup', loginLimiter, registerValidator, signUp);
router.post('/login', loginLimiter, loginValidator, Log_in);
router.post('/verify-token', verifyToken);

module.exports = router;