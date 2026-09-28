// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PostsService } from '../../modules/posts/posts.service';
import { PostStatus, PostVisibility } from '../../modules/posts/schemas/post.scheme';
import { ActivityType } from '../../modules/admin/schemas/user-activity-log.schema';
import { createQueryChain, createSaveModel } from '../helpers/mongoose-chain';

describe('PostsService', () => {
  const categoriesService = {
    getValidSlugs: jest.fn(),
    incrementPostCount: jest.fn(),
  };

  const userInteractionsService = {
    record: jest.fn(),
  };

  const adminService = {
    writeUserActivity: jest.fn().mockResolvedValue(undefined),
  };

  const httpService = {
    get: jest.fn(),
  };

  let postModel: any;
  let userModel: any;
  let likeModel: any;
  let friendModel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    postModel = createSaveModel({
      _id: 'post-1',
      user_id: 'user-1',
      content: 'Hello world',
      tags: ['tech'],
      visibility: PostVisibility.PUBLIC,
      status: PostStatus.ACTIVE,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      view_count: 0,
    });

    postModel.findByIdAndUpdate = jest.fn(() => ({
      exec: jest.fn().mockResolvedValue({
        _id: 'post-1',
        is_edited: true,
        content: 'Updated',
      }),
    }));

    postModel.findById = jest.fn(() => createQueryChain({
      _id: 'post-1',
      user_id: 'user-1',
      content: 'Hello world',
      tags: ['tech'],
      created_at: new Date('2026-01-01T00:00:00.000Z'),
    }));

    postModel.countDocuments = jest.fn().mockResolvedValue(1);
    postModel.find = jest.fn(() => createQueryChain([]));
    postModel.deleteMany = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(undefined) }));

    userModel = {
      find: jest.fn(() => createQueryChain([
        { _id: 'user-1', full_name: 'User One', username: 'userone', avatar_url: null },
      ])),
    };

    likeModel = {
      find: jest.fn(() => createQueryChain([])),
    };

    friendModel = {
      find: jest.fn(() => createQueryChain([])),
    };
  });

  function createService() {
    return new PostsService(
      postModel,
      userModel,
      likeModel,
      friendModel,
      categoriesService as any,
      userInteractionsService as any,
      adminService as any,
      httpService as any,
    );
  }

  it('creates a valid post and increments category counters', async () => {
    categoriesService.getValidSlugs.mockResolvedValue(['tech', 'gaming']);
    const service = createService();

    const result = await service.create({
      user_id: 'user-1',
      content: 'Hello world',
      tags: ['tech'],
    } as any);

    expect(result).toMatchObject({
      _id: 'post-1',
      content: 'Hello world',
      tags: ['tech'],
    });
    expect(categoriesService.incrementPostCount).toHaveBeenCalledWith(['tech']);
    expect(adminService.writeUserActivity).toHaveBeenCalledWith('user-1', ActivityType.CREATE_POST);
  });

  it('rejects post creation when tags are missing', async () => {
    categoriesService.getValidSlugs.mockResolvedValue(['tech']);
    const service = createService();

    await expect(service.create({ user_id: 'user-1', content: 'Hello' } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects post creation when tags are invalid', async () => {
    categoriesService.getValidSlugs.mockResolvedValue(['tech']);
    const service = createService();

    await expect(
      service.create({
        user_id: 'user-1',
        content: 'Hello',
        tags: ['tech', 'unknown'],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates a post and marks it edited', async () => {
    const service = createService();

    const result = await service.update('post-1', { content: 'Updated' } as any);

    expect(postModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({ content: 'Updated', is_edited: true }),
      { new: true },
    );
    expect(result).toMatchObject({ _id: 'post-1', is_edited: true });
  });

  it('rejects updating another user post when current user is provided', async () => {
    const service = createService();

    await expect(service.update('post-1', 'user-2', { content: 'Hacked' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('soft-deletes a post by changing its status', async () => {
    const service = createService();

    const result = await service.delete('post-1');

    expect(postModel.findByIdAndUpdate).toHaveBeenCalledWith('post-1', { status: 'deleted' }, { new: true });
    expect(result).toMatchObject({ _id: 'post-1' });
  });

  it('allows media-only post creation', async () => {
    categoriesService.getValidSlugs.mockResolvedValue(['tech']);
    const service = createService();

    const result = await service.create({
      user_id: 'user-1',
      content: '',
      media_urls: ['https://example.com/image.https://res.cloudinary.com/dcfuybexm/image/upload/v1781544754/minisocial/posts/r0szt1n8bnw09dj5zyjt.gif'],
      tags: ['tech'],
    } as any);

    expect(result).toMatchObject({ _id: 'post-1' });
  });

  it('rejects empty text-only post creation', async () => {
    categoriesService.getValidSlugs.mockResolvedValue(['tech']);
    const service = createService();

    await expect(
      service.create({
        user_id: 'user-1',
        content: '',
        tags: ['tech'],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});