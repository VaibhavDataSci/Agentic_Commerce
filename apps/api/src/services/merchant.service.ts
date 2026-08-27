import { MerchantRepository } from "../repositories/merchant.repository.js";
import { ProductRepository } from "../repositories/product.repository.js";
import { MerchantResponse } from "../schemas/product.schema.js";

export class MerchantService {
  constructor(
    private merchantRepo: MerchantRepository = new MerchantRepository(),
    private productRepo: ProductRepository = new ProductRepository()
  ) {}

  public async getMerchantProfile(): Promise<MerchantResponse> {
    const merchant = await this.merchantRepo.getFirstMerchant();
    if (!merchant) {
      throw new Error("Merchant not found in database");
    }

    const { totalProducts, inStockProducts } = await this.productRepo.getTotalCounts();
    const categories = await this.productRepo.getCategories();

    return {
      id: merchant.id,
      name: merchant.name,
      description: merchant.description,
      currency: merchant.currency,
      status: merchant.status,
      metrics: {
        total_products: totalProducts,
        in_stock_products: inStockProducts,
        categories,
        active_categories_count: categories.length
      },
      ai_readiness: {
        structured_catalog: true,
        machine_readable_pricing: true,
        real_time_inventory: true,
        product_attributes: true,
        api_version: "v1"
      }
    };
  }
}
