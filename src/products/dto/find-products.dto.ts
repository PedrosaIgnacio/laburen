import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FindProductsDto {
  @ApiPropertyOptional({ description: 'Filtro por nombre/descr.' })
  @IsOptional()
  @IsString()
  q?: string;
}
