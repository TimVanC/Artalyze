const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a creative AI image prompt from a caption using GPT-4 Turbo
 * @param {string} caption Original image caption
 * @returns {Promise<string>} Generated prompt for AI image
 */
async function generateAiPrompt(caption) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: `You are a precise art prompt engineer for a human-vs-AI art guessing game. Your task is to create prompts that generate images that could realistically be mistaken for human-made art.

Key principles:
1. This prompt will be used to generate an image that should convincingly pass as human-made in a side-by-side guessing game
2. ALWAYS specify a specific artistic medium (e.g., "oil painting," "film photograph," "charcoal sketch," "watercolor")
3. ALWAYS mention texture, lighting, or surface characteristics (e.g., "visible brushstrokes," "grainy texture," "light glare," "aged surface")
4. AVOID sterile or symmetrical compositions - encourage natural imperfections
5. Use grounded, realistic subjects unless the human image is already surreal
6. Keep the result under 100 characters while maintaining descriptive specificity
7. Style consistency: Maintain the exact artistic style
8. Category consistency: Keep the same subject category
9. Natural language: Use descriptive, artistic language suitable for human artists
10. Avoid AI artifacts: No geometric blocks, rendered patterns, or "AI-looking" elements`
      }, {
        role: "user",
        content: `This prompt will be used for a human-vs-AI art guessing game. The AI image must look convincingly human-made.

Caption: "${caption}"

Generate a new art prompt that:
- ALWAYS specifies a specific artistic medium (e.g., "oil painting," "film photograph," "charcoal sketch," "watercolor")
- ALWAYS mentions texture, lighting, or surface characteristics (e.g., "visible brushstrokes," "grainy texture," "light glare," "aged surface")
- AVOIDS sterile or symmetrical compositions - encourages natural imperfections
- Uses grounded, realistic subjects unless the human image is already surreal
- Keeps the same artistic style and subject category
- Uses descriptive, natural language suitable for a human artist
- Avoids vague or overly digital styles (e.g., geometric blocks, rendered patterns, "AI-looking" art)
- Produces an image that could realistically be mistaken for human-made
- Stays under 100 characters while being descriptively specific

Return ONLY the prompt text with no explanation or additional text.`
      }],
      temperature: 0.7, // Reduced for more consistent outputs
      max_tokens: 100,
      top_p: 0.9,
      frequency_penalty: 0.5,
      presence_penalty: 0.5
    });

    const prompt = response.choices[0].message.content.trim();
    return prompt;

  } catch (error) {
    console.error('Error generating AI prompt:', error);
    throw error;
  }
}

module.exports = {
  generateAiPrompt
}; 