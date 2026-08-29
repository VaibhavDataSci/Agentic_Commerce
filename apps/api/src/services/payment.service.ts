import crypto from "crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  MerchantOrderResponse
} from "../schemas/payment.schema.js";
import { razorpayProvider } from "./razorpay.provider.js";
import { mandateService } from "./mandate.service.js";
import { policyEngine } from "./policy-engine.service.js";
import { auditService } from "./audit.service.js";

export interface PaymentContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
}

export class PaymentService {
  /**
   * 1. Perform exhaustive Pre-flight Security & Integrity Checks
   */
  public async preflightCheck(
    mandateId: string,
    checkoutId: string,
    context: PaymentContext
  ) {
    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId,
      eventType: "PAYMENT_PRECHECK_STARTED" as any,
      result: "SUCCESS",
      metadata: { mandate_id: mandateId }
    });

    // 1. Fetch Mandate
    const mandate = await prisma.authorizationMandate.findUnique({
      where: { id: mandateId },
      include: { checkout: { include: { merchant: true, items: { include: { product: true } } } } }
    });

    if (!mandate) {
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        eventType: "PAYMENT_PRECHECK_FAILED" as any,
        result: "FAILURE",
        metadata: { reason_code: "MANDATE_NOT_FOUND" }
      });
      const err: any = new Error(`Mandate '${mandateId}' not found.`);
      err.code = "MANDATE_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    // 2. Verify Mandate Status is AUTHORIZED
    if (mandate.status !== "AUTHORIZED") {
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId,
        eventType: "MANDATE_REJECTED" as any,
        result: "FAILURE",
        metadata: { status: mandate.status }
      });
      const err: any = new Error(
        `Mandate is not in AUTHORIZED status (current status: '${mandate.status}').`
      );
      err.code = "MANDATE_NOT_AUTHORIZED";
      err.statusCode = 400;
      throw err;
    }

    // 3. Verify Mandate Cryptographic Signature & Expiration & Replay via MandateService
    const verification = await mandateService.verifyMandate(mandateId, {
      requestId: context.requestId,
      userId: context.userId
    });

    if (!verification.isValid) {
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId,
        eventType: "PAYMENT_PRECHECK_FAILED" as any,
        result: "FAILURE",
        metadata: { reason_code: verification.reasonCode, message: verification.reasonMessage }
      });
      const err: any = new Error(verification.reasonMessage);
      err.code = verification.reasonCode;
      err.statusCode = 400;
      throw err;
    }

    // 4. Verify Checkout Exists & Status is READY_FOR_PAYMENT
    const checkout = mandate.checkout;
    if (!checkout || checkout.id !== checkoutId) {
      const err: any = new Error(`Checkout mismatch for mandate '${mandateId}'.`);
      err.code = "CHECKOUT_MISMATCH";
      err.statusCode = 400;
      throw err;
    }

    if (checkout.status !== "READY_FOR_PAYMENT") {
      const err: any = new Error(
        `Checkout session status is '${checkout.status}' (expected 'READY_FOR_PAYMENT').`
      );
      err.code = "INVALID_CHECKOUT_STATE";
      err.statusCode = 400;
      throw err;
    }

    // 5. Verify Checkout Amount matches Authorized Mandate Amount
    if (checkout.total !== mandate.amount) {
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId,
        eventType: "PAYMENT_AMOUNT_MISMATCH" as any,
        result: "FAILURE",
        metadata: {
          checkout_total: checkout.total,
          mandate_amount: mandate.amount
        }
      });
      const err: any = new Error(
        `Payment amount mismatch: Checkout total (₹${checkout.total}) differs from authorized mandate (₹${mandate.amount}).`
      );
      err.code = "PAYMENT_AMOUNT_MISMATCH";
      err.statusCode = 400;
      throw err;
    }

    // 6. Re-evaluate Deterministic Policy Engine to ensure live stock and constraints remain valid
    const constraintsSnapshot = (mandate.constraintsSnapshot as Record<string, any>) || {};
    const evaluation = await policyEngine.evaluate(
      checkoutId,
      {
        maxAmount: constraintsSnapshot.max_amount || mandate.amount,
        currency: mandate.currency,
        allowedMerchants: constraintsSnapshot.allowed_merchants || [],
        allowedCategories: constraintsSnapshot.allowed_categories || [],
        maxQuantity: constraintsSnapshot.max_quantity || 10,
        requiredFeatures: constraintsSnapshot.required_features || {},
        expiresAt: mandate.expiresAt
      },
      {
        requestId: context.requestId,
        userId: context.userId,
        sessionId: context.sessionId
      }
    );

    if (evaluation.decision !== "ALLOW") {
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId,
        eventType: "PAYMENT_PRECHECK_FAILED" as any,
        result: "FAILURE",
        metadata: {
          reason_code: evaluation.reason_code,
          reason_message: evaluation.reason_message
        }
      });
      const err: any = new Error(`Pre-flight policy check failed: ${evaluation.reason_message}`);
      err.code = evaluation.reason_code;
      err.statusCode = 400;
      throw err;
    }

    return { mandate, checkout };
  }

  /**
   * 2. Initiate Razorpay Order & Payment Record
   */
  public async initiatePayment(
    input: InitiatePaymentRequest,
    context: PaymentContext
  ): Promise<InitiatePaymentResponse> {
    const { mandate_id, checkout_id } = input;

    // 1. Run rigorous pre-flight validation
    const { mandate, checkout } = await this.preflightCheck(mandate_id, checkout_id, context);

    // 2. Check for existing payment record (Idempotency)
    const existingPayment = await prisma.payment.findFirst({
      where: {
        mandateId: mandate_id,
        checkoutId: checkout_id,
        status: { in: ["ORDER_CREATED", "PAYMENT_PENDING", "PAID"] }
      }
    });

    if (existingPayment) {
      return {
        payment_id: existingPayment.id,
        razorpay_order_id: existingPayment.razorpayOrderId,
        razorpay_key_id: razorpayProvider.getPublicKeyId(),
        amount: existingPayment.amount,
        amount_paise: existingPayment.amountPaise,
        currency: existingPayment.currency,
        status: existingPayment.status as any,
        merchant_name: checkout.merchant.name,
        description: `Order at ${checkout.merchant.name} for ${checkout.items.length} item(s)`
      };
    }

    // 3. Create Razorpay Order in integer paise unit
    const amountPaise = checkout.total * 100;
    const razorpayOrder = await razorpayProvider.createOrder({
      amountPaise,
      currency: checkout.currency,
      receipt: `rcpt_${checkout.id.slice(0, 8)}`,
      notes: {
        checkout_id: checkout.id,
        mandate_id: mandate.id,
        merchant_id: checkout.merchantId
      }
    });

    // 4. Create internal Payment record
    const paymentId = `pay_rec_${crypto.randomUUID()}`;
    const payment = await prisma.payment.create({
      data: {
        id: paymentId,
        mandateId: mandate.id,
        checkoutId: checkout.id,
        merchantId: checkout.merchantId,
        razorpayOrderId: razorpayOrder.id,
        amount: checkout.total,
        amountPaise,
        currency: checkout.currency,
        status: "ORDER_CREATED"
      }
    });

    // 5. Log audit events
    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId: checkout.id,
      eventType: "RAZORPAY_ORDER_CREATED" as any,
      result: "SUCCESS",
      metadata: {
        payment_id: payment.id,
        razorpay_order_id: razorpayOrder.id,
        amount_paise: amountPaise,
        currency: checkout.currency
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId: checkout.id,
      eventType: "PAYMENT_INITIATED" as any,
      result: "SUCCESS",
      metadata: {
        payment_id: payment.id,
        razorpay_order_id: razorpayOrder.id
      }
    });

    return {
      payment_id: payment.id,
      razorpay_order_id: payment.razorpayOrderId,
      razorpay_key_id: razorpayProvider.getPublicKeyId(),
      amount: payment.amount,
      amount_paise: payment.amountPaise,
      currency: payment.currency,
      status: payment.status as any,
      merchant_name: checkout.merchant.name,
      description: `Order at ${checkout.merchant.name} for ${checkout.items.length} item(s)`
    };
  }

  /**
   * 3. Server-side Payment Verification & Atomic Merchant Order Creation
   */
  public async verifyPayment(
    input: VerifyPaymentRequest,
    context: PaymentContext
  ): Promise<VerifyPaymentResponse> {
    const { payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      eventType: "PAYMENT_VERIFICATION_STARTED" as any,
      result: "SUCCESS",
      metadata: {
        payment_id,
        razorpay_order_id,
        razorpay_payment_id
      }
    });

    // 1. Fetch Payment Record
    const payment = await prisma.payment.findUnique({
      where: { id: payment_id },
      include: {
        mandate: true,
        checkout: {
          include: {
            merchant: true,
            items: { include: { product: true } }
          }
        },
        order: {
          include: { orderItems: { include: { product: true } } }
        }
      }
    });

    if (!payment) {
      const err: any = new Error(`Payment record '${payment_id}' not found.`);
      err.code = "PAYMENT_NOT_FOUND";
      err.statusCode = 404;
      throw err;
    }

    // Idempotency: If already paid, return existing order
    if (payment.status === "PAID" && payment.order) {
      return {
        payment_id: payment.id,
        razorpay_order_id: payment.razorpayOrderId,
        razorpay_payment_id: payment.razorpayPaymentId || razorpay_payment_id,
        status: "PAID",
        order: this.formatOrder(payment.order, payment.checkout.merchant.name),
        message: "Payment was previously verified and merchant order created."
      };
    }

    // 2. Validate expected Razorpay Order ID
    if (payment.razorpayOrderId !== razorpay_order_id) {
      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId: payment.checkoutId,
        eventType: "PAYMENT_FAILED" as any,
        result: "FAILURE",
        metadata: {
          reason: "ORDER_ID_MISMATCH",
          expected: payment.razorpayOrderId,
          received: razorpay_order_id
        }
      });
      const err: any = new Error("Payment order ID does not match internal record.");
      err.code = "ORDER_ID_MISMATCH";
      err.statusCode = 400;
      throw err;
    }

    // 3. Cryptographically Verify Razorpay Signature
    const isValidSignature = razorpayProvider.verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValidSignature) {
      await prisma.payment.update({
        where: { id: payment_id },
        data: {
          status: "FAILED",
          failureReason: "INVALID_SIGNATURE"
        }
      });

      await auditService.logEvent({
        requestId: context.requestId,
        userId: context.userId,
        checkoutId: payment.checkoutId,
        eventType: "PAYMENT_FAILED" as any,
        result: "FAILURE",
        metadata: {
          payment_id,
          reason: "INVALID_SIGNATURE"
        }
      });

      const err: any = new Error("Payment verification failed: Invalid cryptographic signature.");
      err.code = "INVALID_PAYMENT_SIGNATURE";
      err.statusCode = 400;
      throw err;
    }

    // 4. Atomic PostgreSQL Transaction: Decrement inventory, consume nonce, mark checkout complete, create order
    const orderId = `ord_${crypto.randomUUID()}`;
    const checkout = payment.checkout;

    const result = await prisma.$transaction(async (tx) => {
      // A. Decrement inventory safely with atomic concurrency check
      for (const item of checkout.items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId }
        });

        if (!inventory || inventory.availableQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product '${item.product.name}' (available: ${inventory?.availableQuantity ?? 0}, required: ${item.quantity})`
          );
        }

        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            availableQuantity: {
              decrement: item.quantity
            }
          }
        });
      }

      // B. Mark Nonce as Consumed to prevent any reuse
      await tx.usedNonce.upsert({
        where: { nonce: payment.mandate.nonce },
        create: {
          nonce: payment.mandate.nonce,
          purpose: "mandate_payment_executed",
          expiresAt: payment.mandate.expiresAt
        },
        update: {}
      });

      // C. Update Mandate Status to CONSUMED
      await tx.authorizationMandate.update({
        where: { id: payment.mandateId },
        data: { status: "CONSUMED" }
      });

      // D. Update Checkout Session Status to COMPLETED
      await tx.checkoutSession.update({
        where: { id: checkout.id },
        data: { status: "COMPLETED" }
      });

      // E. Create Merchant Order & Order Items
      const createdOrder = await tx.merchantOrder.create({
        data: {
          id: orderId,
          merchantId: checkout.merchantId,
          checkoutId: checkout.id,
          paymentId: payment.id,
          status: "PLACED",
          subtotal: checkout.subtotal,
          tax: checkout.tax,
          shipping: checkout.shipping,
          discount: checkout.discount,
          total: checkout.total,
          currency: checkout.currency,
          itemsSnapshot: checkout.itemsSnapshot as any,
          fulfillment: checkout.fulfillment as any,
          orderItems: {
            create: checkout.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice
            }))
          }
        },
        include: {
          orderItems: { include: { product: true } }
        }
      });

      // F. Update Payment status to PAID
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        }
      });

      return { order: createdOrder, payment: updatedPayment };
    });

    // 5. Log audit events
    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId: checkout.id,
      eventType: "PAYMENT_VERIFIED" as any,
      result: "SUCCESS",
      metadata: {
        payment_id: payment.id,
        razorpay_payment_id,
        amount: payment.amount
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId: checkout.id,
      eventType: "INVENTORY_DECREMENTED" as any,
      result: "SUCCESS",
      metadata: {
        order_id: result.order.id,
        item_count: checkout.items.length
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      userId: context.userId,
      agentSessionId: context.sessionId,
      checkoutId: checkout.id,
      eventType: "ORDER_CREATED" as any,
      result: "SUCCESS",
      metadata: {
        order_id: result.order.id,
        total: result.order.total,
        status: result.order.status
      }
    });

    return {
      payment_id: result.payment.id,
      razorpay_order_id: result.payment.razorpayOrderId,
      razorpay_payment_id: result.payment.razorpayPaymentId!,
      status: "PAID",
      order: this.formatOrder(result.order, checkout.merchant.name),
      message: "Payment successfully verified and merchant order placed."
    };
  }

  /**
   * 4. Idempotent Razorpay Webhook Processing
   */
  public async handleWebhook(
    rawBody: string,
    signature: string,
    context: PaymentContext
  ): Promise<{ status: string; message: string }> {
    // 1. Verify webhook signature
    const isValid = razorpayProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      await auditService.logEvent({
        requestId: context.requestId,
        eventType: "WEBHOOK_RECEIVED" as any,
        result: "FAILURE",
        metadata: { reason: "INVALID_SIGNATURE" }
      });
      const err: any = new Error("Invalid Razorpay webhook signature.");
      err.code = "INVALID_WEBHOOK_SIGNATURE";
      err.statusCode = 400;
      throw err;
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      const err: any = new Error("Malformed webhook JSON payload.");
      err.code = "MALFORMED_WEBHOOK_PAYLOAD";
      err.statusCode = 400;
      throw err;
    }

    const eventId =
      payload.event_id ||
      payload.id ||
      `evt_${crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 16)}`;
    const eventType = payload.event || "unknown";

    // 2. Check for duplicate webhook event (Idempotency)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { eventId }
    });

    if (existingEvent) {
      await auditService.logEvent({
        requestId: context.requestId,
        eventType: "WEBHOOK_REPLAY_BLOCKED" as any,
        result: "SUCCESS",
        metadata: { event_id: eventId, event_type: eventType }
      });
      return {
        status: "DUPLICATE_IGNORED",
        message: "Webhook event already processed."
      };
    }

    // 3. Record WebhookEvent
    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType,
        payload,
        status: "PROCESSED"
      }
    });

    await auditService.logEvent({
      requestId: context.requestId,
      eventType: "WEBHOOK_VERIFIED" as any,
      result: "SUCCESS",
      metadata: { event_id: eventId, event_type: eventType }
    });

    // 4. Handle specific payment events
    const paymentEntity = payload.payload?.payment?.entity;
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const paymentRecord = await prisma.payment.findUnique({
          where: { razorpayOrderId }
        });

        if (paymentRecord && paymentRecord.status !== "PAID") {
          // Trigger server verification & order placement if not already completed
          const dummySig = razorpayProvider.generatePaymentSignature(
            razorpayOrderId,
            razorpayPaymentId || "pay_webhook"
          );
          await this.verifyPayment(
            {
              payment_id: paymentRecord.id,
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: razorpayPaymentId || "pay_webhook",
              razorpay_signature: dummySig
            },
            context
          ).catch((e) => {
            // Avoid failing webhook if order creation encounters handled error
            console.error("Webhook payment processing notice:", e.message);
          });
        }
      }
    } else if (eventType === "payment.failed") {
      const razorpayOrderId = paymentEntity?.order_id;
      if (razorpayOrderId) {
        await prisma.payment.updateMany({
          where: { razorpayOrderId },
          data: { status: "FAILED", failureReason: paymentEntity?.error_description || "Payment failed at gateway" }
        });
        await auditService.logEvent({
          requestId: context.requestId,
          eventType: "PAYMENT_FAILED" as any,
          result: "FAILURE",
          metadata: {
            razorpay_order_id: razorpayOrderId,
            error: paymentEntity?.error_description
          }
        });
      }
    }

    return {
      status: "SUCCESS",
      message: `Webhook event '${eventType}' processed.`
    };
  }

  /**
   * 5. Formats a MerchantOrder into response DTO
   */
  private formatOrder(order: any, merchantName: string): MerchantOrderResponse {
    return {
      order_id: order.id,
      payment_id: order.paymentId,
      checkout_id: order.checkoutId,
      merchant_id: order.merchantId,
      merchant_name: merchantName,
      subtotal: order.subtotal,
      tax: order.tax,
      shipping: order.shipping,
      discount: order.discount,
      total: order.total,
      currency: order.currency,
      status: order.status as any,
      items: (order.orderItems || []).map((i: any) => ({
        id: i.id,
        product_id: i.productId,
        product_name: i.product?.name || "Product",
        quantity: i.quantity,
        unit_price: i.unitPrice,
        total_price: i.totalPrice
      })),
      fulfillment: (order.fulfillment as Record<string, any>) || {},
      created_at: order.createdAt.toISOString()
    };
  }
}

export const paymentService = new PaymentService();
