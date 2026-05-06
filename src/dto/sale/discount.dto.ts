import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class DiscountDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Tên discount không được để trống' })
  @ApiProperty({ example: 'Summer Sale 2024' })
  name!: string; 

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Discount rate phải là số' })
  @IsOptional()
  @ApiPropertyOptional({ example: 10 })
  discountRate?: number;
}

