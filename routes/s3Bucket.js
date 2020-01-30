const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const s3 = new AWS.S3({ sslEnabled: false, httpOptions: { timeout: 3000 } });

/*
 *  considerations:
 *   - only way to check if object exists is error thrown by headObject/getObject?
 *   - could have used listObjectsV2, but there might be 100000s of objects
 *   - is there a way to implement with Promise.all?
 *   - initially passed array directly to req.body, but might need more info so req.body.uploads
 *   - validation function could also implement a counter or splitting of failed
 *     objects into separate array to not waste iteration in upload function
 *   - ignoring some putObject options:
 *      - ServerSideEncryption: "AES256", 
 *      - Tagging: "key1=value1&key2=value2"
 */

/**
* Route requires a post call with json body parameter "uploads" as an array of objects like [ {key: 'string', value: 'string'}, {}, ... ]
* route will optionally accept parameters to overwrite existing files or save objects to a different bucket
*  - note, route does not check for existence of the bucket or verify the aws credentials or access permissions
*/
const postObjectRoute = async (req, res, next) => {
  try {
    // validate that there is a body and an uploads parameter within the body
    if (!req.body || !req.body.uploads || typeof req.body.uploads !== "object" || !req.body.uploads[0]) {
      res.status(500);
      return res.send({ success: false, data: { message: "Request body is required and the uploads parameter must be an array with at least one object." } })
    }
    const bucketName = req.body.bucketName ? req.body.bucketName : process.env.AWS_DEFAULT_BUCKET_NAME;
    const overwrite = req.body.overwrite ? req.body.overwrite : false;
    const { uploads } = req.body;
    const objectsToUpload = await validateObjectsToUpload(uploads, overwrite, bucketName);
    const { objects, count } = await uploadObjects(objectsToUpload, bucketName);
    res.status(200);
    return res.send({
      success: true,
      data: {
        uploads: count,
        objects
      }
    });
  } catch (err) {
    next(err);
  }
};

router.post('/object', postObjectRoute);


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
  let count = 0;
  await asyncForEach(objects, async (object, i) => {
    if (!object.error) {
      var params = {
        Body: object.value,
        Bucket: bucketName,
        Key: object.key,
      };
      await new Promise((resolve, reject) => {
        s3.putObject(params, async (err, data) => {
          if (err) {
            reject(error)
          }
          else {
            resolve(data)
          }
        });
      }).then(data => {
        objects[i].success = true;
        objects[i].error = false;
        objects[i].data = data;
        count = count + 1;
      }).catch(err => {
        objects[i].success = false;
        objects[i].error = true;
        objects[i].message = err;
      });
    }
  })
  return { objects, count }
}

/**
 * Determine which objects we should attempt to upload to S3 based on
 * required key/value parameters and overwrite settings
 * 
 * @param {Object[]} objects          array of objects to be validated.
 * @param {boolean}  overwriteObjects overwrite existing s3 object.
 * 
 * @return {Object[]} array of objects from request with validation results
 */
async function validateObjectsToUpload(objects, overwriteObjects, bucketName) {
  await asyncForEach(objects, async (object, i) => {
    try {
      // do an initial validation to ensure key and value exist as strings
      if (!object.key || !object.value || typeof object.key !== "string" || typeof object.value !== "string") {
        objects[i].error = true;
        objects[i].success = false;
        objects[i].message = 'Key and value are required properties for every upload and must be strings.';
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
          objects[i].message = 'Failed to upload: this key already exists. Add {overwrite: true} to request body if you want to overwrite.';
        }
      }
    } catch (err) {
      // errors are expected unless the file exists
      // if it is a different error than the NotFound expected, then log it
      if (err && err.code !== 'NotFound') {
        console.error('Non NotFound Error', err)
      }
    }
  });
  return objects;
}

/**
 * Utility function to handle asynchronous forEach loops
 * necessary to provide info on the success of an upload
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
exports.asyncForEach = asyncForEach;
exports.validateObjectsToUpload = validateObjectsToUpload;
exports.router = router;
