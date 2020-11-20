import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { OrderModule } from './modules/order/order.module';
import { AuthModule } from './modules/auth/auth.module'
import {APIModule} from './modules/api/api.module'
import {connect} from 'mongoose'
import  {Utils} from './modules/utils'
import * as session from 'express-session'

@Module({
  imports: [UserModule, OrderModule, AuthModule, APIModule]
})
class AppModule {}

async function createApp(port) {
  const app = await NestFactory.create(AppModule);
  await app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: Utils.config.SESSION_SECRET,
    cookie: {
      maxAge: 600000
    }
  }));
  await connect(Utils.URI);
  await app.listen(port);
}

createApp(8080);
