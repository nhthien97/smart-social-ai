// Script kiểm tra và tạo admin user
// Run: node check-admin.js

const mongoose = require('mongoose');

// Thay YOUR_MONGODB_URI bằng connection string của bạn
const MONGODB_URI = 'mongodb+srv://your-connection-string';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({
      username: String,
      email: String,
      roles_admin: [String],
      roles_group: [String],
    }));

    // Kiểm tra các admin users
    const admins = await User.find({ roles_admin: 'ADMIN' });
    console.log('\n📊 Admin users:', admins.length);
    admins.forEach(admin => {
      console.log(`  - ${admin.username} (${admin.email})`);
      console.log(`    roles_admin:`, admin.roles_admin);
    });

    // Cập nhật user thành admin (thay YOUR_EMAIL)
    const YOUR_EMAIL = 'admin@example.com'; // <-- Sửa email này
    const updated = await User.findOneAndUpdate(
      { email: YOUR_EMAIL },
      { $set: { roles_admin: ['ADMIN'] } },
      { new: true }
    );

    if (updated) {
      console.log('\n✅ Updated user to ADMIN:', updated.username);
      console.log('   roles_admin:', updated.roles_admin);
    } else {
      console.log('\n❌ User not found with email:', YOUR_EMAIL);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
