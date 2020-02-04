const asyncForEach = require("../asyncLoop").asyncForEach;
const AWS = require("aws-sdk");
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const s3 = new AWS.S3({ sslEnabled: false, httpOptions: { timeout: 3000 } });

/**
 * Upload the objects to S3 if there is no error in their validation
 * count the number of successful uploads and pass any data returned
 * from the s3.putObject called
 *
 * @param {Object[]} objects    array of objects to be uploaded.
 * @param {string}   bucketName overwrite existing s3 object.
 *
 * @return {Object[]} array of objects from request with validation results
 */
async function uploadObjects(objects, bucketName) {
  try {
    let count = 0;
    await asyncForEach(objects, async (object, i) => {
      if (!object.error && object.key && object.value) {
        var params = {
          Body: object.value,
          Bucket: bucketName,
          Key: object.key
        };
        await new Promise((resolve, reject) => {
          s3.putObject(params, async (err, data) => {
            if (err) {
              reject(error);
            } else {
              resolve(data);
            }
          });
        })
          .then(data => {
            objects[i].success = true;
            objects[i].error = false;
            objects[i].data = data;
            count = count + 1;
          })
          .catch(err => {
            objects[i].success = false;
            objects[i].error = true;
            objects[i].message = err;
          });
      }
    });
    return { objects, count };
  } catch (err) {
    return { err };
  }
}

/**
 * Determine which objects are valid to upload to S3 based on
 * required key/value parameters, existence and overwrite settings
 *
 * @param {Object[]} objects          array of objects to be validated.
 * @param {boolean}  overwriteObjects overwrite existing s3 object.
 *
 * @return {Object[]} array of objects from request with validation results
 */
async function validateObjectsToUpload(objects, overwriteObjects, bucketName) {
  try {
    await asyncForEach(objects, async (object, i) => {
      try {
        // do an initial validation to ensure key and value exist as strings
        if (
          !object.key ||
          !object.value ||
          typeof object.key !== "string" ||
          typeof object.value !== "string"
        ) {
          objects[i].error = true;
          objects[i].success = false;
          objects[i].message =
            "Key and value are required properties for every upload and must be strings.";
        } else {
          // assume the objects don't exist unless found in headObject call
          // because the only way to determine existence is lack of an error
          objects[i].alreadyExistsInS3 = false;
          var params = {
            Bucket: bucketName,
            Key: object.key
          };
          await s3.headObject(params).promise();
          // the following code will only run if the object already exists
          // and headObject does not throw an error
          objects[i].alreadyExistsInS3 = true;
          if (!overwriteObjects) {
            objects[i].error = true;
            objects[i].success = false;
            objects[i].message =
              "Failed to upload: this key already exists. Add {overwrite: true} to request body if you want to overwrite.";
          }
        }
      } catch (err) {
        // errors are expected unless the file exists
        // if it is a different error than the NotFound expected, then log it
        if (err && err.code !== "NotFound") {
          console.error("Non NotFound Error", err);
        }
      }
    });
    return objects;
  } catch (err) {
    return { err };
  }
}

exports.validateObjectsToUpload = validateObjectsToUpload;
exports.uploadObjects = uploadObjects;
