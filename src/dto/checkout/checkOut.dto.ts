import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

export class CheckoutDto {
  @ApiPropertyOptional({ example: 'uuid-discount-id' })
  @IsString()
  @IsOptional()
  discountId?: string;

  @ApiPropertyOptional({ example: 'Số 1, Đường ABC, Quận 1' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;
}