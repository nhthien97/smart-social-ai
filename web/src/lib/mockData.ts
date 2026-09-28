// src/lib/mockData.ts

/**
 * Generate random last_login date within the past 90 days
 */
function generateRandomLastLogin(): Date {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 90); // 0-90 days ago
  const hoursAgo = Math.floor(Math.random() * 24); // 0-24 hours ago
  const minutesAgo = Math.floor(Math.random() * 60); // 0-60 minutes ago
  
  const lastLogin = new Date(now);
  lastLogin.setDate(lastLogin.getDate() - daysAgo);
  lastLogin.setHours(lastLogin.getHours() - hoursAgo);
  lastLogin.setMinutes(lastLogin.getMinutes() - minutesAgo);
  
  return lastLogin;
}

/**
 * Populate admin accounts with last_login data if missing
 * This is a temporary solution until backend properly sets last_login
 */
export function populateLastLoginData<T extends Record<string, any>>(accounts: T[]): T[] {
  return accounts.map((account) => {
    // If last_login is missing or null, generate a realistic one
    if (!account.last_login) {
      return {
        ...account,
        last_login: generateRandomLastLogin().toISOString(),
      };
    }
    return account;
  });
}

/**
 * Generate mock admin accounts for testing
 */
export function generateMockAdminAccounts(count: number = 5) {
  const roles = ['ADMIN', 'MODERATOR', 'VIEWER'];
  const statuses = ['ACTIVE', 'BLOCKED'];
  
  return Array.from({ length: count }, (_, i) => ({
    _id: `user_${i + 1}`,
    username: `admin${i + 1}`,
    email: `admin${i + 1}@example.com`,
    full_name: `Admin User ${i + 1}`,
    roles_admin: [roles[i % roles.length]],
    status: statuses[i % statuses.length],
    last_login: generateRandomLastLogin().toISOString(),
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }));
}
