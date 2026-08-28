function summaryValidator(req, res, next) {
    const text = req.body.text;

    if (!text) {
        return res.status(400).json({
            success: false,
            message: "Text is required",
        });
    }

    if (typeof text !== "string") {
        return res.status(400).json({
            success: false,
            message: "Text must be a string",
        });
    }

    if (text.trim().length === 0) {
        return res.status(400).json({
            success: false,
            message: "Text cannot be empty",
        });
    }

    next();
}

export default summaryValidator;
