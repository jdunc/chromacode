process.env.NODE_ENV = 'test';

//Require the dev-dependencies
let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();
var AWS = require('aws-sdk');
const s3Bucket = require('../routes/s3Bucket');
var s3 = new AWS.S3();

chai.use(chaiHttp);
/*
* Test considerations:
*  - with more time, implement mock aws sdk
*  - could also be beneficial to test the individual functions exported from s3Bucket.js
*  - the last test that checks n number of pairs seems helpful but
*    testing of just 20 key/values takes 8 seconds, so I believe there is some
*    optimization that could be achieved to loop through the checks, although part of
*    the time does come from checking and deleting the files in S3 through the test as well
*  - would also be beneficial to implement a random string generator to prevent unknown bias
*/

describe('ChromaCodeTests', () => {
  /*
  * Test the / route
  */
  describe('/GET server index', () => {
    it('it should return status 200', (done) => {
      chai.request(server)
        .get('/')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.an('object');
          done();
        });
    });
    it('it should return correct object with success and data', (done) => {
      chai.request(server)
        .get('/')
        .end((err, res) => {
          res.body.should.have.property('success')
          res.body.success.should.be.eql(true)
          res.body.should.have.property('data')
          res.body.data.should.be.eql('server and router are running')
          done();
        });
    });
  });

  /*
  * Test the /s3Bucket/object GET route
  */
  describe('/GET s3Bucket/object', () => {
    it('it should return status 404', (done) => {
      chai.request(server)
        .get('/s3Bucket/object')
        .end((err, res) => {
          res.should.have.status(404);
          done();
        });
    });
  });

  /*
  * Test the /s3Bucket/object POST route errors
  */
  describe('/POST s3Bucket/object errors', () => {

    it('it should return 500 status when no data is passed in', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .end((err, res) => {
          res.should.have.status(500);
          done();
        });
    });

    it('it should return error message when no upload data is passed in', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .end((err, res) => {
          res.body.success.should.be.eql(false);
          res.body.data.message.should.be.eql('Request body is required and the uploads parameter must be an array with at least one object.');
          done();
        });
    });

    it('it should return error message when misformatted upload data is passed in', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .send({ uploads: 'misformatted data string is not an array of objects' })
        .end((err, res) => {
          res.body.success.should.be.eql(false);
          res.body.data.message.should.be.eql('Request body is required and the uploads parameter must be an array with at least one object.');
          done();
        });
    });
  });


  /*
  * Test the /s3Bucket/object POST route successes
  */

  const testUploads = [{
    key: 'testUpload12345',
    value: 'here is the string value'
  }]

  describe('/POST s3Bucket/object successes', () => {
    it('it should return 200 status when a new object is created', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .send({ uploads: testUploads })
        .end(async (err, res) => {
          var params = { Bucket: process.env.AWS_DEFAULT_BUCKET_NAME, Key: testUploads[0].key };
          await s3.deleteObject(params).promise();
          res.should.have.status(200);
          res.body.success.should.be.eql(true);
          res.body.data.uploads.should.be.eql(1);
          res.body.data.objects[0].success.should.be.eql(true);
          res.body.data.objects[0].error.should.be.eql(false);
          done();
        });
    });

    it('it should successfully upload the correct key and value to S3', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .send({ uploads: testUploads })
        .end(async (err, res) => {
          var params = { Bucket: process.env.AWS_DEFAULT_BUCKET_NAME, Key: testUploads[0].key };
          const file = await s3.getObject(params).promise();
          const awsObjectValue = file.Body.toString();
          awsObjectValue.should.be.eql(testUploads[0].value)
          done();
        });
    });

    it('it should return 200 status with an error in the body data if the key already exists in S3', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .send({ uploads: testUploads })
      chai.request(server)
        .post('/s3Bucket/object')
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

    it('if overwrite is true then it should return 200 status and success in the body data even if the key already exists in S3', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .send({ uploads: testUploads, overwrite: true })
        .end(async (err, res) => {
          var params = { Bucket: process.env.AWS_DEFAULT_BUCKET_NAME, Key: testUploads[0].key };
          await s3.deleteObject(params).promise();
          res.should.have.status(200);
          res.body.success.should.be.eql(true);
          res.body.data.uploads.should.be.eql(1);
          res.body.data.objects[0].success.should.be.eql(true);
          res.body.data.objects[0].error.should.be.eql(false);
          done();
        });
    });

    const multiUploadsTest = [
      // {
      //   key: 'heres some more keys',
      //   value: 'here is the string value'
      // },
      // {
      //   key: 'anotherOne',
      //   value: 'here is the string value for the second'
      // },
      // {
      //   key: 'anotherAnotherOne',
      //   value: 'here is the string value for the third'
      // },
    ]
    const numberOfUploads = 20;
    for (let i = 0; i < numberOfUploads; i++) {
      multiUploadsTest.push({ key: `key${i}`, value: `value{i}` })
    }
    it('it should successfully upload multiple key value pairs', (done) => {
      chai.request(server)
        .post('/s3Bucket/object')
        .send({ uploads: multiUploadsTest, overwrite: true })
        .end(async (err, res) => {
          await s3Bucket.asyncForEach(multiUploadsTest, async (upload, index) => {
            var params = { Bucket: process.env.AWS_DEFAULT_BUCKET_NAME, Key: upload.key };
            const file = await s3.getObject(params).promise();
            const awsObjectValue = file.Body.toString();
            awsObjectValue.should.be.eql(multiUploadsTest[index].value)
            await s3.deleteObject(params).promise();
          })
          res.should.have.status(200);
          res.body.success.should.be.eql(true);
          res.body.data.uploads.should.be.eql(multiUploadsTest.length);
          res.body.data.objects.forEach((object, index) => {
            object.success.should.be.eql(true);
            object.error.should.be.eql(false);
            object.value.should.be.eql(multiUploadsTest[index].value);
            object.key.should.be.eql(multiUploadsTest[index].key);
          })
          done();
        });
    }).timeout(15000);
  });
});