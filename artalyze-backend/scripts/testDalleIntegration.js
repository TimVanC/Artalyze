require('dotenv').config();
const { generateAIImage } = require('../utils/aiGeneration');

const testCases = [
  {
    name: "Photorealistic House",
    prompt: "A photorealistic image of a modern house with clean lines and large windows, set in a suburban neighborhood with manicured lawn",
    referenceImage: "https://res.cloudinary.com/artalyze/image/upload/v1/artalyze/humanImages/sample_house.jpg"
  },
  {
    name: "Abstract Painting",
    prompt: "An abstract painting with bold geometric shapes in vibrant colors, featuring dynamic brushstrokes and contrasting elements",
    referenceImage: "https://res.cloudinary.com/artalyze/image/upload/v1/artalyze/humanImages/sample_abstract.jpg"
  },
  {
    name: "Watercolor Landscape",
    prompt: "A serene watercolor landscape of a mountain lake at sunset, with soft color transitions and delicate brushwork",
    referenceImage: "https://res.cloudinary.com/artalyze/image/upload/v1/artalyze/humanImages/sample_landscape.jpg"
  },
  {
    name: "Animal Portrait",
    prompt: "A detailed portrait of a meerkat in natural habitat, showing its characteristic alert pose and expressive features",
    referenceImage: "https://res.cloudinary.com/artalyze/image/upload/v1/artalyze/humanImages/sample_animal.jpg"
  },
  {
    name: "Black and White Photo",
    prompt: "A black and white photograph of an urban street scene, capturing dramatic shadows and architectural details",
    referenceImage: "https://res.cloudinary.com/artalyze/image/upload/v1/artalyze/humanImages/sample_bw.jpg"
  }
];

async function runTests() {
  console.log('Starting DALL·E 3 integration tests...\n');

  for (const test of testCases) {
    console.log(`\nTesting: ${test.name}`);
    console.log('Prompt:', test.prompt);
    console.log('Reference Image:', test.referenceImage);
    
    try {
      const imageUrl = await generateAIImage(test.prompt, test.referenceImage, (message) => {
        console.log('Progress:', message);
      });

      if (imageUrl) {
        console.log('Success! Generated image URL:', imageUrl);
      } else {
        console.log('Failed to generate image');
      }
    } catch (error) {
      console.error('Error:', error.message);
    }

    // Add a small delay between tests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\nAll tests completed!');
}

runTests().catch(console.error); 