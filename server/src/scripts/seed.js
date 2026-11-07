import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/user.model.js';
import { hashPassword } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

async function seed() {
  try {
    await connectDB();
    logger.info('Connected to database for seeding');

    // 1. Seed Admin user
    const adminEmail = 'admin@vault.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminVault123!';
    let admin = await User.findOne({ email: adminEmail });

    if (!admin) {
      const passwordHash = await hashPassword(adminPassword);
      admin = await User.create({
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        isDisabled: false,
      });
      logger.info('Created default Admin user', { email: adminEmail });
    } else {
      logger.info('Admin user already exists', { email: adminEmail });
    }

    // 2. Seed Standard User
    const userEmail = 'user@vault.local';
    const userPassword = process.env.USER_PASSWORD || 'UserVault123!';
    let standardUser = await User.findOne({ email: userEmail });

    if (!standardUser) {
      const passwordHash = await hashPassword(userPassword);
      standardUser = await User.create({
        email: userEmail,
        passwordHash,
        role: 'USER',
        isDisabled: false,
      });
      logger.info('Created default Standard User', { email: userEmail });
    } else {
      logger.info('Standard user already exists', { email: userEmail });
    }

    logger.info('Seeding completed successfully');
  } catch (err) {
    logger.error('Seeding failed', { error: err.message, stack: err.stack });
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seed();

