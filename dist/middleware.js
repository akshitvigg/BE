"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const auth = (req, res, next) => {
    const token = req.headers["authorization"];
    const decodedToken = jsonwebtoken_1.default.verify(token, process.env.SECRET);
    if (decodedToken) {
        req.userId = decodedToken.id;
        next();
    }
    else {
        res.status(403).json({
            warning: "Your are not logged in",
        });
    }
};
exports.auth = auth;
