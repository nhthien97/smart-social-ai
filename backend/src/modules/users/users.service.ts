
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.scheme';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);
    
    constructor(
        @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    ) { }

    async createUser(createUserDto: CreateUserDto): Promise<UserDocument> {
        const created_user = new this.userModel(createUserDto);
        return created_user.save();
    }

    async findById(id: String): Promise<UserDocument> {
        this.logger.debug(`Finding user by ID: ${id}`);
        const user = await this.userModel.findById(id).exec();
        
        if (!user) {
            this.logger.warn(`User not found with ID: ${id}`);
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return user;
    }

    // Lấy public profile của user khác (không có thông tin nhạy cảm)
    async getPublicProfile(id: string): Promise<any> {
        const user = await this.userModel
            .findById(id)
            .select('_id username full_name avatar_url cover_url bio job location gender birthdate created_at status')
            .exec();
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        // Ẩn tài khoản bị banned với user thường
        return user;
    }

    async findOneByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).select('+password').exec();
    }
    
    async findOneByUsername(username: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ username }).select('+password').exec();
    }

    // Admin methods
    async findAll(): Promise<UserDocument[]> {
        return this.userModel.find().select('-password').exec();
    }

    async deleteUser(id: string): Promise<void> {
        const result = await this.userModel.findByIdAndDelete(id).exec();
        if (!result) {
            this.logger.warn(`User not found for delete with ID: ${id}`);
            throw new NotFoundException(`User with ID ${id} not found`);
        }
    }

    // Block/Unblock user methods
    async blockUser(id: string): Promise<UserDocument> {
        const updatedUser = await this.userModel.findByIdAndUpdate(
            id,
            { status: 'BLOCKED' },
            { new: true }
        ).select('-password').exec();
        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return updatedUser;
    }

    async unblockUser(id: string): Promise<UserDocument> {
        const updatedUser = await this.userModel.findByIdAndUpdate(
            id,
            { status: 'ACTIVE' },
            { new: true }
        ).select('-password').exec();
        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return updatedUser;
    }

    // async getProfile(userId: string): Promise<User> {
    //     const user = await this.userModel.findById(userId).select('-password').exec();
    // }

    async updateProfile(userId: string, updateData: Partial<User>): Promise<UserDocument> {
        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password').exec();
        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }
        return updatedUser;
    }

    async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
        const user = await this.userModel.findById(userId).select('+password').exec();
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            throw new BadRequestException('Old password is incorrect');
        }

        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        await this.userModel.findByIdAndUpdate(userId, { password: hashedNewPassword });
    }

    async updateAvatar(userId: string, avatarUrl: string): Promise<UserDocument> {
        return this.updateProfile(userId, { avatar_url: avatarUrl });
    }

    // 🔧 TEMPORARY: Set user as admin
    async setUserAdminRole(userId: string): Promise<any> {
        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { roles_admin: ['ADMIN'] } },
            { new: true }
        ).select('-password').exec();

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        this.logger.log(`✅ User ${user.username} is now ADMIN`);
        return {
            message: 'User role updated to ADMIN',
            user: {
                username: user.username,
                email: user.email,
                roles_admin: user.roles_admin,
            }
        };
    }
}