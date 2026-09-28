// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LikesService } from '../../modules/likes/likes.service';
import { createQueryChain, createSaveModel } from '../helpers/mongoose-chain';

describe('LikesService', () => {
  const firebaseService = {
    writeNotification: jest.fn().mockResolvedValue(undefined),
  };

  const userInteractionsService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const adminService = {
    writeUserActivity: jest.fn().mockResolvedValue(undefined),
  };

  let likeModel: any;
  let userModel: any;
  let postModel: any;
  let commentModel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    likeModel = createSaveModel({
      _id: 'like-1',
      user_id: 'user-1',
      post_id: 'post-1',
    });
    likeModel.findOne = jest.fn(() => createQueryChain(null));
    likeModel.findByIdAndDelete = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({}) }));
    likeModel.find = jest.fn(() => createQueryChain([]));

    userModel = {
      findById: jest.fn(() => createQueryChain({ _id: 'user-1', full_name: 'User One', username: 'userone' })),
    };

    postModel = {
      findById: jest.fn(() => createQueryChain({ _id: 'post-1', user_id: 'post-owner' })),
      updateOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) })),
    };

    commentModel = {
      findById: jest.fn(() => createQueryChain({ _id: 'comment-1', user_id: 'comment-owner' })),
      updateOne: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) })),
    };
  });

  function createService() {
    return new LikesService(
      likeModel,
      userModel,
      postModel,
      commentModel,
      firebaseService as any,
      userInteractionsService as any,
      adminService as any,
    );
  }

  it('creates a post like and records recommendation interaction', async () => {
    const service = createService();

    const result = await service.toggleLike({
      user_id: 'user-1',
      post_id: 'post-1',
    } as any);

    expect(result).toMatchObject({ liked: true });
    expect(userInteractionsService.record).toHaveBeenCalledWith({
      user_id: 'user-1',
      post_id: 'post-1',
      interaction_type: expect.any(String),
    });
    expect(postModel.updateOne).toHaveBeenCalledWith({ _id: 'post-1' }, { $inc: { likes_count: 1 } });
    expect(firebaseService.writeNotification).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'post-owner', type: 'like', ref_type: 'post' }),
    );
  });

  it('removes an existing like on second toggle', async () => {
    likeModel.findOne = jest.fn(() => createQueryChain({ _id: 'like-existing' }));
    const service = createService();

    const result = await service.toggleLike({
      user_id: 'user-1',
      post_id: 'post-1',
    } as any);

    expect(likeModel.findByIdAndDelete).toHaveBeenCalledWith('like-existing');
    expect(postModel.updateOne).toHaveBeenCalledWith(
      { _id: 'post-1', likes_count: { $gt: 0 } },
      { $inc: { likes_count: -1 } },
    );
    expect(result).toEqual({ liked: false, target: 'post' });
  });

  it('handles duplicate like race by returning liked without incrementing count twice', async () => {
    likeModel.mockImplementationOnce(() => ({
      save: jest.fn().mockRejectedValue({ code: 11000 }),
    }));
    const service = createService();

    const result = await service.toggleLike({
      user_id: 'user-1',
      post_id: 'post-1',
    } as any);

    expect(result).toEqual({ liked: true, target: 'post' });
    expect(postModel.updateOne).not.toHaveBeenCalled();
  });

  it('checks whether a user liked a post', async () => {
    likeModel.findOne = jest.fn(() => createQueryChain({ _id: 'like-existing' }));
    const service = createService();

    await expect(service.checkLike('user-1', 'post-1')).resolves.toBe(true);
  });
});