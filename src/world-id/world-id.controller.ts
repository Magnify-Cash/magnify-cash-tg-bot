import { Body, Controller, Get, Post, Render, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WorldIdService } from './world-id.service';
import { VerifyProofDto } from './dtos/verify-proof.dto';
import { ApiAuthHeader } from 'src/shared/decorators/api-auth-header.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { WebAppUser } from 'src/shared/decorators/init-data.decorator';

@ApiTags('world-id-controller')
@Controller('world-id')
export class WorldIdController {
  constructor(private readonly worldIdService: WorldIdService) {}

  @Get('verify')
  @Render('verify-page')
  renderVerifyPage() {
    return this.worldIdService.renderVerifyPage();
  }

  @ApiAuthHeader()
  @Post('verify')
  @UseGuards(AuthGuard)
  async verifyProof(
    @CurrentUser() currentUser: WebAppUser,
    @Body() dto: VerifyProofDto,
  ) {
    return await this.worldIdService.verifyProof(currentUser, dto);
  }
}
