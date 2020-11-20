import { Injectable } from '@nestjs/common'
import {Utils} from '../utils'
import {v5 as uuid} from 'uuid'
import {createTransport} from 'nodemailer'
import {UserModel as User, OrderModel as Order} from '../../models/db.models'

export interface ITimeIntervalDTO {
    start:{
        h: number,
        m: number
    },
    end: {
        h: number,
        m: number
    }
}

export interface IOrderDTO {
    _id?: string,
    date?: Date,
    order?: {
        _id?: string,
        tables?: number,
        time?: ITimeIntervalDTO,
        email?: string,
        order_index?: number
    },
    available_tables?: number
};

export class OrderStatus {
    static CREATED = 3001;
    static EDITED = 3002;
    static DELETED = 3003;
    static RETRIEVED = 3004;
    static RETRIEVAL_ERROR = 3005;
    static SAVING_ERROR = 3006;
    static NOT_ENOUGH_TABLES = 3007;
    static INVALID_TIME = 3008;
    static DELETE_ERROR = 3009;
    static INVALID_ORDER_ID = 3010;
    static EDIT_ERROR = 3011;
    static CREATION_ERROR = 3012;
    static USER_NOT_FOUND = 3013;
    static USER_REQUIRED = 3014;
    static ORDER_INDEX_REQUIRED = 3015;
    static ORDER_NOT_FOUND = 3016;
}

const MAX_TABLES = 300;
const COOLDOWN = 2;
const PER_TABLE_MONEY = 3000000;

@Injectable()
export class OrderService {

    async getOrders(orderInfo : IOrderDTO, callback : (orderStatus: OrderStatus, orders: Array<IOrderDTO>) => void) {
        if("date" in orderInfo) orderInfo._id = uuid(orderInfo.date.toString(), Utils.NAMESPACE);
        Order.find(orderInfo).lean().then(orders => {
            callback(OrderStatus.RETRIEVED, orders);
        }).catch(e => {
            callback(OrderStatus.RETRIEVAL_ERROR, []);
        });
    }

    async createOrder(orderInfo : IOrderDTO, callback : (orderStatus: OrderStatus, order: IOrderDTO) => void, sendMail? : boolean) {
        var u;
        if(Utils.compareTime(orderInfo.order.time.start, orderInfo.order.time.end) >= 0) {
            callback(OrderStatus.INVALID_TIME, {})
            return;
        }else if(!orderInfo.order._id && !orderInfo.order.email) {
            callback(OrderStatus.USER_REQUIRED, {});
            return;
        }else {
            if(!orderInfo.order._id) orderInfo.order._id = uuid(orderInfo.order.email, Utils.NAMESPACE);
            u = await User.findOne({_id: orderInfo.order._id}).lean();
            if(u == null) {
                callback(OrderStatus.USER_NOT_FOUND, {});
                return;
            }
        }

        var id = uuid(orderInfo.date.toString(), Utils.NAMESPACE)
        var order = Order.find({_id: id}).cursor().next();

        order.then(o => {
            if(o == null) {
                o = new Order();
                o._id = id;
                o.date = orderInfo.date;
                orderInfo.order.order_index = 0;
                o.orders = [orderInfo.order];
                o.save(function(err, createdOrder) {
                    if(err) callback(OrderStatus.SAVING_ERROR, createdOrder);
                    else {
                        callback(OrderStatus.CREATED, createdOrder);
                        if(sendMail) {
                            var transporter = createTransport({service: 'Gmail', auth: {user: Utils.contact.user, pass: Utils.contact.password}});
                            var options = {
                                from: Utils.contact.user, 
                                to: u.email, 
                                subject: "Đặt hàng thành công", 
                                text: "Quý khách đã đặt thành công " + orderInfo.order.tables 
                                + " bàn!\nGiá: " 
                                + (PER_TABLE_MONEY * orderInfo.order.tables).toLocaleString().replace(/,/g, '.') + " VNĐ"
                            }
                            transporter.sendMail(options, (err) => {});
                        }
                    }
                });
            }else {
                var tablesAvailable = this.getAvailableTables(o.orders, orderInfo.order.time);
                if(orderInfo.order.tables <= tablesAvailable) {
                    var order_index = 0;
                    for(var ord of o.orders) if(ord._id == orderInfo.order._id) order_index++;
                    orderInfo.order.order_index = order_index;
                    o.orders.push(orderInfo.order);
                    o.orders.sort(function(a, b) {
                        return Utils.compareTime(a.time.start, b.time.start);
                    });
                    o.save(function(err, createdOrders) {
                        orderInfo.available_tables = tablesAvailable;
                        if(err) callback(OrderStatus.SAVING_ERROR, orderInfo);
                        else {
                            callback(OrderStatus.CREATED, orderInfo);
                            if(sendMail) {
                                var transporter = createTransport({service: 'Gmail', auth: {user: Utils.contact.user, pass: Utils.contact.password}});
                                var options = {
                                    from: Utils.contact.user, 
                                    to: u.email, 
                                    subject: "Đặt hàng thành công", 
                                    text: "Quý khách đã đặt thành công " + orderInfo.order.tables 
                                    + " bàn!\nGiá: " 
                                    + (PER_TABLE_MONEY * orderInfo.order.tables).toLocaleString().replace(/,/g, '.') + " VNĐ"
                                }
                                transporter.sendMail(options, (err) => {});
                            }
                        }
                        
                    });
                }else {
                    callback(OrderStatus.NOT_ENOUGH_TABLES, {available_tables: tablesAvailable});
                }   
            }
        }).catch(e => {
            console.log(e);
            callback(OrderStatus.CREATION_ERROR, {});
        });
    }

    async editOrder(orderInfo : IOrderDTO, callback : (orderStatus: OrderStatus, oldOrder: IOrderDTO) => void) {
        if(orderInfo._id || orderInfo.date) {
            if(!orderInfo._id) orderInfo._id = uuid(orderInfo.date.toString(), Utils.NAMESPACE);
            if(!orderInfo.order._id && !orderInfo.order.email) {
                callback(OrderStatus.USER_REQUIRED, {});
            }
            else if(!orderInfo.order.order_index) callback(OrderStatus.ORDER_INDEX_REQUIRED, {})
            else {
                if(!orderInfo.order._id) orderInfo.order._id = uuid(orderInfo.order.email, Utils.NAMESPACE);
                Order.find({_id: orderInfo._id}).cursor().next().then(o => {
                    if(o == null) {
                        callback(OrderStatus.ORDER_NOT_FOUND, {});
                        return;
                    }
                    var oldOrder;
                    var oldOrders = o.orders.toObject();
                    oldOrders = oldOrders.filter((v, i, arr) => {
                        return (v._id != orderInfo.order._id) || (v._id == orderInfo.order._id && v.order_index != orderInfo.order.order_index);
                    });
                    for(let v of o.orders ) {
                        if(v._id == orderInfo.order._id && v.order_index == orderInfo.order.order_index) {
                            oldOrder = v;
                            break;
                        }
                    }
                    var tablesAvailable = this.getAvailableTables(oldOrders, orderInfo.order.time);
                    if(oldOrder == null) {
                        callback(OrderStatus.ORDER_NOT_FOUND, {});
                        return;
                    }
                    if(Utils.compareTime(orderInfo.order.time.start, orderInfo.order.time.end) >= 0) {
                        callback(OrderStatus.INVALID_TIME, {})
                        return;
                    }
                    if(orderInfo.order.tables <= tablesAvailable) {

                        oldOrder.tables = orderInfo.order.tables;
                        oldOrder.time = orderInfo.order.time;
                        o.orders.sort(function(a, b) {
                            return Utils.compareTime(a.time.start, b.time.start);
                        });
                        o.save(err => {
                            if(err) callback(OrderStatus.EDIT_ERROR, {});
                            else {
                                var oldOrderCopy = oldOrder.toObject();
                                callback(OrderStatus.EDITED, {order: oldOrderCopy, available_tables: tablesAvailable});
                            }
                        });

                    }else callback(OrderStatus.NOT_ENOUGH_TABLES, {order: {}, available_tables: tablesAvailable})
                }).catch(err => {callback(OrderStatus.EDIT_ERROR, {})});
            }

        } else callback(OrderStatus.INVALID_ORDER_ID, {});
    }

    async deleteOrder(orderInfo : IOrderDTO, callback : (orderStatus: OrderStatus, oldOrder: IOrderDTO) => void) {


        if(orderInfo._id || orderInfo.date) {
            if(!orderInfo._id) orderInfo._id = uuid(orderInfo.date.toString(), Utils.NAMESPACE);
            if(!orderInfo.order._id && !orderInfo.order.email) {
                callback(OrderStatus.USER_REQUIRED, {});
            }
            else if(!orderInfo.order.order_index) callback(OrderStatus.ORDER_INDEX_REQUIRED, {})
            else {
                if(!orderInfo.order._id) orderInfo.order._id = uuid(orderInfo.order.email, Utils.NAMESPACE);
                Order.find({_id: orderInfo._id}).cursor().next().then(o => {
                    if(o == null) {
                        callback(OrderStatus.ORDER_NOT_FOUND, {});
                        return;
                    }
                    var oldOrder;
                    var order_index = 0;
                    o.orders = o.orders.filter((v, i, arr) => {
                        if(v._id == orderInfo.order._id && v.order_index == orderInfo.order.order_index) oldOrder = v.toObject();
                        return (v._id != orderInfo.order._id) || (v._id == orderInfo.order._id && v.order_index != orderInfo.order.order_index);
                    });
                    for(let v of o.orders ) {
                        if(v._id == orderInfo.order._id) {
                            v.order_index = order_index++;
                        }
                    }
                    if(oldOrder == null) {
                        callback(OrderStatus.ORDER_NOT_FOUND, {});
                        return;
                    }

                    o.save(err => {
                        if(err) callback(OrderStatus.DELETE_ERROR, {});
                        else {
                            callback(OrderStatus.DELETED, {order: oldOrder});
                        }
                    });

                }).catch(err => {callback(OrderStatus.DELETE_ERROR, {})});
            }

        } else callback(OrderStatus.INVALID_ORDER_ID, {});
    }

    getAvailableTables(previousOrders, newOrderTime) {

        var tablesAvailable = MAX_TABLES;
        for(let order of previousOrders) {
            if(Utils.compareTime(order.time.end, newOrderTime.start) <= 0) {
                var dif = Utils.timeDif(newOrderTime.start, order.time.end);
                if(dif < COOLDOWN) tablesAvailable -= order.tables;
            }else if(Utils.compareTime(order.time.start, newOrderTime.end) >= 0) {
                var dif = Utils.timeDif(newOrderTime.end, order.time.start);
                if(dif < COOLDOWN) tablesAvailable -= order.tables;
            }else tablesAvailable -= order.tables;
        }
        return tablesAvailable;
    }

}