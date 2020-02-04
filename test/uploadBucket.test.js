process.env.NODE_ENV = "test";

//Require the dev-dependencies
const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../server");
const should = chai.should();
const { uploadObjects, validateObjectsToUpload } = require("../utils/aws/s3");
const { asyncForEach } = require("../utils/asyncLoop");
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const {
  testUploads,
  testOverwriteUploads,
  multiUploadsTest,
  testFunctionUploads,
  testFunctionUploadsError,
  testFunctionUploadsOverwrite,
  testFunctionValidations,
  testFunctionValidationsBadFormat
} = require("./data/uploadBucketData");

chai.use(chaiHttp);

describe("Function Tests", () => {
  const bucketName = process.env.AWS_DEFAULT_BUCKET_NAME
    ? process.env.AWS_DEFAULT_BUCKET_NAME
    : "chromacode";
  let overwrite = false;

  describe("uploadObjects", () => {
    it("it should not upload objects that have an error", async () => {
      const uploadData = await uploadObjects(
        testFunctionUploadsError,
        bucketName
      );
      const validations = await validateObjectsToUpload(
        testFunctionUploads,
        overwrite,
        bucketName
      );
      uploadData.count.should.be.eql(0);
      validations[0].alreadyExistsInS3.should.be.eql(false);
    });

    it("it should upload objects that do not have an error", async () => {
      const uploadData = await uploadObjects(testFunctionUploads, bucketName);
      const validations = await validateObjectsToUpload(
        testFunctionUploads,
        overwrite,
        bucketName
      );
      uploadData.count.should.be.eql(1);
      validations[0].alreadyExistsInS3.should.be.eql(true);
    });

    it("it should not overwrite objects by default", async () => {
      const objectsToUpload = await validateObjectsToUpload(
        testFunctionUploads,
        overwrite,
        bucketName
      );
      const { objects, count } = await uploadObjects(
        objectsToUpload,
        bucketName
      );
      count.should.be.eql(0);
      objectsToUpload[0].alreadyExistsInS3.should.be.eql(true);
    });

    it("it should overwrite objects if overwrite parameter is true", async () => {
      const objectsToUpload = await validateObjectsToUpload(
        testFunctionUploadsOverwrite,
        true,
        bucketName
      );
      const { objects, count } = await uploadObjects(
        objectsToUpload,
        bucketName
      );
      var params = {
        Bucket: bucketName,
        Key: testFunctionUploadsOverwrite[0].key
      };
      await s3.deleteObject(params).promise();
      count.should.be.eql(1);
      objectsToUpload[0].alreadyExistsInS3.should.be.eql(true);
      objects[0].value.should.be.eql(testFunctionUploadsOverwrite[0].value);
    });
  });

  describe("validateObjectsToUpload", () => {
    it("it should accurately describe a key that doesn't exist yet in S3", async () => {
      const validations = await validateObjectsToUpload(
        testFunctionValidations,
        overwrite,
        bucketName
      );
      validations[0].alreadyExistsInS3.should.be.eql(false);
    });

    it("it should accurately describe a key that already exists in S3", async () => {
      await uploadObjects(testFunctionValidations, bucketName);
      const validations = await validateObjectsToUpload(
        testFunctionValidations,
        overwrite,
        bucketName
      );
      var params = {
        Bucket: bucketName,
        Key: testFunctionValidations[0].key
      };
      await s3.deleteObject(params).promise();
      validations[0].alreadyExistsInS3.should.be.eql(true);
      validations[0].error.should.be.eql(true);
    });

    it("it should recognize misformatted input object data", async () => {
      const validations = await validateObjectsToUpload(
        testFunctionValidationsBadFormat,
        overwrite,
        bucketName
      );
      validations[0].error.should.be.eql(true);
      validations[0].message.should.be.eql(
        "Key and value are required properties for every upload and must be strings."
      );
    });
  });
});

describe("Route Tests", () => {
  /*
   * Test the / route
   */
  describe("/GET server index", () => {
    it("it should return status 200", done => {
      chai
        .request(server)
        .get("/")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an("object");
          done();
        });
    });
    it("it should return correct object with success and data", done => {
      chai
        .request(server)
        .get("/")
        .end((err, res) => {
          res.body.should.have.property("success");
          res.body.success.should.be.eql(true);
          res.body.should.have.property("data");
          res.body.data.should.be.eql("server and router are running");
          done();
        });
    });
  });

  /*
   * Test the /s3Bucket/object GET route
   */
  describe("/GET s3Bucket/object", () => {
    it("it should return status 404", done => {
      chai
        .request(server)
        .get("/s3Bucket/object")
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });
  });

  /*
   * Test the /s3Bucket/object POST route errors
   */
  describe("/POST s3Bucket/object errors", () => {
    it("it should return 500 status when no data is passed in", done => {
      chai
        .request(server)
        .post("/s3Bucket/object")
        .end((err, res) => {
          res.should.have.status(500);
          done();
        });
    });

    it("it should return error message when no upload data is passed in", done => {
      chai
        .request(server)
        .post("/s3Bucket/object")
        .end((err, res) => {
          res.body.success.should.be.eql(false);
          res.body.data.message.should.be.eql(
            "Request body is required and the uploads parameter must be an array with at least one object."
          );
          done();
        });
    });

    it("it should return error message when misformatted upload data is passed in", done => {
      chai
        .request(server)
        .post("/s3Bucket/object")
        .send({
          uploads: "misformatted data string is not an array of objects"
        })
        .end((err, res) => {
          res.body.success.should.be.eql(false);
          res.body.data.message.should.be.eql(
            "Request body is required and the uploads parameter must be an array with at least one object."
          );
          done();
        });
    });
  });

  /*
   * Test the /s3Bucket/object POST route successes
   */

  describe("/POST s3Bucket/object successes", () => {
    it("it should return 200 status when a new object is created", done => {
      try {
        chai
          .request(server)
          .post("/s3Bucket/object")
          .send({ uploads: testUploads })
          .end(async (err, res) => {
            var params = {
              Bucket: process.env.AWS_DEFAULT_BUCKET_NAME,
              Key: testUploads[0].key
            };
            await s3.deleteObject(params).promise();
            res.should.have.status(200);
            res.body.success.should.be.eql(true);
            res.body.data.uploads.should.be.eql(1);
            res.body.data.objects[0].success.should.be.eql(true);
            res.body.data.objects[0].error.should.be.eql(false);
            done();
          });
      } catch (err) {
        done(err);
      }
    });

    it("it should successfully upload the correct key and value to S3", done => {
      try {
        chai
          .request(server)
          .post("/s3Bucket/object")
          .send({ uploads: testUploads })
          .end(async (err, res) => {
            var params = {
              Bucket: process.env.AWS_DEFAULT_BUCKET_NAME,
              Key: testUploads[0].key
            };
            const file = await s3.getObject(params).promise();
            const awsObjectValue = file.Body.toString();
            awsObjectValue.should.be.eql(testUploads[0].value);
            done();
          });
      } catch (err) {
        done(err);
      }
    });

    it("if overwrite is not set or overwrite is false, it should return 200 status with an error in the body data if the key already exists in S3", done => {
      chai
        .request(server)
        .post("/s3Bucket/object")
        .send({ uploads: testUploads });
      chai
        .request(server)
        .post("/s3Bucket/object")
        .send({ uploads: testUploads })
        .end(async (err, res) => {
          res.should.have.status(200);
          res.body.success.should.be.eql(true);
          res.body.data.uploads.should.be.eql(0);
          res.body.data.objects[0].success.should.be.eql(false);
          res.body.data.objects[0].error.should.be.eql(true);
          done();
        });
    });

    it("if overwrite is true then it should update the value and return 200 status / success in the body data even if the key already exists in S3", done => {
      chai
        .request(server)
        .post("/s3Bucket/object")
        .send({ uploads: testOverwriteUploads, overwrite: true })
        .end(async (err, res) => {
          var params = {
            Bucket: process.env.AWS_DEFAULT_BUCKET_NAME,
            Key: testUploads[0].key
          };
          await s3.deleteObject(params).promise();
          // console.log("res:", res);
          res.should.have.status(200);
          res.body.success.should.be.eql(true);
          res.body.data.uploads.should.be.eql(1);
          res.body.data.objects[0].success.should.be.eql(true);
          res.body.data.objects[0].error.should.be.eql(false);
          res.body.data.objects[0].value.should.be.eql(
            testOverwriteUploads[0].value
          );
          done();
        });
    });

    it("it should successfully upload multiple key value pairs", done => {
      chai
        .request(server)
        .post("/s3Bucket/object")
        .send({ uploads: multiUploadsTest, overwrite: true })
        .end(async (err, res) => {
          await asyncForEach(multiUploadsTest, async (upload, index) => {
            var params = {
              Bucket: process.env.AWS_DEFAULT_BUCKET_NAME,
              Key: upload.key
            };
            const file = await s3.getObject(params).promise();
            const awsObjectValue = file.Body.toString();
            awsObjectValue.should.be.eql(multiUploadsTest[index].value);
            await s3.deleteObject(params).promise();
          });
          res.should.have.status(200);
          res.body.success.should.be.eql(true);
          res.body.data.uploads.should.be.eql(multiUploadsTest.length);
          res.body.data.objects.forEach((object, index) => {
            object.success.should.be.eql(true);
            object.error.should.be.eql(false);
            object.value.should.be.eql(multiUploadsTest[index].value);
            object.key.should.be.eql(multiUploadsTest[index].key);
          });
          done();
        });
    }).timeout(15000);
  });
});
