// initializing various services
const express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const Resource = mongoose.model('resource');
const formidable = require('formidable');
var http = require('http');
const fs = require('fs');
const path = require('path');
var uploadDir = "attachments";

const resourceTypes = [
  "Behavioral And Mental Health Care",
  "Child Care And After School",
  "Disability",
  "Drug And Alcohol",
  "Educational",
  "Emergency Shelters",
  "Employment",
  "Financial Assistance",
  "Food And Clothing Pantries",
  "Grief Support",
  "Household ",
  "Housing",
  "Immigration And Refugee",
  "Legal",
  "Medical Health Care",
  "Miscellaneous",
  "Parenting Classes",
  "Pet Services",
  "Residential Group Homes",
  "Senior Services",
  "Transportation",
];
var processedResourceTypes = [];
//processing resource types array (removing whitespace and caps)
//we dont do this in the array to begin with for readability on the dropdown box
resourceTypes.forEach((value, index, array) => {
  processedResourceTypes.push(processResourceType(value));
});

function processResourceType(type) {
  return type.replace(/ /g, '').toLowerCase(); //removing all whitespace from the requested type & making it non case sensitive
}

//processing cmd args
process.argv.forEach((val, index, array) => {
  if (val == "-uploadPath" && process.argv.length > index + 1) {
    uploadDir = array[index + 1];
    console.log("upload directory set to: " + array[index + 1]);
  }
});

//GET request for Uploads
router.get('/uploads/:id', (req, res) => {
  Resource.findById(req.params.id, (err, doc) => {
    if (!err) {
      res.render("resource/uploads", {
        viewTitle: "Uploads",
        resource: doc,
      });
    }
  });
});
//POST request for Uploads (multipart form needs formidable)
//attachments are saved in "attachments/<id>"
router.post('/uploads', (req, res) => {
  var id;
  var filePath;
  if (!fs.existsSync("tmp")) {
    fs.mkdirSync("tmp");
  }
  const form = formidable.IncomingForm({
    keepExtensions: true,
    uploadDir: "tmp/"
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log("error during attachment form parsing: " + err);
      res.redirect('/uploads/' + id);
    }
    const uploadDirectory = uploadDir + "/" + fields._id;
    id = fields._id;

    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory);
    }

    filePath = uploadDirectory + "/" + files.fileUpload.name;
    const tmpFile = files.fileUpload.path;
    fs.renameSync(tmpFile, filePath);

    //add the new uploaded filename to the record
    Resource.findById(id, (err, resource) => {
      if (err) {
        console.log("error during attachment resource finding (id: " + id + "): " + err);
      }
      else if (resource == null) {
        console.log("resource not found");
      } else {
        resource.resourceFiles.push(filePath);
        resource.resourceFileNames.push(files.fileUpload.name);
        resource.save((err, doc) => {
          if (err)
            console.log('Error during attachment insertion: ' + err);
          res.redirect('/uploads/' + id);
        });
      }
    });


  });
});
// GET request for Insert Resource
router.get('/', (req, res) => {
  res.render("resource/addOrEdit", {
    viewTitle: "Insert Resource",
    types: resourceTypes
  });
});

// POST request for Insert Resource
router.post('/', (req, res) => {
  if (req.body._id == '')
    insertRecord(req, res);
  else
    updateRecord(req, res);
});

// method to insert record into the database
function insertRecord(req, res) {
  var resource = new Resource();
  resource.resourceType = processResourceType(req.body.resourceType);
  resource.resourceTypeDisplay = req.body.resourceType;
  resource.resourceName = req.body.resourceName;
  resource.resourcePhone = req.body.resourcePhone;
  resource.resourceAddress = req.body.resourceAddress;
  resource.resourceCity = req.body.resourceCity;
  resource.resourceState = req.body.resourceState;
  resource.resourceZip = req.body.resourceZip;
  resource.resourceHours = req.body.resourceHours;
  resource.resourceWebsite = req.body.resourceWebsite;
  resource.resourceServices = req.body.resourceServices;
  resource.resourceLink = req.body.resourceLink;

  //test if the user inserted a rating with the resource, if not, give it a default rating.
  var parsedRating = parseFloat(req.body.resourceRatingTotal);
  if (!isNaN(parsedRating) && 0 <= req.body.resourceRatingTotal && req.body.resourceRatingTotal <= 5) {
    resource.resourceRatingTotal = parsedRating;
    resource.resourceRatingCount = 1;
    resource.resourceRatingCurrent = (resource.resourceRatingTotal / resource.resourceRatingCount).toFixed(1);
  }
  else {
    resource.resourceRatingTotal = 0;
    resource.resourceRatingCount = 0;
    resource.resourceRatingCurrent = "TBR";
  }
  //test if the user has given an initial number of referrals, if not, use 0.
  var parsedReferrals = parseInt(req.body.resourceReferrals);
  if (!isNaN(parsedReferrals) && parsedReferrals > 0) {
    resource.resourceReferrals = parsedReferrals;
  }
  else {
    resource.resourceReferrals = 0;
  }
  resource.resourceSearchData = req.body.resourceAddress + " " + req.body.resourceWebsite + " " + req.body.resourceName + " " + req.body.resourceType + " " + req.body.resourceZip + " " + req.body.resourceCity;
  resource.save((err, doc) => {
    if (!err)
      res.redirect('resource/list');
    else {
      if (err.name == 'ValidationError') {
        handleValidationError(err, req.body);
        res.render("resource/addOrEdit", {
          resource: req.body,
          types: resourceTypes
        });
      }
      else
        console.log('Error during record insertion : ' + err);
    }
  });
}

// method to update a record in the database
function updateRecord(req, res) {
  req.body.resourceSearchData = req.body.resourceAddress + " " + req.body.resourceWebsite + " " + req.body.resourceName + " " + req.body.resourceType + " " + req.body.resourceZip + " " + req.body.resourceCity;

  Resource.findById(req.body._id, 'resourceRatingTotal resourceRatingCount resourceRatingCurrent resourceReferrals', function (err, dat) {
    if (err) { console.log("error upating record"); }
    //we set any parts needed for rating that are NaN in the database to 0 or TBR for current rating to account for older resources.
    if (isNaN(dat.resourceRatingCount)) {
      dat.resourceRatingCount = 0;
    }
    if (isNaN(dat.resourceRatingTotal)) {
      dat.resourceRatingTotal = 0;
    }
    if (isNaN(dat.resourceRatingCount)) {
      dat.resourceRatingCurrent = "TBR";
    }
    var ratingUpdated = false;
    var parsedRating = parseFloat(req.body.resourceRatingTotal);
    //update rating
    if (!isNaN(parsedRating) && 0 <= req.body.resourceRatingTotal && req.body.resourceRatingTotal <= 5) {
      req.body.resourceRatingTotal = parseFloat(dat.resourceRatingTotal) + parsedRating;
      req.body.resourceRatingCount = dat.resourceRatingCount + 1;
      req.body.resourceRatingCurrent = (req.body.resourceRatingTotal / req.body.resourceRatingCount).toFixed(1);
      ratingUpdated = true;
    }

    if (!ratingUpdated) {
      req.body.resourceRatingCurrent = dat.resourceRatingCurrent;
      req.body.resourceRatingTotal = dat.resourceRatingTotal;
      req.body.resourceRatingCount = dat.resourceRatingCount;
    }

    //test if the user has given an a new number of referrals and add them to the total if so. if not, keep the current number of refferals.
    //if the current value in the database is not a number, we set it to 0.
    if (isNaN(dat.resourceReferrals)) {
      dat.resourceReferrals = 0;
    }
    var parsedReferrals = parseInt(req.body.resourceReferrals);
    if (!isNaN(parsedReferrals) && parsedReferrals > 0) {
      req.body.resourceReferrals = parseInt(dat.resourceReferrals) + parsedReferrals;
    }
    else {
      req.body.resourceReferrals = dat.resourceReferrals;
    }

    req.body.resourceTypeDisplay = req.body.resourceType;
    req.body.resourceType = processResourceType(req.body.resourceType);
    Resource.findOneAndUpdate({ _id: req.body._id }, req.body, { new: true }, (err, doc) => {
      if (!err) { res.redirect('resource/list'); }
      else {
        if (err.name == 'ValidationError') {
          handleValidationError(err, req.body);
          res.render("resource/addOrEdit", {
            viewTitle: 'Update Resource',
            resource: req.body,
            types: resourceTypes
          });
        }
        else
          console.log('Error during record update : ' + err);
      }
    });
  });
}

// GET request for the full list of resources
router.get('/list', (req, res) => {
  Resource.find((err, docs) => {
    if (!err) {
      res.render("resource/list", {
        list: docs
      });
    }
    else {
      console.log('Error in retrieving resource list :' + err);
    }
  });
});

// GET request for filtering by a resource type
router.get('/list/:type', (req, res) => {
  const type = processResourceType(req.params.type)
  if (!processedResourceTypes.includes(type)) {
    console.log("invalid resource type: " + type);
    return;
  }
  Resource.find({ resourceType: type }, (err, result) => {
    if (err) {
      console.log(err);
      return;
    }
    else {
      res.render("resource/list", {
        list: result
      });
    }
  })
});

// POST request for searching the mongo database
router.post('/list/search', (req, res) => {
  Resource.find({ resourceSearchData: new RegExp(req.body.resourceSearchData, 'i') }, function (err, docs) { //search is a string that the funcition is searching for, edit as needed
    if (err) {
      console.log(err);
      return
    }
    else {
      res.render("resource/list", {
        list: docs
      });
    }
  })
});

// GET request to update the selected resource
router.get('/:id', (req, res) => {
  Resource.findById(req.params.id, (err, doc) => {
    if (!err) {
      res.render("resource/addOrEdit", {
        viewTitle: "Update Resource",
        resource: doc,
        types: resourceTypes
      });
    }
  });
});

// GET request to delete the selected resource
router.get('/delete/:id', (req, res) => {
  Resource.findByIdAndRemove(req.params.id, (err, doc) => {
    if (!err) {
      //delete attachments folder for it too
      const uploadDirectory = uploadDir + "/" + req.params.id;
      //we have to delete all files in the directory before removing it.
      //there will be no nested folders, so only need to worry about files.
      fs.readdirSync(uploadDir).forEach(value => {
        const filePath = path.join(uploadDir, value);
        fs.unlinkSync(filePath);
      });
      fs.rmdirSync(uploadDirectory);
      res.redirect('/resource/list');
    }
    else { console.log('Error in resource delete :' + err); }
  });
});

module.exports = router;
