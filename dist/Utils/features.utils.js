import mongoose from "mongoose";
import { Product } from "../models/Product.model.js";
import { myCache } from "../app.js";
export const connectDB = (uri) => {
    mongoose
        .connect(uri, { dbName: "Ecommerce_24" })
        .then((c) => console.log(`DB is connected to ${c.connection.host}`))
        .catch((e) => console.log(e));
};
export const invalidateCache = ({ product, order, admin, userId, orderId, productId, }) => {
    if (product) {
        const productkeys = [
            "all-products",
            "categories",
            "latest-products",
        ];
        if (typeof productId === "string") {
            productkeys.push(`product-${productId}`);
        }
        if (typeof productId === "object") {
            productId.forEach(i => {
                productkeys.push(`product-${i}`);
            });
        }
        myCache.del(productkeys);
    }
    if (order) {
        const orderKeys = [
            "all-orders",
            `my-orders-${userId}`,
            `orders-${orderId}`,
        ];
        myCache.del(orderKeys);
    }
    if (admin) {
        myCache.del([
            "admin-stats",
            "admin-pie-charts",
            "admin-bar-charts",
            "admin-line-charts"
        ]);
    }
};
export const reduceStock = async (orderItems) => {
    for (let i = 0; i < orderItems.length; i++) {
        const order = orderItems[i];
        const product = await Product.findById(order.productId);
        if (!product) {
            throw new Error("Product Not Found");
        }
        product.stock -= order.quantity;
        await product.save();
    }
};
export const calculatePercantage = (thisMonth, lastMonth) => {
    if (lastMonth == 0)
        return thisMonth * 100;
    const percant = ((thisMonth) / lastMonth) * 100;
    return Number(percant.toFixed(0));
};
export const getInventories = async ({ categories, productsCount }) => {
    const categoryCountPromise = categories.map((category) => Product.countDocuments({ category }));
    const categoriesCount = await Promise.all(categoryCountPromise);
    const categoryCount = [];
    categories.forEach((category, i) => {
        categoryCount.push({
            [category]: Math.round((categoriesCount[i] / productsCount) * 100),
        });
    });
    return categoryCount;
};
export const getChartData = ({ length, docArr, today, property, }) => {
    const data = new Array(length).fill(0);
    docArr.forEach((i) => {
        const creationDate = i.createdAt;
        const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;
        if (monthDiff < length) {
            if (property) {
                data[length - monthDiff - 1] += i[property];
            }
            else {
                data[length - monthDiff - 1] += 1;
            }
        }
    });
    return data;
};
