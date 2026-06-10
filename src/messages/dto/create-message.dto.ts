import { IsEnum, IsInt, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { messages_type } from '@prisma/client';

export class CreateMessageDto {

  @IsInt()
  conversation_id!: number;

  @IsInt()
  sender_id!: number;

  @IsOptional()
  @IsInt()
  reply_to_id?: number;

  @IsOptional()
  @IsEnum(messages_type)
  type?: messages_type;

  // 700 KB base64 ceiling covers ~30s audio at 128kbps or a 500KB image
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(700_000)
  content?: string;
}