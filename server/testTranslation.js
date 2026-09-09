require("dotenv").config();

const {
  translateText,
} = require("./services/ai/translationService");

async function testTranslation() {
  const originalText = "Hello, how are you?";

  try {
    const result = await translateText(
      originalText,
      "en",
      "fr"
    );

    const translatedText =
      typeof result === "string"
        ? result
        : result?.translatedText;

    console.log("========== TRANSLATION TEST ==========");
    console.log("Original:", originalText);
    console.log("Translated:", translatedText || "No translation returned");
    console.log("======================================");
  } catch (error) {
    console.error("Translation Test Failed:", error.message);
  }
}

testTranslation();