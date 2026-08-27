import { z } from "zod";
import { CatalogService } from "../../services/catalog.service.js";
import { CartService } from "../services/cart.service.js";
import { ProductSearchQuerySchema } from "../../schemas/product.schema.js";
import { CreateCartInputSchema } from "../schemas/cart.schema.js";

// Tool Allowlist
export const ALLOWED_TOOLS = ["search_products", "get_product", "create_cart", "get_cart"] as const;
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
  private tools: Map<AllowedToolName, ToolDefinition> = new Map();

  constructor(catalogService = new CatalogService(), cartService = new CartService()) {
    this.catalogService = catalogService;
    this.cartService = cartService;
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
