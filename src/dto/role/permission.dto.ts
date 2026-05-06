import { ApiProperty,PartialType} from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional} from "class-validator";

export class PermissionDto {
    @ApiProperty({ example: "Tên quyền" })
    @IsString()
    @IsNotEmpty()
    name!: string;
    
    @ApiProperty({ example: "Mã vai trò" })
    @IsString()
    @IsNotEmpty()
    roleId!: string;
}