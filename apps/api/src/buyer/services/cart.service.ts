import { prisma } from "../../config/prisma.js";
import { CartResponse, CreateCartInput } from "../schemas/cart.schema.js";

export class CartService {
  /**
   * Formats a Prisma Cart entity with its items into CartResponse DTO
   */
  private formatCart(cart: any): CartResponse {
    const items = (cart.items || []).map((item: any) => ({
      id: item.id,
      product_id: item.productId,
      product_name: item.product?.name || "Product",
      sku: item.product?.sku || "",
      unit_price: item.unitPrice,
      quantity: item.quantity,
      total_price: item.totalPrice,
      image_url: item.product?.imageUrl
    }));

    const subtotal = items.reduce((sum: number, item: any) => sum + item.total_price, 0);
    const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return {
      cart_id: cart.id,
      merchant_id: cart.merchantId,
      status: cart.status,
      subtotal,
      currency: cart.currency || "INR",
      item_count: itemCount,
      items,
      created_at: cart.createdAt.toISOString(),
      updated_at: cart.updatedAt.toISOString()
    };
  }

  /**
   * Adds an item to a new or existing merchant cart with authoritative stock & price validation
   */
  public async createOrUpdateCart(input: CreateCartInput): Promise<CartResponse> {
    const { product_id, quantity, cart_id } = input;

    // 1. Fetch Product and Inventory from database (Authoritative Source of Truth)
    const product = await prisma.product.findUnique({
      where: { id: product_id },
      include: {
        inventory: true,
        merchant: true
      }
    });

    if (!product) {
      const error: any = new Error(`Product with ID '${product_id}' does not exist.`);
      error.code = "PRODUCT_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const availableStock = product.inventory?.availableQuantity ?? 0;
    if (availableStock < quantity) {
      const error: any = new Error(
        `Product '${product.name}' is out of stock or insufficient quantity (requested: ${quantity}, available: ${availableStock}).`
      );
      error.code = "PRODUCT_OUT_OF_STOCK";
      error.statusCode = 400;
      throw error;
    }

    // 2. Fetch or Create Cart
    let cart: any = null;
    if (cart_id) {
      cart = await prisma.cart.findUnique({
        where: { id: cart_id },
        include: { items: { include: { product: true } } }
      });
    }

    if (!cart) {
      // Find active merchant or default to product's merchant
      const merchantId = product.merchantId;
      cart = await prisma.cart.create({
        data: {
          merchantId,
          status: "ACTIVE",
          currency: product.currency,
          subtotal: 0
        },
        include: { items: { include: { product: true } } }
      });
    }

    // 3. Upsert Cart Item using server-side product price
    const unitPrice = product.price;
    const existingItem = cart.items?.find((i: any) => i.productId === product_id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (availableStock < newQuantity) {
        const error: any = new Error(
          `Cannot add ${quantity} more. Maximum available stock is ${availableStock}.`
        );
        error.code = "INSUFFICIENT_STOCK";
        error.statusCode = 400;
        throw error;
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          totalPrice: newQuantity * unitPrice
        }
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice
        }
      });
    }

    // 4. Refetch complete cart and update subtotal
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    const newSubtotal = updatedCart!.items.reduce((sum, item) => sum + item.totalPrice, 0);
    await prisma.cart.update({
      where: { id: cart.id },
      data: { subtotal: newSubtotal }
    });

    return this.formatCart(updatedCart);
  }

  /**
   * Retrieves an existing cart by ID
   */
  public async getCartById(cartId: string): Promise<CartResponse | null> {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart) return null;
    return this.formatCart(cart);
  }
}
