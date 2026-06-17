// middleware-service/internalMiddleware.js
// Guards internal service-to-service endpoints.
// Kafka consumers call these endpoints with the shared INTERNAL_SERVICE_SECRET
// header — no user JWT is involved.

export const protectInternal = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== process.env.INTERNAL_SERVICE_SECRET) {
    return res.status(403).json({ message: "Forbidden: invalid internal secret" });
  }
  next();
};
