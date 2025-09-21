/**
 * Pattern Evolution Service
 * Uses OpenAI to analyze parsing patterns and evolve regex intelligently
 */

import { mlTrainingService, PatternRule, ParsingResult } from './mlTrainingService';
import { safeJSONParse } from '../utils/jsonCleaner';

interface PatternAnalysis {
  pattern: string;
  explanation: string;
  improvements: string[];
  alternativePatterns: string[];
  confidenceScore: number;
  testCases: {
    input: string;
    shouldMatch: boolean;
    explanation: string;
  }[];
}

interface EvolutionResult {
  originalPattern: string;
  evolvedPattern: string;
  reasoning: string;
  expectedImprovement: number;
  risks: string[];
}

class PatternEvolutionService {
  private apiKey: string | null = null;

  constructor() {
    // API key is now handled securely on the server side
    // Set a flag to indicate API is available
    this.apiKey = 'server-managed';
  }

  /**
   * Helper method to call our secure OpenAI API endpoint
   */
  private async callOpenAI(messages: any[], maxTokens: number = 1000, temperature: number = 0.7) {
    const apiUrl = import.meta.env.MODE === 'production' 
      ? '/api/openai'
      : 'http://localhost:3000/api/openai';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    return response.json();
  }

  /**
   * Analyze parsing failures and evolve patterns using AI
   */
  async evolvePatterns(
    failedText: string,
    expectedResult: any,
    currentPatterns: PatternRule[]
  ): Promise<EvolutionResult[]> {
    if (!this.apiKey) {
      console.warn('OpenAI not configured, using local evolution');
      return this.localPatternEvolution(failedText, expectedResult, currentPatterns);
    }

    try {
      const data = await this.callOpenAI([
        {
              role: 'system',
              content: `You are a regex pattern evolution expert. Your task is to analyze parsing failures and suggest improved regex patterns.
            
            You will receive:
            1. Text that failed to parse correctly
            2. The expected result
            3. Current regex patterns being used
            
            You must respond with a JSON object containing evolved patterns that would better capture the expected data.
            
            Consider:
            - Common variations in date formats
            - Different ways assignments are described
            - Course naming conventions
            - Deadline indicators
            - Edge cases and special characters
            
            Return format:
            {
              "evolutions": [
                {
                  "originalPattern": "existing pattern",
                  "evolvedPattern": "improved pattern",
                  "reasoning": "why this is better",
                  "expectedImprovement": 0.85,
                  "risks": ["potential false positives"]
                }
              ],
              "newPatterns": [
                {
                  "pattern": "completely new pattern",
                  "type": "date|task|course|deadline",
                  "reasoning": "why this pattern is needed",
                  "examples": ["example matches"]
                }
              ]
            }`
            },
            {
              role: 'user',
              content: JSON.stringify({
                failedText,
                expectedResult,
                currentPatterns: currentPatterns.map(p => ({
                  pattern: p.pattern,
                  type: p.type,
                  confidence: p.confidence,
                  examples: p.examples
                }))
              })
            }
          ], 2000, 0.3);
      const result = safeJSONParse<any>(data.choices[0].message.content || '{}', {});
      
      // Process evolutions
      const evolutions: EvolutionResult[] = [];
      
      if (result.evolutions) {
        result.evolutions.forEach((evolution: any) => {
          evolutions.push({
            originalPattern: evolution.originalPattern,
            evolvedPattern: evolution.evolvedPattern,
            reasoning: evolution.reasoning,
            expectedImprovement: evolution.expectedImprovement || 0.5,
            risks: evolution.risks || []
          });
        });
      }
      
      // Add new patterns as evolutions
      if (result.newPatterns) {
        result.newPatterns.forEach((newPattern: any) => {
          evolutions.push({
            originalPattern: '',
            evolvedPattern: newPattern.pattern,
            reasoning: newPattern.reasoning,
            expectedImprovement: 0.7,
            risks: ['New pattern - may need testing']
          });
        });
      }
      
      // Store evolution results for learning
      // Note: MLTrainingService doesn't have trackPatternPerformance, but we can log for now
      console.log('Pattern evolution suggested for:', currentPatterns[0]?.pattern);
      evolutions.forEach(evolution => {
        console.log('Evolved pattern:', evolution.evolvedPattern);
      });
      
      return evolutions;
      
    } catch (error) {
      console.error('OpenAI pattern evolution failed:', error);
      return this.localPatternEvolution(failedText, expectedResult, currentPatterns);
    }
  }

  /**
   * Generate test cases for patterns
   */
  async generateTestCases(pattern: string): Promise<Array<{
    input: string;
    shouldMatch: boolean;
    explanation: string;
  }>> {
    if (!this.apiKey) {
      return this.localTestGeneration(pattern);
    }

    try {
      const data = await this.callOpenAI([
        {
              role: 'system',
              content: 'Generate test cases for regex patterns used in academic task parsing.'
            },
            {
              role: 'user',
              content: `Generate 10 diverse test cases for this regex pattern: ${pattern}`
            }
          ], 1000, 0.7);
      const result = safeJSONParse<any>(data.choices[0].message.content || '{}', {});
      return result.testCases || [];
    } catch (error) {
      console.error('Test generation failed:', error);
      return this.localTestGeneration(pattern);
    }
  }

  /**
   * Learn from batch results
   */
  async learnFromBatch(results: ParsingResult[]): Promise<void> {
    if (!this.apiKey) {
      console.warn('Batch learning requires OpenAI configuration');
      return;
    }

    try {
      const successfulPatterns = new Set<string>();
      const failedPatterns = new Set<string>();
      
      results.forEach(result => {
        if (result.success) {
          result.patterns.datePatterns.forEach(p => successfulPatterns.add(p));
          result.patterns.taskIndicators.forEach(p => successfulPatterns.add(p));
        } else {
          result.patterns.datePatterns.forEach(p => failedPatterns.add(p));
          result.patterns.taskIndicators.forEach(p => failedPatterns.add(p));
        }
      });

      const prompt = `Analyze these parsing patterns and their success rates:
      
      Successful patterns (${successfulPatterns.size} total):
      ${Array.from(successfulPatterns).slice(0, 10).join('\n')}
      
      Failed patterns (${failedPatterns.size} total):
      ${Array.from(failedPatterns).slice(0, 10).join('\n')}
      
      Suggest improvements and new patterns based on this data.
      
      Return format:
      {
        "improvedPatterns": [
          {
            "old": "pattern to replace",
            "new": "improved pattern",
            "reason": "why this is better"
          }
        ],
        "newPatterns": [
          {
            "pattern": "new pattern",
            "type": "date|task|course",
            "confidence": 0.8
          }
        ],
        "insights": ["key learning points"]
      }`;

      const data = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are a machine learning pattern analyst. Learn from parsing results to improve regex patterns.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], 3000, 0.7);
      const improvements = safeJSONParse<any>(data.choices[0].message.content || '{}', {});
      
      // Log improvements for manual application
      if (improvements.improvedPatterns) {
        console.log('Suggested pattern improvements:', improvements.improvedPatterns);
      }
      
      // Log new patterns for manual application
      if (improvements.newPatterns) {
        console.log('Suggested new patterns:', improvements.newPatterns);
      }
      
      console.log('Batch learning insights:', improvements.insights);
      
    } catch (error) {
      console.error('Batch learning failed:', error);
    }
  }

  /**
   * Local pattern evolution without AI
   */
  private localPatternEvolution(
    failedText: string,
    expectedResult: any,
    currentPatterns: PatternRule[]
  ): EvolutionResult[] {
    const evolutions: EvolutionResult[] = [];
    
    // Simple heuristic-based evolution
    currentPatterns.forEach(pattern => {
      const successRate = pattern.successCount / (pattern.successCount + pattern.failureCount) || 0;
      if (successRate < 0.5) {
        // Pattern is failing, try to make it more flexible
        let evolvedPattern = pattern.pattern;
        
        // Make dates more flexible
        if (pattern.type === 'date') {
          evolvedPattern = evolvedPattern.replace(/\\d\{1,2\}/g, '\\d{1,2}');
          evolvedPattern = evolvedPattern.replace(/\\d\{4\}/g, '\\d{2,4}');
        }
        
        // Make task indicators case-insensitive
        if (pattern.type === 'task') {
          if (!evolvedPattern.includes('(?i)')) {
            evolvedPattern = `(?i)${evolvedPattern}`;
          }
        }
        
        evolutions.push({
          originalPattern: pattern.pattern,
          evolvedPattern,
          reasoning: 'Made pattern more flexible based on low success rate',
          expectedImprovement: 0.3,
          risks: ['May increase false positives']
        });
      }
    });
    
    return evolutions;
  }

  /**
   * Local test generation without AI
   */
  private localTestGeneration(pattern: string): Array<{
    input: string;
    shouldMatch: boolean;
    explanation: string;
  }> {
    const testCases = [];
    
    // Generate basic test cases
    if (pattern.includes('assignment') || pattern.includes('Assignment')) {
      testCases.push(
        {
          input: 'Assignment 1 due Monday',
          shouldMatch: true,
          explanation: 'Standard assignment format'
        },
        {
          input: 'The assignment is due tomorrow',
          shouldMatch: true,
          explanation: 'Alternative assignment format'
        },
        {
          input: 'No homework today',
          shouldMatch: false,
          explanation: 'No assignment mentioned'
        }
      );
    }
    
    if (pattern.includes('\\d')) {
      testCases.push(
        {
          input: 'Due date: 12/31/2025',
          shouldMatch: true,
          explanation: 'Contains digits'
        },
        {
          input: 'Due tomorrow',
          shouldMatch: false,
          explanation: 'No digits present'
        }
      );
    }
    
    return testCases;
  }

  /**
   * Analyze a single pattern
   */
  async analyzePattern(
    pattern: string,
    parsingResults: ParsingResult[]
  ): Promise<PatternAnalysis | null> {
    if (!this.apiKey) {
      console.warn('OpenAI not configured, using local evolution');
      return this.localEvolution(pattern, parsingResults);
    }
    
    try {
      const successCount = parsingResults.filter(r => r.success).length;
      const failureCount = parsingResults.length - successCount;
      
      const prompt = `Analyze this regex pattern used for academic task parsing:
      
      Pattern: ${pattern}
      Success Rate: ${(successCount / parsingResults.length * 100).toFixed(1)}%
      Total Uses: ${parsingResults.length}
      
      Sample failures:
      ${parsingResults.filter(r => !r.success).slice(0, 3).map(r => 
        `Text: "${r.originalText.substring(0, 100)}..."`
      ).join('\n')}
      
      Provide analysis in JSON format:
      {
        "pattern": "${pattern}",
        "explanation": "what this pattern does",
        "improvements": ["list of specific improvements"],
        "alternativePatterns": ["alternative regex patterns"],
        "confidenceScore": 0.0 to 1.0,
        "testCases": [
          {
            "input": "test string",
            "shouldMatch": true/false,
            "explanation": "why"
          }
        ]
      }`;
      
      const data = await this.callOpenAI([
        {
          role: 'system',
          content: 'You are a regex pattern evolution expert. Analyze parsing patterns and suggest improvements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ], 2000, 0.7);
      const result = safeJSONParse<any>(data.choices[0].message.content || '{}', {});
      
      const analysis: PatternAnalysis = {
        pattern: result.pattern || pattern,
        explanation: result.explanation || 'Pattern analysis',
        improvements: result.improvements || [],
        alternativePatterns: result.alternativePatterns || [],
        confidenceScore: result.confidenceScore || 0.5,
        testCases: result.testCases || []
      };
      
      // Store analysis
      this.storeAnalysis(pattern, analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('OpenAI pattern evolution failed:', error);
      return this.localEvolution(pattern, parsingResults);
    }
  }

  private evolutionHistory: Map<string, PatternAnalysis[]> = new Map();
  
  private storeAnalysis(pattern: string, analysis: PatternAnalysis) {
    if (!this.evolutionHistory.has(pattern)) {
      this.evolutionHistory.set(pattern, []);
    }
    this.evolutionHistory.get(pattern)!.push(analysis);
  }
  
  private localEvolution(
    pattern: string,
    parsingResults: ParsingResult[]
  ): PatternAnalysis {
    const successCount = parsingResults.filter(r => r.success).length;
    const successRate = successCount / parsingResults.length;
    
    return {
      pattern,
      explanation: 'Local pattern analysis',
      improvements: successRate < 0.5 ? ['Consider making pattern more flexible'] : [],
      alternativePatterns: [],
      confidenceScore: successRate,
      testCases: []
    };
  }
}

export const patternEvolutionService = new PatternEvolutionService();