import { Injectable } from '@nestjs/common'
import { UserModel as User } from '../../models/db.models'
import {Utils} from '../utils'
import {v5 as uuid} from 'uuid'
import {randomBytes, scryptSync} from 'crypto'

export interface IUserDTO {
    _id?: string,
    name?: string,
    email?: string,
    verified?: boolean,
    fb_id?: String,
    fb_access_token?: string,
    fb_expires_date?: Date,
    fb_expires_in?: number,
    google_id?: string,
    google_access_token?: string,
    google_expires_date?: Date,
    google_expires_in?: number,
    password?: string,
    phone?: string,
    gender?: boolean,
    logged_in?: boolean
}

export class UserStatus {
    static CREATED = 2001;
    static EDITED = 2002;
    static DELETED = 2003;
    static RETRIEVED = 2004;
    static EXISTED = 2005;
    static RETRIEVAL_ERROR = 2006;
    static SAVING_ERROR = 2007;
    static EDIT_ERROR = 2008;
    static DELETE_ERROR = 2009;
    static INVALID_USER_ID = 2010;
    static INVALID_CONTENT_TYPE = 2011;
    static CREATION_ERROR = 2012;
}

@Injectable()
export class UserService {

    async getUsersInfo(userInfo : IUserDTO, callback: (userStatus: UserStatus, users: Array<IUserDTO>) => void) {
        User.find(userInfo).lean().then(users => {
            callback(UserStatus.RETRIEVED, users);
        }).catch(e => {
            callback(UserStatus.RETRIEVAL_ERROR, []);
        });
    }

    async createUser(userInfo: IUserDTO, callback: (userStatus : UserStatus, user : IUserDTO) => void) {

        var id = uuid(userInfo.email, Utils.NAMESPACE);
        var email = userInfo.email;
        var name = userInfo.name;
        var user = User.find({_id: id}).lean().cursor().next();

        user.then(u => {
            if(u == null) {
                u = new User();
                u._id = id;
                u.email = email;
                u.name = name;
                u.verified = false;

                if('fb_id' in userInfo) {
                    u.fb_id = userInfo.fb_id;
                    u.fb_access_token = userInfo.fb_access_token;
                    var date = new Date();
                    date.setSeconds(date.getSeconds() + userInfo.fb_expires_in);
                    u.fb_expires_date = date;
                    u.verified = true;
                }

                if('google_id' in userInfo) {
                    u.google_id = userInfo.google_id;
                    u.google_access_token = userInfo.google_access_token;
                    var date = new Date();
                    date.setSeconds(date.getSeconds() + userInfo.google_expires_in);
                    u.google_expires_date = date;
                    u.verified = userInfo.verified;
                }

                if('password' in userInfo) {
                    var salt = randomBytes(16).toString('hex');
                    var hash = scryptSync(userInfo.password, salt, 64);
                    u.password = salt + ":" + hash;
                }

                if('phone' in userInfo) {
                    u.phone = userInfo.phone;
                }

                if('gender' in userInfo) {
                    u.gender = userInfo.gender;
                }

                u.save((err, createdUser) => {
                    if(err) callback(UserStatus.SAVING_ERROR, createdUser);
                    else callback(UserStatus.CREATED, createdUser);
                });

            }else {
                callback(UserStatus.EXISTED, u);
            }
        }).catch(e => {
            callback(UserStatus.CREATION_ERROR, {});
        })

    }

    async editUser(userInfo : IUserDTO, callback : (userStatus: UserStatus, oldUser : IUserDTO) => void) {
        if(userInfo._id) {
            User.findByIdAndUpdate(userInfo._id, userInfo, (err, oldUser) => {
               if(err) callback(UserStatus.EDIT_ERROR, oldUser);
               else callback(UserStatus.EDITED, oldUser); 
            }).catch(err => { callback(UserStatus.EDIT_ERROR, {})});
        } else callback(UserStatus.INVALID_USER_ID, {});
    }

    async deleteUser(userInfo : IUserDTO, callback : (userStatus: UserStatus, oldUser: IUserDTO) => void) {
        if(userInfo._id) {
            User.findOneAndDelete({_id: userInfo._id}, (err, oldUser) => {
                if(err) callback(UserStatus.DELETE_ERROR, {});
                else callback(UserStatus.DELETED, oldUser);
            }).catch(err => { callback(UserStatus.DELETE_ERROR, {})});
        }else callback(UserStatus.INVALID_USER_ID, {});
    }
    

}