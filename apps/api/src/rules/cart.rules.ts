import { Rule } from "./core/types.js";

export interface CartContext {
  cartValue: number;
  itemCount: number;
  categories?: string[];
}

export const cartRules: Rule<CartContext>[] = [
  {
    id: "CART_001_LOW_VALUE_ADDONS",
    name: "Low Value Cart Add-on Suggestions",
    description: "IF cart_value < 1000 -> suggest add-ons",
    category: "cart",
    priority: 80,
    enabled: true,
    condition: (ctx) => {
      return ctx.cartValue > 0 && ctx.cartValue < 1000;
    },
    action: (ctx) => {
      const amountNeeded = 1000 - ctx.cartValue;
      return {
        strategy: "SUGGEST_ADDONS",
        suggestAddons: true,
        threshold: 1000,
        amountNeeded,
        message: `Add items worth ₹${amountNeeded} more to unlock free shipping and accessory bundles!`,
        recommendedAddonCategories: ["mice", "speakers", "earbuds"]
      };
    }
  },
  {
    id: "CART_002_PREMIUM_DISCOUNT",
    name: "High Value Premium Tier Discount",
    description: "IF cart_value > 3000 -> apply premium discount",
    category: "cart",
    priority: 85,
    enabled: true,
    condition: (ctx) => {
      return ctx.cartValue > 3000;
    },
    action: (ctx) => {
      const discountPercentage = 10;
      const discountAmount = Math.round((ctx.cartValue * discountPercentage) / 100);
      return {
        strategy: "APPLY_PREMIUM_DISCOUNT",
        discountPercentage,
        discountAmount,
        finalCartValue: ctx.cartValue - discountAmount,
        badge: "PREMIUM_TIER_APPLIED",
        message: `🎉 Premium Tier Unlocked! Flat ${discountPercentage}% discount (₹${discountAmount}) applied to your order.`
      };
    }
  }
];
