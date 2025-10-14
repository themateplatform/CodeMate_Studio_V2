import { Router } from 'express';
const router = Router();

// Return the current user based on Authorization: Bearer <access_token>
router.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    // Lazy-load supabase client utilities so server can start even if env vars are missing
    try {
      const mod = await import('../supabaseClient');
      const { verifySupabaseJWT, supabaseAdmin } = mod;
      const user = await verifySupabaseJWT(token);
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      // Optionally fetch extended user profile from users table
      try {
        const { data } = await supabaseAdmin.from('users').select('*').eq('id', user.id).single();
        const safeUser = data || { id: user.id, email: user.email };
        return res.json(safeUser);
      } catch (err) {
        // If users table doesn't exist or query fails, fallback to basic user
        return res.json({ id: user.id, email: user.email });
      }
    } catch (importErr) {
      console.warn('/api/auth/user supabase client not configured:', importErr.message || importErr);
      return res.status(500).json({ error: 'Supabase not configured on server' });
    }
  } catch (error) {
    console.error('/api/auth/user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
import type { Request, Response, Express, RequestHandler } from "express";
import { db } from "../db";
import { users, oauthConnections } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import "../types/session"; // Import session type declarations

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginBody {
  username: string;
  password: string;
}

export function registerAuthRoutes(app: Express, csrfProtection: RequestHandler): void {
  /**
   * POST /api/auth/register - Register new user
   */
  app.post("/api/auth/register", csrfProtection, async (req: Request, res: Response) => {
    try {
      const { username, email, password, firstName, lastName } = req.body as RegisterBody;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          message: "Username, email, and password are required"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters"
        });
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(409).json({
          message: "Username already exists"
        });
      }

      const [existingEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingEmail) {
        return res.status(409).json({
          message: "Email already registered"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          role: "member",
          isActive: true,
        })
        .returning();

      // Create session
      req.session.user = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email || undefined,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        res.status(201).json({
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
          }
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  /**
   * POST /api/auth/login - Login user
   */
  app.post("/api/auth/login", csrfProtection, async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body as LoginBody;

      if (!username || !password) {
        return res.status(400).json({
          message: "Username and password are required"
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({
          message: "Invalid username or password"
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          message: "Account is deactivated"
        });
      }

      // Verify password
      if (!user.password) {
        return res.status(401).json({
          message: "Password authentication not available for this account"
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          message: "Invalid username or password"
        });
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Create session
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email || undefined,
      };

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            githubUsername: user.githubUsername,
          }
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  /**
   * POST /api/auth/logout - Logout user
   */
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  /**
   * GET /api/auth/session - Get current session
   */
  app.get("/api/auth/session", (req: Request, res: Response) => {
    if (req.session?.user) {
      res.json({
        authenticated: true,
        user: req.session.user
      });
    } else {
      res.json({
        authenticated: false,
        user: null
      });
    }
  });

  /**
   * GET /api/auth/user - Get current user details
   */
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    try {
      if (!req.session?.user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          githubUsername: users.githubUsername,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, req.session.user.id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  /**
   * PUT /api/auth/user - Update current user
   */
  app.put("/api/auth/user", csrfProtection, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { firstName, lastName, email } = req.body;

      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) {
        // Check if email is already taken
        const [existingEmail] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, email),
            eq(users.id, req.session.user.id)
          ))
          .limit(1);

        if (existingEmail) {
          return res.status(409).json({ message: "Email already in use" });
        }
        updateData.email = email;
        updateData.emailVerified = false;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      updateData.updatedAt = new Date();

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, req.session.user.id))
        .returning();

      // Update session if email changed
      if (updateData.email) {
        req.session.user.email = updateData.email;
        req.session.save(() => {});
      }

      res.json({
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
        }
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  /**
   * POST /api/auth/change-password - Change password
   */
  app.post("/api/auth/change-password", csrfProtection, async (req: Request, res: Response) => {
    try {
      if (!req.session?.user?.id) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Current password and new password are required"
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message: "New password must be at least 8 characters"
        });
      }

      // Get user with password
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.user.id))
        .limit(1);

      if (!user || !user.password) {
        return res.status(400).json({
          message: "Password authentication not available"
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({
          message: "Current password is incorrect"
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, req.session.user.id));

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}
