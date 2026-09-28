import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostsService } from '../posts/posts.service';

@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly postsService: PostsService,
  ) { }

  @Post()
  async create(@Body() createCommentDto: CreateCommentDto) {
    const comment = await this.commentsService.create(createCommentDto);
    // Increment post's comments count
    await this.postsService.incrementCommentsCount(createCommentDto.post_id, 1);
    return comment;
  }

  @Get('post/:postId')
  findByPostId(
    @Param('postId') postId: string,
    @Query('user_id') userId?: string,
  ) {
    return this.commentsService.findByPostId(postId, userId);
  }

  @Get('replies/:parentId')
  findReplies(
    @Param('parentId') parentId: string,
    @Query('user_id') userId?: string,
  ) {
    return this.commentsService.findReplies(parentId, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const comment = await this.commentsService.findOne(id);
    const deletedComment = await this.commentsService.delete(id);
    // Decrement post's comments count
    await this.postsService.incrementCommentsCount(comment.post_id, -1);
    return deletedComment;
  }
}
