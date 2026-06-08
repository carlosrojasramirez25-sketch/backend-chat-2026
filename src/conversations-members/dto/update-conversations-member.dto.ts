import { PartialType } from '@nestjs/mapped-types';
import { CreateConversationsMemberDto } from './create-conversations-member.dto';

export class UpdateConversationsMemberDto extends PartialType(CreateConversationsMemberDto) {}
