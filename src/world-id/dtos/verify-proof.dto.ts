import { ApiProperty } from '@nestjs/swagger';
import { VerificationLevel } from '@worldcoin/idkit-core';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class Proof {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nullifier_hash: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  merkle_root: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  proof: string;

  @ApiProperty({ enum: VerificationLevel })
  @IsEnum(VerificationLevel)
  verification_level: VerificationLevel;
}

export class VerifyProofDto {
  @ApiProperty({ type: Proof })
  @ValidateNested()
  @Type(() => Proof)
  proof: Proof;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  signal: string;
}
