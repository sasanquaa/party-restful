import {Controller, Get, Post, UseGuards, HttpStatus, Req, Res, Bind, HttpCode} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import {UserService, UserStatus} from '../user/user.service'
import { Utils } from '../utils';
import { AuthService, AuthStatus } from './auth.service';
import {createTransport} from 'nodemailer'
import { TokenModel as Token } from '../../models/db.models';
import { UserModel as User } from '../../models/db.models';
import { randomBytes } from 'crypto';

@Controller('auth')
export class AuthController {

    constructor(private UserService: UserService, private AuthService: AuthService) {}

    @Get('/api')
    @Bind(Res())
    async apiLogin(res) {
        this.AuthService.createAPIKey(key => {
            res.send({token: key});
        });
    }

    @Post('/register')
    @Bind(Req(), Res())
    async emailRegister(req, res) {
        var userInfo = req.body;
        Utils.filters(userInfo);
        if(!("name" in userInfo) || ("name" in userInfo && userInfo.name.toString().length < 2)) res.send({auth_status: AuthStatus.INVALID_NAME});
        else if(!("email" in userInfo)) res.send({auth_status: AuthStatus.EMAIL_REQUIRED});
        else if(!("password" in userInfo) && userInfo.password.length < 8) res.send({auth_status: AuthStatus.INVALID_PASSWORD});
        else if(!Utils.validateEmail(userInfo.email)) res.send({auth_status: AuthStatus.INVALID_EMAIL});
        else {
            this.UserService.createUser(userInfo, (userStatus, user) => {
                if(userStatus == UserStatus.EXISTED) {
                    res.send({auth_status: AuthStatus.USER_EXISTED, user});
                }else if(userStatus == UserStatus.CREATED) {
                    var token:any = new Token({_id: user._id, token: randomBytes(16).toString('hex')});
                    token.save((err, token) => {
                        if(err) res.send({auth_status: AuthStatus.TOKEN_SAVING_ERROR});
                        else {
                            var transporter = createTransport({service: 'Gmail', auth: {user: Utils.contact.user, pass: Utils.contact.password}});
                            var options = {
                                from: Utils.contact.user, 
                                to: userInfo.email, 
                                subject: "Kích hoạt tài khoản", 
                                text: "Click vào đây để kích hoạt tài khoản: http://" + req.headers.host + '/auth/confirmation/' + token.token
                            }
                            transporter.sendMail(options, (err) => {
                                if(err) res.send({auth_status: AuthStatus.VERIFY_MAIL_SENDING_ERROR, msg: err.message});
                                else res.send({auth_status: AuthStatus.VERY_MAIL_SENT});
                            });
                        }
                    });
                }
            });

        }
    }

    @Get('/confirmation/:token')
    @Bind(Req(), Res())
    async emailConfirmation(req, res) {
        Token.find({token: req.params.token}).cursor().next().then( token => {
            if(!token) res.send({auth_status: AuthStatus.TOKEN_EXPIRED});
            else {
                User.find({_id: token._id}).cursor().next().then(user => {
                    if(!user) res.send({auth_status: AuthStatus.USER_TOKEN_NOT_FOUND});
                    else {
                        if(user.verified) res.send({auth_status: AuthStatus.USER_ALREADY_VERIFIED});
                        else {
                            user.verified = true;
                            user.save((err) => {
                                if(err) res.send({auth_status: AuthStatus.USER_SAVING_ERROR});
                                else res.send({auth_status: AuthStatus.USER_VERIFIED});
                            });
                        }
                    }
                });
            }
        });
    }

    @Post('/login')
    @Bind(Req(), Res())
    async emailLogin(req, res) {
        var user = req.body;
        var userInfo = {
            email: user.email,
            name: user.name,
            password: user.password,
            logged_in: req.session.user ? true : false
        }
        this.AuthService.login(userInfo, (authStatus, user) => {
            res.send({auth_status: authStatus, user: req.session.user});
        }, req.session); 
        
    }

    @Get('/google')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('google'))
    async googleLogin() {}

    @Get('/google/redirect')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('google'))
    @Bind(Req(), Res())
    async googleLoginRedirect(req, res) {
        var user = req.user.user;
        var token = req.user.token;
        var userInfo = {
            email: user.email,
            name: user.name,
            verified: user.email_verified,
            google_id: user.sub,
            google_access_token: token.access_token,
            google_expires_in: token.expires_in,
            logged_in: req.session.user ? true : false
        }
        this.UserService.createUser(userInfo, (created, u) => {
            this.AuthService.login(userInfo, (authStatus, user) => {
                res.send({auth_status: authStatus, user: req.session.user});
            }, req.session);
        })
    }

    @Get('/facebook')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('facebook'))
    async facebookLogin(): Promise<any> {}

    @Get('/facebook/redirect')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthGuard('facebook'))
    @Bind(Req(), Res())
    async facebookLoginRedirect(req, res) : Promise<any> {
        var user = req.user.user;
        var token = req.user.token;
        var userInfo = {
            email: user.email,
            name: user.name,
            fb_id: user.id,
            fb_access_token: token.access_token,
            fb_expires_in: token.expires_in,
            logged_in: req.session.user ? true : false
        }

        this.UserService.createUser(userInfo, (created, u) => {
            this.AuthService.login(userInfo, (authStatus, user) => {
                res.send({auth_status: authStatus, user: req.session.user});
            }, req.session);
        })
    }

}