import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateKnowledgeDto {
  @ApiProperty({
    example: 'Delivery Policy',
    description: 'Short title for this knowledge entry',
    minLength: 2,
    maxLength: 150,
  })
  @IsString()
  @Length(2, 150)
  title!: string;

  @ApiProperty({
    example: 'Delivery within Lagos takes 1–3 business days. Outside Lagos takes 3–7 business days.',
    description: 'The knowledge content the worker will use when answering questions',
    minLength: 1,
    maxLength: 20000,
  })
  @IsString()
  @Length(1, 20000)
  content!: string;
}

export class UpdateKnowledgeDto {
  @ApiPropertyOptional({ example: 'Updated Delivery Policy', minLength: 2, maxLength: 150 })
  @IsOptional()
  @IsString()
  @Length(2, 150)
  title?: string;

  @ApiPropertyOptional({ maxLength: 20000 })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  content?: string;
}
