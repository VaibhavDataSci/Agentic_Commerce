export type RuleCategory =
  | "validation"
  | "cart"
  | "user_behavior"
  | "security"
  | "performance"
  | "accessibility";

export interface RuleCondition<TContext = any> {
  (context: TContext): boolean | Promise<boolean>;
}

export interface RuleAction<TContext = any, TResult = any> {
  (context: TContext): TResult | Promise<TResult>;
}

export interface Rule<TContext = any, TResult = any> {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  priority: number; // Higher number = evaluated earlier
  enabled: boolean;
  condition: RuleCondition<TContext>;
  action: RuleAction<TContext, TResult>;
}

export interface RuleEvaluationResult<TResult = any> {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  matched: boolean;
  actionResult?: TResult;
  timestamp: string;
}

export interface RuleEngineReport {
  evaluatedCount: number;
  matchedCount: number;
  results: RuleEvaluationResult[];
}
