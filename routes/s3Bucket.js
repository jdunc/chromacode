const express = require("express");
const router = express.Router();
const s3 = require("../utils/aws/s3");

/**
 * Route requires a post call with json body parameter "uploads" as an array of objects like [ {key: 'string', value: 'string'}, {}, ... ]
 * route will optionally accept parameters to overwrite existing files or save objects to a different bucket
 *  - note, route does not check for existence of the bucket or verify the aws credentials or access permissions
 */
const postObjectRoute = async (req, res, next) => {
  try {
    // validate that there is a body and an uploads parameter within the body
    if (
      !req.body ||
      !req.body.uploads ||
      typeof req.body.uploads !== "object" ||
      !req.body.uploads[0]
    ) {
      res.status(500);
      return res.send({
        success: false,
        data: {
          message:
            "Request body is required and the uploads parameter must be an array with at least one object."
        }
      });
    }
    const bucketName = req.body.bucketName
      ? req.body.bucketName
      : process.env.AWS_DEFAULT_BUCKET_NAME;
    const overwrite = req.body.overwrite ? req.body.overwrite : false;
    const { uploads } = req.body;
    const objectsToUpload = await s3.validateObjectsToUpload(
      uploads,
      overwrite,
      bucketName
    );
    const { objects, count } = await s3.uploadObjects(
      objectsToUpload,
      bucketName
    );
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

router.post("/object", postObjectRoute);

exports.router = router;
