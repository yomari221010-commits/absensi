import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/pg";
import { getOfficeConfigFromEnv } from "@/lib/office-config";

let migrated = false;

export async function ensureDatabase() {
  if (!migrated) {
    await runMigrations();
    await seedIfEmpty();
    migrated = true;
  }
  await syncOfficeSettings();
}

async function syncOfficeSettings() {
  const office = getOfficeConfigFromEnv();
  const existing = await queryOne<{ id: number }>(`SELECT id FROM office_settings ORDER BY id LIMIT 1`);
  if (existing) {
    await query(
      `UPDATE office_settings SET name = $1, latitude = $2, longitude = $3, radius_meters = $4 WHERE id = $5`,
      [office.name, office.latitude, office.longitude, office.radiusMeters, existing.id]
    );
  } else {
    await query(
      `INSERT INTO office_settings (name, latitude, longitude, radius_meters) VALUES ($1, $2, $3, $4)`,
      [office.name, office.latitude, office.longitude, office.radiusMeters]
    );
  }
}

async function runMigrations() {
  await query(`
    CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS positions (
      id SERIAL PRIMARY KEY,
      department_id INTEGER REFERENCES departments(id),
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      employee_id TEXT NOT NULL UNIQUE,
      fullname TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      phone TEXT,
      department_id INTEGER REFERENCES departments(id),
      position_id INTEGER REFERENCES positions(id),
      role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
      profile_photo TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      join_date TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS office_settings (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      radius_meters DOUBLE PRECISION NOT NULL DEFAULT 100
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date_key TEXT NOT NULL,
      date_label TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      check_in_photo TEXT,
      check_out_photo TEXT,
      location TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      accuracy DOUBLE PRECISION,
      status TEXT NOT NULL,
      working_hours DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, date_key)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      leave_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      attachment TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by INTEGER REFERENCES users(id),
      decision_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reimbursement (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      amount DOUBLE PRECISION NOT NULL,
      receipt TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by INTEGER REFERENCES users(id),
      decision_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'system',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date_key DESC);
    CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_reimbursement_user ON reimbursement(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
  `);
}

async function seedIfEmpty() {
  const existing = await queryOne<{ id: number }>(`SELECT id FROM users LIMIT 1`);
  if (existing) return;

  const deptRows = await query<{ id: number; name: string }>(`
    INSERT INTO departments (name, description) VALUES
      ('Engineering', 'Tim pengembangan produk'),
      ('HR', 'Human Resources'),
      ('Finance', 'Keuangan'),
      ('Marketing', 'Pemasaran'),
      ('Operational', 'Operasional')
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name
  `);

  const engDept =
    deptRows.rows.find((d) => d.name === "Engineering")?.id ??
    (await queryOne<{ id: number }>(`SELECT id FROM departments WHERE name = 'Engineering'`))?.id;

  if (engDept) {
    const posCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM positions`
    );
    if (Number(posCount?.count ?? 0) === 0) {
      await query(
        `INSERT INTO positions (department_id, name) VALUES ($1, 'Staff'), ($1, 'Supervisor'), ($1, 'Manager')`,
        [engDept]
      );
    }
  }

  const staffPos = await queryOne<{ id: number }>(
    `SELECT id FROM positions WHERE name = 'Staff' LIMIT 1`
  );

  const { name: officeName, latitude: officeLat, longitude: officeLng, radiusMeters: officeRadius } =
    getOfficeConfigFromEnv();

  const officeExists = await queryOne(`SELECT id FROM office_settings LIMIT 1`);
  if (!officeExists) {
    await query(
      `INSERT INTO office_settings (name, latitude, longitude, radius_meters)
       VALUES ($1, $2, $3, $4)`,
      [officeName, officeLat, officeLng, officeRadius]
    );
  }

  const adminHash = await bcrypt.hash("admin123", 10);
  const empHash = await bcrypt.hash("employee123", 10);

  await query(
    `INSERT INTO users (employee_id, fullname, email, password, phone, department_id, position_id, role, status, join_date)
     VALUES
       ('ADM-001', 'Admin PAYROLLIN', 'admin@payrollin.id', $1, '+62 812-0000-0001', $3, $4, 'admin', 'active', '2024-01-01'),
       ('EMP-001', 'Budi Santoso', 'budi@payrollin.id', $2, '+62 812-3456-7890', $3, $4, 'employee', 'active', '2025-03-15')
     ON CONFLICT (email) DO NOTHING`,
    [adminHash, empHash, engDept ?? null, staffPos?.id ?? null]
  );
}
