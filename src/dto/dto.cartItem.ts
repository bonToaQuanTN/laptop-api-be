import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from "class-validator";

export class CreateCartItemDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Cart ID không được để trống' })
  @ApiProperty({ example: 'uuid-cart-id' })
  cartId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Product ID không được để trống' })
  @ApiProperty({ example: 'uuid-product-id' })
  productId!: string;

  @IsNumber()
  @IsPositive({ message: 'Số lượng phải lớn hơn 0' })
  @ApiProperty({ example: 2 })
  quantity!: number;

}

export class UpdateCartItemDto { 
    @IsNumber()
    @IsPositive()
    @ApiPropertyOptional({ example: 5 })
    quantity?: number; 
  }