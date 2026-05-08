import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class CategoryDto {
  
  @ApiProperty({ 
    example: "Loại sản phẩm", 
    description: 'Tên của danh mục sản phẩm' 
  })
  @IsString({ message: 'Tên danh mục phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  name!: string;
}