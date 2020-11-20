import {Module} from '@nestjs/common'
import {AuthController} from './auth.controller'
import {AuthService} from './auth.service'
import {AuthFacebookStrategy, AuthAPIStrategy, AuthGoogleStrategy, AuthEmailPasswordStrategy} from './auth.strategy'
import {UserModule} from '../user/user.module'
import {JwtModule, JwtService} from '@nestjs/jwt'
import { Utils } from '../utils'

@Module({
    imports: [JwtModule.register({
        secret: Utils.config.JWT_SECRET
    }), UserModule],
    controllers: [AuthController],
    providers: [AuthService, AuthFacebookStrategy, AuthAPIStrategy, AuthGoogleStrategy, AuthEmailPasswordStrategy],
    exports: [AuthService]
})
export class AuthModule {}