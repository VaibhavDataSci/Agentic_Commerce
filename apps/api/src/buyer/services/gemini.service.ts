import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env.js";
import { StructuredIntent, StructuredIntentSchema } from "../schemas/intent.schema.js";
import { ProductRankingReport, ProductRankingReportSchema, RankedProduct } from "../schemas/ranking.schema.js";
import { ProductResponse } from "../../schemas/product.schema.js";

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName = "gemini-1.5-flash";

  constructor() {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  /**
   * Sanitizes untrusted text to prevent prompt injection from product descriptions
   */
  private sanitizeUntrustedText(text: string): string {
    return text
      .replace(/system:/gi, "item_info:")
      .replace(/ignore (previous|all) instructions/gi, "[filtered]")
      .slice(0, 500);
  }

  /**
   * 1. Natural-Language Intent Understanding
   * Extracts category, constraints, quantity, and detects ambiguity.
   */
  public async extractIntent(userPrompt: string): Promise<StructuredIntent> {
    if (!this.genAI) {
      return this.fallbackExtractIntent(userPrompt);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      });

      const systemPrompt = `You are an AI Buyer Intent Parser for TechKart Electronics.
Extract the user's shopping requirements into a structured JSON object matching this schema:
{
  "category": string | null (one of: "headphones", "earbuds", "laptops", "keyboards", "mice", "monitors", "webcams", "speakers", or null),
  "raw_query": string,
  "constraints": {
    "wireless": boolean (optional),
    "anc": boolean (optional),
    "min_price": number (optional, INR),
    "max_price": number (optional, INR),
    "currency": "INR",
    "delivery_preference": string (optional, e.g. "tomorrow", "1-2 days"),
    "brand": string (optional),
    "features": string[] (optional),
    "switch_type": string (optional),
    "resolution": string (optional)
  },
  "quantity": number (default 1),
  "purchase_intent": boolean,
  "is_ambiguous": boolean,
  "clarification_question": string | null
}

Rules:
- If the user's request is too vague to know what electronics category or product they want (e.g. "buy me something", "I want tech stuff"), set is_ambiguous=true and provide a helpful clarification_question.
- Extract price numbers accurately (e.g. "under 5000" or "under 5k" -> max_price: 5000).
- Extract boolean flags like ANC / Active Noise Cancellation, Wireless / Bluetooth.
- Never output markdown codeblocks, only raw valid JSON.`;

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `User request: "${userPrompt}"` }
      ]);

      const text = result.response.text();
      const rawParsed = JSON.parse(text);
      rawParsed.raw_query = userPrompt;

      return StructuredIntentSchema.parse(rawParsed);
    } catch (err) {
      console.warn("Gemini intent extraction failed, using deterministic fallback:", err);
      return this.fallbackExtractIntent(userPrompt);
    }
  }

  /**
   * 2. Product Ranking and Scoring
   * Ranks candidate products according to extracted user constraints.
   */
  public async rankProducts(
    intent: StructuredIntent,
    candidates: any[]
  ): Promise<ProductRankingReport> {
    if (!candidates || candidates.length === 0) {
      return {
        selected_product_id: null,
        ranked_products: [],
        summary_reasoning: intent.is_ambiguous
          ? "Please provide more details on what you're looking for."
          : "No products in the catalog matched all your specified constraints. Consider adjusting your budget or feature requirements.",
        constraints_applied: intent.constraints
      };
    }

    if (!this.genAI) {
      return this.fallbackRankProducts(intent, candidates);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      // Prepare untrusted candidate products for Gemini evaluation
      const safeCandidates = candidates.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: p.price,
        rating: p.rating,
        in_stock: p.availability?.in_stock ?? true,
        quantity: p.availability?.quantity ?? 0,
        attributes: p.attributes,
        delivery_estimate: p.delivery_estimate,
        description: this.sanitizeUntrustedText(p.description || "")
      }));

      const systemPrompt = `You are an AI Buyer Product Ranker.
Rank candidate electronics products strictly against the user's intent and constraints.
The user requirements: ${JSON.stringify(intent.constraints)}

Rules:
1. Score each product between 0.00 and 1.00 based on constraint satisfaction, price, rating, and availability.
2. If an item is out of stock, reduce score significantly.
3. Select the best matching in-stock product as 'selected_product_id'.
4. Provide a concise, user-facing summary reason (no internal chain of thought).
5. Output JSON matching this schema:
{
  "selected_product_id": string | null,
  "ranked_products": [
    {
      "product_id": string,
      "score": number (0.00 to 1.00),
      "match_reasons": string[],
      "reason": string,
      "is_recommended": boolean
    }
  ],
  "summary_reasoning": string
}`;

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `Candidate products: ${JSON.stringify(safeCandidates)}` }
      ]);

      const text = result.response.text();
      const rawParsed = JSON.parse(text);
      rawParsed.constraints_applied = intent.constraints;

      return ProductRankingReportSchema.parse(rawParsed);
    } catch (err) {
      console.warn("Gemini ranking failed, using deterministic fallback:", err);
      return this.fallbackRankProducts(intent, candidates);
    }
  }

  // --- Deterministic Fallback & Offline Engine ---

  public fallbackExtractIntent(userPrompt: string): StructuredIntent {
    const lower = userPrompt.toLowerCase();

    // Check Ambiguity
    if (
      lower.includes("something good") ||
      lower.includes("tech stuff") ||
      lower.includes("buy me something") ||
      lower.trim().split(" ").length < 2
    ) {
      return {
        category: null,
        raw_query: userPrompt,
        constraints: { currency: "INR" },
        quantity: 1,
        purchase_intent: true,
        is_ambiguous: true,
        clarification_question:
          "Which type of electronics are you looking for? We have headphones, earbuds, laptops, keyboards, mice, monitors, webcams, and speakers."
      };
    }

    // Detect Category
    let category: string | null = null;
    if (lower.includes("headphone")) category = "headphones";
    else if (lower.includes("earbud") || lower.includes("airpod") || lower.includes("tws") || lower.includes("buds")) category = "earbuds";
    else if (lower.includes("laptop") || lower.includes("notebook") || lower.includes("macbook")) category = "laptops";
    else if (lower.includes("keyboard")) category = "keyboards";
    else if (lower.includes("mouse") || lower.includes("mice")) category = "mice";
    else if (lower.includes("monitor") || lower.includes("display") || lower.includes("screen")) category = "monitors";
    else if (lower.includes("webcam") || lower.includes("camera")) category = "webcams";
    else if (lower.includes("speaker") || lower.includes("soundbar")) category = "speakers";

    // Extract Max Price (e.g. "under 5000", "under ₹5,000", "under 5k", "below 70000")
    let max_price: number | undefined;
    const priceMatch = lower.match(/(?:under|below|less than|max|budget)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(k|thousand)?/);
    if (priceMatch) {
      let num = parseInt(priceMatch[1].replace(/,/g, ""), 10);
      if (priceMatch[2] === "k" || priceMatch[2] === "thousand") num *= 1000;
      max_price = num;
    }

    // Extract Features
    const wireless = lower.includes("wireless") || lower.includes("bluetooth");
    const anc = lower.includes("anc") || lower.includes("noise cancel") || lower.includes("noise-cancel");
    const delivery_preference = lower.includes("tomorrow")
      ? "tomorrow"
      : lower.includes("1-2 days")
      ? "1-2 days"
      : undefined;

    return {
      category,
      raw_query: userPrompt,
      constraints: {
        wireless: wireless ? true : undefined,
        anc: anc ? true : undefined,
        max_price,
        currency: "INR",
        delivery_preference
      },
      quantity: 1,
      purchase_intent: true,
      is_ambiguous: false,
      clarification_question: null
    };
  }

  public fallbackRankProducts(intent: StructuredIntent, candidates: any[]): ProductRankingReport {
    const { constraints } = intent;

    const ranked: RankedProduct[] = candidates.map((p) => {
      let score = 0.5; // Base score
      const matchReasons: string[] = [];

      // Availability check
      const inStock = p.availability?.in_stock ?? true;
      if (!inStock) {
        score -= 0.4;
      } else {
        score += 0.1;
      }

      // Category match
      if (intent.category && p.category.toLowerCase() === intent.category.toLowerCase()) {
        score += 0.2;
        matchReasons.push(`Matches category '${p.category}'`);
      }

      // Budget check
      if (constraints.max_price) {
        if (p.price <= constraints.max_price) {
          score += 0.15;
          matchReasons.push(`Within budget (₹${p.price.toLocaleString("en-IN")} ≤ ₹${constraints.max_price.toLocaleString("en-IN")})`);
        } else {
          score -= 0.3;
        }
      }

      // Feature checks
      if (constraints.wireless !== undefined) {
        if (p.attributes?.wireless === constraints.wireless) {
          score += 0.1;
          matchReasons.push("Wireless connectivity verified");
        }
      }

      if (constraints.anc !== undefined) {
        if (p.attributes?.anc === constraints.anc) {
          score += 0.15;
          matchReasons.push("Active Noise Cancellation (ANC) verified");
        }
      }

      // Rating boost
      if (p.rating >= 4.5) {
        score += 0.05;
        matchReasons.push(`Top customer rating ★${p.rating}`);
      }

      // Clamp score
      const finalScore = Math.max(0.1, Math.min(0.99, Number(score.toFixed(2))));

      return {
        product_id: p.id,
        score: finalScore,
        match_reasons: matchReasons,
        reason: matchReasons.join(" • ") || "Compatible with requested search parameters.",
        is_recommended: false
      };
    });

    // Sort by score descending
    ranked.sort((a, b) => b.score - a.score);

    const selectedId = ranked.length > 0 && ranked[0].score >= 0.4 ? ranked[0].product_id : null;
    if (selectedId) {
      const top = ranked.find((r) => r.product_id === selectedId);
      if (top) top.is_recommended = true;
    }

    const selectedProduct = candidates.find((c) => c.id === selectedId);

    const summaryReasoning = selectedProduct
      ? `Selected **${selectedProduct.name}** as the best match for your requirements with high rating and immediate stock availability.`
      : "Could not find an exact in-stock match matching all constraints.";

    return {
      selected_product_id: selectedId,
      ranked_products: ranked,
      summary_reasoning: summaryReasoning,
      constraints_applied: constraints
    };
  }
}

export const geminiService = new GeminiService();
