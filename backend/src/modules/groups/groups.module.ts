
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { Group, GroupSchema } from './schemas/group.scheme';
import { GroupMember, GroupMemberSchema } from './schemas/group-member.scheme';
import { Post, PostSchema } from '../posts/schemas/post.scheme';
import { GroupRolesGuard } from './guards/group-roles.guard';
import { User, UserSchema } from '../users/schemas/user.scheme';
import { Like, LikeSchema } from '../likes/schemas/like.scheme';
import { FirebaseService } from '../../common/services/firebase.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Group.name, schema: GroupSchema },
      { name: GroupMember.name, schema: GroupMemberSchema },
      { name: Post.name, schema: PostSchema },
      { name: User.name, schema: UserSchema },
      { name: Like.name, schema: LikeSchema },
    ]),
    AdminModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService, GroupRolesGuard, FirebaseService],
  exports: [GroupsService],
})
export class GroupsModule {}

