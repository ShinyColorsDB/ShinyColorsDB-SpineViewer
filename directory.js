const idolList = require("./idolList.json");

let fs = require("fs");

let directory = [];

idolList.forEach(element => {
    fs.readdir(`./assets/${element.directory}`, (err, result) => {
        console.log(result);
    });
});