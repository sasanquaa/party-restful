import {Injectable} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {v4 as uuid, v5 as uuidv5} from 'uuid';
import {APIKeyModel as APIKey} from '../../models/db.models';
import { IUserDTO } from '../user/user.service';
import { UserModel as User} from '../../models/db.models';
import {Utils} from '../utils'
import {scryptSync} from 'crypto'

export class AuthStatus {
    static LOGGED_IN = 4000;
    static INVALID_NAME = 4001;
    static EMAIL_REQUIRED = 4002;
    static INVALID_PASSWORD = 4003;
    static INVALID_EMAIL = 4004;
    static USER_EXISTED = 4005;
    static TOKEN_SAVING_ERROR = 4006;
    static VERIFY_MAIL_SENDING_ERROR = 4007;
    static VERY_MAIL_SENT = 4008;
    static TOKEN_EXPIRED = 4009;
    static USER_TOKEN_NOT_FOUND = 4010;
    static USER_ALREADY_VERIFIED = 4011;
    static USER_VERIFIED = 4012;
    static USER_SAVING_ERROR = 4013;
    static USER_NOT_FOUND = 4014;
    static USER_NOT_VERIFIED = 4015;
    static USER_LOGGED_IN = 4016;
    static USER_ALREADY_LOGGED_IN = 4017;
    static WRONG_PASSWORD = 4018;
}

@Injectable()
export class AuthService {
    constructor(private JwTService: JwtService) {

    }

    async login(userInfo : IUserDTO, callback : (authStatus: AuthStatus, user: IUserDTO) => void, session?) {
        var id = uuidv5(userInfo.email, Utils.NAMESPACE);
        var user = User.find({_id: id}).lean().cursor().next();

        user.then(u => {
            if(u == null) callback(AuthStatus.USER_NOT_FOUND, {});
            else {
                if(!u.verified) callback(AuthStatus.USER_NOT_VERIFIED, u);
                else {
                    if(userInfo.logged_in == true) {
                        if(id != session.user.id) {
                            session.user = {id: id};
                            callback(AuthStatus.USER_LOGGED_IN, u);
                        }
                        else callback(AuthStatus.USER_ALREADY_LOGGED_IN, u);
                    }
                    else {
                        if('google_id' in userInfo || 'fb_id' in userInfo){
                            session.user = {id: id};
                            callback(AuthStatus.USER_LOGGED_IN, u);
                        }else {
                            if(!u.password) callback(AuthStatus.WRONG_PASSWORD, u);
                            else {
                                var [salt, hash] = u.password.split(':');
                                if(scryptSync(userInfo.password, salt, 64) == hash) {
                                    session.user = {id: id};
                                    callback(AuthStatus.USER_LOGGED_IN, u);
                                }else callback(AuthStatus.WRONG_PASSWORD, u);
                            }
                        }
                    }
                }
            }
        });
    }

    async createAPIKey(callback: (key: any) => void) {
        var random = uuid();
        var key = new APIKey({_id: random, key: this.JwTService.sign(random), created_at: new Date()});
        key.save((err, k) => {
            callback(k);
        })
    }
}