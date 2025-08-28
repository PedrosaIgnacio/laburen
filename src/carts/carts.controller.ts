import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { CartsService } from './carts.service';
import { UpsertCartDto } from './dto/cart-items.dto';
import { Response } from 'express';
import { HttpStatusCode } from 'axios';

@Controller('carts')
export class CartsController {
  constructor(private svc: CartsService) {}

  @Post()
  async create(@Body() dto: UpsertCartDto, @Res() res: Response) {
    const result = await this.svc.createCart(dto);
    return res.status(HttpStatusCode.Created).json(result);
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
