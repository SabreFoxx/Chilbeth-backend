const mongoose = require('mongoose');
const { deleteCvFromDatabase } = require('./upload');
const canAccess = require('./check-user').checkUser; // Used for checking user priviledges
const Settings = mongoose.model('Setting');
const deleteImageFromDB = require('./upload').deleteFromDatabase;
const deleteCvFromDB = require('./upload').deleteCvFromDatabase;

const readSettings = (req, res) => {
    Settings.findOne({ static: 1 }, (err, settings) => {
        if (err) {
            return res.status(500).json(err);
        } else if (!settings) {
            return res.status(500).json({ message: "Problem while retrieving site settings" });;
        }
        res.status(200)
            .json(settings);
    });
}

const saveSettings = function (req, res) {
    canAccess(req, res, (req, res, author) => { // Can I access what is below?
        try { // Try..catch block to supress all TypeError, or errors of undefined references, cause we'll be getting a lot here

            Settings.findOne({ static: 1 }, (err, settings) => {
                if (err) return res.status(500).json(err);
                if (!settings) { // If no settings record has been created. Note that there is only ever one setting record, and it has a field 'static' whose value is 1
                    Settings.create({ // Create a record
                        static: 1,
                        siteLogo: req.body.siteLogo,
                        landingImageOne: req.body.landingImageOne,
                        landingImageTwo: req.body.landingImageTwo,
                        landingImageThree: req.body.landingImageThree,
                        landingImageFour: req.body.landingImageFour,
                        landingImageFive: req.body.landingImageFive
                    }, (err, newRecord) => {
                        if (err) res.status(500).json(err);
                        else {
                            res.status(200)
                                .json(newRecord);
                        }
                    });
                } else {
                    if (req.body.siteLogo !== '')
                        settings.siteLogo = req.body.siteLogo;
                    if (req.body.landingImageOne !== '')
                        settings.landingImageOne = req.body.landingImageOne;
                    if (req.body.landingImageTwo !== '')
                        settings.landingImageTwo = req.body.landingImageTwo;
                    if (req.body.landingImageThree !== '')
                        settings.landingImageThree = req.body.landingImageThree;
                    if (req.body.landingImageFour !== '')
                        settings.landingImageFour = req.body.landingImageFour;
                    if (req.body.landingImageFive !== '')
                        settings.landingImageFive = req.body.landingImageFive;
                    if (req.body.profilePicture !== '')
                        settings.profilePicture = req.body.profilePicture;
                    if (req.body.profileThumbnail !== '')
                        settings.profileThumbnail = req.body.profileThumbnail;
                    if (req.body.curriculumVitae !== '')
                        settings.curriculumVitae = req.body.curriculumVitae;

                    if (req.body.name !== '')
                        settings.name = req.body.name;
                    if (req.body.occupation !== '')
                        settings.occupation = req.body.occupation;
                    if (req.body.desc !== '')
                        settings.desc = req.body.desc;
                    if (req.body.landingMessageHeading !== '')
                        settings.landingMessageHeading = req.body.landingMessageHeading;
                    if (req.body.landingMessage !== '')
                        settings.landingMessage = req.body.landingMessage;
                    if (req.body.aboutHeading !== '')
                        settings.aboutHeading = req.body.aboutHeading;
                    if (req.body.about !== '')
                        settings.about = req.body.about;
                    if (req.body.phone !== '')
                        settings.phone = req.body.phone;
                    if (req.body.email !== '')
                        settings.email = req.body.email;
                    if (req.body.facebook !== '')
                        settings.facebook = req.body.facebook;
                    if (req.body.twitter !== '')
                        settings.twitter = req.body.twitter;
                    if (req.body.youtube !== '')
                        settings.youtube = req.body.youtube;
                    if (req.body.instagram !== '')
                        settings.instagram = req.body.instagram;
                    if (req.body.city !== '')
                        settings.city = req.body.city;
                    if (req.body.district !== '')
                        settings.district = req.body.district;
                    if (req.body.country !== '')
                        settings.country = req.body.country;
                    if (req.body.openingTimes !== '')
                        settings.openingTimes = req.body.openingTimes;
                    // Add other records here
                    settings.save((err, updatedSettings) => {
                        if (err) res.status(500).json(err);
                        else {
                            // Delete old files which have sortingHashes and is stored in the database
                            deleteImageFromDB(req.body.previousImageForDeletion);
                            if (req.body.curriculumVitae !== '')
                                deleteCvFromDatabase(req.body.previousImageForDeletion)
                            res.status(200).json(updatedSettings);
                        }
                    });
                }
            });

        } catch ($e) {
            if (!($e instanceof TypeError)) throw $e;
        }
    });
};

module.exports = {
    saveSettings,
    readSettings
}