const express = require('express');
const router = express.Router();
const {
  getHome,
  getAbout,
  getContact,
  getPrivatePolice,
  enrollmentPostRequest,
  newsletterPostRequest,
  contactPostRequest,
  paymentPostRequest,
  paymentRequest,
  paymentVerifyPost,
} = require('../controllers/home_controller')

// home get method 
router.get('/', getHome);

// about get method
router.get('/about', getAbout);

// contact get method
router.get('/contact', getContact);

// private police get method
router.get('/private_policy', getPrivatePolice);

// payment get method
router.get('/paymentRequest/:course/:price/:valid', paymentRequest);



/* POST method. */
router.post('/enrollmentPostRequest', enrollmentPostRequest);

router.post('/newsletterPostRequest', newsletterPostRequest);

router.post('/contactPostRequest', contactPostRequest);

router.post('/paymentPostRequest/:course/:amount/:time', paymentPostRequest);

router.post('/paymentVerifyPost', paymentVerifyPost);

module.exports = router;