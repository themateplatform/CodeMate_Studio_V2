import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      username: string;
      email?: string;
    };
  }
}

declare module "express" {
  interface Request {
    session: import("express-session").Session & Partial<import("express-session").SessionData>;
  }
}
