import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/server/config/env";
import type { UserRole } from "@/shared/types";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const ISSUER = "food-order-app";
const ALGORITHM = "HS256";
const ROLES: readonly UserRole[] = ["customer", "admin"];

export type AccessClaims = {
  userId: string;
  role: UserRole;
};

export type RefreshClaims = {
  userId: string;
  /** The login session this token belongs to. */
  sessionId: string;
  /** Unique per token, so a rotated-out token can be told apart from the current one. */
  tokenId: string;
};

// Each token type has its own secret and its own audience, so one can never
// be accepted in place of the other.
const accessKey = () => new TextEncoder().encode(getEnv().JWT_ACCESS_SECRET);
const refreshKey = () => new TextEncoder().encode(getEnv().JWT_REFRESH_SECRET);

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuer(ISSUER)
    .setAudience("access")
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(accessKey());
}

/** Returns the claims, or null if the token is missing, expired, forged or malformed. */
export async function verifyAccessToken(
  token: string,
): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, accessKey(), {
      issuer: ISSUER,
      audience: "access",
      algorithms: [ALGORITHM],
    });
    const role = payload.role as UserRole;
    if (!payload.sub || !ROLES.includes(role)) return null;
    return { userId: payload.sub, role };
  } catch {
    return null;
  }
}

export async function signRefreshToken(claims: RefreshClaims): Promise<string> {
  return new SignJWT({ sid: claims.sessionId })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuer(ISSUER)
    .setAudience("refresh")
    .setSubject(claims.userId)
    .setJti(claims.tokenId)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(refreshKey());
}

export async function verifyRefreshToken(
  token: string,
): Promise<RefreshClaims | null> {
  try {
    const { payload } = await jwtVerify(token, refreshKey(), {
      issuer: ISSUER,
      audience: "refresh",
      algorithms: [ALGORITHM],
    });
    if (!payload.sub || !payload.jti || typeof payload.sid !== "string") {
      return null;
    }
    return { userId: payload.sub, sessionId: payload.sid, tokenId: payload.jti };
  } catch {
    return null;
  }
}
