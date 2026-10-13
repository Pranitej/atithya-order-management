import { type Model, Schema, type Types, model, models } from "mongoose";
import type { UserRole } from "@/shared/types";

export type UserDoc = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true },
    // The unique index is what actually prevents duplicate accounts; a
    // check-then-insert in application code would race.
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
      default: "customer",
    },
  },
  { timestamps: true },
);

export const UserModel: Model<UserDoc> =
  (models.User as Model<UserDoc> | undefined) ??
  model<UserDoc>("User", userSchema);
