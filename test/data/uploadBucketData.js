const testFunctionValidationsBadFormat = [
  {
    key: { param: "value" },
    value: "here is the string value for the validation"
  }
];

const testFunctionValidations = [
  {
    key: "testFunctionValidationsKey",
    value: "here is the string value for the validation"
  }
];

const testFunctionUploads = [
  {
    key: "testingFunctionUpload",
    value: "here is the string value for the function"
  }
];
const testFunctionUploadsOverwrite = [
  {
    key: "testingFunctionUpload",
    value: "overwrite with a new string!"
  }
];
const testFunctionUploadsError = [
  {
    key: "testingFunctionUpload",
    value: "here is the string value for the function",
    error: true
  }
];
const testUploads = [
  {
    key: "testUpload12345",
    value: "here is the string value"
  }
];
const testOverwriteUploads = [
  {
    key: "testUpload12345",
    value: "overwrite string"
  }
];
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
];
const numberOfUploads = 20;
for (let i = 0; i < numberOfUploads; i++) {
  multiUploadsTest.push({ key: `key${i}`, value: `value{i}` });
}

exports.testUploads = testUploads;
exports.multiUploadsTest = multiUploadsTest;
exports.testOverwriteUploads = testOverwriteUploads;
exports.testFunctionUploads = testFunctionUploads;
exports.testFunctionUploadsError = testFunctionUploadsError;
exports.testFunctionUploadsOverwrite = testFunctionUploadsOverwrite;
exports.testFunctionValidations = testFunctionValidations;
exports.testFunctionValidationsBadFormat = testFunctionValidationsBadFormat;
