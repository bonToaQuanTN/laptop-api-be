import { IsEmail, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {      
    @IsNotEmpty({ message: 'Email cannot be empty' })
    @IsEmail({}, { message: 'Email must be valid' })
    @ApiProperty({ example: 'test@gmail.com', description: 'Registered email' })
    email!: string;

    @IsNotEmpty({ message: 'Password cannot be empty' })
    @IsString({ message: 'Password must be a string' })
    @ApiProperty({ example: 'password123', description: 'User password' })
    password!: string;
}