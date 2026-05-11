import { Injectable, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor() {
    // Cấu hình Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_SECRET,
    });

    // Đặt đường dẫn FFmpeg trong constructor (chuẩn NestJS)
    if (ffmpegPath) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    } else {
      this.logger.error('ffmpeg-static path is not defined. Video splitting will fail.');
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string[]> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    this.logger.log(`Uploading file: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Mảng chứa đường dẫn file tạm CẦN XÓA sau khi xử lý xong
    const filesToCleanUp: string[] = [file.path];

    try {
      // Trường hợp 1: File nhỏ hơn 100MB, upload bình thường
      if (file.size <= MAX_SIZE) {
        const url = await this.uploadToCloudinary(file.path);
        return [url];
      }

      // Trường hợp 2: File lớn hơn 100MB, cắt video rồi upload từng phần
      this.logger.warn(`File > 100MB. Splitting video...`);
      const parts = await this.splitVideo(file.path);
      
      // Thêm các file đã cắt vào danh sách cần xóa
      filesToCleanUp.push(...parts);

      const urls: string[] = [];
      for (const part of parts) {
        const url = await this.uploadToCloudinary(part);
        urls.push(url);
      }

      return urls;

    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to process file ${file.originalname}`, err.stack);
      throw new InternalServerErrorException('An error occurred during file upload.');
    } finally {
      for (const filePath of filesToCleanUp) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          this.logger.warn(`Could not delete temporary file: ${filePath}`);
        }
      }
    }
  }

  private async uploadToCloudinary(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        { resource_type: 'auto', folder: 'nestjs_upload' },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed for ${path.basename(filePath)}`, error);
            return reject(error || new Error('Cloudinary upload returned empty result'));
          }
          resolve(result.secure_url);
        }
      );
    });
  }

  private async splitVideo(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      const outputPattern = `${outputDir}/${fileName}_part_%03d.mp4`;
      const parts: string[] = [];

      ffmpeg(filePath)
        .outputOptions([
          '-c copy',           // Copy codec không giảm chất lượng (nhanh)
          '-map 0',            // Map toàn bộ stream
          '-segment_time 60',  // Cắt mỗi đoạn 60 giây
          '-f segment',        // Định dạng output là segment
          '-reset_timestamps 1'// Reset thời gian cho từng đoạn
        ])
        .output(outputPattern)
        .on('end', () => {
          // Lọc đúng các file vừa được tạo ra
          const files = fs.readdirSync(outputDir)
            .filter((f) => f.startsWith(`${fileName}_part_`));
          
          files.forEach((f) => parts.push(path.join(outputDir, f)));
          this.logger.log(`Video split into ${parts.length} parts.`);
          resolve(parts);
        })
        .on('error', (err) => {
          this.logger.error(`FFmpeg failed to split video: ${filePath}`, err);
          reject(err);
        })
        .run();
    });
  }
}