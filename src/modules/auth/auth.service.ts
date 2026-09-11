import argon2 from "argon2";
import { pool } from "../../config/db.js";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export const registerUser = async (
  input: RegisterInput
) => {

  const existingUser = await pool.query(
    `
    SELECT id
    FROM users
    WHERE email = $1
    `,
    [input.email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await argon2.hash(
    input.password
  );

  const result = await pool.query(
    `
    INSERT INTO users
      (name, email, password_hash)
    VALUES
      ($1, $2, $3)
    RETURNING
      id,
      name,
      email,
      role,
      created_at
    `,
    [
      input.name,
      input.email,
      passwordHash
    ]
  );

  return result.rows[0];
};