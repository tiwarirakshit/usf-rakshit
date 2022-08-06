const express = require('express');
const router = express.Router();
const {
  getPayment,
  getContact,
  getNewsletter,
  getEnrollment,
  getLogin,
  registerUser,
  userLogin,
  userLogout,
  handleRefreshToken
} = require('../controllers/dashboard_controller');
const verifyJWT = require('../middleware/verifyJWT');

/* GET method. */

router.get('/login', getLogin)

router.get('/dashboard', verifyJWT, getPayment);

router.get('/Newsletter', verifyJWT, getNewsletter);

router.get('/Enrollment', verifyJWT, getEnrollment);

router.get('/getContact', verifyJWT, getContact);

router.get('/logout', verifyJWT, userLogout);

router.get('/refresh', verifyJWT, handleRefreshToken);


/* POST method */
router.post('/registerUser', registerUser);

router.post('/userLogin', userLogin);



module.exports = router;