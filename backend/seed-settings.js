/**
 * Seed default system settings vào MongoDB.
 * Chạy: node seed-settings.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URL = process.env.MONGODB_URL;
const DB_NAME = 'minisocial';

const defaults = [
    // ── App General ──────────────────────────────────────────────────────────
    {
        setting_key: 'app_name',
        setting_value: 'MiniSocial',
        data_type: 'string',
        description: 'Tên ứng dụng hiển thị',
        is_public: true,
    },
    {
        setting_key: 'app_version',
        setting_value: '1.0.0',
        data_type: 'string',
        description: 'Phiên bản hiện tại',
        is_public: true,
    },
    {
        setting_key: 'maintenance_mode',
        setting_value: 'false',
        data_type: 'boolean',
        description: 'Bật/tắt chế độ bảo trì — khóa đăng nhập toàn hệ thống',
        is_public: true,
    },
    {
        setting_key: 'maintenance_message',
        setting_value: 'Hệ thống đang bảo trì, vui lòng quay lại sau.',
        data_type: 'string',
        description: 'Thông báo hiển thị khi đang bảo trì',
        is_public: true,
    },

    // ── Registration & Auth ───────────────────────────────────────────────────
    {
        setting_key: 'allow_registration',
        setting_value: 'true',
        data_type: 'boolean',
        description: 'Cho phép đăng ký tài khoản mới',
        is_public: false,
    },
    {
        setting_key: 'email_verification_required',
        setting_value: 'false',
        data_type: 'boolean',
        description: 'Yêu cầu xác minh email khi đăng ký',
        is_public: false,
    },
    {
        setting_key: 'jwt_expiry_hours',
        setting_value: '72',
        data_type: 'number',
        description: 'Thời gian hết hạn JWT (giờ)',
        is_public: false,
    },

    // ── User ─────────────────────────────────────────────────────────────────
    {
        setting_key: 'default_avatar_url',
        setting_value: '',
        data_type: 'string',
        description: 'URL avatar mặc định khi user chưa upload',
        is_public: true,
    },
    {
        setting_key: 'max_warnings_before_ban',
        setting_value: '3',
        data_type: 'number',
        description: 'Số cảnh cáo tối đa trước khi khóa tài khoản',
        is_public: false,
    },

    // ── Post & Upload ─────────────────────────────────────────────────────────
    {
        setting_key: 'max_post_length',
        setting_value: '5000',
        data_type: 'number',
        description: 'Số ký tự tối đa của 1 bài viết',
        is_public: true,
    },
    {
        setting_key: 'max_upload_size_mb',
        setting_value: '10',
        data_type: 'number',
        description: 'Dung lượng file upload tối đa (MB)',
        is_public: true,
    },
    {
        setting_key: 'allowed_image_types',
        setting_value: 'jpg,jpeg,png,webp,gif',
        data_type: 'string',
        description: 'Định dạng ảnh được phép upload (phân cách bởi dấu phẩy)',
        is_public: true,
    },
    {
        setting_key: 'max_images_per_post',
        setting_value: '10',
        data_type: 'number',
        description: 'Số ảnh tối đa trong 1 bài viết',
        is_public: true,
    },

    // ── Group ─────────────────────────────────────────────────────────────────
    {
        setting_key: 'max_group_members',
        setting_value: '500',
        data_type: 'number',
        description: 'Số thành viên tối đa mỗi nhóm',
        is_public: true,
    },
    {
        setting_key: 'max_groups_per_user',
        setting_value: '20',
        data_type: 'number',
        description: 'Số nhóm tối đa 1 user có thể tham gia',
        is_public: true,
    },

    // ── Moderation ────────────────────────────────────────────────────────────
    {
        setting_key: 'auto_moderation',
        setting_value: 'false',
        data_type: 'boolean',
        description: 'Tự động ẩn bài viết khi nhận đủ số report',
        is_public: false,
    },
    {
        setting_key: 'auto_hide_post_report_threshold',
        setting_value: '5',
        data_type: 'number',
        description: 'Số report cần thiết để tự động ẩn bài (nếu auto_moderation = true)',
        is_public: false,
    },

    // ── Notification ──────────────────────────────────────────────────────────
    {
        setting_key: 'notification_email_enabled',
        setting_value: 'false',
        data_type: 'boolean',
        description: 'Bật gửi email thông báo',
        is_public: false,
    },
    {
        setting_key: 'notification_push_enabled',
        setting_value: 'true',
        data_type: 'boolean',
        description: 'Bật push notification (Firebase)',
        is_public: false,
    },

    // ── Recommendation ────────────────────────────────────────────────────────
    {
        setting_key: 'recommendation_enabled',
        setting_value: 'true',
        data_type: 'boolean',
        description: 'Bật hệ thống gợi ý bài viết',
        is_public: false,
    },
    {
        setting_key: 'recommendation_top_n',
        setting_value: '20',
        data_type: 'number',
        description: 'Số bài viết tối đa trả về mỗi lần gọi /recommend',
        is_public: false,
    },
    {
        setting_key: 'ml_server_url',
        setting_value: 'http://localhost:8000',
        data_type: 'string',
        description: 'URL của Python ML server',
        is_public: false,
    },
];

async function main() {
    const client = new MongoClient(MONGODB_URL);
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db(DB_NAME);
    const col = db.collection('system_settings');

    let inserted = 0;
    let skipped = 0;

    for (const s of defaults) {
        const existing = await col.findOne({ setting_key: s.setting_key });
        if (existing) {
            console.log(`  SKIP  ${s.setting_key} (already exists)`);
            skipped++;
        } else {
            await col.insertOne({
                ...s,
                updated_by: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            console.log(`  ADD   ${s.setting_key} = "${s.setting_value}"`);
            inserted++;
        }
    }

    console.log(`\nDone: ${inserted} added, ${skipped} skipped.`);
    await client.close();
}

main().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
