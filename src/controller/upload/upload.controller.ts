import { 
  Controller, Post, UseInterceptors, UploadedFile, UseGuards, 
  Logger, OnModuleInit 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from '../../service/uploadCloudinary/upload.serice';
import { ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../guard/auth.guard';
import { PermissionGuard } from '../../guard/permission.guard';
import { Permissions } from '../../guard/decorator/roles.decorator';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

@ApiTags('upload') // Chữ thường
@UseGuards(AuthGuard, PermissionGuard)
@ApiBearerAuth()
@Controller('upload') // Chữ thường
export class UploadController implements OnModuleInit {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}
  onModuleInit() {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${uploadDir}`);
    }
  }

  @Post()
  @Permissions('POST.UPLOAD')
  @ApiOperation({ summary: 'Upload File / Video (Max 5GB, >100MB will be auto-split)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' }
      }
    }
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueName + extname(file.originalname));
        }
      }),
      limits: {
        fileSize: 5 * 1024 * 1024 * 1024,
        files: 1 
      }
    })
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      this.logger.warn('Upload attempted without a file');
      return { message: 'File is required' };
    }

    this.logger.log(`Receiving file: ${file.originalname}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    const urls = await this.uploadService.uploadFile(file);

    return {
      message: 'Upload success',
      urls
    };
  }
}