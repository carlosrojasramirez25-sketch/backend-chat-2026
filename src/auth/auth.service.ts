import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginAuthDto } from './dto/login-auth.dto';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {

  constructor(private readonly userService:UsersService,
              private readonly jwt:JwtService){}

 async loginAuth({ email, password }: LoginAuthDto) {
     const user = await this.userService.findByEmail(email);

     if (!user) throw new UnauthorizedException('Usuario no encontrado');

     const passwordHash = await bcrypt.compare( password,user?.password as any);

     if (!passwordHash) throw new UnauthorizedException('Contraseña no encontrado');

     const payload = { id: user?.id, name:user?.name, email:user?.email };
     
     const payloadJWT =  this.jwt.sign(payload);

     return { payloadJWT }

  }

  async createUser(createUserss: CreateAuthDto) {
    const { email, password } = createUserss;
    
    const filter = await this.userService.findByEmail(email);

    if (filter) throw new UnauthorizedException('Este usuario email ya existe');

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.userService.create({ ...createUserss, password: hashedPassword });

    const payload = { id: newUser.id, name: newUser.name, email: newUser.email };
    const payloadJWT = this.jwt.sign(payload);

    return { payloadJWT, message: "Usuario creado correctamente" };
  }

}
