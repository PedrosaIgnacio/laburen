import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { UpsertCartDto } from './dto/cart-items.dto';

@Controller('carts')
export class CartsController {
  constructor(private svc: CartsService) {}

  @Post()
  create(@Body() dto: UpsertCartDto) {
    return this.svc.createCart(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpsertCartDto) {
    return this.svc.updateCart(id, dto);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.svc.getCartById(id);
  }
}
