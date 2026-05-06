import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";
export class CreateRoleDto {

    @ApiProperty({example: 'User' })
    @IsString()
    @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
    name!: string;
}