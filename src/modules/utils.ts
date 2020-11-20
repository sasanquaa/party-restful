
export module Utils {

    export const URI = "mongodb+srv://sasanqua:sasanqua@cluster0.kl7wq.mongodb.net/database?retryWrites=true&w=majority";
    export const NAMESPACE = "7e4fee47-175a-43b5-a114-c57d525fbf63";

    export function validateEmail(email) 
    {
        if (/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(email)) return true;
        return false;
    }

    export function filters(userInfo) {
        delete userInfo.google_id;
        delete userInfo.fb_id;
    }

    export function compareTime(a, b) {
        if(a.h < b.h) return -1;
        if(a.h > b.h) return 1;
        if (a.m < b.m) return -1;
        if (a.m > b.m) return 1;
        return 0;
    }

    export function timeDif(a, b) {
        return (Math.abs((a.h * 60 + a.m) - (b.h * 60 + b.m))) / 60;
    }

    export const config = {
        FB_APP_ID: "414538426381683",
        FB_APP_SECRET: "f65010a69e019c3f5460054719773285",
        GOOGLE_APP_ID: "598053261888-ne28p9tuu3ncug7sjaahqtsqqt7lvm6j.apps.googleusercontent.com",
        GOOGLE_APP_SECRET: "k8SACEpHqHbBVJTSTchwA7wA",
        JWT_SECRET: "fUPDYX84LdvAu6N0eZSMDy7LrJaBp4rL",
        SESSION_SECRET: '@J>:1ob#IFcyC-?4sNEbUFws#3S,M84k4rf!kYB]8UuN/a5"Sg|TdHzz#x|991e'
    }

    export const contact = {
        user: "freeexitlag109@gmail.com",
        password: "thangheo123"
    }
}
