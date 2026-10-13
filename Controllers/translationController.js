const axios = require("axios");
const config = require("../config/env");

const MAX_BATCH_SIZE = 100;
const MAX_TEXT_LENGTH = 8000;
const MAX_BATCH_CHARACTERS = 30000;

exports.translateTexts = async (req, res) => {
  const { texts, targetLanguage } = req.body || {};

  if (
    !Array.isArray(texts) ||
    texts.length === 0 ||
    texts.length > MAX_BATCH_SIZE ||
    texts.some(text => typeof text !== "string" || text.length > MAX_TEXT_LENGTH) ||
    texts.reduce((total, text) => total + (typeof text === "string" ? text.length : 0), 0) > MAX_BATCH_CHARACTERS ||
    !["en", "hi"].includes(targetLanguage)
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide up to 100 text values and a supported target language (en, hi).",
    });
  }

  const apiKey = config.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: "Google Cloud Translation is not configured on the server.",
    });
  }

  try {
    const response = await axios.post(
      "https://translation.googleapis.com/language/translate/v2",
      {
        q: texts,
        target: targetLanguage,
        format: "text",
      },
      {
        params: { key: apiKey },
        timeout: 15000,
      },
    );

    const translations = response.data?.data?.translations;
    if (
      !Array.isArray(translations) ||
      translations.length !== texts.length ||
      translations.some(item => typeof item?.translatedText !== "string")
    ) {
      throw new Error("Google Cloud Translation returned an invalid response.");
    }

    return res.json({
      success: true,
      translations: translations.map(item => item.translatedText),
    });
  } catch (error) {
    console.error("Google Cloud Translation request failed:", error.message);
    return res.status(502).json({
      success: false,
      message: "Google Cloud Translation request failed.",
      error: error.message,
    });
  }
};

// Backwards compatibility alias
exports.Transaltion = exports.translateTexts;