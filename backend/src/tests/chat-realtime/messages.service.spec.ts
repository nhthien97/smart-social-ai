// @ts-nocheck
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from '../../modules/messages/messages.service';
import { MessageType } from '../../modules/messages/schemas/messages.scheme';
import { createQueryChain, createSaveModel } from '../helpers/mongoose-chain';

describe('MessagesService', () => {
  const conversationsService = {
    updateLastMessage: jest.fn().mockResolvedValue(undefined),
    syncConversationsToFirestore: jest.fn().mockResolvedValue(undefined),
    markAsRead: jest.fn().mockResolvedValue(undefined),
  };

  const firebaseService = {
    writeNotification: jest.fn().mockResolvedValue(undefined),
    writeMessageToFirestore: jest.fn().mockResolvedValue(undefined),
    updateFirestoreMessage: jest.fn().mockResolvedValue(undefined),
  };

  const userInteractionsService = {
    record: jest.fn().mockResolvedValue(undefined),
  };

  const adminService = {
    writeUserActivity: jest.fn().mockResolvedValue(undefined),
  };

  let messageModel: any;
  let participantModel: any;
  let userModel: any;
  let postModel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    messageModel = createSaveModel({
      _id: 'message-1',
      conv_id: 'conv-1',
      sender_id: 'user-1',
      content: 'Hello',
      media_urls: [],
      file_url: undefined,
      file_name: undefined,
      file_size: 0,
      message_type: MessageType.TEXT,
      reply_to_id: null,
      created_at: new Date('2026-01-01T00:00:00.000Z'),
      toObject: jest.fn().mockReturnValue({
        _id: 'message-1',
        conv_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hello',
        media_urls: [],
        file_url: undefined,
        file_name: undefined,
        file_size: 0,
        message_type: MessageType.TEXT,
        reply_to_id: null,
        created_at: new Date('2026-01-01T00:00:00.000Z'),
      }),
    });

    participantModel = {
      findOne: jest.fn()
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ _id: 'participant-1', conv_id: 'conv-1', user_id: 'user-1', left_at: null }) })
        .mockReturnValueOnce({
          lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        }),
      find: jest.fn()
        .mockReturnValueOnce(createQueryChain([
          { user_id: 'user-1', left_at: null, is_muted: false },
          { user_id: 'user-2', left_at: null, is_muted: false },
        ]))
        .mockReturnValueOnce(createQueryChain([
          { user_id: 'user-1' },
          { user_id: 'user-2' },
        ])),
    };

    userModel = {
      findById: jest.fn(() => createQueryChain({ _id: 'user-1', full_name: 'User One', username: 'userone', avatar_url: null })),
    };

    postModel = {
      findById: jest.fn(() => createQueryChain({ _id: 'post-1', user_id: 'post-owner', content: 'Shared post', media_urls: [] })),
      findByIdAndUpdate: jest.fn(() => ({ exec: jest.fn().mockResolvedValue({}) })),
    };
  });

  function createService() {
    return new MessagesService(
      messageModel,
      participantModel,
      userModel,
      postModel,
      conversationsService as any,
      firebaseService as any,
      userInteractionsService as any,
      adminService as any,
    );
  }

  it('sends a text message and updates the conversation', async () => {
    const service = createService();

    const result = await service.send({
      conv_id: 'conv-1',
      sender_id: 'user-1',
      content: 'Hello',
      message_type: MessageType.TEXT,
    } as any);

    expect(result).toMatchObject({
      _id: 'message-1',
      content: 'Hello',
      sender_info: expect.objectContaining({ full_name: 'User One' }),
    });
    expect(conversationsService.updateLastMessage).toHaveBeenCalledWith('conv-1', 'message-1', 'Hello', 'user-1');
    expect(firebaseService.writeMessageToFirestore).toHaveBeenCalled();
  });

  it('blocks a sender that has been blocked by the conversation partner', async () => {
    participantModel.findOne = jest.fn()
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue({ _id: 'participant-1', conv_id: 'conv-1', user_id: 'user-1', left_at: null }) })
      .mockReturnValueOnce({
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ blocked_by: 'user-2' }) }),
      });

    const service = createService();

    await expect(
      service.send({
        conv_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hello',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects empty text messages without media or file', async () => {
    const service = createService();

    await expect(
      service.send({
        conv_id: 'conv-1',
        sender_id: 'user-1',
        content: '',
        media_urls: [],
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents editing another user message', async () => {
    messageModel.findById = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({
      _id: 'message-1',
      sender_id: 'user-2',
      conv_id: 'conv-1',
      message_type: MessageType.TEXT,
      is_recalled: false,
      save: jest.fn(),
    }) }));

    const service = createService();

    await expect(service.edit('message-1', 'user-1', { content: 'Updated' } as any)).rejects.toBeInstanceOf(ForbiddenException);
  });
});