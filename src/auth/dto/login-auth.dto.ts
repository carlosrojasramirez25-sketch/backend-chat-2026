import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginAuthDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}