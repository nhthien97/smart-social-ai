
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationSchema } from './schemas/conversation.scheme';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ConversationParticipant, ConversationParticipantSchema } from '../conversation-participants/schemas/conversation-participants.scheme';
import { FriendSchema } from '../friends/schemas/friend.scheme';
import { UserSchema } from '../users/schemas/user.scheme';
import { FirebaseService } from '../../common/services/firebase.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Conversation', schema: ConversationSchema },
      { name: ConversationParticipant.name, schema: ConversationParticipantSchema },
      { name: 'Friend', schema: FriendSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, FirebaseService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
