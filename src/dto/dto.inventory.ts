import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsInt, Min } from "class-validator";

export class CreateInventoryDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Product ID không được để trống' })
  @ApiProperty({ example: 'uuid-product-id', description: 'ID Sản phẩm' })
  productId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Warehouse ID không được để trống' })
  @ApiProperty({ example: 'uuid-warehouse-id', description: 'ID Kho hàng' })
  warehouseId!: string;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(0, { message: 'Số lượng không được âm' })
  @ApiProperty({ example: 100, description: 'Số lượng tồn kho' })
  quantity!: number;
}

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {}