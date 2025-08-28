import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async getProductList(q?: string) {
    if (!q) {
      return this.prisma.product.findMany({ orderBy: { id: 'asc' } });
    }
    const embedding = JSON.parse(decodeURIComponent(q)) as number[];
    const vectorString = `[${embedding.join(',')}]`;

    return await this.prisma.$queryRawUnsafe(
      `
      SELECT 
        id,
        name,
        description,
        price_50,
        price_100,
        price_200,
        stock,
        available,
        embedding::text as embedding,
        embedding <-> '${vectorString}'::vector AS distance
      FROM "Product"
      ORDER BY embedding <-> '${vectorString}'::vector
      LIMIT 10
      `,
    );
  }

  async getProductById(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }
}
