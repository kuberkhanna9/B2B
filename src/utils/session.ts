import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/db';
import { customerUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: 'SUPERADMIN' | 'ACCOUNTS' | 'INVENTORY' | 'RETAIL' | 'B2B_CUSTOMER';
  active: boolean;
  customerId?: string; // Links to customer company details
}

const SALT = 'ljk_salt_2026';

// Predefined Fixed System Accounts with Secure Password Hashes (matching Inventory)
export const FIXED_ACCOUNTS = [
  {
    id: 'b1100000-0000-0000-0000-000000000001',
    username: 'Khanna',
    fullName: 'Super Admin',
    role: 'SUPERADMIN' as const,
    passwordHash: '4c4f45b369fd79083ba08e16049c07d1207850f4e69c25e1b7ec95bc0b081a5d', // Kushy@2026
    active: true
  },
  {
    id: 'b1100000-0000-0000-0000-000000000002',
    username: 'accounts',
    fullName: 'Accounts Department',
    role: 'ACCOUNTS' as const,
    passwordHash: '91603527c5ef50f016d40e76d57c2347a029742545cc7c3aa41d1d2899a6ca85', // Factory@99
    active: true
  },
  {
    id: 'b1100000-0000-0000-0000-000000000003',
    username: 'inventory',
    fullName: 'Inventory Department',
    role: 'INVENTORY' as const,
    passwordHash: '91603527c5ef50f016d40e76d57c2347a029742545cc7c3aa41d1d2899a6ca85', // Factory@99
    active: true
  },
  {
    id: 'b1100000-0000-0000-0000-000000000004',
    username: 'retail',
    fullName: 'Retail Department',
    role: 'RETAIL' as const,
    passwordHash: '91603527c5ef50f016d40e76d57c2347a029742545cc7c3aa41d1d2899a6ca85', // Factory@99
    active: true
  }
];

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex');
}

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get('ljk_user')?.value;
  if (!sessionVal) return null;

  // 1. Check Predefined Accounts
  const account = FIXED_ACCOUNTS.find(acc => acc.username === sessionVal);
  if (account) {
    return {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      active: account.active
    };
  }

  // 2. Query Database for Customer Users
  try {
    if (!db) {
      const { jsonDb } = await import('./jsonDb');
      const users = jsonDb.getCustomerUsers();
      const u = users.find(user => user.id === sessionVal && user.active);
      if (u) {
        return {
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: 'B2B_CUSTOMER',
          active: u.active,
          customerId: u.customerId
        };
      }
      return null;
    }
    const res = await db.select()
      .from(customerUsers)
      .where(and(eq(customerUsers.id, sessionVal), eq(customerUsers.active, true)))
      .limit(1);

    if (res.length > 0) {
      const u = res[0];
      return {
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: 'B2B_CUSTOMER',
        active: u.active,
        customerId: u.customerId
      };
    }
  } catch (err) {
    console.error('Session retrieval DB error:', err);
  }

  return null;
}

export async function authenticateUser(usernameOrEmail: string, password: string): Promise<UserSession | null> {
  const cleanInput = usernameOrEmail.trim();
  const inputHash = hashPassword(password);

  // 1. Check if email-based customer login
  if (cleanInput.includes('@')) {
    try {
      if (!db) {
        const { jsonDb } = await import('./jsonDb');
        const users = jsonDb.getCustomerUsers();
        const u = users.find(user => user.email.toLowerCase() === cleanInput.toLowerCase() && user.active);
        if (u) {
          if (u.passwordHash === inputHash) {
            const cookieStore = await cookies();
            cookieStore.set('ljk_user', u.id, {
              path: '/',
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 // 24 hours session
            });

            return {
              id: u.id,
              username: u.username,
              fullName: u.fullName,
              role: 'B2B_CUSTOMER',
              active: u.active,
              customerId: u.customerId
            };
          }
        }
        return null;
      }
      const res = await db.select()
        .from(customerUsers)
        .where(and(eq(customerUsers.email, cleanInput.toLowerCase()), eq(customerUsers.active, true)))
        .limit(1);

      if (res.length > 0) {
        const u = res[0];
        if (u.passwordHash === inputHash) {
          const cookieStore = await cookies();
          cookieStore.set('ljk_user', u.id, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 // 24 hours session
          });

          return {
            id: u.id,
            username: u.username,
            fullName: u.fullName,
            role: 'B2B_CUSTOMER',
            active: u.active,
            customerId: u.customerId
          };
        }
      }
    } catch (err) {
      console.error('B2B Customer auth DB error:', err);
    }
    return null;
  }

  // 2. Check standard system account
  const account = FIXED_ACCOUNTS.find(acc => acc.username.toLowerCase() === cleanInput.toLowerCase());
  if (!account) return null;

  if (inputHash !== account.passwordHash) return null;

  const cookieStore = await cookies();
  cookieStore.set('ljk_user', account.username, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours session
  });

  return {
    id: account.id,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    active: account.active
  };
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('ljk_user');
}
