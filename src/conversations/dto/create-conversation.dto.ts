import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { conversations_type } from '@prisma/client';

export class CreateConversationDto {
  @IsInt()
  created_by!: number;

  @IsOptional()
  @IsEnum(conversations_type)
  type?: conversations_type; // por defecto 'direct' lo maneja Prisma

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string; // solo se usa cuando type es 'group'

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar_url?: string; // solo se usa cuando type es 'group'

  @IsOptional()
  @IsInt()
  participant_id?: number; // para conversaciones directas
}