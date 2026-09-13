import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db.js";
import { env } from "../../config/env.js";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface GetUsersInput {
  page: number;
  limit: number;
}

export const getAllUser = async ({ page, limit}: GetUsersInput) => {

  const offset = (page - 1) * limit;

  const usersResult = await pool.query(
    `SELECT 
     id,
     name,
     email,
     role,
     created_at,
     updated_at
    From users
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countResult = await pool.query(`SELECT COUNT(*) FROM users`);
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    users: usersResult.rows,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total/limit),
    },
  };
};

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

export const loginUser = async(
  email: string,
  password: string
) => {

  const result = await pool.query(
    `
    SELECT
      id,
      name,
      email,
      password_hash,
      role
    FROM users
    WHERE email = $1
    `,
    [email]
  );


  const user = result.rows[0];

  if(!user){
    throw new Error("INVALID_CREDENTIALS");
  }

  const passwordValid = await argon2.verify(
    user.password_hash,
    password
  )

  if(!passwordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const accessToken = jwt.sign(
    {
      sub: user.id,
      role: user.role
    },
    env.jwtSecret,
    {
      expiresIn: "15m"
    }
  );

  return {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};