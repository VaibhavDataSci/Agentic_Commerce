import { RuleEngine } from "./core/engine.js";
import { validationRules } from "./validation.rules.js";
import { cartRules } from "./cart.rules.js";
import { userBehaviorRules } from "./user-behavior.rules.js";
import { securityRules } from "./security.rules.js";
import { performanceRules } from "./performance.rules.js";
import { accessibilityRules } from "./accessibility.rules.js";

export * from "./core/types.js";
export * from "./core/engine.js";
export * from "./validation.rules.js";
export * from "./cart.rules.js";
export * from "./user-behavior.rules.js";
export * from "./security.rules.js";
export * from "./performance.rules.js";
export * from "./accessibility.rules.js";

export const defaultRuleEngine = new RuleEngine();

// Register all retail rule modules
defaultRuleEngine.registerRules(validationRules);
defaultRuleEngine.registerRules(cartRules);
defaultRuleEngine.registerRules(userBehaviorRules);
defaultRuleEngine.registerRules(securityRules);
defaultRuleEngine.registerRules(performanceRules);
defaultRuleEngine.registerRules(accessibilityRules);
