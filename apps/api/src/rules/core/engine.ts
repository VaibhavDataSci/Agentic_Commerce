import { Rule, RuleCategory, RuleEvaluationResult, RuleEngineReport } from "./types.js";

export class RuleEngine {
  private rules: Map<string, Rule> = new Map();

  /**
   * Register a new rule into the engine
   */
  public registerRule(rule: Rule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Register multiple rules
   */
  public registerRules(rules: Rule[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /**
   * Remove a rule by ID
   */
  public unregisterRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all registered rules
   */
  public getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by category
   */
  public getRulesByCategory(category: RuleCategory): Rule[] {
    return this.getAllRules().filter((r) => r.category === category);
  }

  /**
   * Evaluate rules against a context object
   */
  public async evaluate<TContext = any>(
    context: TContext,
    category?: RuleCategory
  ): Promise<RuleEngineReport> {
    let rulesToEvaluate = category
      ? this.getRulesByCategory(category)
      : this.getAllRules();

    // Sort by priority descending
    rulesToEvaluate = rulesToEvaluate
      .filter((r) => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    const results: RuleEvaluationResult[] = [];
    let matchedCount = 0;

    for (const rule of rulesToEvaluate) {
      try {
        const isMatched = await rule.condition(context);
        if (isMatched) {
          matchedCount++;
          const actionResult = await rule.action(context);
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            matched: true,
            actionResult,
            timestamp: new Date().toISOString()
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            category: rule.category,
            matched: false,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          category: rule.category,
          matched: false,
          actionResult: { error: error instanceof Error ? error.message : String(error) },
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      evaluatedCount: rulesToEvaluate.length,
      matchedCount,
      results
    };
  }
}
