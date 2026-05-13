import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsString, IsNotEmpty, MinLength, IsOptional, IsNumberString} from "class-validator";
import { Transform } from "class-transformer";


export class CreateUserDto {
    @IsString()
    @IsNotEmpty({ message: 'Last name cannot be empty' })
    @ApiProperty({ example: 'Nguyen' })
    lastName!: string;

    @IsString()
    @IsNotEmpty({ message: 'First name cannot be empty' })
    @ApiProperty({ example: 'Van A' })
    firstName!: string;

    @IsEmail({}, { message: 'Email must be valid' })
    @Transform(({ value }) => value.toLowerCase().trim())
    @ApiProperty({ example: 'test@gmail.com' })
    email!: string;

    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @ApiProperty({ example: 'password123', description: 'Minimum 6 characters' })
    password!: string;

    @IsNumberString({}, { message: 'Phone must contain only numbers' })
    @IsNotEmpty({ message: 'Phone cannot be empty' })
    @ApiProperty({ example: '0987654321' })
    phone!: string;

    @IsString()
    @IsNotEmpty({ message: 'Designation cannot be empty' })
    @ApiProperty({ example: 'Software Engineer' })
    designation!: string;

    @IsString()
    @IsOptional() 
    roleId?: string;

}
export class UpdateUserDto {
    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ example: 'Nguyen' })
    lastName?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ example: 'Van A' })
    firstName?: string;

    @IsEmail({}, { message: 'Email must be valid' })
    @IsOptional()
    @Transform(({ value }) => value.toLowerCase().trim())
    @ApiPropertyOptional({ example: 'test@gmail.com' })
    email?: string;

    @IsString()
    @IsOptional()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @ApiPropertyOptional({ example: 'newpassword123' })
    password?: string;

    @IsNumberString({}, { message: 'Phone must contain only numbers' })
    @IsOptional()
    @ApiPropertyOptional({ example: '0987654321' })
    phone?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ example: 'Guest' })
    designation?: string;

    @IsString()
    @IsOptional()
    @ApiPropertyOptional({ example: 'clx8a2b3c4d5e6f7g8h9', description: 'Role ID (String)' })
    roleId?: string;
}
