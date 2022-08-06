const db = require('../dbconfig');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// login get request 
const getLogin = async (req, res, next) => {
    try {

        res.status(200).render('dashboard/login', { status: "SUCCESS", title: "Login", layout: "adminLayout" });
        return;
    }
    catch (err) {
        res.status(500).json({ status: "FAILED", message: err.message });
        return;

    }
};

// payment get request 
const getPayment = async (req, res, next) => {
    try {
        const cookies = req.cookies;

        if (cookies?.jwt) {
            const result = await db.get().collection('payment').find({}).toArray();

            if (!!result) {
                res.status(200).render('dashboard/index', {
                    layout: "adminLayout", status: "SUCCESS", title: "Payment Details", activeP: true, payment: result, helpers: {
                        inc: function (value, options) {
                            return parseInt(value) + 1;
                        }
                    },
                    email: req.email
                });
                return;
            } else {
                res.status(200).render('dashboard/index', {
                    layout: "adminLayout", status: "SUCCESS", title: "Payment Details", activeP: true, payment: []
                });
                return;
            }
        } else {
            res.status(200).render('dashboard/login', { status: "FAILED", title: "Login", layout: "adminLayout" });
            return;
        }
    }
    catch (err) {
        res.status(500).render('dashboard/error', { layout: "adminLayout", status: "FAILED", message: err.message });
        return;
    }
};

// newsletter get request 
const getNewsletter = async (req, res, next) => {
    try {
        const result = await db.get().collection('newsletter').find({}).toArray();

        if (result) {
            res.status(200).render('dashboard/newsletter', {
                layout: "adminLayout", status: "SUCCESS", title: "Newsletter Details", activeN: true, subscriber: result, helpers: {
                    inc: function (value, options) {
                        return parseInt(value) + 1;
                    }
                },
                email: req.email
            });
            return;
        } else {
            res.status(200).render('dashboard/newsletter', { layout: "adminLayout", status: "SUCCESS", title: "Newsletter Details", activeN: true, subscriber: [] });
            return;
        }
    }
    catch (err) {
        res.status(500).render('dashboard/error', { layout: "adminLayout", status: "FAILED", message: err.message });
        return;
    }
};

// contact get request
const getContact = async (req, res, next) => {
    try {

        const result = await db.get().collection('contact').find({}).toArray();

        if (result) {
            res.status(200).render('dashboard/contact', {
                layout: "adminLayout", status: "SUCCESS", title: "contact Details", activeC: true, contact: result, helpers: {
                    inc: function (value, options) {
                        return parseInt(value) + 1;
                    }
                },
                email: req.email
            });
            return;
        }
        else {
            res.status(200).render('dashboard/contact', {
                layout: "adminLayout", status: "SUCCESS", title: "contact Details", activeC: true, contact: []
            });
            return;
        }

    }
    catch (err) {
        res.status(500).render('dashboard/error', { layout: "adminLayout", status: "FAILED", message: err.message });
        return;
    }
};

// enrollment get request
const getEnrollment = async (req, res, next) => {
    try {
        const result = await db.get().collection('enrollment').find({}).toArray();
        if (result) {
            res.status(200).render('dashboard/enrollment', {
                layout: "adminLayout", status: "SUCCESS", title: "Newsletter Details", activeE: true, enrollment: result, helpers: {
                    inc: function (value, options) {
                        return parseInt(value) + 1;
                    }
                },
                email: req.email
            });
            return;
        } else {
            res.status(200).render('dashboard/enrollment', {
                layout: "adminLayout", status: "SUCCESS", title: "Newsletter Details", activeE: true, enrollment: []
            });
            return;
        }
    }
    catch (err) {
        res.status(500).render('dashboard/error', { layout: "adminLayout", status: "FAILED", message: err.message });
        return;
    }
};


// register user post request
const registerUser = async (req, res) => {
    const { email, pwd } = req.body;
    if (!email || !pwd) {
        res.status(400).json({ layout: "adminLayout", status: "FAILED", message: 'Username and password are required.' });
        return;
    }
    // check for duplicate usernames in the db
    const duplicate = await db.get().collection('user').findOne({ email: email });

    if (duplicate) {
        res.status(400).json({ layout: "adminLayout", status: "FAILED", message: 'User already exist!' });
        return;
    }
    try {
        //encrypt the password
        const hashedPwd = await bcrypt.hash(pwd, 10);

        //create and store the new user
        const result = await db.get().collection('user').insertOne({ email: email, password: hashedPwd, roles: { Admin: 5150 }, refreshToken: [] });

        if (result) {
            res.status(201).json({ layout: "adminLayout", status: "SUCCESS", 'message': `Registration successful !` });
            return;
        } else {
            res.status(400).json({ layout: "adminLayout", status: "FAILED", message: 'User already exist!' });
            return;
        }

    } catch (err) {
        res.status(500).json({ layout: "adminLayout", status: "FAILED", message: err.message });
        return;
    }
}

// login post request
const userLogin = async (req, res) => {

    try {
        const cookies = req.cookies;

        console.log(`cookie available at login: ${JSON.stringify(cookies)}`);

        const { email, pwd } = req.body;

        if (!email || !pwd) {
            res.status(400).json({ layout: "adminLayout", status: "FAILED", message: 'Username and password are required.' });
            return;
        }
        const foundUser = await db.get().collection('user').findOne({ email: email });

        if (!foundUser) {
            res.status(400).json({ layout: "adminLayout", status: "FAILED", message: 'user not found.' }); //Unauthorized 
            return;
        }
        // evaluate password 
        const match = await bcrypt.compare(pwd, foundUser.password);
        if (match) {
            const roles = Object.values(foundUser.roles).filter(Boolean);
            // create JWT
            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "email": foundUser.email,
                        "roles": roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1h' }
            );

            const newRefreshToken = jwt.sign(
                {
                    "UserInfo": {
                        "email": foundUser.email,
                        "roles": roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1h' }
            );

            // Changed to let keyword
            let newRefreshTokenArray =
                !cookies?.jwt
                    ? foundUser.refreshToken
                    : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);

            if (cookies?.jwt) {
                /* 
                Scenario added here: 
                1) User logs in but never uses RT and does not logout 
                2) RT is stolen
                3) If 1 & 2, reuse detection is needed to clear all RTs when user logs in
                */
                const refreshToken = cookies.jwt;
                const foundToken = await db.get().collection('user').findOne({ refreshToken: { $in: [refreshToken] } });

                // Detected refresh token reuse!
                if (!foundToken) {
                    // clear out ALL previous refresh tokens
                    newRefreshTokenArray = [];
                }

                res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
            }

            // Saving refreshToken with current user
            let refreshToken = [...newRefreshTokenArray, newRefreshToken];

            const result = await db.get().collection('user').updateOne({ email: email }, { $set: { refreshToken: refreshToken } });

            if (result.acknowledged === true && result.modifiedCount > 0) {
                // Creates Secure Cookie with refresh token
                res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

                // Send authorization roles and access token to user
                res.status(200).json({ status: "SUCCESS", message: 'user Login successful', accessToken });
                return;
            } else {
                res.status(401).json({ status: "FAILED", message: 'Something went wrong !' });
                return;
            }

        } else {
            res.status(401).json({ status: "FAILED", message: "Please enter correct password !" });
            return;
        }
    }
    catch (err) {
        res.status(500).json({ status: "FAILED", message: err.message });
        return;
    }
}


// user logout request 
const userLogout = async (req, res) => {
    try {
        // On client, also delete the accessToken

        const cookies = req.cookies;
        if (!!cookies?.jwt === false) {
            res.cookie('jwt', req.cookies, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });
            res.status(204).render('dashboard/login', { layout: "adminLayout", status: "SUCCESS", accessToken: req.cookies });
            return;
        }
        const refreshToken = cookies?.jwt;

        // Is refreshToken in db?
        const foundUser = await db.get().collection('user').findOne({ refreshToken: { $in: [refreshToken] } });

        if (!!foundUser === false) {
            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
            res.status(200).render('dashboard/login', { status: "FAILED", title: "Login", layout: "adminLayout" });
            return;
        }

        // Delete refreshToken in db
        // foundUser.refreshToken = foundUser.refreshToken.filter(rt => rt !== refreshToken);
        const result = await db.get().collection('user').updateOne({ email: foundUser.email }, { $set: { refreshToken: [] } });

        if (result.acknowledged === true && result.modifiedCount > 0) {
            res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

            // Send authorization roles and access token to user
            res.status(200).render('dashboard/login', { status: "SUCCESS", title: "Login", layout: "adminLayout" });
            return;
        } else {
            res.status(200).render('dashboard/login', { status: "FAILED", title: "Login", layout: "adminLayout" });
            return;
        }
    }
    catch (err) {
        res.status(500).render('dashboard/login', { layout: "adminLayout", status: "FAILED", message: err.message });
        return;
    }
}

// refresh token request 
const handleRefreshToken = async (req, res) => {
    try {
        const cookies = req.cookies;

        if (!cookies?.jwt) {
            res.status(500).render('dashboard/login', { layout: "adminLayout", status: "FAILED", message: 'Please login!' });
            return;
        }

        const refreshToken = cookies.jwt;
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

        let foundUser = await db.get().collection('user').findOne({ refreshToken: { $in: [refreshToken] } });

        // Detected refresh token reuse!
        if (!!foundUser) {
            jwt.verify(
                refreshToken,
                process.env.REFRESH_TOKEN_SECRET,
                async (err, decoded) => {
                    if (err) {
                        res.render('dashboard/login', { layout: "adminLayout", status: "FAILED", message: err.message });
                        return;
                    } else {
                        const hackedUser = await db.get().collection('user').findOne({ email: req.email });
                        const result = await db.get().collection('user').updateOne({ email: hackedUser.email }, { $set: { refreshToken: [] } });
                    }
                }
            )
            return res.render('dashboard/login', { layout: "adminLayout", status: "FAILED", message: "something went wrong!" });
        }

        const newRefreshTokenArray = foundUser.refreshToken.filter(rt => rt !== refreshToken);

        // evaluate jwt 
        jwt.verify(
            refreshToken,
            process.env.ACCESS_TOKEN_SECRET,
            async (err, decoded) => {
                if (err) {
                    const result = await db.get().collection('user').updateOne({ refreshToken: { $in: [refreshToken] } }, { $set: { refreshToken: [] } });
                    return;
                }

                if (err || foundUser.email !== decoded.email) {
                    return res.render('dashboard/login', { layout: "adminLayout", status: "FAILED", message: "something went wrong!" });
                }
                // Refresh token was still valid
                const roles = Object.values(foundUser.roles);
                const accessToken = jwt.sign(
                    {
                        "UserInfo": {
                            "email": decoded.email,
                            "roles": roles
                        }
                    },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '1h' }
                );

                const newRefreshToken = jwt.sign(
                    { "email": foundUser.email },
                    process.env.ACCESS_TOKEN_SECRET,
                    { expiresIn: '1d' }
                );
                // Saving refreshToken with current user
                let refreshToken = [...newRefreshTokenArray, newRefreshToken];
                const result = await db.get().collection('user').updateOne({ email: foundUser.email }, { $set: { refreshToken: refreshToken } });

                if (result.acknowledged === true && result.modifiedCount > 0) {
                    // Creates Secure Cookie with refresh token
                    res.cookie('jwt', newRefreshToken, { httpOnly: true, secure: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 });

                    // Send authorization roles and access token to user
                    res.status(200).render('dashboard/login', { layout: "adminLayout", status: "SUCCESS", message: 'user Login successful', accessToken, roles });
                    return;
                } else {
                    res.status(401).render('dashboard/login', { layout: "adminLayout", status: "FAILED", message: 'Something went wrong !' });
                    return;
                }

            }
        );
    }
    catch (err) {
        res.status(500).render('dashboard/login', { layout: "adminLayout", status: "FAILED", message: err.message });
        return;
    }
}


module.exports = {
    getLogin,
    getPayment,
    getNewsletter,
    getContact,
    getEnrollment,
    registerUser,
    userLogin,
    userLogout,
    handleRefreshToken
};