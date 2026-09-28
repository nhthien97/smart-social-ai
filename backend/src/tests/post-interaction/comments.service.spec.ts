// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { CommentsService } from '../../modules/comments/comments.service';
import { createQueryChain, createSaveModel } from '../helpers/mongoose-chain';

describe('CommentsService', () => {
  const firebaseService = {
    writeNotification: jest.fn().mockResolvedValue(undefined),
  };

  const userInteractionsService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const adminService = {
    writeUserActivity: jest.fn().mockResolvedValue(undefined),
  };

  let commentModel: any;
  let userModel: any;
  let likeModel: any;
  let postModel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    commentModel = createSaveModel({
      _id: 'comment-1',
      user_id: 'user-1',
      post_id: 'post-1',
      content: 'Nice post',
      likes_count: 0,
    });
    commentModel.find = jest.fn(() => createQueryChain([]));
    commentModel.findById = jest.fn(() => createQueryChain({
      _id: 'comment-1',
      user_id: 'user-1',
      post_id: 'post-1',
      content: 'Nice post',
    }));
    commentModel.findByIdAndDelete = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ _id: 'comment-1' }) }));
    commentModel.findByIdAndUpdate = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ _id: 'comment-1', likes_count: 1 }) }));
    commentModel.countDocuments = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(1) }));

    userModel = {
      findById: jest.fn(() => createQueryChain({ _id: 'user-1', full_name: 'User One', username: 'userone' })),
      find: jest.fn(() => createQueryChain([
        { _id: 'user-1', full_name: 'User One', avatar_url: null },
      ])),
    };

    likeModel = {
      find: jest.fn(() => createQueryChain([])),
    };

    postModel = {
      findById: jest.fn(() => createQueryChain({ _id: 'post-1', user_id: 'post-owner' })),
    };
  });

  function createService() {
    return new CommentsService(
      commentModel,
      userModel,
      likeModel,
      postModel,
      firebaseService as any,
      userInteractionsService as any,
      adminService as any,
    );
  }

  it('creates a comment and records a comment interaction', async () => {
    const service = createService();

    const result = await service.create({
      user_id: 'user-1',
      post_id: 'post-1',
      content: 'Nice post',
    } as any);

    expect(result).toMatchObject({ _id: 'comment-1', content: 'Nice post' });
    expect(userInteractionsService.record).toHaveBeenCalledWith({
      user_id: 'user-1',
      post_id: 'post-1',
      interaction_type: expect.any(String),
    });
    expect(firebaseService.writeNotification).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'post-owner', type: 'comment', ref_type: 'post' }),
    );
  });

  it('rejects an empty comment', async () => {
    const service = createService();

    await expect(service.create({
      user_id: 'user-1',
      post_id: 'post-1',
      content: '   ',
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a comment longer than 1000 characters', async () => {
    const service = createService();

    await expect(service.create({
      user_id: 'user-1',
      post_id: 'post-1',
      content: 'a'.repeat(1001),
    } as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('loads comments for a post with user enrichment', async () => {
    const service = createService();

    const comments = await service.findByPostId('post-1', 'user-2');

    expect(comments).toEqual([]);
  });

  it('deletes a comment', async () => {
    const service = createService();

    const deleted = await service.delete('comment-1');

    expect(deleted).toEqual({ _id: 'comment-1' });
  });
});