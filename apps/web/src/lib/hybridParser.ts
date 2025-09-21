/**
 * Hybrid Parser Service
 * Runs both regex and AI parsing in parallel, compares results, and learns
 */

import { mlTrainingService, PatternRule } from './mlTrainingService';
import { patternEvolutionService } from './patternEvolutionService';
import { parseWithOpenAI } from './openaiParser';
import { Course } from '@studioranotes/types';

interface ParseScore {
  regexScore: number;          // 0-100: How well regex performed
  aiScore: number;              // 0-100: AI parsing confidence
  matchRate: number;            // 0-100: How much regex matched AI
  patternCoverage: number;      // 0-100: What % of text had patterns
  learningPotential: number;    // 0-100: How much we can learn from this
  overallScore: number;         // 0-100: Combined score
  improvements: string[];       // What we learned
  timestamp: Date;
}

interface RegexParseResult {
  tasks: any[];
  patternsUsed: string[];
  confidence: number;
  missedIndicators: string[];
}

export class HybridParser {
  private lastScore: ParseScore | null = null;
  
  /**
   * Parse text using both methods and compare
   */
  async parseWithComparison(
    text: string,
    courses: Course[]
  ): Promise<{
    tasks: any[];
    score: ParseScore;
    parseId: string;
  }> {
    const parseId = `hybrid_${Date.now()}`;
    console.log('🔄 Starting hybrid parsing...');
    
    // Run both parsers in parallel
    const [regexResult, aiResult] = await Promise.allSettled([
      this.parseWithRegex(text),
      parseWithOpenAI(text, courses)
    ]);
    
    // Extract results
    const regexTasks = regexResult.status === 'fulfilled' ? regexResult.value : null;
    const aiTasks = aiResult.status === 'fulfilled' ? aiResult.value : [];
    
    // Calculate comprehensive score
    const score = this.calculateScore(text, regexTasks, aiTasks);
    this.lastScore = score;
    
    // Learn from the comparison
    await this.learnFromComparison(text, regexTasks, aiTasks, score);
    
    // Log score subtly (only visible in console)
    this.logScoreSubtly(score);
    
    // Return AI results (more reliable) but keep score for tracking
    return {
      tasks: aiTasks,
      score,
      parseId
    };
  }
  
  /**
   * Parse using evolved regex patterns
   */
  private async parseWithRegex(text: string): Promise<RegexParseResult> {
    const patterns = mlTrainingService.getEvolvedPatterns();
    const tasks: any[] = [];
    const patternsUsed: string[] = [];
    const missedIndicators: string[] = [];
    
    // Extract dates
    const datePatterns = patterns.filter(p => p.type === 'date');
    const dates: string[] = [];
    
    for (const pattern of datePatterns) {
      try {
        const regex = new RegExp(pattern.pattern, 'gi');
        const matches = text.match(regex);
        if (matches) {
          dates.push(...matches);
          patternsUsed.push(pattern.pattern);
        }
      } catch (e) {
        console.warn('Invalid regex pattern:', pattern.pattern);
      }
    }
    
    // Extract task indicators
    const taskPatterns = patterns.filter(p => p.type === 'assignment' || p.type === 'task');
    const taskIndicators: string[] = [];
    
    for (const pattern of taskPatterns) {
      try {
        const regex = new RegExp(pattern.pattern, 'gi');
        const matches = text.match(regex);
        if (matches) {
          taskIndicators.push(...matches);
          patternsUsed.push(pattern.pattern);
        }
      } catch (e) {
        console.warn('Invalid regex pattern:', pattern.pattern);
      }
    }
    
    // Extract deadlines
    const deadlinePatterns = patterns.filter(p => p.type === 'deadline');
    
    for (const pattern of deadlinePatterns) {
      try {
        const regex = new RegExp(pattern.pattern, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          // Try to pair with nearby dates
          const nearbyDate = this.findNearbyDate(text, match.index, dates);
          
          if (match[1] && nearbyDate) {
            tasks.push({
              title: this.cleanTitle(match[1]),
              type: this.inferTaskType(match[1]),
              dueDate: this.parseDate(nearbyDate),
              estimatedHours: this.estimateHours(match[1]),
              complexity: 3,
              source: 'regex'
            });
            patternsUsed.push(pattern.pattern);
          }
        }
      } catch (e) {
        console.warn('Invalid regex pattern:', pattern.pattern);
      }
    }
    
    // Look for common indicators we might have missed
    const commonIndicators = [
      'homework', 'assignment', 'quiz', 'exam', 'test', 
      'project', 'paper', 'reading', 'chapter', 'due',
      'lecture', 'class', 'session', 'do:', 'clinical', 'lab'
    ];
    
    for (const indicator of commonIndicators) {
      if (text.toLowerCase().includes(indicator)) {
        const found = patternsUsed.some(p => 
          p.toLowerCase().includes(indicator)
        );
        if (!found) {
          missedIndicators.push(indicator);
        }
      }
    }
    
    // Calculate confidence based on patterns matched
    const confidence = this.calculateRegexConfidence(
      patterns, 
      patternsUsed, 
      text.length
    );
    
    return {
      tasks,
      patternsUsed: Array.from(new Set(patternsUsed)),
      confidence,
      missedIndicators
    };
  }
  
  /**
   * Calculate comprehensive parsing score
   */
  private calculateScore(
    text: string,
    regexResult: RegexParseResult | null,
    aiTasks: any[]
  ): ParseScore {
    // Default scores if regex failed
    if (!regexResult) {
      return {
        regexScore: 0,
        aiScore: aiTasks.length > 0 ? 85 : 0,
        matchRate: 0,
        patternCoverage: 0,
        learningPotential: 100, // High potential to learn since regex failed
        overallScore: aiTasks.length > 0 ? 42 : 0,
        improvements: ['Regex parsing failed - need to improve patterns'],
        timestamp: new Date()
      };
    }
    
    // Calculate regex score based on confidence and task count
    const regexScore = Math.min(100, 
      (regexResult.confidence * 50) + 
      (Math.min(regexResult.tasks.length, 20) * 2.5)
    );
    
    // AI score based on task extraction
    const aiScore = Math.min(100, 
      (aiTasks.length * 5) + 
      (aiTasks.filter(t => t.estimatedHours > 0).length * 3)
    );
    
    // Calculate match rate between regex and AI results
    let matchCount = 0;
    for (const regexTask of regexResult.tasks) {
      const aiMatch = aiTasks.find(aiTask => 
        this.tasksMatch(regexTask, aiTask)
      );
      if (aiMatch) matchCount++;
    }
    
    const matchRate = regexResult.tasks.length > 0
      ? (matchCount / regexResult.tasks.length) * 100
      : 0;
    
    // Pattern coverage - what % of the text had recognizable patterns
    const patternCoverage = Math.min(100,
      (regexResult.patternsUsed.length * 10)
    );
    
    // Learning potential - higher if there's a mismatch
    const learningPotential = Math.max(
      100 - matchRate, // Learn more when there's mismatch
      regexResult.missedIndicators.length * 20 // Learn from missed indicators
    );
    
    // Overall score weighted average
    const overallScore = Math.round(
      (regexScore * 0.3) +
      (aiScore * 0.3) +
      (matchRate * 0.25) +
      (patternCoverage * 0.15)
    );
    
    // Identify improvements
    const improvements: string[] = [];
    if (matchRate < 50) {
      improvements.push(`Low match rate (${matchRate.toFixed(0)}%) - patterns need refinement`);
    }
    if (regexResult.missedIndicators.length > 0) {
      improvements.push(`Missed indicators: ${regexResult.missedIndicators.join(', ')}`);
    }
    if (aiTasks.length > regexResult.tasks.length * 2) {
      improvements.push('AI found significantly more tasks - regex patterns too restrictive');
    }
    if (patternCoverage < 30) {
      improvements.push('Low pattern coverage - need more diverse patterns');
    }
    
    return {
      regexScore,
      aiScore,
      matchRate,
      patternCoverage,
      learningPotential,
      overallScore,
      improvements,
      timestamp: new Date()
    };
  }
  
  /**
   * Learn from the comparison between regex and AI
   */
  private async learnFromComparison(
    text: string,
    regexResult: RegexParseResult | null,
    aiTasks: any[],
    score: ParseScore
  ): Promise<void> {
    // Skip learning if no regex result
    if (!regexResult) return;
    
    // Find tasks AI found that regex missed
    const missedTasks = aiTasks.filter(aiTask => {
      return !regexResult.tasks.some(regexTask => 
        this.tasksMatch(regexTask, aiTask)
      );
    });
    
    // If we missed a lot, trigger pattern evolution
    if (missedTasks.length > 0 && score.learningPotential > 50) {
      console.log(`🧠 Learning opportunity detected! Missed ${missedTasks.length} tasks`);
      
      // Extract patterns from missed tasks
      for (const missedTask of missedTasks.slice(0, 3)) {
        // Find the text around this task's due date
        const context = this.extractContext(text, missedTask);
        
        if (context) {
          // Ask AI to suggest patterns for this missed task
          setTimeout(async () => {
            const patterns = mlTrainingService.getEvolvedPatterns();
            await patternEvolutionService.evolvePatterns(
              context,
              missedTask,
              patterns
            );
          }, 1000 + Math.random() * 2000); // Stagger learning
        }
      }
    }
    
    // Reinforce successful patterns
    if (score.matchRate > 70) {
      const patterns = mlTrainingService.getEvolvedPatterns();
      for (const patternId of regexResult.patternsUsed) {
        const pattern = patterns.find(p => p.pattern === patternId);
        if (pattern) {
          pattern.successCount++;
          pattern.confidence = Math.min(1, pattern.confidence * 1.05);
        }
      }
    }
  }
  
  /**
   * Log score subtly in console
   */
  private logScoreSubtly(score: ParseScore): void {
    // Create a subtle log that won't be noticed by users
    const scoreBar = '█'.repeat(Math.floor(score.overallScore / 10));
    const emptyBar = '░'.repeat(10 - Math.floor(score.overallScore / 10));
    
    console.log(
      `%c▶ PS:${score.overallScore} [${scoreBar}${emptyBar}] ` +
      `R:${score.regexScore.toFixed(0)} A:${score.aiScore.toFixed(0)} ` +
      `M:${score.matchRate.toFixed(0)}% L:${score.learningPotential.toFixed(0)}`,
      'color: #94a3b8; font-size: 10px; font-family: monospace;'
    );
    
    if (score.improvements.length > 0) {
      console.log(
        `%c  └─ ${score.improvements[0]}`,
        'color: #94a3b8; font-size: 9px; font-style: italic;'
      );
    }
  }
  
  /**
   * Get the last parsing score
   */
  getLastScore(): ParseScore | null {
    return this.lastScore;
  }
  
  /**
   * Get historical scores for analysis
   */
  getScoreHistory(): ParseScore[] {
    const history = localStorage.getItem('parse_score_history');
    return history ? JSON.parse(history) : [];
  }
  
  /**
   * Save score to history
   */
  private saveScoreToHistory(score: ParseScore): void {
    const history = this.getScoreHistory();
    history.push(score);
    
    // Keep only last 100 scores
    if (history.length > 100) {
      history.shift();
    }
    
    localStorage.setItem('parse_score_history', JSON.stringify(history));
  }
  
  // Helper methods
  
  private findNearbyDate(text: string, position: number, dates: string[]): string | null {
    // Look for a date within 100 characters
    const searchRange = 100;
    const nearbyText = text.substring(
      Math.max(0, position - searchRange),
      Math.min(text.length, position + searchRange)
    );
    
    for (const date of dates) {
      if (nearbyText.includes(date)) {
        return date;
      }
    }
    
    return null;
  }
  
  private cleanTitle(text: string): string {
    return text
      .replace(/[:,\-–—]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }
  
  private inferTaskType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('lecture') || lower.includes('class') || lower.includes('session')) return 'lecture';
    if (lower.includes('exam') || lower.includes('test')) return 'exam';
    if (lower.includes('quiz')) return 'exam';
    if (lower.includes('project') || lower.includes('presentation')) return 'project';
    if (lower.includes('read') || lower.includes('chapter')) return 'reading';
    if (lower.includes('lab')) return 'lab';
    if (lower.includes('do:') || lower.includes('do ')) return 'lecture'; // DO items are lecture-related
    return 'assignment';
  }
  
  private parseDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Fall through
    }
    
    // Default to 2 weeks from now
    const future = new Date();
    future.setDate(future.getDate() + 14);
    return future.toISOString();
  }
  
  private estimateHours(text: string): number {
    const lower = text.toLowerCase();
    if (lower.includes('exam') || lower.includes('test')) return 8;
    if (lower.includes('project')) return 10;
    if (lower.includes('quiz')) return 3;
    if (lower.includes('read')) return 2;
    if (lower.includes('lab')) return 4;
    return 3;
  }
  
  private tasksMatch(task1: any, task2: any): boolean {
    // Fuzzy matching - consider tasks the same if titles are similar and dates are close
    const titleMatch = this.stringSimilarity(
      (task1.title || '').toLowerCase(),
      (task2.title || '').toLowerCase()
    ) > 0.7;
    
    const date1 = new Date(task1.dueDate);
    const date2 = new Date(task2.dueDate);
    const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
    const dateMatch = daysDiff < 3; // Within 3 days
    
    return titleMatch || (task1.type === task2.type && dateMatch);
  }
  
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private calculateRegexConfidence(
    patterns: PatternRule[],
    usedPatterns: string[],
    textLength: number
  ): number {
    if (patterns.length === 0) return 0;
    
    // Average confidence of used patterns
    const usedConfidences = patterns
      .filter(p => usedPatterns.includes(p.pattern))
      .map(p => p.confidence);
    
    if (usedConfidences.length === 0) return 0;
    
    const avgConfidence = usedConfidences.reduce((a, b) => a + b, 0) / usedConfidences.length;
    
    // Bonus for using multiple patterns
    const diversityBonus = Math.min(0.2, usedPatterns.length * 0.02);
    
    return Math.min(1, avgConfidence + diversityBonus);
  }
  
  private extractContext(text: string, task: any): string | null {
    // Try to find context around the task in the original text
    if (!task.title) return null;
    
    const keywords = task.title.split(' ').filter(w => w.length > 3);
    if (keywords.length === 0) return null;
    
    // Search for the first keyword
    const index = text.toLowerCase().indexOf(keywords[0].toLowerCase());
    if (index === -1) return null;
    
    // Extract 200 characters around it
    return text.substring(
      Math.max(0, index - 100),
      Math.min(text.length, index + 100)
    );
  }
}

export const hybridParser = new HybridParser();