"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export async function registerUser(data: any) {
  const payload = data instanceof FormData ? Object.fromEntries(data) : data;
  const result = registerSchema.safeParse(payload);
  
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, email, password } = result.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "User with this email already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
      },
    });

    return { 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name } 
    };
  } catch (err) {
    console.error("Registration error:", err);
    return { error: "An unexpected error occurred during registration" };
  }
}

export async function loginUser(data: any) {
  const payload = data instanceof FormData ? Object.fromEntries(data) : data;
  const result = loginSchema.safeParse(payload);
  
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { email, password } = result.data;

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong during login" };
      }
    }
    // Auth.js redirects use an error, so we need to handle that if redirect: true was used.
    // Since redirect: false is used, it should return an error if it fails.
    return { error: "Invalid email or password" };
  }
}
