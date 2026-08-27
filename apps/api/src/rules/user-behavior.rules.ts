import { Rule } from "./core/types.js";

export interface UserBehaviorContext {
  inactivitySeconds: number;
  isReturningUser: boolean;
  viewedCategories?: string[];
  previousPurchasesCount?: number;
}

export const userBehaviorRules: Rule<UserBehaviorContext>[] = [
  {
    id: "BEHAVIOR_001_INACTIVITY_POPUP",
    name: "User Inactivity Engagement Popup",
    description: "IF user inactive for 10 seconds -> trigger discount popup",
    category: "user_behavior",
    priority: 50,
    enabled: true,
    condition: (ctx) => {
      return ctx.inactivitySeconds >= 10;
    },
    action: (ctx) => {
      return {
        triggerPopup: true,
        popupType: "INACTIVITY_DISCOUNT",
        discountCode: "TECHKART5",
        discountPercent: 5,
        title: "Still Deciding?",
        message: "Enjoy an instant 5% coupon code TECHKART5 on your electronics purchase today!",
        timeoutSeconds: ctx.inactivitySeconds
      };
    }
  },
  {
    id: "BEHAVIOR_002_RETURNING_USER_PERSONALIZATION",
    name: "Returning User Personalization Boost",
    description: "IF returning user -> prioritize personalized recommendations",
    category: "user_behavior",
    priority: 60,
    enabled: true,
    condition: (ctx) => {
      return ctx.isReturningUser === true;
    },
    action: (ctx) => {
      return {
        prioritizePersonalized: true,
        boostCategories: ctx.viewedCategories && ctx.viewedCategories.length > 0 ? ctx.viewedCategories : ["laptops", "headphones"],
        welcomeBackMessage: "Welcome back to TechKart! We have personalized today's top picks for you.",
        loyaltyBonus: true
      };
    }
  }
];
