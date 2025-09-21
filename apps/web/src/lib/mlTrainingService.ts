/**
 * ML Training Service
 * Collects parsing data, learns from mistakes, and evolves regex patterns
 */

import { safeStorage } from '../utils/safeStorage';

export interface ParsingResult {
  id: string;
  timestamp: Date;
  originalText: string;
  aiParsedTasks: any[];
  userCorrections?: any[];
  patterns: {
    datePatterns: string[];
    taskIndicators: string[];
    courseIdentifiers: string[];
  };
  success: boolean;
  errors?: string[];
}

export interface PatternRule {
  id: string;
  pattern: string;
  type: 'date' | 'task' | 'course' | 'deadline' | 'assignment';
  confidence: number;
  successCount: number;
  failureCount: number;
  examples: string[];
  lastUpdated: Date;
  source: 'initial' | 'learned' | 'corrected';
}

export interface LearningFeedback {
  parseId: string;
  originalTask: any;
  correctedTask: any;
  issue: string;
  suggestion: string;
}

class MLTrainingService {
  private readonly STORAGE_KEY = 'ml_training_data';
  private readonly PATTERNS_KEY = 'ml_regex_patterns';
  private readonly MAX_TRAINING_SAMPLES = 1000;
  
  // Initial regex patterns that will evolve
  private basePatterns: PatternRule[] = [
    {
      id: 'date_1',
      pattern: '\\b(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\b',
      type: 'date',
      confidence: 0.7,
      successCount: 0,
      failureCount: 0,
      examples: [],
      lastUpdated: new Date(),
      source: 'initial'
    },
    {
      id: 'date_2',
      pattern: '\\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \\d{1,2},? \\d{4}\\b',
      type: 'date',
      confidence: 0.8,
      successCount: 0,
      failureCount: 0,
      examples: [],
      lastUpdated: new Date(),
      source: 'initial'
    },
    {
      id: 'due_1',
      pattern: '\\b(due|deadline|submit by|turn in by):?\\s*([^\\n]+)',
      type: 'deadline',
      confidence: 0.9,
      successCount: 0,
      failureCount: 0,
      examples: [],
      lastUpdated: new Date(),
      source: 'initial'
    },
    {
      id: 'assignment_1',
      pattern: '\\b(assignment|homework|hw|project|paper|essay|quiz|exam|test|midterm|final)\\b',
      type: 'assignment',
      confidence: 0.85,
      successCount: 0,
      failureCount: 0,
      examples: [],
      lastUpdated: new Date(),
      source: 'initial'
    },
    {
      id: 'reading_1',
      pattern: '\\b(read|reading|chapter|ch\\.?|pp?\\.?|pages?)\\s*(\\d+[-–]?\\d*)\\b',
      type: 'task',
      confidence: 0.75,
      successCount: 0,
      failureCount: 0,
      examples: [],
      lastUpdated: new Date(),
      source: 'initial'
    }
  ];

  /**
   * Save a parsing result for training
   */
  async saveParsingResult(result: ParsingResult): Promise<void> {
    const trainingData = this.getTrainingData();
    
    // Keep only the most recent samples
    if (trainingData.length >= this.MAX_TRAINING_SAMPLES) {
      trainingData.shift(); // Remove oldest
    }
    
    trainingData.push(result);
    safeStorage.setJSON(this.STORAGE_KEY, trainingData);
    
    // Extract patterns from successful parse
    if (result.success) {
      await this.extractAndLearnPatterns(result);
    }
  }

  /**
   * Record user corrections to improve parsing
   */
  async recordCorrection(feedback: LearningFeedback): Promise<void> {
    const trainingData = this.getTrainingData();
    const parseResult = trainingData.find(d => d.id === feedback.parseId);
    
    if (parseResult) {
      if (!parseResult.userCorrections) {
        parseResult.userCorrections = [];
      }
      parseResult.userCorrections.push(feedback);
      safeStorage.setJSON(this.STORAGE_KEY, trainingData);
      
      // Learn from the correction
      await this.learnFromCorrection(feedback);
    }
  }

  /**
   * Extract patterns from successful parsing
   */
  private async extractAndLearnPatterns(result: ParsingResult): Promise<void> {
    const patterns = this.getPatterns();
    
    // Test each pattern against the original text
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.pattern, 'gi');
      const matches = result.originalText.match(regex);
      
      if (matches && matches.length > 0) {
        // Pattern found something
        pattern.successCount++;
        pattern.confidence = this.calculateConfidence(pattern);
        
        // Add unique examples
        matches.slice(0, 3).forEach(match => {
          if (!pattern.examples.includes(match)) {
            pattern.examples.push(match);
            if (pattern.examples.length > 10) {
              pattern.examples.shift(); // Keep only recent examples
            }
          }
        });
        
        pattern.lastUpdated = new Date();
      }
    }
    
    this.savePatterns(patterns);
  }

  /**
   * Learn from user corrections using AI analysis
   */
  private async learnFromCorrection(feedback: LearningFeedback): Promise<void> {
    const patterns = this.getPatterns();
    
    // Analyze what went wrong
    const analysis = await this.analyzeParsingError(
      feedback.originalTask,
      feedback.correctedTask,
      feedback.issue
    );
    
    if (analysis.newPattern) {
      // Add new learned pattern
      const newPattern: PatternRule = {
        id: `learned_${Date.now()}`,
        pattern: analysis.newPattern,
        type: analysis.patternType as any,
        confidence: 0.5, // Start with lower confidence for new patterns
        successCount: 1,
        failureCount: 0,
        examples: [analysis.example],
        lastUpdated: new Date(),
        source: 'learned'
      };
      
      patterns.push(newPattern);
    }
    
    // Update existing patterns based on failure
    if (analysis.failedPatternId) {
      const pattern = patterns.find(p => p.id === analysis.failedPatternId);
      if (pattern) {
        pattern.failureCount++;
        pattern.confidence = this.calculateConfidence(pattern);
      }
    }
    
    this.savePatterns(patterns);
  }

  /**
   * Analyze parsing errors using OpenAI to suggest improvements
   */
  private async analyzeParsingError(
    original: any,
    corrected: any,
    issue: string
  ): Promise<{
    newPattern?: string;
    patternType?: string;
    failedPatternId?: string;
    example: string;
    explanation: string;
  }> {
    try {
      // This would call OpenAI to analyze the error and suggest pattern improvements
      const response = await fetch('/api/analyze-parsing-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original,
          corrected,
          issue,
          currentPatterns: this.getPatterns().map(p => ({
            pattern: p.pattern,
            type: p.type,
            confidence: p.confidence
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze parsing error');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error analyzing parsing error:', error);
      
      // Fallback to local pattern learning
      return this.localPatternAnalysis(original, corrected, issue);
    }
  }

  /**
   * Local pattern analysis without API
   */
  private localPatternAnalysis(
    original: any,
    corrected: any,
    issue: string
  ): {
    newPattern?: string;
    patternType?: string;
    failedPatternId?: string;
    example: string;
    explanation: string;
  } {
    // Simple local analysis
    const result = {
      example: JSON.stringify(original),
      explanation: `Local analysis: ${issue}`
    };
    
    // Check for common patterns we might have missed
    if (issue.includes('date') && corrected.dueDate) {
      // Try to extract date pattern from corrected version
      const dateStr = new Date(corrected.dueDate).toLocaleDateString();
      return {
        ...result,
        newPattern: dateStr.replace(/\d+/g, '\\d+'),
        patternType: 'date'
      };
    }
    
    if (issue.includes('task type')) {
      // Learn new task type indicators
      const taskType = corrected.type;
      return {
        ...result,
        newPattern: `\\b${taskType}\\b`,
        patternType: 'assignment'
      };
    }
    
    return result as any;
  }

  /**
   * Calculate pattern confidence based on success/failure ratio
   */
  private calculateConfidence(pattern: PatternRule): number {
    const total = pattern.successCount + pattern.failureCount;
    if (total === 0) return pattern.confidence;
    
    const successRate = pattern.successCount / total;
    const baseConfidence = pattern.source === 'initial' ? 0.7 : 0.5;
    
    // Weighted average of base confidence and success rate
    return (baseConfidence * 0.3 + successRate * 0.7);
  }

  /**
   * Get evolved regex patterns for parsing
   */
  getEvolvedPatterns(): PatternRule[] {
    const patterns = this.getPatterns();
    
    // Sort by confidence and return high-confidence patterns
    return patterns
      .filter(p => p.confidence > 0.6)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate a parsing report for analysis
   */
  generateLearningReport(): {
    totalParses: number;
    successRate: number;
    commonErrors: string[];
    improvedPatterns: PatternRule[];
    recommendations: string[];
  } {
    const trainingData = this.getTrainingData();
    const patterns = this.getPatterns();
    
    const successCount = trainingData.filter(d => d.success).length;
    const successRate = trainingData.length > 0 
      ? successCount / trainingData.length 
      : 0;
    
    // Find common errors
    const errorMap = new Map<string, number>();
    trainingData.forEach(d => {
      d.errors?.forEach(error => {
        errorMap.set(error, (errorMap.get(error) || 0) + 1);
      });
    });
    
    const commonErrors = Array.from(errorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([error]) => error);
    
    // Find most improved patterns
    const improvedPatterns = patterns
      .filter(p => p.source === 'learned' && p.confidence > 0.7)
      .slice(0, 5);
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (successRate < 0.8) {
      recommendations.push('Consider training with more diverse syllabus formats');
    }
    if (commonErrors.some(e => e.includes('date'))) {
      recommendations.push('Date parsing needs improvement - collect more date format examples');
    }
    if (improvedPatterns.length < 3) {
      recommendations.push('Need more user corrections to improve pattern learning');
    }
    
    return {
      totalParses: trainingData.length,
      successRate,
      commonErrors,
      improvedPatterns,
      recommendations
    };
  }

  /**
   * Get training data from storage
   */
  private getTrainingData(): ParsingResult[] {
    return safeStorage.getJSON<ParsingResult[]>(this.STORAGE_KEY, []);
  }

  /**
   * Get patterns from storage
   */
  private getPatterns(): PatternRule[] {
    const stored = safeStorage.getJSON<PatternRule[]>(this.PATTERNS_KEY, null);
    return stored || [...this.basePatterns];
  }

  /**
   * Save patterns to storage
   */
  private savePatterns(patterns: PatternRule[]): void {
    safeStorage.setJSON(this.PATTERNS_KEY, patterns);
  }

  /**
   * Export training data for external ML model training
   */
  exportTrainingData(): string {
    const data = {
      trainingData: this.getTrainingData(),
      patterns: this.getPatterns(),
      report: this.generateLearningReport(),
      exportDate: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Reset all learned patterns (keep initial ones)
   */
  resetLearnedPatterns(): void {
    this.savePatterns([...this.basePatterns]);
  }
}

export const mlTrainingService = new MLTrainingService();