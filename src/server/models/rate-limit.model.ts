import { type Model, Schema, type Types, model, models } from "mongoose";

/** A request counter for one client, one rule and one time window. */
export type RateLimitDoc = {
  _id: Types.ObjectId;
  key: string;
  count: number;
  expiresAt: Date;
};

const rateLimitSchema = new Schema<RateLimitDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});

// TTL index: counters delete themselves once their window is over.
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitModel: Model<RateLimitDoc> =
  (models.RateLimit as Model<RateLimitDoc> | undefined) ??
  model<RateLimitDoc>("RateLimit", rateLimitSchema);
