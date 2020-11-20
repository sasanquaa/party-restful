import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { Profile, Strategy as FacebookStrategy} from 'passport-facebook'
import {ExtractJwt, Strategy as JWTStrategy} from 'passport-jwt'
import {Strategy as GoogleStrategy} from 'passport-google-oauth20'
import {Strategy as LocalStrategy} from 'passport-local'
import {Utils} from '../utils'
import {APIKeyModel as APIKey} from '../../models/db.models'

@Injectable()
export class AuthAPIStrategy extends PassportStrategy(JWTStrategy, 'api')
{
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: true,
            secretOrKey: Utils.config.JWT_SECRET
        });
    }

    async validate(id: string) {
        var e = await APIKey.exists({_id: id});
        if(e) return id;
        else throw new UnauthorizedException();
    }
}

@Injectable()
export class AuthEmailPasswordStrategy extends PassportStrategy(LocalStrategy, 'email-password')
{
    constructor() {
        super({
            usernameField: "email"
        });
    }

    async validate(email: string, password: string, done) {
        return {email: email, password: password};
    }
}

@Injectable()
export class AuthGoogleStrategy extends PassportStrategy(GoogleStrategy, 'google')
{
    constructor() {
        super({
            clientID: Utils.config.GOOGLE_APP_ID,
            clientSecret: Utils.config.GOOGLE_APP_SECRET,
            callbackURL: 'http://localhost:8080/auth/google/redirect',
            scope: ['email', 'profile']
        });
    }

    async validate(token: string, refreshToken: string, tokenJson: any, profile: any) {
        return {user: profile._json, token: tokenJson}
    }
}

@Injectable()
export class AuthFacebookStrategy extends PassportStrategy(FacebookStrategy, 'facebook') {
    constructor() {
        super({
            clientID: Utils.config.FB_APP_ID,
            clientSecret: Utils.config.FB_APP_SECRET,
            callbackURL: 'http://localhost:8080/auth/facebook/redirect',
            scope: ['email'],
            profileFields: ['id', 'email', 'displayName', 'gender']
        });
    }

    async validate(token: string, refreshToken: string, tokenJson: any, profile: Profile) {
       return {user: profile._json, token: tokenJson};
    }
}