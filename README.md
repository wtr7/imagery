# Imagery

Convert multiple images async in node.js.

## Usage

```javascript
var imagery = require("imagery");

var options = {
  destination: './library/test',
  quality: 35,
  scale: {
    width: 100,
    height: 100
  },
  resize: {
    width: 100,
    height: 100
  },
  compressType: 'JPEG',
  fileType: 'gif'
};

var source = './library/images';

// options is optional
imagery(source, options, function(err, info, done) {
  console.log(err, info, done);
  if (done) {
    return console.log('done');
  }
});
```

### Info

* `source` Default: 'edited_images' directory
* `options` The options object passed in.
  values:
  * `destination` Destination folder. Default: 'edited_images' directory
  * `quality` - Quality of the images. Default: 35
  * `scale` - {width, height}
  * `resize` - {width, height}
  * `compressType` - None, BZip, Fax, Group4, JPEG, Lossless, LZW, RLE, Zip, or LZMA. Default: 'JPEG'
  * `fileType` - Gif, Jpeg, Png, Tiff. Default: 'JPEG'
* `callback` Callback per file with following arguments:
  values:
  * `err` - Error message per file
  * `info` - Additional info when file has been edited
  * `done` - Boolean when all files has been edited

```
# Install imagemagick
brew install imagemagick

# Install imagery
npm install imagery
```
