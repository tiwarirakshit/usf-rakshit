const jwt = require('jsonwebtoken');

const verifyJWT = async (req, res, next) => {
  try {
    const token = req?.cookies?.jwt;

    const result = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!!result) {
      req.email = result.UserInfo.email;
      req.roles = result.UserInfo.roles;
      next();
      return;
    } else {
      res.status(200).render('dashboard/login', { status: "SUCCESS", title: "Login", layout: "adminLayout" });
      next();
      return;
    }
  }
  catch (err) {
    res.status(200).render('dashboard/login', { status: "SUCCESS", title: "Login", layout: "adminLayout" });
    return;
  }
}

module.exports = verifyJWT