import { InventoryRepository } from "../repositories/inventory.repository.js";
import { InventoryResponse } from "../schemas/product.schema.js";

export class InventoryService {
  constructor(private inventoryRepo: InventoryRepository = new InventoryRepository()) {}

  public async getInventoryByProductId(productId: string): Promise<InventoryResponse | null> {
    const record = await this.inventoryRepo.findByProductId(productId);
    if (!record) return null;

    return {
      product_id: record.productId,
      sku: record.product.sku,
      available_quantity: record.availableQuantity,
      reserved_quantity: record.reservedQuantity,
      in_stock: record.availableQuantity > 0,
      updated_at: record.updatedAt.toISOString()
    };
  }
}
