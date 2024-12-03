import { TryCatch } from "../Middlewares/error.middleware.js";
import { Product } from "../models/Product.model.js";
import ErrorHandler from "../Utils/utility-class.js";
import { rm } from "fs";
import { myCache } from "../app.js";
import { invalidateCache } from "../Utils/features.utils.js";
// revalidate non new,update,delete Product & on New order
export const getLatestProducts = TryCatch(async (req, res, next) => {
    let products;
    if (myCache.has("latest-products")) {
        products = JSON.parse(myCache.get("latest-products"));
    }
    else {
        products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
        myCache.set("latest-products", JSON.stringify(products));
    }
    return res.status(200).json({
        success: true,
        products,
    });
});
// revalidate non new,update,delete Product & on New order
export const getCategories = TryCatch(async (req, res, next) => {
    let categories;
    if (myCache.has("categories")) {
        categories = JSON.parse(myCache.get("categories"));
    }
    else {
        categories = await Product.distinct("category");
        myCache.set("categories", JSON.stringify(categories));
    }
    categories = await Product.distinct("category");
    return res.status(200).json({
        success: true,
        categories,
    });
});
// revalidate non new,update,delete Product & on New order
export const getAdminProducts = TryCatch(async (req, res, next) => {
    let products;
    if (myCache.has("all-products")) {
        products = JSON.parse(myCache.get("all-products"));
    }
    else {
        products = await Product.find({});
        myCache.set("all-products", JSON.stringify(products));
    }
    return res.status(200).json({
        success: true,
        products,
    });
});
export const getSingleProduct = TryCatch(async (req, res, next) => {
    const id = req.params.id;
    let product;
    if (myCache.has(`product-${id}`)) {
        product = JSON.parse(myCache.get(`product-${id}`));
    }
    else {
        product = await Product.findById(id);
        myCache.set(`product-${id}`, JSON.stringify(product));
    }
    return res.status(200).json({
        success: true,
        product,
    });
});
export const newProduct = TryCatch(async (req, res, next) => {
    const { name, category, stock, price } = req.body;
    const photo = req.file;
    if (!photo) {
        return next(new ErrorHandler("please add photo", 400));
    }
    if (!name || !category || !stock || !price) {
        rm(photo.path, () => {
            console.log("Deleted");
        });
        return next(new ErrorHandler("please add all fields", 400));
    }
    await Product.create({
        name,
        category: category.toLowerCase(),
        price,
        stock,
        photo: photo?.path,
    });
    invalidateCache({ product: true, admin: true });
    return res.status(201).json({
        success: true,
        message: "Product Created Successfully",
    });
});
export const updateProduct = TryCatch(async (req, res, next) => {
    const { id } = req.params;
    const { name, category, stock, price } = req.body;
    const photo = req.file;
    const product = await Product.findById(id);
    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }
    // Update fields if provided
    if (photo) {
        rm(product.photo, () => {
            console.log("Old Photo Deleted");
        });
        product.photo = photo.path;
    }
    if (name)
        product.name = name;
    if (price)
        product.price = price;
    if (stock)
        product.stock = stock;
    if (category)
        product.category = category.toLowerCase();
    // Save updated product
    await product.save();
    invalidateCache({ product: true, productId: String(product._id), admin: true });
    return res.status(200).json({
        success: true,
        message: "Product Updated Successfully",
        product, // Include updated product in the response
    });
});
export const deleteProduct = TryCatch(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        return next(new ErrorHandler("Prodcut Not Found", 404));
    }
    rm(product.photo, () => {
        console.log("Product Photo Deleted");
    });
    await Product.deleteOne();
    invalidateCache({ product: true, productId: String(product._id), admin: true });
    return res.status(200).json({
        success: true,
        message: "Product Deleted Successfully",
    });
});
export const getAllProducts = TryCatch(async (req, res, next) => {
    const { price, sort, category, search } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(process.env.PRODUCT_PER_PAGE) || 8;
    const skip = (page - 1) * limit;
    const basequery = {};
    if (search)
        basequery.name = {
            $regex: search,
            $options: "i",
        };
    if (price)
        basequery.price = { $lte: Number(price) };
    if (category)
        basequery.category = category;
    const ProdcutPromise = await Product.find(basequery)
        .sort(sort && { price: sort === "asc" ? 1 : -1 })
        .limit(limit)
        .skip(skip);
    const [products, filteredOnlyProduct] = await Promise.all([
        ProdcutPromise,
        Product.find(basequery),
    ]);
    const totalPage = Math.ceil(filteredOnlyProduct.length / limit);
    return res.status(200).json({
        success: true,
        products,
        totalPage,
    });
});
