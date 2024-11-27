import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import z from "zod";
import bcrypt from "bcrypt";
import { ContentModel, LinkModel, UserModel } from "./db";
import { auth } from "./middleware";
import { random } from "./utils";
import cors from "cors";
require("dotenv").config();

const app = express();
app.use(express.json());

app.use(cors());

const port = 3000;

app.post("/api/v1/signup", async (req, res) => {
  const inputSchema = z.object({
    username: z
      .string()
      .min(3, { message: "min 3 letters" })
      .max(10, { message: "max 10 letters" }),
    password: z
      .string()
      .min(8, { message: "min 8 letters" })
      .max(20, { message: "max 20 letters" })
      .regex(/\W/, { message: "must contain a special character" })
      .regex(/[A-Z]/, { message: "must contain an uppercase letter" })
      .regex(/[a-z]/, { message: "must contain a lowercase letter" }),
  });
  const validInputs = inputSchema.safeParse(req.body);

  if (!validInputs.success) {
    const errormessages = validInputs.error.errors.map((e) => e.message);
    res.status(411).json({
      message: "invalid format",
      error: errormessages,
    });
    return;
  }
  const { username, password } = req.body;
  const hashedpass = await bcrypt.hash(password, 7);
  try {
    const sameusername = await UserModel.findOne({
      username: username,
    });
    if (!sameusername) {
      await UserModel.create({
        username: username,
        password: hashedpass,
      });
      res.status(200).json({
        message: "user created successfully",
      });
    } else {
      res.status(403).json({
        warning: "username already taken",
      });
    }
  } catch (error) {
    console.log(`Error during signup ${error}`);
    res.status(500).json({
      warning: "error occured while creating a user",
    });
  }
});

app.post("/api/v1/signin", async (req, res) => {
  const { username, password } = req.body;

  const finduser = await UserModel.findOne({ username: username });

  if (!finduser) {
    res.status(403).json({
      warning: "user doesn't exist",
    });
  }
  if (finduser === null) {
    return;
  }
  if (finduser.password) {
    try {
      const hashedpass = await bcrypt.compare(password, finduser.password);
      if (hashedpass) {
        if (finduser._id) {
          const token = jwt.sign(
            { id: finduser._id },
            process.env.SECRET as string
          );

          res.status(200).json({
            message: "user signed in successfully",
            token: token,
          });
        }
      } else {
        res.status(403).json({
          warning: "wrong password",
        });
      }
    } catch (e) {
      res.status(400).json({
        warning: "internal server error ocuured ",
      });
    }
  } else {
    res.json({
      warning: "password not set for this user",
    });
  }
});

app.post("/api/v1/content", auth, async (req, res) => {
  const { link, title, type } = req.body;

  try {
    await ContentModel.create({
      title: title,
      type: type,
      link: link,
      tags: [],
      userId: req.userId,
    });
    res.status(200).json({
      message: "Content added successfully",
    });
  } catch (e) {
    console.log(`Error occurred ${e}`);
    res.status(401).json({
      warning: "error occured while adding content",
    });
  }
});

app.get("/api/v1/content", auth, async (req, res) => {
  const userId = req.userId;

  try {
    const content = await ContentModel.find({
      userId: userId,
    }).populate("userId", "username");
    res.status(200).json({
      content,
    });
  } catch (e) {
    console.log(`Error ocurerd while fetching contents ${e}`);
    res.status(400).json({
      warning: "error occurred while fetching content",
    });
  }
});

app.delete("/api/v1/content", auth, async (req, res) => {
  const contentId = req.body.contentId;

  try {
    await ContentModel.deleteMany({
      _id: contentId,
      userId: req.userId,
    });
    res.json({
      message: "content deleted successfully",
    });
  } catch (e) {
    console.log(`Error while deleting the content ${e}`);
    res.status(400).json({
      warning: "error occuured while deleting a content",
    });
  }
});

app.post("/api/v1/share", auth, async (req, res) => {
  const share = req.body.share;
  try {
    if (share) {
      const hash = random(15);
      await LinkModel.create({
        hash: hash,
        userId: req.userId,
      });

      res.status(200).json({
        message: `${hash}`,
      });
    } else {
      await LinkModel.deleteOne({
        userId: req.userId,
      });
      res.status(200).json({
        message: "your brain link is removed",
      });
    }
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message: "an unexpected error occured",
    });
  }
});

app.get("/api/v1/:sharelink", async (req, res) => {
  const hash = req.params.sharelink;
  try {
    const link = await LinkModel.findOne({
      hash,
    });

    if (!link) {
      res.status(400).json({
        message: "invalid link",
      });
      return;
    }

    const content = await ContentModel.find({
      userId: link.userId,
    });
    const user = await UserModel.findById(link.userId);

    if (!user) {
      res.status(400).json({
        message: "user is not found",
      });
      return;
    }

    res.status(200).json({
      username: user.username,
      content: content,
    });
  } catch (e) {
    console.log(e);
    res.status(400).json({
      message: "An error occurred while processing the sharelink",
    });
  }
});

const mongoUrl = process.env.MONGO_URL;

if (!mongoUrl) {
  throw new Error("MONGOURL is not defined in the environment variables");
}

const mongooseConnect = async () => {
  try {
    await mongoose.connect(mongoUrl);

    app.listen(port, () => {
      console.log(`Started listening on PORT ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

console.log("Mongo URL: ", mongoUrl);

mongooseConnect();
