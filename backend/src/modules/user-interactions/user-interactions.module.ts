import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserInteraction, UserInteractionSchema } from './schemas/user-interaction.schema';
import { UserInteractionsController } from './user-interactions.controller';
import { UserInteractionsService } from './user-interactions.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: UserInteraction.name, schema: UserInteractionSchema },
        ]),
    ],
    controllers: [UserInteractionsController],
    providers: [UserInteractionsService],
    exports: [UserInteractionsService], // Export để LikesService, CommentsService, PostsService inject
})
export class UserInteractionsModule {}
