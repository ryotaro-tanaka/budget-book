/**
 * @typedef {Object} Expense
 * @property {"expense"} [action]
 * @property {string} date
 * @property {number} amount
 * @property {string=} image_url
 * @property {string=} image_file_id
 * @property {string=} category
 */

/**
 * @typedef {Object} UploadRequest
 * @property {"upload"} action
 * @property {string} base64
 * @property {string} date
 * @property {number} amount
 * @property {string=} mime_type
 */

/**
 * @typedef {Object} UploadResult
 * @property {boolean} ok
 * @property {string=} image_file_id
 * @property {string=} image_url
 * @property {string=} error
 * @property {boolean=} skipped
 */

/**
 * @typedef {Object} ExpenseWithUploadRequest
 * @property {"expense_with_upload"} action
 * @property {string} token
 * @property {string} return_to
 * @property {string} date
 * @property {number} amount
 * @property {string=} category
 * @property {string=} base64
 * @property {string=} mime_type
 */
