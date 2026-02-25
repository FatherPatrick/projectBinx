const rateLimit = require("express-rate-limit");

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MINUTE_MS = SECONDS_PER_MINUTE * MS_PER_SECOND;
const HOUR_MS = MINUTES_PER_HOUR * MINUTE_MS;

const buildLimiter = ({ windowMs, max, message, skip }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    handler: (req, res) => {
      const retryAfterSeconds =
        typeof req.rateLimit?.resetTime === "number"
          ? Math.max(
              1,
              Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
            )
          : undefined;

      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    },
  });

//Logic for these is the user can create 'max' number of requests per 'N' minutes. If exceeded they get a 429 with message.
const apiWriteLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 180,
  message: "Too many write requests. Please slow down and try again shortly.",
  skip: (req) => !writeMethods.has(req.method),
});

const authLoginLimiter = buildLimiter({
  windowMs: 15 * MINUTE_MS,
  max: 8,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});

const authSignupLimiter = buildLimiter({
  windowMs: HOUR_MS,
  max: 4,
  message: "Too many account creation attempts. Please try again later.",
});

const authForgotLimiter = buildLimiter({
  windowMs: 15 * MINUTE_MS,
  max: 6,
  message: "Too many password reset requests. Please wait before trying again.",
});

const pollCreateLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 12,
  message: "Post creation is temporarily limited. Please wait and try again.",
});

const pollUpdateLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 20,
  message: "Too many poll update attempts. Please slow down and try again.",
});

const pollDeleteLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 15,
  message: "Too many delete requests. Please wait and try again.",
});

const pollVoteLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 60,
  message: "Too many vote requests. Please slow down before voting again.",
});

const commentCreateLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 40,
  message: "Too many comments submitted. Please slow down and try again.",
});

const commentDeleteLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 30,
  message: "Too many comment delete requests. Please wait and try again.",
});

const reactionWriteLimiter = buildLimiter({
  windowMs: 10 * MINUTE_MS,
  max: 120,
  message: "Too many reaction requests. Please slow down and try again.",
});

module.exports = {
  apiWriteLimiter,
  authLoginLimiter,
  authSignupLimiter,
  authForgotLimiter,
  pollCreateLimiter,
  pollUpdateLimiter,
  pollDeleteLimiter,
  pollVoteLimiter,
  commentCreateLimiter,
  commentDeleteLimiter,
  reactionWriteLimiter,
};
