import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { FindProductsDto } from './dto/find-products.dto';

@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  getProducts(@Query() dto: FindProductsDto) {
    return this.service.getProductList(dto.q);
  }

  @Get(':id')
  getProductById(@Param('id') id: string) {
    return this.service.getProductById(id);
  }
}
