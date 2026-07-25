const internalAuth = (req, res, next) => {
    const internalSecret = req.headers['x-internal-secret']

    if (!internalSecret || internalSecret !== process.env.INTERNAL_SERVICE_SECRET) {
        return res.status(403).json({ message: "Forbidden: Invalid internal secret" })
    }

    next()
}

export { internalAuth }