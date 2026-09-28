import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { CommentSchema } from './schemas/comment.scheme';
import { PostsModule } from '../posts/posts.module';
import { UserSchema } from '../users/schemas/user.scheme';
import { LikeSchema } from '../likes/schemas/like.scheme';
import { PostSchema } from '../posts/schemas/post.scheme';
import { FirebaseService } from '../../common/services/firebase.service';
import { UserInteractionsModule } from '../user-interactions/user-interactions.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Comment', schema: CommentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Like', schema: LikeSchema },
      { name: 'Post', schema: PostSchema },
    ]),
    PostsModule,
    UserInteractionsModule,
    AdminModule,
  ],

  controllers: [CommentsController],
  providers: [CommentsService, FirebaseService],
  exports: [CommentsService],
})
export class CommentsModule {}
