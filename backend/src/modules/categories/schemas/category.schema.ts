import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Category {
    @Prop({ required: true })
    name: string; // Tên hiển thị, VD: "Technology"

    @Prop({ required: true, unique: true })
    slug: string; // Dùng để query và lưu vào post.tags, VD: "technology"

    @Prop({ required: true })
    group_name: string; // Nhóm trong dropdown, VD: "Công nghệ"

    @Prop()
    icon: string; // Emoji, VD: "💻"

    @Prop({ default: 0 })
    post_count: number; // Cache đếm số bài dùng tag này

    @Prop({ default: 0 })
    sort_order: number;

    @Prop({ default: true })
    is_active: boolean;

    created_at: Date;
    updated_at: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Seed data – 24 tag phổ biến
export const CATEGORY_SEED = [
    // Giải trí
    { name: 'Music',        slug: 'music',        group_name: 'Giải trí',  icon: '🎵', sort_order: 1  },
    { name: 'Movies',       slug: 'movies',       group_name: 'Giải trí',  icon: '🎬', sort_order: 2  },
    { name: 'Gaming',       slug: 'gaming',       group_name: 'Giải trí',  icon: '🎮', sort_order: 3  },
    { name: 'Sports',       slug: 'sports',       group_name: 'Giải trí',  icon: '⚽', sort_order: 4  },
    // Công nghệ
    { name: 'Technology',   slug: 'technology',   group_name: 'Công nghệ', icon: '💻', sort_order: 5  },
    { name: 'Programming',  slug: 'programming',  group_name: 'Công nghệ', icon: '🧑‍💻', sort_order: 6 },
    { name: 'AI',           slug: 'ai',           group_name: 'Công nghệ', icon: '🤖', sort_order: 7  },
    { name: 'Gadgets',      slug: 'gadgets',      group_name: 'Công nghệ', icon: '📱', sort_order: 8  },
    // Lifestyle
    { name: 'Food',         slug: 'food',         group_name: 'Lifestyle', icon: '🍔', sort_order: 9  },
    { name: 'Travel',       slug: 'travel',       group_name: 'Lifestyle', icon: '✈️', sort_order: 10 },
    { name: 'Fashion',      slug: 'fashion',      group_name: 'Lifestyle', icon: '👗', sort_order: 11 },
    { name: 'Health',       slug: 'health',       group_name: 'Lifestyle', icon: '🏃', sort_order: 12 },
    // Kiến thức
    { name: 'Education',    slug: 'education',    group_name: 'Kiến thức', icon: '📚', sort_order: 13 },
    { name: 'Science',      slug: 'science',      group_name: 'Kiến thức', icon: '🔬', sort_order: 14 },
    { name: 'Business',     slug: 'business',     group_name: 'Kiến thức', icon: '💼', sort_order: 15 },
    { name: 'Finance',      slug: 'finance',      group_name: 'Kiến thức', icon: '💰', sort_order: 16 },
    // Sáng tạo
    { name: 'Art',          slug: 'art',          group_name: 'Sáng tạo',  icon: '🎨', sort_order: 17 },
    { name: 'Photography',  slug: 'photography',  group_name: 'Sáng tạo',  icon: '📷', sort_order: 18 },
    { name: 'Writing',      slug: 'writing',      group_name: 'Sáng tạo',  icon: '✍️', sort_order: 19 },
    { name: 'DIY',          slug: 'diy',          group_name: 'Sáng tạo',  icon: '🛠', sort_order: 20 },
    // Cộng đồng
    { name: 'News',         slug: 'news',         group_name: 'Cộng đồng', icon: '📰', sort_order: 21 },
    { name: 'Discussion',   slug: 'discussion',   group_name: 'Cộng đồng', icon: '💬', sort_order: 22 },
    { name: 'Meme',         slug: 'meme',         group_name: 'Cộng đồng', icon: '😂', sort_order: 23 },
    { name: 'Other',        slug: 'other',        group_name: 'Cộng đồng', icon: '🌐', sort_order: 24 },
];
