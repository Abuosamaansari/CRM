// middleware/role.middleware.js
const roleMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) return res.status(401).json({ message: 'Unauthorized' });
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied - insufficient role' });
    }
    next();
  };
};

module.exports = roleMiddleware;
