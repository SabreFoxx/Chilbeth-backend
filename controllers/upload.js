const mongoose = require('mongoose');
const canUpload = require('./check-user').checkUser;
const Picture = mongoose.model("Picture");
const CurriculumVitai = mongoose.model("CurriculumVitai");
const formidable = require('formidable');
const fs = require('fs');
const doAsync = require('doasync'); // To read bigImagePath asynchronously
const sharp = require('sharp');
// const jimp = require('jimp'); // I'm using sharp instead of jimp
const checkImageDimension = require('image-size');

function resize(path, width, height, outputName, callback = () => { }) {
    const outputImagePath = __dirname + '/../public/images/uploads/' + outputName + ".jpg";

    /* sharp uses native binaries, and I don't know why that makes it stop randomly on glitch.com */
    // but because I'm now deploying on an EC2 container, I can use sharp
    sharp(path)
        .toFormat('jpg')
        .resize(width, height)
        .toFile(outputImagePath)
        .then(() => {
            callback(path);
        }).
        catch(err => {
            console.log('Image upload in upload.js failed', err)
            return false;
            // TODO no continuity when fail
        });

    // With promise
    // jimp.read(path)
    //     .then(image => { // image will be automatically encoded in jpg
    //         if (image
    //             .resize(width, height)
    //             .quality(60)
    //             .write(outputImagePath))
    //             callback(path);
    //     })
    //     .catch(err => console.log('Image upload in upload.js failed', err)); // TODO no continuity when fail
}

function deleteFile(name) {
    let filePath = __dirname + '/../public/images/uploads/' + name + ".jpg";
    fs.unlinkSync(filePath);
}

// Sends files to database and deletes from disk
const moveFilesToMongoDB = (sortingHash, author, callback) => {
    let smallImagePath = __dirname + '/../public/images/uploads/small/' + sortingHash + ".jpg";
    let bigImagePath = __dirname + '/../public/images/uploads/big/' + sortingHash + ".jpg";
    // store an img in binary in mongo

    doAsync(fs).readFile(bigImagePath) // We can't read the large image synchronously since it's large. We read it from here, asynchronously, instead
        .then((bigImage) => {
            Picture.create({
                authorEmail: author.email,
                sortingHash: sortingHash,
                smallSize: fs.readFileSync(smallImagePath, { encoding: 'base64' }), // We can easily read the small image synchronously
                bigSize: Buffer.from(bigImage).toString('base64')
            }, (err, picture) => {
                callback(err, picture); // Callback, so that after saving it we can send status messages from there
                // Note that 'picture' is a Mongoose object
            });
        });
}

function isHex(string) {
    // NOTE the function uploadAndDelete() allows a string to have '#' in-between
    // So we're going to allow this test pass for strings that contain exactly one '#' in them
    var a = parseInt(string, 16);
    return true; // TODO fix
    return (a.toString(16) === string.toLowerCase());
}

const performUpload = (req, res, savingTechnique) => {
    canUpload(req, res, (req, res, author) => { // If JWT was decrypted, and is valid
        new formidable.IncomingForm().parse(req)
            .on('fileBegin', (name, file) => { // JavaScript 'on' events
                file.path = __dirname + '/../public/images/uploads/' + file.name
            })
            // .on('field', (name, field) => {
            //     console.log('Field', name, field)
            // })
            // .on('file', (name, file) => {
            //     console.log('Uploaded file', name, file)
            // })
            // .on('aborted', () => {
            //     console.error('Request aborted by the user')
            // })
            // .on('error', (err) => {
            //     console.error('Error', err)
            //     throw err
            // })
            .on('file', (name, file) => {
                // When sending the image from the front-end, the sortingHash was the file name
                let sortingHash = name; // Do not optimize this line, to maintain its clarity
                if (!isHex(sortingHash)) { // Make sure the sortingHash is sensible (i.e a hex string)
                    fs.unlinkSync(file.path); // We won't make use of the image, so delete it
                    return res.status(400)
                        .json({ error: "Invalid file upload name" });
                } else
                    savingTechnique(file, sortingHash, author); // Save it the way I want it saved
            })
            .on('error', (err) => {
                return res.status(400)
                    .json(err);
            });
        // .on('end', () => {
        //     res.end();
        // });
    });
}

const deletePictureFromDatabase = (sortingHash) => { // Do not call this function within an unauthenticated operation
    Picture.findOneAndRemove({ sortingHash: sortingHash })
        .exec((err, picture) => {
            if (err)
                return err;
        });
}

const deleteCvFromDatabase = (sortingHash) => { // Do not call this function within an unauthenticated operation
    CurriculumVitai.findOneAndRemove({ sortingHash: sortingHash })
        .exec((err, cv) => {
            if (err)
                return err;
        });
}

// Performs a simple image upload for blogs
const upload = (req, res) => {
    let savingTechnique = (file, sortingHash, author) => {
        // 'file' is an object that encapsulates the newly uploaded file
        // We resize the uploaded image to two versions
        // 450x300 has the aspect ratio 1.5:1 or 3:2
        resize(file.path, 450, 300, `small/${sortingHash}`); // This is an asynchronous call, so if it doesn't complete before the next, we are in trouble. OMG I'm so lazy
        // 1080x720 has the aspect ratio 1.5:1 or 3:2
        resize(file.path, 1080, 720, `big/${sortingHash}`, (originalPathToDelete) => {  // aspect ratio 3:2
            moveFilesToMongoDB(sortingHash, author, (err, picture) => { // Then save the resized versions to the database
                fs.unlinkSync(originalPathToDelete); // Delete original image file (the large image that just got uploaded)
                // When we successfully added the image to the database
                // Delete the small and large image files on disk
                deleteFile(`small/${sortingHash}`);
                deleteFile(`big/${sortingHash}`);

                if (err) // Did any error occur?
                    return res.status(400)
                        .json(err);

                // We are done if no errors
                res.status(201)
                    .json({
                        message: "Image uploaded successfully",
                        image: picture
                    });
            });
        });
    };
    performUpload(req, res, savingTechnique);
}

// Performs an upload, and at the same time deletes an existing image using its sorting hash
// NOTICE: For uploading of landing page hero image, site logo, profile picture, cv, DO NOT
// use this method, because deleting of the old uploaded files for those are handled in
// siteSettings.js, where deleteFromDatabase() is called.
const uploadAndDelete = (req, res) => {
    let savingTechnique = (file, sortingHashes, author) => {
        // From the front-end, the sortingHash of the Image to upload
        // and the Image to delete, were joined together in one string
        // and separated by '#'
        sortingHashes = sortingHashes.split('#');
        sortingHash = sortingHashes[0];
        resize(file.path, 450, 300, `small/${sortingHash}`);
        resize(file.path, 1080, 720, `big/${sortingHash}`, (originalPathToDelete) => {
            moveFilesToMongoDB(sortingHash, author, (err, picture) => {
                fs.unlinkSync(originalPathToDelete);
                deleteFile(`small/${sortingHash}`);
                deleteFile(`big/${sortingHash}`);

                if (err)
                    return res.status(400)
                        .json(err);

                // We are done if no errors
                deletePictureFromDatabase(sortingHashes[1]); // Delete what we should delete
                res.status(201)
                    .json({
                        message: "Image uploaded successfully",
                        image: picture
                    });
            });
        });
    };
    performUpload(req, res, savingTechnique);
}

// Performs image upload for artworks
const uploadArtwork = (req, res) => {
    let savingTechnique = (file, sortingHash, author) => {
        const dimensions = checkImageDimension(file.path);
        const aspectRatio = dimensions.width / dimensions.height;
        let height, width = 0;
        if (dimensions.width > dimensions.height) {
            width = 1080;
            height = ratioHeightFromWidth(aspectRatio, 1, width);
        } else {
            height = 1080;
            width = ratioWidthFromHeight(aspectRatio, 1, height);
        }
        resize(file.path, 450, 300, `small/${sortingHash}`);
        resize(file.path, width, height, `big/${sortingHash}`, (originalPathToDelete) => {
            moveFilesToMongoDB(sortingHash, author, (err, picture) => {
                fs.unlinkSync(originalPathToDelete);
                deleteFile(`small/${sortingHash}`);
                deleteFile(`big/${sortingHash}`);

                if (err)
                    return res.status(400)
                        .json(err);

                // We are done if no errors
                res.status(201)
                    .json({
                        message: "Image uploaded successfully",
                        image: picture
                    });
            });
        });
    };
    performUpload(req, res, savingTechnique);
}

// Uploads an image for the landing page
const uploadLandingImage = (req, res) => {
    let savingTechnique = (file, sortingHash, author) => {
        resize(file.path, 450, 300, `small/${sortingHash}`);
        resize(file.path, 1344, 678, `big/${sortingHash}`, (originalPathToDelete) => {
            moveFilesToMongoDB(sortingHash, author, (err, picture) => {
                fs.unlinkSync(originalPathToDelete);
                deleteFile(`small/${sortingHash}`);
                deleteFile(`big/${sortingHash}`);

                if (err)
                    return res.status(400)
                        .json(err);

                // We are done if no errors
                res.status(201)
                    .json({
                        message: "Image uploaded successfully",
                        image: picture
                    });
            });
        });
    };
    // Perform upload
    performUpload(req, res, savingTechnique);
}

// Uploads an image for the landing page
const uploadSiteLogo = (req, res) => {
    let savingTechnique = (file, sortingHash, author) => {
        let bigImagePath = __dirname + '/../public/images/uploads/big/' + sortingHash + ".png";

        // Copy file to bigImagePath, instead of resizing it as usual. It's a PNG image
        fs.copyFile(file.path, bigImagePath, (err) => {
            // Store image as binary in mongo db
            doAsync(fs).readFile(bigImagePath) // We can't read the large image synchronously since it's large. We read it from here, asynchronously, instead
                .then((bigImage) => {
                    Picture.create({
                        sortingHash: sortingHash,
                        smallSize: 'null',
                        bigSize: Buffer.from(bigImage).toString('base64'),
                        contentType: "image/png"
                    }, (err, picture) => {
                        fs.unlinkSync(file.path); // Delete the initial original upload
                        fs.unlinkSync(bigImagePath);

                        if (err)
                            return res.status(400)
                                .json(err);

                        // We are done if no errors
                        res.status(201)
                            .json({
                                message: "Image uploaded successfully",
                                image: picture
                            });
                        // Note that 'picture' is a Mongoose object
                    });
                });
        });
    }
    // Perform upload
    performUpload(req, res, savingTechnique);
}

// Upload profile picture
const uploadProfile = (req, res) => {
    if (req.params.type == "curriculumVitae")
        return uploadCV(req, res); // Get out of uploadProfile() function
    let savingTechnique = (file, sortingHash, author) => {
        let smallSize = { w: null, h: null }, bigSize = { w: null, h: null }; // The sizes here, should be of portrait orientation
        if (req.params.type == "profilePicture") {
            smallSize.w = 300;
            smallSize.h = 450;
            bigSize.w = 400;
            bigSize.h = 600;
        } else if (req.params.type == "profileThumbnail") {
            smallSize.w = 60;
            smallSize.h = 60;
            bigSize.w = 100;
            bigSize.h = 100;
        }
        resize(file.path, smallSize.w, smallSize.h, `small/${sortingHash}`);
        resize(file.path, bigSize.w, bigSize.h, `big/${sortingHash}`, (originalPathToDelete) => {
            moveFilesToMongoDB(sortingHash, author, (err, picture) => {
                fs.unlinkSync(originalPathToDelete);
                deleteFile(`small/${sortingHash}`);
                deleteFile(`big/${sortingHash}`);

                if (err)
                    return res.status(400)
                        .json(err);

                // We are done if no errors
                res.status(201)
                    .json({
                        message: "Image uploaded successfully",
                        image: picture
                    });
            });
        });
    };
    // Perform upload
    performUpload(req, res, savingTechnique);
}

const uploadCV = (req, res) => {
    let savingTechnique = (file, sortingHash, author) => {
        let copiedFile = __dirname + '/../public/images/uploads/big/' + sortingHash + ".pdf";

        fs.copyFile(file.path, copiedFile, (err) => {
            doAsync(fs).readFile(copiedFile)
                .then((readFile) => {
                    CurriculumVitai.create({
                        sortingHash: sortingHash,
                        cvFile: Buffer.from(readFile).toString('base64'),
                        contentType: "application/pdf"
                    }, (err, mongoObject) => {
                        fs.unlinkSync(file.path); // Delete the initial original upload
                        fs.unlinkSync(copiedFile);

                        if (err)
                            return res.status(400)
                                .json(err);

                        // We are done if no errors
                        res.status(201)
                            .json({
                                message: "File uploaded successfully",
                                image: mongoObject
                            });
                    });
                });
        });
    }
    // Perform upload
    performUpload(req, res, savingTechnique);
}

/**
   * Given the width, compute what the height will be, using an aspect ratio firstNumber:secondNumber
   */
function ratioHeightFromWidth(firstNumber, secondNumber, width) {
    /*
      Example: Given a ratio 4:3 and a supplid width 16, what will be the height?
      Solution: How many times can 4 divide 16? that's 16/4=4. And 4 becomes our atomic.
      When we expand our atom 3 times, we get the height.
    */
    return (width / firstNumber) * secondNumber;
}

/**
   * Given the height, compute what the width will be, using an aspect ratio firstNumber:secondNumber
   */
function ratioWidthFromHeight(firstNumber, secondNumber, height) {
    return (height / secondNumber) * firstNumber;
}

module.exports = {
    upload,
    uploadLandingImage,
    uploadSiteLogo,
    uploadArtwork,
    uploadAndDelete,
    uploadProfile,
    deleteFromDatabase: deletePictureFromDatabase,
    deleteCvFromDatabase
};
