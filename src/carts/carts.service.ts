import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { UpsertCartDto } from './dto/cart-items.dto';
import { Prisma, PrismaClient, Product } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

@Injectable()
export class CartsService {
  constructor(private prisma: PrismaService) {}

  async createCart(dto: UpsertCartDto) {
    if (!dto.items?.length) throw new BadRequestException('items required');

    return this.prisma.$transaction(async (tx) => {
      for (const it of dto.items) {
        const p = await tx.product.findUnique({ where: { id: it.product_id } });
        if (!p)
          throw new NotFoundException(`product ${it.product_id} not found`);
        if (it.qty > p.stock)
          throw new BadRequestException(`insufficient stock for ${p.name}`);
      }

      const cart = await tx.cart.create({ data: {} });

      for (const it of dto.items.filter((i) => i.qty > 0)) {
        await tx.cartItem.create({
          data: { cartId: cart.id, productId: it.product_id, qty: it.qty },
        });
      }

      return this.getCartById(cart.id, tx);
    });
  }

  async updateCart(cartId: number, dto: UpsertCartDto) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { id: cartId } });
      if (!cart) throw new NotFoundException('cart not found');

      for (const it of dto.items) {
        const p = await tx.product.findUnique({ where: { id: it.product_id } });
        if (!p)
          throw new NotFoundException(`product ${it.product_id} not found`);
        if (it.qty > p.stock)
          throw new BadRequestException(`insufficient stock for ${p.name}`);

        const existing = await tx.cartItem
          .findUnique({
            where: { cartId_productId: { cartId, productId: it.product_id } },
          })
          .catch(() => null);

        if (it.qty === 0) {
          if (existing)
            await tx.cartItem.delete({ where: { id: existing.id } });
        } else if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { qty: it.qty },
          });
        } else {
          await tx.cartItem.create({
            data: { cartId, productId: it.product_id, qty: it.qty },
          });
        }
      }

      return this.getCartById(cartId, tx);
    });
  }

  async getCartById(
    cartId: number,
    tx: Omit<
      PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
    > = this.prisma,
  ) {
    const cart = await tx.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { product: true } } },
    });
    if (!cart) throw new NotFoundException('cart not found');

    const items = cart.items.map((ci) => {
      const item_price = this.getPriceBasedOnQuantity(ci.qty, ci.product);
      return {
        product_id: ci.productId,
        name: ci.product.name,
        qty: ci.qty,
        price: item_price,
        line_total: item_price * ci.qty,
      };
    });
    const total = items.reduce((acc, it) => acc + it.line_total, 0);

    return { id: cart.id, items, total };
  }

  getPriceBasedOnQuantity(qty: number, product: Product) {
    switch (true) {
      case qty <= 50:
        return product.price_50;
      case qty <= 100:
        return product.price_100;
      default:
        return product.price_200;
    }
  }
}
