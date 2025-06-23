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
    // Ensure metadata has required fields with defaults
    const safeMetadata = {
      imageType: metadata?.imageType || 'mixed_media',
      subtype: metadata?.subtype || 'unknown',
      confidence: metadata?.confidence || 'medium',
      medium: metadata?.medium || 'mixed',
      style: metadata?.style || 'contemporary',
      techniques: metadata?.techniques || ['mixed'],
      dimensions: metadata?.dimensions || { width: 1024, height: 1024, orientation: 'square', aspectRatio: 1 },
      artists: metadata?.artists || []
    };

    // Create type-specific prompt instructions
    const getTypeSpecificInstructions = (imageType, subtype) => {
      switch (imageType.toLowerCase()) {
        case 'photograph':
          return `Create a prompt for a REAL PHOTOGRAPH that looks like it was taken with a camera. 
- If it's architecture: "A photograph of [subject] taken with a camera, showing real architectural details, natural lighting, realistic perspective, authentic colors"
- If it's nature: "A photograph of [subject] captured in natural light, showing real environmental details, authentic colors, realistic depth of field"
- If it's street photography: "A candid photograph of [subject] in urban setting, natural lighting, realistic street scene, authentic urban atmosphere"
- If it's portrait: "A photograph of [subject] taken with a camera, natural lighting, realistic skin texture, authentic colors, real human features"
- If it's landscape: "A photograph of [subject] landscape, natural lighting, realistic environmental details, authentic colors, real depth"
- AVOID: 3D renders, digital art, illustrations, or anything that looks artificial or computer-generated`;

        case 'painting':
          return `Create a prompt for an ACTUAL PAINTING that looks like it was painted on canvas/paper, NOT a photo of a painting.
- If it's oil painting: "An oil painting of [subject] on canvas, visible brushstrokes, paint texture, artistic composition, paint layers, canvas texture"
- If it's watercolor: "A watercolor painting of [subject] on paper, paint bleeding, paper texture, artistic flow, watercolor technique"
- If it's acrylic: "An acrylic painting of [subject] on canvas, bold colors, paint layers, artistic technique, canvas texture"
- If it's gouache: "A gouache painting of [subject] on paper, opaque paint texture, paper surface, artistic technique"
- AVOID: "photograph of a painting", "photo of canvas", "3D render of painting", or anything that suggests it's a photo of artwork`;

        case 'digital_art':
          return `Create a prompt for DIGITAL ART that looks like it was created digitally.
- "Digital art of [subject], created with digital tools, clean lines, digital composition, digital art style"
- AVOID: Photographic realism unless specifically requested`;

        default:
          return `Create a prompt for [subject] that maintains the original artistic approach and medium.`;
      }
    };

    // First, get style-specific imperfections
    const imperfectionsResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert in artistic techniques and imperfections. Your role is to suggest natural, medium-appropriate imperfections that would make an artwork feel more authentically human-made."
        },
        {
          role: "user",
          content: `Given this artwork's type and style:
Image Type: ${safeMetadata.imageType}
Subtype: ${safeMetadata.subtype}
Medium: ${safeMetadata.medium}
Style: ${safeMetadata.style}
Techniques: ${safeMetadata.techniques.join(', ')}
Dimensions: ${safeMetadata.dimensions.width}x${safeMetadata.dimensions.height} (${safeMetadata.dimensions.orientation})

What specific imperfections or human elements would make a similar piece feel authentically real? 
Focus on 2-3 key imperfections that would be natural for this type and medium.`
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
          content: `You are an expert art prompt engineer who understands the critical difference between different image types. Your goal is to create prompts that generate images that convincingly pass as human-made in a side-by-side guessing game.

CRITICAL RULES:
1. For PHOTOGRAPHS: Generate prompts that create REAL PHOTOGRAPHS, not 3D renders or digital art
2. For PAINTINGS: Generate prompts that create ACTUAL PAINTINGS, not photos of paintings
3. For DIGITAL ART: Generate prompts that create digital artwork, not photographs
4. NEVER mix types - if original is a photo, AI should be a photo; if original is a painting, AI should be a painting
5. Use specific, technical language that DALL-E 3 understands
6. Maintain the exact same artistic approach and medium
7. Change only the subject matter, not the fundamental type of image
8. Include natural imperfections and human elements typical of the medium
9. Avoid sterile, perfect compositions - favor natural, human-like variations`
        },
        {
          role: "user",
          content: `Original image information:
Description: ${description}
Style Analysis: ${styleAnalysis}
Image Type: ${safeMetadata.imageType}
Subtype: ${safeMetadata.subtype}
Medium: ${safeMetadata.medium}
Style: ${safeMetadata.style}
Artists: ${safeMetadata.artists.join(', ') || 'contemporary'}
Dimensions: ${safeMetadata.dimensions.width}x${safeMetadata.dimensions.height} (${safeMetadata.dimensions.orientation}, aspect ratio ${safeMetadata.dimensions.aspectRatio.toFixed(2)})
Suggested Imperfections: ${suggestedImperfections}

Type-Specific Instructions: ${getTypeSpecificInstructions(safeMetadata.imageType, safeMetadata.subtype)}

Create a remixed version that:
1. Maintains the EXACT same image type (photo stays photo, painting stays painting)
2. Uses the type-specific instructions above
3. Changes the subject to something contextually appropriate
4. Incorporates the suggested imperfections naturally
5. Uses technical language that DALL-E 3 will understand
6. Maintains the ${safeMetadata.dimensions.orientation} orientation with ${safeMetadata.dimensions.aspectRatio.toFixed(2)} aspect ratio

Format the response as a JSON object with these exact keys:
{
  "criticalInterpretation": "How the piece should be interpreted",
  "mainPrompt": "The main DALL-E prompt",
  "imperfectionsNote": "Specific imperfections to include",
  "dimensions": "${safeMetadata.dimensions.width}x${safeMetadata.dimensions.height}"
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
          ...safeMetadata,
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
        ...safeMetadata,
        criticalInterpretation: promptData.criticalInterpretation,
        suggestedImperfections
      }
    };
  } catch (error) {
    console.error('Error remixing caption:', error);
    return {
      prompt: description,
      metadata: metadata || {
        imageType: 'mixed_media',
        subtype: 'unknown',
        confidence: 'medium',
        medium: 'mixed',
        style: 'contemporary',
        techniques: ['mixed'],
        dimensions: { width: 1024, height: 1024, orientation: 'square', aspectRatio: 1 },
        artists: []
      }
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
          content: `You are an expert art critic and historian with deep knowledge of photography, painting, and digital art. Your task is to analyze images and determine if they are:
1. PHOTOGRAPHS: Real photographs taken with a camera (buildings, nature, street photography, portraits, etc.)
2. PAINTINGS: Actual paintings on canvas, paper, or other surfaces
3. DIGITAL ART: Computer-generated or digital illustrations
4. MIXED MEDIA: Combinations of the above

CRITICAL CLASSIFICATION RULES:
- PHOTOGRAPHS: Must look like real photos taken with a camera, showing realistic lighting, perspective, and details. Include film grain, lens characteristics, natural shadows, authentic colors.
- PAINTINGS: Must look like actual paintings on canvas/paper, showing brushstrokes, paint texture, canvas grain, paint drips, or paper texture.
- DIGITAL ART: Must look like computer-generated artwork, showing clean digital lines, digital composition, digital brush strokes.

PHOTO SUBTYPES: architecture, nature, street, portrait, landscape, still_life, documentary, candid, studio, macro, wildlife, urban, rural, abstract_photo

PAINTING SUBTYPES: oil, watercolor, acrylic, gouache, tempera, pastel, ink, charcoal, pencil, mixed_media

DIGITAL ART SUBTYPES: illustration, concept_art, digital_painting, 3d_render, vector_art, pixel_art, digital_photo_manipulation

Be extremely precise in this categorization as it affects how AI images are generated. This classification is critical for generating believable human-like images that match the original medium exactly.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Analyze this ${dimensionData?.orientation || ''} image and provide:

1. IMAGE TYPE CLASSIFICATION (CRITICAL):
   - Primary type: "photograph", "painting", "digital_art", or "mixed_media"
   - Subtype: For photos (architecture, nature, street, portrait, etc.), for paintings (oil, watercolor, acrylic, etc.)
   - Confidence: High/Medium/Low

2. DESCRIPTION (under 100 words):
   - What the image shows
   - Composition and perspective
   - Lighting and atmosphere
   - Key visual elements

3. STYLE ANALYSIS:
   - Technical approach
   - Artistic influences
   - Notable characteristics

4. METADATA (in JSON format):
   {
     "imageType": "photograph|painting|digital_art|mixed_media",
     "subtype": "specific subtype",
     "confidence": "high|medium|low",
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

Provide the classification, description, and style analysis in natural language, followed by the structured metadata.` 
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
      max_tokens: 600,
      temperature: 0.7
    });

    const fullResponse = response.choices[0].message.content.trim();
    
    // Split response into parts
    const parts = fullResponse.split(/\d\.\s+/);
    const imageTypeClassification = parts[1]?.trim() || '';
    const description = parts[2]?.trim() || '';
    const styleAnalysis = parts[3]?.trim() || '';
    
    // Extract metadata JSON
    const metadataMatch = fullResponse.match(/{[\s\S]*}/);
    const metadata = metadataMatch ? JSON.parse(metadataMatch[0]) : {};

    // Ensure dimensions are included in metadata
    if (dimensionData && (!metadata.dimensions || Object.keys(metadata.dimensions).length === 0)) {
      metadata.dimensions = dimensionData;
    }

    return {
      imageTypeClassification,
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