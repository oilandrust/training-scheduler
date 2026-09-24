import { IsEmail, Matches } from 'class-validator';

export class VerifyMagicLinkDto {
  @IsEmail()
  email!: string;

  @Matches(/^\d{6}$/)
  code!: string;
}
