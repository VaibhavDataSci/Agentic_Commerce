import { z } from "zod";
import { CatalogService } from "../../services/catalog.service.js";
import { CartService } from "../services/cart.service.js";
import { CheckoutService } from "../../services/checkout.service.js";
import { MandateService } from "../../services/mandate.service.js";
import { ProductSearchQuerySchema } from "../../schemas/product.schema.js";
import { CreateCartInputSchema } from "../schemas/cart.schema.js";
import {
  CreateCheckoutSessionSchema,
  UpdateCheckoutSessionSchema
} from "../../schemas/checkout.schema.js";
import { CreateMandateRequestSchema } from "../../schemas/authorization.schema.js";

// Tool Allowlist
export const ALLOWED_TOOLS = [
  "search_products",
  "get_product",
  "create_cart",
  "get_cart",
  "create_checkout",
  "get_checkout",
  "update_checkout",
  "cancel_checkout",
  "request_authorization",
  "get_authorization_status"
] as const;
export type AllowedToolName = (typeof ALLOWED_TOOLS)[number];

export interface ToolDefinition {
  name: AllowedToolName;
  description: string;
  parameters: z.ZodType<any>;
  handler: (params: any, context?: any) => Promise<any>;
}

export class ToolRegistry {
  private catalogService: CatalogService;
  private cartService: CartService;
  private checkoutService: CheckoutService;
  private mandateService: MandateService;
  private tools: Map<AllowedToolName, ToolDefinition> = new Map();

  constructor(
    catalogService = new CatalogService(),
    cartService = new CartService(),
    checkoutService = new CheckoutService(),
    mandateService = new MandateService()
  ) {
    this.catalogService = catalogService;
    this.cartService = cartService;
    this.checkoutService = checkoutService;
    this.mandateService = mandateService;
    this.registerTools();
  }

  private registerTools() {
    // 1. search_products
    this.tools.set("search_products", {
      name: "search_products",
      description: "Search merchant product catalog using structured filters like category, max_price, in_stock, rating.",
      parameters: ProductSearchQuerySchema,
      handler: async (params) => {
        return this.catalogService.searchProducts(params);
      }
    });

    // 2. get_product
    this.tools.set("get_product", {
      name: "get_product",
      description: "Get detailed information and live availability for a single product by UUID.",
      parameters: z.object({
        product_id: z.string().uuid({ message: "product_id must be a valid UUID" })
      }),
      handler: async ({ product_id }) => {
        const product = await this.catalogService.getProductById(product_id);
        if (!product) {
          const err: any = new Error(`Product '${product_id}' not found`);
          err.code = "PRODUCT_NOT_FOUND";
          err.statusCode = 404;
          throw err;
        }
        return product;
      }
    });

    // 3. create_cart
    this.tools.set("create_cart", {
      name: "create_cart",
      description: "Add a chosen product to a merchant cart with authoritative server-side stock and pricing verification.",
      parameters: CreateCartInputSchema,
      handler: async (params) => {
        return this.cartService.createOrUpdateCart(params);
      }
    });

    // 4. get_cart
    this.tools.set("get_cart", {
      name: "get_cart",
      description: "Retrieve items, subtotal, and status of an existing cart by cart_id.",
      parameters: z.object({
        cart_id: z.string().uuid({ message: "cart_id must be a valid UUID" })
      }),
      handler: async ({ cart_id }) => {
        const cart = await this.cartService.getCartById(cart_id);
        if (!cart) {
          const err: any = new Error(`Cart '${cart_id}' not found`);
          err.code = "CART_NOT_FOUND";
          err.statusCode = 404;
          throw err;
        }
        return cart;
      }
    });

    // 5. create_checkout
    this.tools.set("create_checkout", {
      name: "create_checkout",
      description: "Create an ACP-compliant checkout session from an active cart or product items with server-calculated totals.",
      parameters: CreateCheckoutSessionSchema,
      handler: async (params, context = {}) => {
        const ctx = {
          requestId: context?.requestId || `req_tool_${Date.now()}`,
          userId: context?.userId,
          agentSessionId: context?.agentSessionId
        };
        return this.checkoutService.createCheckoutSession(params, ctx);
      }
    });

    // 6. get_checkout
    this.tools.set("get_checkout", {
      name: "get_checkout",
      description: "Retrieve status, authoritative line items, subtotal, tax, shipping, and total of a checkout session.",
      parameters: z.object({
        checkout_id: z.string().min(1, { message: "checkout_id is required" })
      }),
      handler: async ({ checkout_id }, context = {}) => {
        const ctx = {
          requestId: context?.requestId || `req_tool_${Date.now()}`,
          userId: context?.userId,
          agentSessionId: context?.agentSessionId
        };
        return this.checkoutService.getCheckoutSessionById(checkout_id, ctx);
      }
    });

    // 7. update_checkout
    this.tools.set("update_checkout", {
      name: "update_checkout",
      description: "Update items, quantity, or fulfillment options of an active checkout session with live re-calculation.",
      parameters: z.object({
        checkout_id: z.string().min(1),
        updates: UpdateCheckoutSessionSchema
      }),
      handler: async ({ checkout_id, updates }, context = {}) => {
        const ctx = {
          requestId: context?.requestId || `req_tool_${Date.now()}`,
          userId: context?.userId,
          agentSessionId: context?.agentSessionId
        };
        return this.checkoutService.updateCheckoutSession(checkout_id, updates, ctx);
      }
    });

    // 8. cancel_checkout
    this.tools.set("cancel_checkout", {
      name: "cancel_checkout",
      description: "Cancel an active checkout session.",
      parameters: z.object({
        checkout_id: z.string().min(1)
      }),
      handler: async ({ checkout_id }, context = {}) => {
        const ctx = {
          requestId: context?.requestId || `req_tool_${Date.now()}`,
          userId: context?.userId,
          agentSessionId: context?.agentSessionId
        };
        return this.checkoutService.cancelCheckoutSession(checkout_id, ctx);
      }
    });

    // 9. request_authorization (Phase 4 Security)
    this.tools.set("request_authorization", {
      name: "request_authorization",
      description: "Request creation and policy engine evaluation of a signed purchase authorization mandate for user review.",
      parameters: CreateMandateRequestSchema,
      handler: async (params, context = {}) => {
        const ctx = {
          requestId: context?.requestId || `req_tool_${Date.now()}`,
          sessionId: context?.agentSessionId
        };
        return this.mandateService.requestMandate(params, ctx);
      }
    });

    // 10. get_authorization_status (Phase 4 Security)
    this.tools.set("get_authorization_status", {
      name: "get_authorization_status",
      description: "Check the status and policy checks report of an issued authorization mandate by ID.",
      parameters: z.object({
        mandate_id: z.string().min(1, { message: "mandate_id is required" })
      }),
      handler: async ({ mandate_id }, context = {}) => {
        const ctx = {
          requestId: context?.requestId || `req_tool_${Date.now()}`
        };
        return this.mandateService.getMandateById(mandate_id, ctx);
      }
    });
  }

  public getToolDefinitions() {
    return Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description
    }));
  }

  /**
   * Executes a tool strictly from the allowlist with parameter validation
   */
  public async executeTool(name: string, params: any, context?: any): Promise<any> {
    if (!ALLOWED_TOOLS.includes(name as AllowedToolName)) {
      const err: any = new Error(
        `Security Violation: Tool '${name}' is not in the authorized tool allowlist [${ALLOWED_TOOLS.join(", ")}].`
      );
      err.code = "UNAUTHORIZED_TOOL_REQUEST";
      err.statusCode = 403;
      throw err;
    }

    const tool = this.tools.get(name as AllowedToolName);
    if (!tool) {
      const err: any = new Error(`Tool '${name}' is not registered.`);
      err.code = "TOOL_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    // Validate inputs with Zod
    const validatedParams = tool.parameters.parse(params);

    // Enforce 10s timeout on tool execution
    return Promise.race([
      tool.handler(validatedParams, context),
      new Promise((_, reject) =>
        setTimeout(() => {
          const timeoutErr: any = new Error(`Tool execution for '${name}' timed out after 10,000ms.`);
          timeoutErr.code = "TOOL_TIMEOUT";
          timeoutErr.statusCode = 504;
          reject(timeoutErr);
        }, 10000)
      )
    ]);
  }
}
