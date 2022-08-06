

const nodemailer = require("nodemailer");


// async..await is not allowed in global scope, must use a wrapper
const sendMailForEnrollRequest = async (name, email, mobile, course) => {
  try {

    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    // let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.SENDER_MAIL_ID, // generated ethereal user
        pass: "rbsdlcgxipjktkfc", // generated ethereal password
      },
    });


    transporter.verify(function (error, success) {
      if (error) {
        return error;
      } else {
        return true;
      }
    });


    // send mail with defined transport object

    // let info = await transporter.sendMail({
    //   from: 'trialjust100@gmail.com', // sender address
    //   to: "trialjust100@gmail.com", // list of receivers
    //   subject: "Hello ✔", // Subject line
    //   text: "Hello world?", // plain text body
    //   html: "<b>Hello world?</b>", // html body
    // });


    const mailOptions = {
      from: process.env.SENDER_MAIL_ID, // sender address
      to: process.env.RECEIVER_MAIL_ID, // list of receivers
      subject: "Course Enrollment Request ✔", // Subject line
      html: `<pre>
            Student Name - ${name}
            Email        - ${email}
            Mobile       - ${mobile}
            course       - ${course}
            
    Regards
    ${name}
    </pre>`, // html body
    };


    transporter.sendMail(mailOptions, function (error, info) {
      if (error)
        return error;
      else
        return true;
      // console.log("Email sent successfully. " + info);
      //console.log('Message %s sent: %s', info.messageId, JSON.stringify(info));
    });

    // console.log("Message sent: %s", info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    return true;
  }
  catch (error) {
    return error;
  }

}


module.exports = sendMailForEnrollRequest;