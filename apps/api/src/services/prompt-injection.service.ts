import { auditService } from "./audit.service.js";

export interface PromptInjectionInspectionResult {
  isSuspicious: boolean;
  sanitizedText: string;
  matchedPatterns: string[];
}

export class PromptInjectionService {
  // Regex patterns commonly used in prompt injection attacks
  private adversarialPatterns: Array<{ name: string; pattern: RegExp }> = [
    { name: "instruction_override", pattern: /ignore\s+(previous|all|prior|system)\s+(instructions|directives|prompts)/i },
    { name: "system_role_override", pattern: /(system\s*:|developer\s*:|assistant\s*:|system_instruction)/i },
    { name: "budget_manipulation", pattern: /(increase|override|bypass|ignore)\s+(spending|budget|limit|amount|price)/i },
    { name: "quantity_manipulation", pattern: /(set|change|increase|make)\s+quantity\s+(to|=)\s*\d+/i },
    { name: "auto_authorize", pattern: /(authorize|approve|execute\s+payment|buy)\s+(immediately|now|automatically|without\s+asking)/i },
    { name: "tool_injection", pattern: /(call_tool|invoke_tool|execute_tool|tool_call)/i },
    { name: "prompt_leak", pattern: /(reveal|print|output|display)\s+(your\s+system\s+prompt|instructions|initial\s+prompt)/i }
  ];

  /**
   * Inspects and sanitizes untrusted merchant or product content
   */
  public async inspectAndSanitize(
    text: string,
    context?: { requestId?: string; productId?: string; sessionId?: string }
  ): Promise<PromptInjectionInspectionResult> {
    if (!text || typeof text !== "string") {
      return { isSuspicious: false, sanitizedText: "", matchedPatterns: [] };
    }

    const matchedPatterns: string[] = [];

    for (const item of this.adversarialPatterns) {
      if (item.pattern.test(text)) {
        matchedPatterns.push(item.name);
      }
    }

    const isSuspicious = matchedPatterns.length > 0;

    // Sanitize the text: replace detected malicious phrases with safety placeholders
    let sanitizedText = text;
    for (const item of this.adversarialPatterns) {
      sanitizedText = sanitizedText.replace(item.pattern, "[FILTERED_INSTRUCTION]");
    }

    // Strip potential system / role injection tags
    sanitizedText = sanitizedText
      .replace(/system:/gi, "product_info:")
      .replace(/developer:/gi, "product_info:")
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .slice(0, 1000); // Clamp maximum length

    if (isSuspicious && context?.requestId) {
      await auditService.logEvent({
        requestId: context.requestId,
        agentSessionId: context.sessionId,
        eventType: "PROMPT_INJECTION_DETECTED" as any,
        result: "FAILURE",
        metadata: {
          product_id: context.productId,
          matched_patterns: matchedPatterns,
          original_snippet: text.slice(0, 150)
        }
      });
    }

    return {
      isSuspicious,
      sanitizedText,
      matchedPatterns
    };
  }

  /**
   * Deep sanitizes an entire product object before passing it to Gemini or Policy Engine
   */
  public async sanitizeProduct(
    product: any,
    context?: { requestId?: string; sessionId?: string }
  ): Promise<any> {
    const descResult = await this.inspectAndSanitize(product.description || "", {
      ...context,
      productId: product.id
    });

    const nameResult = await this.inspectAndSanitize(product.name || "", {
      ...context,
      productId: product.id
    });

    return {
      ...product,
      name: nameResult.sanitizedText,
      description: descResult.sanitizedText,
      _injection_flagged: descResult.isSuspicious || nameResult.isSuspicious
    };
  }
}

export const promptInjectionService = new PromptInjectionService();
