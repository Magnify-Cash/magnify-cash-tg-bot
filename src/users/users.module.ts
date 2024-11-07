import { Global, Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
