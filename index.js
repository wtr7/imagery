'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('lodash');
var mime = require('mime');
var im = require('gm').subClass({
	imageMagick: true
});

function imagery(currentDir, options, callback) {
	var totalFiles = 0;
	var filesChecked = 0;

	if (typeof options === 'function') {
		throw new Error('Callback provided to options object');
	}

	if (typeof callback !== 'function') {
		throw new Error('No callback has been provided');
	}

	options = _.defaults(options) || {};

	var destination = options.destination || path.resolve(currentDir, '..', 'edited_images')
	var quality = options.quality || 35;
	var resizeWidth = (options.resize && options.resize.width) ? options.resize.width : null;
	var resizeHeight = (options.resize && options.scale.height) ? options.scale.height : null;
	var scaleWidth = (options.scale && options.scale.width) ? options.scale.width : null;
	var scaleHeight = (options.scale && options.scale.height) ? options.scale.height : null;
	var compressType = options.compressType || null;
	var fileType = 'jpeg';
	if (options && options.fileType && _.contains(['jpeg', 'jpg', 'tiff', 'tif', 'png', 'gif'], options.fileType.toLowerCase())) {
		fileType = options.fileType;
	}

	// if destination doesn't exists, create the directory and validate current path
	fs.exists(destination, function(exists) {
		if (exists) return validateCurrentPath();

		fs.mkdir(destination, function(err) {
			if (err) return handleError(destination,'Can\'t make directory');

			return validateCurrentPath();
		});
	});

	function validateCurrentPath() {
		fs.exists(currentDir, function(exists) {
			// check if current path exists
			if (exists) return deepLinking(currentDir, destination);

			return handleError(currentDir, 'Path doesn\'t exists');
		});
	}

	function deepLinking(root, newDir) {
		fs.stat(root, function(err, stats) {
			if (err) return handleError(root, 'Path doesn\'t exists');

			// if not a directory, handle the file
			if (!stats.isDirectory()) return handleFile(root);

			// if directy, loop through all files
			fs.readdir(root, function(err, files) {
				if (err) return handleError(root, 'Can\'t read directory');

				// to check if all files are done, check total files with files compressed
				totalFiles += files.length;
				async.eachSeries(files, function(file, cb) {
					var currentPath = path.join(root, file);

					fs.stat(currentPath, function(err, stats) {
						if (err) {
							filesChecked++;
							return handleError(currentPath, 'Can\'t read directory');
						}

						// if current path is directory, keep going deeper
						if (stats.isDirectory()) {
							filesChecked++;
							deepLinking(currentPath, path.join(newDir, file));
							return cb();
						}

						//if not an image, go to next file
						if (!~mime.lookup(currentPath).indexOf('image/')) {
							filesChecked++;
							return cb();
						}

						// if new dir doens't exists, create it
						// if it does, write new file to it

						fs.exists(newDir, function(exists) {
							if (exists) {
								return compress(currentPath, path.join(newDir, file), function(err, response, done) {
									cb();
									return callback(err, response, done);
								});
							}

							fs.mkdir(newDir, function(err) {
								if (err) return handleError(newDir,'Can\'t make directory');

								return compress(currentPath, path.join(newDir, file), function(err, response, done) {
									cb();
									return callback(err, response, done);
								});
							});
						});
					});
				});
			});
		});
	}

	function handleError(path, message) {
		return callback({
			message: message,
			path: path
		}, null, true);
	}

	function handleFile(root) {
		// if not an image, send err
		if (!~mime.lookup(root).indexOf('image/')) {
			return callback('File provided isn\t an image', null, true);
		}

		var newPath = path.join(path.parse(root).dir, 'converted.jpg');

		// else if image, compress
		return compress(root, newPath, function(err, response) {
			callback(err, response, true);
		});
	}

	function compress(oldPath, newPath, cb) {
		if (fileType) newPath = newPath.split(path.extname(newPath))[0] + '.' + fileType;

		var imageWriter = im(oldPath)
			.compress(compressType)
			.quality(quality);

		if (scaleWidth && scaleHeight) {
			imageWriter.scale(scaleWidth, scaleHeight);
		}

		if (resizeWidth && resizeHeight) {
			imageWriter.resize(resizeWidth, resizeHeight)
		}

		imageWriter.write(newPath, function(err, stdout, stderr) {
			filesChecked++;
			var done = (filesChecked >= totalFiles) ? true : false;

			if (err || stderr) {
				return cb('Writing file to: ', newPath + ' has failed', null, done);
			}

			return cb(null, 'Writing new file to:' + newPath, done);
		});
	}
}

module.exports = imagery;