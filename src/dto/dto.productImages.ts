import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateProductImageDto {
  
  @IsString()
  @IsNotEmpty({ message: 'ID sản phẩm không được để trống' })
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Product ID (UUID)' })
  productId!: string;

  @IsString()
  @IsNotEmpty({ message: 'URL hình ảnh không được để trống' })
  @ApiProperty({ example: 'https://example.com/images/product1.jpg' })
  imageUrl!: string;
}

export class UpdateProductImageDto extends PartialType(CreateProductImageDto) {}