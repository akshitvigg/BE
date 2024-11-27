import mongoose, { Types } from "mongoose";
import { Schema } from "mongoose";

const userSchema = new Schema({
  username: { type: String, require: true, unique: true },
  password: { type: String, require: true },
});

const contentSchema = new Schema({
  title: { type: String, require: true },
  type: { type: String, require: true },
  link: { type: String, require: true },
  tags: [{ type: Types.ObjectId, ref: "tag" }],
  userId: { type: Types.ObjectId, ref: "user", require: true },
});

const linkSchema = new Schema({
  hash: { type: String, require: true },
  userId: {
    type: mongoose.Types.ObjectId,
    unique: true,
    require: true,
    ref: "user",
  },
});

export const ContentModel = mongoose.model("content", contentSchema);
export const UserModel = mongoose.model("user", userSchema);
export const LinkModel = mongoose.model("sharelinks", linkSchema);
