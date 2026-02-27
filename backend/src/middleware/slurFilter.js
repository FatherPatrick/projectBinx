const OpenAI = require("openai");

const moderationModel = process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest";
const openAiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
const moderationClient = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

let hasWarnedMissingKey = false;

const toModerationInput = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean).join("\n");
  }

  return String(value || "").trim();
};

const containsSlur = async (value) => {
  const input = toModerationInput(value);

  if (!input) {
    return false;
  }

  if (!moderationClient) {
    if (!hasWarnedMissingKey) {
      console.warn("OpenAI moderation unavailable: OPENAI_API_KEY is not set.");
      hasWarnedMissingKey = true;
    }

    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await moderationClient.moderations.create({
    model: moderationModel,
    input,
  });

  const result = response?.results?.[0];
  return Boolean(result?.flagged);
};

const createSlurFilter = ({
  getValues,
  message = "Content contains disallowed language.",
} = {}) => {
  return async (req, res, next) => {
    const values = typeof getValues === "function" ? getValues(req) : [];
    const candidates = Array.isArray(values) ? values : [values];

    try {
      const checks = await Promise.all(candidates.map((candidate) => containsSlur(candidate)));
      const matched = checks.some(Boolean);

      if (matched) {
        return res.status(400).json({ message });
      }

      return next();
    } catch (error) {
      console.error("OpenAI moderation failed:", error);
      return res.status(503).json({
        message: "Content moderation is temporarily unavailable.",
      });
    }
  };
};

module.exports = {
  containsSlur,
  createSlurFilter,
};
