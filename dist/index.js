"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = __importDefault(require("zod"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("./db");
const middleware_1 = require("./middleware");
const utils_1 = require("./utils");
const cors_1 = __importDefault(require("cors"));
require("dotenv").config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const port = 3000;
app.post("/api/v1/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const inputSchema = zod_1.default.object({
        username: zod_1.default
            .string()
            .min(3, { message: "min 3 letters" })
            .max(10, { message: "max 10 letters" }),
        password: zod_1.default
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
    const hashedpass = yield bcrypt_1.default.hash(password, 7);
    try {
        const sameusername = yield db_1.UserModel.findOne({
            username: username,
        });
        if (!sameusername) {
            yield db_1.UserModel.create({
                username: username,
                password: hashedpass,
            });
            res.status(200).json({
                message: "user created successfully",
            });
        }
        else {
            res.status(403).json({
                warning: "username already taken",
            });
        }
    }
    catch (error) {
        console.log(`Error during signup ${error}`);
        res.status(500).json({
            warning: "error occured while creating a user",
        });
    }
}));
app.post("/api/v1/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    const finduser = yield db_1.UserModel.findOne({ username: username });
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
            const hashedpass = yield bcrypt_1.default.compare(password, finduser.password);
            if (hashedpass) {
                if (finduser._id) {
                    const token = jsonwebtoken_1.default.sign({ id: finduser._id }, process.env.SECRET);
                    res.status(200).json({
                        message: "user signed in successfully",
                        token: token,
                    });
                }
            }
            else {
                res.status(403).json({
                    warning: "wrong password",
                });
            }
        }
        catch (e) {
            res.status(400).json({
                warning: "internal server error ocuured ",
            });
        }
    }
    else {
        res.json({
            warning: "password not set for this user",
        });
    }
}));
app.post("/api/v1/content", middleware_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { link, title, type } = req.body;
    try {
        yield db_1.ContentModel.create({
            title: title,
            type: type,
            link: link,
            tags: [],
            userId: req.userId,
        });
        res.status(200).json({
            message: "Content added successfully",
        });
    }
    catch (e) {
        console.log(`Error occurred ${e}`);
        res.status(401).json({
            warning: "error occured while adding content",
        });
    }
}));
app.get("/api/v1/content", middleware_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.userId;
    try {
        const content = yield db_1.ContentModel.find({
            userId: userId,
        }).populate("userId", "username");
        res.status(200).json({
            content,
        });
    }
    catch (e) {
        console.log(`Error ocurerd while fetching contents ${e}`);
        res.status(400).json({
            warning: "error occurred while fetching content",
        });
    }
}));
app.delete("/api/v1/content", middleware_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const contentId = req.body.contentId;
    try {
        yield db_1.ContentModel.deleteMany({
            _id: contentId,
            userId: req.userId,
        });
        res.json({
            message: "content deleted successfully",
        });
    }
    catch (e) {
        console.log(`Error while deleting the content ${e}`);
        res.status(400).json({
            warning: "error occuured while deleting a content",
        });
    }
}));
app.post("/api/v1/share", middleware_1.auth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const share = req.body.share;
    try {
        if (share) {
            const hash = (0, utils_1.random)(15);
            yield db_1.LinkModel.create({
                hash: hash,
                userId: req.userId,
            });
            res.status(200).json({
                message: `${hash}`,
            });
        }
        else {
            yield db_1.LinkModel.deleteOne({
                userId: req.userId,
            });
            res.status(200).json({
                message: "your brain link is removed",
            });
        }
    }
    catch (e) {
        console.log(e);
        res.status(500).json({
            message: "an unexpected error occured",
        });
    }
}));
app.get("/api/v1/:sharelink", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const hash = req.params.sharelink;
    try {
        const link = yield db_1.LinkModel.findOne({
            hash,
        });
        if (!link) {
            res.status(400).json({
                message: "invalid link",
            });
            return;
        }
        const content = yield db_1.ContentModel.find({
            userId: link.userId,
        });
        const user = yield db_1.UserModel.findById(link.userId);
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
    }
    catch (e) {
        console.log(e);
        res.status(400).json({
            message: "An error occurred while processing the sharelink",
        });
    }
}));
const mongoUrl = process.env.MONGO_URL;
if (!mongoUrl) {
    throw new Error("MONGOURL is not defined in the environment variables");
}
const mongooseConnect = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(mongoUrl);
        app.listen(port, () => {
            console.log(`Started listening on PORT ${port}`);
        });
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
});
console.log("Mongo URL: ", mongoUrl);
mongooseConnect();
