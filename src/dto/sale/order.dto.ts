import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty } from "class-validator";

export class CreateOrderDto {

  @ApiPropertyOptional({ example: 'uuid-discount-id' })
  @IsString()
  @IsOptional()
  discountId?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Q.7, TP.HCM' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'pending' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}