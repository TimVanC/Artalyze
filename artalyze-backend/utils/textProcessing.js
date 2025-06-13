const OpenAI = require('openai');
const sharp = require('sharp');
const axios = require('axios');

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Remixes a caption into a unique prompt using GPT-4o
 * @param {Object} params - Input parameters
 * @param {string} params.description - The original description
 * @param {string} params.styleAnalysis - Style analysis text
 * @param {Object} params.metadata - Style metadata
 * @returns {Promise<Object>} - The remixed prompt and metadata
 */
const remixCaption = async ({ description, styleAnalysis, metadata }) => {
  try {
    // First, get style-specific imperfections
    const imperfectionsResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert in artistic techniques and imperfections. Your role is to suggest natural, medium-appropriate imperfections that would make an artwork feel more authentically human-made.

Focus on:
1. Medium-specific textures (e.g., visible brushstrokes, paper grain, canvas texture)
2. Natural lighting effects (e.g., glare, shadows, light leaks)
3. Surface characteristics (e.g., slight warping, aging, wear)
4. Compositional imperfections (e.g., slight asymmetry, off-center framing)
5. Realistic flaws (e.g., minor smudges, dust, natural variations)`
        },
        {
          role: "user",
          content: `Given this artwork's style:
Medium: ${metadata.medium}
Style: ${metadata.style}
Techniques: ${metadata.techniques.join(', ')}
Dimensions: ${metadata.dimensions.width}x${metadata.dimensions.height} (${metadata.dimensions.orientation})

What specific imperfections or human elements would make a similar piece feel authentically hand-made? 
Focus on 2-3 key imperfections that would be natural for this medium and style.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const suggestedImperfections = imperfectionsResponse.choices[0].message.content.trim();

    // Now, generate the final prompt
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert art prompt engineer who understands the beauty of human imperfection in art. Your goal is to create prompts that maintain artistic fidelity while introducing natural, human-like variations and imperfections.

Key rules:
1. This prompt will be used to generate an image that should convincingly pass as human-made in a side-by-side guessing game
2. ALWAYS specify a specific artistic medium (e.g., "oil painting," "film photograph," "charcoal sketch," "watercolor")
3. ALWAYS mention texture, lighting, or surface characteristics (e.g., "visible brushstrokes," "grainy texture," "light glare," "aged surface")
4. AVOID sterile or symmetrical compositions - encourage natural imperfections
5. Use grounded, realistic subjects unless the human image is already surreal
6. Keep the result under 100 characters while maintaining descriptive specificity
7. NEVER use "turtle" as a subject - it's overused
8. Choose subjects that match the scale, tone, and context of the original
9. Maintain the exact same artistic medium and style
10. Keep color and setting changes subtle and artistically relevant
11. Vary sentence structure - avoid starting with "This artwork features..."
12. Preserve aspect ratio and composition type
13. Reference similar artists and styles from the metadata
14. Incorporate suggested imperfections naturally
15. Maintain the original orientation and approximate proportions`
        },
        {
          role: "user",
          content: `Original artwork information:
Description: ${description}
Style Analysis: ${styleAnalysis}
Medium: ${metadata.medium}
Style: ${metadata.style}
Artists: ${metadata.artists.join(', ')}
Dimensions: ${metadata.dimensions.width}x${metadata.dimensions.height} (${metadata.dimensions.orientation}, aspect ratio ${metadata.dimensions.aspectRatio.toFixed(2)})
Suggested Imperfections: ${suggestedImperfections}

Create a remixed version that:
1. Begins with a critic-style interpretation of the intended artistic approach
2. Maintains the exact medium and technique
3. References similar artists or styles when relevant
4. Changes the subject to something contextually appropriate
5. Incorporates the suggested imperfections naturally
6. Uses varied, natural language
7. Maintains the ${metadata.dimensions.orientation} orientation with ${metadata.dimensions.aspectRatio.toFixed(2)} aspect ratio
8. Keeps the total prompt under 100 characters while being descriptively specific

Format the response as a JSON object with these exact keys:
{
  "criticalInterpretation": "How the piece should be interpreted",
  "mainPrompt": "The main DALL-E prompt",
  "imperfectionsNote": "Specific imperfections to include",
  "dimensions": "${metadata.dimensions.width}x${metadata.dimensions.height}"
}`
        }
      ],
      max_tokens: 500,
      temperature: 0.8
    });

    let promptData;
    try {
      promptData = JSON.parse(response.choices[0].message.content.trim());
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      console.log('Raw response:', response.choices[0].message.content.trim());
      // Fallback to using the raw response as the prompt
      return {
        prompt: response.choices[0].message.content.trim(),
        metadata: {
          ...metadata,
          criticalInterpretation: "Error parsing response",
          suggestedImperfections
        }
      };
    }
    
    // Combine all elements into the final prompt
    const finalPrompt = `${promptData.criticalInterpretation}

${promptData.mainPrompt}

Technical note: ${promptData.imperfectionsNote}

Dimensions: ${promptData.dimensions}`;

    return {
      prompt: finalPrompt,
      metadata: {
        ...metadata,
        criticalInterpretation: promptData.criticalInterpretation,
        suggestedImperfections
      }
    };
  } catch (error) {
    console.error('Error remixing caption:', error);
    return {
      prompt: description,
      metadata: metadata
    };
  }
};

/**
 * Analyzes image dimensions and calculates aspect ratio
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<Object>} - Image dimension metadata
 */
const analyzeImageDimensions = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    const metadata = await sharp(buffer).metadata();
    
    return {
      width: metadata.width,
      height: metadata.height,
      aspectRatio: metadata.width / metadata.height,
      orientation: metadata.width > metadata.height ? 'landscape' : 
                  metadata.width < metadata.height ? 'portrait' : 
                  'square'
    };
  } catch (error) {
    console.error('Error analyzing image dimensions:', error);
    return null;
  }
};

/**
 * Generates a description and style analysis of an image using GPT-4o
 * @param {string} imageUrl - URL of the image to describe
 * @returns {Promise<Object>} - The generated description and style metadata
 */
const generateImageDescription = async (imageUrl) => {
  try {
    // First analyze image dimensions
    const dimensionData = await analyzeImageDimensions(imageUrl);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert art critic and historian. Analyze artworks in detail, focusing on medium, style, composition, and artistic elements. Pay special attention to identifying artistic influences and stylistic similarities to known artists. Be precise and thorough in your analysis.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Analyze this ${dimensionData?.orientation || ''} artwork and provide:

1. DESCRIPTION (under 100 words):
   - Medium and technique
   - Subject matter and composition
   - Color palette and lighting
   - Texture and brushwork
   - Mood and atmosphere

2. STYLE ANALYSIS:
   - Primary artistic style (e.g., Impressionist, Baroque, Modern)
   - Notable techniques or approaches
   - Similar artists or artistic movements
   - Distinctive stylistic elements

3. METADATA (in JSON format):
   {
     "medium": "specific medium used",
     "style": "primary artistic style",
     "artists": ["similar artists"],
     "techniques": ["notable techniques"],
     "era": "artistic period if applicable",
     "dimensions": {
       "width": ${dimensionData?.width || 'unknown'},
       "height": ${dimensionData?.height || 'unknown'},
       "aspectRatio": ${dimensionData?.aspectRatio?.toFixed(2) || 'unknown'},
       "orientation": "${dimensionData?.orientation || 'unknown'}"
     }
   }

Provide the description and style analysis in natural language, followed by the structured metadata.` 
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const fullResponse = response.choices[0].message.content.trim();
    
    // Split response into parts
    const parts = fullResponse.split(/\d\.\s+/);
    const description = parts[1]?.trim() || '';
    const styleAnalysis = parts[2]?.trim() || '';
    
    // Extract metadata JSON
    const metadataMatch = fullResponse.match(/{[\s\S]*}/);
    const metadata = metadataMatch ? JSON.parse(metadataMatch[0]) : {};

    // Ensure dimensions are included in metadata
    if (dimensionData && (!metadata.dimensions || Object.keys(metadata.dimensions).length === 0)) {
      metadata.dimensions = dimensionData;
    }

    return {
      description,
      styleAnalysis,
      metadata
    };
  } catch (error) {
    console.error('Error generating description:', error);
    throw new Error(`Failed to generate description: ${error.message}`);
  }
};

module.exports = {
  remixCaption,
  generateImageDescription
}; 