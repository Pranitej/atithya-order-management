import { createHash, randomUUID } from "node:crypto";
import { Types, isValidObjectId } from "mongoose";
import { errors } from "@/server/http/errors";
import { SessionModel } from "@/server/models/session.model";
import { type UserDoc, UserModel } from "@/server/models/user.model";
import type { LoginInput, RegisterInput } from "@/shared/schemas";
import type { UserDTO } from "@/shared/types";
import { hashPassword, verifyPassword } from "./password";
import {
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./tokens";

export type AuthTokens = { accessToken: string; refreshToken: string };
export type AuthResult = { user: UserDTO; tokens: AuthTokens };

type UserRecord = Pick<UserDoc, "_id" | "name" | "email" | "role">;

const DUPLICATE_KEY = 11000;

export function toUserDTO(user: UserRecord): UserDTO {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await UserModel.create({
      name: input.name,
      email: input.email,
      passwordHash,
      // Never taken from the request: accounts always start as customers.
      role: "customer",
    });
    return await startSession(user);
  } catch (error) {
    if ((error as { code?: number }).code === DUPLICATE_KEY) {
      throw errors.conflict("EMAIL_TAKEN", "An account with this email already exists");
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await UserModel.findOne({ email: input.email }).lean();

  // Always run a bcrypt comparison, even for an unknown email, so response
  // time does not reveal which emails have accounts.
  const matches = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await placeholderHash()),
  );

  if (!user || !matches) throw errors.invalidCredentials();
  return startSession(user);
}

/**
 * Exchanges a refresh token for a new pair and retires the old one. If a
 * retired token ever comes back, two parties hold it, so the whole session
 * is ended and everyone has to sign in again.
 */
export async function refreshSession(
  refreshToken: string | undefined,
): Promise<AuthResult> {
  const claims = refreshToken ? await verifyRefreshToken(refreshToken) : null;
  if (!claims || !isValidObjectId(claims.sessionId)) throw errors.unauthenticated();

  const nextTokenId = randomUUID();

  // Matching on the current token hash makes rotation atomic: of two
  // simultaneous refreshes with the same token, only one can win.
  const session = await SessionModel.findOneAndUpdate(
    {
      _id: claims.sessionId,
      userId: claims.userId,
      tokenHash: hashTokenId(claims.tokenId),
    },
    { tokenHash: hashTokenId(nextTokenId), expiresAt: sessionExpiry() },
  );

  if (!session) {
    await SessionModel.deleteOne({ _id: claims.sessionId });
    throw errors.unauthenticated();
  }

  const user = await UserModel.findById(claims.userId).lean();
  if (!user) {
    await SessionModel.deleteOne({ _id: claims.sessionId });
    throw errors.unauthenticated();
  }

  return {
    user: toUserDTO(user),
    tokens: await issueTokens(user, claims.sessionId, nextTokenId),
  };
}

export async function endSession(refreshToken: string | undefined): Promise<void> {
  const claims = refreshToken ? await verifyRefreshToken(refreshToken) : null;
  if (!claims || !isValidObjectId(claims.sessionId)) return;

  await SessionModel.deleteOne({ _id: claims.sessionId, userId: claims.userId });
}

export async function getUserById(userId: string): Promise<UserDTO | null> {
  if (!isValidObjectId(userId)) return null;
  const user = await UserModel.findById(userId).lean();
  return user ? toUserDTO(user) : null;
}

async function startSession(user: UserRecord): Promise<AuthResult> {
  const sessionId = new Types.ObjectId();
  const tokenId = randomUUID();

  await SessionModel.create({
    _id: sessionId,
    userId: user._id,
    tokenHash: hashTokenId(tokenId),
    expiresAt: sessionExpiry(),
  });

  return {
    user: toUserDTO(user),
    tokens: await issueTokens(user, sessionId.toString(), tokenId),
  };
}

async function issueTokens(
  user: UserRecord,
  sessionId: string,
  tokenId: string,
): Promise<AuthTokens> {
  const userId = user._id.toString();
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ userId, role: user.role }),
    signRefreshToken({ userId, sessionId, tokenId }),
  ]);
  return { accessToken, refreshToken };
}

function sessionExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

function hashTokenId(tokenId: string): string {
  return createHash("sha256").update(tokenId).digest("hex");
}

let placeholder: Promise<string> | undefined;

function placeholderHash(): Promise<string> {
  placeholder ??= hashPassword(randomUUID());
  return placeholder;
}
