import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db as rawDb } from '@/db';
const db = rawDb as NonNullable<typeof rawDb>;
import { customerUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ROLE_PERMISSIONS, PermissionType, RoleType } from './rbac';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: 'SUPERADMIN' | 'INVENTORY_DEPARTMENT' | 'ACCOUNTS_DEPARTMENT' | 'CLIENT_ADMIN' | 'CLIENT_BRANCH_USER' | 'RETAIL';
  active: boolean;
  customerId?: string; // Links to customer company details
  branchId?: string; // Links to branch details
  permissions: string[];
}

const SALT = 'ljk_salt_2026';

// Predefined Fixed System Accounts with Secure Password Hashes
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
    role: 'ACCOUNTS_DEPARTMENT' as const,
    passwordHash: '91603527c5ef50f016d40e76d57c2347a029742545cc7c3aa41d1d2899a6ca85', // Factory@99
    active: true
  },
  {
    id: 'b1100000-0000-0000-0000-000000000003',
    username: 'inventory',
    fullName: 'Inventory Department',
    role: 'INVENTORY_DEPARTMENT' as const,
    passwordHash: '91603527c5ef50f016d40e76d57c2347a029742545cc7c3aa41d1d2899a6ca85', // Factory@99
    active: true
  },
  {
    id: 'b1100000-0000-0000-0000-000000000004',
    username: 'retail',
    fullName: 'Retail Department',
    role: 'INVENTORY_DEPARTMENT' as const, // Map to inventory department or keep retail
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

  // 1. Attempt base64 JSON parsing first
  try {
    const decoded = Buffer.from(sessionVal, 'base64').toString('utf-8');
    const session = JSON.parse(decoded) as UserSession;
    if (session && session.id) {
      return session;
    }
  } catch (err) {
    // Fallback to legacy string decoding
  }

  // 2. Legacy Lookups
  // 2.1 Check Predefined Accounts
  const account = FIXED_ACCOUNTS.find(acc => acc.username === sessionVal || acc.username.toLowerCase() === sessionVal.toLowerCase());
  if (account) {
    return {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      active: account.active,
      permissions: ROLE_PERMISSIONS[account.role as RoleType] || []
    };
  }

  // 2.2 Check Database or Mock JSON
  try {
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
        role: 'CLIENT_ADMIN',
        active: u.active,
        customerId: u.customerId,
        permissions: ROLE_PERMISSIONS.CLIENT_ADMIN
      };
    }

    const { branchUsers: dbBranchUsers } = await import('@/db/schema');
    const resB = await db.select()
      .from(dbBranchUsers)
      .where(and(eq(dbBranchUsers.id, sessionVal), eq(dbBranchUsers.active, true)))
      .limit(1);

    if (resB.length > 0) {
      const bu = resB[0];
      return {
        id: bu.id,
        username: bu.username,
        fullName: bu.fullName,
        role: 'CLIENT_BRANCH_USER',
        active: bu.active,
        customerId: bu.customerId,
        branchId: bu.branchId,
        permissions: ROLE_PERMISSIONS.CLIENT_BRANCH_USER
      };
    }
  } catch (err) {
    console.error('Session retrieval DB error:', err);
  }

  return null;
}

async function writeSessionCookie(session: UserSession) {
  const cookieStore = await cookies();
  const serialized = Buffer.from(JSON.stringify(session)).toString('base64');
  cookieStore.set('ljk_user', serialized, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 // 24 hours session
  });
}

export async function authenticateUser(usernameOrEmail: string, password: string): Promise<UserSession | null> {
  const cleanInput = usernameOrEmail.trim();
  const inputHash = hashPassword(password);

  // 1. Predefined system account check first (username or email matching)
  const account = FIXED_ACCOUNTS.find(
    acc => acc.username.toLowerCase() === cleanInput.toLowerCase()
  );
  if (account && inputHash === account.passwordHash) {
    const session: UserSession = {
      id: account.id,
      username: account.username,
      fullName: account.fullName,
      role: account.role,
      active: account.active,
      permissions: ROLE_PERMISSIONS[account.role as RoleType] || []
    };
    await writeSessionCookie(session);
    return session;
  }

  // 2. Client side users (Admin or Branch User)
  try {
    // Database check - Client Admin
    const resCu = await db.select()
      .from(customerUsers)
      .where(
        and(
          eq(customerUsers.active, true),
          cleanInput.includes('@')
            ? eq(customerUsers.email, cleanInput.toLowerCase())
            : eq(customerUsers.username, cleanInput)
        )
      )
      .limit(1);

    if (resCu.length > 0) {
      const cu = resCu[0];
      if (cu.passwordHash === inputHash) {
        const session: UserSession = {
          id: cu.id,
          username: cu.username,
          fullName: cu.fullName,
          role: 'CLIENT_ADMIN',
          active: cu.active,
          customerId: cu.customerId,
          permissions: ROLE_PERMISSIONS.CLIENT_ADMIN
        };
        await writeSessionCookie(session);
        return session;
      }
    }

    // Database check - Branch User
    const { branchUsers: dbBranchUsers } = await import('@/db/schema');
    const resBu = await db.select()
      .from(dbBranchUsers)
      .where(
        and(
          eq(dbBranchUsers.active, true),
          cleanInput.includes('@')
            ? eq(dbBranchUsers.email, cleanInput.toLowerCase())
            : eq(dbBranchUsers.username, cleanInput)
        )
      )
      .limit(1);

    if (resBu.length > 0) {
      const bu = resBu[0];
      if (bu.passwordHash === inputHash) {
        const session: UserSession = {
          id: bu.id,
          username: bu.username,
          fullName: bu.fullName,
          role: 'CLIENT_BRANCH_USER',
          active: bu.active,
          customerId: bu.customerId,
          branchId: bu.branchId,
          permissions: ROLE_PERMISSIONS.CLIENT_BRANCH_USER
        };
        await writeSessionCookie(session);
        return session;
      }
    }
  } catch (err) {
    console.error('B2B Customer/Branch user auth DB error:', err);
  }

  return null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('ljk_user');
}
