import { ApiProperty,PartialType} from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsNumber, IsPositive } from "class-validator";

export class CreateOrderItemDto {
  @ApiProperty({ example: "Mã hóa đơn" })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ example: "Mã sản phẩm" })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ example: "Số lượng" })
  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {}