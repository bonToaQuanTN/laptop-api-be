import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateCartDto {
  @IsString()
  @IsNotEmpty({ message: 'UserID không được để trống' })
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID (UUID)' })
  userId!: string;
}

export class UpdateCartDto extends PartialType(CreateCartDto) {}