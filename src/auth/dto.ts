import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Thomas', description: 'Full name', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80)
  name!: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securepassword', description: 'Password', minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securepassword', description: 'Password', minLength: 8, maxLength: 128 })
  @IsString()
  @Length(8, 128)
  password!: string;
}
