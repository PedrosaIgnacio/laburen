import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemInput {
  @ApiProperty() @IsInt() product_id!: string;
  @ApiProperty() @IsInt() @Min(0) qty!: number; // 0 = elimina
}

export class UpsertCartDto {
  @ApiProperty({ type: [CartItemInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemInput)
  items!: CartItemInput[];
}
