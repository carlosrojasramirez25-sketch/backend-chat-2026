import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  
  constructor(private readonly prisma:PrismaService){}

async create(createUserDto: CreateUserDto) {
    return await this.prisma.users.create({ data: createUserDto });
  }

  findAll() {
    return this.prisma.users.findMany();
  }

 async findOne(id: number) {
    return await this.prisma.users.findUnique({ where: { id } });
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.users.update({ where: { id }, data:updateUserDto });
  }

 async findByEmail(email:string){
    return await this.prisma.users.findUnique({ where: { email } });
  }
}
