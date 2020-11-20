import {model as Model, Schema} from 'mongoose'

const UserSchema = new Schema({
    _id: String,
    name: String,
    email: String,
    verified: Boolean,
    fb_id: String,
    fb_access_token: String,
    fb_expires_date: Date,
    google_id: String,
    google_access_token: String,
    google_expires_date: Date,
    password: String,
    phone: String,
    gender: Boolean
});

const TimeIntervalSchema = new Schema({
    start: {
        h: {type: Number, min: 0, max: 23},
        m: {type: Number, min: 0, max: 59}
    },
    end: {
        h: {type: Number, min: 0, max: 23},
        m: {type: Number, min: 0, max: 59}
    }
}, {_id: false});

const OrderSchema = new Schema({
    _id: String,
    date: Date,
    orders: [{
        _id: {type: String, ref: "user", required: true},
        order_index: {type: Number, required: true},
        tables: Number,
        time: TimeIntervalSchema
    }]
});

const APIKeySchema = new Schema({
    _id: String,
    key: String,
    created_at: Date
});

const TokenSchema = new Schema({
    _id: {type: String, ref: "user"},
    token: String,
    created_at: {type: Date, default: Date.now, expires: 43200}
});


export const UserModel = Model('User', UserSchema, 'user');
export const OrderModel = Model('Order', OrderSchema, 'order');
export const APIKeyModel = Model('APIKey', APIKeySchema, 'apikeys');
export const TokenModel = Model('Token', TokenSchema, 'token');
