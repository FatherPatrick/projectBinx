const OpenAI = require("openai");

const moderationModel = process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest";
const openAiApiKey = String(process.env.OPENAI_API_KEY || "").trim();
const moderationClient = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

let hasWarnedMissingKey = false;
let hasWarnedDisabledModeration = false;

const parseBooleanEnv = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const isModerationEnabled = () => parseBooleanEnv(process.env.OPENAI_MODERATION_ENABLED, false);

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

  if (!isModerationEnabled()) {
    if (!hasWarnedDisabledModeration) {
      console.warn("OpenAI moderation disabled: OPENAI_MODERATION_ENABLED is not true.");
      hasWarnedDisabledModeration = true;
    }

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
      const matched = await containsSlur(candidates);

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
  isModerationEnabled,
};
