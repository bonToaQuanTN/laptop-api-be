import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from "class-validator";

export class CreateProductDto {

  @ApiProperty({ example: 'Acer nitro 5 an515-57' })
  @IsString()
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  name!: string;

  @ApiProperty({ example: "cái" })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiProperty({ example: "USD" })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Giá sản phẩm phải lớn hơn 0' })
  price!: number;

  @ApiProperty({ example: "Việt Nam" })
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @ApiPropertyOptional({ example: "text", required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: "https://example.com/image.jpg", required: false })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Category ID (String)' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;
}


export class UpdateProductDto extends PartialType(CreateProductDto) {}