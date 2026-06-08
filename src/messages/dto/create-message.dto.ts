import { IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
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
  type?: messages_type;  // por defecto 'text' lo maneja Prisma

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;
}