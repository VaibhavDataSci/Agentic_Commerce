import { prisma } from "../config/prisma.js";

export class InventoryRepository {
  public async findByProductId(productId: string) {
    return prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: true
      }
    });
  }

  public async updateStock(productId: string, availableQuantity: number) {
    return prisma.inventory.update({
      where: { productId },
      data: {
        availableQuantity,
        updatedAt: new Date()
      },
      include: {
        product: true
      }
    });
  }
}
