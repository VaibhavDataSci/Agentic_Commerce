import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import {
  CreateCheckoutSessionInput,
  UpdateCheckoutSessionInput,
  CheckoutSessionResponse,
  CheckoutStatus,
  Fulfillment
} from "../schemas/checkout.schema.js";
import { auditService } from "./audit.service.js";

// Valid State Transitions
const VALID_STATE_TRANSITIONS: Record<CheckoutStatus, CheckoutStatus[]> = {
  CREATED: ["READY_FOR_PAYMENT", "INCOMPLETE", "CANCELED", "EXPIRED"],
  INCOMPLETE: ["READY_FOR_PAYMENT", "CANCELED", "EXPIRED"],
  READY_FOR_PAYMENT: ["COMPLETED", "INCOMPLETE", "CANCELED", "EXPIRED"],
  COMPLETED: [], // Terminal state
  CANCELED: [],  // Terminal state
  EXPIRED: []    // Terminal state
};

export class CheckoutService {
  /**
   * Generates a cryptographic SHA-256 integrity hash representing the exact commercial snapshot
   */
  public generateIntegrityHash(
    items: Array<{ productId: string; quantity: number; unitPrice: number }>,
    currency: string,
    fulfillment: any,
    total: number
  ): string {
    const payload = {
      items: items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        unit_price: i.unitPrice
      })).sort((a, b) => a.product_id.localeCompare(b.product_id)),
      currency,
      fulfillment: {
        selected_option: fulfillment?.selected_shipping_option_id || "std_delivery",
        address: fulfillment?.buyer_address || null
      },
      total
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
  }

  /**
   * Authoritative calculation of Subtotal, Tax, Shipping, Discount, and Total
   */
  private calculateAuthoritativeTotals(
    items: Array<{ unitPrice: number; quantity: number }>,
    shippingOptionId = "std_delivery"
  ) {
    // 1. Subtotal: sum of items
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // 2. Tax: 10% GST on electronics
    const tax = Math.round(subtotal * 0.1);

    // 3. Shipping: Free over ₹1,000, else ₹100; Express is +₹200
    let shipping = 0;
    if (shippingOptionId === "exp_delivery") {
      shipping = 200;
    } else {
      shipping = subtotal >= 1000 ? 0 : 100;
    }

    // 4. Cart Optimization Rule: IF cart_value > 3000 -> apply 5% premium discount
    let discount = 0;
    if (subtotal > 3000) {
      discount = Math.round(subtotal * 0.05);
    }

    // 5. Final Authoritative Total
    const total = subtotal + tax + shipping - discount;

    return {
      subtotal,
      tax,
      shipping,
      discount,
      total
    };
  }

  /**
   * Returns default fulfillment structure with available shipping options
   */
  private getDefaultFulfillment(subtotal: number, customFulfillment?: Partial<Fulfillment>): Fulfillment {
    const stdCost = subtotal >= 1000 ? 0 : 100;
    const shippingOptions = [
      {
        id: "std_delivery",
        label: "Standard Delivery (2-3 Business Days)",
        cost: stdCost,
        estimated_days: "2-3 business days"
      },
      {
        id: "exp_delivery",
        label: "Express Delivery (Next Day Air)",
        cost: 200,
        estimated_days: "Next day"
      }
    ];

    return {
      selected_shipping_option_id: customFulfillment?.selected_shipping_option_id || "std_delivery",
      shipping_options: shippingOptions,
      buyer_address: customFulfillment?.buyer_address,
      buyer_contact: customFulfillment?.buyer_contact
    };
  }

  /**
   * Formats a Prisma CheckoutSession entity into ACP CheckoutSessionResponse DTO
   */
  private formatCheckoutSession(session: any): CheckoutSessionResponse {
    const isTerminal = ["COMPLETED", "CANCELED", "EXPIRED"].includes(session.status);
    const isExpired = new Date() > new Date(session.expiresAt);
    const effectiveStatus: CheckoutStatus = isExpired && !["COMPLETED", "CANCELED"].includes(session.status)
      ? "EXPIRED"
      : session.status;

    const items = (session.items || []).map((item: any) => ({
      id: item.id,
      product_id: item.productId,
      product_name: item.product?.name || "Product",
      sku: item.product?.sku || "",
      unit_price: item.unitPrice,
      quantity: item.quantity,
      total_price: item.totalPrice,
      image_url: item.product?.imageUrl,
      delivery_estimate: item.product?.deliveryEstimate
    }));

    const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return {
      checkout_id: session.id,
      id: session.id, // ACP compatibility alias
      cart_id: session.cartId,
      merchant_id: session.merchantId,
      status: effectiveStatus,
      currency: session.currency,
      subtotal: session.subtotal,
      tax: session.tax,
      shipping: session.shipping,
      discount: session.discount,
      total: session.total,
      item_count: itemCount,
      items,
      fulfillment: session.fulfillment as Fulfillment,
      integrity_hash: session.integrityHash,
      capabilities: {
        can_update_quantity: !isTerminal && !isExpired,
        can_update_fulfillment: !isTerminal && !isExpired,
        can_cancel: !isTerminal && !isExpired,
        can_complete: effectiveStatus === "READY_FOR_PAYMENT" && !isExpired,
        payment_methods_supported: ["upi", "card", "netbanking", "wallet"]
      },
      expires_at: session.expiresAt.toISOString(),
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
      metadata: session.metadata as Record<string, any>
    };
  }

  /**
   * 1. Create Checkout Session
   */
  public async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    context: { requestId: string; userId?: string; agentSessionId?: string }
  ): Promise<CheckoutSessionResponse> {
    let itemsToProcess: Array<{ productId: string; quantity: number; expectedUnitPrice?: number }> = [];
    let merchantId = input.merchant_id;
    let cartId = input.cart_id || null;

    // A. Resolve items from Cart if cart_id provided
    if (input.cart_id) {
      const cart = await prisma.cart.findUnique({
        where: { id: input.cart_id },
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      if (!cart) {
        const err: any = new Error(`Cart '${input.cart_id}' not found.`);
        err.code = "CART_NOT_FOUND";
        err.statusCode = 404;
        throw err;
      }

      if (cart.items.length === 0) {
        const err: any = new Error("Cannot create checkout from an empty cart.");
        err.code = "EMPTY_CART";
        err.statusCode = 400;
        throw err;
      }

      merchantId = cart.merchantId;
      itemsToProcess = cart.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        expectedUnitPrice: i.unitPrice
      }));
    } else if (input.items && input.items.length > 0) {
      itemsToProcess = input.items.map((i) => ({
        productId: i.product_id,
        quantity: i.quantity
      }));
    }

    // B. Inventory & Price Integrity Check for each item
    const checkoutItemsData: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const item of itemsToProcess) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true }
      });

      if (!product || product.status !== "ACTIVE") {
        await auditService.logEvent({
          requestId: context.requestId,
          userId: context.userId,
          agentSessionId: context.agentSessionId,
          eventType: "INVENTORY_CHANGED",
          result: "OUT_OF_STOCK",
          metadata: { product_id: item.productId }
        });

        const err: any = new Error(
          `Product '${item.productId}' is no longer available or inactive in the catalog.`
        );
        err.code = "PRODUCT_UNAVAILABLE";
        err.statusCode = 400;
        throw err;
      }

      // Check stock
      const availableStock = product.inventory?.availableQuantity ?? 0;
      if (availableStock < item.quantity) {
        await auditService.logEvent({
          requestId: context.requestId,
          userId: context.userId,
          agentSessionId: context.agentSessionId,
          eventType: "INVENTORY_CHANGED",
          result: "OUT_OF_STOCK",
          metadata: {
            product_id: product.id,
            requested: item.quantity,
            available: availableStock
          }
        });

        const err: any = new Error(
          `Product '${product.name}' has insufficient stock (requested: ${item.quantity}, available: ${availableStock}).`
        );
        err.code = "PRODUCT_OUT_OF_STOCK";
        err.statusCode = 400;
        throw err;
      }

      // Price Integrity Check
      if (item.expectedUnitPrice !== undefined && item.expectedUnitPrice !== product.price) {
        await auditService.logEvent({
          requestId: context.requestId,
          userId: context.userId,
          agentSessionId: context.agentSessionId,
          eventType: "PRICE_CHANGED",
          result: "PRICE_CHANGED",
          metadata: {
            product_id: product.id,
            cart_unit_price: item.expectedUnitPrice,
            current_unit_price: product.price
          }
        });

        const err: any = new Error(
          `Price for product '${product.name}' has changed from ₹${item.expectedUnitPrice} to ₹${product.price}.`
        );
        err.code = "PRICE_CHANGED";
        err.statusCode = 409;
        err.details = {
          product_id: product.id,
          previous_price: item.expectedUnitPrice,
          current_price: product.price
        };
        throw err;
      }

      if (!merchantId) {
        merchantId = product.merchantId;
      }

      checkoutItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: product.price * item.quantity
      });
    }

    if (!merchantId) {
      const defaultMerchant = await prisma.merchant.findFirst();
      merchantId = defaultMerchant!.id;
    }

    // C. Calculate Authoritative Totals
    const selectedShippingOption = input.fulfillment?.selected_shipping_option_id || "std_delivery";
    const totals = this.calculateAuthoritativeTotals(checkoutItemsData, selectedShippingOption);
    const fulfillmentData = this.getDefaultFulfillment(totals.subtotal, input.fulfillment);

    // D. Generate Checkout Integrity Hash
    const integrityHash = this.generateIntegrityHash(
      checkoutItemsData,
      "INR",
      fulfillmentData,
      totals.total
    );

    // E. 30 Minutes Expiration
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // F. Persist in PostgreSQL
    const createdSession = await prisma.checkoutSession.create({
      data: {
        cartId,
        merchantId,
        status: "READY_FOR_PAYMENT",
        currency: "INR",
        subtotal: totals.subtotal,
        tax: totals.tax,
        shipping: totals.shipping,
        discount: totals.discount,
        total: totals.total,
        integrityHash,
        fulfillment: fulfillmentData as any,
        itemsSnapshot: checkoutItemsData as any,
        metadata: {
          ...input.metadata,
          agent_session_id: context.agentSessionId || input.agent_session_id,
          request_id: context.requestId
        },
        expiresAt,
        items: {
          create: checkoutItemsData.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice
          }))
        }
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    // G. Audit Event
    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.agentSessionId || input.agent_session_id,
      checkoutId: createdSession.id,
      eventType: "CHECKOUT_CREATED",
      result: "SUCCESS",
      metadata: {
        subtotal: totals.subtotal,
        tax: totals.tax,
        shipping: totals.shipping,
        discount: totals.discount,
        total: totals.total,
        item_count: checkoutItemsData.length,
        integrity_hash: integrityHash
      }
    });

    return this.formatCheckoutSession(createdSession);
  }

  /**
   * 2. Retrieve Checkout Session by ID
   */
  public async getCheckoutSessionById(
    checkoutId: string,
    context: { requestId: string; userId?: string; agentSessionId?: string }
  ): Promise<CheckoutSessionResponse> {
    const session = await prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!session) {
      const err: any = new Error(`Checkout session '${checkoutId}' not found.`);
      err.code = "CHECKOUT_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.agentSessionId,
      checkoutId: session.id,
      eventType: "CHECKOUT_RETRIEVED",
      result: "SUCCESS",
      metadata: { status: session.status, total: session.total }
    });

    return this.formatCheckoutSession(session);
  }

  /**
   * 3. Update Checkout Session (quantity, fulfillment, etc.)
   */
  public async updateCheckoutSession(
    checkoutId: string,
    input: UpdateCheckoutSessionInput,
    context: { requestId: string; userId?: string; agentSessionId?: string }
  ): Promise<CheckoutSessionResponse> {
    const existing = await prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!existing) {
      const err: any = new Error(`Checkout session '${checkoutId}' not found.`);
      err.code = "CHECKOUT_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    // Check expiration
    if (new Date() > new Date(existing.expiresAt)) {
      const err: any = new Error("Checkout session has expired and cannot be modified.");
      err.code = "CHECKOUT_EXPIRED";
      err.statusCode = 410;
      throw err;
    }

    // Check state mutability
    if (["COMPLETED", "CANCELED", "EXPIRED"].includes(existing.status)) {
      const err: any = new Error(
        `Cannot update checkout in terminal state '${existing.status}'.`
      );
      err.code = "INVALID_STATE_TRANSITION";
      err.statusCode = 400;
      throw err;
    }

    // Determine target items
    let targetItems: Array<{ productId: string; quantity: number }> = [];
    if (input.items && input.items.length > 0) {
      targetItems = input.items.map((i) => ({
        productId: i.product_id,
        quantity: i.quantity
      }));
    } else {
      targetItems = existing.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity
      }));
    }

    // Server-side inventory & price validation
    const updatedItemsData: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    for (const item of targetItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true }
      });

      if (!product || product.status !== "ACTIVE") {
        const err: any = new Error(`Product '${item.productId}' is unavailable.`);
        err.code = "PRODUCT_UNAVAILABLE";
        err.statusCode = 400;
        throw err;
      }

      const availableStock = product.inventory?.availableQuantity ?? 0;
      if (availableStock < item.quantity) {
        const err: any = new Error(
          `Product '${product.name}' has insufficient stock (requested: ${item.quantity}, available: ${availableStock}).`
        );
        err.code = "PRODUCT_OUT_OF_STOCK";
        err.statusCode = 400;
        throw err;
      }

      updatedItemsData.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.price,
        totalPrice: product.price * item.quantity
      });
    }

    // Recalculate totals
    const existingFulfillment = existing.fulfillment as Fulfillment;
    const selectedShipping =
      input.fulfillment?.selected_shipping_option_id ||
      existingFulfillment?.selected_shipping_option_id ||
      "std_delivery";

    const totals = this.calculateAuthoritativeTotals(updatedItemsData, selectedShipping);

    const mergedFulfillment: Fulfillment = {
      selected_shipping_option_id: selectedShipping,
      shipping_options: this.getDefaultFulfillment(totals.subtotal).shipping_options,
      buyer_address: input.fulfillment?.buyer_address || existingFulfillment?.buyer_address,
      buyer_contact: input.fulfillment?.buyer_contact || existingFulfillment?.buyer_contact
    };

    // New Integrity Hash
    const newIntegrityHash = this.generateIntegrityHash(
      updatedItemsData,
      existing.currency,
      mergedFulfillment,
      totals.total
    );

    // Delete existing items & recreate updated items transactionally
    await prisma.$transaction([
      prisma.checkoutItem.deleteMany({
        where: { checkoutId }
      }),
      prisma.checkoutItem.createMany({
        data: updatedItemsData.map((i) => ({
          checkoutId,
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice
        }))
      }),
      prisma.checkoutSession.update({
        where: { id: checkoutId },
        data: {
          subtotal: totals.subtotal,
          tax: totals.tax,
          shipping: totals.shipping,
          discount: totals.discount,
          total: totals.total,
          integrityHash: newIntegrityHash,
          fulfillment: mergedFulfillment as any,
          itemsSnapshot: updatedItemsData as any,
          status: "READY_FOR_PAYMENT",
          metadata: {
            ...((existing.metadata as Record<string, any>) || {}),
            ...input.metadata,
            last_updated_by_request: context.requestId
          }
        }
      })
    ]);

    const updatedSession = await prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.agentSessionId,
      checkoutId,
      eventType: "CHECKOUT_UPDATED",
      result: "SUCCESS",
      metadata: {
        previous_total: existing.total,
        new_total: totals.total,
        new_integrity_hash: newIntegrityHash
      }
    });

    return this.formatCheckoutSession(updatedSession);
  }

  /**
   * 4. Cancel Checkout Session
   */
  public async cancelCheckoutSession(
    checkoutId: string,
    context: { requestId: string; userId?: string; agentSessionId?: string }
  ): Promise<CheckoutSessionResponse> {
    const session = await prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!session) {
      const err: any = new Error(`Checkout session '${checkoutId}' not found.`);
      err.code = "CHECKOUT_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    if (session.status === "COMPLETED") {
      const err: any = new Error("Cannot cancel a completed checkout session.");
      err.code = "INVALID_STATE_TRANSITION";
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.checkoutSession.update({
      where: { id: checkoutId },
      data: { status: "CANCELED" },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.agentSessionId,
      checkoutId,
      eventType: "CHECKOUT_CANCELED",
      result: "SUCCESS",
      metadata: { previous_status: session.status }
    });

    return this.formatCheckoutSession(updated);
  }

  /**
   * 5. Request Checkout Completion (Validates readiness for Phase 4 payment)
   */
  public async completeCheckoutSession(
    checkoutId: string,
    context: { requestId: string; userId?: string; agentSessionId?: string }
  ): Promise<CheckoutSessionResponse> {
    const session = await prisma.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!session) {
      const err: any = new Error(`Checkout session '${checkoutId}' not found.`);
      err.code = "CHECKOUT_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    if (new Date() > new Date(session.expiresAt)) {
      const err: any = new Error("Checkout session has expired.");
      err.code = "CHECKOUT_EXPIRED";
      err.statusCode = 410;
      throw err;
    }

    if (session.status !== "READY_FOR_PAYMENT") {
      const err: any = new Error(
        `Cannot complete checkout from status '${session.status}'. Checkout must be in 'READY_FOR_PAYMENT' state.`
      );
      err.code = "INVALID_STATE_TRANSITION";
      err.statusCode = 400;
      throw err;
    }

    // Verify snapshot integrity hash before completing
    const currentHash = this.generateIntegrityHash(
      session.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      })),
      session.currency,
      session.fulfillment,
      session.total
    );

    if (currentHash !== session.integrityHash) {
      const err: any = new Error("Checkout integrity violation: Data snapshot mismatch.");
      err.code = "INTEGRITY_VIOLATION";
      err.statusCode = 400;
      throw err;
    }

    const completed = await prisma.checkoutSession.update({
      where: { id: checkoutId },
      data: { status: "COMPLETED" },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.agentSessionId,
      checkoutId,
      eventType: "CHECKOUT_COMPLETION_REQUESTED",
      result: "SUCCESS",
      metadata: { total: session.total, integrity_hash: currentHash }
    });

    return this.formatCheckoutSession(completed);
  }
}

export const checkoutService = new CheckoutService();
