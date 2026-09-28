
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationParticipant, ConversationParticipantSchema } from './schemas/conversation-participants.scheme';
import { ConversationParticipantsController } from './conversation-participants.controller';
import { ConversationParticipantsService } from './conversation-participants.service';
import { ConversationSchema } from '../conversations/schemas/conversation.scheme';
import { MessageSchema } from '../messages/schemas/messages.scheme';
import { UserSchema } from '../users/schemas/user.scheme';
import { FirebaseService } from '../../common/services/firebase.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationParticipant.name, schema: ConversationParticipantSchema },
      { name: 'Conversation', schema: ConversationSchema },
      { name: 'Message', schema: MessageSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [ConversationParticipantsController],
  providers: [ConversationParticipantsService, FirebaseService],
  exports: [ConversationParticipantsService],
})
export class ConversationParticipantsModule {}
