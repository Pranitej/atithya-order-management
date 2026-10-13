import { type Model, Schema, type Types, model, models } from "mongoose";

/**
 * One document per login. It remembers which refresh token is current, so a
 * token can be revoked (logout) or detected as replayed (rotation).
 */
export type SessionDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** SHA-256 of the current refresh token's id; the token itself is never stored. */
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const sessionSchema = new Schema<SessionDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index: MongoDB deletes a session once `expiresAt` has passed.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel: Model<SessionDoc> =
  (models.Session as Model<SessionDoc> | undefined) ??
  model<SessionDoc>("Session", sessionSchema);
