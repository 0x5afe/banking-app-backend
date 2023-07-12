import {Router, Request, Response} from "express";
import {authenticateUser} from "../../UserUtils/Authenticator";
import {createUser} from "../../DatabaseUtils/DatabaseUtils";

const userRouter = Router()

userRouter.post('/login', (req: Request, res: Response) => {
    authenticateUser(req.body).then(response => {
        if(response.code === 1){
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        else if(response.code === 2){
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
        else if(response.code === 3){
            return res.status(200).json({ success: true, token: response.token });

        }
    })
})
userRouter.post('/register', (req: Request, res: Response) => {
    createUser(req.body).then(val=> {
        if(val === null){
            res.status(409).json({success: false, message: 'User with given login or email already exists'})
        }
        else {
            res.status(200).json({ success: true, message: 'Successfully created user' })
        }
    })
})

export default userRouter