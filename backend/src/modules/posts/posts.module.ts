import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Post, PostSchema } from './schemas/post.scheme';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { UserSchema } from '../users/schemas/user.scheme';
import { LikeSchema } from '../likes/schemas/like.scheme';
import { FriendSchema } from '../friends/schemas/friend.scheme';
import { CategoriesModule } from '../categories/categories.module';
import { UserInteractionsModule } from '../user-interactions/user-interactions.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Like', schema: LikeSchema },
      { name: 'Friend', schema: FriendSchema },
    ]),
    CategoriesModule,
    UserInteractionsModule,
    AdminModule,
  ],

  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
