// initializing various services
const express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const Resource = mongoose.model('resource');
const formidable = require('formidable');
var http = require('http');
const fs = require('fs');

//GET request for Uploads
router.get('/uploads/:id', (req, res) => {
  Resource.findById(req.params.id, (err, doc) => {
    if (!err) {
      res.render("resource/uploads", {
        viewTitle: "Uploads",
        resource: doc,
        files: doc.resourceFiles,
      });
    }
  });
});
//POST request for Uploads (multipart form needs formidable)
//attachments are saved in "attachments/<id>"
router.post('/uploads', (req, res) => {
  var id;
  var fileName;
  const form = formidable.IncomingForm({
    keepExtensions: true,
    uploadDir: "tmp/"
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.log("error during attachment form parsing: " + err);
      res.redirect('/uploads/' + id);
    }
    const uploadDirectory = "attachments/" + fields._id;
    id = fields._id;

    if (!fs.existsSync(uploadDirectory)) {
      fs.mkdirSync(uploadDirectory);
    }

    fileName = files.fileUpload.name;
    const tmpFile = files.fileUpload.path;
    fs.renameSync(tmpFile, uploadDirectory + "/" + fileName);

    //add the new uploaded filename to the record
    Resource.findById(id, (err, resource) => {
      if (err) {
        console.log("error during attachment resource finding (id: " + id + "): " + err);
      }
      else if (resource == null) {
        console.log("resource not found");
      } else {
        resource.resourceFiles.push(fileName);
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
    viewTitle: "Insert Resource"
  });
});


// GET request for Insert Resource
//router.get('../', (req, res) => {
//  res.redirect('resource/list');
//});

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
  resource.resourceType = req.body.resourceType;
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
          resource: req.body
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

    Resource.findOneAndUpdate({ _id: req.body._id }, req.body, { new: true }, (err, doc) => {
      if (!err) { res.redirect('resource/list'); }
      else {
        if (err.name == 'ValidationError') {
          handleValidationError(err, req.body);
          res.render("resource/addOrEdit", {
            viewTitle: 'Update Resource',
            resource: req.body
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

// GET request for the list of resources labeled Adoption Services
router.get('/list/AdoptionServices', (req, res) => {
  Resource.find({ resourceType: "Adoption Services" }, function (err, docs) {
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

// GET request for the list of resources labeled Basic Care Groups
router.get('/list/BasicCareGroups', (req, res) => {
  Resource.find({ resourceType: "Basic Care Groups" }, function (err, docs) {
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

// GET request for the list of resources labeled Behavorial Health
router.get('/list/BehavorialHealth', (req, res) => {
  Resource.find({ resourceType: "Behavorial Health" }, function (err, docs) {
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

// GET request for the list of resources labeled Child Care
router.get('/list/ChildCare', (req, res) => {
  Resource.find({ resourceType: "Child Care" }, function (err, docs) {
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

// GET request for the list of resources labeled Child Support
router.get('/list/ChildSupport', (req, res) => {
  Resource.find({ resourceType: "Child Support" }, function (err, docs) {
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

// GET request for the list of resources labeled Community Resource Contacts
router.get('/list/CommunityResourceContacts', (req, res) => {
  Resource.find({ resourceType: "Community Resource Contacts" }, function (err, docs) {
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

// GET request for the list of resources labeled Disability Assistance
router.get('/list/DisabilityAssistance', (req, res) => {
  Resource.find({ resourceType: "Disability Assistance" }, function (err, docs) {
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

// GET request for the list of resources labeled Drugs and Alcohol
router.get('/list/DrugsAndAlcohol', (req, res) => {
  Resource.find({ resourceType: "Drug & Alcohol Resources" }, function (err, docs) {
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

// GET request for the list of resources labeled Educational Resources
router.get('/list/EducationalResources', (req, res) => {
  Resource.find({ resourceType: "Educational Resources" }, function (err, docs) {
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
// GET request for the list of resources labeled Emergency Housing
router.get('/list/EmergencyHousing', (req, res) => {
  Resource.find({ resourceType: "Emergency Housing" }, function (err, docs) {
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

// GET request for the list of resources labeled Ethnic and Diversity Resources
router.get('/list/EthnicAndDiversityResources', (req, res) => {
  Resource.find({ resourceType: "Ethnic & Diversity Resources" }, function (err, docs) {
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

// GET request for the list of resources labeled Financial Assistance
router.get('/list/FinancialAssistance', (req, res) => {
  Resource.find({ resourceType: "Financial Assistance" }, function (err, docs) {
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

// GET request for the list of resources labeled Food Pantries
router.get('/list/FoodPantries', (req, res) => {
  Resource.find({ resourceType: "Food Pantries" }, function (err, docs) {
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

// GET request for the list of resources labeled Job Assistance
router.get('/list/JobAssistance', (req, res) => {
  Resource.find({ resourceType: "Job Assistance" }, function (err, docs) {
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

// GET request for the list of resources labeled Legal Information
router.get('/list/LegalInformation', (req, res) => {
  Resource.find({ resourceType: "Legal Information" }, function (err, docs) {
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

// GET request for the list of resources labeled Parenting Classes
router.get('/list/ParentingClasses', (req, res) => {
  Resource.find({ resourceType: "Parenting Classes" }, function (err, docs) {
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

// GET request for the list of resources labeled Pet Services
router.get('/list/PetServices', (req, res) => {
  Resource.find({ resourceType: "Pet Services" }, function (err, docs) {
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

// GET request for the list of resources labeled Transportation Resources
router.get('/list/TransportationResources', (req, res) => {
  Resource.find({ resourceType: "Transportation Resources" }, function (err, docs) {
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
        resource: doc
      });
    }
  });
});

// GET request to delete the selected resource
router.get('/delete/:id', (req, res) => {
  Resource.findByIdAndRemove(req.params.id, (err, doc) => {
    if (!err) {
      res.redirect('/resource/list');
    }
    else { console.log('Error in resource delete :' + err); }
  });
});

module.exports = router;
