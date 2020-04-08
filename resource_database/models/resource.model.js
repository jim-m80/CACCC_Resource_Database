const mongoose = require('mongoose');

// schema of the database
var resourceSchema = new mongoose.Schema({
    resourceType: String,
    resourceTypeDisplay: String,
    resourceName: String,
    resourcePhone: String,
    resourceAddress: String,
    resourceCity: String,
    resourceState: String,
    resourceZip: String,
    resourceHours: String,
    resourceWebsite: String,
    resourceServices: String,
    resourceLink: String,
    resourceRatingTotal: Number,
    resourceRatingCount: Number,
    resourceRatingCurrent: String,
    resourceReferrals: Number,
    //  used to create search parameters for the database
    resourceSearchData: String,
    //contains names of all the uploaded files
    resourceFiles: [String],
    resourceFileNames: [String],
});

//passed the schema to a mongoose model
mongoose.model('resource', resourceSchema);
