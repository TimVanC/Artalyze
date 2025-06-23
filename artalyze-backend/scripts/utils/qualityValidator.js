const sharp = require('sharp');
const axios = require('axios');

/**
 * Quality validation utility for AI-generated images
 * Helps identify common AI artifacts and provides feedback for improvement
 */
class QualityValidator {
  constructor() {
    this.aiArtifactPatterns = {
      // Common AI generation artifacts
      perfectSymmetry: 'overly perfect symmetry',
      unnaturalColors: 'oversaturated or unnatural color palette',
      mechanicalPrecision: 'too perfect lines and shapes',
      textureIssues: 'lack of natural texture variation',
      lightingIssues: 'unnatural or inconsistent lighting',
      compositionIssues: 'overly centered or mechanical composition',
      detailIssues: 'inconsistent detail levels',
      styleInconsistency: 'mixed or inconsistent artistic styles'
    };
  }

  /**
   * Analyze an image for AI artifacts and quality issues
   * @param {string} imageUrl - URL of the image to analyze
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeImage(imageUrl) {
    try {
      // Download and analyze image
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      const metadata = await sharp(buffer).metadata();
      const stats = await sharp(buffer).stats();
      
      const analysis = {
        dimensions: {
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.width / metadata.height
        },
        quality: await this.assessQuality(buffer, stats),
        artifacts: await this.detectArtifacts(buffer, stats),
        recommendations: []
      };

      // Generate recommendations based on findings
      analysis.recommendations = this.generateRecommendations(analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  }

  /**
   * Assess overall image quality
   */
  async assessQuality(buffer, stats) {
    const channels = stats.channels;
    
    // Check for monochrome or extremely low contrast
    const isMonochrome = channels.every(channel => {
      const mean = channel.mean;
      return mean < 10 || mean > 245;
    });

    // Check for reasonable color distribution
    const colorVariance = channels.reduce((sum, channel) => {
      return sum + Math.pow(channel.stdev, 2);
    }, 0) / channels.length;

    // Check for reasonable brightness
    const avgBrightness = channels.reduce((sum, channel) => sum + channel.mean, 0) / channels.length;

    return {
      isMonochrome,
      colorVariance,
      avgBrightness,
      overallScore: this.calculateQualityScore(isMonochrome, colorVariance, avgBrightness)
    };
  }

  /**
   * Detect common AI artifacts
   */
  async detectArtifacts(buffer, stats) {
    const artifacts = [];
    const channels = stats.channels;

    // Check for overly perfect color distribution
    const colorBalance = this.checkColorBalance(channels);
    if (colorBalance.tooPerfect) {
      artifacts.push({
        type: 'unnaturalColors',
        severity: 'medium',
        description: 'Color distribution appears too perfect for natural art'
      });
    }

    // Check for texture issues
    const textureAnalysis = await this.analyzeTexture(buffer);
    if (textureAnalysis.tooUniform) {
      artifacts.push({
        type: 'textureIssues',
        severity: 'high',
        description: 'Texture appears too uniform and artificial'
      });
    }

    // Check for symmetry issues
    const symmetryAnalysis = await this.analyzeSymmetry(buffer);
    if (symmetryAnalysis.tooPerfect) {
      artifacts.push({
        type: 'perfectSymmetry',
        severity: 'medium',
        description: 'Symmetry appears too perfect for human-made art'
      });
    }

    return artifacts;
  }

  /**
   * Check color balance for unnatural perfection
   */
  checkColorBalance(channels) {
    // Calculate color balance metrics
    const means = channels.map(ch => ch.mean);
    const stdevs = channels.map(ch => ch.stdev);
    
    // Check if colors are too evenly distributed
    const meanVariance = this.calculateVariance(means);
    const stdevVariance = this.calculateVariance(stdevs);
    
    return {
      tooPerfect: meanVariance < 5 && stdevVariance < 2,
      meanVariance,
      stdevVariance
    };
  }

  /**
   * Analyze texture patterns
   */
  async analyzeTexture(buffer) {
    // Convert to grayscale for texture analysis
    const grayscale = await sharp(buffer)
      .grayscale()
      .raw()
      .toBuffer();

    // Calculate texture metrics
    const textureVariance = this.calculateTextureVariance(grayscale);
    
    return {
      tooUniform: textureVariance < 100, // Threshold for uniform texture
      variance: textureVariance
    };
  }

  /**
   * Analyze symmetry patterns
   */
  async analyzeSymmetry(buffer) {
    const metadata = await sharp(buffer).metadata();
    const { width, height } = metadata;
    
    // Convert to grayscale
    const grayscale = await sharp(buffer)
      .grayscale()
      .raw()
      .toBuffer();

    // Check horizontal symmetry
    const horizontalSymmetry = this.calculateSymmetry(grayscale, width, height, 'horizontal');
    
    // Check vertical symmetry
    const verticalSymmetry = this.calculateSymmetry(grayscale, width, height, 'vertical');

    return {
      tooPerfect: horizontalSymmetry > 0.95 || verticalSymmetry > 0.95,
      horizontalSymmetry,
      verticalSymmetry
    };
  }

  /**
   * Calculate symmetry score
   */
  calculateSymmetry(buffer, width, height, direction) {
    let symmetryScore = 0;
    let totalPixels = 0;

    if (direction === 'horizontal') {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width / 2; x++) {
          const leftPixel = buffer[y * width + x];
          const rightPixel = buffer[y * width + (width - 1 - x)];
          const diff = Math.abs(leftPixel - rightPixel);
          symmetryScore += (255 - diff) / 255;
          totalPixels++;
        }
      }
    } else if (direction === 'vertical') {
      for (let y = 0; y < height / 2; y++) {
        for (let x = 0; x < width; x++) {
          const topPixel = buffer[y * width + x];
          const bottomPixel = buffer[(height - 1 - y) * width + x];
          const diff = Math.abs(topPixel - bottomPixel);
          symmetryScore += (255 - diff) / 255;
          totalPixels++;
        }
      }
    }

    return totalPixels > 0 ? symmetryScore / totalPixels : 0;
  }

  /**
   * Calculate texture variance
   */
  calculateTextureVariance(buffer) {
    let sum = 0;
    let sumSquares = 0;
    const length = buffer.length;

    for (let i = 0; i < length; i++) {
      sum += buffer[i];
      sumSquares += buffer[i] * buffer[i];
    }

    const mean = sum / length;
    const variance = (sumSquares / length) - (mean * mean);
    
    return variance;
  }

  /**
   * Calculate variance of an array
   */
  calculateVariance(array) {
    const mean = array.reduce((sum, val) => sum + val, 0) / array.length;
    const variance = array.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / array.length;
    return variance;
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(isMonochrome, colorVariance, avgBrightness) {
    let score = 100;

    // Penalize monochrome images
    if (isMonochrome) score -= 30;

    // Penalize low color variance
    if (colorVariance < 50) score -= 20;

    // Penalize extreme brightness values
    if (avgBrightness < 20 || avgBrightness > 235) score -= 15;

    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.quality.isMonochrome) {
      recommendations.push({
        priority: 'high',
        category: 'color',
        suggestion: 'Add more color variation to make the image more engaging'
      });
    }

    if (analysis.quality.colorVariance < 50) {
      recommendations.push({
        priority: 'medium',
        category: 'color',
        suggestion: 'Increase color contrast and variation for more natural appearance'
      });
    }

    const artifactTypes = analysis.artifacts.map(a => a.type);
    
    if (artifactTypes.includes('unnaturalColors')) {
      recommendations.push({
        priority: 'medium',
        category: 'prompt',
        suggestion: 'Add "natural color palette" or "muted colors" to the prompt'
      });
    }

    if (artifactTypes.includes('textureIssues')) {
      recommendations.push({
        priority: 'high',
        category: 'prompt',
        suggestion: 'Include texture-related terms like "natural texture" or "surface variation"'
      });
    }

    if (artifactTypes.includes('perfectSymmetry')) {
      recommendations.push({
        priority: 'medium',
        category: 'prompt',
        suggestion: 'Add "asymmetric composition" or "natural asymmetry" to avoid perfect symmetry'
      });
    }

    return recommendations;
  }

  /**
   * Compare human vs AI image quality
   */
  async compareImages(humanImageUrl, aiImageUrl) {
    const humanAnalysis = await this.analyzeImage(humanImageUrl);
    const aiAnalysis = await this.analyzeImage(aiImageUrl);

    return {
      human: humanAnalysis,
      ai: aiAnalysis,
      comparison: {
        qualityDifference: aiAnalysis.quality.overallScore - humanAnalysis.quality.overallScore,
        artifactCount: aiAnalysis.artifacts.length,
        recommendations: aiAnalysis.recommendations
      }
    };
  }
}

module.exports = QualityValidator; 