import {Module} from '@nestjs/common'
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/user.module';
import { APIController } from './api.controller';

@Module({
    imports: [UserModule, OrderModule],
    controllers: [APIController],
    providers: []
})
export class APIModule {}