
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupMemberSchema } from './schemas/group-member.scheme';
import { GroupMembersService } from './group-members.service';
import { GroupMembersController } from './group-members.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'GroupMember', schema: GroupMemberSchema },
    ])
  ],

  controllers: [GroupMembersController],
  providers: [GroupMembersService],
  exports: [GroupMembersService],
})
export class GroupMembersModule {}
