import { prisma } from "../config/prisma.js";

export class MerchantRepository {
  public async getFirstMerchant() {
    return prisma.merchant.findFirst({
      where: { status: "ACTIVE" }
    });
  }

  public async getMerchantById(id: string) {
    return prisma.merchant.findUnique({
      where: { id }
    });
  }
}
