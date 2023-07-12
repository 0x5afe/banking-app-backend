import { Request, Response } from 'express';
import { User, UserModel } from "../models/UserInterface";
import { generateToken } from "./JWTgenerator";
import { Document } from 'mongoose';
const bcrypt = require('bcrypt')


interface AuthenticatedUser extends User {
    token: string;
}

/**
 *
 * @param login
 * @param password
 * @returns code: 1 - user not found, 2 - invalid password, 3 - success
 */
export const authenticateUser = async ({login, password}: { login: string, password: string }) => {

    const user = await UserModel.findOne({ login });

    if (!user) {
        return {code: 1};
    }

    const validatePassword = await bcrypt.compare(password, user.password);

    if (!validatePassword) {
        return {code: 2};
    }

    const token = generateToken(user);

    const authenticatedUser: AuthenticatedUser & Document<any> = {
        ...user.toObject(),
        token,
    } as AuthenticatedUser & Document<any>;
    return {code: 3, token: authenticatedUser.token}
};
