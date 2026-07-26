const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("public/favicon.ico");
https.get("https://drive.google.com/uc?export=download&id=1kR3J7RYB5A4760yd8NeqBXR7WInMdKjF", function(response) {
  if(response.statusCode === 302 || response.statusCode === 303) {
      https.get(response.headers.location, function(resp) {
          resp.pipe(file);
      })
  } else {
      response.pipe(file);
  }
});
