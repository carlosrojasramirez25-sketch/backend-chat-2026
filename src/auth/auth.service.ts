import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginAuthDto } from './dto/login-auth.dto';
import { CreateAuthDto } from './dto/create-auth.dto';

// Generic message prevents account enumeration (attacker can't tell if email exists)
const INVALID_CREDENTIALS = 'Credenciales incorrectas';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async loginAuth({ email, password }: LoginAuthDto) {
    const user = await this.userService.findByEmail(email);

    // Always run bcrypt regardless of whether user exists — prevents timing attacks
    // that would allow an attacker to enumerate valid emails by response time.
    const DUMMY = '$2b$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const hash = (user?.password as string) ?? DUMMY;
    const passwordMatch = await bcrypt.compare(password, hash);

    if (!user || !passwordMatch) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const payload = { id: user.id, name: user.name, email: user.email };
    return { payloadJWT: this.jwt.sign(payload) };
  }

  async createUser(dto: CreateAuthDto) {
    const exists = await this.userService.findByEmail(dto.email);
    if (exists) throw new ConflictException('Este correo ya está registrado');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const newUser = await this.userService.create({ ...dto, password: hashedPassword });

    const payload = { id: newUser.id, name: newUser.name, email: newUser.email };
    return { payloadJWT: this.jwt.sign(payload), message: 'Usuario creado correctamente' };
  }
}