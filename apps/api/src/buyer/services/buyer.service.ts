import crypto from "crypto";
import { ToolRegistry } from "../tools/tool-registry.js";
import { GeminiService } from "./gemini.service.js";
import { StructuredIntent } from "../schemas/intent.schema.js";
import { ProductRankingReport } from "../schemas/ranking.schema.js";

export interface TimelineStep {
  id: string;
  title: string;
  detail?: string;
  status: "completed" | "in_progress" | "failed";
  timestamp: string;
}

export interface BuyerChatResponse {
  session_id: string;
  request_id: string;
  user_prompt: string;
  intent: StructuredIntent;
  timeline: TimelineStep[];
  products: any[];
  ranking: ProductRankingReport;
  recommended_product: any | null;
  latency_ms: number;
}

export class BuyerService {
  constructor(
    private toolRegistry: ToolRegistry = new ToolRegistry(),
    private geminiService: GeminiService = new GeminiService()
  ) {}

  public async processShoppingRequest(
    userPrompt: string,
    sessionId?: string,
    requestId?: string
  ): Promise<BuyerChatResponse> {
    const startTime = Date.now();
    const activeSessionId = sessionId || `sess_${crypto.randomBytes(6).toString("hex")}`;
    const activeRequestId = requestId || `req_${crypto.randomBytes(6).toString("hex")}`;

    const timeline: TimelineStep[] = [];

    // Step 1: Parse Natural-Language Intent
    const intent = await this.geminiService.extractIntent(userPrompt);
    timeline.push({
      id: "step_1",
      title: "Intent understood",
      detail: intent.is_ambiguous
        ? "Ambiguity detected in user request"
        : `Identified category '${intent.category || "any"}' with ${Object.keys(intent.constraints).length} constraints`,
      status: "completed",
      timestamp: new Date().toISOString()
    });

    if (intent.is_ambiguous) {
      return {
        session_id: activeSessionId,
        request_id: activeRequestId,
        user_prompt: userPrompt,
        intent,
        timeline,
        products: [],
        ranking: {
          selected_product_id: null,
          ranked_products: [],
          summary_reasoning: intent.clarification_question || "Could you clarify what type of electronics you need?",
          constraints_applied: {}
        },
        recommended_product: null,
        latency_ms: Date.now() - startTime
      };
    }

    // Step 2: Execute Tool `search_products`
    let candidateProducts: any[] = [];
    try {
      const searchParams = {
        category: intent.category || undefined,
        max_price: intent.constraints?.max_price,
        min_price: intent.constraints?.min_price,
        in_stock: true,
        limit: 10
      };

      const searchResult = await this.toolRegistry.executeTool("search_products", searchParams);
      candidateProducts = searchResult.products || [];

      timeline.push({
        id: "step_2",
        title: "Searching merchant catalog",
        detail: `Found ${candidateProducts.length} candidate products in catalog`,
        status: "completed",
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      timeline.push({
        id: "step_2",
        title: "Merchant catalog search failed",
        detail: err.message,
        status: "failed",
        timestamp: new Date().toISOString()
      });
    }

    // Step 3: Product Ranking & Comparison
    const ranking = await this.geminiService.rankProducts(intent, candidateProducts);

    timeline.push({
      id: "step_3",
      title: "Comparing & ranking products",
      detail: `Evaluated ${ranking.ranked_products.length} products against price, features & stock`,
      status: "completed",
      timestamp: new Date().toISOString()
    });

    // Step 4: Top Recommendation Selected
    const recommendedProduct = candidateProducts.find(
      (p) => p.id === ranking.selected_product_id
    ) || null;

    if (recommendedProduct) {
      timeline.push({
        id: "step_4",
        title: "Product selected",
        detail: `Recommended ${recommendedProduct.name} (${recommendedProduct.price} INR)`,
        status: "completed",
        timestamp: new Date().toISOString()
      });
    }

    const latency = Date.now() - startTime;

    // Observability Log
    console.log(
      JSON.stringify({
        event: "ai_buyer_session",
        session_id: activeSessionId,
        request_id: activeRequestId,
        user_intent: intent,
        tools_called: ["search_products"],
        candidate_count: candidateProducts.length,
        selected_product: recommendedProduct?.id || null,
        latency_ms: latency,
        timestamp: new Date().toISOString()
      })
    );

    return {
      session_id: activeSessionId,
      request_id: activeRequestId,
      user_prompt: userPrompt,
      intent,
      timeline,
      products: candidateProducts,
      ranking,
      recommended_product: recommendedProduct,
      latency_ms: latency
    };
  }
}
