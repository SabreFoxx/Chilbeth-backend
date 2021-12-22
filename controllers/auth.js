const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

const register = (req, res) => {
    return res.status(500).json({message: "Registration not allowed!"}); // TODO outcomment this to enable registrations
    if (!req.body.name || !req.body.email || !req.body.password) {
        return res
            .status(400)
            .json({ "message": "All fields required" });
    }
    const user = new User();
    user.name = req.body.name;
    user.email = req.body.email;
    user.admin = false; // TODO set this to true for admin registrations
    user.setPassword(req.body.password);
    user.save((err) => {
        if (err) {
            res.status(404)
                .json(err);
        } else {
            const token = user.generateJwt();
            res.status(200)
                .json({ token });
        }
    });
};

/* Works with config/passport.js */
const login = (req, res) => {
    if (!req.body.email || !req.body.password) {
        return res.status(400)
            .json({ "message": "All fields required" });
    }
    // 'local', as in passport-local Strategy
    passport.authenticate('local', (err, user, info) => {
        let token;
        if (err) {
            return res.status(404)
                .json(err);
        }
        if (user) {
            token = user.generateJwt();
            res.status(200)
                .json({ token });
        } else {
            res.status(401)
                .json(info);
        }
    })(req, res);
};

module.exports = {
    register,
    login
};
