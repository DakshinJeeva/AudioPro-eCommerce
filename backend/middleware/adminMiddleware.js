export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    console.log('step 2 done');
    next(); // ✅ allow access
  } else {
    res.status(403).json({ message: "Not authorized as admin" }); // ❌ deny access
  }
};
