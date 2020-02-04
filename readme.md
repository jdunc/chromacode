This simple node/express server is based on the question:

```
Given an S3 bucket has been provisioned for you.
Create a REST endpoint using Node/Express which accepts the following input format:
[
    {
        "key": str
        "value": str
    },
    {
        "key": str
        "value": str
    },
…
]
For each element of the list, see if there exists an object with that key in the S3 bucket. If it does not exist, create a new object with that key and "value" as its contents.
Be sure to write unit tests and use git for version control.
```

- Some assumptions I decided:

  - do not overwrite files by default, but allow overwrite if parameter passed in
  - assume valid aws/bucket credentials if they exist (stored in .env file)
  - individually check existence of objects, might be better to do listObjects depending on expected number of objects in bucket (maybe faster if < 1000 objects to list all)

- considerations

  - some companies prefer comments, some think clean code means no comments. I added comments and tried to use illustrative variable names.
  - only way to check if object exists is error thrown by headObject/getObject?
  - could have used listObjectsV2, but there might be 100,000s of objects
  - is there a way to implement with Promise.all?
  - initially passed array directly to req.body, but might need more info so use syntax of req.body.uploads
  - validation function could also implement a counter or splitting of failed objects into separate array to not waste iteration in upload function if there are no valid objects
  - ignoring some putObject options:
    - ServerSideEncryption: "AES256",
    - Tagging: "key1=value1&key2=value2"
  - TODO: implement babel in mocha test script to use import syntax

- Test considerations:
  - TODO: with more time, implement mock aws sdk
  - could also be beneficial to test the individual functions exported from s3.js
  - the last test that checks n number of pairs seems helpful but testing of just 20 key/values takes 8 seconds, so I believe there is some optimization that could be achieved to loop through the checks, although part of the time does come from checking and deleting the files in S3 through the test as well
  - would also be beneficial to implement a random string generator

# Initialize the node modules the first time in this directory and fill in your AWS credentials in a .env file

```
npm i
cp .env.example .env
vim .env
```

# Tests

```
npm run test
```

# Start the server

```
node server.js
```

# See image below for example of a POST body and response

![Example](example.png)
