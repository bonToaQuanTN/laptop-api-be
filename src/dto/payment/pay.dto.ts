import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'order-id', description: 'Order ID' })
  id!: string;
}