import {NextFunction, Request, Response, Router} from "express";
import passport from "../../Utils/UserUtils/Authorizer";
import {
    checkIfAccountBelongsToUser,
    createTransaction,
    getAccByNumber,
    getTransactionsForUser,
} from "../../Utils/DatabaseUtils/DatabaseUtils";
import moment from "moment/moment";
import {getUserFromJwt} from "../../Utils/UserUtils/GeneralUtils";
import {createTransactionValidator} from "../../Validators/TransactionValidator";
import {validationResult} from "express-validator";
import {repeatsEveryTypes} from "../../Constants/RepeatsEveryTypes";


const transactionRouter = Router()

transactionRouter.post('/create', createTransactionValidator, passport.authenticate('jwt', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const authHeader: string | undefined = req.header('Authorization')

        const user = await getUserFromJwt(authHeader)
        if(!user){
            throw new Error('Could not verify user')
        }

        const accBelongsToUser = await checkIfAccountBelongsToUser({userId: user._id.toString(), bankAccNumber: req.body.sourceAccount})
        if(!accBelongsToUser){
            throw new Error('Incorrect account')
        }
        const receiverAccount = await getAccByNumber(req.body.destinationAccount)
        if(!receiverAccount) {
            throw new Error('Could not get the account')
        }
        const transaction = {
            transactionType: req.body.transactionType,
            amount: req.body.amount,
            currency: req.body.currency,
            sender: user._id.toString(),
            receiver: receiverAccount._id.toString(),
            date: +moment(),
            sourceAccount: req.body.sourceAccount,
            destinationAccount: req.body.destinationAccount,
            title: req.body.title,
            description: "",
            isRepeating: false,
            repeatsEvery: {
                interval: null,
                unit: repeatsEveryTypes.NOTREPEATING
            }
        }
        if(req.body.description) transaction.description = req.body.description
        if(req.body.date) transaction.date = req.body.date
        if(req.body.isRepeating) {
            transaction.isRepeating = req.body.isRepeating
            if(!req.body.repeatsEvery.interval || !req.body.repeatsEvery.unit) throw new Error('repeatsEvery cannot be null')
            transaction.repeatsEvery.interval = req.body.repeatsEvery.interval
            transaction.repeatsEvery.unit = req.body.repeatsEvery.unit
        }
        if(req.body.sourceAccount === req.body.destinationAccount) throw new Error('Accounts must differ')
        createTransaction(transaction).then(val => {
            if(val)
                return res.status(200).json({ success: true, message: 'Successfully created the transaction' })
        })
    }
    catch (e) {
        next(e)
    }
})
transactionRouter.get('/transactions', passport.authenticate('jwt', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader: string | undefined = req.header('Authorization')

        const user = await getUserFromJwt(authHeader)
        if(!user){
            throw new Error('Could not verify user')
        }
        getTransactionsForUser(user._id).then(val => {
            if(val === 1){
                return res.status(200).json({success: true, message: 'User has no transactions'})
            }
            else {
                return res.status(200).json({success: true, message: 'Successfully retrieved user transactions', transactions: [val]})
            }
        })
    }
    catch (e) {
        next(e)
    }
})

export default transactionRouter