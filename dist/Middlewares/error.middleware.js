export const errorMiddlerware = (err, req, res, next) => {
    (err.message || (err.message = "Interal server Error")), (err.statusCode || (err.statusCode = 500));
    if (err.name === "CastError") {
        err.message = "Invalid ID";
    }
    return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message,
    });
};
export const TryCatch = (func) => (req, res, next) => {
    return Promise.resolve(func(req, res, next)).catch(next);
};
