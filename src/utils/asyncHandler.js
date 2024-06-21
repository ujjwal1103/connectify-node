import logger from '../logger.js';
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    logger.error(error);
    res.status(error.statusCode || 500).json({
      error: { error },
    });
  }
};

export default asyncHandler;

