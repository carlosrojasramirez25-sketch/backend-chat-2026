import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { conversations_members_role } from '@prisma/client';

export class CreateConversationsMemberDto {
  @IsInt()
  conversation_id!: number;

  @IsInt()
  user_id!: number;

  @IsOptional()
  @IsEnum(conversations_members_role)
  role?: conversations_members_role; // por defecto 'member' lo maneja Prisma
}