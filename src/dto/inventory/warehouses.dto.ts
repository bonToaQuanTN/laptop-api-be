import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateWarehouseDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Warehouse name cannot be left blank' })
  @ApiProperty({ example: 'Kho Tổng TP.HCM' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Address cannot be left blank' })
  @ApiProperty({ example: '1 Nguyen Van Linh Street, Binh Chan District, Ho Chi Minh City' })
  address!: string;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}