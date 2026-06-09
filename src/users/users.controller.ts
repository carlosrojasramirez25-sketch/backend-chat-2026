import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  async findAll(
    @Query('email') email: string | undefined,
    @CurrentUser() user: { id: number },
  ) {
    if (email) {
      const found = await this.usersService.findByEmail(email);
      if (!found) return [];
      // never return password
      const { password: _, ...safe } = found as any;
      return [safe];
    }
    // sin filtro: solo devuelve tus contactos (usuarios en conversaciones comunes)
    return this.usersService.findContactsOf(user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: number },
  ) {
    const targetId = +id;
    if (targetId !== user.id) {
      const isContact = await this.usersService.areContacts(user.id, targetId);
      if (!isContact) throw new ForbiddenException('No tienes acceso a este perfil');
    }
    return this.usersService.findOne(targetId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: { id: number },
  ) {
    if (+id !== user.id) throw new ForbiddenException('Solo puedes editar tu propio perfil');
    return this.usersService.update(+id, updateUserDto);
  }
}
