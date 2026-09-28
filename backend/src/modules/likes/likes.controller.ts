import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { LikesService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';
import { PostsService } from '../posts/posts.service';
import { CommentsService } from '../comments/comments.service';

@Controller('likes')
export class LikesController {
  constructor(
    private readonly likesService: LikesService,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
  ) { }

  @Post('toggle')
  async toggleLike(@Body() createLikeDto: CreateLikeDto) {
    const result = await this.likesService.toggleLike(createLikeDto);
    
    // LikesService updates counts atomically with the like/unlike operation.
    
    return result;
  }

  @Get('check')
  checkLike(
    @Query('user_id') userId: string,
    @Query('post_id') postId?: string,
    @Query('comment_id') commentId?: string,
  ) {
    return this.likesService.checkLike(userId, postId, commentId);
  }

  @Get('post/:postId')
  getLikesByPost(@Query('postId') postId: string) {
    return this.likesService.getLikesByPost(postId);
  }

  @Get('comment/:commentId')
  getLikesByComment(@Query('commentId') commentId: string) {
    return this.likesService.getLikesByComment(commentId);
  }
}
