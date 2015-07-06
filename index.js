'use strict';

var fs = require('fs');
var path = require('path');
var async = require('async');
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

	var destination = (options && options.destination) ? options.destination : path.resolve(currentDir, '..', 'edited_images');
	var quality = (options && options.quality) ? options.quality : 35;
	var resizeWidth = (options && options.resize && options.resize.width) ? options.resize.width : null;
	var resizeHeight = (options && options.resize && options.resize.height) ? options.resize.height : null;
	var scaleWidth = (options && options.scale && options.scale.width) ? options.scale.width : null;
	var scaleHeight = (options && options.scale && options.scale.height) ? options.scale.height : null;
	var compressType = (options && options.compressType) ? options.compressType : null;
	if (options && options.fileType && (
		options.fileType.toLowerCase() === 'jpeg' ||
		options.fileType.toLowerCase() === 'jpg' ||
		options.fileType.toLowerCase() === 'tiff' ||
		options.fileType.toLowerCase() === 'tif' ||
		options.fileType.toLowerCase() === 'png' ||
		options.fileType.toLowerCase() === 'gif'
	)) {
		var fileType = options.fileType;
	} else {
		var fileType = null;
	}

	// if destination doesn't exists, create the directory and validate current path
	fs.exists(destination, function(exists) {
		if (exists) {
			return validateCurrentPath();
		}

		fs.mkdir(destination, function(err) {
			if (err) {
				return callback({
					message: 'Couldn\'t make directory',
					path: destination
				}, null, false);
			}

			return validateCurrentPath();
		});
	});

	function validateCurrentPath() {
		fs.exists(currentDir, function(exists) {
			// check if current path exists
			if (exists) {
				return deepLinking(currentDir, destination);
			}

			return callback({
				message: 'Path doesn\'t exists',
				path: currentDir
			}, null, false);
		});
	}

	function deepLinking(root, newDir) {
		fs.stat(root, function(err, stats) {
			if (err) {
				return callback({
					message: 'Path doesn\'t exists',
					path: root
				}, null, false);
			}

			// if not a directory, handle the file
			if (!stats.isDirectory()) {
				return handleFile(root);
			}

			// if directy, loop through all files
			fs.readdir(root, function(err, files) {
				if (err) {
					return callback({
						message: 'Couldn\'t read directory',
						path: root
					}, null, false);
				}

				// to check if all files are done, check total files with files compressed
				totalFiles += files.length;
				async.eachSeries(files, function(file, cb) {
					filesChecked++;
					var currentPath = path.join(root, file);

					fs.stat(currentPath, function(err, stats) {
						if (err) {
							return callback({
								message: 'Couldn\'t read directory',
								path: currentPath
							}, null, false);
						}

						// if current path is directory, keep going deeper
						if (stats.isDirectory()) {
							deepLinking(currentPath, path.join(newDir, file));
							return cb();
						}

						//if not an image, go to next file
						if (!~mime.lookup(currentPath).indexOf('image/')) {
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
								if (err) {
									return callback({
										message: 'Couldn\'t make directory',
										path: destination
									}, null, false);
								}

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
		var done = (filesChecked >= totalFiles) ? true : false;

		if (fileType) {
			var newPath = newPath.split(path.extname(newPath))[0] + '.' + fileType;
		}

		var imageWriter = im(oldPath)
			.compress(compressType)
			.quality(quality);

		if (resizeWidth && resizeHeight) {
			imageWriter.resize(resizeWidth, resizeHeight)
		}

		if (scaleWidth && scaleHeight) {
			imageWriter.scale(scaleWidth, scaleHeight);
		}

		imageWriter.write(newPath, function(err, stdout, stderr) {
			if (err || stderr) {
				console.log(stderr);
				return cb('Writing file to: ', newPath + ' has failed', null, done);
			}

			return cb(null, 'Writing new file to:' + newPath, done);
		});
	}
}

module.exports = imagery;