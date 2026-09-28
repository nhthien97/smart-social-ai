import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    UserInteraction,
    InteractionType,
    INTERACTION_WEIGHT,
} from './schemas/user-interaction.schema';

export interface RecordInteractionDto {
    user_id: string;
    post_id: string;
    interaction_type: InteractionType;
    duration_ms?: number;
}

@Injectable()
export class UserInteractionsService {
    constructor(
        @InjectModel(UserInteraction.name)
        private interactionModel: Model<UserInteraction>,
    ) {}

    // Ghi interaction – dùng upsert để tránh duplicate
    async record(dto: RecordInteractionDto): Promise<void> {
        try {
            const weight = INTERACTION_WEIGHT[dto.interaction_type];
            await this.interactionModel.findOneAndUpdate(
                {
                    user_id: dto.user_id,
                    post_id: dto.post_id,
                    interaction_type: dto.interaction_type,
                },
                {
                    $set: {
                        weight,
                        duration_ms: dto.duration_ms ?? null,
                    },
                },
                { upsert: true, new: true },
            );
        } catch {
            // Không để lỗi interaction làm fail request chính
        }
    }

    // Python ML Server dùng endpoint này để lấy dữ liệu training
    async getInteractionsSince(since: Date): Promise<UserInteraction[]> {
        return this.interactionModel
            .find({ created_at: { $gte: since } })
            .lean()
            .exec();
    }

    // Lấy tất cả interactions (Python gọi khi train lại từ đầu)
    async getAllInteractions(): Promise<UserInteraction[]> {
        return this.interactionModel.find().lean().exec();
    }

    // Lấy interactions của 1 user (debug / kiểm tra)
    async getByUser(userId: string): Promise<UserInteraction[]> {
        return this.interactionModel
            .find({ user_id: userId })
            .sort({ created_at: -1 })
            .lean()
            .exec();
    }
}
