const db = require('../dbconfig');
const Razorpay = require("razorpay");
const cuid = require('cuid');
const sendMailFromContact = require('../config/send-contact-mail');
const sendMailForNewsLetter = require('../config/send-newsLetter-mail');
const sendMailForEnrollRequest = require('../config/send-enroll-request-mail');
const sendMailForInvoice = require('../config/send-invoice-mail');


// home get request 
const getHome = async (req, res, next) => {
  try {
    res.status(200).render('user/index', { title: "Home", layout: 'homeLayout' });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// about get request 
const getAbout = async (req, res, next) => {
  try {
    res.status(200).render('user/about', { title: "About", layout: 'homeLayout' });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// contact get request 
const getContact = async (req, res, next) => {
  try {
    res.status(200).render('user/contact', { title: "Contact", layout: 'homeLayout' });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// private policy get request 
const getPrivatePolice = async (req, res, next) => {
  try {
    res.status(200).render('user/private_policy', { title: "Private policy", layout: 'homeLayout' });
  }
  catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// payment request 

const paymentRequest = async (req, res) => {
  try {
    const { price, valid, course } = req.params;
    res.status(200).render('user/payment', { title: "Payment", data: { price, valid, course }, layout: '' });
    return;
  }
  catch (err) {
    res.status(500).json({ message: err.message });
    return;
  }
}

// enrollment post request
const enrollmentPostRequest = async (req, res) => {
  try {

    const { name, email, phone, course } = req.body;

    const newEnrollment = {
      name: name,
      email: email,
      phone: phone,
      course: course
    };

    const result = await db.get().collection('enrollment').insertOne(newEnrollment);

    const response = sendMailForEnrollRequest(name, email, phone, course);

    if (result.acknowledged === true && response) {
      res.status(201).json({ status: "SUCCESS", message: "Enrollment Successful !" });
    } else {
      res.status(500).json({ status: "FAILED", message: "Enrollment Failed" });
    }

  }
  catch (err) {
    res.status(500).json({ status: "FAILED", message: err.message });
  }
}

// newsletter post request

const newsletterPostRequest = async (req, res) => {
  try {

    const { email } = req.body;

    const result = await db.get().collection('newsletter').insertOne({ email: email });

    const mailResponse = await sendMailForNewsLetter(email);

    if (result.acknowledged === true && mailResponse) {
      res.status(201).json({ status: "SUCCESS", message: "Newsletter Successful" });
    } else {
      res.status(500).json({ status: "FAILED", message: "Newsletter Failed" });
    }

  }
  catch (err) {
    res.status(500).json({ status: "FAILED", message: err.message });
  }
}


// contact post request

const contactPostRequest = async (req, res) => {
  try {

    const { name, email, subject, message } = req.body;

    const result = await db.get().collection('contact').insertOne({ name: name, email: email, subject: subject, message: message });

    if (result.acknowledged === true) {
      const mailResult = await sendMailFromContact(name, email, subject, message);

      if (mailResult) {
        res.status(201).json({ status: "SUCCESS", message: "Contact Successful" });
        return;
      }
      else {
        res.status(500).json({ status: "FAILED", message: "Contact Failed" });
        return;
      }
    }
    else {
      res.status(500).json({ status: "FAILED", message: "Contact Failed" });
      return;
    }
  }
  catch (err) {
    res.status(500).json({ status: "FAILED", message: err.message });
    return;
  }

}

// payment post request

// https://github.com/pratik149/node-razorpay

const paymentPostRequest = async (req, res) => {
  try {

    const instance = new Razorpay({
      key_id: process.env.RAZOR_PAY_KEY_ID,
      key_secret: process.env.RAZOR_PAY_KEY_SECRET,
    });

    const { name, email, phone } = req.body;

    const { amount, time, course } = req.params;

    const order = await instance.orders.create({
      amount: Number(amount) * 100,
      currency: "INR",
      receipt: cuid(),
      payment_capture: "1"
    })

    const paymentDetail = {
      orderId: order.id,
      receiptId: order.receipt,
      amount: order.amount,
      currency: order.currency,
      createdAt: order.created_at,
      status: order.status,
      name,
      email,
      phone,
      course,
      amount,
      duration: time
    }

    const result = await db.get().collection('payment').insertOne(paymentDetail);

    if (result.acknowledged === true) {
      res.status(201).render('user/checkout', {
        title: "Checkout",
        status: "SUCCESS",
        razorPayKeyId: process.env.RAZOR_PAY_KEY_ID,
        paymentDetail: paymentDetail,
        layout: ''
      });
      return;
    } else {
      res.status(501).render('user/payment', { title: "Payment", status: true, message: "Payment Failed", layout: '', data: { price: amount, valid: time, course } });
      return;
    }
  }
  catch (err) {
    res.status(500).json({ message: err.message });
    return;
  }
}


// payment verification post request

const paymentVerifyPost = async (req, res) => {
  try {

    const data = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;

    let crypto = require("crypto");

    let expectedSignature = crypto.createHmac('sha256', process.env.RAZOR_PAY_KEY_SECRET)
      .update(data.toString())
      .digest('hex');

    // Compare the signatures
    if (expectedSignature === req.body.razorpay_signature) {
      // if same, then find the previously stored record using orderId,
      // and update paymentId and signature, and set status to paid.
      const result = await db.get().collection('payment').findOneAndUpdate({ orderId: req.body.razorpay_order_id }, { $set: { paymentId: req.body.razorpay_payment_id, signature: req.body.razorpay_signature, status: "paid" } }, { new: true });

      if (result.ok > 0) {

        const fetchOrderDetails = await db.get().collection('payment').findOne({ orderId: req.body.razorpay_order_id });
        let response;

        if (!!fetchOrderDetails) {
          response = sendMailForInvoice(fetchOrderDetails.name, fetchOrderDetails.email, fetchOrderDetails.mobile, fetchOrderDetails.course, fetchOrderDetails.orderId, fetchOrderDetails.status, fetchOrderDetails.amount, fetchOrderDetails.duration)
          if (response) {
            // Render payment success page, if saved successfully
            res.render('user/success', {
              title: "Payment verification successful",
              paymentDetail: fetchOrderDetails
            })
            return;
          } else {
            res.render('user/failed', {
              title: "Payment verification unsuccessful",
            })
            return;
          }
        }
        else {
          res.render('user/failed', {
            title: "Payment verification unsuccessful",
          })
          return;
        }

      }
      else {
        res.render('user/failed', {
          title: "Payment verification unsuccessful",
        })
        return;
      }

    } else {
      res.status(500).json({ message: "failed" });
      return;
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
    return;
  }
}


module.exports = {
  getHome,
  getAbout,
  getContact,
  getPrivatePolice,
  paymentRequest,
  enrollmentPostRequest,
  enrollmentPostRequest,
  newsletterPostRequest,
  contactPostRequest,
  paymentPostRequest,
  paymentVerifyPost,
}