import {Router, Request, Response} from "express";
import {authenticateUser} from "../../UserUtils/Authenticator";
import {createUser, getUserByLogin} from "../../DatabaseUtils/DatabaseUtils";
import passport from "../../UserUtils/Authorizer";
import {User} from "../../models/UserInterface";
import {validateRequestProperties} from "../../Validators/Validators";
import cookie from 'cookie'

const userRouter = Router()

userRouter.post('/login', async (req: Request, res: Response) => {
    const expectedProperties = ['login', 'password']
    const validateRequest = await validateRequestProperties(req.body, expectedProperties);

    if (!validateRequest.success) {
        return res.status(500).json(validateRequest);
    }

    const response = await authenticateUser(req.body);

    if (response === null) {
        return res.status(401).json({ success: false, message: 'User not found or invalid password' });
    }

    return res.status(200).json({ success: true, token: response.token });
});

userRouter.post('/register', async (req: Request, res: Response) => {
    const expectedProperties = ['name', 'surname', 'email', 'address', 'phoneNumber', 'login', 'password']
    const validateRequest = await validateRequestProperties(req.body, expectedProperties)

    if(!validateRequest.success){
        return res.status(500).json(validateRequest)
    }

    createUser(req.body).then(val=> {
        if(val === null){
            return res.status(409).json({success: false, message: 'User with given login or email already exists'})
        }
        else {
            return res.status(200).json({ success: true, message: 'Successfully created user' })
        }
    })
})
userRouter.get('/user', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response) => {
    try {
        const response = await getUserByLogin(req.body.login);

        if (!response) {
            return res.status(500).json({ success: false, message: 'Could not get user details' });
        }

        const idCookie = cookie.serialize('userId', response._id.toString(), {
            httpOnly: true,
            maxAge: 3600 * 24 * 7 // wazne przez tydzien
        });

        const accountIdsCookies = cookie.serialize('accountIds', JSON.stringify(response.bankAccounts), {
            httpOnly: true,
            maxAge: 3600 * 24 * 7
        });

        const responseData = { // usuwam wrazliwe dane
            ...response.toObject(),
            _id: undefined,
            bankAccounts: undefined
        };

        res.setHeader('Set-Cookie', [idCookie, accountIdsCookies]); // Set cookies

        return res.status(200).json({
            message: 'Successfully retrieved the user details',
            responseData,
            success: true,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred while processing the request' });
    }
});
export default userRouter