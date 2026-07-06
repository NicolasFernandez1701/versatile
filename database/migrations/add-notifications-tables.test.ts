import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

describe('notifications migration', () => {
  function findMigration(): string {
    const migrationsDir = resolve(__dirname);
    const files = readdirSync(migrationsDir).filter((file) =>
      file.endsWith('_add_notifications_tables.sql'),
    );
    expect(files).toHaveLength(1);
    return resolve(migrationsDir, files[0]);
  }

  it('should include the notification_type enum', () => {
    const path = findMigration();
    const sql = readFileSync(path, 'utf-8');

    expect(sql).toContain("CREATE TYPE public.notification_type AS ENUM");
    expect(sql).toContain("'daily_summary'");
    expect(sql).toContain("'pre_class_reminder'");
    expect(sql).toContain("'plan_expiration'");
  });

  it('should create the notifications table with required columns and constraints', () => {
    const path = findMigration();
    const sql = readFileSync(path, 'utf-8');

    expect(sql).toContain('CREATE TABLE public.notifications');
    expect(sql).toMatch(/\bid\s+UUID\s+PRIMARY KEY\s+DEFAULT\s+gen_random_uuid\(\)/i);
    expect(sql).toMatch(/\buser_id\s+UUID\s+NOT NULL\s+REFERENCES\s+public\.profiles\(id\)/i);
    expect(sql).toMatch(/\btype\s+notification_type\s+NOT NULL/i);
    expect(sql).toMatch(/\btitle\s+VARCHAR\(200\)\s+NOT NULL/i);
    expect(sql).toMatch(/\bbody\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/\breference_id\s+UUID/i);
    expect(sql).toMatch(/\bsent_at\s+TIMESTAMPTZ\s+NOT NULL/i);
    expect(sql).toMatch(/\bread_at\s+TIMESTAMPTZ/i);
    expect(sql).toMatch(
      /UNIQUE\s*\(\s*user_id\s*,\s*type\s*,\s*reference_id\s*,\s*DATE\s*\(\s*sent_at\s*\)\s*\)/i,
    );
  });

  it('should create the push_subscriptions table with required columns and constraints', () => {
    const path = findMigration();
    const sql = readFileSync(path, 'utf-8');

    expect(sql).toContain('CREATE TABLE public.push_subscriptions');
    expect(sql).toMatch(/\bendpoint\s+TEXT\s+NOT NULL\s+UNIQUE/i);
    expect(sql).toMatch(/\bp256dh_key\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/\bauth_key\s+TEXT\s+NOT NULL/i);
  });

  it('should enable RLS and define ownership policies', () => {
    const path = findMigration();
    const sql = readFileSync(path, 'utf-8');

    expect(sql).toContain('ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY');
    expect(sql).toMatch(/CREATE\s+POLICY\s+notifications_select_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+notifications_insert_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+notifications_update_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+push_subscriptions_select_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+push_subscriptions_insert_own/i);
    expect(sql).toMatch(/CREATE\s+POLICY\s+push_subscriptions_delete_own/i);
  });

  it('should create indexes for unread and sent_at queries', () => {
    const path = findMigration();
    const sql = readFileSync(path, 'utf-8');

    expect(sql).toMatch(/CREATE\s+INDEX\s+idx_notifications_user_unread/i);
    expect(sql).toMatch(/CREATE\s+INDEX\s+idx_notifications_user_sent/i);
    expect(sql).toMatch(/CREATE\s+INDEX\s+idx_push_subscriptions_user/i);
  });
});
