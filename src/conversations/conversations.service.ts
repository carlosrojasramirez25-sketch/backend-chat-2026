import { Injectable } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ConversationsService {
 
  constructor(private readonly prisma:PrismaService){}

  async create(createConversationDto: CreateConversationDto) {
    const { participant_id, ...data } = createConversationDto;

    // Si es una conversación directa y se pasa participant_id, verificamos si ya existe
    if (participant_id) {
      const existing = await this.prisma.conversations.findFirst({
        where: {
          type: 'direct',
          AND: [
            {
              conversations_members: {
                some: { user_id: data.created_by }
              }
            },
            {
              conversations_members: {
                some: { user_id: participant_id }
              }
            }
          ]
        },
        include: {
          conversations_members: {
            include: {
              users: {
                select: { id: true, name: true, email: true, avatar_url: true }
              }
            }
          }
        }
      });

      if (existing) {
        return existing;
      }

      // Si no existe, creamos la conversación y agregamos a ambos miembros
      return await this.prisma.conversations.create({
        data: {
          type: 'direct',
          created_by: data.created_by,
          conversations_members: {
            create: [
              { user_id: data.created_by, role: 'admin' },
              { user_id: participant_id, role: 'member' }
            ]
          }
        },
        include: {
          conversations_members: {
            include: {
              users: {
                select: { id: true, name: true, email: true, avatar_url: true }
              }
            }
          }
        }
      });
    }

    // Flujo normal (ej. Insomnia o creación sin miembro inicial)
    const convo = await this.prisma.conversations.create({ data });
    
    // Auto-agregar al creador
    await this.prisma.conversations_members.create({
      data: {
        conversation_id: convo.id,
        user_id: data.created_by,
        role: 'admin'
      }
    });

    return convo;
  }

  async findAll(userId?: number) {
    if (userId) {
      return await this.prisma.conversations.findMany({
        where: {
          conversations_members: {
            some: { user_id: userId }
          }
        },
        include: {
          conversations_members: {
            include: {
              users: {
                select: { id: true, name: true, email: true, avatar_url: true }
              }
            }
          },
          messages: {
            orderBy: { created_at: 'desc' },
            take: 1
          }
        },
        orderBy: {
          updated_at: 'desc'
        }
      });
    }

    return await this.prisma.conversations.findMany({
      include: {
        conversations_members: {
          include: {
            users: {
              select: { id: true, name: true, email: true, avatar_url: true }
            }
          }
        }
      }
    });
  }

 async findOne(id: number) {
    return await this.prisma.conversations.findUnique({ where: { id } });
  }

 async update(id: number, updateConversationDto: UpdateConversationDto) {
    return await this.prisma.conversations.update({
      where:{ id },
      data: updateConversationDto
    });
  }

  remove(id: number) {
    return `This action removes a #${id} conversation`;
  }
}
