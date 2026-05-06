import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreateWarehouseDto {
  
  @IsString()
  @IsNotEmpty({ message: 'Tên kho không được để trống' })
  @ApiProperty({ example: 'Kho Tổng TP.HCM' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ kho không được để trống' })
  @ApiProperty({ example: 'Số 1, Đường Nguyễn Văn Linh, Bình Chánh, TP.HCM' })
  address!: string;
}

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {}