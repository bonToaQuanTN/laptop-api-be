import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CreatePaymentDto {
  @ApiProperty({ example: "uuid-order-id" })
  @IsString()
  @IsNotEmpty()
  id!: string;
}