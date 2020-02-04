/**
 * Utility function to handle asynchronous forEach loops
 * necessary to wait until the call has finished to continue
 * and provide info on the success of an upload
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

exports.asyncForEach = asyncForEach;
