import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemInput {
  @IsString()
  product_id!: string;
  @IsInt() @Min(0) qty!: number; // 0 = elimina
}

export class UpsertCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemInput)
  items!: CartItemInput[];
}
