import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProgressDto {
  @ApiPropertyOptional({ default: true, description: 'Dars tugatildimi' })
  @IsOptional() @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: "Ko'rilgan vaqt (sekund)" })
  @IsOptional() @IsInt() @Min(0)
  watchedSeconds?: number;
}
