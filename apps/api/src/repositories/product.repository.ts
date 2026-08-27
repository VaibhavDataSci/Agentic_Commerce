import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";

export interface ProductFilters {
  query?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  rating?: number;
  sort?: "price_asc" | "price_desc" | "rating_desc" | "newest";
  page?: number;
  limit?: number;
}

export class ProductRepository {
  public async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        inventory: true,
        merchant: true
      }
    });
  }

  public async findBySku(sku: string) {
    return prisma.product.findUnique({
      where: { sku },
      include: {
        inventory: true,
        merchant: true
      }
    });
  }

  public async searchAndFilter(filters: ProductFilters) {
    const {
      query,
      category,
      min_price,
      max_price,
      in_stock,
      rating,
      sort = "rating_desc",
      page = 1,
      limit = 20
    } = filters;

    const where: Prisma.ProductWhereInput = {
      status: "ACTIVE"
    };

    if (category) {
      where.category = {
        equals: category.toLowerCase(),
        mode: "insensitive"
      };
    }

    if (min_price !== undefined || max_price !== undefined) {
      where.price = {};
      if (min_price !== undefined) {
        where.price.gte = min_price;
      }
      if (max_price !== undefined) {
        where.price.lte = max_price;
      }
    }

    if (rating !== undefined) {
      where.rating = {
        gte: rating
      };
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } }
      ];
    }

    if (in_stock !== undefined) {
      if (in_stock) {
        where.inventory = {
          availableQuantity: {
            gt: 0
          }
        };
      } else {
        where.inventory = {
          availableQuantity: {
            equals: 0
          }
        };
      }
    }

    // Determine sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { rating: "desc" };
    if (sort === "price_asc") {
      orderBy = { price: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { price: "desc" };
    } else if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "rating_desc") {
      orderBy = { rating: "desc" };
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          inventory: true
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      total,
      page,
      limit
    };
  }

  public async getCategories(): Promise<string[]> {
    const categories = await prisma.product.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { status: "ACTIVE" }
    });
    return categories.map((c) => c.category);
  }

  public async getTotalCounts() {
    const [totalProducts, inStockProducts] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.product.count({
        where: {
          status: "ACTIVE",
          inventory: {
            availableQuantity: { gt: 0 }
          }
        }
      })
    ]);

    return { totalProducts, inStockProducts };
  }
}
