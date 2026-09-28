import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CATEGORY_SEED } from './schemas/category.schema';

@Injectable()
export class CategoriesService implements OnModuleInit {
    constructor(
        @InjectModel(Category.name) private categoryModel: Model<Category>,
    ) {}

    // Tự động seed data nếu collection rỗng
    async onModuleInit() {
        const count = await this.categoryModel.countDocuments();
        if (count === 0) {
            await this.categoryModel.insertMany(CATEGORY_SEED);
        }
    }

    // Trả về danh sách categories active, nhóm theo group_name
    async findAll(): Promise<{ group: string; items: Category[] }[]> {
        const categories = await this.categoryModel
            .find({ is_active: true })
            .sort({ sort_order: 1 })
            .lean()
            .exec();

        // Nhóm theo group_name để frontend render dropdown
        const grouped = categories.reduce((acc: Record<string, any[]>, cat) => {
            if (!acc[cat.group_name]) acc[cat.group_name] = [];
            acc[cat.group_name].push(cat);
            return acc;
        }, {});

        return Object.entries(grouped).map(([group, items]) => ({ group, items }));
    }

    // Flat list – dùng để validate tags khi tạo bài
    async findAllFlat(): Promise<Category[]> {
        return this.categoryModel.find({ is_active: true }).sort({ sort_order: 1 }).lean().exec();
    }

    // Lấy valid slugs – dùng để validate trong PostsService
    async getValidSlugs(): Promise<string[]> {
        const cats = await this.categoryModel.find({ is_active: true }).select('slug').lean().exec();
        return cats.map((c) => c.slug);
    }

    // Tăng post_count khi bài viết được tạo
    async incrementPostCount(slugs: string[]) {
        if (!slugs?.length) return;
        await this.categoryModel.updateMany(
            { slug: { $in: slugs } },
            { $inc: { post_count: 1 } },
        );
    }

    // Giảm post_count khi bài viết bị xóa
    async decrementPostCount(slugs: string[]) {
        if (!slugs?.length) return;
        await this.categoryModel.updateMany(
            { slug: { $in: slugs } },
            { $inc: { post_count: -1 } },
        );
    }
}
