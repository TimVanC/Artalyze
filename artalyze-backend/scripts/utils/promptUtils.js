const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Enhanced prompt generation with style analysis and human imperfections
 * @param {string} caption Original image caption
 * @param {Object} metadata Optional metadata from style analysis
 * @returns {Promise<Object>} Generated prompt and metadata
 */
async function generateAiPrompt(caption, metadata = {}) {
  try {
    // First, analyze the style and generate imperfections if not provided
    let styleAnalysis = metadata.styleAnalysis;
    let suggestedImperfections = metadata.suggestedImperfections;
    
    if (!styleAnalysis || !suggestedImperfections) {
      const analysisResult = await analyzeStyleAndImperfections(caption, metadata);
      styleAnalysis = analysisResult.styleAnalysis;
      suggestedImperfections = analysisResult.suggestedImperfections;
    }

    // Generate the enhanced prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: `You are an expert art prompt engineer specializing in creating AI-generated art that is indistinguishable from human-made artwork. Your goal is to maintain artistic fidelity while introducing natural, human-like variations and imperfections.

Key principles:
1. Style consistency: Maintain the exact artistic style and medium
2. Category consistency: Keep the same general category while varying the specific subject
3. Human imperfection integration: Naturally incorporate medium-appropriate imperfections
4. Artistic authenticity: Reference similar artists and techniques when relevant
5. Natural variation: Avoid overly perfect or mechanical descriptions
6. Conciseness: Keep prompts under 150 characters for SDXL compatibility

Avoid common AI artifacts:
- Overly perfect lines and shapes
- Unnatural color saturation
- Mechanical precision
- Digital art signatures
- Perfect symmetry unless appropriate`
      }, {
        role: "user",
        content: `Original artwork caption: "${caption}"

Style Analysis: ${styleAnalysis}
Medium: ${metadata.medium || 'mixed'}
Style: ${metadata.style || 'contemporary'}
Suggested Imperfections: ${suggestedImperfections}

Create a new prompt for a different piece of art that:
1. Uses the same artistic style and medium
2. Stays in the same category but changes the specific subject
3. Incorporates the suggested imperfections naturally
4. Maintains artistic authenticity and human-like qualities
5. Avoids AI-generated artifacts
6. Keeps the result concise (under 150 characters)

Return ONLY the prompt text with no explanation or additional text.`
      }],
      temperature: 0.8,
      max_tokens: 150,
      top_p: 0.9,
      frequency_penalty: 0.6,
      presence_penalty: 0.6
    });

    const prompt = response.choices[0].message.content.trim();
    
    return {
      prompt,
      metadata: {
        ...metadata,
        styleAnalysis,
        suggestedImperfections,
        generatedAt: new Date()
      }
    };

  } catch (error) {
    console.error('Error generating AI prompt:', error);
    throw error;
  }
}

/**
 * Analyze style and generate imperfections for the artwork
 */
async function analyzeStyleAndImperfections(caption, metadata) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: `You are an expert art critic and historian. Analyze artworks and suggest natural imperfections that would make AI-generated art feel more authentically human-made.`
      }, {
        role: "user",
        content: `Analyze this artwork description: "${caption}"

Medium: ${metadata.medium || 'unknown'}
Style: ${metadata.style || 'unknown'}

Provide:
1. Brief style analysis (2-3 sentences)
2. 2-3 specific imperfections that would make similar AI art feel more human-made

Focus on medium-appropriate imperfections that are natural for the artistic style.`
      }],
      max_tokens: 200,
      temperature: 0.7
    });

    const analysis = response.choices[0].message.content.trim();
    
    // Parse the response to extract style analysis and imperfections
    const lines = analysis.split('\n').filter(line => line.trim());
    const styleAnalysis = lines[0] || '';
    const suggestedImperfections = lines.slice(1).join(', ') || '';

    return {
      styleAnalysis,
      suggestedImperfections
    };

  } catch (error) {
    console.error('Error analyzing style and imperfections:', error);
    return {
      styleAnalysis: 'Contemporary mixed media artwork',
      suggestedImperfections: 'natural texture variations, slight color bleeding'
    };
  }
}

/**
 * Generate a creative AI image prompt from a caption using GPT-4 Turbo (legacy function)
 * @param {string} caption Original image caption
 * @returns {Promise<string>} Generated prompt for AI image
 */
async function generateAiPromptLegacy(caption) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: `You are a precise art prompt engineer for Stable Diffusion XL. Your task is to create new prompts that maintain strict consistency with the original artwork's style and category while varying the specific subject.

Key principles:
1. Style consistency: If the original is photorealistic, abstract, watercolor, etc., maintain that exact style
2. Category consistency: Keep the same general category (e.g., architecture → building, animal → animal, landscape → landscape)
3. Subject variation: Change the specific subject while staying within the category
4. Grounded realism: Only include fantasy/surreal elements if present in the original
5. Conciseness: Keep prompts under 100 characters`
      }, {
        role: "user",
        content: `You are given a caption describing a piece of visual art:

"${caption}"

Create a new prompt for a different, creatively distinct piece of art that:
- Uses the same artistic style (e.g., photorealistic, watercolor, abstract, etc.)
- Stays in the same category or subject type (e.g., architecture → building, animal → different animal, abstract → abstract, landscape → landscape)
- Changes the specific subject (e.g., not the exact same house or animal)
- Keeps the tone grounded and believable — no fantasy unless the original is surreal
- Keeps the result concise (under 100 characters)

Return ONLY the prompt text with no explanation or additional text.`
      }],
      temperature: 0.7,
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
  generateAiPrompt,
  generateAiPromptLegacy
}; 