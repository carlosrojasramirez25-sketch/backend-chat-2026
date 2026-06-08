import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface MullerFile {
  originalname: string;
  mimetype: string;
  filename: string;
  size: number;
}

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  recordUpload(file: MullerFile, uploadedBy: number) {
    const url = `/uploads/${file.filename}`;
    return {
      url,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }

  async createRecord(
    messageId: number,
    uploadedBy: number,
    fileUrl: string,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ) {
    return this.prisma.attachments.create({
      data: {
        message_id: messageId,
        uploaded_by: uploadedBy,
        file_url: fileUrl,
        file_name: fileName,
        mime_type: mimeType,
        file_size: fileSize,
      },
    });
  }
}
