import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikeSchema } from './schemas/like.scheme';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { PostsModule } from '../posts/posts.module';
import { CommentsModule } from '../comments/comments.module';
import { UserSchema } from '../users/schemas/user.scheme';
import { PostSchema } from '../posts/schemas/post.scheme';
import { CommentSchema } from '../comments/schemas/comment.scheme';
import { FirebaseService } from '../../common/services/firebase.service';
import { UserInteractionsModule } from '../user-interactions/user-interactions.module';
import { AdminModule } from '../admin/admin.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Like', schema: LikeSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Post', schema: PostSchema },
      { name: 'Comment', schema: CommentSchema },
    ]),
    PostsModule,
    CommentsModule,
    UserInteractionsModule,
    AdminModule,
  ],

  controllers: [LikesController],
  providers: [LikesService, FirebaseService],
  exports: [LikesService],
})
export class LikesModule {}
