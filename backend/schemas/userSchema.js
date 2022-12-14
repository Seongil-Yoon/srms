import mongoose from 'mongoose';
import {Item} from './itemSchema.js';
import {Rent} from './rentSchema.js';

const {Schema} = mongoose;
const userSchema = new Schema(
    {
        userNum: {
            type: Number,
            require: false,
            unique: true,
        },
        userId: {
            type: String,
            require: true,
            unique: true,
        },
        rentedItem: [
            {
                type: mongoose.Schema.Types.ObjectId,
                require: false,
                ref: 'Rent',
            },
        ],
        writedItem: [
            {
                type: mongoose.Schema.Types.ObjectId,
                require: false,
                ref: 'Item',
            },
        ],
        userName: {
            type: String,
            require: true,
        },
        userPassword: {
            type: String,
            require: true,
        },
        userEmail: {
            type: String,
            require: false,
        },
        userRole: {
            type: Object,
            require: true,
            default: {
                rent: true,
                read: false,
                write: false,
                edit: false,
                admin: false,
            },
        },
        userDept: {
            type: String,
            require: true,
            default: 'etc',
        },
        userPosition: {
            type: String,
            require: true,
            default: 'etc',
        },
        createdAt: {
            type: Date,
        },
        updatedAt: {
            type: Date,
            default: Date.now(),
        },
        refreshToken: {
            type: String,
            require: false,
        },
        isDelete: {
            type: Boolean,
            default: false,
        },
    },
    {
        collection: 'user',
    }
);
const User = mongoose.model('User', userSchema);
export {User};
