
import { Controller, Get } from '@nestjs/common';

@Controller('group-members')
export class GroupMembersController {
  @Get()
  findAll(): string {
    return 'This action returns all group members';
  }
}
