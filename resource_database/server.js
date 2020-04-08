// initialize various services
require('./models/db');
const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const bodyparser = require('body-parser');
const resourceController = require('./controller/resourceController');
const targetBaseUrl = '/resource/list';
const handlebars = require('handlebars');
var app = express();
var router = express.Router();

// use bodyparser using express's app object
app.use(bodyparser.urlencoded({
  extended: true
}));
app.use(bodyparser.json());

// use express's object to set views and the dir it points too
app.set('views', path.join(__dirname, '/views/'));

// use express's object to use the handlebars engine for rendering the front-end
app.engine('hbs', exphbs({ extname: 'hbs', defaultLayout: 'mainLayout', layoutsDir: __dirname + '/views/layouts/' }));
app.set('view engine', 'hbs');

// express listens on port 3000 of localhost
app.listen(3000, () => {
  console.log('Express server started at port : 3000');
});

// use express's object to use resourceController as the default resource hyperlink
app.use('/resource/', resourceController);

// use express's object to set static path to CSS files
app.use(express.static(path.join(__dirname, '/')));

// any unknown url goes back to the main page
app.get('*', (req, res) => {
  res.redirect(targetBaseUrl);
});

//for use in the uploads.hbs renderer
handlebars.registerHelper("downloads", (list1, list2) => {
  var body = "";
  for (let i = 0; i < list1.length; i++) {
    body += "<td><a href=" + handlebars.escapeExpression(list1[i]) + " download>" + handlebars.escapeExpression(list2[i]) + "</a></td >"
  }
  return new handlebars.SafeString(body);
});
//for use in the addOrEdit dropdown
handlebars.registerHelper("selectedDropDown", (defaultValue, list) => {
  var body = "";
  list.forEach(element => {
    body += "<option value=\"" + handlebars.escapeExpression(element) + "\"";
    if (element == defaultValue) {
      body += " selected";
    }
    body += ">" + handlebars.escapeExpression(element) + "</option>";
  });
  return new handlebars.SafeString(body);
});
//for use in the mainLayout.hbs dropdown
handlebars.registerHelper("typesDropdown", () => {
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
  var body = "";
  resourceTypes.forEach(element => {
    body += "<option value=\"" + handlebars.escapeExpression(element) + "\">" + handlebars.escapeExpression(element) + "</option>";
  });
  return new handlebars.SafeString(body);
});