import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Headers, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) { }

  @Post()
  create(@Body() createPostDto: CreatePostDto) {
    return this.postsService.create(createPostDto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('user_id') userId?: string,
    @Query('group_id') groupId?: string,
  ) {
    if (groupId) {
      return this.postsService.findByGroupId(groupId, parseInt(page), parseInt(limit), userId);
    }
    return this.postsService.findAll(parseInt(page), parseInt(limit), userId);
  }

  @Get('user/:userId')
  findByUserId(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('current_user_id') currentUserId?: string,
  ) {
    return this.postsService.findByUserId(userId, parseInt(page), parseInt(limit), currentUserId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('user_id') userId?: string,
  ) {
    return this.postsService.findOne(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, req.user.userId || req.user.user_id, updatePostDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.postsService.delete(id, req.user.userId || req.user.user_id);
  }
}
