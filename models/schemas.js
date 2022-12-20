const mongoose = require('mongoose');

const blogCommentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: String,
    comment: {
        type: String,
        maxlength: 1000
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
});

const blogSchema = new mongoose.Schema({
    authorEmail: {
        type: String,
        required: true,
        default: process.env.DEFAULT_AUTHOR
    },
    title: {
        type: String,
        required: true
    },
    post: String,
    desc: String,
    imageSortHash: {
        type: String,
        default: "default.jpg" // TODO
    },
    videoUrl: { type: String, maxlength: 500 },
    createdOn: {
        type: Date,
        default: Date.now
    },
    comments: [blogCommentSchema],
    commentCount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    }
});

// Index for blogs
blogSchema.index({ title: "text", desc: "text", post: "text" }, {
    weights: {
        title: 5,
        desc: 3,
        body: 3
    }
});

blogSchema.statics = {
    searchPartial: function (q, callback) {
        return this.find({
            $or: [
                { "title": new RegExp(q, "gi") },
                { "desc": new RegExp(q, "gi") },
                { "post": new RegExp(q, "gi") },
            ]
        }, callback);
    },

    searchFull: function (q, callback) {
        return this.find({
            $text: { $search: q, $caseSensitive: false }
        }, callback)
    },

    search: function (q, callback) {
        this.searchFull(q, (err, data) => {
            if (err) return callback(err, data);
            if (!err && data.length) return callback(err, data);
            if (!err && data.length === 0) return this.searchPartial(q, callback);
        });
    },
}

const workCategorySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    numberOfWorks: {
        type: Number,
        default: 0
    }
});

const workSchema = new mongoose.Schema({
    authorEmail: {
        type: String,
        required: true,
        default: process.env.DEFAULT_AUTHOR
    },
    title: {
        type: String,
        required: true
    },
    categoryId: {
        type: String,
        required: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    imageSortHash: {
        type: String,
        required: true,
        default: "default.jpg" // TODO
    },
    videoUrl: { type: String, maxlength: 500 },
    desc: {
        type: String
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
});

const exhibitionSchema = new mongoose.Schema({
    authorEmail: {
        type: String,
        required: true,
        default: process.env.DEFAULT_AUTHOR
    },
    title: {
        type: String,
        required: true
    },
    imageSortHash: {
        type: String,
        required: true,
        default: "default.jpg" // TODO
    },
    videoUrl: { type: String, maxlength: 500 },
    desc: {
        type: String
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
});

const pictureSchema = new mongoose.Schema({
    authorEmail: {
        type: String,
        required: true,
        default: process.env.DEFAULT_AUTHOR
    },
    sortingHash: {
        type: String,
        required: true,
        unique: true
    },
    smallSize: {
        type: String
    },
    bigSize: {
        type: String
    },
    contentType: {
        type: String,
        required: true,
        default: 'image/jpeg'
    }
});

const curriculumVitaeSchema = new mongoose.Schema({
    authorEmail: {
        type: String,
        required: true,
        default: process.env.DEFAULT_AUTHOR
    },
    sortingHash: {
        type: String,
        required: true,
        unique: true
    },
    cvFile: {
        type: String
    },
    contentType: {
        type: String,
        required: true,
        default: 'application/pdf'
    }
});

// There is only one (1) ever record in this collection
const siteSettingSchema = new mongoose.Schema({
    static: {
        type: Number,
        unique: true,
        default: 1
    },
    siteLogo: String,
    landingImageOne: String,
    landingImageTwo: String,
    landingImageThree: String,
    landingImageFour: String,
    landingImageFive: String,
    profilePicture: String,
    profileThumbnail: String,
    curriculumVitae: String,

    name: {
        type: String,
        maxlength: 20
    },
    occupation: {
        type: String,
        maxlength: 20
    },
    desc: {
        type: String,
        maxlength: 95
    },
    landingMessageHeading: {
        type: String,
        maxlength: 160
    },
    landingMessage: {
        type: String,
        maxlength: 1500
    },
    aboutHeading: {
        type: String,
        maxlength: 500
    },
    about: {
        type: String,
        maxlength: 100000
    },
    phone: {
        type: String,
        maxlength: 16
    },
    email: {
        type: String,
        maxlength: 55
    },
    facebook: {
        type: String,
        maxlength: 55
    },
    twitter: {
        type: String,
        maxlength: 55
    },
    youtube: {
        type: String,
        maxlength: 55
    },
    instagram: {
        type: String,
        maxlength: 55
    },
    city: {
        type: String,
        maxlength: 16
    },
    country: {
        type: String,
        maxlength: 16
    },
    district: {
        type: String,
        maxlength: 16
    },
    openingTimes: {
        type: String,
        maxlength: 55
    }
});

const newsletterSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        minlength: 10,
        maxlength: 55
    }
});

mongoose.model("Blog", blogSchema);
mongoose.model("WorkCategory", workCategorySchema);
mongoose.model("Work", workSchema);
mongoose.model("Exhibition", exhibitionSchema);
mongoose.model("Picture", pictureSchema);
mongoose.model("CurriculumVitai", curriculumVitaeSchema);
mongoose.model("Setting", siteSettingSchema);
mongoose.model("Newsletter", newsletterSchema);
