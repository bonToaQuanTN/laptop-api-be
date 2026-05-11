import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsInt, Min } from "class-validator";

export class CreateInventoryDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Product ID cannot be left blank' })
  @ApiProperty({ example: 'uuid-product-id', description: 'Product ID' })
  productId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse ID cannot be left blank' })
  @ApiProperty({ example: 'uuid-warehouse-id', description: 'Warehouse ID' })
  warehouseId!: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity cannot be negative' })
  @ApiProperty({ example: 100, description: 'Stock quantity' })
  quantity!: number;
}

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {}