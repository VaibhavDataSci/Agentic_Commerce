import { Rule } from "./core/types.js";

export interface AccessibilityContext {
  hasAriaLabels?: boolean;
  hasKeyboardHandlers?: boolean;
  elementRole?: string;
}

export const accessibilityRules: Rule<AccessibilityContext>[] = [
  {
    id: "A11Y_001_KEYBOARD_ACCESSIBILITY",
    name: "Keyboard Navigation Enforcer",
    description: "Ensure all interactive commerce actions are keyboard accessible",
    category: "accessibility",
    priority: 70,
    enabled: true,
    condition: (ctx) => {
      return ctx.hasKeyboardHandlers === false;
    },
    action: () => {
      return {
        compliant: false,
        remediation: "Add onKeyDown/onKeyUp handlers and tabIndex={0} to ensure screen-reader and keyboard operability.",
        standard: "WCAG 2.1 Level AA"
      };
    }
  },
  {
    id: "A11Y_002_PROPER_LABELS",
    name: "Semantic UI Label Requirement",
    description: "Ensure UI responses include proper labels and accessible descriptions",
    category: "accessibility",
    priority: 75,
    enabled: true,
    condition: (ctx) => {
      return ctx.hasAriaLabels === false;
    },
    action: () => {
      return {
        compliant: false,
        remediation: "Attach aria-label or aria-labelledby attributes to interactive elements and pricing tags.",
        standard: "WCAG 2.1 Level AA"
      };
    }
  }
];
