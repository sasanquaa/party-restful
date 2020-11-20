import {Controller, Get, Res, Req, Bind, Post, Patch, Delete, UseGuards, Header, ExceptionFilter, ArgumentsHost, UseFilters, Catch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrderService, OrderStatus} from '../order/order.service';
import { UserService, UserStatus } from '../user/user.service';
import {Response} from 'express'

@Catch()
export class AnyExceptionFilter implements ExceptionFilter {

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        response.status(exception.response.statusCode).json({
            statusCode: exception.response.statusCode,
            messsage: exception.response.message
        });
    }
}

@Controller('api')
@UseGuards(AuthGuard('api'))
@UseFilters(new AnyExceptionFilter())
export class APIController {
 
    constructor(private UserService: UserService, private OrderService: OrderService) {}

    /*
     * API for UserService
     */

    @Get('/users')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async getUsers(req, res) {
        var options = req.body;
        this.UserService.getUsersInfo(options, (userStatus, users) => {
            res.send({user_status: userStatus, users: users});
        }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
    }


    @Get('/users/:id')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async getUserByID(req, res) {
        this.UserService.getUsersInfo({_id: req.params.id}, (userStatus, users) => {
            var user = users.pop();
            if(user == null) res.send({user_status: userStatus, user: {}});
            else res.send({user_status: userStatus, user: user});
        }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
    }

    @Post('/users/create')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async createUser(req, res) {
        if(!req.is('application/json')) res.send({user_status: UserStatus.INVALID_CONTENT_TYPE, user: {}});
        else {
            var userInfo = req.body;
            this.UserService.createUser(userInfo, (userStatus, user) => {
                res.send({user_status: userStatus, user: user});
            }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
        }
    }

    @Patch('/users/:id')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async editUserByID(req, res) {
        if(!req.is('application/json')) res.send({user_status: UserStatus.INVALID_CONTENT_TYPE, user: {}});
        else {
            var userInfo = req.body;
            userInfo._id = req.params.id;
            delete userInfo.email; 
            this.UserService.editUser(userInfo, (userStatus, oldUser) => {
                res.send({user_status: userStatus, old_user: oldUser});
            }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
        }
    }

    @Delete('/users/:id')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async deleteUserById(req, res) {
        this.UserService.deleteUser({_id: req.params.id}, (userStatus, oldUser) => {
            res.send({user_status: userStatus, old_user: oldUser});
        }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
    }
    
    /*
     * API for OrderService
     */

    @Get('/orders')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async getOrders(req, res) {
        var options = req.body;
        this.OrderService.getOrders(options, (orderStatus, orders) => {
            res.send({order_status: orderStatus, orders: orders});
        }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
    }

    @Post('/orders/create')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async createOrder(req, res) {
        this.OrderService.createOrder(req.body, (orderStatus, order) => {
            res.send({order_status: orderStatus, order: order});
        },req.body.send_mail).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
    }   

    @Patch('/orders/:id')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async editOrderById(req, res) {
        var orderInfo = req.body;
        orderInfo._id = req.params.id;
        this.OrderService.editOrder(req.body, (orderStatus, oldOrder) => {
            res.send({order_status: orderStatus, old_order: oldOrder});
        }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
    }

    @Delete('/orders/:id')
    @Bind(Req(), Res())
    @Header('Content-Type', 'application/json')
    async deleteOrderById(req, res) {
        var orderInfo = req.body;
        orderInfo._id = req.params.id;
        this.OrderService.deleteOrder(req.body, (orderStatus, oldOrder) => {
            res.send({order_status: orderStatus, old_order: oldOrder});
        }).catch(err => {res.send({statusCode: err.statusCode, message: err.message})});
    }

}