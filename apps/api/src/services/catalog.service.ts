import { ProductRepository, ProductFilters } from "../repositories/product.repository.js";
import { ProductResponse, ProductListResponse } from "../schemas/product.schema.js";
import { queryCache } from "./cache.service.js";

export class CatalogService {
  constructor(private productRepo: ProductRepository = new ProductRepository()) {}

  /**
   * Formats database product and inventory into AI-readable canonical structure
   */
  public formatProductForAI(product: any): ProductResponse {
    const availableQty = product.inventory?.availableQuantity ?? 0;
    const inStock = availableQty > 0;

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      currency: product.currency,
      availability: {
        in_stock: inStock,
        quantity: availableQty
      },
      attributes: typeof product.attributes === "object" && product.attributes !== null
        ? product.attributes
        : {},
      rating: Number(product.rating),
      imageUrl: product.imageUrl,
      delivery_estimate: product.deliveryEstimate
    };
  }

  public async getProductById(id: string): Promise<ProductResponse | null> {
    const product = await this.productRepo.findById(id);
    if (!product) return null;
    return this.formatProductForAI(product);
  }

  public async getProductBySku(sku: string): Promise<ProductResponse | null> {
    const product = await this.productRepo.findBySku(sku);
    if (!product) return null;
    return this.formatProductForAI(product);
  }

  public async searchProducts(filters: ProductFilters): Promise<ProductListResponse> {
    // Check in-memory cache for repeated search queries (Performance Rule)
    const cacheKey = `search:${JSON.stringify(filters)}`;
    const cached = queryCache.get<ProductListResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const { products, total, page, limit } = await this.productRepo.searchAndFilter(filters);

    const formattedProducts = products.map((p) => this.formatProductForAI(p));

    const response: ProductListResponse = {
      products: formattedProducts,
      total,
      page,
      limit,
      filters: {
        query: filters.query || null,
        category: filters.category || null,
        min_price: filters.min_price ?? null,
        max_price: filters.max_price ?? null,
        in_stock: filters.in_stock ?? null,
        rating: filters.rating ?? null,
        sort: filters.sort || "rating_desc"
      }
    };

    // Cache results for 30 seconds
    queryCache.set(cacheKey, response, 30);

    return response;
  }
}
