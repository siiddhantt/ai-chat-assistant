import { Request, Response, Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError, AuthPayload } from "../../types/index.js";
import { config } from "../../config/env.js";
import {
  CustomerRepository,
  UserRepository,
  TenantRepository,
} from "../persistence/tenant.repository.js";
import { authMiddleware } from "./middleware.js";

const router = Router();

const userRepo = new UserRepository();
const tenantRepo = new TenantRepository();
const customerRepo = new CustomerRepository();

function createToken(payload: AuthPayload): string {
  if (!config.jwtSecret) {
    throw new AppError(500, "JWT secret not configured", "CONFIG_ERROR");
  }
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

router.post("/owner/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, businessName, businessSlug } = req.body;

    if (!email || !password || !name || !businessName || !businessSlug) {
      throw new AppError(400, "All fields are required", "MISSING_FIELDS");
    }

    if (password.length < 8) {
      throw new AppError(
        400,
        "Password must be at least 8 characters",
        "WEAK_PASSWORD"
      );
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(businessSlug)) {
      throw new AppError(
        400,
        "Business slug can only contain lowercase letters, numbers, and hyphens",
        "INVALID_SLUG"
      );
    }

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, "Email already registered", "EMAIL_EXISTS");
    }

    const existingTenant = await tenantRepo.findBySlug(businessSlug);
    if (existingTenant) {
      throw new AppError(409, "Business slug already taken", "SLUG_EXISTS");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await userRepo.create({
      email,
      passwordHash,
      name,
      role: "owner",
      authProvider: "credentials",
    });

    const tenant = await tenantRepo.create({
      slug: businessSlug,
      name: businessName,
      ownerId: user.id,
      settings: {
        welcomeMessage: `Welcome to ${businessName}! How can we help you today?`,
      },
    });

    const token = createToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    });
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ error: error.message, code: error.code });
    } else {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", code: "INTERNAL_ERROR" });
    }
  }
});

router.post("/owner/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(
        400,
        "Email and password are required",
        "MISSING_CREDENTIALS"
      );
    }

    const user = await userRepo.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    if (user.role !== "owner" && user.role !== "admin") {
      throw new AppError(
        403,
        "Access denied. Use customer login.",
        "WRONG_LOGIN_TYPE"
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    const tenant = await tenantRepo.findByOwnerId(user.id);
    if (!tenant) {
      throw new AppError(
        404,
        "No business found for this account",
        "NO_TENANT"
      );
    }

    const token = createToken({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    });
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ error: error.message, code: error.code });
    } else {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", code: "INTERNAL_ERROR" });
    }
  }
});

router.post("/customer/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, visitorId } = req.body;

    if (!email || !password) {
      throw new AppError(
        400,
        "Email and password are required",
        "MISSING_FIELDS"
      );
    }

    if (password.length < 8) {
      throw new AppError(
        400,
        "Password must be at least 8 characters",
        "WEAK_PASSWORD"
      );
    }

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, "Email already registered", "EMAIL_EXISTS");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await userRepo.create({
      email,
      passwordHash,
      name,
      role: "customer",
      authProvider: "credentials",
      fingerprintId: visitorId,
    });

    if (visitorId) {
      await customerRepo.linkAllByVisitorToUser(visitorId, user.id);
    }

    const token = createToken({ userId: user.id, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ error: error.message, code: error.code });
    } else {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", code: "INTERNAL_ERROR" });
    }
  }
});

router.post("/customer/login", async (req: Request, res: Response) => {
  try {
    const { email, password, visitorId } = req.body;

    if (!email || !password) {
      throw new AppError(
        400,
        "Email and password are required",
        "MISSING_CREDENTIALS"
      );
    }

    const user = await userRepo.findByEmail(email);
    if (!user || !user.passwordHash) {
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    if (user.role !== "customer") {
      throw new AppError(
        403,
        "Access denied. Use owner login.",
        "WRONG_LOGIN_TYPE"
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
    }

    if (visitorId) {
      await customerRepo.linkAllByVisitorToUser(visitorId, user.id);
    }

    const token = createToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ error: error.message, code: error.code });
    } else {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", code: "INTERNAL_ERROR" });
    }
  }
});

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload;

    const user = await userRepo.findById(auth.userId);
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const response: Record<string, unknown> = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };

    if (auth.tenantId) {
      const tenant = await tenantRepo.findById(auth.tenantId);
      if (tenant) {
        response.tenant = {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          settings: tenant.settings,
        };
      }
    }

    if (user.role === "customer") {
      const customers = await customerRepo.findByUserId(user.id);
      response.linkedTenants = customers.length;
    }

    res.json(response);
  } catch (err) {
    const error = err as AppError;
    if (error instanceof AppError) {
      res
        .status(error.statusCode)
        .json({ error: error.message, code: error.code });
    } else {
      console.error("Unexpected error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", code: "INTERNAL_ERROR" });
    }
  }
});

export default router;
