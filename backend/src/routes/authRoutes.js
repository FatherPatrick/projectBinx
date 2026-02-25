const express = require("express");
const {
  createSession,
  createUser,
  findUserByPhone,
  toPublicUser,
  validateUserPassword,
} = require("../auth");
const {
  authForgotLimiter,
  authLoginLimiter,
  authSignupLimiter,
} = require("../middleware/rateLimiters");

const router = express.Router();

const normalizePhone = (phoneNumber) => String(phoneNumber || "").trim();

/**
 * @swagger
 * /api/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login with phone number and password
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           required: [phoneNumber, password, deviceId]
 *           properties:
 *             phoneNumber:
 *               type: string
 *             password:
 *               type: string
 *             deviceId:
 *               type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", authLoginLimiter, async (req, res) => {
  const phoneNumber = normalizePhone(req.body.phoneNumber);
  const password = String(req.body.password || "");
  const deviceId = String(req.body.deviceId || "").trim();

  if (!phoneNumber || !password || !deviceId) {
    return res.status(400).json({
      success: false,
      message: "phoneNumber, password, and deviceId are required.",
    });
  }

  try {
    const user = await findUserByPhone(phoneNumber);

    if (!user || !validateUserPassword(user, password)) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials.",
      });
    }

    const session = await createSession({ userId: user.id, deviceId });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: session.token,
      refreshToken: session.refreshToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to login right now.",
    });
  }
});

/**
 * @swagger
 * /api/login/new:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Create a new account
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           required: [phoneNumber, password, deviceId]
 *           properties:
 *             phoneNumber:
 *               type: string
 *             password:
 *               type: string
 *             deviceId:
 *               type: string
 *     responses:
 *       201:
 *         description: Account created
 *       409:
 *         description: Account already exists
 */
router.post("/login/new", authSignupLimiter, async (req, res) => {
  const phoneNumber = normalizePhone(req.body.phoneNumber);
  const password = String(req.body.password || "");
  const deviceId = String(req.body.deviceId || "").trim();

  if (!phoneNumber || !password || !deviceId) {
    return res.status(400).json({
      success: false,
      message: "phoneNumber, password, and deviceId are required.",
    });
  }

  try {
    const existingUser = await findUserByPhone(phoneNumber);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this phone number already exists.",
      });
    }

    const createdUser = await createUser({ phoneNumber, password, deviceId });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: toPublicUser(createdUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to create account right now.",
    });
  }
});

/**
 * @swagger
 * /api/login/forgot:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Start forgot password flow
 *     parameters:
 *       - in: body
 *         name: body
 *         required: true
 *         schema:
 *           type: object
 *           required: [phoneNumber, deviceId]
 *           properties:
 *             phoneNumber:
 *               type: string
 *             deviceId:
 *               type: string
 *     responses:
 *       200:
 *         description: Reset flow started (or no-op for unknown number)
 */
router.post("/login/forgot", authForgotLimiter, async (req, res) => {
  const phoneNumber = normalizePhone(req.body.phoneNumber);
  const deviceId = String(req.body.deviceId || "").trim();

  if (!phoneNumber || !deviceId) {
    return res.status(400).json({
      success: false,
      message: "phoneNumber and deviceId are required.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Reset request sent. Check your messages.",
    deliveryChannel: "sms",
  });
});

module.exports = router;
